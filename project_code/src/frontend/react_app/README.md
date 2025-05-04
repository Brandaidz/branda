# Documentation de l'Interface de Chat React/Vite

Ce document décrit la nouvelle interface de chat développée en React + Vite pour le projet Branda.

## Structure du Projet Frontend (`src/frontend/react_app`)

L'interface de chat est contenue dans le dossier `src/frontend/react_app`. Voici sa structure principale :

-   **`public/`**: Contient les ressources statiques publiques.
-   **`src/`**: Contient le code source de l'application React.
    -   **`assets/`**: Ressources statiques utilisées par les composants (ex: logos).
    -   **`components/`**: Composants React réutilisables pour l'interface de chat.
        -   `ChatWindow.tsx`: Le composant principal qui orchestre l'interface de chat.
        -   `MessageList.tsx`: Affiche la liste des messages et l'indicateur de chargement.
        -   `MessageInput.tsx`: Le champ de saisie et le bouton d'envoi pour les messages utilisateur.
    -   **`layouts/`**: Composants de mise en page (layouts).
        -   `MainLayout.tsx`: Le layout principal avec la barre de navigation permettant de basculer entre la page d'accueil (legacy) et le chat.
    -   **`pages/`**: Composants représentant les pages de l'application.
        -   `HomePage.tsx`: Placeholder pour l'interface utilisateur "legacy" ou la page d'accueil principale.
        -   `ChatPage.tsx`: La page qui affiche l'interface de chat (`ChatWindow`).
    -   **`services/`**: Modules pour interagir avec les API backend.
        -   `chatService.ts`: Contient les fonctions pour appeler l'API de chat (démarrer session, envoyer message, etc.) en utilisant Axios.
    -   `App.tsx`: Configure le routage principal de l'application en utilisant `react-router-dom`.
    -   `main.tsx`: Le point d'entrée de l'application React, initialise React et le routeur.
    -   `index.css`: Fichier CSS principal important les directives Tailwind CSS.
-   **`tailwind.config.js`**: Fichier de configuration pour Tailwind CSS (inclut DaisyUI).
-   **`postcss.config.js`**: Fichier de configuration pour PostCSS.
-   **`vite.config.ts`**: Fichier de configuration pour Vite.
-   **`package.json`**: Définit les dépendances et les scripts du projet frontend.

## Installation et Lancement

1.  **Naviguer vers le dossier frontend** :
    ```bash
    cd src/frontend/react_app
    ```
2.  **Installer les dépendances** :
    ```bash
    npm install
    ```
3.  **Lancer le serveur de développement Vite** :
    ```bash
    npm run dev
    ```
    L'application sera généralement accessible à l'adresse `http://localhost:5173` (Vite indiquera le port exact).

## Intégration API

Le service `src/services/chatService.ts` est configuré pour communiquer avec l'API backend. Il suppose que le backend tourne sur `http://localhost:5000/api` (configurable via la variable d'environnement `VITE_API_BASE_URL`).

Les endpoints attendus (basés sur la collection Postman précédente) sont :
-   `POST /api/chat/start`: Pour démarrer une nouvelle session de chat.
-   `POST /api/chat/message`: Pour envoyer un message utilisateur et recevoir une réponse de l'IA.
-   `GET /api/chat/history`: Pour récupérer l'historique des messages (non implémenté dans l'UI actuelle mais le service existe).

## Problèmes Connus

Lors de la phase de test (étape 007), des erreurs de syntaxe persistantes dans le code du backend (`src/backend/server.js` et potentiellement d'autres fichiers comme `src/backend/middlewares/authMiddleware.js`) ont empêché le démarrage correct du serveur backend. Par conséquent, l'intégration complète entre le frontend et le backend n'a pas pu être testée.

L'interface frontend elle-même a été développée et structurée comme demandé, mais nécessitera un backend fonctionnel pour une opération complète.

## Compatibilité UI Legacy

L'interface de chat a été intégrée en utilisant `react-router-dom`. Un layout principal (`MainLayout.tsx`) fournit une navigation permettant d'accéder à la fois à un placeholder pour l'UI legacy (`/`) et à la nouvelle interface de chat (`/chat`), assurant ainsi que la nouvelle fonctionnalité n'interfère pas directement avec la structure existante (supposée).

