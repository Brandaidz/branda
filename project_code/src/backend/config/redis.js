// config/redis.js
import Redis from 'ioredis';
import logger from './logger.js';

// Création d'un client Redis avec options de résilience
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_DB || 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    logger.info(`Tentative de reconnexion Redis (${times}), délai: ${delay}ms`);
    return delay;
  },
  maxRetriesPerRequest: 3
});

// Gestion des événements Redis
redisClient.on('error', (err) => {
  logger.error('Erreur Redis:', { error: err.message, stack: err.stack });
});

redisClient.on('connect', () => {
  logger.info('Connexion Redis établie');
});

redisClient.on('ready', () => {
  logger.info('Client Redis prêt');
});

redisClient.on('reconnecting', () => {
  logger.warn('Tentative de reconnexion Redis en cours...');
});

// Méthodes utilitaires pour Redis
const getAsync = async (key) => {
  try {
    return await redisClient.get(key);
  } catch (error) {
    logger.error('Erreur lors de la récupération Redis:', { key, error: error.message });
    throw error;
  }
};

const setAsync = async (key, value, options = {}) => {
  try {
    if (options.ttl) {
      return await redisClient.set(key, value, 'EX', options.ttl);
    }
    return await redisClient.set(key, value);
  } catch (error) {
    logger.error('Erreur lors de l\'enregistrement Redis:', { key, error: error.message });
    throw error;
  }
};

const delAsync = async (key) => {
  try {
    return await redisClient.del(key);
  } catch (error) {
    logger.error('Erreur lors de la suppression Redis:', { key, error: error.message });
    throw error;
  }
};

const expireAsync = async (key, ttlSeconds) => {
  try {
    return await redisClient.expire(key, ttlSeconds);
  } catch (error) {
    logger.error('Erreur lors de la définition de l\'expiration Redis:', { key, ttlSeconds, error: error.message });
    throw error;
  }
};

// Méthode pour le cache avec TTL
const cacheWithTTL = async (key, data, ttlSeconds = 300) => {
  try {
    await setAsync(key, JSON.stringify(data), { ttl: ttlSeconds });
    logger.debug(`Données mises en cache avec succès: ${key} (TTL: ${ttlSeconds}s)`);
    return data;
  } catch (error) {
    logger.error('Erreur lors de la mise en cache avec TTL:', { key, ttlSeconds, error: error.message });
    return data; // Retourner les données même en cas d'erreur de cache
  }
};

// Méthode pour récupérer du cache
const getFromCache = async (key) => {
  try {
    const data = await getAsync(key);
    if (!data) {
      logger.debug(`Cache miss: ${key}`);
      return null;
    }
    logger.debug(`Cache hit: ${key}`);
    return JSON.parse(data);
  } catch (error) {
    logger.error('Erreur lors de la récupération du cache:', { key, error: error.message });
    return null;
  }
};

export {
  redisClient,
  getAsync,
  setAsync,
  delAsync,
  expireAsync,
  cacheWithTTL,
  getFromCache
};

export default {
  redisClient,
  getAsync,
  setAsync,
  delAsync,
  expireAsync,
  cacheWithTTL,
  getFromCache
};
