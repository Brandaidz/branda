// backend/routes/scheduleRoutes.js
import express from "express";
import {
  getSchedules,
  getSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  generateWeeklySchedule,
  getScheduleConflicts
} from "../controllers/scheduleController.js";
import { protect, isManager, isAdmin } from "../middlewares/authMiddleware.js";
import logger from "../config/logger.js";

const router = express.Router();

// Middleware de journalisation pour les routes de planning
const logScheduleAccess = (req, res, next) => {
  logger.info(`Accès à la route planning: ${req.method} ${req.originalUrl} par l'utilisateur ${req.user?._id} (rôle: ${req.user?.role})`);
  next();
};

// Appliquer le middleware protect à toutes les routes de planning
router.use(protect);
router.use(logScheduleAccess);

// Routes avec vérification stricte des rôles
// Consultation des plannings d'un utilisateur - accessible aux managers/admins ou à l'utilisateur concerné (vérification dans le contrôleur)
router.get("/user/:userId", getSchedules);

// Vérification des conflits de planning - accessible aux managers/admins ou à l'utilisateur concerné
router.get("/conflicts/:userId", getScheduleConflicts);

// Consultation d'un planning spécifique - accessible aux managers/admins ou à l'utilisateur concerné
router.get("/:id", getSchedule);

// Création d'un planning - réservé aux managers et admins
router.post("/", isManager, createSchedule);

// Génération de planning hebdomadaire - réservé aux managers et admins
router.post("/generate-weekly", isManager, generateWeeklySchedule);

// Mise à jour d'un planning - réservé aux managers et admins
router.put("/:id", isManager, updateSchedule);

// Suppression d'un planning - réservé aux admins uniquement
router.delete("/:id", isAdmin, deleteSchedule);

export default router;
