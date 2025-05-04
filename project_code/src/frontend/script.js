// frontend/script.js
const PORT = 3000;
const API_URL = window.location.hostname === 'localhost' 
  ? `http://localhost:${PORT}/api` 
  : '/api';

// Clé API de démonstration (uniquement pour la démo)
const DEMO_API_KEY = 'demo_key_for_testing_purposes_only';

// Éléments DOM
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const messagesContainer = document.getElementById('messages');
const loadingIndicator = document.getElementById('loading-indicator');
const loadMoreBtn = document.getElementById('load-more');
const userInfoElement = document.getElementById('user-info');
const userNameElement = document.querySelector('.user-name');
const userAvatarElement = document.querySelector('.user-avatar');

// État de l'application
let activeUserId = localStorage.getItem('activeUserId') || 'fastfood2025';
let conversationId = localStorage.getItem(`conversationId_${activeUserId}`) || null;
let isLoading = false;
let page = 1;
let hasMoreMessages = false;

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
  updateUserInfo();
  loadConversation();
  
  // Gestionnaire d'événements pour le formulaire de chat
  if (chatForm) {
    chatForm.addEventListener('submit', handleChatSubmit);
  }
  
  // Gestionnaire d'événements pour le bouton "Charger plus"
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', loadMoreMessages);
  }
  
  // Gestionnaire d'événements pour le menu utilisateur
  const userMenu = document.querySelector('.user-menu');
  if (userMenu) {
    userMenu.addEventListener('click', toggleUserMenu);
  }
  
  // Gestionnaire d'événements pour les liens de navigation
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      // Si le lien est déjà actif, ne rien faire
      if (link.classList.contains('active')) {
        return;
      }
      
      // Retirer la classe active de tous les liens
      navLinks.forEach(l => l.classList.remove('active'));
      
      // Ajouter la classe active au lien cliqué
      link.classList.add('active');
    });
  });
  
  // Gestionnaire d'événements pour le bouton de menu mobile
  const menuToggle = document.querySelector('.menu-toggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      const sidebar = document.querySelector('.sidebar');
      sidebar.classList.toggle('open');
    });
  }
});

// Mettre à jour les informations utilisateur
function updateUserInfo() {
  if (userNameElement && userAvatarElement) {
    if (activeUserId === 'fastfood2025') {
      userNameElement.textContent = 'Fast-Food';
      userAvatarElement.textContent = 'F';
    } else if (activeUserId === 'salonelchic') {
      userNameElement.textContent = 'Salon El Chic';
      userAvatarElement.textContent = 'S';
    }
  }
}

// Afficher/masquer le menu utilisateur
function toggleUserMenu(e) {
  e.stopPropagation();
  
  // Vérifier si le menu existe déjà
  let contextMenu = document.querySelector('.context-menu');
  
  if (contextMenu) {
    contextMenu.remove();
    return;
  }
  
  // Créer le menu contextuel
  contextMenu = document.createElement('div');
  contextMenu.className = 'context-menu';
  contextMenu.style.position = 'absolute';
  
  // Positionner le menu
  const rect = this.getBoundingClientRect();
  contextMenu.style.top = `${rect.bottom + 5}px`;
  contextMenu.style.right = `${window.innerWidth - rect.right}px`;
  
  // Ajouter les éléments du menu
  contextMenu.innerHTML = `
    <div class="context-menu-item" id="switchUser">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
      </svg>
      Changer d'utilisateur
    </div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item" id="profile">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
      Profil
    </div>
    <div class="context-menu-item" id="settings">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
      Paramètres
    </div>
    <div class="context-menu-divider"></div>
    <div class="context-menu-item" id="logout">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
        <polyline points="16 17 21 12 16 7"></polyline>
        <line x1="21" y1="12" x2="9" y2="12"></line>
      </svg>
      Déconnexion
    </div>
  `;
  
  document.body.appendChild(contextMenu);
  
  // Gérer les clics sur les éléments du menu
  document.getElementById('switchUser').addEventListener('click', function() {
    const currentUser = localStorage.getItem('activeUserId') || 'fastfood2025';
    const newUser = currentUser === 'fastfood2025' ? 'salonelchic' : 'fastfood2025';
    
    localStorage.setItem('activeUserId', newUser);
    activeUserId = newUser;
    conversationId = localStorage.getItem(`conversationId_${activeUserId}`) || null;
    
    updateUserInfo();
    loadConversation();
    
    // Fermer le menu
    contextMenu.remove();
  });
  
  document.getElementById('profile').addEventListener('click', function() {
    window.location.href = 'settings.html#profile';
  });
  
  document.getElementById('settings').addEventListener('click', function() {
    window.location.href = 'settings.html';
  });
  
  document.getElementById('logout').addEventListener('click', function() {
    localStorage.removeItem('jwt');
    window.location.href = 'login.html';
  });
  
  // Fermer le menu en cliquant ailleurs
  document.addEventListener('click', function closeMenu() {
    contextMenu.remove();
    document.removeEventListener('click', closeMenu);
  });
}

