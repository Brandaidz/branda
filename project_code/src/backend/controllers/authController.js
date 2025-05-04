// backend/controllers/authController.js
import * as jwt from "jsonwebtoken"; // Use namespace import
import * as bcrypt from "bcrypt"; // Use namespace import
import Joi from "joi";
import User from "../models/userModel.js";
import Tenant from "../models/tenantModel.js"; // Import Tenant model
import mongoose from "mongoose";
import crypto from "crypto"; // For generating tokens and JTI
import logger from "../config/logger.js"; // Import logger

// Import email service
import { sendEmail } from "../services/emailService.js";
// Import Redis service for token storage
import { 
  storeVerificationToken, 
  getUserIdFromVerificationToken, 
  deleteVerificationToken,
  storeRefreshToken,
  getRefreshToken,
  deleteRefreshToken
} from "../services/redisService.js";
// Import JWT blacklist function
import { addToBlacklist } from "../middlewares/tokenBlacklist.js";

// --- Validation Schemas ---
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().required() // Added name validation
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

const resetPasswordSchema = Joi.object({
  password: Joi.string().min(8).required(),
});

// --- Helper Functions ---

/**
 * Generates JWT token for email verification
 * @param {string} userId - User ID
 * @param {string} email - User email
 * @returns {string} JWT token
 */
const generateVerificationToken = (userId, email) => {
  return jwt.sign({ id: userId, email: email }, process.env.JWT_VERIFICATION_SECRET || "secret_verification_key", {
    expiresIn: process.env.JWT_VERIFICATION_EXPIRES_IN || "1h", // Short-lived token
  });
};

/**
 * Generates JWT access token with JTI claim
 * @param {string} userId - User ID
 * @param {string} tenantId - Tenant ID
 * @returns {string} JWT token
 */
const generateToken = (userId, tenantId) => {
  const payload = {
    id: userId,
    tenantId: tenantId,
    jti: crypto.randomBytes(16).toString("hex") // Add JTI (JWT ID) claim
  };
  // Use namespace import jwt
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d", // Use environment variable or default
  });
};

/**
 * Generates Refresh Token
 * @param {string} userId - User ID
 * @returns {string} Refresh token
 */
const generateRefreshToken = (userId) => {    // Use namespace import jwt
    return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, { // Use a separate secret        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
    });
};

/**
 * Creates a password reset token
 * @param {object} user - Mongoose user document
 * @returns {string} Password reset token
 */
const createPasswordResetToken = (user) => {
  const resetToken = crypto.randomBytes(32).toString("hex");
  user.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // Token valid for 10 minutes
  return resetToken;
};

// --- Controller Functions ---

/**
 * Register a new user
 * @route POST /api/auth/register
 * @access Public
 */
