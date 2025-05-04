// backend/middlewares/corsMiddleware.js
import cors from "cors";
import logger from "../config/logger.js";

// Lire les origines autorisées depuis les variables d\"environnement
// Parsing amélioré de ALLOWED_ORIGINS pour gérer les espaces et les entrées vides
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

if (allowedOrigins.length > 0) {
  logger.info(`Origines CORS autorisées chargées depuis ALLOWED_ORIGINS: ${allowedOrigins.join(", ")}`);
} else {
  logger.warn("Variable d\"environnement ALLOWED_ORIGINS non définie ou vide. Aucune origine ne sera autorisée par CORS, sauf les requêtes same-origin.");
}

/**
 * Configuration CORS stricte basée sur la variable d\"environnement ALLOWED_ORIGINS.
 */
const corsOptions = {
  origin: function (origin, callback) {
    // Si ALLOWED_ORIGINS n\"est pas défini ou vide, refuser toutes les requêtes cross-origin.
    if (allowedOrigins.length === 0) {
      if (origin) { // Refuser seulement si une origine est présente (requête cross-origin)
          logger.warn(`Requête CORS refusée depuis ${origin}. ALLOWED_ORIGINS est vide.`);
          return callback(new Error(`Accès refusé: l\"origine ${origin} n\"est pas autorisée.`));
      } else {
          // Autoriser les requêtes sans origine (ex: requêtes server-to-server, Postman, curl)
          // ou les requêtes same-origin qui n\"ont pas d\"en-tête Origin.
          // Si vous voulez être encore plus strict, vous pouvez refuser ici aussi.
          return callback(null, true);
      }
    }

    // Vérifier si l\"origine de la requête fait partie des origines autorisées.
    // Note: `origin` peut être undefined pour les requêtes same-origin ou server-to-server.
    if (!origin || allowedOrigins.includes(origin)) {
      // Autoriser la requête
      callback(null, true);
    } else {
      // Refuser la requête
      logger.warn(`Requête CORS refusée depuis ${origin}. Non présente dans ALLOWED_ORIGINS.`);
      callback(new Error(`Accès refusé: l\"origine ${origin} n\"est pas autorisée.`));
    }
  },
  credentials: true, // Important pour les cookies, l\"authentification, etc.
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"], // Méthodes HTTP autorisées
  allowedHeaders: ["Content-Type", "Authorization", "X-Tenant-ID"], // En-têtes autorisés dans la requête
  exposedHeaders: ["Content-Length", "X-Tenant-ID"], // En-têtes que le client peut lire dans la réponse
  maxAge: 86400 // Durée de mise en cache des résultats preflight (OPTIONS) en secondes (24h)
};

/**
 * Middleware CORS configuré.
 */
export const corsMiddleware = cors(corsOptions);

/**
 * Middleware pour gérer spécifiquement les erreurs générées par la fonction `origin` de CORS.
 */
export const corsErrorHandler = (err, req, res, next) => {
  // Vérifier si l\"erreur provient de notre logique CORS
  if (err.message.startsWith("Accès refusé: l\"origine")) {
    // Log l\"erreur CORS refusée
    // logger.warn(`Erreur CORS interceptée: ${err.message}`); // Déjà loggé dans la fonction origin
    return res.status(403).json({
      message: "Accès interdit par la politique CORS.",
      // error: err.message // Ne pas exposer les détails de l\"erreur au client par défaut
    });
  }
  // Passer les autres erreurs au gestionnaire d\"erreurs suivant
  next(err);
};

// Exporter les middlewares
export default {
  corsMiddleware,
  corsErrorHandler
};

