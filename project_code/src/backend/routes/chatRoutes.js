// backend/routes/chatRoutes.js
import express from "express";
import {
  handleChat,
  getHistory,
  getSuggestions,
} from "../controllers/chatController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Apply protect middleware to all chat routes
router.use(protect);

// Route to send a message (processed asynchronously)
router.post("/", handleChat);

// Route to get history for a specific conversation
router.get("/history/:conversationId", getHistory);

// Route to get contextual suggestions for a conversation
router.get("/suggestions/:conversationId", getSuggestions);

// Removed old /history/:userId and /summary/:userId routes

export default router;

