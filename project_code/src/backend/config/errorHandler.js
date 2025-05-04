// backend/config/errorHandler.js
import logger from './logger.js';

/**
 * Middleware de gestion globale des erreurs
 * Capture toutes les exceptions non gérées dans l'application
 */
export const errorHandler = (err, req, res, next) => {
  // Déterminer le statut HTTP approprié
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  // Journaliser l'erreur
  logger.error(`Erreur non gérée: ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?._id,
    tenantId: req.user?.tenantId
  });
  
  // Répondre avec un message d'erreur approprié
  res.status(statusCode).json({
    message: process.env.NODE_ENV === 'production' 
      ? 'Une erreur est survenue lors du traitement de votre demande' 
      : err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    timestamp: new Date().toISOString()
  });
};

/**
 * Gestionnaire d'erreurs pour les promesses non gérées
 */
export const setupUnhandledRejectionHandler = () => {
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Promesse non gérée rejetée:', {
      reason: reason instanceof Error ? reason.message : reason,
      stack: reason instanceof Error ? reason.stack : 'Non disponible'
    });
    // En développement, on peut afficher plus d'informations
    if (process.env.NODE_ENV !== 'production') {
      console.error('Promesse non gérée rejetée:', reason);
    }
  });
};

/**
 * Gestionnaire d'erreurs pour les exceptions non capturées
 */
export const setupUncaughtExceptionHandler = () => {
  process.on('uncaughtException', (err) => {
    logger.error('Exception non capturée:', {
      error: err.message,
      stack: err.stack
    });
    
    // En production, on veut terminer le processus proprement
    if (process.env.NODE_ENV === 'production') {
      logger.error('Exception non capturée, arrêt du processus');
      // Donner le temps aux logs d'être écrits
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    }
  });
};

export default {
  errorHandler,
  setupUnhandledRejectionHandler,
  setupUncaughtExceptionHandler
};
