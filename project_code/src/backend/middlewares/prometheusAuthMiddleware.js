// backend/middlewares/prometheusAuthMiddleware.js
import basicAuth from "basic-auth";
import logger from "../config/logger.js";

/**
 * Middleware pour l'authentification Basic Auth de l'endpoint Prometheus.
 * Utilise les variables d'environnement PROMETHEUS_USER et PROMETHEUS_PASSWORD.
 */
const prometheusAuthMiddleware = (req, res, next) => {
  const expectedUser = process.env.PROMETHEUS_USER;
  const expectedPassword = process.env.PROMETHEUS_PASSWORD;

  // Si les identifiants ne sont pas configurés, passer (sécurité désactivée)
  if (!expectedUser || !expectedPassword) {
    logger.warn("Authentification Prometheus désactivée: PROMETHEUS_USER ou PROMETHEUS_PASSWORD non définis.");
    return next();
  }

  const user = basicAuth(req);

  if (!user || !user.name || !user.pass) {
    logger.warn("Tentative d'accès non authentifiée à /metrics (Basic Auth requis)");
    res.set("WWW-Authenticate", 'Basic realm="Prometheus Metrics"');
    return res.status(401).send("Authentification requise");
  }

  // Vérifier les identifiants
  if (user.name === expectedUser && user.pass === expectedPassword) {
    logger.info(`Accès autorisé à /metrics pour l'utilisateur ${user.name}`);
    return next(); // Authentification réussie
  } else {
    logger.warn(`Tentative d'accès non autorisée à /metrics avec identifiants invalides (utilisateur: ${user.name})`);
    res.set("WWW-Authenticate", 'Basic realm="Prometheus Metrics"');
    return res.status(401).send("Identifiants invalides");
  }
};

export default prometheusAuthMiddleware;

