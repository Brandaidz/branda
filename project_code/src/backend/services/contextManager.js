// backend/services/contextManager.js
import { getChatHistory, setChatHistory } from './redisService.js';
import Conversation from '../models/conversationModel.js';
import { getSummary } from './summaryManager.js';
import logger from "../config/logger.js";
import { runInTenantContext } from './contextService.js';

/**
 * Récupère l'historique de conversation depuis Redis ou MongoDB
 * @param {string} userId - ID de l'utilisateur
 * @param {string} conversationId - ID de la conversation
 * @returns {Promise<Array>} - Historique de la conversation
 */
export const getConversationHistory = async (userId, conversationId) => {
  try {
    // Essayer d'abord de récupérer l'historique depuis Redis
    logger.info(`Récupération de l'historique pour conversation ${conversationId} (utilisateur ${userId})`);
    const cachedHistory = await getChatHistory(userId, conversationId);
    if (cachedHistory) {
      logger.info(`Historique trouvé dans le cache Redis pour conversation ${conversationId}`);
      return cachedHistory;
    }
    
    // Si pas en cache, récupérer depuis MongoDB
    logger.info(`Historique non trouvé dans le cache, recherche dans MongoDB pour conversation ${conversationId}`);
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      logger.warn(`Aucune conversation trouvée avec l'ID ${conversationId}`);
      return [];
    }
    
    // Mettre en cache pour les prochaines requêtes
    logger.info(`Mise en cache de l'historique pour conversation ${conversationId}`);
    await setChatHistory(userId, conversationId, conversation.messages);
    
    return conversation.messages;
  } catch (error) {
    logger.error(`Erreur lors de la récupération de l'historique de conversation ${conversationId}:`, { error: error.message, stack: error.stack });
    return [];
  }
};

/**
 * Ajoute un message à l'historique de conversation
 * @param {string} userId - ID de l'utilisateur
 * @param {string} tenantId - ID du tenant
 * @param {string} conversationId - ID de la conversation
 * @param {Object} message - Message à ajouter
 * @returns {Promise<Array>} - Historique mis à jour
 */
export const addMessageToHistory = async (userId, tenantId, conversationId, message) => {
  return runInTenantContext(tenantId, async () => {
    try {
      // Récupérer l'historique actuel
      logger.info(`Ajout d'un message à la conversation ${conversationId} (utilisateur ${userId}, tenant ${tenantId})`);
      let history = await getConversationHistory(userId, conversationId);
      
      // Ajouter le nouveau message
      history.push(message);
      
      // Mettre à jour le cache Redis
      logger.info(`Mise à jour du cache Redis pour conversation ${conversationId}`);
      await setChatHistory(userId, conversationId, history);
      
      // Mettre à jour MongoDB
      logger.info(`Mise à jour de MongoDB pour conversation ${conversationId}`);
      await Conversation.findByIdAndUpdate(
        conversationId,
        { 
          $push: { messages: message },
          $set: { lastActivity: new Date() }
        },
        { new: true }
      );
      
      return history;
    } catch (error) {
      logger.error(`Erreur lors de l'ajout du message à l'historique de conversation ${conversationId}:`, { error: error.message, stack: error.stack });
      throw error;
    }
  });
};

/**
 * Crée une nouvelle conversation
 * @param {string} userId - ID de l'utilisateur
 * @param {string} tenantId - ID du tenant
 * @param {string} title - Titre de la conversation
 * @returns {Promise<Object>} - Nouvelle conversation
 */
export const createConversation = async (userId, tenantId, title = "Nouvelle conversation") => {
  return runInTenantContext(tenantId, async () => {
    try {
      logger.info(`Création d'une nouvelle conversation pour l'utilisateur ${userId} (tenant ${tenantId})`);
      const conversation = new Conversation({
        userId,
        tenantId,
        title,
        messages: [],
        lastActivity: new Date(),
        isActive: true
      });
      
      await conversation.save();
      logger.info(`Nouvelle conversation créée avec l'ID ${conversation._id}`);
      return conversation;
    } catch (error) {
      logger.error(`Erreur lors de la création de la conversation:`, { error: error.message, stack: error.stack });
      throw error;
    }
  });
};

/**
 * Génère des suggestions contextuelles basées sur l'historique de conversation
 * @param {string} userId - ID de l'utilisateur
 * @param {string} conversationId - ID de la conversation
 * @returns {Promise<Array>} - Suggestions contextuelles
 */
export const generateContextualSuggestions = async (userId, conversationId) => {
  try {
    logger.info(`Génération de suggestions contextuelles pour conversation ${conversationId}`);
    // Récupérer le résumé de la conversation
    const summary = await getSummary(conversationId);
    
    if (!summary) {
      logger.info(`Aucun résumé trouvé pour conversation ${conversationId}, utilisation des suggestions par défaut`);
      return getDefaultSuggestions();
    }
    
    // Générer des suggestions basées sur les entités et points clés
    const suggestions = [];
    
    // Suggestions basées sur les entités
    summary.entities.forEach(entity => {
      if (entity.type === 'produit') {
        suggestions.push(`Quelles sont les ventes pour ${entity.value} ?`);
      } else if (entity.type === 'client') {
        suggestions.push(`Montrez-moi l'historique du client ${entity.value}`);
      } else if (entity.type === 'employé') {
        suggestions.push(`Quel est le planning de ${entity.value} ?`);
      }
    });
    
    // Suggestions basées sur les points clés
    if (summary.keyPoints.some(point => point.toLowerCase().includes('vente'))) {
      suggestions.push('Quel est mon chiffre d\'affaires ce mois-ci ?');
    }
    
    if (summary.keyPoints.some(point => point.toLowerCase().includes('stock'))) {
      suggestions.push('Quels produits sont en rupture de stock ?');
    }
    
    if (summary.keyPoints.some(point => point.toLowerCase().includes('employé'))) {
      suggestions.push('Montrez-moi les performances de l\'équipe');
    }
    
    // Si pas assez de suggestions, ajouter des suggestions par défaut
    if (suggestions.length < 3) {
      const defaultSuggestions = getDefaultSuggestions();
      for (let i = 0; i < defaultSuggestions.length && suggestions.length < 3; i++) {
        if (!suggestions.includes(defaultSuggestions[i])) {
          suggestions.push(defaultSuggestions[i]);
        }
      }
    }
    
    // Limiter à 3 suggestions
    logger.info(`${suggestions.length} suggestions générées pour conversation ${conversationId}`);
    return suggestions.slice(0, 3);
  } catch (error) {
    logger.error(`Erreur lors de la génération des suggestions contextuelles pour conversation ${conversationId}:`, { error: error.message, stack: error.stack });
    return getDefaultSuggestions();
  }
};

/**
 * Retourne des suggestions par défaut
 * @returns {Array} - Suggestions par défaut
 */
const getDefaultSuggestions = () => {
  return [
    'Quel est mon chiffre d\'affaires aujourd\'hui ?',
    'Combien de clients ai-je servis cette semaine ?',
    'Quels sont mes produits les plus vendus ?'
  ];
};

export default {
  getConversationHistory,
  addMessageToHistory,
  createConversation,
  generateContextualSuggestions
};
