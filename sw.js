// Turbo Gol Arena: funciona sin conexión. Abre al instante con lo guardado y se actualiza en segundo plano.
// Al publicar cambios hay que subir V: así se instala la versión nueva y la página muestra el aviso "Hay una versión nueva".
const V = 'tga-v79';
const CORE = ['./', 'index.html', 'engine.js', 'cars.js', 'game.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png',
    'fonts/bungee-400.woff2', 'fonts/chakra-petch-500.woff2', 'fonts/chakra-petch-600.woff2', 'fonts/chakra-petch-700.woff2'];
// cache: 'reload' para que la versión nueva no copie archivos viejos de la caché del navegador
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
// las letras ya van con el juego: se borra también la caché antigua de Google Fonts (tga-fonts)
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
    const r = e.request; if (r.method !== 'GET') return;
    const u = new URL(r.url);
    if (u.origin !== self.location.origin) return;
    const key = r.mode === 'navigate' ? 'index.html' : r;
    e.respondWith(caches.open(V).then(c => c.match(key, { ignoreSearch: true }).then(hit => {
        const net = fetch(r).then(res => { if (res.ok) c.put(key, res.clone()); return res; });
        if (hit) { e.waitUntil(net.catch(() => null)); return hit; }
        return net;
    })));
});
