// backend/routes/authRoutes.js
import express from "express";
import {
  register,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail
} from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";
import logger from "../config/logger.js";

const router = express.Router();

// Middleware de journalisation pour les routes d'authentification
const logAuthAccess = (req, res, next) => {
  // Ne pas logger les mots de passe ou informations sensibles
  const sanitizedBody = { ...req.body };
  if (sanitizedBody.password) sanitizedBody.password = "[REDACTED]";
  if (sanitizedBody.passwordHash) sanitizedBody.passwordHash = "[REDACTED]";
  if (sanitizedBody.token) sanitizedBody.token = "[REDACTED]";
  
  logger.info(`Accès à la route auth: ${req.method} ${req.originalUrl}`, { 
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  next();
};

// Appliquer le middleware de journalisation à toutes les routes d'authentification
router.use(logAuthAccess);

// Routes publiques
router.post("/register", register);
router.post("/login", login);
router.post("/refresh-token", refreshToken);
router.post("/forgot-password", forgotPassword);
router.patch("/reset-password/:token", resetPassword);
router.get("/verify-email/:token", verifyEmail);

// Routes privées (nécessitent une authentification)
router.post("/logout", protect, logout);

export default router;