// Charger la conversation
async function loadConversation() {
  if (!messagesContainer) return;
  
  setLoading(true);
  
  try {
    // Si nous n'avons pas d'ID de conversation, en créer une nouvelle
    if (!conversationId) {
      const response = await fetch(`${API_URL}/chat/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt') || DEMO_API_KEY}`
        },
        body: JSON.stringify({ userId: activeUserId })
      });
      
      if (!response.ok) {
        throw new Error('Erreur lors de la création de la conversation');
      }
      
      const data = await response.json();
      conversationId = data.conversationId;
      localStorage.setItem(`conversationId_${activeUserId}`, conversationId);
    }
    
    // Charger les messages
    await loadMessages();
    
    // Faire défiler vers le bas
    scrollToBottom();
  } catch (error) {
    console.error('Erreur:', error);
    showErrorMessage("Impossible de charger la conversation. Veuillez réessayer plus tard.");
  } finally {
    setLoading(false);
  }
}

// Charger les messages
async function loadMessages() {
  if (!conversationId || !messagesContainer) return;
  
  try {
    const response = await fetch(`${API_URL}/chat/messages/${conversationId}?page=${page}&limit=10`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('jwt') || DEMO_API_KEY}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Erreur lors du chargement des messages');
    }
    
    const data = await response.json();
    
    // Mettre à jour l'état
    hasMoreMessages = data.hasMore;
    
    // Afficher ou masquer le bouton "Charger plus"
    if (loadMoreBtn) {
      loadMoreBtn.style.display = hasMoreMessages ? 'block' : 'none';
    }
    
    // Si c'est la première page, effacer le conteneur
    if (page === 1) {
      messagesContainer.innerHTML = '';
    }
    
    // Ajouter les messages au début du conteneur
    const fragment = document.createDocumentFragment();
    data.messages.reverse().forEach(message => {
      const messageElement = createMessageElement(message);
      fragment.appendChild(messageElement);
    });
    
    // Insérer au début
    if (messagesContainer.firstChild) {
      messagesContainer.insertBefore(fragment, messagesContainer.firstChild);
    } else {
      messagesContainer.appendChild(fragment);
    }
    
    // Ajouter un message de bienvenue si c'est une nouvelle conversation
    if (data.messages.length === 0 && page === 1) {
      addWelcomeMessage();
    }
  } catch (error) {
    console.error('Erreur:', error);
    showErrorMessage("Impossible de charger les messages. Veuillez réessayer plus tard.");
  }
}

// Charger plus de messages
function loadMoreMessages() {
  if (isLoading || !hasMoreMessages) return;
  
  page++;
  loadMessages();
}

