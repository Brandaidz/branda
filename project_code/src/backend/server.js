import express from "express";
import mongoose from "mongoose";
import helmet from "helmet";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import logger from "./config/logger.js";
import rateLimiter from "./middlewares/rateLimiter.js";
import promAuth from "./middlewares/prometheusAuthMiddleware.js";
import authRoutes from "./routes/authRoutes.js";
import { protect } from "./middlewares/authMiddleware.js";
import tenantMiddleware from "./middlewares/tenantMiddleware.js";
import chatRoutes from "./routes/chatRoutes.js";
import summaryRoutes from "./routes/summaryRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import saleRoutes from "./routes/saleRoutes.js";
import employeeRoutes from "./routes/employeeRoutes.js";
import accountingRoutes from "./routes/accountingRoutes.js";
import scheduleRoutes from "./routes/scheduleRoutes.js";
import performanceRoutes from "./routes/performanceRoutes.js";
import onboardingRoutes from "./routes/onboardingRoutes.js";
import metricsRoutes from "./routes/metricsRoutes.js";
import healthRoutes from "./routes/healthRoutes.js";
import errorHandler from "./middlewares/errorHandler.js";

const app = express();

// Global middlewares (applied to all requests)
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") }));
app.use(express.json());

// Apply rate limiting and Prometheus auth middleware (conditionally if needed)
if (process.env.NODE_ENV !== "test") {
  app.use(rateLimiter);
  app.use(promAuth); // Apply promAuth only outside test env or configure separately
}

// --- Public Routes --- 
// Mount authentication routes (public)
app.use("/api/auth", authRoutes);
// Mount health endpoints (public)
app.use("/api", healthRoutes);
// Mount metrics routes (public or protected separately)
// If metrics need protection, apply specific middleware here or within the route file
// For now, let's assume it's public for simplicity in test env
app.use("/metrics", metricsRoutes);

// --- Static Files --- (Served after public API routes)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const reactAppBuildPath = path.join(__dirname, "../frontend/react_app/dist");
const legacyFrontendPath = path.join(__dirname, "../frontend");
app.use(express.static(reactAppBuildPath));
app.use(express.static(legacyFrontendPath));

// --- Protected API Routes --- (Apply auth middleware individually)
const protectedMiddlewares = [protect, tenantMiddleware];

app.use("/api/chat", protectedMiddlewares, chatRoutes);
app.use("/api/summary", protectedMiddlewares, summaryRoutes);
app.use("/api/products", protectedMiddlewares, productRoutes);
app.use("/api/sales", protectedMiddlewares, saleRoutes);
app.use("/api/employees", protectedMiddlewares, employeeRoutes);
app.use("/api/accounting", protectedMiddlewares, accountingRoutes);
app.use("/api/schedules", protectedMiddlewares, scheduleRoutes);
app.use("/api/performance", protectedMiddlewares, performanceRoutes);
app.use("/api/onboarding", protectedMiddlewares, onboardingRoutes);

// --- Frontend Catch-all --- (Optional, depends on frontend routing)
// Place this after all API routes
// app.get("*", (req, res) => {
//   res.sendFile(path.join(reactAppBuildPath, "index.html"));
// });

// --- Error Handler --- (Must be last)
app.use(errorHandler);

export default app;

