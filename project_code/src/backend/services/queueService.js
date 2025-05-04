// backend/services/queueService.js
import { Queue, Worker, QueueEvents } from 'bullmq';
import { getClient } from './redisService.js';
import logger from '../config/logger.js';

// Configuration des files d'attente
const defaultJobOptions = {
  attempts: 5, // Augmenté de 3 à 5 tentatives
  backoff: {
    type: 'exponential',
    delay: 2000 // Augmenté de 1000 à 2000ms pour donner plus de temps entre les tentatives
  },
  removeOnComplete: 100, // Garde les 100 derniers jobs complétés
  removeOnFail: 200,     // Garde les 200 derniers jobs échoués
  timeout: 60000         // Timeout de 60 secondes pour les jobs
};

// Noms des files d'attente
export const QUEUE_NAMES = {
  OPENAI_CHAT: 'openai_chat',
  SUMMARY_GENERATE: 'summary_generate'
};

// Map pour stocker les instances de files d'attente
const queues = new Map();
// Map pour stocker les instances de workers
const workers = new Map();

/**
 * Ajoute un job de chat à la file d'attente openai_chat
 * @param {Object} data - Données du job (userId, tenantId, conversationId, message, userData)
 * @returns {Promise<Job>} - Job créé
 */
export const addChatJob = async (data) => {
  return await addJob(QUEUE_NAMES.OPENAI_CHAT, data);
};

/**
 * Ajoute un job de génération de résumé à la file d'attente summary:generate
 * @param {Object} data - Données du job (userId, tenantId, conversationId)
 * @returns {Promise<Job>} - Job créé
 */
export const addSummaryJob = async (data) => {
  return await addJob(QUEUE_NAMES.SUMMARY_GENERATE, data);
};

/**
 * Initialise et retourne une file d'attente BullMQ
 * @param {string} queueName - Nom de la file d'attente
 * @returns {Queue} - Instance de la file d'attente
 */
export const getQueue = (queueName) => {
  if (!queues.has(queueName)) {
    logger.info(`Initialisation de la file d'attente: ${queueName}`);
    
    const connection = getClient();
    if (!connection) {
      const error = new Error('Redis client non disponible pour BullMQ');
      logger.error(error.message);
      throw error;
    }
    
    const bullmqConnection = {
      ...connection.options, // Spread options from the ioredis client
      maxRetriesPerRequest: null // Override for BullMQ compatibility
    };

    const queue = new Queue(queueName, {
      connection: bullmqConnection,
      defaultJobOptions
    });
    
    queues.set(queueName, queue);
    
    // Écouter les événements de la file d'attente pour le monitoring
    const queueEvents = new QueueEvents(queueName, { connection: bullmqConnection });
    
    queueEvents.on('completed', ({ jobId }) => {
      logger.info(`Job ${jobId} de la file ${queueName} terminé avec succès`);
    });
    
    queueEvents.on('failed', ({ jobId, failedReason }) => {
      logger.error(`Job ${jobId} de la file ${queueName} échoué: ${failedReason}`);
    });
    
    queueEvents.on('error', (error) => {
      logger.error(`Erreur dans la file ${queueName}:`, { error: error.message, stack: error.stack });
    });

    // Gestion de la déconnexion Redis
    queueEvents.on('disconnected', () => {
      logger.warn(`QueueEvents ${queueName} déconnecté de Redis. Tentative de reconnexion automatique...`);
    });

    queueEvents.on('reconnected', () => {
      logger.info(`QueueEvents ${queueName} reconnecté à Redis avec succès`);
    });
  }
  
  return queues.get(queueName);
};

/**
 * Ajoute un job à la file d'attente
 * @param {string} queueName - Nom de la file d'attente
 * @param {Object} data - Données du job
 * @param {Object} options - Options spécifiques au job (remplace les options par défaut)
 * @returns {Promise<Job>} - Job créé
 */
export const addJob = async (queueName, data, options = {}) => {
  const queue = getQueue(queueName);
  const jobOptions = { ...defaultJobOptions, ...options };
  
  try {
    const job = await queue.add(queueName, data, jobOptions);
    logger.info(`Job ${job.id} ajouté à la file ${queueName}`);
    return job;
  } catch (error) {
    logger.error(`Erreur lors de l'ajout du job à la file ${queueName}:`, { error: error.message, stack: error.stack });
    throw error;
  }
};

