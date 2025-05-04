// middlewares/tokenBlacklist.js
import { redisClient } from "../config/redis.js";
import logger from "../config/logger.js";
import jwt from "jsonwebtoken";

const BLACKLIST_PREFIX = "blacklist:";

// Fonction pour ajouter un token (JTI) à la blacklist Redis avec un TTL
const addToBlacklist = async (jti, exp) => {
  if (!redisClient || !redisClient.isReady) {
    logger.error("Redis client non prêt. Impossible d'ajouter le token à la blacklist.");
    return; // Ne rien faire si Redis n'est pas disponible
  }
  const key = `${BLACKLIST_PREFIX}${jti}`;
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const ttl = exp - nowInSeconds; // Calculer le temps restant en secondes

  // Ne pas ajouter si le token est déjà expiré ou si le TTL est négatif/zéro
  if (ttl <= 0) {
    logger.warn(`Tentative d'ajout d'un token déjà expiré ou avec TTL invalide à la blacklist (JTI: ${jti})`);
    return;
  }

  try {
    // Utiliser SET avec EX pour définir la clé et son expiration atomiquement
    await redisClient.set(key, "blacklisted", { EX: ttl });
    logger.info(`Token (JTI: ${jti}) ajouté à la blacklist avec un TTL de ${ttl} secondes.`);
  } catch (error) {
    logger.error(`Erreur lors de l'ajout du token à la blacklist Redis (JTI: ${jti}):`, error);
  }
};

// Middleware pour vérifier si un token est dans la blacklist
const checkBlacklist = async (req, res, next) => {
  // Le token doit déjà être vérifié et décodé par le middleware `protect`
  // et les informations utilisateur (y compris le payload du token) attachées à `req.user`
  if (!req.user || !req.user.jti) {
    // Si `protect` n'a pas attaché `req.user` ou si le token n'a pas de JTI, passer (ou gérer l'erreur)
    // Normalement, `protect` devrait déjà renvoyer une erreur si le token est invalide.
    // S'il n'y a pas de JTI, on ne peut pas vérifier la blacklist.
    logger.warn("Impossible de vérifier la blacklist: req.user ou req.user.jti manquant.");
    return next(); // Ou renvoyer une erreur si un JTI est toujours attendu ici
  }

  if (!redisClient || !redisClient.isReady) {
    logger.error("Redis client non prêt. Impossible de vérifier la blacklist.");
    // Comportement en cas d'indisponibilité de Redis : échouer ouvert (autoriser) ou fermé (bloquer) ?
    // Échouer ouvert est généralement moins perturbant, mais moins sécurisé.
    return next(); // Échouer ouvert pour l'instant
  }

  const { jti } = req.user;
  const key = `${BLACKLIST_PREFIX}${jti}`;

  try {
    const result = await redisClient.get(key);
    if (result) {
      // Le token est dans la blacklist
      logger.warn(`Tentative d'utilisation d'un token blacklisté (JTI: ${jti}) par l'IP: ${req.ip}`);
      return res.status(401).json({ message: "Token invalide ou expiré." }); // Message générique
    }
    // Le token n'est pas dans la blacklist, continuer
    next();
  } catch (error) {
    logger.error(`Erreur lors de la vérification de la blacklist Redis (JTI: ${jti}): ${error.message}. Autorisation de la requête (fail-open).`);
    // En cas d'erreur Redis, on autorise la requête (fail-open) pour ne pas bloquer les utilisateurs.
    next(); 
  }
};

export { addToBlacklist, checkBlacklist };

