// Service Worker for offline-first PWA functionality
const CACHE_NAME = 'msmesquare-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Define resources to cache
const STATIC_RESOURCES = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/offline.html',
];

const DYNAMIC_RESOURCES = [
  '/api/msme-listings',
  '/api/profile',
  '/api/buyer-interests',
];

// Install event - cache static resources
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('Service Worker installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static resources');
        return cache.addAll(STATIC_RESOURCES);
      })
      .then(() => {
        return (self as any).skipWaiting();
      }),
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('Service Worker activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          }),
        );
      })
      .then(() => {
        return (self as any).clients.claim();
      }),
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle different types of requests
  if (request.method === 'GET') {
    if (isStaticResource(url.pathname)) {
      event.respondWith(handleStaticResource(request));
    } else if (isAPIRequest(url.pathname)) {
      event.respondWith(handleAPIRequest(request));
    } else {
      event.respondWith(handleDynamicResource(request));
    }
  } else {
    // Handle POST/PUT/DELETE requests
    event.respondWith(handleMutationRequest(request));
  }
});

// Background sync for offline actions
self.addEventListener('sync', (event: any) => {
  console.log('Background sync triggered:', event.tag);

  if (event.tag === 'sync-offline-actions') {
    event.waitUntil(syncOfflineActions());
  }
});

// Push notifications
self.addEventListener('push', (event: any) => {
  console.log('Push notification received');

  const options = {
    body: event.data ? event.data.text() : 'New update available',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      url: '/',
    },
  };

  event.waitUntil(
    (self as any).registration.showNotification('MSMESquare', options),
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event: any) => {
  console.log('Notification clicked');

  event.notification.close();

  event.waitUntil(
    (self as any).clients.openWindow(event.notification.data.url || '/'),
  );
});

// Caching strategies
async function handleStaticResource(request: Request): Promise<Response> {
  // Cache First strategy for static resources
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('Static resource fetch failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

async function handleAPIRequest(request: Request): Promise<Response> {
  // Network First strategy for API requests
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache for:', request.url);

    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline response for API requests
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'This data is not available offline',
        cached: false,
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }
}

async function handleDynamicResource(request: Request): Promise<Response> {
  // Stale While Revalidate strategy
  const cachedResponse = await caches.match(request);

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        const cache = caches.open(DYNAMIC_CACHE);
        cache.then((c) => c.put(request, networkResponse.clone()));
      }
      return networkResponse;
    })
    .catch(() => {
      // Return offline page for navigation requests
      if (request.mode === 'navigate') {
        return caches.match('/offline.html');
      }
      throw new Error('Network failed');
    });

  return cachedResponse || fetchPromise;
}

async function handleMutationRequest(request: Request): Promise<Response> {
  try {
    return await fetch(request);
  } catch (error) {
    console.log('Mutation request failed, storing for later sync');

    // Store mutation for background sync
    await storeOfflineAction(request);

    // Register background sync
    await (self as any).registration.sync.register('sync-offline-actions');

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Action stored for sync when online',
        queued: true,
      }),
      {
        status: 202,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }
}

async function storeOfflineAction(request: Request): Promise<void> {
  const action = {
    id: Date.now().toString(),
    url: request.url,
    method: request.method,
    headers: Array.from(request.headers.entries()),
    body: await request.text(),
    timestamp: Date.now(),
  };

  const db = await openDB();
  const transaction = db.transaction(['offline_actions'], 'readwrite');
  const store = transaction.objectStore('offline_actions');
  await store.add(action);
}

async function syncOfflineActions(): Promise<void> {
  const db = await openDB();
  const transaction = db.transaction(['offline_actions'], 'readonly');
  const store = transaction.objectStore('offline_actions');
  const actions = await store.getAll();

  for (const action of actions) {
    try {
      const response = await fetch(action.url, {
        method: action.method,
        headers: action.headers,
        body: action.body,
      });

      if (response.ok) {
        // Remove successfully synced action
        const deleteTransaction = db.transaction(['offline_actions'], 'readwrite');
        const deleteStore = deleteTransaction.objectStore('offline_actions');
        await deleteStore.delete(action.id);
      }
    } catch (error) {
      console.error('Failed to sync action:', action.id, error);
    }
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MSMESquareOffline', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('offline_actions')) {
        db.createObjectStore('offline_actions', { keyPath: 'id' });
      }
    };
  });
}

function isStaticResource(pathname: string): boolean {
  return (
    pathname.startsWith('/static/') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg') ||
    pathname === '/manifest.json'
  );
}

function isAPIRequest(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

// Message handling for communication with main thread
self.addEventListener('message', (event: MessageEvent) => {
  const { type, data } = event.data;

  switch (type) {
  case 'SKIP_WAITING':
    (self as any).skipWaiting();
    break;
  case 'CACHE_URLS':
    cacheUrls(data.urls);
    break;
  case 'CLEAR_CACHE':
    clearCache();
    break;
  default:
    console.log('Unknown message type:', type);
  }
});

async function cacheUrls(urls: string[]): Promise<void> {
  const cache = await caches.open(DYNAMIC_CACHE);
  await cache.addAll(urls);
}

async function clearCache(): Promise<void> {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map(name => caches.delete(name)));
}

export {};
