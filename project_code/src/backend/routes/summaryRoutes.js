// backend/routes/summaryRoutes.js
import express from "express";
import {
  getTenantSummaries,
  optimizeTenantStorage,
} from "../controllers/summaryController.js";
import { protect, isAdmin } from "../middlewares/authMiddleware.js"; // Utiliser isAdmin de authMiddleware
import logger from "../config/logger.js";

const router = express.Router();

// Middleware de journalisation pour les routes de résumés
const logSummaryAccess = (req, res, next) => {
  logger.info(`Accès à la route résumé: ${req.method} ${req.originalUrl} par l'utilisateur ${req.user?._id} (rôle: ${req.user?.role})`);
  next();
};

// Appliquer le middleware protect à toutes les routes de résumés
router.use(protect);
router.use(logSummaryAccess);

// Routes avec vérification stricte des rôles
// Consultation des résumés - accessible à tous les utilisateurs authentifiés
router.get("/", getTenantSummaries);

// Optimisation du stockage - réservé aux admins uniquement
router.post("/optimize", isAdmin, optimizeTenantStorage);

export default router;
