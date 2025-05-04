// backend/controllers/summaryController.js
import {
  getPeriodSummary,
  optimizeConversationStorage,
} from "../services/summaryManager.js";
import Joi from "joi";
import mongoose from "mongoose";

// --- Validation Schemas ---
const getSummariesSchema = Joi.object({
  startDate: Joi.date(),
  endDate: Joi.date(),
});

const optimizeStorageSchema = Joi.object({
  daysToKeep: Joi.number().integer().min(1).default(30),
});

// --- Controller Functions ---

/**
 * Récupère les résumés de conversation pour un tenant
 * @route GET /api/summary
 * @access Private
 */
export const getTenantSummaries = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;

    // Validation des query params
    const { error, value } = getSummariesSchema.validate(req.query);
    if (error) {
      return res
        .status(400)
        .json({ message: `Validation échouée: ${error.details[0].message}` });
    }

    const { startDate, endDate } = value;

    // Convertir les dates si elles sont fournies
    const start = startDate ? startDate : new Date(0); // Default to beginning of time
    const end = endDate ? endDate : new Date(); // Default to now

    // Utiliser tenantId au lieu de userId
    const summary = await getPeriodSummary(tenantId, start, end);

    // Note: getPeriodSummary doit être adapté pour utiliser tenantId

    if (!summary || summary.length === 0) {
      // Retourner un tableau vide est plus standard qu\"un 404 pour une liste potentiellement vide
      return res.json([]);
      // return res.status(404).json({ message: \"Aucun résumé trouvé pour cette période\" });
    }

    return res.json(summary);
  } catch (error) {
    console.error("Erreur dans getTenantSummaries:", error);
    return next(error);
  }
};

/**
 * Optimise le stockage des conversations pour un tenant (potentiellement long, pourrait être une tâche de fond)
 * @route POST /api/summary/optimize
 * @access Private (Admin?)
 */
export const optimizeTenantStorage = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;

    // Validation du body
    const { error, value } = optimizeStorageSchema.validate(req.body);
     if (error) {
      return res
        .status(400)
        .json({ message: `Validation échouée: ${error.details[0].message}` });
    }

    const { daysToKeep } = value;

    // Utiliser tenantId au lieu de userId
    // Note: optimizeConversationStorage doit être adapté pour utiliser tenantId
    const result = await optimizeConversationStorage(tenantId, daysToKeep);

    if (!result || !result.success) {
        // Fournir plus de détails si possible depuis le service
        return res.status(500).json({ message: result?.message || "Échec de l\"optimisation du stockage" });
    }

    return res.json({ message: "Optimisation du stockage lancée avec succès", details: result });

  } catch (error) {
    console.error("Erreur dans optimizeTenantStorage:", error);
    return next(error);
  }
};