// Gérer la soumission du formulaire de chat
async function handleChatSubmit(e) {
  e.preventDefault();
  
  const message = messageInput.value.trim();
  if (!message || isLoading) return;
  
  // Effacer l'input
  messageInput.value = '';
  
  // Ajouter le message de l'utilisateur
  const userMessageElement = createMessageElement({
    sender: 'user',
    content: message,
    timestamp: new Date().toISOString()
  });
  messagesContainer.appendChild(userMessageElement);
  
  // Faire défiler vers le bas
  scrollToBottom();
  
  // Afficher l'indicateur de chargement
  setLoading(true);
  
  try {
    // Envoyer le message au serveur
    const response = await fetch(`${API_URL}/chat/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('jwt') || DEMO_API_KEY}`
      },
      body: JSON.stringify({
        conversationId,
        message,
        userId: activeUserId
      })
    });
    
    if (!response.ok) {
      throw new Error('Erreur lors de l\'envoi du message');
    }
    
    const data = await response.json();
    
    // Ajouter la réponse de Branda
    const brandaMessageElement = createMessageElement({
      sender: 'assistant',
      content: data.reply || "Je suis désolé, je n'ai pas pu traiter votre demande. Veuillez réessayer.",
      timestamp: new Date().toISOString()
    });
    messagesContainer.appendChild(brandaMessageElement);
    
    // Faire défiler vers le bas
    scrollToBottom();
  } catch (error) {
    console.error('Erreur:', error);
    showErrorMessage("Impossible d'envoyer le message. Veuillez réessayer plus tard.");
  } finally {
    setLoading(false);
  }
}

// Créer un élément de message
function createMessageElement(message) {
  const messageElement = document.createElement('div');
  messageElement.className = `message ${message.sender === 'user' ? 'user-message' : 'assistant-message'}`;
  
  const contentElement = document.createElement('div');
  contentElement.className = 'message-content';
  contentElement.innerHTML = formatMessageContent(message.content);
  
  const timeElement = document.createElement('div');
  timeElement.className = 'message-time';
  timeElement.textContent = formatTimestamp(message.timestamp);
  
  messageElement.appendChild(contentElement);
  messageElement.appendChild(timeElement);
  
  return messageElement;
}

// Formater le contenu du message (convertir les liens, etc.)
function formatMessageContent(content) {
  // Convertir les URLs en liens cliquables
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return content.replace(urlRegex, url => `<a href="${url}" target="_blank">${url}</a>`);
}

// Formater l'horodatage
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Ajouter un message de bienvenue
function addWelcomeMessage() {
  const welcomeMessage = {
    sender: 'assistant',
    content: `Bonjour ! Je suis Branda, votre assistante IA pour la gestion d'entreprise. Comment puis-je vous aider aujourd'hui ?`,
    timestamp: new Date().toISOString()
  };
  
  const welcomeElement = createMessageElement(welcomeMessage);
  messagesContainer.appendChild(welcomeElement);
}

// Afficher un message d'erreur
function showErrorMessage(message) {
  const errorElement = document.createElement('div');
  errorElement.className = 'error-message';
  errorElement.textContent = message;
  
  messagesContainer.appendChild(errorElement);
  
  // Supprimer après 5 secondes
  setTimeout(() => {
    errorElement.remove();
  }, 5000);
}

// Définir l'état de chargement
function setLoading(loading) {
  isLoading = loading;
  
  if (loadingIndicator) {
    loadingIndicator.style.display = loading ? 'flex' : 'none';
  }
  
  if (chatForm) {
    const submitButton = chatForm.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.disabled = loading;
    }
  }
}

// Faire défiler vers le bas
function scrollToBottom() {
  if (messagesContainer) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
}

// Fonctions pour les autres pages

