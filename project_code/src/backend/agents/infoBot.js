// backend/agents/infoBot.js
/**
 * Agent spécialisé pour les questions générales sur l'entreprise/foyer
 * Récupère les informations de base depuis le profil utilisateur.
 */

import User from "../models/userModel.js";
import mongoose from "mongoose";

/**
 * Traite une demande d'information générale
 * @param {Object} params - Paramètres de la demande
 * @param {string} params.userId - ID de l'utilisateur
 * @param {string} params.message - Message de l'utilisateur
 * @param {Array} params.history - Historique de la conversation
 * @param {Object} params.userData - Données de l'utilisateur, incluant tenantId et potentiellement le profil
 * @returns {Promise<string>} - Réponse de l'agent
 */
export const handle = async ({ userId, message, history, userData }) => {
  try {
    const tenantId = userData.tenantId;
    const lowerMessage = message.toLowerCase();

    // Tenter de récupérer le profil utilisateur complet pour avoir les infos
    // Note: Idéalement, userData contiendrait déjà les profils pertinents
    // Si ce n'est pas le cas, une requête DB est nécessaire.
    let userProfile = userData.profile; // Supposons que le profil est passé dans userData
    if (!userProfile) {
        const user = await User.findOne({ _id: userId, tenantId }).select("businessProfile familyProfile");
        if (!user) {
            return "Je n'ai pas pu trouver vos informations de profil.";
        }
        // Déterminer quel profil utiliser (Pro ou Famille) - Logique à affiner
        // Pour l'instant, on priorise le profil pro s'il existe
        userProfile = user.businessProfile || user.familyProfile;
    }

    if (!userProfile) {
        return "Aucune information de profil n'a été trouvée.";
    }

    // Informations sur l'entreprise (Profil Pro)
    if (userProfile.nom) { // Check for business profile field
        let response = `Voici les informations de base sur votre entreprise:\n`;
        response += `- Nom: ${userProfile.nom || "Non défini"}\n`;
        response += `- Secteur: ${userProfile.secteur || "Non défini"}\n`;
        response += `- Nombre d'employés: ${userProfile.nombreEmployes !== undefined ? userProfile.nombreEmployes : "Non défini"}\n`;
        response += `- Objectifs: ${userProfile.objectifs || "Non définis"}\n`;
        return response;
    }
    // Informations sur le foyer (Profil Famille)
    else if (userProfile.nomFoyer) { // Check for family profile field
        let response = `Voici les informations de base sur votre foyer:\n`;
        response += `- Nom du foyer: ${userProfile.nomFoyer || "Non défini"}\n`;
        if (userProfile.membres && userProfile.membres.length > 0) {
            response += `- Membres: ${userProfile.membres.map(m => m.nom).join(", ")}\n`;
        }
        return response;
    }

    return "Je n'ai pas trouvé d'informations spécifiques à afficher.";

  } catch (error) {
    console.error("Erreur dans infoBot:", error);
    return "Je suis désolé, mais je rencontre des difficultés à accéder aux informations générales. Veuillez réessayer ultérieurement.";
  }
};

export default { handle };

