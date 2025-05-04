// backend/services/contextService.js
import { AsyncLocalStorage } from "async_hooks";

const tenantContext = new AsyncLocalStorage();

/**
 * Exécute une fonction dans un contexte de tenant spécifique.
 * @param {string | null} tenantId - L'ID du tenant pour ce contexte.
 * @param {Function} fn - La fonction à exécuter dans le contexte.
 * @returns Le résultat de la fonction fn.
 */
export const runInTenantContext = (tenantId, fn) => {
  return tenantContext.run({ tenantId }, fn);
};

/**
 * Récupère l'ID du tenant du contexte asynchrone courant.
 * @returns {string | null} L'ID du tenant courant, ou null s'il n'est pas défini.
 */
export const getCurrentTenantId = () => {
  const store = tenantContext.getStore();
  return store ? store.tenantId : null;
};

export default {
  runInTenantContext,
  getCurrentTenantId,
  tenantContext // Exporter pour une utilisation avancée si nécessaire
};

