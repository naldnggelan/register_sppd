// Service worker REGISTER SPPD - supaya aplikasi bisa diinstal di PC & HP.
// Strategi "jaringan dulu": selalu mengambil file terbaru dari server (hasil DEPLOY langsung terpakai),
// salinan cadangan hanya dipakai bila internet putus. Permintaan ke server Google Apps Script TIDAK disentuh.
const CACHE = 'register-sppd-v3';
const SHELL = ['./', 'index.html', 'style.css', 'app.js', 'config.js', 'partikel.js', 'bee.js', 'pwa.js', 'jaringan.js', 'vendor/fonts.css', 'vendor/fonts/material-symbols-outlined.woff2', 'vendor/tailwind.css', 'vendor/chart.umd.min.js', 'icons/v2-icon-192.png'];
self.addEventListener('install', e => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {})); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== self.location.origin) return; // server GAS & situs lain: dibiarkan apa adanya
  if (u.searchParams.has('__ping')) return; // cek koneksi (jaringan.js) harus langsung ke server, tanpa salinan cadangan
  e.respondWith(fetch(r).then(res => { if (res && res.ok) { const salin = res.clone(); caches.open(CACHE).then(c => c.put(r, salin)); } return res; })
    .catch(() => caches.match(r, { ignoreSearch: true }).then(x => x || (r.mode === 'navigate' ? caches.match('index.html') : undefined))));
});
