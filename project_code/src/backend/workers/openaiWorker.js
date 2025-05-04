// backend/workers/openaiWorker.js - Intégration des métriques
import { Queue, Worker } from 'bullmq';
import { openaiLatencyHistogram } from '../services/metricsService.js';
import { getCachedAIResponse, cacheAIResponse } from '../services/redisService.js';
import crypto from 'crypto';

// Configuration de la connexion Redis pour BullMQ
const connection = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
};

// Fonction pour générer une clé de cache basée sur le prompt
const generatePromptKey = (prompt) => {
  return crypto.createHash('md5').update(JSON.stringify(prompt)).digest('hex');
};

// Fonction pour appeler l'API OpenAI avec mesure de latence
const callOpenAIWithMetrics = async (prompt, model) => {
  const startTime = process.hrtime();
  
  try {
    // Appel à l'API OpenAI (code existant)
    const response = await fetch(process.env.OPENROUTER_API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_KEY}`,
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
        'X-Title': 'Branda App'
      },
      body: JSON.stringify({
        model: model || 'openai/gpt-3.5-turbo',
        messages: prompt,
        temperature: 0.7,
        max_tokens: 1000
      })
    });
    
    const data = await response.json();
    
    // Calculer la latence
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const latencyMs = seconds * 1000 + nanoseconds / 1000000;
    
    // Enregistrer la métrique de latence
    openaiLatencyHistogram.observe({ api_endpoint: 'chat_completions' }, latencyMs);
    
    return data;
  } catch (error) {
    // En cas d'erreur, enregistrer quand même la latence
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const latencyMs = seconds * 1000 + nanoseconds / 1000000;
    
    openaiLatencyHistogram.observe({ api_endpoint: 'chat_completions_error' }, latencyMs);
    
    throw error;
  }
};

// Créer le worker pour traiter les jobs de chat
const openaiWorker = new Worker('openai_chat', async (job) => {
  console.log(`Processing job ${job.id} of type ${job.name}`);
  
  const { prompt, model, userId, conversationId } = job.data;
  
  // Vérifier si une réponse est déjà en cache
  const promptKey = generatePromptKey(prompt);
  const cachedResponse = await getCachedAIResponse(promptKey);
  
  if (cachedResponse) {
    console.log(`Using cached response for job ${job.id}`);
    return JSON.parse(cachedResponse);
  }
  
  // Si pas en cache, appeler l'API avec mesure de latence
  const response = await callOpenAIWithMetrics(prompt, model);
  
  // Mettre en cache la réponse
  if (response && response.choices && response.choices[0]) {
    await cacheAIResponse(promptKey, JSON.stringify(response));
  }
  
  return response;
}, { connection });

// Gérer les événements du worker
openaiWorker.on('completed', (job, result) => {
  console.log(`Job ${job.id} completed successfully`);
});

openaiWorker.on('failed', (job, error) => {
  console.error(`Job ${job.id} failed with error: ${error.message}`);
});

export default openaiWorker;
