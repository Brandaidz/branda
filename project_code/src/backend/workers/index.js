// backend/workers/index.js
import { connectDB } from "../config/database.js";
import { createWorker, QUEUE_NAMES, closeQueues } from "../services/queueService.js";
import { processChatJob } from "./openaiWorker.js"; // Assurez-vous que ce fichier existe et exporte cette fonction
import { processSummaryJob } from "./summaryWorker.js"; // Assurez-vous que ce fichier existe et exporte cette fonction

// --- Initialisation --- //

console.log("Initialisation des workers...");

// 1. Connexion à la base de données
connectDB()
  .then(() => {
    console.log("Connexion à la base de données réussie pour les workers.");

    // 2. Création des workers après la connexion DB
    try {
      const chatWorker = createWorker(QUEUE_NAMES.OPENAI_CHAT, processChatJob, {
        concurrency: 5, // Ajustez selon les besoins
      });
      console.log(`Worker ${QUEUE_NAMES.OPENAI_CHAT} démarré.`);

      const summaryWorker = createWorker(QUEUE_NAMES.SUMMARY_GENERATE, processSummaryJob, {
        concurrency: 2, // Moins de concurrence pour les résumés
      });
      console.log(`Worker ${QUEUE_NAMES.SUMMARY_GENERATE} démarré.`);

      console.log("Tous les workers ont été initialisés.");

    } catch (workerError) {
      console.error("Erreur lors de la création des workers BullMQ:", workerError);
      process.exit(1); // Quitter si les workers ne peuvent pas démarrer
    }
  })
  .catch((dbError) => {
    console.error("Échec de la connexion à la base de données pour les workers:", dbError);
    process.exit(1); // Quitter si la connexion DB échoue
  });

// --- Gestion des signaux d'arrêt --- //

const shutdown = async (signal) => {
  console.log(`${signal} reçu, arrêt gracieux des workers...`);
  try {
    await closeQueues(); // Ferme les connexions BullMQ
    // Ajoutez ici la fermeture d'autres ressources si nécessaire (ex: connexion DB si gérée manuellement)
    console.log("Workers et files d'attente fermés avec succès.");
    process.exit(0);
  } catch (error) {
    console.error("Erreur lors de l'arrêt gracieux:", error);
    process.exit(1);
  }
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT")); // Ctrl+C

// --- Gestion des erreurs non capturées --- //

process.on("uncaughtException", (error) => {
  console.error("Exception non capturée:", error);
  // Envisagez un arrêt gracieux ici aussi, mais attention aux états incohérents
  // shutdown("uncaughtException").catch(err => console.error("Erreur lors de l'arrêt après uncaughtException:", err));
  // Ou simplement quitter après log
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Rejet de promesse non géré:", promise, "raison:", reason);
  // Envisagez un arrêt gracieux
  // shutdown("unhandledRejection").catch(err => console.error("Erreur lors de l'arrêt après unhandledRejection:", err));
  process.exit(1);
});

