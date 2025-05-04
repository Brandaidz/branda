// Service Worker pour Branda PWA
const CACHE_NAME = 'branda-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/products.html',
  '/sales.html',
  '/employees.html',
  '/accounting.html',
  '/hr.html',
  '/reports.html',
  '/settings.html',
  '/new-styles.css',
  '/chat-component.css',
  '/chat-improvements.css',
  '/ui-improvements.css',
  '/responsive.css',
  '/proactive-assistant.js',
  '/chat-component.js',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png'
];

// Installation du Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache ouvert');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activation du Service Worker
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Interception des requêtes
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - retourne la réponse du cache
        if (response) {
          return response;
        }

        // Cloner la requête
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          response => {
            // Vérifier si la réponse est valide
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Cloner la réponse
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch(() => {
          // Si la requête échoue (par exemple, pas de connexion),
          // on peut retourner une page hors ligne personnalisée
          if (event.request.mode === 'navigate') {
            return caches.match('/offline.html');
          }
        });
      })
  );
});

// Gestion des messages
self.addEventListener('message', event => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

// Synchronisation en arrière-plan
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

// Fonction pour synchroniser les données
async function syncData() {
  const dataToSync = await getDataToSync();
  if (dataToSync.length > 0) {
    try {
      // Envoyer les données au serveur
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSync)
      });
      
      if (response.ok) {
        // Supprimer les données synchronisées
        await clearSyncedData();
      }
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error);
    }
  }
}

// Fonction pour récupérer les données à synchroniser
async function getDataToSync() {
  // Implémentation à compléter selon les besoins spécifiques
  return [];
}

// Fonction pour effacer les données synchronisées
async function clearSyncedData() {
  // Implémentation à compléter selon les besoins spécifiques
}

// Notifications push
self.addEventListener('push', event => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: 'icons/icon-192x192.png',
    badge: 'icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Clic sur notification
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({type: 'window'})
      .then(clientList => {
        const url = event.notification.data.url || '/';
        
        // Si une fenêtre existe déjà, la focaliser et la naviguer
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Sinon, ouvrir une nouvelle fenêtre
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
