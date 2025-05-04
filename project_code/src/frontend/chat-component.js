// Amélioration du composant de chat avec avatars et formatage amélioré
class BrandaChatComponent {
  constructor() {
    this.isExpanded = false;
    this.messages = [];
    this.suggestions = [];
    this.isLoading = false;
    this.conversationId = localStorage.getItem('brandaConversationId') || null;
    this.activeUserId = localStorage.getItem('activeUserId') || 'fastfood2025';
    this.currentPage = this.getCurrentPage();
    
    // Initialiser le composant
    this.init();
  }
  
  // Initialiser le composant de chat
  init() {
    // Créer les éléments du chat
    this.createChatElements();
    
    // Charger les messages précédents
    this.loadConversation();
    
    // Ajouter les écouteurs d'événements
    this.addEventListeners();
    
    // Générer des suggestions contextuelles basées sur la page actuelle
    this.generateContextualSuggestions();
  }
  
  // Créer les éléments HTML du chat
  createChatElements() {
    // Créer le conteneur principal
    this.container = document.createElement('div');
    this.container.className = 'chat-floating-container';
    
    // Créer le bouton flottant (mode réduit)
    this.floatingButton = document.createElement('div');
    this.floatingButton.className = 'chat-floating-button';
    this.floatingButton.innerHTML = `
      <div class="logo-icon">B</div>
      <div class="chat-notification-badge" style="display: none;">0</div>
    `;
    
    // Créer le panneau de chat (mode expansé)
    this.chatPanel = document.createElement('div');
    this.chatPanel.className = 'chat-panel';
    this.chatPanel.innerHTML = `
      <div class="chat-panel-header">
        <div class="chat-panel-title">
          <div class="logo-icon">B</div>
          <span>Branda Assistant</span>
        </div>
        <div class="chat-panel-actions">
          <button class="chat-panel-button" id="chatMinimize" aria-label="Minimiser le chat">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
      <div class="chat-messages" id="chatMessages"></div>
      <div class="loading-indicator" id="loadingIndicator">
        <div class="loading-dots">
          <div class="loading-dot"></div>
          <div class="loading-dot"></div>
          <div class="loading-dot"></div>
        </div>
      </div>
      <div class="chat-input-container">
        <input type="text" class="chat-input" id="chatInput" placeholder="Tapez votre message ici..." aria-label="Message à envoyer">
        <button class="chat-submit" id="chatSubmit" aria-label="Envoyer le message">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path>
          </svg>
        </button>
      </div>
    `;
    
    // Ajouter les éléments au DOM
    this.container.appendChild(this.floatingButton);
    document.body.appendChild(this.container);
    document.body.appendChild(this.chatPanel);
    
    // Référencer les éléments importants
    this.messagesContainer = document.getElementById('chatMessages');
    this.loadingIndicator = document.getElementById('loadingIndicator');
    this.chatInput = document.getElementById('chatInput');
    this.chatSubmit = document.getElementById('chatSubmit');
    this.chatMinimize = document.getElementById('chatMinimize');
    this.notificationBadge = this.floatingButton.querySelector('.chat-notification-badge');
  }
  
