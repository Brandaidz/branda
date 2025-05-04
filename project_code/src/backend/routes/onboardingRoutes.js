// backend/routes/onboardingRoutes.js
import express from 'express';
import { protect } from '../middlewares/authMiddleware.js';
import { 
  completeProWizard, 
  completeFamilyWizard,
  getOnboardingStatus
} from '../controllers/onboardingController.js';

const router = express.Router();

// Toutes les routes d'onboarding nécessitent une authentification
router.use(protect);
// router.use(attachUser); // Supprimé car protect attache déjà req.user

// Route pour obtenir le statut d'onboarding de l'utilisateur
router.get('/status', getOnboardingStatus);

// Route pour le wizard Pro
router.post('/pro', completeProWizard);

// Route pour le wizard Familial
router.post('/family', completeFamilyWizard);

export default router;
