// backend/routes/employeeRoutes.js
import express from "express";
import mongoose from "mongoose"; // Keep mongoose import if needed elsewhere, though not for param validation here
import {
  getEmployees,
  getEmployee,
  createEmployee,
  updateEmployee,
  deleteEmployee, 
  deactivateEmployee, 
  reactivateEmployee,
  getEmployeeStats,
} from "../controllers/employeeController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Apply protect middleware to all employee routes first
router.use(protect);

// REMOVED router.param("id", ...) - Validation will be handled in controllers again

// Routes without :id parameter
router.get("/", getEmployees); 
router.get("/stats", getEmployeeStats); 
router.post("/", createEmployee); 

// Routes with :id parameter - Controller will handle validation
router.get("/:id", getEmployee); 
router.put("/:id", updateEmployee); 
router.delete("/:id", deleteEmployee); 
router.patch("/:id/deactivate", deactivateEmployee); 
router.patch("/:id/reactivate", reactivateEmployee); 

export default router;

