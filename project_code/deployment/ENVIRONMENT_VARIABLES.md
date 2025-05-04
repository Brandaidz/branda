# Configuration des variables d'environnement pour Branda

Ce document détaille toutes les variables d'environnement nécessaires pour déployer Branda en production sur un environnement cloud.

## Variables d'environnement essentielles

### Configuration du serveur
- `PORT` - Port sur lequel l'API sera exposée (généralement défini automatiquement par la plateforme cloud)
- `NODE_ENV` - Environnement d'exécution (doit être `production` pour le déploiement)
- `API_URL` - URL complète de l'API backend (utilisée par le frontend)

### Base de données MongoDB
- `MONGODB_URI` - URI de connexion à MongoDB Atlas ou autre instance MongoDB
  - Format: `mongodb+srv://<username>:<password>@<cluster>.mongodb.net/branda?retryWrites=true&w=majority`
  - Recommandation: Utiliser MongoDB Atlas pour une solution gérée avec haute disponibilité

### Redis (pour BullMQ et mise en cache)
- `REDIS_HOST` - Nom d'hôte du serveur Redis
- `REDIS_PORT` - Port Redis (généralement 6379)
- `REDIS_PASSWORD` - Mot de passe Redis
- `REDIS_TLS` - Utiliser TLS pour la connexion Redis (true/false)
  - Recommandation: Utiliser Redis Labs ou Upstash pour une solution gérée

### Sécurité et authentification
- `JWT_SECRET` - Clé secrète pour signer les tokens JWT
  - Doit être une chaîne aléatoire complexe d'au moins 32 caractères
  - Exemple: générer avec `openssl rand -base64 32`

### OpenAI via OpenRouter
- `OPENROUTER_KEY` - Clé API pour OpenRouter
- `OPENROUTER_API_BASE` - URL de base de l'API OpenRouter (https://openrouter.ai/api/v1)

### Monitoring Prometheus
- `PROMETHEUS_USER` - Nom d'utilisateur pour l'authentification Basic Auth de l'endpoint Prometheus
- `PROMETHEUS_PASSWORD` - Mot de passe pour l'authentification Basic Auth de l'endpoint Prometheus

### Email (pour les notifications)
- `EMAIL_HOST` - Serveur SMTP
- `EMAIL_PORT` - Port SMTP (généralement 587 pour TLS)
- `EMAIL_USER` - Nom d'utilisateur SMTP
- `EMAIL_PASSWORD` - Mot de passe SMTP
- `EMAIL_FROM` - Adresse email d'expédition

## Sécurisation des variables d'environnement

- Ne jamais stocker les variables d'environnement dans le code source
- Utiliser les fonctionnalités de gestion des secrets de la plateforme cloud
- Sur Vercel: Configurer les variables dans l'interface "Environment Variables"
- Sur Render: Configurer les variables dans l'interface "Environment" de chaque service

## Vérification des variables

Avant le déploiement, assurez-vous que:
1. Toutes les variables requises sont définies
2. Les connexions MongoDB et Redis sont testées
3. Les clés API (OpenRouter) sont valides
4. Le secret JWT est suffisamment complexe

## Rotation des secrets

Il est recommandé de:
- Changer régulièrement le `JWT_SECRET` (tous les 90 jours)
- Renouveler les clés API (OpenRouter) tous les 6 mois
- Utiliser des mots de passe uniques et complexes pour Redis et MongoDB
