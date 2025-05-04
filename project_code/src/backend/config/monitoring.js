// config/monitoring.js
const promClient = require('prom-client');
const winston = require('winston');
const { createLogger, format, transports } = winston;

// Configuration de Prometheus
const collectDefaultMetrics = promClient.collectDefaultMetrics;
const Registry = promClient.Registry;
const register = new Registry();

// Collecter les métriques par défaut
collectDefaultMetrics({ register });

// Créer des compteurs personnalisés
const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]
});

const openaiRequestCounter = new promClient.Counter({
  name: 'openai_requests_total',
  help: 'Total number of requests to OpenAI API',
  labelNames: ['model', 'status']
});

const openaiTokensCounter = new promClient.Counter({
  name: 'openai_tokens_total',
  help: 'Total number of tokens used in OpenAI API',
  labelNames: ['model', 'type']
});

// Enregistrer les métriques personnalisées
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(openaiRequestCounter);
register.registerMetric(openaiTokensCounter);

// Configuration de Winston pour les logs
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.json()
  ),
  defaultMeta: { service: 'branda-api' },
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} ${level}: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
      )
    })
  ]
});

// Middleware pour mesurer la durée des requêtes HTTP
const requestDurationMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Fonction pour enregistrer la durée à la fin de la requête
  const recordDuration = () => {
    const duration = Date.now() - start;
    const route = req.route ? req.route.path : req.path;
    
    httpRequestDurationMicroseconds
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration);
    
    // Enregistrer également dans les logs pour les requêtes lentes
    if (duration > 1000) {
      logger.warn(`Slow request: ${req.method} ${route} took ${duration}ms`, {
        method: req.method,
        route,
        duration,
        statusCode: res.statusCode
      });
    }
  };
  
  // Enregistrer la durée à la fin de la requête
  res.on('finish', recordDuration);
  res.on('close', recordDuration);
  
  next();
};

module.exports = {
  register,
  httpRequestDurationMicroseconds,
  openaiRequestCounter,
  openaiTokensCounter,
  logger,
  requestDurationMiddleware
};
