// backend/services/summaryManager.js
import mongoose from "mongoose";
import ConversationSummary from "../models/conversationSummaryModel.js";
import Conversation from "../models/conversationModel.js"; // Import Conversation model
import { generateChatResponse } from "./openaiService.js"; // Use generateChatResponse for context

/**
 * Génère un résumé d\"une conversation en utilisant l\"IA
 * @param {string} conversationId - ID de la conversation
 * @param {Array} messages - Messages de la conversation
 * @returns {Promise<Object>} - Résumé généré { summary: string, keyPoints: string[], entities: {type: string, value: string}[] }
 */
export const generateSummary = async (conversationId, messages) => {
  try {
    // Préparer le prompt pour la génération du résumé
    const conversationText = messages
      .map((msg) => `${msg.role}: ${msg.content}`)
      .join("\n");

    // Prompt amélioré pour un format de sortie plus fiable
    const prompt = `Analyse la conversation suivante et fournis un résumé concis, les points clés, et les entités importantes.

Conversation:
${conversationText}

Réponds **uniquement** au format JSON suivant, sans texte avant ou après:
{
  "summary": "[Ton résumé concis ici]",
  "keyPoints": ["Point clé 1", "Point clé 2", ...],
  "entities": [
    {"type": "TypeEntité1", "value": "ValeurEntité1"},
    {"type": "TypeEntité2", "value": "ValeurEntité2"},
    ...
  ]
}`; // Utilisation de guillemets doubles pour JSON valide

    // Générer le résumé avec l\"API OpenAI (utiliser generateChatResponse pour potentiellement plus de contexte si nécessaire)
    const responseJson = await generateChatResponse(
      [{ role: "user", content: prompt }],
      { temperature: 0.2, response_format: { type: "json_object" } } // Demander une sortie JSON si l\"API le supporte
    );

    // Parser la réponse JSON
    let parsedResponse;
    try {
        parsedResponse = JSON.parse(responseJson);
    } catch (parseError) {
        console.error("Erreur de parsing JSON de la réponse OpenAI:", parseError);
        console.error("Réponse reçue:", responseJson);
        // Tentative de récupération si le format est proche
        const summaryMatch = responseJson.match(/"summary":\s*"(.*?)"/);
        const keyPointsMatch = responseJson.match(/"keyPoints":\s*(\[.*?\])/);
        const entitiesMatch = responseJson.match(/"entities":\s*(\[.*?\])/);
        parsedResponse = {
            summary: summaryMatch ? summaryMatch[1] : "Impossible d\"extraire le résumé.",
            keyPoints: keyPointsMatch ? JSON.parse(keyPointsMatch[1]) : [],
            entities: entitiesMatch ? JSON.parse(entitiesMatch[1]) : []
        };
    }

    // Valider la structure de la réponse parsée
    const summary = parsedResponse.summary || "Résumé non généré.";
    const keyPoints = Array.isArray(parsedResponse.keyPoints) ? parsedResponse.keyPoints : [];
    const entities = Array.isArray(parsedResponse.entities) ? parsedResponse.entities.filter(e => e.type && e.value) : [];

    return {
      summary,
      keyPoints,
      entities,
    };

  } catch (error) {
    console.error("Erreur lors de la génération du résumé:", error);
    // Retourner un objet avec des valeurs par défaut en cas d\"erreur
    return {
      summary: "Erreur lors de la génération du résumé.",
      keyPoints: [],
      entities: [],
    };
  }
};

/**
 * Sauvegarde ou met à jour un résumé de conversation dans la base de données.
 * @param {string} tenantId - ID du tenant.
 * @param {string} conversationId - ID de la conversation.
 * @param {Array} messages - Messages de la conversation (peut être optionnel si on le récupère).
 * @returns {Promise<Object>} - Résumé sauvegardé ou mis à jour.
 */