export const register = async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      logger.error("Erreur de validation Joi (register):", error.details);
      return res.status(400).json({ message: `Validation échouée: ${error.details[0].message}` });
    }
    const { email, password, name } = value; // Added name
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Un utilisateur avec cet email existe déjà." });
    }
    // Create user first to get the ID for ownerId
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const newUser = await User.create({
      email,
      passwordHash,
      // tenantId will be added after tenant creation
      name, // Save name
      role: "user",
      isEmailVerified: false,
    });

    // Now create the tenant with the ownerId
    const newTenant = await Tenant.create({ 
      name: `Tenant de ${name || email}`, // Use name for tenant
      ownerId: newUser._id // Assign the new user's ID as owner
    });
    const tenantId = newTenant._id;

    // Update the user with the tenantId
    newUser.tenantId = tenantId;
    await newUser.save(); // Save the user again to store the tenantId
    const verificationToken = generateVerificationToken(newUser._id, email);
    // Store token in Redis (using service)
    await storeVerificationToken(verificationToken, newUser._id.toString());
    const verificationURL = `${process.env.FRONTEND_URL || req.protocol + '://' + req.get('host')}/verify-email/${verificationToken}`;
    try {
      await sendEmail({
        to: newUser.email,
        subject: "Vérifiez votre adresse email pour Branda",
        text: `Bienvenue sur Branda ! Cliquez sur ce lien pour vérifier votre email: ${verificationURL}`,
        html: `<h1>Bienvenue sur Branda !</h1><p>Merci de vous être inscrit. Veuillez cliquer sur le lien ci-dessous pour vérifier votre adresse email :</p><p><a href="${verificationURL}">Vérifier mon email</a></p><p>Ce lien expirera dans 1 heure.</p><p>Si vous n'avez pas créé de compte, veuillez ignorer cet email.</p>`
      });
      if (process.env.NODE_ENV !== 'production') {
        logger.info(`URL de vérification pour ${email}: ${verificationURL}`);
      }
      return res.status(201).json({ 
        message: "Inscription réussie. Veuillez vérifier votre email pour activer votre compte.",
        user: { id: newUser._id, email: newUser.email, name: newUser.name, isEmailVerified: false }
      });
    } catch (emailError) {
      logger.error("Erreur d'envoi de l'email de vérification:", emailError);
      // Consider rolling back user/tenant creation or marking user for retry
      return res.status(201).json({ 
        message: "Inscription réussie, mais l'envoi de l'email de vérification a échoué. Veuillez contacter le support.",
        user: { id: newUser._id, email: newUser.email, name: newUser.name, isEmailVerified: false }
      });
    }
  } catch (err) {
    logger.error("Erreur lors de l'inscription:", err);
    next(err);
  }
};

/**
 * Login user
 * @route POST /api/auth/login
 * @access Public
 */
export const login = async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: `Validation échouée: ${error.details[0].message}` });
    }
    const { email, password } = value;
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect." });
    }
    if (!user.isEmailVerified) {
      return res.status(403).json({ message: "Veuillez vérifier votre adresse email avant de vous connecter." });
    }
    const token = generateToken(user._id, user.tenantId);
    const refreshToken = generateRefreshToken(user._id);
    // Store refresh token in Redis
    await storeRefreshToken(user._id.toString(), refreshToken);
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
    res.status(200).json({
      token,
      user: { id: user._id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId, isEmailVerified: user.isEmailVerified },
    });
  } catch (err) {
    logger.error("Erreur lors de la connexion:", err);
    next(err);
  }
};

/**
 * Refresh JWT token using refresh token
 * @route POST /api/auth/refresh-token
 * @access Public (requires valid refresh token cookie)
 */
export const refreshToken = async (req, res, next) => {
    const incomingRefreshToken = req.cookies.refreshToken;
    if (!incomingRefreshToken) {
        return res.status(401).json({ message: "Aucun token de rafraîchissement fourni." });
    }
    try {
        const decoded = jwt.verify(incomingRefreshToken, process.env.JWT_REFRESH_SECRET || "refresh_secret_key");
        const user = await User.findById(decoded.id);
        if (!user) {
            res.clearCookie("refreshToken");
            return res.status(401).json({ message: "Utilisateur non trouvé pour ce token." });
        }
        // Verify token against Redis store
        const storedTokenJTI = await getRefreshToken(user._id.toString()); // Assuming JTI is stored
        // We need to decode the incoming token to get its JTI for comparison
        const incomingDecoded = jwt.verify(incomingRefreshToken, process.env.JWT_REFRESH_SECRET || "refresh_secret_key", { ignoreExpiration: true }); // Decode even if expired for JTI check
        
        if (!storedTokenJTI || !incomingDecoded.jti || storedTokenJTI !== incomingDecoded.jti) {
            // If stored JTI doesn't exist or doesn't match incoming token's JTI, invalidate
            await deleteRefreshToken(user._id.toString()); // Clean up potentially compromised token
            res.clearCookie("refreshToken");
            logger.warn(`Tentative de rafraîchissement avec un token invalide ou révoqué pour l'utilisateur ${user._id}.`);
            return res.status(401).json({ message: "Token de rafraîchissement invalide ou révoqué." });
        }

        const newAccessToken = generateToken(user._id, user.tenantId);
        const newRefreshToken = generateRefreshToken(user._id);
        const newRefreshTokenDecoded = jwt.verify(newRefreshToken, process.env.JWT_REFRESH_SECRET || "refresh_secret_key"); // Decode to get JTI
        
        // Store the JTI of the new refresh token
        await storeRefreshToken(user._id.toString(), newRefreshTokenDecoded.jti);

        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        res.status(200).json({ 
            token: newAccessToken,
            user: { id: user._id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId }
        });
    } catch (err) {
        if (err.name === "TokenExpiredError" || err.name === "JsonWebTokenError") {
            res.clearCookie("refreshToken");
            return res.status(401).json({ message: "Token de rafraîchissement invalide ou expiré. Veuillez vous reconnecter." });
        }
        logger.error("Erreur lors du rafraîchissement du token:", err);
        next(err);
    }
};

