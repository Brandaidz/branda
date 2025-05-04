// backend/controllers/onboardingController.js
import Joi from 'joi';
import User from '../models/userModel.js';

// --- Validation Schemas ---

// Schéma de validation pour le wizard Pro
const proWizardSchema = Joi.object({
  nom: Joi.string().required().min(2).max(100),
  secteur: Joi.string().required(),
  nombreEmployes: Joi.number().integer().min(1).required(),
  caMensuel: Joi.number().min(0).required(),
  horaires: Joi.string().required(),
  objectifs: Joi.string().required(),
  reseauxSociaux: Joi.array().items(Joi.string()).default([])
});

// Schéma de validation pour le wizard Familial
const familyWizardSchema = Joi.object({
  nomFoyer: Joi.string().required().min(2).max(100),
  membres: Joi.array().items(
    Joi.object({
      nom: Joi.string().required().min(2).max(100),
      relation: Joi.string().required()
    })
  ).min(1).required(),
  routines: Joi.array().items(Joi.string()).default([])
});

// --- Controller Functions ---

/**
 * Complète le wizard Pro pour un utilisateur
 * @route POST /api/onboarding/pro
 * @access Private
 */
export const completeProWizard = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const tenantId = req.user.tenantId;

    // Valider les données du wizard
    const { error, value } = proWizardSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        message: `Validation échouée: ${error.details[0].message}` 
      });
    }

    // Mettre à jour le profil business de l'utilisateur
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, tenantId },
      { 
        businessProfile: value,
        $set: { 'businessProfile.lastUpdated': new Date() }
      },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ 
        message: "Utilisateur non trouvé ou accès non autorisé." 
      });
    }

    // Retourner le profil mis à jour (sans données sensibles)
    return res.status(200).json({
      message: "Profil professionnel mis à jour avec succès.",
      businessProfile: updatedUser.businessProfile
    });

  } catch (err) {
    console.error("Erreur dans completeProWizard:", err);
    return next(err);
  }
};

/**
 * Complète le wizard Familial pour un utilisateur
 * @route POST /api/onboarding/family
 * @access Private
 */
export const completeFamilyWizard = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const tenantId = req.user.tenantId;

    // Valider les données du wizard
    const { error, value } = familyWizardSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        message: `Validation échouée: ${error.details[0].message}` 
      });
    }

    // Mettre à jour le profil familial de l'utilisateur
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, tenantId },
      { 
        familyProfile: value,
        $set: { 'familyProfile.lastUpdated': new Date() }
      },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ 
        message: "Utilisateur non trouvé ou accès non autorisé." 
      });
    }

    // Retourner le profil mis à jour (sans données sensibles)
    return res.status(200).json({
      message: "Profil familial mis à jour avec succès.",
      familyProfile: updatedUser.familyProfile
    });

  } catch (err) {
    console.error("Erreur dans completeFamilyWizard:", err);
    return next(err);
  }
};

/**
 * Récupère le statut d'onboarding de l'utilisateur
 * @route GET /api/onboarding/status
 * @access Private
 */
export const getOnboardingStatus = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const tenantId = req.user.tenantId;

    // Récupérer l'utilisateur avec ses profils
    const user = await User.findOne(
      { _id: userId, tenantId },
      'businessProfile familyProfile'
    );

    if (!user) {
      return res.status(404).json({ 
        message: "Utilisateur non trouvé ou accès non autorisé." 
      });
    }

    // Déterminer si les profils sont complétés
    const hasBusinessProfile = user.businessProfile && 
                              user.businessProfile.nom && 
                              user.businessProfile.secteur;
    
    const hasFamilyProfile = user.familyProfile && 
                            user.familyProfile.nomFoyer && 
                            user.familyProfile.membres && 
                            user.familyProfile.membres.length > 0;

    return res.status(200).json({
      businessProfileCompleted: hasBusinessProfile,
      familyProfileCompleted: hasFamilyProfile,
      // Inclure les profils si disponibles
      businessProfile: hasBusinessProfile ? user.businessProfile : null,
      familyProfile: hasFamilyProfile ? user.familyProfile : null
    });

  } catch (err) {
    console.error("Erreur dans getOnboardingStatus:", err);
    return next(err);
  }
};

export default {
  completeProWizard,
  completeFamilyWizard,
  getOnboardingStatus
};
