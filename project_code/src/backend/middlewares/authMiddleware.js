import * as jwt from "jsonwebtoken"; // Use namespace import
import redis from "redis";
import "dotenv/config"; // Charger les variables d\environnement
import User from "../models/userModel.js"; 

/**
 * Branda – Auth Middleware (JWT + jti blacklist Redis)
 * ... (description unchanged) ...
 */

const isTestEnv = process.env.NODE_ENV === "test";
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("[authMiddleware] ▶︎ Missing JWT_SECRET in .env");
  process.exit(1);
}

/* ---------- Redis client (singleton) ---------- */
let redisClient;

// Only create and connect Redis client if not in test environment
if (!isTestEnv) {
  redisClient = redis.createClient({
    url: process.env.REDIS_URL || "redis://localhost:6379",
  });

  redisClient.on("error", (err) =>
    console.error("[Redis] Connection error:", err.message),
  );

  // Utiliser une IIFE pour gérer l\asynchronisme de connect()
  (async () => {
    try {
      await redisClient.connect();
      console.log("[Redis] Connected successfully.");
    } catch (err) {
      console.error("[Redis] Could not connect:", err);
      // Gérer l\erreur de connexion Redis comme nécessaire, ex: process.exit(1)
    }
  })();
} else {
  // In test environment, create a simple mock client object manually
  console.log("[Redis] Test environment detected. Using manual mock for Redis client.");
  redisClient = {
    get: async () => null, // Mock get to return null (not blacklisted)
    on: () => {}, // Mock event listeners to do nothing
    connect: async () => undefined, // Mock connect to do nothing
    // Add other methods if needed, ensuring they are simple functions
  };
}

/* ---------- Middleware Definitions ---------- */
async function protectMiddleware(req, res, next) {
  try {
    /* 1. Récupération du token dans l’Authorization header */
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : null;

    if (!token) {
      return res.status(401).json({ message: "Token manquant." });
    }

    /* 2. Vérification + décodage */
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] }); // Specify expected algorithm

    const { jti, sub: userId } = decoded;
    if (!jti || !userId) {
      return res.status(401).json({ message: "Token invalide (payload)." });
    }

    /* 3. Vérification blacklist Redis */
    // Use the potentially mocked redisClient in test env
    const inBlacklist = await redisClient.get(`bl_${jti}`); // null si absent
    if (inBlacklist) {
      return res.status(401).json({ message: "Token révoqué." });
    }

    /* 4. Ajout de l’utilisateur au request object */
    // Fetch full user data to get role and tenantId
    const user = await User.findById(userId).select("role tenantId").lean();
    if (!user) {
        return res.status(401).json({ message: "Utilisateur associé au token non trouvé." });
    }
    
    req.user = {
      id: userId,
      role: user.role || "user",
      tenantId: user.tenantId ? user.tenantId.toString() : null, // Add tenantId
      iat: decoded.iat,
      exp: decoded.exp,
    };
    // Also attach tenantId directly to req for convenience in controllers
    req.tenantId = req.user.tenantId;

    return next();
  } catch (err) {
    // Gestion fine des erreurs JWT courantes
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expiré." });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ message: "Token invalide." });
    }
    // Log toute autre erreur pour debug
    if (!isTestEnv) console.error("[authMiddleware] ▶︎", err);
    return res.status(500).json({ message: "Erreur d’authentification." });
  }
}


/* ---------- Middleware de vérification du rôle Admin ---------- */
const isAdminMiddleware = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Accès refusé. Rôle administrateur requis.' });
  }
};


/* ---------- Middleware de vérification du rôle Manager ou Admin ---------- */
const isManagerMiddleware = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'manager')) {
    next();
  } else {
    res.status(403).json({ message: 'Accès refusé. Rôle manager ou administrateur requis.' });
  }
};


/* ---------- Middleware pour attacher les données utilisateur complètes ---------- */
const attachUserMiddleware = async (req, res, next) => {
  if (!req.user || !req.user.id) {
    // If protect middleware didn't run or failed, just proceed
    return next();
  }

  try {
    // User ID is already attached by protect, fetch full data
    const user = await User.findById(req.user.id).select("-passwordHash").lean();

    if (!user) {
      // This case should ideally be caught by protect, but added as a safeguard
      return res.status(401).json({ message: "Utilisateur non trouvé." });
    }

    // Attach full user data (excluding password) to req.userData
    req.userData = user; 
    
    // Ensure req.user.tenantId and req.tenantId are consistent (already set in protect)
    if (!req.user.tenantId && user.tenantId) {
        req.user.tenantId = user.tenantId.toString();
        req.tenantId = req.user.tenantId;
    }

    next();
  } catch (error) {
    if (!isTestEnv) console.error("[attachUser] Erreur lors de la récupération de l\"utilisateur:", error);
    return res.status(500).json({ message: "Erreur interne lors de l\"attachement des données utilisateur." });
  }
};

// Explicit named exports
export {
    protectMiddleware as protect,
    isAdminMiddleware as isAdmin,
    isManagerMiddleware as isManager,
    attachUserMiddleware as attachUser
};

