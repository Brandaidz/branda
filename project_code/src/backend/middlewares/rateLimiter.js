// middlewares/rateLimiter.js
import rateLimit, { MemoryStore } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { redisClient } from "../config/redis.js";
import logger from "../config/logger.js";

// Fonction pour créer une instance de rate limiter avec des options spécifiques
const createRateLimiter = (options = {}) => {
  let store;
  // Utiliser redisClient.status === 'ready' pour ioredis
  if (redisClient && redisClient.status === 'ready') {
    store = new RedisStore({
      // Passer directement la commande sendCommand pour ioredis v5+
      sendCommand: (...args) => redisClient.sendCommand(args),
      prefix: options.prefix || "ratelimit:", // Préfixe personnalisable
    });
    logger.info("Rate limiter utilisant RedisStore.");
  } else {
    logger.warn("Client Redis non prêt ou indisponible. Utilisation de MemoryStore pour le rate limiter comme solution de secours.");
    store = new MemoryStore(); // Utiliser MemoryStore comme fallback
  }

  return rateLimit({
    store: store, // Utiliser le store déterminé (Redis ou Memory)
    windowMs: options.windowMs || 1 * 60 * 1000, // 1 minute par défaut
    max: options.max || 100, // 100 requêtes par fenêtre par défaut
    message: options.message || "Trop de requêtes depuis cette IP, veuillez réessayer après une minute",
    standardHeaders: true, // Recommandé
    legacyHeaders: false, // Désactiver les anciens headers X-RateLimit-*
    keyGenerator: (req) => req.ip, // Utiliser l'IP comme clé (attention derrière un proxy)
    skip: (req) => options.skip ? options.skip(req) : false,
    handler: (req, res, next, options) => {
      logger.warn(`Rate limit dépassé pour l\"IP: ${req.ip} sur la route: ${req.originalUrl} (Limite: ${options.max} req/${options.windowMs / 60000}min)`);
      res.status(options.statusCode).send(options.message);
    }
  });
};

// Limiteur spécifique pour les routes d\"authentification (/api/auth)
const authLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 15, // Limite à 15 requêtes par minute par IP
  message: "Trop de tentatives d\"authentification depuis cette IP, veuillez réessayer après une minute",
  prefix: "ratelimit:auth:",
});

// Limiteur général pour les autres routes API (/api/*)
const generalApiLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limite à 100 requêtes par minute par IP
  message: "Trop de requêtes API depuis cette IP, veuillez réessayer après une minute",
  prefix: "ratelimit:api:",
});

export { createRateLimiter, authLimiter, generalApiLimiter };