// Initialiser les graphiques sur la page d'accueil
function initDashboardCharts() {
  const salesChartCtx = document.getElementById('salesChart');
  const productsChartCtx = document.getElementById('productsChart');
  
  if (salesChartCtx) {
    new Chart(salesChartCtx, {
      type: 'line',
      data: {
        labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'],
        datasets: [{
          label: 'Ventes 2025',
          data: [12000, 19000, 15000, 25000, 22000, 30000, 28000, 25000, 30000, 29000, 32000, 35000],
          borderColor: '#176BFF',
          backgroundColor: 'rgba(23, 107, 255, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }
  
  if (productsChartCtx) {
    new Chart(productsChartCtx, {
      type: 'doughnut',
      data: {
        labels: ['Menu Burger', 'Menu Végétarien', 'Menu Enfant', 'Boissons', 'Desserts'],
        datasets: [{
          data: [35, 20, 15, 20, 10],
          backgroundColor: [
            '#176BFF',
            '#4CAF50',
            '#FFC107',
            '#9C27B0',
            '#F44336'
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }
}

// Initialiser les tableaux de données
function initDataTables() {
  const tables = document.querySelectorAll('.data-table');
  
  tables.forEach(table => {
    const searchInput = table.parentElement.querySelector('.table-search');
    const rows = table.querySelectorAll('tbody tr');
    
    if (searchInput) {
      searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        
        rows.forEach(row => {
          const text = row.textContent.toLowerCase();
          row.style.display = text.includes(searchTerm) ? '' : 'none';
        });
      });
    }
    
    // Tri des colonnes
    const headers = table.querySelectorAll('th[data-sort]');
    
    headers.forEach(header => {
      header.addEventListener('click', function() {
        const column = this.dataset.sort;
        const direction = this.classList.contains('sort-asc') ? 'desc' : 'asc';
        
        // Réinitialiser tous les en-têtes
        headers.forEach(h => {
          h.classList.remove('sort-asc', 'sort-desc');
        });
        
        // Définir la direction de tri
        this.classList.add(`sort-${direction}`);
        
        // Trier les lignes
        const sortedRows = Array.from(rows).sort((a, b) => {
          const aValue = a.querySelector(`td[data-column="${column}"]`).textContent;
          const bValue = b.querySelector(`td[data-column="${column}"]`).textContent;
          
          if (direction === 'asc') {
            return aValue.localeCompare(bValue);
          } else {
            return bValue.localeCompare(aValue);
          }
        });
        
        // Réorganiser les lignes
        const tbody = table.querySelector('tbody');
        sortedRows.forEach(row => {
          tbody.appendChild(row);
        });
      });
    });
  });
}

// Initialiser le calendrier RH
function initHRCalendar() {
  const calendarEl = document.getElementById('hr-calendar');
  
  if (calendarEl) {
    const calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'dayGridMonth',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
      },
      locale: 'fr',
      events: [
        {
          title: 'Réunion d\'équipe',
          start: '2025-04-15T10:00:00',
          end: '2025-04-15T11:30:00',
          color: '#176BFF'
        },
        {
          title: 'Formation service client',
          start: '2025-04-18',
          end: '2025-04-20',
          color: '#4CAF50'
        },
        {
          title: 'Entretien annuel - Marie',
          start: '2025-04-22T14:00:00',
          color: '#FFC107'
        },
        {
          title: 'Congés - Thomas',
          start: '2025-04-25',
          end: '2025-05-05',
          color: '#F44336'
        }
      ],
      eventClick: function(info) {
        alert(`Événement: ${info.event.title}\nDébut: ${info.event.start.toLocaleString()}\nFin: ${info.event.end ? info.event.end.toLocaleString() : 'Non spécifié'}`);
      }
    });
    
    calendar.render();
  }
}

// Initialiser les formulaires
function initForms() {
  const forms = document.querySelectorAll('form');
  
  forms.forEach(form => {
    form.addEventListener('submit', function(e) {
      e.preventDefault();
      
      // Simuler l'envoi du formulaire
      const submitButton = form.querySelector('button[type="submit"]');
      if (submitButton) {
        const originalText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Traitement en cours...';
        
        setTimeout(() => {
          submitButton.disabled = false;
          submitButton.textContent = originalText;
          
          // Afficher un message de succès
          const successMessage = document.createElement('div');
          successMessage.className = 'alert alert-success';
          successMessage.textContent = 'Opération réussie !';
          
          form.prepend(successMessage);
          
          // Supprimer le message après 3 secondes
          setTimeout(() => {
            successMessage.remove();
          }, 3000);
          
          // Réinitialiser le formulaire
          form.reset();
        }, 1500);
      }
    });
  });
}

// Appeler les fonctions d'initialisation si nécessaire
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('salesChart') || document.getElementById('productsChart')) {
    initDashboardCharts();
  }
  
  if (document.querySelector('.data-table')) {
    initDataTables();
  }
  
  if (document.getElementById('hr-calendar')) {
    initHRCalendar();
  }
  
  if (document.querySelector('form')) {
    initForms();
  }
});