/**
 * Crée un worker pour traiter les jobs d'une file d'attente
 * @param {string} queueName - Nom de la file d'attente
 * @param {Function} processor - Fonction de traitement des jobs
 * @param {Object} options - Options du worker
 * @returns {Worker} - Instance du worker
 */
export const createWorker = (queueName, processor, options = {}) => {
  // Si un worker existe déjà pour cette file, le fermer d'abord
  if (workers.has(queueName)) {
    logger.warn(`Un worker existe déjà pour la file ${queueName}. Fermeture du worker existant...`);
    const existingWorker = workers.get(queueName);
    existingWorker.close();
    workers.delete(queueName);
  }

  const connection = getClient();
  if (!connection) {
    const error = new Error('Redis client non disponible pour BullMQ Worker');
    logger.error(error.message);
    throw error;
  }
  
  const bullmqConnection = {
    ...connection.options, // Spread options from the ioredis client
    maxRetriesPerRequest: null // Override for BullMQ compatibility
  };

  const defaultWorkerOptions = {
    connection: bullmqConnection,
    concurrency: 5,
    lockDuration: 30000, // 30 secondes de verrouillage
    stalledInterval: 30000, // Vérification des jobs bloqués toutes les 30 secondes
    maxStalledCount: 2, // Nombre de fois qu'un job peut être marqué comme bloqué avant d'être considéré comme échoué
    ...options
  };
  
  const worker = new Worker(queueName, processor, defaultWorkerOptions);
  
  worker.on('completed', (job) => {
    logger.info(`Worker: Job ${job.id} de la file ${queueName} traité avec succès`);
  });
  
  worker.on('failed', (job, error) => {
    logger.error(`Worker: Job ${job?.id} de la file ${queueName} échoué:`, { error: error.message, stack: error.stack });
  });
  
  worker.on('error', (error) => {
    logger.error(`Erreur dans le worker de la file ${queueName}:`, { error: error.message, stack: error.stack });
    
    // Redémarrer le worker en cas d'erreur critique
    setTimeout(() => {
      logger.info(`Tentative de redémarrage du worker pour la file ${queueName}...`);
      try {
        worker.close();
        workers.delete(queueName);
        const newWorker = createWorker(queueName, processor, options);
        workers.set(queueName, newWorker);
        logger.info(`Worker pour la file ${queueName} redémarré avec succès`);
      } catch (restartError) {
        logger.error(`Échec du redémarrage du worker pour la file ${queueName}:`, { error: restartError.message, stack: restartError.stack });
      }
    }, 5000); // Attendre 5 secondes avant de redémarrer
  });

  // Gestion de la déconnexion Redis
  worker.on('disconnected', () => {
    logger.warn(`Worker ${queueName} déconnecté de Redis. Tentative de reconnexion automatique...`);
  });

  worker.on('reconnected', () => {
    logger.info(`Worker ${queueName} reconnecté à Redis avec succès`);
  });
  
  logger.info(`Worker créé pour la file ${queueName}`);
  workers.set(queueName, worker);
  return worker;
};

/**
 * Ferme proprement toutes les files d'attente et workers
 */
export const closeQueues = async () => {
  const closePromises = [];
  
  // Fermer d'abord tous les workers
  for (const [name, worker] of workers.entries()) {
    logger.info(`Fermeture du worker pour la file: ${name}`);
    closePromises.push(worker.close());
  }
  
  // Puis fermer toutes les files d'attente
  for (const [name, queue] of queues.entries()) {
    logger.info(`Fermeture de la file d'attente: ${name}`);
    closePromises.push(queue.close());
  }
  
  try {
    await Promise.all(closePromises);
    logger.info('Toutes les files d\'attente et workers ont été fermés');
    
    // Vider les maps
    workers.clear();
    queues.clear();
  } catch (error) {
    logger.error('Erreur lors de la fermeture des files d\'attente et workers:', { error: error.message, stack: error.stack });
  }
};

/**
 * Récupère les statistiques des files d'attente
 * @returns {Promise<Object>} - Statistiques des files d'attente
 */
export const getQueueStats = async () => {
  const stats = {};
  
  for (const [name, queue] of queues.entries()) {
    try {
      const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
      stats[name] = counts;
    } catch (error) {
      logger.error(`Erreur lors de la récupération des statistiques pour la file ${name}:`, { error: error.message });
      stats[name] = { error: error.message };
    }
  }
  
  return stats;
};

export default {
  getQueue,
  addJob,
  createWorker,
  closeQueues,
  getQueueStats,
  QUEUE_NAMES
};
