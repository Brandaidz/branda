// backend/services/metricsService.js
import client from 'prom-client';
import logger from '../config/logger.js';

// Créer un registre pour les métriques
const register = new client.Registry();

// Activer la collecte des métriques par défaut (CPU, mémoire, etc.)
client.collectDefaultMetrics({ 
  register,
  prefix: 'branda_', // Préfixe pour toutes les métriques par défaut
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5], // Buckets personnalisés pour GC
  eventLoopMonitoringPrecision: 10 // Précision de 10ms pour le monitoring de l'event loop
});

// Définir des labels par défaut pour toutes les métriques
register.setDefaultLabels({
  app: 'branda-backend',
  version: process.env.APP_VERSION || '1.0.0'
});

// --- Métriques personnalisées ---

// Compteur de requêtes HTTP
export const httpRequestCounter = new client.Counter({
  name: 'branda_http_requests_total',
  help: 'Nombre total de requêtes HTTP reçues',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// Histogramme de durée des requêtes HTTP
export const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'branda_http_request_duration_ms',
  help: 'Durée des requêtes HTTP en ms',
  labelNames: ['method', 'route', 'code'],
  // Buckets optimisés pour les API web (en millisecondes)
  buckets: [10, 50, 100, 200, 500, 1000, 2500, 5000, 10000],
  registers: [register]
});

// Jauge pour la taille des files BullMQ
export const bullQueueSizeGauge = new client.Gauge({
  name: 'branda_bull_queue_size',
  help: 'Nombre de jobs dans une file BullMQ',
  labelNames: ['queue_name', 'state'], // ex: queue_name='openai_chat', state='waiting'
  registers: [register]
});

// Histogramme pour la latence OpenAI
export const openaiLatencyHistogram = new client.Histogram({
  name: 'branda_openai_api_latency_ms',
  help: 'Latence des appels à l\'API OpenAI en ms',
  labelNames: ['api_endpoint', 'model'], // ex: 'chat_completions', 'gpt-4'
  buckets: [100, 500, 1000, 2000, 5000, 10000, 30000], // Buckets en ms
  registers: [register]
});

// Compteur d'erreurs
export const errorCounter = new client.Counter({
  name: 'branda_errors_total',
  help: 'Nombre total d\'erreurs par type',
  labelNames: ['error_type', 'error_location'],
  registers: [register]
});

// Jauge pour le nombre d'utilisateurs connectés
export const connectedUsersGauge = new client.Gauge({
  name: 'branda_connected_users',
  help: 'Nombre d\'utilisateurs actuellement connectés',
  labelNames: ['tenant_id'],
  registers: [register]
});

// Compteur de génération de résumés
export const summaryGenerationCounter = new client.Counter({
  name: 'branda_summary_generations_total',
  help: 'Nombre total de résumés générés',
  labelNames: ['status'], // 'success' ou 'failure'
  registers: [register]
});

// --- Fonctions utilitaires ---

/**
 * Incrémente le compteur d'erreurs
 * @param {string} errorType - Type d'erreur (ex: 'database', 'api', 'validation')
 * @param {string} errorLocation - Emplacement de l'erreur (ex: 'authController', 'redisService')
 */
export const incrementErrorCounter = (errorType, errorLocation) => {
  try {
    errorCounter.inc({ error_type: errorType, error_location: errorLocation });
  } catch (error) {
    logger.error('Erreur lors de l\'incrémentation du compteur d\'erreurs:', error);
  }
};

/**
 * Met à jour la jauge des utilisateurs connectés
 * @param {string} tenantId - ID du tenant
 * @param {number} count - Nombre d'utilisateurs connectés
 */
export const updateConnectedUsers = (tenantId, count) => {
  try {
    connectedUsersGauge.set({ tenant_id: tenantId }, count);
  } catch (error) {
    logger.error('Erreur lors de la mise à jour de la jauge des utilisateurs connectés:', error);
  }
};

/**
 * Récupère les métriques au format Prometheus
 * @returns {Promise<string>} - Métriques au format Prometheus
 */
export const getMetrics = async () => {
  try {
    return await register.metrics();
  } catch (error) {
    logger.error('Erreur lors de la récupération des métriques:', error);
    throw error;
  }
};

/**
 * Récupère le type de contenu pour les métriques Prometheus
 * @returns {string} - Type de contenu
 */
export const getContentType = () => {
  return register.contentType;
};

export default {
  register,
  getContentType,
  getMetrics,
  httpRequestCounter,
  httpRequestDurationMicroseconds,
  bullQueueSizeGauge,
  openaiLatencyHistogram,
  errorCounter,
  connectedUsersGauge,
  summaryGenerationCounter,
  incrementErrorCounter,
  updateConnectedUsers
};
