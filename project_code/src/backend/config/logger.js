// backend/config/logger.js
import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url'; // Importer fileURLToPath
import fs from 'fs';

// Obtenir __filename et __dirname dans un module ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get project root directory (assuming logger.js is in src/backend/config)
const projectRoot = path.resolve(__dirname, '../../..'); // Remonter de trois niveaux (config -> backend -> src -> project_code)
const logsDir = path.join(projectRoot, 'src/logs'); // Définir le répertoire des logs par rapport à la racine du projet src

// Ensure logs directory exists (optional, but good practice)
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Définir les niveaux de log et leurs couleurs
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Définir différentes couleurs pour chaque niveau
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Ajouter les couleurs à winston
winston.addColors(colors);

// Définir le format de log
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Définir les transports (où les logs seront stockés)
const transports = [
  // Logs d'erreur dans un fichier séparé
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
  }),
  // Tous les logs dans un fichier
  new winston.transports.File({
    filename: path.join(logsDir, 'all.log'),
  }),
  // Logs dans la console en développement
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`,
      ),
    ),
  }),
];

// Créer le logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
});

export default logger;

