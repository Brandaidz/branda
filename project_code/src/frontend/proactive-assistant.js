// Fonctionnalité innovante : Assistant IA proactif avec suggestions contextuelles
// Ce script ajoute des fonctionnalités d'intelligence artificielle proactive à Branda

// Configuration des suggestions contextuelles
const contextualSuggestions = {
  // Suggestions basées sur le temps
  timeBasedSuggestions: [
    {
      condition: () => {
        const now = new Date();
        const hour = now.getHours();
        return hour >= 8 && hour <= 10; // Début de journée
      },
      suggestion: "Bonjour ! Souhaitez-vous voir le rapport des ventes d'hier ?",
      action: "Afficher le rapport des ventes d'hier"
    },
    {
      condition: () => {
        const now = new Date();
        const hour = now.getHours();
        return hour >= 11 && hour <= 13; // Milieu de journée
      },
      suggestion: "C'est bientôt l'heure du déjeuner. Voulez-vous vérifier les stocks pour le rush du midi ?",
      action: "Vérifier les stocks"
    },
    {
      condition: () => {
        const now = new Date();
        const hour = now.getHours();
        return hour >= 17 && hour <= 19; // Fin de journée
      },
      suggestion: "La journée touche à sa fin. Souhaitez-vous préparer les commandes pour demain ?",
      action: "Préparer les commandes"
    }
  ],
  
  // Suggestions basées sur les données
  dataBasedSuggestions: [
    {
      condition: (data) => data.lowStockItems && data.lowStockItems.length > 0,
      suggestion: (data) => `Attention : ${data.lowStockItems.length} produits sont en rupture de stock.`,
      action: "Voir les produits en rupture"
    },
    {
      condition: (data) => data.salesIncrease && data.salesIncrease > 10,
      suggestion: (data) => `Vos ventes ont augmenté de ${data.salesIncrease}% aujourd'hui. Félicitations !`,
      action: "Analyser la tendance"
    },
    {
      condition: (data) => data.pendingOrders && data.pendingOrders > 3,
      suggestion: (data) => `Vous avez ${data.pendingOrders} commandes en attente.`,
      action: "Traiter les commandes"
    }
  ],
  
  // Suggestions basées sur le comportement utilisateur
  behaviorBasedSuggestions: [
    {
      condition: (data) => data.lastVisitedPage === "products" && data.timeSpent > 120,
      suggestion: "Vous consultez souvent la page des produits. Souhaitez-vous ajouter un nouveau produit ?",
      action: "Ajouter un produit"
    },
    {
      condition: (data) => data.searchCount && data.searchCount > 3,
      suggestion: "Vous semblez chercher quelque chose. Puis-je vous aider à trouver ce que vous cherchez ?",
      action: "Aide à la recherche"
    },
    {
      condition: (data) => data.inactiveTime && data.inactiveTime > 300,
      suggestion: "Je remarque que vous n'avez pas interagi depuis un moment. Puis-je vous aider avec quelque chose ?",
      action: "Suggestions d'actions"
    }
  ]
};

// Classe pour l'assistant proactif
class ProactiveAssistant {
  constructor() {
    this.userData = {
      lowStockItems: ['Sauce spéciale maison', 'Pain burger complet', 'Dessert Brownie'],
      salesIncrease: 12.5,
      pendingOrders: 4,
      lastVisitedPage: 'dashboard',
      timeSpent: 0,
      searchCount: 0,
      inactiveTime: 0,
      visitedPages: [],
      actions: []
    };
    
    this.lastActivity = Date.now();
    this.suggestionDisplayed = false;
    
    // Initialiser le suivi d'activité
    this.initActivityTracking();
    
    // Vérifier les suggestions toutes les 30 secondes
    setInterval(() => this.checkForSuggestions(), 30000);
  }
  