/**
 * Logout user (clears refresh token cookie and blacklists JWT)
 * @route POST /api/auth/logout
 * @access Private
 */
export const logout = async (req, res) => {
    try {
        const userId = req.user?.id; // User ID attached by 'protect' middleware
        if (!userId) {
          logger.warn("Tentative de déconnexion sans utilisateur authentifié.");
          return res.status(401).json({ message: "Non autorisé." });
        }

        // 1. Blacklist the current access token
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            try {
                // Decode the token to get jti and exp
                // No need to verify signature here, as 'protect' middleware already did
                // Use named import 'decode' (implicitly available via 'jsonwebtoken' import)
                const decoded = jwt.decode(token); // Corrected: use jwt.decode
                if (decoded && decoded.jti && decoded.exp) {
                    // Add the JTI to the blacklist with its original expiration as TTL
                    await addToBlacklist(decoded.jti, decoded.exp);
                    logger.info(`Token (JTI: ${decoded.jti}) pour l'utilisateur ${userId} ajouté à la blacklist lors de la déconnexion.`);
                } else {
                    logger.warn(`Impossible de blacklister le token lors de la déconnexion pour l'utilisateur ${userId}: JTI ou EXP manquant dans le token décodé.`);
                }
            } catch (decodeError) {
                logger.error(`Erreur lors du décodage du token pendant la déconnexion pour l'utilisateur ${userId}:`, decodeError);
            }
        } else {
            logger.warn(`Impossible de blacklister le token lors de la déconnexion pour l'utilisateur ${userId}: Aucun token Bearer trouvé dans l'en-tête Authorization.`);
        }

        // 2. Delete the refresh token from Redis
        try {
            await deleteRefreshToken(userId.toString());
            logger.info(`Refresh token pour l'utilisateur ${userId} supprimé de Redis.`);
        } catch (redisError) {
            logger.error(`Erreur lors de la suppression du refresh token de Redis pour l'utilisateur ${userId}:`, redisError);
        }

        // 3. Clear the refresh token cookie
        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
        });

        res.status(200).json({ message: "Déconnexion réussie." });

    } catch (error) {
        logger.error(`Erreur inattendue lors de la déconnexion pour l'utilisateur ${req.user?.id}:`, error);
        res.status(500).json({ message: "Erreur interne lors de la déconnexion." });
    }
};

