// Script d'enregistrement du service worker pour Branda PWA

// Vérifier si le service worker est supporté par le navigateur
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/service-worker.js')
      .then(function(registration) {
        console.log('Service Worker enregistré avec succès:', registration.scope);
        
        // Vérifier les mises à jour du service worker
        registration.addEventListener('updatefound', function() {
          // Un nouveau service worker est en cours d'installation
          const newWorker = registration.installing;
          
          newWorker.addEventListener('statechange', function() {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Une nouvelle version est disponible
              showUpdateNotification();
            }
          });
        });
      })
      .catch(function(error) {
        console.error('Erreur lors de l\'enregistrement du Service Worker:', error);
      });
      
    // Écouter les messages du service worker
    navigator.serviceWorker.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'CACHE_UPDATED') {
        // Le cache a été mis à jour
        console.log('Cache mis à jour:', event.data.url);
      }
    });
  });
  
  // Vérifier si l'application est installée
  window.addEventListener('appinstalled', function(event) {
    // L'application a été installée avec succès
    console.log('Application installée avec succès');
    
    // Masquer le prompt d'installation si affiché
    hideInstallPrompt();
    
    // Envoyer un événement analytique si nécessaire
    if (typeof gtag === 'function') {
      gtag('event', 'app_installed');
    }
  });
  
  // Détecter si l'application peut être installée
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', function(event) {
    // Empêcher Chrome 67+ d'afficher automatiquement le prompt
    event.preventDefault();
    
    // Stocker l'événement pour l'utiliser plus tard
    deferredPrompt = event;
    
    // Mettre à jour l'interface pour indiquer que l'application peut être installée
    showInstallButton();
  });
}

// Vérifier si l'application est en ligne
function isOnline() {
  return navigator.onLine;
}

// Afficher une notification de mise à jour
function showUpdateNotification() {
  const toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) return;
  
  const toast = document.createElement('div');
  toast.className = 'toast info';
  toast.innerHTML = `
    <div class="toast-icon info">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
    </div>
    <div class="toast-content">
      <div class="toast-title">Mise à jour disponible</div>
      <div class="toast-message">Une nouvelle version de l'application est disponible.</div>
    </div>
    <button class="toast-action" id="updateNowBtn">Mettre à jour</button>
    <button class="toast-close">&times;</button>
  `;
  
  toastContainer.appendChild(toast);
  
  // Gérer le clic sur le bouton de fermeture
  toast.querySelector('.toast-close').addEventListener('click', function() {
    toast.remove();
  });
  
  // Gérer le clic sur le bouton de mise à jour
  toast.querySelector('#updateNowBtn').addEventListener('click', function() {
    // Rafraîchir le service worker
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ action: 'skipWaiting' });
      window.location.reload();
    }
  });
  
  // Supprimer automatiquement après 10 secondes
  setTimeout(() => {
    if (toast.parentNode) {
      toast.remove();
    }
  }, 10000);
}

// Afficher le bouton d'installation
function showInstallButton() {
  // Créer le prompt d'installation s'il n'existe pas déjà
  if (!document.getElementById('installPrompt')) {
    const installPrompt = document.createElement('div');
    installPrompt.id = 'installPrompt';
    installPrompt.className = 'install-prompt';
    installPrompt.innerHTML = `
      <img src="icons/icon-192x192.png" alt="Branda" class="install-prompt-icon">
      <div class="install-prompt-content">
        <div class="install-prompt-title">Installer Branda</div>
        <div>Ajoutez Branda à votre écran d'accueil pour un accès rapide.</div>
        <div class="install-prompt-actions">
          <button id="installBtn" class="btn btn-primary">Installer</button>
          <button id="dismissInstallBtn" class="btn btn-outline">Plus tard</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(installPrompt);
    
    // Gérer le clic sur le bouton d'installation
    document.getElementById('installBtn').addEventListener('click', function() {
      if (deferredPrompt) {
        // Afficher le prompt d'installation
        deferredPrompt.prompt();
        
        // Attendre que l'utilisateur réponde au prompt
        deferredPrompt.userChoice.then(function(choiceResult) {
          if (choiceResult.outcome === 'accepted') {
            console.log('Utilisateur a accepté l\'installation');
          } else {
            console.log('Utilisateur a refusé l\'installation');
          }
          
          // Réinitialiser le prompt différé
          deferredPrompt = null;
        });
        
        // Masquer le prompt personnalisé
        hideInstallPrompt();
      }
    });
    
    // Gérer le clic sur le bouton "Plus tard"
    document.getElementById('dismissInstallBtn').addEventListener('click', function() {
      hideInstallPrompt();
      
      // Stocker la préférence de l'utilisateur pour ne pas afficher le prompt pendant un certain temps
      localStorage.setItem('installPromptDismissed', Date.now().toString());
    });
  }
}

// Masquer le prompt d'installation
function hideInstallPrompt() {
  const installPrompt = document.getElementById('installPrompt');
  if (installPrompt) {
    installPrompt.remove();
  }
}

// Vérifier l'état de la connexion et mettre à jour l'interface
function updateOnlineStatus() {
  const offlineIndicator = document.getElementById('offlineIndicator');
  
  if (!isOnline()) {
    // Créer l'indicateur hors ligne s'il n'existe pas
    if (!offlineIndicator) {
      const indicator = document.createElement('div');
      indicator.id = 'offlineIndicator';
      indicator.className = 'offline-indicator active';
      indicator.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="1" y1="1" x2="23" y2="23"></line>
          <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"></path>
          <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"></path>
          <path d="M10.71 5.05A16 16 0 0 1 22.58 9"></path>
          <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"></path>
          <path d="M8.53 16.11a6 6 0 0 1 6.95 0"></path>
          <line x1="12" y1="20" x2="12.01" y2="20"></line>
        </svg>
        Vous êtes hors ligne
      `;
      document.body.appendChild(indicator);
    }
  } else if (offlineIndicator) {
    // Supprimer l'indicateur si l'utilisateur est en ligne
    offlineIndicator.remove();
  }
}

// Écouter les changements d'état de la connexion
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Vérifier l'état initial de la connexion
document.addEventListener('DOMContentLoaded', updateOnlineStatus);

// Synchroniser les données en arrière-plan lorsque la connexion est rétablie
window.addEventListener('online', function() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    navigator.serviceWorker.ready.then(function(registration) {
      registration.sync.register('sync-data');
    });
  }
});
