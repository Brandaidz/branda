// backend/agents/businessDataBot.js
/**
 * Agent spécialisé pour les questions liées aux données commerciales
 * Traite les demandes liées aux produits, ventes, clients, stocks, etc.
 */

import Product from '../models/productModel.js';
import Sale from '../models/saleModel.js';
import mongoose from 'mongoose';

/**
 * Traite une demande liée aux données commerciales
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
    
    // Produits
    if (lowerMessage.includes('produit') || lowerMessage.includes('stock')) {
      return await getProductInfo(userId, userData.tenantId, lowerMessage);
    }
    
    // Ventes
    if (lowerMessage.includes('vente') || lowerMessage.includes('client') || lowerMessage.includes('commande')) {
      return await getSalesInfo(userId, userData.tenantId, lowerMessage);
    }
    
    // Réponse par défaut
    return "Je peux vous aider avec vos données commerciales. Vous pouvez me demander des informations sur vos produits, vos ventes, vos clients, etc.";
  } catch (error) {
    console.error('Erreur dans businessDataBot:', error);
    return "Je suis désolé, mais je rencontre des difficultés à accéder aux données commerciales. Veuillez réessayer ultérieurement.";
  }
};

/**
 * Récupère les informations sur les produits
 * @param {string} userId - ID de l'utilisateur
 * @param {string} tenantId - ID du tenant
 * @param {string} message - Message de l'utilisateur
 * @returns {Promise<string>} - Informations sur les produits
 */
const getProductInfo = async (userId, tenantId, message) => {
  // Vérifier si on demande les produits en rupture
  if (message.includes('rupture') || message.includes('épuisé')) {
    const outOfStockProducts = await Product.find({
      tenantId,
      stock: { $lte: 0 },
      isActive: true
    });
    
    if (outOfStockProducts.length === 0) {
      return "Bonne nouvelle ! Aucun produit n'est actuellement en rupture de stock.";
    }
    
    let response = `Vous avez ${outOfStockProducts.length} produit(s) en rupture de stock :\n\n`;
    outOfStockProducts.forEach(product => {
      response += `- ${product.name} (${product.category || 'Sans catégorie'})\n`;
    });
    
    return response;
  }
  
  // Vérifier si on demande les produits d'une catégorie spécifique
  let categoryFilter = null;
  const categoryMatch = message.match(/catégorie\s+(\w+)/i);
  if (categoryMatch) {
    categoryFilter = categoryMatch[1];
  }
  
  // Construire la requête
  const query = { tenantId, isActive: true };
  if (categoryFilter) {
    query.category = new RegExp(categoryFilter, 'i');
  }
  
  // Récupérer les produits
  const products = await Product.find(query).sort({ name: 1 });
  
  if (products.length === 0) {
    if (categoryFilter) {
      return `Aucun produit trouvé dans la catégorie "${categoryFilter}".`;
    }
    return "Aucun produit n'est actuellement enregistré dans votre inventaire.";
  }
  
  let response = categoryFilter 
    ? `Voici les produits de la catégorie "${categoryFilter}" :\n\n` 
    : `Voici la liste de vos produits :\n\n`;
  
  products.forEach(product => {
    response += `- ${product.name} : ${product.price.toFixed(2)} € | Stock: ${product.stock} unité(s)`;
    if (product.category) {
      response += ` | Catégorie: ${product.category}`;
    }
    response += '\n';
  });
  
  return response;
};

/**
 * Récupère les informations sur les ventes
 * @param {string} userId - ID de l'utilisateur
 * @param {string} tenantId - ID du tenant
 * @param {string} message - Message de l'utilisateur
 * @returns {Promise<string>} - Informations sur les ventes
 */
const getSalesInfo = async (userId, tenantId, message) => {
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
  }).sort({ date: -1 });
  
  // Vérifier si on demande les meilleures ventes
  if (message.includes('meilleure') || message.includes('top') || message.includes('plus vendu')) {
    // Calculer les quantités vendues par produit
    const productSales = {};
    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (!productSales[item.productId]) {
          productSales[item.productId] = {
            name: item.productName,
            quantity: 0,
            revenue: 0
          };
        }
        productSales[item.productId].quantity += item.quantity;
        productSales[item.productId].revenue += item.totalPrice;
      });
    });
    
    // Convertir en tableau et trier par quantité
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
    
    if (topProducts.length === 0) {
      return "Aucune vente n'a été enregistrée pour cette période.";
    }
    
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
    
    let response = `Voici vos produits les plus vendus ${period} :\n\n`;
    topProducts.forEach((product, index) => {
      response += `${index + 1}. ${product.name} : ${product.quantity} unité(s) vendues pour ${product.revenue.toFixed(2)} €\n`;
    });
    
    return response;
  }
  
  // Réponse générale sur les ventes
  if (sales.length === 0) {
    return "Aucune vente n'a été enregistrée pour cette période.";
  }
  
  // Calculer les statistiques
  const totalSales = sales.length;
  const totalRevenue = sales.reduce((total, sale) => total + sale.totalAmount, 0);
  const averageTicket = totalRevenue / totalSales;
  
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
  
  return `Vous avez réalisé ${totalSales} vente(s) ${period} pour un total de ${totalRevenue.toFixed(2)} €. Le panier moyen est de ${averageTicket.toFixed(2)} €.`;
};

export default { handle };
