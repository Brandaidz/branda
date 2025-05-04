// backend/scripts/testMemoryContext.js
require('dotenv').config();
const mongoose = require('mongoose');
const { getRecentHistory, formatHistoryForAI } = require('../services/contextManager');
const { generateResponse } = require('../services/openaiService');
const { createPeriodSummary } = require('../services/summaryManager');
const User = require('../models/userModel');
const Conversation = require('../models/conversationModel');

// Fonction pour tester la cohérence des conversations
async function testConversationCoherence(userId) {
  console.log(`\n=== Test de cohérence des conversations pour ${userId} ===`);
  
  try {
    // 1. Récupérer l'utilisateur
    const user = await User.findOne({ userId });
    if (!user) {
      console.error(`Utilisateur ${userId} non trouvé`);
      return false;
    }
    
    // 2. Récupérer l'historique récent
    console.log("Récupération de l'historique récent...");
    const history = await getRecentHistory(userId, 10);
    console.log(`${history.length} messages récupérés`);
    
    // 3. Formater l'historique pour l'IA
    const formattedHistory = formatHistoryForAI(history);
    
    // 4. Générer une réponse avec contexte
    console.log("Génération d'une réponse avec contexte...");
    const testQuestion = "Peux-tu résumer notre conversation jusqu'à présent?";
    const response = await generateResponse([
      ...formattedHistory,
      { role: 'user', content: testQuestion }
    ], user.businessData);
    
    console.log("\nRésumé généré par l'IA:");
    console.log(response);
    
    // 5. Créer un résumé de période
    console.log("\nCréation d'un résumé de période...");
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const summary = await createPeriodSummary(userId, oneWeekAgo, new Date());
    
    if (summary) {
      console.log("Résumé créé avec succès:");
      console.log(`- Période: ${summary.startDate} à ${summary.endDate}`);
      console.log(`- Nombre de messages: ${summary.messageCount}`);
      console.log(`- Sujets: ${summary.topics.join(', ')}`);
      console.log(`- Résumé: ${summary.summary}`);
    } else {
      console.log("Aucun résumé créé (pas assez de messages ou erreur)");
    }
    
    return true;
  } catch (error) {
    console.error("Erreur lors du test de cohérence:", error);
    return false;
  }
}

// Fonction principale
async function main() {
  try {
    // Connexion à la base de données
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connecté à MongoDB");
    
    // Tester la cohérence pour les deux utilisateurs
    await testConversationCoherence("fastfood2025");
    await testConversationCoherence("salonelchic2025");
    
    console.log("\n=== Tests terminés ===");
  } catch (error) {
    console.error("Erreur:", error);
  } finally {
    // Fermer la connexion à la base de données
    await mongoose.connection.close();
    console.log("Connexion à MongoDB fermée");
  }
}

// Exécuter le script
main();