/**
 * Forgot Password - Generate reset token and send email
 * @route POST /api/auth/forgot-password
 * @access Public
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const { error, value } = forgotPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: `Validation échouée: ${error.details[0].message}` });
    }
    const user = await User.findOne({ email: value.email });
    if (!user) {
      logger.info(`Tentative de réinitialisation pour email inexistant: ${value.email}`);
      // Always return the same message to prevent email enumeration
      return res.status(200).json({ message: "Si un compte avec cet email existe, un lien de réinitialisation a été envoyé." });
    }
    // Generate a JWT for password reset
    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' }); 
    const resetURL = `${process.env.FRONTEND_URL || req.protocol + '://' + req.get('host')}/reset-password/${resetToken}`;
    try {
      await sendEmail({
        to: user.email,
        subject: "Réinitialisation de votre mot de passe Branda",
        text: `Vous avez demandé une réinitialisation de mot de passe. Cliquez sur ce lien (valide 1 heure): ${resetURL}`,
        html: `<h1>Réinitialisation de mot de passe</h1><p>Vous avez demandé une réinitialisation de votre mot de passe.</p><p>Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe (ce lien est valide pendant 1 heure) :</p><p><a href="${resetURL}">Réinitialiser mon mot de passe</a></p><p>Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email.</p>`
      });
      if (process.env.NODE_ENV !== 'production') {
        logger.info(`Reset token pour ${user.email}: ${resetToken}`);
        logger.info(`Reset URL: ${resetURL}`);
      }
      res.status(200).json({ message: "Si un compte avec cet email existe, un lien de réinitialisation a été envoyé." });
    } catch (emailError) {
      logger.error("Erreur d'envoi de l'email de réinitialisation:", emailError);
      // Do not clear token fields here as they are not used with JWT approach
      return res.status(500).json({ message: "Erreur lors de l'envoi de l'email. Veuillez réessayer plus tard." });
    }
  } catch (err) {
    logger.error("Erreur lors de la demande de réinitialisation de mot de passe:", err);
    next(err);
  }
};

/**
 * Reset Password - Use token to set a new password
 * @route PATCH /api/auth/reset-password/:token
 * @access Public
 */
export const resetPassword = async (req, res, next) => {
  try {
    const resetToken = req.params.token;
    // Verify the JWT reset token
    const decoded = jwt.verify(resetToken, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(400).json({ message: "Token invalide ou utilisateur non trouvé." });
    }

    // Validate the new password
    const { error, value } = resetPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: `Validation échouée: ${error.details[0].message}` });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(value.password, salt);
    // Clear reset token fields (though not strictly necessary with JWT approach)
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    // Optionally, log the user in directly or send a confirmation email
    logger.info(`Mot de passe réinitialisé pour l'utilisateur ${user._id}`);
    res.status(200).json({ message: "Mot de passe réinitialisé avec succès." });

  } catch (err) {
    if (err.name === "TokenExpiredError" || err.name === "JsonWebTokenError") {
      return res.status(400).json({ message: "Token de réinitialisation invalide ou expiré." });
    }
    logger.error("Erreur lors de la réinitialisation du mot de passe:", err);
    next(err);
  }
};

/**
 * Verify Email Address
 * @route GET /api/auth/verify-email/:token
 * @access Public
 */
export const verifyEmail = async (req, res, next) => {
  try {
    const verificationToken = req.params.token;    // Use namespace import jwt
    const decoded = jwt.verify(verificationToken, process.env.JWT_VERIFICATION_SECRET || "secret_verification_key");
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé." });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: "L'email est déjà vérifié." });
    }

    user.isEmailVerified = true;
    await user.save();

    // Optionally delete the verification token from Redis if it was stored there
    // await deleteVerificationToken(verificationToken); 

    logger.info(`Email vérifié pour l'utilisateur ${user._id}`);
    // Redirect to login page or send success message
    // res.redirect(`${process.env.FRONTEND_URL}/login?verified=true`); 
    res.status(200).json({ message: "Email vérifié avec succès." });

  } catch (err) {
    if (err.name === "TokenExpiredError" || err.name === "JsonWebTokenError") {
      return res.status(400).json({ message: "Token de vérification invalide ou expiré." });
    }
    logger.error("Erreur lors de la vérification de l'email:", err);
    next(err);
  }
};

