// ══════════════════════════════════════════════════
// sw.js — OkulNet Service Worker
// Strateji: Cache-first (statik), Network-first (dinamik)
// ══════════════════════════════════════════════════

const CACHE_NAME    = 'okulnet-v3';
const CACHE_STATIC  = 'okulnet-static-v3';

// Kurulumda önbelleğe al
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/base.css',
  '/css/layout.css',
  '/css/components.css',
  '/css/features.css',
  '/js/core/state.js',
  '/js/core/utils.js',
  '/js/core/auth.js',
  '/js/features/chat.js',
  '/js/features/dm.js',
  '/js/features/stories.js',
  '/js/features/bot.js',
  '/js/features/friends.js',
  '/js/features/channels.js',
  '/js/features/profile.js',
  '/js/admin/jarvis.js',
  '/js/admin/panel.js',
  '/js/admin/stats.js',
  '/js/admin/monitor.js',
  'https://fonts.googleapis.com/css2?family=Geist+Mono:wght@300;400;500;600&family=Instrument+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap',
];

// ─── INSTALL ───────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => Promise.all(
        PRECACHE_URLS.map(url =>
          fetch(url, { cache: 'reload' }).then(r => cache.put(url, r))
        )
      ))
      .then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE ──────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_STATIC && k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── FETCH ─────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Sadece GET isteklerini yakala
  if (request.method !== 'GET') return;

  // Google Fonts — cache-first
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Uygulama dosyaları — stale-while-revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }
});

// ─── STRATEJİLER ───────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Çevrimdışısınız', { status: 503 });
  }
}

async function staleWhileRevalidate(request) {
  const cache  = await caches.open(CACHE_STATIC);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);

  // Önbellekte varsa hemen dön (arka planda yenile)
  if (cached) return cached;

  // Önbellekte yoksa ağı bekle
  const fresh = await fetchPromise;
  return fresh || new Response('Çevrimdışısınız', { status: 503 });
}

// ─── PUSH BİLDİRİMLERİ (opsiyonel) ────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'OkulNet', {
      body:    data.body    || '',
      icon:    '/images/logo.png',
      badge:   '/images/logo.png',
      vibrate: [200, 100, 200],
      data:    { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      const target = event.notification.data?.url || '/';
      for (const client of list) {
        if (client.url === target && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});