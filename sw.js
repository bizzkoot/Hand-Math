/**
 * Service Worker for Hand Math PWA
 * 
 * Strategy:
 * - HTML: Network-first (always get latest, fallback to cache)
 * - Static assets (JS/CSS/vendor): Cache-first (fast load, updated via version hash)
 * - 3D models/images: Cache-first (large binaries, rarely change)
 * - Update notification: when new SW detected, notify all clients to refresh
 */

const CACHE_NAME = 'hand-math-v1.0.14';
const STATIC_CACHE = CACHE_NAME + '-static';
const MODEL_CACHE = CACHE_NAME + '-models';

const STATIC_ASSETS = [
    './',
    'index.html',
    'styles/main.css',
    'styles/teaching.css',
    'js/handAdapter.js',
    'js/handBoneMap.js',
    'js/handController.js',
    'js/handDebug.js',
    'js/handMathCalculator.js',
    'js/i18n.js',
    'js/main.js',
    'js/realisticHandGeometry.js',
    'js/skinToneService.js',
    'js/stepEngine.js',
    'js/arithmeticBuilder.js',
    'js/teachingOrchestrator.js',
    'js/uiBindings.js',
    'js/testApi.js',
    'vendor/threejs/three.min.js',
    'vendor/threejs/OrbitControls.js',
    'vendor/threejs/GLTFLoader.js',
    'manifest.json',
    'assets/icons/icon.svg'
];

// Install: precache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing...');
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            console.log('[SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS).catch((err) => {
                console.warn('[SW] Some assets failed to cache:', err);
            });
        })
    );
    // Activate immediately - don't wait for old SW to release pages
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name.startsWith('hand-math-') && name !== STATIC_CACHE && name !== MODEL_CACHE)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        }).then(() => {
            // Take control of all clients immediately
            return self.clients.claim();
        })
    );
});

// Helper: dev mode (localhost) — bypass cache for fresh assets
function isDevMode() {
    return self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';
}

// Helper: is HTML request?
function isHtmlRequest(request) {
    return request.destination === 'document' || 
           request.mode === 'navigate' ||
           (request.headers.get('accept') || '').includes('text/html');
}

// Helper: is static asset?
function isStaticAsset(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    return path.match(/\.(js|css|svg|ico)$/) ||
           path.includes('/vendor/') ||
           path.endsWith('/manifest.json');
}

// Helper: is model/binary asset?
function isModelAsset(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    return path.match(/\.(glb|gltf|bin|png|jpg|jpeg|gif|webp|zip|woff2?)$/) ||
           path.includes('/assets/models/') ||
           path.includes('/assets/textures/');
}

// Fetch: route by type
self.addEventListener('fetch', (event) => {
    const request = event.request;
    
    // Only handle GET requests
    if (request.method !== 'GET') return;
    
    // Skip chrome-extension and other non-http requests
    const url = new URL(request.url);
    if (!url.protocol.startsWith('http')) return;

    if (isHtmlRequest(request)) {
        // Network-first for HTML: always try to get latest
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Update cache with fresh copy
                    const clone = response.clone();
                    caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
                    return response;
                })
                .catch(() => {
                    // Offline fallback: serve cached HTML
                    return caches.match(request);
                })
        );
    } else if (isStaticAsset(request)) {
        // Network-first on localhost (fresh dev changes), cache-first in production
        if (isDevMode()) {
            event.respondWith(
                fetch(request).then((response) => {
                    const clone = response.clone();
                    caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
                    return response;
                }).catch(() => caches.match(request))
            );
        } else {
            event.respondWith(
                caches.match(request).then((cached) => {
                    return cached || fetch(request).then((response) => {
                        const clone = response.clone();
                        caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
                        return response;
                    });
                })
            );
        }
    } else if (isModelAsset(request)) {
        // Cache-first for models/images (large files)
        event.respondWith(
            caches.match(request).then((cached) => {
                return cached || fetch(request).then((response) => {
                    const clone = response.clone();
                    caches.open(MODEL_CACHE).then((cache) => cache.put(request, clone));
                    return response;
                });
            })
        );
    }
    // Other requests (Google Fonts, etc.) pass through to network
});

// Listen for update check requests from clients
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
