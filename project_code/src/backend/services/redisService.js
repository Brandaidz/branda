// backend/services/redisService.js
import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables

const isTestEnv = process.env.NODE_ENV === "test";

let redisClient;
let redisConnected = false;
let reconnectTimer = null;
const RECONNECT_INTERVAL = 5000; // 5 secondes

// Options for non-test environment
const productionRedisOptions = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  // maxRetriesPerRequest: 3, // BullMQ requires this to be null, handle separately for BullMQ connections
  enableReadyCheck: true,
  retryStrategy: (times) => {
    const delay = Math.min(times * 1000, 30000);
    console.log(`Tentative de reconnexion Redis dans ${delay}ms (tentative #${times})`);
    return delay;
  }
};

/**
 * Connects to the Redis server with automatic reconnection (Non-test env only).
 */
const connectRedis = () => {
  // --- Test Environment Handling ---
  if (isTestEnv) {
    if (!redisClient) {
      // In test, create a mock client instance. Relies on jest.mock("ioredis")
      // Use minimal options, actual behavior comes from the mock file.
      redisClient = new Redis({ lazyConnect: true });
      redisConnected = true; // Assume connected for tests using the mock
      // Ensure no real event listeners are attached in test env by the service itself
      // The mock should handle .on calls appropriately.
    }
    return redisClient;
  }

  // --- Production/Development Environment Handling ---
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  if (!redisClient || redisClient.status === 'end') {
    console.log(`Connexion à Redis sur ${productionRedisOptions.host}:${productionRedisOptions.port}...`);
    redisClient = new Redis(productionRedisOptions);

    redisClient.on("connect", () => {
      console.log("Connexion à Redis établie avec succès.");
      redisConnected = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    });

    redisClient.on("ready", () => {
      console.log("Client Redis prêt à recevoir des commandes.");
      redisConnected = true;
    });

    redisClient.on("error", (err) => {
      console.error("Erreur de connexion Redis:", err);
      redisConnected = false;
      if (!reconnectTimer) {
        console.log(`Planification d'une reconnexion dans ${RECONNECT_INTERVAL}ms...`);
        reconnectTimer = setTimeout(reconnectRedis, RECONNECT_INTERVAL);
      }
    });

    redisClient.on("close", () => {
      console.log("Connexion Redis fermée.");
      redisConnected = false;
      if (!reconnectTimer) {
        console.log(`Planification d'une reconnexion dans ${RECONNECT_INTERVAL}ms...`);
        reconnectTimer = setTimeout(reconnectRedis, RECONNECT_INTERVAL);
      }
    });

    redisClient.on("reconnecting", () => {
      console.log("Reconnexion à Redis en cours...");
    });
  }
  return redisClient;
};

/**
 * Force reconnection to Redis (Non-test env only).
 */
const reconnectRedis = () => {
  if (isTestEnv) {
    // console.log("[TEST ENV] reconnectRedis called, doing nothing.");
    return getClient(); // Return the mock client
  }

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }

  console.log("Tentative de reconnexion manuelle à Redis...");
  if (redisClient) {
    try {
      redisClient.disconnect();
    } catch (err) {
      console.error("Erreur lors de la déconnexion de Redis pour reconnexion:", err);
    }
    redisClient = null;
    redisConnected = false;
  }
  return connectRedis();
};

// Initialize connection on module load (only if not in test env)
if (!isTestEnv) {
  connectRedis();
}

/**
 * Gets the Redis client instance.
 * @returns {Redis.Redis} The ioredis client instance (mocked in test).
 */
export const getClient = () => {
  // In test env, connectRedis() ensures the mock client exists.
  // In non-test env, it ensures connection or attempts reconnect.
  if (!redisClient || (!isTestEnv && redisClient.status !== 'ready' && redisClient.status !== 'connect' && redisClient.status !== 'reconnecting')) {
     connectRedis();
  }
  return redisClient;
};

/**
 * Checks if Redis is connected.
 * @returns {boolean} True if connected, false otherwise.
 */
export const isConnected = () => {
  if (isTestEnv) return true; // Assume connected in test env (relying on mock)
  return redisClient && redisConnected && (redisClient.status === "ready" || redisClient.status === "connect");
};

/**
 * Sets a value in Redis.
 * @param {string} key - The key.
 * @param {string | object} value - The value (will be stringified if object).
 * @param {number} [ttlSeconds] - Optional Time-to-live in seconds.
 * @returns {Promise<string|null>} 'OK' on success, null on error.
 */
export const setValue = async (key, value, ttlSeconds) => {
  try {
    const client = getClient();
    const valueToStore = typeof value === "object" ? JSON.stringify(value) : String(value);
    if (ttlSeconds) {
      return await client.set(key, valueToStore, "EX", ttlSeconds);
    } else {
      return await client.set(key, valueToStore);
    }
  } catch (error) {
    // Avoid logging errors during tests unless specifically needed for debugging
    if (!isTestEnv) console.error(`Erreur lors de la définition de la clé Redis ${key}:`, error);
    return null;
  }
};

/**
 * Gets a value from Redis.
 * @param {string} key - The key.
 * @param {boolean} [parseJson=false] - Whether to parse the result as JSON.
 * @returns {Promise<string|object|null>} The value, or null if not found or error.
 */
