// services/queue.js
const { Queue, Worker, QueueScheduler } = require('bullmq');
const { redisClient } = require('../config/redis');

// Configuration de la connexion Redis pour BullMQ
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  db: process.env.REDIS_DB || 0,
};

// Création des files d'attente
const openaiQueue = new Queue('openai-requests', { connection });
const reportQueue = new Queue('report-generation', { connection });
const exportQueue = new Queue('data-export', { connection });

// Planificateurs pour gérer les jobs retardés et récurrents
const openaiScheduler = new QueueScheduler('openai-requests', { connection });
const reportScheduler = new QueueScheduler('report-generation', { connection });
const exportScheduler = new QueueScheduler('data-export', { connection });

// Options communes pour les workers
const defaultWorkerOptions = {
  connection,
  concurrency: 5,
  limiter: {
    max: 10,
    duration: 1000
  }
};

// Exportation des files d'attente
module.exports = {
  openaiQueue,
  reportQueue,
  exportQueue,
  // Méthode pour ajouter un job à la file OpenAI
  async addOpenAIJob(data, options = {}) {
    return await openaiQueue.add('openai-request', data, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000
      },
      removeOnComplete: true,
      removeOnFail: 100,
      ...options
    });
  },
  // Méthode pour créer un worker OpenAI
  createOpenAIWorker(processFunction) {
    return new Worker('openai-requests', processFunction, defaultWorkerOptions);
  },
  // Méthodes similaires pour les autres files
  async addReportJob(data, options = {}) {
    return await reportQueue.add('report-generation', data, {
      attempts: 2,
      backoff: {
        type: 'fixed',
        delay: 5000
      },
      ...options
    });
  },
  createReportWorker(processFunction) {
    return new Worker('report-generation', processFunction, defaultWorkerOptions);
  },
  async addExportJob(data, options = {}) {
    return await exportQueue.add('data-export', data, {
      attempts: 2,
      ...options
    });
  },
  createExportWorker(processFunction) {
    return new Worker('data-export', processFunction, defaultWorkerOptions);
  }
};
