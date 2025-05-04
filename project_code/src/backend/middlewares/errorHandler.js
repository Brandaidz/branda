// backend/middlewares/errorHandler.js
import mongoose from "mongoose";

/**
 * Global Error Handling Middleware
 * Catches errors passed via next(error) and sends appropriate HTTP responses.
 */
const errorHandler = (err, req, res, next) => {
  // Log the error for debugging purposes
  // In production, consider using a dedicated logging service
  console.error("\n--- Global Error Handler ---");
  console.error("Timestamp:", new Date().toISOString());
  console.error("Route:", req.method, req.originalUrl);
  // Avoid logging sensitive request body in production
  // console.error("Request Body:", req.body);
  console.error("Error Name:", err.name);
  console.error("Error Message:", err.message);
  console.error("Error Stack:", err.stack);
  console.error("----------------------------\n");

  let statusCode = err.statusCode || 500; // Default to 500 Internal Server Error
  let message = err.message || "Une erreur interne est survenue.";

  // Mongoose Bad ObjectId Error
  if (err.name === "CastError" && err.kind === "ObjectId") {
    statusCode = 400; // Bad Request
    message = `Ressource non trouvée. ID invalide: ${err.path} (${err.value})`;
  }

  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    statusCode = 409; // Conflict
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    message = `La valeur \"${value}\" existe déjà pour le champ \"${field}\". Veuillez en utiliser une autre.`;
  }

  // Mongoose Validation Error
  if (err.name === "ValidationError") {
    statusCode = 400; // Bad Request
    const errors = Object.values(err.errors).map((el) => el.message);
    message = `Données invalides: ${errors.join(". ")}`;
  }

  // Joi Validation Error (check if error comes from Joi, might need specific handling if not passed correctly)
  if (err.isJoi === true) {
      statusCode = 400; // Bad Request
      // Use the message already constructed in the controller or format from err.details
      message = err.message || `Validation échouée: ${err.details.map(d => d.message).join(", ")}`;
  }

  // JWT Errors (add specific checks if using jsonwebtoken library directly)
  if (err.name === "JsonWebTokenError") {
      statusCode = 401; // Unauthorized
      message = "Token invalide ou expiré. Veuillez vous reconnecter.";
  }
  if (err.name === "TokenExpiredError") {
      statusCode = 401; // Unauthorized
      message = "Votre session a expiré. Veuillez vous reconnecter.";
  }

  // Send the response
  // Override message for generic 500 errors to match test expectation
  if (statusCode === 500) {
      message = "Erreur serveur";
  }

  res.status(statusCode).json({
    status: statusCode >= 500 ? "error" : "fail",
    message: message, // Use the potentially overridden message
    // Optionally include stack trace in development
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

export default errorHandler;

