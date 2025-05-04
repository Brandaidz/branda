// backend/routes/accountingRoutes.js
import express from "express";
import {
  getEntries,
  getEntry,
  createEntry,
  updateEntry,
  deleteEntry,
  importSales,
  generateReport,
  generateDailyReport,
} from "../controllers/accountingController.js";
import { protect } from "../middlewares/authMiddleware.js";
// import { isAdmin } from "../middlewares/roleMiddleware.js"; // Add role checks if needed

const router = express.Router();

// Apply protect middleware to all accounting routes
router.use(protect);

// Routes - Removed /user/:userId and adapted paths
router.get("/", getEntries); // Get all entries for the tenant
router.post("/", createEntry); // Create a new entry

router.get("/report", generateReport); // Generate financial report
router.get("/daily-report", generateDailyReport); // Generate daily report
router.post("/import-sales", importSales); // Import sales for the tenant

router.get("/:id", getEntry); // Get a specific entry by ID
router.put("/:id", updateEntry); // Update an entry
router.delete("/:id", deleteEntry); // Delete an entry

export default router;

