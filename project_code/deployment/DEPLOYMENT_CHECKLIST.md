# Checklist de déploiement Branda

Utilisez cette checklist pour vous assurer que tous les aspects du déploiement de Branda sont correctement configurés.

## Préparation au déploiement

- [ ] Code source cloné depuis le dépôt Git
- [ ] Fichiers de configuration vérifiés (vercel.json, render.yaml)
- [ ] Variables d'environnement préparées selon le fichier .env.example

## Services externes

- [ ] Instance MongoDB Atlas créée
  - [ ] Utilisateur de base de données configuré
  - [ ] Règles de réseau configurées
  - [ ] URI de connexion obtenu

- [ ] Instance Redis configurée
  - [ ] Informations de connexion notées
  - [ ] TLS configuré si nécessaire

- [ ] Compte OpenRouter créé
  - [ ] Clé API générée
  - [ ] Limites d'utilisation vérifiées

## Déploiement

- [ ] Choix de la plateforme (Vercel ou Render)
- [ ] Compte créé sur la plateforme choisie
- [ ] Dépôt Git connecté à la plateforme
- [ ] Variables d'environnement configurées
- [ ] Déploiement initial effectué

## Vérifications post-déploiement

- [ ] Application accessible via HTTPS
- [ ] Création de compte utilisateur fonctionnelle
- [ ] Authentification JWT fonctionnelle
- [ ] Isolation multi-tenant vérifiée
- [ ] PWA installable sur mobile
- [ ] Worker BullMQ fonctionnel
- [ ] Génération de résumés via OpenAI fonctionnelle
- [ ] Métriques Prometheus accessibles et sécurisées

## Optimisations

- [ ] Mise en cache configurée
- [ ] Compression activée
- [ ] Performances vérifiées sur mobile et desktop
- [ ] Accessibilité vérifiée

## Sécurité

- [ ] En-têtes HTTP de sécurité vérifiés
- [ ] CORS correctement configuré
- [ ] Authentification des endpoints sensibles vérifiée
- [ ] Métriques Prometheus protégées par authentification

## Monitoring

- [ ] Endpoint de healthcheck fonctionnel
- [ ] Logs configurés et accessibles
- [ ] Alertes configurées si nécessaire
