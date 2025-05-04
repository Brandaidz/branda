// backend/middlewares/roleTestMiddleware.js
import logger from "../config/logger.js";

/**
 * Middleware pour tester les rôles utilisateur
 * Simule différents rôles pour tester les autorisations
 * À utiliser uniquement en environnement de développement
 */
const roleTestMiddleware = (role) => {
  return (req, res, next) => {
    // Vérifier que nous sommes en environnement de développement
    if (process.env.NODE_ENV !== 'development') {
      logger.warn('Tentative d\'utilisation du middleware de test de rôle en environnement non-développement');
      return res.status(403).json({ message: 'Middleware de test non disponible en production' });
    }

    // Sauvegarder le rôle original
    const originalRole = req.user ? req.user.role : null;
    
    // Simuler le rôle demandé
    if (req.user) {
      req.user.role = role;
      logger.info(`Test de rôle: Rôle utilisateur modifié de ${originalRole} à ${role} pour la requête ${req.method} ${req.originalUrl}`);
    } else {
      logger.warn(`Test de rôle: Impossible de modifier le rôle, utilisateur non authentifié`);
      return res.status(401).json({ message: 'Utilisateur non authentifié' });
    }

    // Continuer avec le rôle simulé
    next();
    
    // Restaurer le rôle original après le traitement de la requête
    if (req.user) {
      req.user.role = originalRole;
    }
  };
};

export default roleTestMiddleware;
