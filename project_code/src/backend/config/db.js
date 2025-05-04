// backend/config/db.js
import mongoose from "mongoose";
import logger from "./logger.js";

export default async () => {
  // Déterminer l'URI de connexion en fonction de l'environnement
  const mongoUri = process.env.NODE_ENV === 'test' 
    ? process.env.MONGO_URI_TEST // Défini dans jest.setup.js
    : process.env.MONGO_URI;

  if (!mongoUri) {
    logger.error("Erreur: MONGO_URI (ou MONGO_URI_TEST en mode test) n'est pas défini dans les variables d'environnement.");
    process.exit(1);
  }

  try {
    // Utiliser l'URI déterminé
    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    // Ne pas logger en mode test pour éviter le bruit
    if (process.env.NODE_ENV !== 'test') {
        logger.info("✅ Connecté à MongoDB");
    }
  } catch (e) {
    logger.error("Erreur de connexion MongoDB:", { error: e.message, stack: e.stack });
    process.exit(1);
  }
};

