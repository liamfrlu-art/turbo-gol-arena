// Turbo Gol Arena: funciona sin conexión. Abre al instante con lo guardado y se actualiza en segundo plano
// (la versión nueva se ve la siguiente vez que abras la app).
const V = 'tga-v77';
const CORE = ['./', 'index.html', 'engine.js', 'cars.js', 'game.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V && k !== 'tga-fonts').map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
    const r = e.request; if (r.method !== 'GET') return;
    const u = new URL(r.url);
    if (u.hostname === 'fonts.googleapis.com' || u.hostname === 'fonts.gstatic.com') {      // letras del menú: se guardan la primera vez
        e.respondWith(caches.open('tga-fonts').then(c => c.match(r).then(hit => hit || fetch(r).then(res => { if (res.ok || res.type === 'opaque') c.put(r, res.clone()); return res; }))).catch(() => new Response('', { status: 504 })));
        return;
    }
    if (u.origin !== self.location.origin) return;
    const key = r.mode === 'navigate' ? 'index.html' : r;
    e.respondWith(caches.open(V).then(c => c.match(key, { ignoreSearch: true }).then(hit => {
        const net = fetch(r).then(res => { if (res.ok) c.put(key, res.clone()); return res; });
        if (hit) { e.waitUntil(net.catch(() => null)); return hit; }
        return net;
    })));
});
