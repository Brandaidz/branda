// backend/agents/fallbackBot.js
/**
 * Agent Fallback : réponse par défaut lorsque l\"intention n\"est pas comprise
 * ou qu\"aucun autre agent ne peut traiter la demande.
 */

import { generateResponse } from "../services/openaiService.js"; // Optionnel: utiliser l\"IA pour une réponse plus générique

/**
 * Traite une demande non comprise par les autres agents
 * @param {Object} params - Paramètres de la demande
 * @param {string} params.userId - ID de l\"utilisateur
 * @param {string} params.message - Message de l\"utilisateur
 * @param {Array} params.history - Historique de la conversation
 * @param {Object} params.userData - Données de l\"utilisateur
 * @returns {Promise<string>} - Réponse de l\"agent
 */
export const handle = async ({ userId, message, history, userData }) => {
  try {
    // Réponse simple par défaut
    // return `Désolé, je n\"ai pas bien compris votre demande concernant \"${message}\". Pourriez-vous reformuler ou me poser une question sur vos produits, ventes, employés, comptabilité ou marketing ?`;

    // Optionnel: Utiliser l\"IA pour une réponse plus contextuelle
    const prompt = `L\"utilisateur a dit: \"${message}\". Je n\"ai pas compris la demande ou aucun agent spécialisé n\"a pu y répondre. Réponds gentiment que tu n\"as pas compris et suggère des sujets que tu peux aborder (produits, ventes, employés, comptabilité, marketing).`;
    // Note: L\"historique peut être ajouté au prompt pour plus de contexte
    // const conversation = [...history, { role: \"user\", content: prompt }];
    // return await generateResponse(conversation, { temperature: 0.5 });
    
    // Pour l\"instant, gardons une réponse statique simple
     return `Désolé, je n\"ai pas bien compris votre demande. Pourriez-vous reformuler ? Je peux vous aider avec des questions sur vos produits, ventes, employés, comptabilité ou marketing.`;

  } catch (error) {
    console.error("Erreur dans fallbackBot:", error);
    // Fournir une réponse statique en cas d\"erreur de l\"IA si utilisée
    return "Je suis désolé, une erreur s\"est produite. Pourriez-vous reformuler votre demande ?";
  }
};

export default { handle };

