// backend/routes/metricsRoutes.js
import express from 'express';
import { getMetrics, getContentType } from '../services/metricsService.js';
import prometheusAuthMiddleware from '../middlewares/prometheusAuthMiddleware.js';
import logger from '../config/logger.js';

const router = express.Router();

/**
 * Route pour exposer les métriques Prometheus
 * @route GET /metrics
 * @access Private (Authentification Basic Auth)
 */
router.get('/', prometheusAuthMiddleware, async (req, res) => {
  try {
    logger.info('Requête de métriques Prometheus reçue');
    
    // Récupérer les métriques au format Prometheus
    const metrics = await getMetrics();
    
    // Définir le type de contenu approprié
    res.set('Content-Type', getContentType());
    
    // Envoyer les métriques
    res.end(metrics);
    logger.info('Métriques Prometheus envoyées avec succès');
  } catch (error) {
    logger.error('Erreur lors de la récupération des métriques Prometheus:', { error: error.message, stack: error.stack });
    res.status(500).json({ message: 'Erreur lors de la récupération des métriques' });
  }
});

export default router;