  // Initialiser le suivi d'activité utilisateur
  initActivityTracking() {
    // Suivre les clics
    document.addEventListener('click', () => {
      this.lastActivity = Date.now();
      this.userData.inactiveTime = 0;
    });
    
    // Suivre les frappes au clavier
    document.addEventListener('keydown', () => {
      this.lastActivity = Date.now();
      this.userData.inactiveTime = 0;
    });
    
    // Suivre les recherches
    const searchInput = document.querySelector('.search-input');
    if (searchInput) {
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.userData.searchCount++;
        }
      });
    }
    
    // Mettre à jour le temps d'inactivité
    setInterval(() => {
      this.userData.inactiveTime = (Date.now() - this.lastActivity) / 1000;
    }, 1000);
    
    // Suivre les pages visitées
    this.trackPageVisits();
  }
  
  // Suivre les pages visitées
  trackPageVisits() {
    // Détecter la page actuelle
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const pageName = currentPage.replace('.html', '');
    
    // Mettre à jour la dernière page visitée
    if (this.userData.lastVisitedPage !== pageName) {
      this.userData.lastVisitedPage = pageName;
      this.userData.visitedPages.push({
        page: pageName,
        timestamp: Date.now()
      });
      
      // Réinitialiser le temps passé sur la page
      this.userData.timeSpent = 0;
      
      // Démarrer le chronomètre pour cette page
      this.pageTimer = setInterval(() => {
        this.userData.timeSpent++;
      }, 1000);
    }
  }
  
  // Vérifier s'il y a des suggestions à afficher
  checkForSuggestions() {
    if (this.suggestionDisplayed) return;
    
    // Vérifier les suggestions basées sur le temps
    for (const suggestion of contextualSuggestions.timeBasedSuggestions) {
      if (suggestion.condition()) {
        this.displaySuggestion(suggestion.suggestion, suggestion.action);
        return;
      }
    }
    
    // Vérifier les suggestions basées sur les données
    for (const suggestion of contextualSuggestions.dataBasedSuggestions) {
      if (suggestion.condition(this.userData)) {
        const message = typeof suggestion.suggestion === 'function' 
          ? suggestion.suggestion(this.userData) 
          : suggestion.suggestion;
        this.displaySuggestion(message, suggestion.action);
        return;
      }
    }
    
    // Vérifier les suggestions basées sur le comportement
    for (const suggestion of contextualSuggestions.behaviorBasedSuggestions) {
      if (suggestion.condition(this.userData)) {
        this.displaySuggestion(suggestion.suggestion, suggestion.action);
        return;
      }
    }
  }
  
  // Afficher une suggestion à l'utilisateur
  displaySuggestion(message, action) {
    this.suggestionDisplayed = true;
    
    // Créer l'élément de suggestion
    const suggestionElement = document.createElement('div');
    suggestionElement.className = 'assistant-suggestion';
    
    suggestionElement.innerHTML = `
      <div class="suggestion-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 16v-4"></path>
          <path d="M12 8h.01"></path>
        </svg>
      </div>
      <div class="suggestion-content">
        <div class="suggestion-message">${message}</div>
        <div class="suggestion-actions">
          <button class="btn btn-primary btn-sm suggestion-action">${action}</button>
          <button class="btn btn-outline btn-sm suggestion-dismiss">Ignorer</button>
        </div>
      </div>
    `;
    
    // Ajouter la suggestion au DOM
    document.body.appendChild(suggestionElement);
    
    // Animer l'entrée de la suggestion
    setTimeout(() => {
      suggestionElement.classList.add('show');
    }, 100);
    
    // Ajouter les écouteurs d'événements
    const actionButton = suggestionElement.querySelector('.suggestion-action');
    const dismissButton = suggestionElement.querySelector('.suggestion-dismiss');
    
    actionButton.addEventListener('click', () => {
      this.handleSuggestionAction(action);
      this.removeSuggestion(suggestionElement);
    });
    
    dismissButton.addEventListener('click', () => {
      this.removeSuggestion(suggestionElement);
    });
    
    // Supprimer automatiquement après 30 secondes
    setTimeout(() => {
      if (document.body.contains(suggestionElement)) {
        this.removeSuggestion(suggestionElement);
      }
    }, 30000);
  }
  
  // Gérer l'action de la suggestion
  handleSuggestionAction(action) {
    // Enregistrer l'action
    this.userData.actions.push({
      action: action,
      timestamp: Date.now()
    });
    
    // Simuler différentes actions
    switch (action) {
      case "Afficher le rapport des ventes d'hier":
        window.location.href = 'reports.html';
        break;
      case "Vérifier les stocks":
        window.location.href = 'products.html';
        break;
      case "Préparer les commandes":
        // Afficher une notification toast
        if (typeof showToast === 'function') {
          showToast('info', 'Préparation des commandes', 'Assistant en cours de préparation des commandes pour demain.');
        }
        break;
      case "Voir les produits en rupture":
        window.location.href = 'products.html?filter=lowstock';
        break;
      case "Analyser la tendance":
        window.location.href = 'reports.html?section=trends';
        break;
      case "Traiter les commandes":
        window.location.href = 'sales.html?filter=pending';
        break;
      case "Ajouter un produit":
        window.location.href = 'products.html?action=new';
        break;
      case "Aide à la recherche":
        // Ouvrir le chat avec une question d'aide
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
          chatInput.value = "J'ai besoin d'aide pour trouver quelque chose";
          chatInput.focus();
        }
        break;
      case "Suggestions d'actions":
        // Afficher une notification toast
        if (typeof showToast === 'function') {
          showToast('info', 'Suggestions', 'Voici quelques actions que vous pourriez effectuer maintenant.');
        }
        break;
      default:
        console.log(`Action non implémentée: ${action}`);
    }
  }
  
  // Supprimer une suggestion
  removeSuggestion(element) {
    element.classList.remove('show');
    setTimeout(() => {
      if (document.body.contains(element)) {
        document.body.removeChild(element);
      }
      this.suggestionDisplayed = false;
    }, 300);
  }
  
  // Mettre à jour les données utilisateur
  updateUserData(newData) {
    this.userData = { ...this.userData, ...newData };
  }
}

// Initialiser l'assistant proactif lorsque le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
  window.proactiveAssistant = new ProactiveAssistant();
  
  // Ajouter des styles pour les suggestions
  const styleElement = document.createElement('style');
  styleElement.textContent = `
    .assistant-suggestion {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background-color: var(--white);
      border-radius: var(--border-radius-lg);
      box-shadow: var(--shadow-lg);
      display: flex;
      width: 320px;
      max-width: 90vw;
      padding: var(--spacing-md);
      z-index: 1000;
      transform: translateY(100px);
      opacity: 0;
      transition: transform 0.3s ease, opacity 0.3s ease;
    }
    
    .dark-mode .assistant-suggestion {
      background-color: var(--gray-800);
      color: var(--white);
    }
    
    .assistant-suggestion.show {
      transform: translateY(0);
      opacity: 1;
    }
    
    .suggestion-icon {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: var(--primary-light);
      color: var(--white);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: var(--spacing-md);
    }
    
    .suggestion-content {
      flex-grow: 1;
    }
    
    .suggestion-message {
      margin-bottom: var(--spacing-sm);
      font-size: var(--font-size-md);
    }
    
    .suggestion-actions {
      display: flex;
      gap: var(--spacing-sm);
    }
  `;
  document.head.appendChild(styleElement);
});
