// backend/agents/rhBot.js
/**
 * Agent spécialisé pour les questions liées aux ressources humaines
 * Traite les demandes liées aux employés, recrutement, planning, performance, etc.
 */

import Employee from "../models/employeeModel.js";
import mongoose from "mongoose";

/**
 * Traite une demande liée aux ressources humaines
 * @param {Object} params - Paramètres de la demande
  * @param {string} params.userId - ID de l'utilisateur (peut être utile pour des permissions futures) * @param {string} params.message - Message de l'utilisateur * @param {Array} params.history - Historique de la conversation
 * @param {Object} params.userData - Données de l'utilisateur, incluant tenantId
 * @returns {Promise<string>} - Réponse de l'agent
 */
export const handle = async ({ userId, message, history, userData }) => {
  try {
    const lowerMessage = message.toLowerCase();
    const tenantId = userData.tenantId;

    // Lister les employés
    if (lowerMessage.includes("liste des employés") || lowerMessage.includes("combien d'employés") || lowerMessage.includes("qui sont mes employés")) {
      const activeOnly = !lowerMessage.includes("tous"); // Lister seulement les actifs par défaut
      const query = { tenantId };
      if (activeOnly) {
        query.isActive = true;
      }
      const employees = await Employee.find(query).sort({ lastName: 1, firstName: 1 });

      if (employees.length === 0) {
        return activeOnly ? "Vous n'avez aucun employé actif actuellement." : "Aucun employé enregistré.";
      }

      let response = `Vous avez ${employees.length} employé(s)${activeOnly ? " actif(s)" : ""} :\n\n`;
      employees.forEach(e => {
        response += `- ${e.firstName} ${e.lastName} (${e.position || "poste non défini"})${e.isActive ? "" : " (Inactif)"}\n`;
      });
      return response;
    }

    // Informations sur un employé spécifique (simpliste, pourrait être amélioré)
    const employeeMatch = lowerMessage.match(/informations sur ([\w\s]+)/i);
    if (employeeMatch) {
        const employeeName = employeeMatch[1].trim();
        // Recherche simple par prénom/nom - peut nécessiter une logique plus robuste
        const employee = await Employee.findOne({
            tenantId,
            $or: [
                { firstName: new RegExp(employeeName, "i") },
                { lastName: new RegExp(employeeName, "i") }
            ]
        });

        if (!employee) {
            return `Je n'ai pas trouvé d'employé nommé ${employeeName}.`;
        }

        return `Voici les informations pour ${employee.firstName} ${employee.lastName}:\n- Poste: ${employee.position || "Non défini"}\n- Email: ${employee.email || "Non fourni"}\n- Téléphone: ${employee.phone || "Non fourni"}\n- Statut: ${employee.isActive ? "Actif" : "Inactif"}`;
    }

    // Autres questions RH (planning, performance) - à implémenter
    if (lowerMessage.includes("planning") || lowerMessage.includes("horaire")) {
        return "La fonctionnalité de consultation des plannings n'est pas encore entièrement disponible via le chat.";
    }
    if (lowerMessage.includes("performance") || lowerMessage.includes("évaluation")) {
        return "La fonctionnalité de consultation des performances n'est pas encore entièrement disponible via le chat.";
    }

    // Réponse par défaut
    return "Je peux vous aider avec les ressources humaines. Vous pouvez me demander la liste de vos employés, des informations sur un employé spécifique, etc.";
  } catch (error) {
    console.error("Erreur dans rhBot:", error);
    return "Je suis désolé, mais je rencontre des difficultés à accéder aux informations RH. Veuillez réessayer ultérieurement.";
  }
};

export default { handle };

