// backend/middlewares/metricsMiddleware.js
import { httpRequestCounter, httpRequestDurationMicroseconds } from '../services/metricsService.js';

/**
 * Middleware pour collecter des métriques sur les requêtes HTTP
 */
export const collectHttpMetrics = (req, res, next) => {
  // Ignorer les requêtes pour les métriques elles-mêmes pour éviter les boucles
  if (req.path === '/metrics') {
    return next();
  }

  // Capturer le temps de début
  const startTime = process.hrtime();
  
  // Capturer la route originale (avant les paramètres dynamiques)
  // Par exemple, transformer /api/products/123 en /api/products/:id
  const route = req.originalUrl.split('?')[0]; // Enlever les query params
  
  // Intercepter la fin de la requête pour collecter les métriques
  res.on('finish', () => {
    // Calculer la durée en millisecondes
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds * 1000 + nanoseconds / 1000000;
    
    // Incrémenter le compteur de requêtes
    httpRequestCounter.inc({
      method: req.method,
      route: route,
      status_code: res.statusCode
    });
    
    // Enregistrer la durée de la requête
    httpRequestDurationMicroseconds.observe(
      {
        method: req.method,
        route: route,
        code: res.statusCode
      },
      duration
    );
  });
  
  next();
};

export default {
  collectHttpMetrics
};
