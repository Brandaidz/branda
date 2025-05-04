// backend/agents/comptableBot.js
/**
 * Agent spécialisé pour les questions de comptabilité
 * Traite les demandes liées aux finances, chiffre d'affaires, dépenses, etc.
 */

import AccountingEntry from '../models/accountingEntryModel.js';
import Sale from '../models/saleModel.js';
import mongoose from 'mongoose';

/**
 * Traite une demande liée à la comptabilité
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
    
    // Chiffre d'affaires
    if (lowerMessage.includes('chiffre d\'affaires') || lowerMessage.includes('ca') || lowerMessage.includes('revenus')) {
      return await getRevenueInfo(userId, userData.tenantId, lowerMessage);
    }
    
    // Dépenses
    if (lowerMessage.includes('dépense') || lowerMessage.includes('coût') || lowerMessage.includes('frais')) {
      return await getExpensesInfo(userId, userData.tenantId, lowerMessage);
    }
    
    // Bénéfices
    if (lowerMessage.includes('bénéfice') || lowerMessage.includes('profit') || lowerMessage.includes('marge')) {
      return await getProfitInfo(userId, userData.tenantId, lowerMessage);
    }
    
    // Réponse par défaut
    return "Je peux vous aider avec votre comptabilité. Vous pouvez me demander des informations sur votre chiffre d'affaires, vos dépenses, vos bénéfices, etc.";
  } catch (error) {
    console.error('Erreur dans comptableBot:', error);
    return "Je suis désolé, mais je rencontre des difficultés à accéder aux informations comptables. Veuillez réessayer ultérieurement.";
  }
};

/**
 * Récupère les informations sur le chiffre d'affaires
 * @param {string} userId - ID de l'utilisateur
 * @param {string} tenantId - ID du tenant
 * @param {string} message - Message de l'utilisateur
 * @returns {Promise<string>} - Informations sur le chiffre d'affaires
 */
const getRevenueInfo = async (userId, tenantId, message) => {
  // Déterminer la période
  let startDate, endDate;
  const now = new Date();
  
  if (message.includes('aujourd\'hui')) {
    startDate = new Date(now.setHours(0, 0, 0, 0));
    endDate = new Date(now.setHours(23, 59, 59, 999));
  } else if (message.includes('cette semaine')) {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    startDate = new Date(now.setDate(diff));
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(now);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
  } else if (message.includes('ce mois')) {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else {
    // Par défaut, le mois en cours
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }
  
  // Récupérer les ventes pour la période
  const sales = await Sale.find({
    tenantId,
    date: { $gte: startDate, $lte: endDate }
  });
  
  // Calculer le chiffre d'affaires
  const totalRevenue = sales.reduce((total, sale) => total + sale.totalAmount, 0);
  
  // Formater la réponse
  let period;
  if (message.includes('aujourd\'hui')) {
    period = "aujourd'hui";
  } else if (message.includes('cette semaine')) {
    period = "cette semaine";
  } else if (message.includes('ce mois')) {
    period = "ce mois-ci";
  } else {
    period = "ce mois-ci";
  }
  
  return `Votre chiffre d'affaires ${period} est de ${totalRevenue.toFixed(2)} €. Cela représente un total de ${sales.length} ventes.`;
};

/**
 * Récupère les informations sur les dépenses
 * @param {string} userId - ID de l'utilisateur
 * @param {string} tenantId - ID du tenant
 * @param {string} message - Message de l'utilisateur
 * @returns {Promise<string>} - Informations sur les dépenses
 */
const getExpensesInfo = async (userId, tenantId, message) => {
  // Déterminer la période
  let startDate, endDate;
  const now = new Date();
  
  if (message.includes('aujourd\'hui')) {
    startDate = new Date(now.setHours(0, 0, 0, 0));
    endDate = new Date(now.setHours(23, 59, 59, 999));
  } else if (message.includes('cette semaine')) {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    startDate = new Date(now.setDate(diff));
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(now);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
  } else if (message.includes('ce mois')) {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else {
    // Par défaut, le mois en cours
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }
  
  // Récupérer les dépenses pour la période
  const expenses = await AccountingEntry.find({
    tenantId,
    type: 'dépense',
    date: { $gte: startDate, $lte: endDate }
  });
  
  // Calculer le total des dépenses
  const totalExpenses = expenses.reduce((total, expense) => total + expense.amount, 0);
  
  // Calculer les dépenses par catégorie
  const expensesByCategory = {};
  expenses.forEach(expense => {
    if (!expensesByCategory[expense.category]) {
      expensesByCategory[expense.category] = 0;
    }
    expensesByCategory[expense.category] += expense.amount;
  });
  
  // Formater la réponse
  let period;
  if (message.includes('aujourd\'hui')) {
    period = "aujourd'hui";
  } else if (message.includes('cette semaine')) {
    period = "cette semaine";
  } else if (message.includes('ce mois')) {
    period = "ce mois-ci";
  } else {
    period = "ce mois-ci";
  }
  
  let response = `Vos dépenses totales ${period} s'élèvent à ${totalExpenses.toFixed(2)} €.\n\n`;
  
  if (Object.keys(expensesByCategory).length > 0) {
    response += "Répartition par catégorie :\n";
    for (const [category, amount] of Object.entries(expensesByCategory)) {
      response += `- ${category}: ${amount.toFixed(2)} € (${((amount / totalExpenses) * 100).toFixed(1)}%)\n`;
    }
  }
  
  return response;
};

/**
 * Récupère les informations sur les bénéfices
 * @param {string} userId - ID de l'utilisateur
 * @param {string} tenantId - ID du tenant
 * @param {string} message - Message de l'utilisateur
 * @returns {Promise<string>} - Informations sur les bénéfices
 */
const getProfitInfo = async (userId, tenantId, message) => {
  // Déterminer la période
  let startDate, endDate;
  const now = new Date();
  
  if (message.includes('aujourd\'hui')) {
    startDate = new Date(now.setHours(0, 0, 0, 0));
    endDate = new Date(now.setHours(23, 59, 59, 999));
  } else if (message.includes('cette semaine')) {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    startDate = new Date(now.setDate(diff));
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(now);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
  } else if (message.includes('ce mois')) {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else {
    // Par défaut, le mois en cours
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }
  
  // Récupérer les ventes pour la période
  const sales = await Sale.find({
    tenantId,
    date: { $gte: startDate, $lte: endDate }
  });
  
  // Calculer le chiffre d'affaires
  const totalRevenue = sales.reduce((total, sale) => total + sale.totalAmount, 0);
  
  // Récupérer les dépenses pour la période
  const expenses = await AccountingEntry.find({
    tenantId,
    type: 'dépense',
    date: { $gte: startDate, $lte: endDate }
  });
  
  // Calculer le total des dépenses
  const totalExpenses = expenses.reduce((total, expense) => total + expense.amount, 0);
  
  // Calculer le bénéfice
  const profit = totalRevenue - totalExpenses;
  const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
  
  // Formater la réponse
  let period;
  if (message.includes('aujourd\'hui')) {
    period = "aujourd'hui";
  } else if (message.includes('cette semaine')) {
    period = "cette semaine";
  } else if (message.includes('ce mois')) {
    period = "ce mois-ci";
  } else {
    period = "ce mois-ci";
  }
  
  return `Votre bénéfice ${period} est de ${profit.toFixed(2)} €, soit une marge de ${profitMargin.toFixed(1)}%.\n\nCe résultat est basé sur un chiffre d'affaires de ${totalRevenue.toFixed(2)} € et des dépenses de ${totalExpenses.toFixed(2)} €.`;
};

export default { handle };
