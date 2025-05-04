// backend/config/env.example.js
// Exemple de configuration des variables d'environnement pour Branda

// Serveur
PORT=3000

// MongoDB
MONGODB_URI=mongodb://localhost:27017/branda

// Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

// JWT
JWT_SECRET=votre_secret_jwt_tres_securise_a_changer_en_production

// OpenAI via OpenRouter
OPENROUTER_KEY=votre_cle_api_openrouter
OPENROUTER_API_BASE=https://openrouter.ai/api/v1

// Prometheus
PROMETHEUS_USER=prometheus_user
PROMETHEUS_PASSWORD=prometheus_password_securise

// Email (pour les notifications)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=user@example.com
EMAIL_PASSWORD=votre_mot_de_passe_email
EMAIL_FROM=noreply@branda.com

// Environnement
NODE_ENV=production
