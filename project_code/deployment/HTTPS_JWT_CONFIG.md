# Configuration HTTPS et JWT pour le déploiement cloud de Branda

Ce document détaille les configurations nécessaires pour assurer que Branda fonctionne correctement en HTTPS avec l'authentification JWT dans un environnement cloud.

## Configuration HTTPS

### Vercel
- HTTPS est activé automatiquement pour tous les déploiements Vercel
- Les en-têtes de sécurité suivants ont été configurés dans `vercel.json` :
  - `Strict-Transport-Security` : Force les connexions HTTPS
  - `X-Content-Type-Options` : Prévient le MIME-sniffing
  - `X-Frame-Options` : Protège contre le clickjacking
  - `X-XSS-Protection` : Protection contre les attaques XSS
  - `Referrer-Policy` : Contrôle les informations de référence
  - `Content-Security-Policy` : Limite les sources de contenu autorisées

### Render
- HTTPS est activé automatiquement pour tous les services Render
- Les en-têtes de sécurité sont configurés dans `render.yaml` pour le service frontend

## Configuration JWT

### Sécurisation du secret JWT
- Le secret JWT doit être défini comme variable d'environnement (`JWT_SECRET`)
- Utiliser un secret d'au moins 32 caractères aléatoires
- Ne jamais réutiliser le même secret entre environnements (dev/prod)

### Configuration CORS pour JWT
Pour que l'authentification JWT fonctionne correctement entre le frontend et l'API :

1. **Vérification du domaine dans les tokens** :
   - S'assurer que le domaine (`iss`) dans les tokens JWT correspond au domaine de production
   - Adapter la validation du token dans `authMiddleware.js` si nécessaire

2. **Configuration CORS** :
   - L'API doit accepter les requêtes du domaine frontend
   - Les en-têtes CORS doivent être configurés pour permettre les cookies et les en-têtes d'authentification

## Vérification de la configuration

Pour vérifier que HTTPS et JWT fonctionnent correctement après déploiement :

1. **Test HTTPS** :
   - Accéder à l'application via HTTPS
   - Vérifier que toutes les redirections HTTP vers HTTPS fonctionnent
   - Utiliser un outil comme [SSL Labs](https://www.ssllabs.com/ssltest/) pour vérifier la configuration SSL

2. **Test JWT** :
   - Se connecter à l'application
   - Vérifier que le token JWT est correctement généré et stocké
   - Tester l'accès à une route protégée
   - Vérifier que le token reste valide après actualisation de la page

## Résolution des problèmes courants

### Problèmes HTTPS
- Contenu mixte : S'assurer que toutes les ressources (images, scripts, etc.) sont chargées en HTTPS
- Certificats : Vérifier la validité et l'expiration des certificats SSL

### Problèmes JWT
- Erreurs CORS : Vérifier les en-têtes CORS dans les réponses de l'API
- Expiration des tokens : Vérifier la durée de validité des tokens JWT
- Stockage des tokens : S'assurer que les tokens sont stockés de manière sécurisée (localStorage vs cookies)
