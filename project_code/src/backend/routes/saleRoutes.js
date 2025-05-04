// backend/routes/saleRoutes.js
import express from "express";
import {
  getSales,
  getSale,
  createSale,
  updateSale,
  cancelSale,
  getSalesStats,
} from "../controllers/saleController.js";
import { protect, isManager, isAdmin } from "../middlewares/authMiddleware.js";
import logger from "../config/logger.js";

const router = express.Router();

// Middleware de journalisation pour les routes de ventes
const logSaleAccess = (req, res, next) => {
  logger.info(`Accès à la route vente: ${req.method} ${req.originalUrl} par l'utilisateur ${req.user?._id} (rôle: ${req.user?.role})`);
  next();
};

// Appliquer le middleware protect à toutes les routes de ventes
router.use(protect);
router.use(logSaleAccess);

// Routes avec vérification stricte des rôles
// Consultation des ventes - accessible à tous les utilisateurs authentifiés
router.get("/", getSales);

// Statistiques des ventes - accessible aux managers et admins
router.get("/stats", isManager, getSalesStats);

// Création d'une vente - accessible à tous les utilisateurs authentifiés
router.post("/", createSale);

// Consultation d'une vente spécifique - accessible à tous les utilisateurs authentifiés
router.get("/:id", getSale);

// Mise à jour d'une vente - réservé aux managers et admins
router.put("/:id", isManager, updateSale);

// Annulation d'une vente - réservé aux managers et admins
router.patch("/:id/cancel", isManager, cancelSale);

export default router;
