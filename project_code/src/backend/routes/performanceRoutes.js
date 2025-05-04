// backend/routes/performanceRoutes.js
import express from "express";
import { 
  getPerformances, 
  getPerformance, 
  createPerformance, 
  updatePerformance, 
  deletePerformance,
  acknowledgePerformance,
  generatePerformanceReport
} from "../controllers/performanceController.js";
import { protect, isManager, isAdmin } from "../middlewares/authMiddleware.js";
import logger from "../config/logger.js";

const router = express.Router();

// Middleware de journalisation pour les routes de performance
const logPerformanceAccess = (req, res, next) => {
  logger.info(`Accès à la route performance: ${req.method} ${req.originalUrl} par l'utilisateur ${req.user?._id} (rôle: ${req.user?.role})`);
  next();
};

// Routes avec vérification stricte des rôles
// Seuls les managers et admins peuvent voir les performances de tous les utilisateurs
router.get("/user/:userId", protect, isManager, logPerformanceAccess, getPerformances);

// Génération de rapport - réservé aux managers et admins
router.get("/report/:employeeId", protect, isManager, logPerformanceAccess, generatePerformanceReport);

// Consultation d'une performance individuelle - accessible à l'utilisateur concerné ou aux managers/admins
router.get("/:id", protect, logPerformanceAccess, getPerformance);

// Création de performance - réservé aux managers et admins
router.post("/", protect, isManager, logPerformanceAccess, createPerformance);

// Mise à jour de performance - réservé aux managers et admins
router.put("/:id", protect, isManager, logPerformanceAccess, updatePerformance);

// Accusé de réception - accessible à l'utilisateur concerné
router.patch("/:id/acknowledge", protect, logPerformanceAccess, acknowledgePerformance);

// Suppression de performance - réservé aux admins uniquement
router.delete("/:id", protect, isAdmin, logPerformanceAccess, deletePerformance);

export default router;
