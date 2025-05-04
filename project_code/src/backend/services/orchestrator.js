// backend/services/orchestrator.js
import { generateChatResponse } from './openaiService.js';
import { getCachedAIResponse, cacheAIResponse } from './redisService.js';
import { addSummaryJob } from './queueService.js';

// Import des agents spécialisés
import comptableBot from '../agents/comptableBot.js';
import businessDataBot from '../agents/businessDataBot.js';
import marketingBot from '../agents/marketingBot.js';
import rhBot from '../agents/rhBot.js';
import infoBot from '../agents/infoBot.js';
import fallbackBot from '../agents/fallbackBot.js';

/**
 * Détermine quel agent doit traiter la demande de l'utilisateur
 * @param {string} userId - ID de l'utilisateur
 * @param {string} message - Message de l'utilisateur
 * @param {Array} history - Historique de la conversation
 * @param {Object} userData - Données de l'utilisateur
 * @returns {Promise<string>} - Réponse de l'agent
 */
export const runBot = async (userId, message, history, userData) => {
  try {
    // Vérifier si une réponse est déjà en cache
    const cacheKey = `${userId}:${message}`;
    const cachedResponse = await getCachedAIResponse(cacheKey);
    if (cachedResponse) {
      console.log('Réponse récupérée du cache');
      return cachedResponse;
    }

    // Déterminer le type de demande pour choisir l'agent approprié
    const botType = await determineIntention(message, history);
    
    // Exécuter l'agent approprié
    let response;
    switch (botType) {
      case 'comptable':
        response = await comptableBot.handle({ userId, message, history, userData });
        break;
      case 'business':
        response = await businessDataBot.handle({ userId, message, history, userData });
        break;
      case 'marketing':
        response = await marketingBot.handle({ userId, message, history, userData });
        break;
      case 'rh':
        response = await rhBot.handle({ userId, message, history, userData });
        break;
      case 'info':
        response = await infoBot.handle({ userId, message, history, userData });
        break;
      default:
        response = await fallbackBot.handle({ userId, message, history, userData });
    }

    // Mettre en cache la réponse
    await cacheAIResponse(cacheKey, response);
    
    // Ajouter un job pour générer un résumé de la conversation
    if (history.length > 5) {
      await addSummaryJob({
        userId,
        tenantId: userData.tenantId,
        conversationId: userData.conversationId,
        messages: [...history, { role: 'user', content: message }, { role: 'assistant', content: response }]
      });
    }
    
    return response;
  } catch (error) {
    console.error('Erreur dans l\'orchestrateur:', error);
    return "Je suis désolé, mais je rencontre actuellement des difficultés à traiter votre demande. Veuillez réessayer dans quelques instants.";
  }
};

/**
 * Détermine l'intention de l'utilisateur pour choisir l'agent approprié
 * @param {string} message - Message de l'utilisateur
 * @param {Array} history - Historique de la conversation
 * @returns {Promise<string>} - Type d'agent à utiliser
 */
const determineIntention = async (message, history) => {
  try {
    // Construire le prompt pour déterminer l'intention
    const prompt = `Détermine à quelle catégorie appartient la question suivante:
    
Message: "${message}"

Catégories:
- comptable: questions liées à la comptabilité, finances, chiffre d'affaires, dépenses, etc.
- business: questions liées aux produits, ventes, clients, stocks, etc.
- marketing: questions liées au marketing, publicité, réseaux sociaux, etc.
- rh: questions liées aux employés, recrutement, planning, performance, etc.
- info: questions générales ou demandes d'information sur l'entreprise
- autre: questions qui ne correspondent à aucune catégorie ci-dessus

Réponds uniquement avec le nom de la catégorie, sans explication.`;

    // Utiliser l'API OpenAI pour déterminer l'intention
    const response = await generateChatResponse([{ role: 'user', content: prompt }], { temperature: 0.3 });
    
    // Nettoyer et normaliser la réponse
    const intention = response.toLowerCase().trim();
    
    // Mapper l'intention à un type d'agent
    if (intention.includes('comptable')) return 'comptable';
    if (intention.includes('business')) return 'business';
    if (intention.includes('marketing')) return 'marketing';
    if (intention.includes('rh')) return 'rh';
    if (intention.includes('info')) return 'info';
    
    return 'fallback';
  } catch (error) {
    console.error('Erreur lors de la détermination de l\'intention:', error);
    return 'fallback';
  }
};

export default {
  runBot
};
