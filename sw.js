const CACHE_NAME = 'codewix-v1';

const ASSETS_TO_CACHE = [
  '/',
  '/manifest.json',
  
  // HTML Pages
  '/index.html',
  '/404.html',
  '/about.html',
  '/admin.html',
  '/ai-assistance.html',
  '/ban.html',
  '/components.html',
  '/contact.html',
  '/dashboard.html',
  '/explore.html',
  '/forgot-password.html',
  '/learn.html',
  '/login.html',
  '/play.html',
  '/privacy.html',
  '/profile.html',
  '/projects.html',
  '/publish.html',
  '/register.html',
  '/site-settings.html',
  '/status.html',
  '/tos.html',
  '/upgrade.html',
  '/verify.html',
  '/view.html',

  // CSS & JavaScript
  '/style.css',
  '/codewix-ui.css',
  '/script.js',
  '/main.js',
  '/components.js',

  // Icons & Images
  '/favicon.ico',
  '/favicon-96x96.png',
  '/favicon.svg',
  '/apple-touch-icon.png',
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png'
];

// Install Event: Cache all files
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching all CodeWix assets');
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch(err => console.log('[Service Worker] Cache failed:', err))
  );
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Network First, Fallback to Cache
self.addEventListener('fetch', (event) => {
  // Don't cache non-GET requests (like Firebase POSTs)
  if (event.request.method !== 'GET') return;
  
  // Don't cache Firebase API calls
  if (event.request.url.includes('firestore.googleapis.com') || 
      event.request.url.includes('identitytoolkit') || 
      event.request.url.includes('groq')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If network works, clone and cache the new version
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // If offline, serve from cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          // Fallback to 404 if not in cache and offline
          return caches.match('/404.html'); 
        });
      })
  );
});
