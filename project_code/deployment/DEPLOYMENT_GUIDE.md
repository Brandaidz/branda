# Guide de déploiement de Branda

Ce document détaille les étapes nécessaires pour déployer Branda sur différentes plateformes cloud. Suivez les instructions correspondant à la plateforme de votre choix.

## Table des matières

1. [Prérequis](#prérequis)
2. [Déploiement sur Vercel](#déploiement-sur-vercel)
3. [Déploiement sur Render](#déploiement-sur-render)
4. [Configuration des services externes](#configuration-des-services-externes)
5. [Vérification du déploiement](#vérification-du-déploiement)
6. [Résolution des problèmes courants](#résolution-des-problèmes-courants)

## Prérequis

Avant de commencer le déploiement, assurez-vous de disposer des éléments suivants :

- Un compte sur la plateforme choisie (Vercel ou Render)
- Une instance MongoDB (MongoDB Atlas recommandé)
- Une instance Redis (Redis Labs ou Upstash recommandé)
- Une clé API OpenRouter pour accéder à OpenAI
- Un dépôt Git contenant le code source de Branda

## Déploiement sur Vercel

### 1. Préparation du projet

1. Assurez-vous que votre projet contient le fichier `vercel.json` à la racine
2. Vérifiez que les scripts dans `package.json` sont correctement configurés

### 2. Déploiement via l'interface Vercel

1. Connectez-vous à votre compte [Vercel](https://vercel.com)
2. Cliquez sur "New Project" et importez votre dépôt Git
3. Configurez le projet :
   - **Framework Preset** : Other
   - **Root Directory** : ./
   - **Build Command** : Laissez vide (défini dans vercel.json)
   - **Output Directory** : Laissez vide (défini dans vercel.json)

### 3. Configuration des variables d'environnement

Dans l'interface Vercel, allez dans "Settings" > "Environment Variables" et ajoutez toutes les variables listées dans le fichier `.env.vercel` :

- `MONGODB_URI` : URI de connexion à votre base MongoDB
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` : Informations de connexion Redis
- `JWT_SECRET` : Clé secrète pour les tokens JWT
- `OPENROUTER_KEY`, `OPENROUTER_API_BASE` : Configuration OpenRouter
- Autres variables spécifiques à votre environnement

### 4. Déploiement

1. Cliquez sur "Deploy"
2. Vercel va construire et déployer votre application
3. Une fois terminé, vous recevrez une URL de déploiement (ex: `https://branda.vercel.app`)

## Déploiement sur Render

### 1. Préparation du projet

1. Assurez-vous que votre projet contient le fichier `render.yaml` à la racine
2. Vérifiez que les scripts dans `package.json` sont correctement configurés

### 2. Déploiement via l'interface Render

#### Option 1 : Déploiement Blueprint (recommandé)

1. Connectez-vous à votre compte [Render](https://render.com)
2. Allez dans "Blueprints" et cliquez sur "New Blueprint Instance"
3. Connectez votre dépôt Git contenant le fichier `render.yaml`
4. Render détectera automatiquement la configuration et créera les services définis

#### Option 2 : Déploiement manuel des services

Si vous préférez déployer manuellement chaque service :

1. **API Backend** :
   - Créez un nouveau "Web Service"
   - Connectez votre dépôt Git
   - Nom : `branda-api`
   - Build Command : `cd src/backend && npm install`
   - Start Command : `cd src/backend && node server.js`

2. **Worker** :
   - Créez un nouveau "Background Worker"
   - Connectez votre dépôt Git
   - Nom : `branda-worker`
   - Build Command : `cd src/backend && npm install`
   - Start Command : `cd src/backend && node workers/index.js`

3. **Frontend** :
   - Créez un nouveau "Static Site"
   - Connectez votre dépôt Git
   - Nom : `branda-frontend`
   - Publish Directory : `src/frontend`
   - Ajoutez une règle de redirection pour l'API

### 3. Configuration des variables d'environnement

Pour chaque service créé sur Render, configurez les variables d'environnement listées dans le fichier `.env.render` :

- Pour l'API et le Worker :
  - `MONGODB_URI`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
  - `JWT_SECRET`, `OPENROUTER_KEY`, `OPENROUTER_API_BASE`
  - Autres variables spécifiques

- Pour le Frontend :
  - `API_URL` : URL de votre API déployée (ex: `https://branda-api.onrender.com`)

### 4. Déploiement

1. Une fois les services configurés, Render déploiera automatiquement votre application
2. Vous recevrez des URLs pour chaque service déployé

## Configuration des services externes

### MongoDB Atlas

1. Créez un compte sur [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Créez un nouveau cluster (le niveau gratuit est suffisant pour commencer)
3. Configurez un utilisateur de base de données avec mot de passe
4. Configurez les règles de réseau pour autoriser les connexions depuis n'importe où (`0.0.0.0/0`)
5. Obtenez l'URI de connexion et remplacez `<username>`, `<password>` et `<cluster>` par vos informations

### Redis Labs / Upstash

1. Créez un compte sur [Redis Labs](https://redislabs.com/) ou [Upstash](https://upstash.com/)
2. Créez une nouvelle base de données Redis
3. Notez les informations de connexion (hôte, port, mot de passe)
4. Configurez TLS si nécessaire

### OpenRouter (pour OpenAI)

1. Créez un compte sur [OpenRouter](https://openrouter.ai/)
2. Générez une clé API
3. Utilisez l'URL de base `https://openrouter.ai/api/v1`

## Vérification du déploiement

Après le déploiement, effectuez les vérifications suivantes :

### 1. Vérification HTTPS

- Accédez à votre application via HTTPS
- Vérifiez que toutes les redirections HTTP vers HTTPS fonctionnent
- Utilisez [SSL Labs](https://www.ssllabs.com/ssltest/) pour vérifier la configuration SSL

### 2. Vérification de l'authentification

- Créez un compte utilisateur
- Connectez-vous à l'application
- Vérifiez que le token JWT est correctement généré et stocké
- Testez l'accès à une route protégée

### 3. Vérification multi-tenant

- Créez plusieurs comptes avec différents tenants
- Vérifiez que les données sont correctement isolées entre les tenants

### 4. Vérification PWA

- Sur mobile, accédez à l'application
- Vérifiez que le prompt d'installation apparaît
- Installez l'application et vérifiez qu'elle s'ouvre correctement
- Testez le mode hors ligne

### 5. Vérification des workers

- Créez une tâche qui déclenche le worker (ex: génération de résumé)
- Vérifiez que la tâche est traitée correctement

## Résolution des problèmes courants

### Problèmes de connexion MongoDB

- Vérifiez que l'URI MongoDB est correct
- Assurez-vous que les règles de réseau MongoDB autorisent les connexions depuis votre plateforme cloud
- Vérifiez les logs pour les erreurs de connexion

### Problèmes de connexion Redis

- Vérifiez les informations de connexion Redis
- Assurez-vous que TLS est correctement configuré si nécessaire
- Vérifiez les logs pour les erreurs de connexion

### Problèmes d'authentification

- Vérifiez que `JWT_SECRET` est correctement défini
- Assurez-vous que les en-têtes CORS sont correctement configurés
- Vérifiez les logs pour les erreurs d'authentification

### Problèmes de worker

- Vérifiez que le worker est correctement démarré
- Assurez-vous que la connexion Redis est stable
- Vérifiez les logs pour les erreurs de traitement

### Problèmes de PWA

- Vérifiez que le service worker est correctement enregistré
- Assurez-vous que toutes les ressources sont mises en cache
- Utilisez les outils de développement du navigateur pour déboguer
