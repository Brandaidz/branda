// backend/controllers/chatController.js
import Joi from "joi";
import mongoose from "mongoose";
import { runBot } from "../services/orchestrator.js";
import {
  getConversationHistory,
  addMessageToHistory,
  createConversation,
  generateContextualSuggestions,
} from "../services/contextManager.js";
import { addChatJob } from "../services/queueService.js"; // Import queue service

// --- Validation Schemas ---
const chatMessageSchema = Joi.object({
  message: Joi.string().required(),
  conversationId: Joi.string().allow(null, ""), // Optional: ID of an existing conversation
});

const getHistorySchema = Joi.object({
  conversationId: Joi.string().required(),
});

// --- Controller Functions ---

/**
 * Handles incoming chat messages, routes to orchestrator, and returns response.
 * Uses BullMQ for asynchronous processing.
 * @route POST /api/chat
 * @access Private
 */
export const handleChat = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user._id;

    // Validate request body
    const { error, value } = chatMessageSchema.validate(req.body);
    if (error) {
      return res
        .status(400)
        .json({ message: `Validation échouée: ${error.details[0].message}` });
    }

    const { message, conversationId: providedConvId } = value;

    let conversationId = providedConvId;
    let currentConversation;

    // Find or create conversation
    if (conversationId && mongoose.Types.ObjectId.isValid(conversationId)) {
      // Check if conversation belongs to the tenant (contextManager should handle this implicitly via Redis/DB query)
      currentConversation = await getConversationHistory(userId, conversationId); // Check if history exists
      if (!currentConversation) {
         // Handle case where provided ID is valid but doesn\"t exist or belong to user/tenant
         // Option 1: Return error
         // return res.status(404).json({ message: "Conversation non trouvée ou accès non autorisé." });
         // Option 2: Create a new one (safer)
         console.warn(`Conversation ID ${conversationId} non trouvée pour user ${userId}, création d\"une nouvelle conversation.`);
         currentConversation = await createConversation(userId, tenantId);
         conversationId = currentConversation._id.toString();
      }
    } else {
      currentConversation = await createConversation(userId, tenantId);
      conversationId = currentConversation._id.toString();
    }

    // Add user message to history (synchronously for immediate feedback if needed, or let worker handle it)
    const userMessage = { role: "user", content: message, timestamp: new Date() };
    // await addMessageToHistory(userId, tenantId, conversationId, userMessage);

    // Add job to the queue for processing
    const job = await addChatJob({
      userId,
      tenantId,
      conversationId,
      message,
      // Pass necessary user data for the bot context
      userData: {
          id: userId,
          tenantId: tenantId,
          email: req.user.email,
          role: req.user.role,
          // Pass profile data if available and needed by bots
          // profile: req.user.businessProfile || req.user.familyProfile
      }
    });

    // Respond immediately to the user, indicating the message is being processed
    res.status(202).json({
      message: "Votre message est en cours de traitement.",
      jobId: job.id,
      conversationId: conversationId, // Return the conversation ID
      // Optionally return the user message for immediate display in UI
      // userMessage: userMessage
    });

  } catch (err) {
    console.error("Erreur dans handleChat:", err);
    // Pass error to global error handler
    // Avoid creating a specific error response here unless necessary
    return next(err);
  }
};

/**
 * Retrieves the message history for a specific conversation.
 * @route GET /api/chat/history/:conversationId
 * @access Private
 */
export const getHistory = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;

    // Validate conversationId format
    if (!mongoose.Types.ObjectId.isValid(conversationId)) {
        return res.status(400).json({ message: "ID de conversation invalide" });
    }

    // getConversationHistory should handle tenant check implicitly or explicitly
    const history = await getConversationHistory(userId, conversationId);

    if (!history) {
        // If getConversationHistory returns null/undefined for non-existent/unauthorized
        return res.status(404).json({ message: "Historique de conversation non trouvé ou accès non autorisé." });
    }

    return res.json(history);
  } catch (err) {
    console.error("Erreur dans getHistory:", err);
    return next(err);
  }
};

/**
 * Retrieves contextual suggestions for a conversation.
 * @route GET /api/chat/suggestions/:conversationId
 * @access Private
 */
export const getSuggestions = async (req, res, next) => {
    try {
        const userId = req.user._id;
        const { conversationId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
            return res.status(400).json({ message: "ID de conversation invalide" });
        }

        // generateContextualSuggestions should handle tenant check implicitly or explicitly
        const suggestions = await generateContextualSuggestions(userId, conversationId);

        // Always return suggestions, even if default ones
        return res.json(suggestions);

    } catch (err) {
        console.error("Erreur dans getSuggestions:", err);
        return next(err);
    }
};

// Note: getConversationSummary route/controller might be redundant if summary info
// is handled by summaryRoutes or integrated elsewhere.
// If kept, it needs similar tenantId logic and validation.

