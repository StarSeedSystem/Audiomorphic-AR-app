/* AudioMorphic Visualizer · Service Worker (PWA Web HTTPS only)
   - network-first para navegación (HTML): siempre intenta red, cae a caché offline
   - cache-first para estáticos del propio origen (js/css/img/fonts/wasm)
   - NUNCA cachea /api/, Supabase ni esquemas no HTTP(S) */
const CACHE = 'audiomorphic-v1.3.0';
const CORE = ['./', './index.html', './manifest.webmanifest', './favicon.ico'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

function isStatic(url) {
  return /\.(?:css|js|mjs|png|jpg|jpeg|webp|svg|gif|ico|woff2?|ttf|otf|wasm|glb|gltf|hdr)$/i.test(url.pathname);
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match(req).then((m) => m || caches.match('./index.html')))
    );
    return;
  }

  if (isStatic(url)) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached))
    );
  }
});
