// backend/agents/marketingBot.js
/**
 * Agent spécialisé pour les questions de marketing
 * Traite les demandes liées au marketing, publicité, réseaux sociaux, etc.
 */

import { generateResponse } from '../services/openaiService.js';

/**
 * Traite une demande liée au marketing
 * @param {Object} params - Paramètres de la demande
 * @param {string} params.userId - ID de l'utilisateur
 * @param {string} params.message - Message de l'utilisateur
 * @param {Array} params.history - Historique de la conversation
 * @param {Object} params.userData - Données de l'utilisateur
 * @returns {Promise<string>} - Réponse de l'agent
 */
export const handle = async ({ userId, message, history, userData }) => {
  try {
    const lowerMessage = message.toLowerCase();
    
    // Réseaux sociaux
    if (lowerMessage.includes('réseau social') || lowerMessage.includes('facebook') || 
        lowerMessage.includes('instagram') || lowerMessage.includes('twitter') || 
        lowerMessage.includes('linkedin') || lowerMessage.includes('tiktok')) {
      return await getSocialMediaAdvice(message);
    }
    
    // Publicité
    if (lowerMessage.includes('publicité') || lowerMessage.includes('pub') || 
        lowerMessage.includes('annonce') || lowerMessage.includes('campagne')) {
      return await getAdvertisingAdvice(message);
    }
    
    // Stratégie marketing
    if (lowerMessage.includes('stratégie') || lowerMessage.includes('plan marketing') || 
        lowerMessage.includes('promotion') || lowerMessage.includes('marketing')) {
      return await getMarketingStrategyAdvice(message);
    }
    
    // Réponse par défaut
    return "Je peux vous aider avec vos questions marketing. N'hésitez pas à me demander des conseils sur les réseaux sociaux, la publicité, ou votre stratégie marketing globale.";
  } catch (error) {
    console.error('Erreur dans marketingBot:', error);
    return "Je suis désolé, mais je rencontre des difficultés à traiter votre demande marketing. Veuillez réessayer ultérieurement.";
  }
};

/**
 * Génère des conseils sur les réseaux sociaux
 * @param {string} message - Message de l'utilisateur
 * @returns {Promise<string>} - Conseils sur les réseaux sociaux
 */
const getSocialMediaAdvice = async (message) => {
  const prompt = `En tant qu'expert en marketing digital, donne des conseils pratiques et concrets sur les réseaux sociaux en réponse à cette question: "${message}". 
  Limite ta réponse à 3-4 paragraphes maximum avec des conseils actionnables. Sois spécifique et évite les généralités.`;
  
  try {
    return await generateResponse(prompt, { temperature: 0.7 });
  } catch (error) {
    console.error('Erreur lors de la génération de conseils sur les réseaux sociaux:', error);
    return "Pour améliorer votre présence sur les réseaux sociaux, je vous recommande de publier régulièrement du contenu de qualité qui intéresse votre audience, d'interagir avec vos abonnés, et d'analyser les performances de vos publications pour optimiser votre stratégie.";
  }
};

/**
 * Génère des conseils sur la publicité
 * @param {string} message - Message de l'utilisateur
 * @returns {Promise<string>} - Conseils sur la publicité
 */
const getAdvertisingAdvice = async (message) => {
  const prompt = `En tant qu'expert en publicité, donne des conseils pratiques et concrets sur les campagnes publicitaires en réponse à cette question: "${message}". 
  Limite ta réponse à 3-4 paragraphes maximum avec des conseils actionnables. Sois spécifique et évite les généralités.`;
  
  try {
    return await generateResponse(prompt, { temperature: 0.7 });
  } catch (error) {
    console.error('Erreur lors de la génération de conseils sur la publicité:', error);
    return "Pour optimiser vos campagnes publicitaires, je vous recommande de définir clairement votre audience cible, de créer des messages publicitaires percutants, de tester différentes versions de vos annonces, et de suivre régulièrement vos indicateurs de performance pour ajuster votre stratégie.";
  }
};

/**
 * Génère des conseils sur la stratégie marketing
 * @param {string} message - Message de l'utilisateur
 * @returns {Promise<string>} - Conseils sur la stratégie marketing
 */
const getMarketingStrategyAdvice = async (message) => {
  const prompt = `En tant que consultant en stratégie marketing, donne des conseils pratiques et concrets sur la stratégie marketing en réponse à cette question: "${message}". 
  Limite ta réponse à 3-4 paragraphes maximum avec des conseils actionnables. Sois spécifique et évite les généralités.`;
  
  try {
    return await generateResponse(prompt, { temperature: 0.7 });
  } catch (error) {
    console.error('Erreur lors de la génération de conseils sur la stratégie marketing:', error);
    return "Pour développer une stratégie marketing efficace, je vous recommande d'analyser votre marché et votre concurrence, de définir clairement votre proposition de valeur, de segmenter votre audience, et de mettre en place un mix marketing cohérent (produit, prix, distribution, communication).";
  }
};

export default { handle };
