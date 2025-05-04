# Documentation des Tests du Backend Branda

Ce document explique comment exécuter les tests automatisés pour le backend de l'application Branda et comment vérifier la couverture de code.

## Prérequis

Avant d'exécuter les tests, assurez-vous d'avoir les éléments suivants installés et configurés :

*   Node.js (version 20 ou supérieure recommandée, voir `.nvmrc` ou `package.json` pour la version exacte)
*   npm (généralement installé avec Node.js)
*   Accès à une instance MongoDB (une base de données de test est généralement configurée via `jest-mongodb-config.js` ou des variables d'environnement pour les tests d'intégration).
*   Accès à une instance Redis (pour les tests impliquant le rate limiting, la blacklist JWT, etc.).

Assurez-vous également que toutes les dépendances du projet sont installées en exécutant la commande suivante à la racine du répertoire `src/backend` :

```bash
npm install
# ou si vous préférez une installation propre pour CI/CD
npm ci
```

## Configuration de l'environnement de test

Les tests, en particulier les tests d'intégration, peuvent nécessiter des variables d'environnement spécifiques. Celles-ci peuvent inclure :

*   `MONGODB_URI`: L'URI de connexion à la base de données MongoDB de test.
*   `REDIS_URL`: L'URL de connexion à l'instance Redis de test.
*   `JWT_SECRET`: Une clé secrète pour signer les JWT pendant les tests.
*   `JWT_REFRESH_SECRET`: Une clé secrète pour les refresh tokens pendant les tests.
*   `NODE_ENV`: Doit être défini sur `test` pour activer certaines configurations spécifiques aux tests.
*   D'autres variables nécessaires au fonctionnement de l'application (clés API, etc.).

Ces variables peuvent être définies directement dans votre environnement, via un fichier `.env.test` (si votre configuration de test le supporte), ou passées directement lors de l'exécution des commandes de test (comme dans l'exemple GitHub Actions).

## Exécution des Tests

Le projet utilise Jest comme framework de test. Plusieurs scripts npm sont disponibles dans `src/backend/package.json` pour exécuter les tests.

### Exécuter tous les tests une fois

Pour lancer l'ensemble de la suite de tests (unitaires et intégration) une seule fois :

```bash
cd src/backend
npm test
```

Cette commande utilise `jest` avec la configuration définie dans `jest.config.json`.

### Exécuter les tests en mode "watch"

Pour exécuter les tests et les relancer automatiquement à chaque modification de fichier :

```bash
cd src/backend
npm run test:watch
```

Ceci est utile pendant le développement pour obtenir un retour rapide.

## Vérification de la Couverture de Code

Pour exécuter les tests et générer un rapport de couverture de code :

```bash
cd src/backend
npm run test:coverage
```

Cette commande exécute Jest avec l'option `--coverage`. Les résultats s'afficheront dans la console, indiquant le pourcentage de couverture pour les statements, branches, fonctions et lignes, comparé aux seuils définis dans `jest.config.json` (section `coverageThreshold`).

Si la couverture est inférieure aux seuils configurés (par exemple, 70%), la commande échouera, ce qui est utile pour les pipelines CI/CD.

Un rapport de couverture détaillé au format HTML est également généré dans le répertoire `src/backend/coverage/lcov-report/`. Vous pouvez ouvrir le fichier `index.html` dans ce répertoire avec un navigateur web pour explorer la couverture de chaque fichier et identifier les lignes de code non testées.

## Dépannage

*   **Erreurs de connexion (MongoDB/Redis)**: Vérifiez que les services MongoDB et Redis sont en cours d'exécution et que les variables d'environnement (`MONGODB_URI`, `REDIS_URL`) sont correctement configurées pour pointer vers les instances de test.
*   **Échecs de tests liés à l'environnement**: Assurez-vous que `NODE_ENV` est défini sur `test` et que toutes les autres variables d'environnement nécessaires sont présentes.
*   **Couverture faible**: Utilisez le rapport HTML (`coverage/lcov-report/index.html`) pour identifier les parties du code qui manquent de tests et ajoutez des cas de test pertinents.

