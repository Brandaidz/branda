// backend/routes/productRoutes.js
import express from "express";
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
} from "../controllers/productController.js";
import { protect, isManager, isAdmin } from "../middlewares/authMiddleware.js";
import logger from "../config/logger.js";

const router = express.Router();

// Middleware de journalisation pour les routes de produits
const logProductAccess = (req, res, next) => {
  logger.info(`Accès à la route produit: ${req.method} ${req.originalUrl} par l'utilisateur ${req.user?._id} (rôle: ${req.user?.role})`);
  next();
};

// Appliquer le middleware protect à toutes les routes de produits
router.use(protect);
router.use(logProductAccess);

// Routes avec vérification stricte des rôles
// Consultation des produits - accessible à tous les utilisateurs authentifiés
router.get("/", getProducts);

// Création d'un produit - réservé aux managers et admins
router.post("/", isManager, createProduct);

// Consultation d'un produit spécifique - accessible à tous les utilisateurs authentifiés
router.get("/:id", getProduct);

// Mise à jour d'un produit - réservé aux managers et admins
router.put("/:id", isManager, updateProduct);

// Suppression d'un produit - réservé aux admins uniquement
router.delete("/:id", isAdmin, deleteProduct);

// Mise à jour du stock - accessible aux managers et admins
router.patch("/:id/stock", isManager, updateStock);

export default router;
