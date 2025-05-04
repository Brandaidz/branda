// backend/workers/summaryWorker.js
import { getConversationHistory } from "../services/contextManager.js";
import { generateSummary } from "../services/summaryManager.js";
import ConversationSummary from "../models/conversationSummaryModel.js";
import { runInTenantContext } from "../services/contextService.js"; // Importer pour le contexte
import logger from "../config/logger.js"; // Importer un logger configuré (à créer si besoin)

/**
 * Traite un job de génération de résumé
 * @param {Object} job - Job BullMQ
 * @returns {Promise<Object>} - Résultat du traitement
 */
export const processSummaryJob = async (job) => {
  const { userId, tenantId, conversationId } = job.data;
  const jobId = job.id;

  // Exécuter le traitement dans le contexte du tenant approprié
  return runInTenantContext(tenantId, async () => {
    logger.info(`[Worker:Summary][Job:${jobId}] Début du traitement pour conversation ${conversationId}, tenant ${tenantId}`);

    try {
      // 1. Récupérer l'historique complet de la conversation
      logger.info(`[Worker:Summary][Job:${jobId}] Récupération de l'historique pour conversation ${conversationId}`);
      const history = await getConversationHistory(userId, conversationId);

      if (!history || history.length === 0) {
        logger.warn(`[Worker:Summary][Job:${jobId}] Aucun historique trouvé pour la conversation ${conversationId}. Job marqué comme échoué.`);
        // Lancer une erreur pour que BullMQ marque le job comme échoué
        throw new Error(`Aucun historique trouvé pour la conversation ${conversationId}`);
      }
      logger.info(`[Worker:Summary][Job:${jobId}] Historique récupéré (${history.length} messages).`);

      // 2. Générer le résumé via le service dédié
      logger.info(`[Worker:Summary][Job:${jobId}] Génération du résumé pour conversation ${conversationId}`);
      const summary = await generateSummary(history);
      logger.info(`[Worker:Summary][Job:${jobId}] Résumé généré.`);

      // 3. Sauvegarder le résumé dans la base de données
      logger.info(`[Worker:Summary][Job:${jobId}] Sauvegarde du résumé pour conversation ${conversationId}`);
      let summaryDoc = await ConversationSummary.findOne({ 
        conversationId,
        // tenantId est automatiquement ajouté par le plugin mongoose grâce au contexte
      });

      if (summaryDoc) {
        // Mettre à jour le résumé existant
        summaryDoc.summary = summary;
        // Mettre à jour explicitement le timestamp
        summaryDoc.updatedAt = new Date(); 
        await summaryDoc.save();
        logger.info(`[Worker:Summary][Job:${jobId}] Résumé existant mis à jour (ID: ${summaryDoc._id}).`);
      } else {
        // Créer un nouveau résumé
        summaryDoc = new ConversationSummary({
          userId,
          tenantId, // Assurer que tenantId est explicitement défini lors de la création
          conversationId,
          summary,
          // createdAt est géré par timestamps: true
        });
        await summaryDoc.save();
        logger.info(`[Worker:Summary][Job:${jobId}] Nouveau résumé créé (ID: ${summaryDoc._id}).`);
      }

      logger.info(`[Worker:Summary][Job:${jobId}] Traitement terminé avec succès pour conversation ${conversationId}.`);
      return {
        success: true,
        conversationId,
        summaryId: summaryDoc._id,
        summaryLength: summary.length
      };

    } catch (error) {
      logger.error(`[Worker:Summary][Job:${jobId}] Erreur lors du traitement pour conversation ${conversationId}: ${error.message}`, { stack: error.stack });
      // Lancer l'erreur pour que BullMQ la capture et gère les tentatives/échecs
      throw error;
    }
  });
};

export default {
  processSummaryJob
};

