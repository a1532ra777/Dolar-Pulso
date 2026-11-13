const CACHE_NAME = 'dolarpulso-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Las peticiones a APIs de tasas siempre van a red primero para tener el precio actualizado
  if (event.request.url.includes('dolarapi') || event.request.url.includes('exchangerate')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // El resto de la interfaz carga desde caché o red
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