  // Ajouter les écouteurs d'événements
  addEventListeners() {
    // Ouvrir/fermer le chat
    this.floatingButton.addEventListener('click', () => this.toggleChat());
    this.chatMinimize.addEventListener('click', () => this.toggleChat());
    
    // Envoyer un message
    this.chatSubmit.addEventListener('click', () => this.sendMessage());
    this.chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.sendMessage();
      }
    });
    
    // Détecter les changements de page
    window.addEventListener('popstate', () => this.handlePageChange());
    
    // Cliquer sur une suggestion
    this.messagesContainer.addEventListener('click', (e) => {
      if (e.target.classList.contains('chat-suggestion')) {
        this.handleSuggestionClick(e.target.textContent);
      }
    });
  }
  
  // Basculer entre les modes réduit et expansé
  toggleChat() {
    this.isExpanded = !this.isExpanded;
    
    if (this.isExpanded) {
      this.chatPanel.classList.add('expanded');
      // Réinitialiser le badge de notification
      this.updateNotificationBadge(0);
      // Faire défiler vers le bas
      this.scrollToBottom();
      // Mettre le focus sur l'input
      setTimeout(() => this.chatInput.focus(), 300);
    } else {
      this.chatPanel.classList.remove('expanded');
    }
  }
  
  // Charger la conversation
  async loadConversation() {
    this.setLoading(true);
    
    try {
      // Si nous n'avons pas d'ID de conversation, en créer une nouvelle
      if (!this.conversationId) {
        const response = await this.createNewConversation();
        this.conversationId = response.conversationId;
        localStorage.setItem('brandaConversationId', this.conversationId);
      }
      
      // Charger les messages
      await this.loadMessages();
      
      // Si aucun message, ajouter un message de bienvenue
      if (this.messages.length === 0) {
        this.addWelcomeMessage();
      }
      
      // Faire défiler vers le bas
      this.scrollToBottom();
    } catch (error) {
      console.error('Erreur lors du chargement de la conversation:', error);
      this.showError("Impossible de charger la conversation. Veuillez réessayer plus tard.");
    } finally {
      this.setLoading(false);
    }
  }
  
  // Créer une nouvelle conversation
  async createNewConversation() {
    const API_URL = window.location.hostname === 'localhost' 
      ? `http://localhost:3000/api` 
      : '/api';
    
    const DEMO_API_KEY = 'demo_key_for_testing_purposes_only';
    
    const response = await fetch(`${API_URL}/chat/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('jwt') || DEMO_API_KEY}`
      },
      body: JSON.stringify({ userId: this.activeUserId })
    });
    
    if (!response.ok) {
      throw new Error('Erreur lors de la création de la conversation');
    }
    
    return await response.json();
  }
  
  // Charger les messages
  async loadMessages() {
    if (!this.conversationId) return;
    
    const API_URL = window.location.hostname === 'localhost' 
      ? `http://localhost:3000/api` 
      : '/api';
    
    const DEMO_API_KEY = 'demo_key_for_testing_purposes_only';
    
    const response = await fetch(`${API_URL}/chat/messages/${this.conversationId}?page=1&limit=20`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('jwt') || DEMO_API_KEY}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Erreur lors du chargement des messages');
    }
    
    const data = await response.json();
    this.messages = data.messages.reverse();
    
    // Afficher les messages
    this.renderMessages();
  }
  
  // Afficher les messages
  renderMessages() {
    if (!this.messagesContainer) return;
    
    // Vider le conteneur
    this.messagesContainer.innerHTML = '';
    
    // Ajouter chaque message
    this.messages.forEach(message => {
      const messageElement = this.createMessageElement(message);
      this.messagesContainer.appendChild(messageElement);
    });
    
    // Ajouter les suggestions contextuelles
    this.renderSuggestions();
  }
  
  // Créer un élément de message
  createMessageElement(message) {
    const messageElement = document.createElement('div');
    messageElement.className = `chat-message ${message.sender === 'user' ? 'user-message' : 'assistant-message'}`;
    
    // Ajouter l'avatar
    const avatarElement = document.createElement('div');
    avatarElement.className = 'message-avatar';
    avatarElement.textContent = message.sender === 'user' ? 'U' : 'B';
    messageElement.appendChild(avatarElement);
    
    const contentElement = document.createElement('div');
    contentElement.className = 'chat-message-content';
    contentElement.innerHTML = this.formatMessageContent(message.content);
    
    const timeElement = document.createElement('div');
    timeElement.className = 'chat-message-time';
    timeElement.textContent = this.formatTimestamp(message.timestamp);
    
    messageElement.appendChild(contentElement);
    messageElement.appendChild(timeElement);
    
    return messageElement;
  }
  
  // Formater le contenu du message
  formatMessageContent(content) {
    // Convertir les URLs en liens cliquables
    let formattedContent = content.replace(/(https?:\/\/[^\s]+)/g, url => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
    
    // Convertir les sauts de ligne en balises <p>
    formattedContent = formattedContent.split('\n\n').map(paragraph => 
      paragraph ? `<p>${paragraph}</p>` : ''
    ).join('');
    
    // Si pas de paragraphes détectés, envelopper dans un paragraphe
    if (!formattedContent.includes('<p>')) {
      formattedContent = `<p>${formattedContent}</p>`;
    }
    
    return formattedContent;
  }
  
  // Formater l'horodatage
  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  
  // Ajouter un message de bienvenue
  addWelcomeMessage() {
    const welcomeMessage = {
      sender: 'assistant',
      content: `Bonjour ! Je suis Branda, votre assistante IA pour la gestion d'entreprise. Comment puis-je vous aider aujourd'hui ?`,
      timestamp: new Date().toISOString()
    };
    
    this.messages.push(welcomeMessage);
    
    // Afficher le message
    const welcomeElement = this.createMessageElement(welcomeMessage);
    this.messagesContainer.appendChild(welcomeElement);
    
    // Générer des suggestions contextuelles
    this.generateContextualSuggestions();
  }
  
  // Envoyer un message
  async sendMessage() {
    const message = this.chatInput.value.trim();
    if (!message || this.isLoading) return;
    
    // Effacer l'input
    this.chatInput.value = '';
    
    // Créer l'objet message
    const userMessage = {
      sender: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    
    // Ajouter le message à la liste
    this.messages.push(userMessage);
    
    // Afficher le message
    const userMessageElement = this.createMessageElement(userMessage);
    this.messagesContainer.appendChild(userMessageElement);
    
    // Faire défiler vers le bas
    this.scrollToBottom();
    
    // Afficher l'indicateur de chargement
    this.setLoading(true);
    
    try {
      // Envoyer le message au serveur
      const API_URL = window.location.hostname === 'localhost' 
        ? `http://localhost:3000/api` 
        : '/api';
      
      const DEMO_API_KEY = 'demo_key_for_testing_purposes_only';
      
      const response = await fetch(`${API_URL}/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt') || DEMO_API_KEY}`
        },
        body: JSON.stringify({
          conversationId: this.conversationId,
          message,
          userId: this.activeUserId
        })
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de l\'envoi du message');
      }
      
      const data = await response.json();
      
      // Créer l'objet réponse
      const assistantMessage = {
        sender: 'assistant',
        content: data.reply || "Je suis désolé, je n'ai pas pu traiter votre demande. Veuillez réessayer.",
        timestamp: new Date().toISOString()
      };
      
      // Ajouter la réponse à la liste
      this.messages.push(assistantMessage);
      
      // Afficher la réponse
      const assistantMessageElement = this.createMessageElement(assistantMessage);
      this.messagesContainer.appendChild(assistantMessageElement);
      
      // Générer de nouvelles suggestions contextuelles
      this.generateContextualSuggestions();
      
      // Faire défiler vers le bas
      this.scrollToBottom();
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      this.showError("Impossible d'envoyer le message. Veuillez réessayer plus tard.");
    } finally {
      this.setLoading(false);
    }
  }
  
  // Générer des suggestions contextuelles basées sur la page actuelle
  generateContextualSuggestions() {
    // Vider les suggestions précédentes
    this.suggestions = [];
    
    // Ajouter des suggestions en fonction de la page actuelle
    switch (this.currentPage) {
      case 'index':
        this.suggestions = [
          "Quel est le résumé des ventes d'aujourd'hui ?",
          "Y a-t-il des produits en rupture de stock ?",
          "Quelles sont les tendances de vente cette semaine ?"
        ];
        break;
      case 'products':
        this.suggestions = [
          "Quels sont les produits les plus vendus ?",
          "Y a-t-il des produits en rupture de stock ?",
          "Comment optimiser mon inventaire ?"
        ];
        break;
      case 'sales':
        this.suggestions = [
          "Quelle est la performance des ventes par rapport à la semaine dernière ?",
          "Quels sont les produits les plus rentables ?",
          "Peux-tu me générer un rapport de ventes mensuel ?"
        ];
        break;
      case 'employees':
        this.suggestions = [
          "Qui sont mes employés les plus performants ?",
          "Y a-t-il des absences prévues cette semaine ?",
          "Comment optimiser les plannings de travail ?"
        ];
        break;
      case 'accounting':
        this.suggestions = [
          "Quel est le bilan financier du mois ?",
          "Quelles sont mes principales dépenses ?",
          "Comment puis-je réduire mes coûts ?"
        ];
        break;
      case 'hr':
        this.suggestions = [
          "Quand sont prévus les prochains entretiens annuels ?",
          "Y a-t-il des formations à planifier ?",
          "Comment améliorer la satisfaction des employés ?"
        ];
        break;
      case 'reports':
        this.suggestions = [
          "Peux-tu me générer un rapport de performance ?",
          "Quelles sont les tendances à surveiller ?",
          "Comment comparer mes résultats avec les objectifs ?"
        ];
        break;
      case 'settings':
        this.suggestions = [
          "Comment configurer les notifications ?",
          "Quels sont les paramètres recommandés ?",
          "Comment personnaliser mon tableau de bord ?"
        ];
        break;
      default:
        this.suggestions = [
          "Comment puis-je vous aider aujourd'hui ?",
          "Avez-vous besoin d'informations sur votre entreprise ?",
          "Souhaitez-vous analyser vos données ?"
        ];
    }
    
    // Afficher les suggestions
    this.renderSuggestions();
  }
  
  // Afficher les suggestions contextuelles
  renderSuggestions() {
    if (!this.messagesContainer || this.suggestions.length === 0) return;
    
    // Créer le conteneur de suggestions
    const suggestionsContainer = document.createElement('div');
    suggestionsContainer.className = 'chat-suggestions';
    suggestionsContainer.setAttribute('aria-label', 'Suggestions de questions');
    
    // Ajouter chaque suggestion
    this.suggestions.forEach(suggestion => {
      const suggestionElement = document.createElement('div');
      suggestionElement.className = 'chat-suggestion';
      suggestionElement.textContent = suggestion;
      suggestionElement.setAttribute('role', 'button');
      suggestionElement.setAttribute('tabindex', '0');
      suggestionElement.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          this.handleSuggestionClick(suggestion);
        }
      });
      suggestionsContainer.appendChild(suggestionElement);
    });
    
    // Ajouter les suggestions au conteneur de messages
    this.messagesContainer.appendChild(suggestionsContainer);
  }
  
  // Gérer le clic sur une suggestion
  handleSuggestionClick(suggestion) {
    // Remplir l'input avec la suggestion
    this.chatInput.value = suggestion;
    
    // Envoyer le message
    this.sendMessage();
  }
  
  // Afficher une erreur
  showError(message) {
    const errorElement = document.createElement('div');
    errorElement.className = 'chat-error';
    errorElement.textContent = message;
    errorElement.setAttribute('role', 'alert');
    
    this.messagesContainer.appendChild(errorElement);
    
    // Faire défiler vers le bas
    this.scrollToBottom();
    
    // Supprimer l'erreur après 5 secondes
    setTimeout(() => {
      if (this.messagesContainer.contains(errorElement)) {
        this.messagesContainer.removeChild(errorElement);
      }
    }, 5000);
  }
  
  // Afficher/masquer l'indicateur de chargement
  setLoading(isLoading) {
    this.isLoading = isLoading;
    
    if (this.loadingIndicator) {
      if (isLoading) {
        this.loadingIndicator.classList.add('active');
        this.loadingIndicator.style.display = 'flex';
      } else {
        this.loadingIndicator.classList.remove('active');
        this.loadingIndicator.style.display = 'none';
      }
    }
    
    if (this.chatSubmit) {
      this.chatSubmit.disabled = isLoading;
    }
  }
  
  // Faire défiler vers le bas
  scrollToBottom() {
    if (this.messagesContainer) {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
  }
  
  // Mettre à jour le badge de notification
  updateNotificationBadge(count) {
    if (this.notificationBadge) {
      if (count > 0) {
        this.notificationBadge.textContent = count > 9 ? '9+' : count;
        this.notificationBadge.style.display = 'flex';
      } else {
        this.notificationBadge.style.display = 'none';
      }
    }
  }
  
  // Obtenir la page actuelle
  getCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop() || 'index.html';
    return filename.replace('.html', '');
  }
  
  // Gérer le changement de page
  handlePageChange() {
    this.currentPage = this.getCurrentPage();
    this.generateContextualSuggestions();
  }
}

// Initialiser le composant de chat lorsque le DOM est chargé
document.addEventListener('DOMContentLoaded', () => {
  window.brandaChatComponent = new BrandaChatComponent();
});