export const getValue = async (key, parseJson = false) => {
  try {
    const client = getClient();
    const value = await client.get(key);
    if (value === null) {
      return null;
    }
    if (parseJson) {
      try {
        return JSON.parse(value);
      } catch (parseError) {
        if (!isTestEnv) console.error(`Erreur d'analyse JSON pour la clé Redis ${key}:`, parseError);
        return null;
      }
    }
    return value;
  } catch (error) {
    if (!isTestEnv) console.error(`Erreur lors de la récupération de la clé Redis ${key}:`, error);
    return null;
  }
};

/**
 * Deletes a key from Redis.
 * @param {string} key - The key to delete.
 * @returns {Promise<number>} The number of keys deleted (0 or 1).
 */
export const deleteValue = async (key) => {
  try {
    const client = getClient();
    return await client.del(key);
  } catch (error) {
    if (!isTestEnv) console.error(`Erreur lors de la suppression de la clé Redis ${key}:`, error);
    return 0;
  }
};

// --- Specific functions for Branda --- //

// Chat History
const CHAT_HISTORY_PREFIX = "chatHistory:";
const CHAT_HISTORY_TTL = 3600; // 1 hour

export const getChatHistory = async (userId, conversationId) => {
  const key = `${CHAT_HISTORY_PREFIX}${userId}:${conversationId}`;
  return await getValue(key, true);
};

export const setChatHistory = async (userId, conversationId, history) => {
  const key = `${CHAT_HISTORY_PREFIX}${userId}:${conversationId}`;
  return await setValue(key, history, CHAT_HISTORY_TTL);
};

export const deleteChatHistory = async (userId, conversationId) => {
    const key = `${CHAT_HISTORY_PREFIX}${userId}:${conversationId}`;
    return await deleteValue(key);
};

// AI Response Caching
const AI_CACHE_PREFIX = "aiResponse:";
const AI_CACHE_TTL = 60 * 10; // 10 minutes

export const getCachedAIResponse = async (promptKey) => {
    const key = `${AI_CACHE_PREFIX}${promptKey}`;
    return await getValue(key);
};

export const cacheAIResponse = async (promptKey, response) => {
    const key = `${AI_CACHE_PREFIX}${promptKey}`;
    return await setValue(key, response, AI_CACHE_TTL);
};

// --- Authentication Tokens --- //

// Email Verification Tokens
const VERIFY_TOKEN_PREFIX = "verifyToken:";
const VERIFY_TOKEN_TTL = 60 * 60; // 1 hour

export const storeVerificationToken = async (token, userId) => {
  const key = `${VERIFY_TOKEN_PREFIX}${token}`;
  return await setValue(key, userId, VERIFY_TOKEN_TTL);
};

export const getUserIdFromVerificationToken = async (token) => {
  const key = `${VERIFY_TOKEN_PREFIX}${token}`;
  return await getValue(key);
};

export const deleteVerificationToken = async (token) => {
  const key = `${VERIFY_TOKEN_PREFIX}${token}`;
  return await deleteValue(key);
};

// Refresh Tokens
const REFRESH_TOKEN_PREFIX = "refreshToken:";
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days

export const storeRefreshToken = async (userId, token) => {
  const key = `${REFRESH_TOKEN_PREFIX}${userId}`;
  return await setValue(key, String(token), REFRESH_TOKEN_TTL);
};

export const getRefreshToken = async (userId) => {
  const key = `${REFRESH_TOKEN_PREFIX}${userId}`;
  return await getValue(key);
};

export const deleteRefreshToken = async (userId) => {
  const key = `${REFRESH_TOKEN_PREFIX}${userId}`;
  return await deleteValue(key);
};

/**
 * Vérifie l'état de la connexion Redis
 * @returns {Promise<boolean>} True si Redis est connecté et fonctionnel
 */
export const checkHealth = async () => {
  if (isTestEnv) return true; // Assume healthy in test env

  if (!isConnected()) {
    return false;
  }
  try {
    const client = getClient();
    const pingResult = await client.ping();
    return pingResult === 'PONG';
  } catch (error) {
    console.error("Échec du contrôle de santé Redis:", error);
    return false;
  }
};

/**
 * Cleanly disconnects the Redis client.
 */
export const disconnectClient = async () => {
    if (redisClient) {
        try {
            if (isTestEnv) {
                // In test, call the mock's disconnect if it exists
                if (typeof redisClient.disconnect === 'function') {
                    await redisClient.disconnect();
                }
            } else {
                // In non-test, perform actual disconnect
                await redisClient.quit();
            }
        } catch (err) {
            console.error("Erreur lors de la déconnexion de Redis:", err);
        }
        redisClient = null;
        redisConnected = false;
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
    }
};

// Export functions
export default {
  getClient,
  isConnected,
  setValue,
  getValue,
  deleteValue,
  reconnectRedis, // Still exported, but no-op in test
  checkHealth,
  disconnectClient,
  // Chat
  getChatHistory,
  setChatHistory,
  deleteChatHistory,
  // AI Cache
  getCachedAIResponse,
  cacheAIResponse,
  // Auth Tokens
  storeVerificationToken,
  getUserIdFromVerificationToken,
  deleteVerificationToken,
  storeRefreshToken,
  getRefreshToken,
  deleteRefreshToken
};