export const saveSummary = async (tenantId, conversationId, messages) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        throw new Error("ID de conversation invalide pour la sauvegarde du résumé.");
    }
    const convObjectId = new mongoose.Types.ObjectId(conversationId);

    // Récupérer les messages si non fournis (attention à la taille potentielle)
    if (!messages || messages.length === 0) {
        const conversation = await Conversation.findOne({ _id: convObjectId, tenantId });
        if (!conversation) {
            throw new Error(`Conversation ${conversationId} non trouvée pour le tenant ${tenantId}.`);
        }
        messages = conversation.messages;
    }

    // Générer le résumé
    const { summary, keyPoints, entities } = await generateSummary(conversationId, messages);

    // Utiliser upsert pour créer ou mettre à jour le résumé
    const result = await ConversationSummary.findOneAndUpdate(
      { conversationId: convObjectId, tenantId }, // Filtre basé sur conversationId et tenantId
      {
        $set: {
          summary,
          keyPoints,
          entities,
          lastMessageTimestamp: messages.length > 0 ? messages[messages.length - 1].timestamp || new Date() : new Date(),
          tenantId, // Assurer que tenantId est bien défini
          // userId n\"est plus nécessaire si on se base sur tenantId
        },
        $setOnInsert: { // Champs définis uniquement lors de la création
            conversationId: convObjectId,
            // userId: messages[0]?.userId // Optionnel: garder une trace du créateur?
        }
      },
      { new: true, upsert: true, runValidators: true } // Options: retourne le doc mis à jour, crée s\"il n\"existe pas
    );

    return result;

  } catch (error) {
    console.error(`Erreur lors de la sauvegarde du résumé pour la conversation ${conversationId}:`, error);
    // Ne pas propager l\"erreur critique si le résumé échoue, mais logguer
    // throw error; // Décommenter si l\"échec de sauvegarde doit bloquer
    return null; // Indiquer que la sauvegarde a échoué
  }
};

/**
 * Récupère le résumé d\"une conversation spécifique pour un tenant.
 * @param {string} tenantId - ID du tenant.
 * @param {string} conversationId - ID de la conversation.
 * @returns {Promise<Object|null>} - Résumé de la conversation ou null si non trouvé/erreur.
 */
export const getSummary = async (tenantId, conversationId) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        console.warn(`Tentative de récupération de résumé avec ID invalide: ${conversationId}`);
        return null;
    }
    const convObjectId = new mongoose.Types.ObjectId(conversationId);

    const summary = await ConversationSummary.findOne({
      conversationId: convObjectId,
      tenantId
    });

    return summary;
  } catch (error) {
    console.error(`Erreur lors de la récupération du résumé pour la conversation ${conversationId}:`, error);
    return null;
  }
};

/**
 * Récupère tous les résumés pour un tenant, potentiellement filtrés par date.
 * @param {string} tenantId - ID du tenant.
 * @param {Date} startDate - Date de début.
 * @param {Date} endDate - Date de fin.
 * @returns {Promise<Array>} - Liste des résumés.
 */
export const getPeriodSummary = async (tenantId, startDate, endDate) => {
    try {
        const query = { tenantId };
        if (startDate || endDate) {
            query.lastMessageTimestamp = {};
            if (startDate) query.lastMessageTimestamp.$gte = startDate;
            if (endDate) query.lastMessageTimestamp.$lte = endDate;
        }

        const summaries = await ConversationSummary.find(query).sort({ lastMessageTimestamp: -1 });
        return summaries;

    } catch (error) {
        console.error(`Erreur lors de la récupération des résumés pour le tenant ${tenantId}:`, error);
        return []; // Retourner un tableau vide en cas d\"erreur
    }
};

/**
 * Optimise le stockage des conversations pour un tenant (supprime les anciennes conversations/messages).
 * Cette fonction est un placeholder et nécessite une implémentation détaillée.
 * @param {string} tenantId - ID du tenant.
 * @param {number} daysToKeep - Nombre de jours d\"historique à conserver.
 * @returns {Promise<Object>} - Résultat de l\"opération.
 */
export const optimizeConversationStorage = async (tenantId, daysToKeep) => {
    console.warn(`Fonction optimizeConversationStorage non implémentée pour tenant ${tenantId}, daysToKeep: ${daysToKeep}`);
    // Implémentation future:
    // 1. Calculer la date limite: const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
    // 2. Supprimer les résumés anciens: await ConversationSummary.deleteMany({ tenantId, lastMessageTimestamp: { $lt: cutoffDate } });
    // 3. Supprimer les conversations anciennes: await Conversation.deleteMany({ tenantId, lastActivity: { $lt: cutoffDate } });
    // Ou: Marquer les conversations comme inactives/archivées
    // Ou: Supprimer uniquement les messages anciens dans les conversations actives
    return { success: true, message: "Optimisation non implémentée, aucune action effectuée." };
};

export default {
  generateSummary,
  saveSummary,
  getSummary,
  getPeriodSummary,
  optimizeConversationStorage
};

