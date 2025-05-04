// backend/middlewares/roleMiddleware.js
import { authorize } from './authMiddleware.js';

/**
 * Middleware pour vérifier si l'utilisateur est un administrateur
 */
export const isAdmin = authorize(['admin']);

/**
 * Middleware pour vérifier si l'utilisateur est un manager
 */
export const isManager = authorize(['admin', 'manager']);

/**
 * Middleware pour vérifier si l'utilisateur est un utilisateur standard
 */
export const isUser = authorize(['admin', 'manager', 'user']);

/**
 * Middleware pour vérifier si l'utilisateur a accès à une ressource spécifique
 * @param {Function} checkAccess - Fonction qui vérifie si l'utilisateur a accès à la ressource
 */
export const hasResourceAccess = (checkAccess) => {
  return async (req, res, next) => {
    try {
      const hasAccess = await checkAccess(req);
      
      if (!hasAccess) {
        return res.status(403).json({ message: 'Accès refusé à cette ressource' });
      }
      
      next();
    } catch (error) {
      console.error('Erreur lors de la vérification des droits d\'accès:', error);
      res.status(500).json({ message: 'Erreur serveur lors de la vérification des droits d\'accès' });
    }
  };
};
