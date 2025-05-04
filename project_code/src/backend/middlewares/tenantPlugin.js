// backend/middlewares/tenantPlugin.js
import { getCurrentTenantId } from "../services/contextService.js";

/**
 * Plugin Mongoose pour la gestion multi-tenant
 * Ajoute automatiquement le tenantId à toutes les requêtes
 * Utilise AsyncLocalStorage via contextService au lieu de mongoose._tenantId
 */
const tenantPlugin = function(schema) {
  // Middleware pre-save pour s'assurer que tenantId est défini
  schema.pre('save', function(next) {
    if (!this.tenantId && this.constructor.tenantRequired !== false) {
      return next(new Error('tenantId est requis'));
    }
    next();
  });

  // Middleware pre-find pour filtrer par tenantId
  schema.pre('find', function() {
    if (this.constructor.tenantRequired !== false && !this._skipTenantFilter) {
      // Récupérer le tenantId du contexte via AsyncLocalStorage
      const tenantId = getCurrentTenantId();
      if (tenantId) {
        this.where({ tenantId });
      }
    }
  });

  // Middleware pre-findOne pour filtrer par tenantId
  schema.pre('findOne', function() {
    if (this.constructor.tenantRequired !== false && !this._skipTenantFilter) {
      const tenantId = getCurrentTenantId();
      if (tenantId) {
        this.where({ tenantId });
      }
    }
  });

  // Middleware pre-update pour s'assurer que tenantId n'est pas modifié
  schema.pre('updateOne', function(next) {
    if (this.constructor.tenantRequired !== false && !this._skipTenantFilter) {
      const tenantId = getCurrentTenantId();
      if (tenantId) {
        this.where({ tenantId });
        
        // Empêcher la modification du tenantId
        if (this._update && this._update.tenantId && this._update.tenantId !== tenantId) {
          return next(new Error('Modification du tenantId non autorisée'));
        }
      }
    }
    next();
  });

  // Méthode pour ignorer le filtre tenant sur une requête spécifique
  schema.statics.skipTenantFilter = function() {
    const query = this.find();
    query._skipTenantFilter = true;
    return query;
  };
};

export default tenantPlugin;
