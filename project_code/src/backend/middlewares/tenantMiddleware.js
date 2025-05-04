// backend/middlewares/tenantMiddleware.js
// import mongoose from "mongoose"; // mongoose.setTenantId n'est plus utilisé
import { runInTenantContext } from "../services/contextService.js";

/**
 * Middleware pour établir le contexte du tenant pour la requête en utilisant AsyncLocalStorage.
 * Doit être utilisé après le middleware d'authentification qui attache req.user.
 */
const tenantMiddleware = (req, res, next) => {
  // Récupérer le tenantId de l'utilisateur authentifié
  const tenantId = req.user ? req.user.tenantId : null;

  // Exécuter le reste de la chaîne de middlewares dans le contexte du tenant
  runInTenantContext(tenantId, () => {
    if (tenantId) {
      // Log optionnel pour le débogage
      // console.log(`Contexte Tenant ID ${tenantId} établi pour la requête.`);
    } else {
      // Log optionnel pour le débogage
      // console.log("Aucun Tenant ID défini pour la requête (utilisateur non authentifié ou route publique).");
    }
    next();
  });
};

export default tenantMiddleware;

