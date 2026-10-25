/* Kitchen League offline shell.
   Network first for the app itself, so a new version shows up on the next load and the cache is only a fallback.
   Cache first for fonts and the QR library. Requests to the Google Sheet are never touched. */
var CACHE = 'kl-v3';
var SHELL = ['./', 'index.html', 'icon.svg', 'icon-180.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var r = e.request, u = new URL(r.url);
  if (r.method !== 'GET') return;
  if (u.origin === location.origin) {
    // no-cache: always ask the host (a cheap 304 when unchanged), so a new version shows up on the next open
    // instead of after GitHub Pages' 10-minute browser cache runs out
    e.respondWith(fetch(r.url, {cache: 'no-cache', credentials: 'same-origin'}).then(function (res) {
      if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(r, copy); }); }
      return res;
    }).catch(function () {
      return caches.match(r, {ignoreSearch: true}).then(function (m) { return m || (r.mode === 'navigate' ? caches.match('index.html') : undefined); });
    }));
  } else if (/^(fonts\.googleapis\.com|fonts\.gstatic\.com|cdnjs\.cloudflare\.com)$/.test(u.hostname)) {
    e.respondWith(caches.match(r).then(function (m) {
      return m || fetch(r).then(function (res) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(r, copy); }); return res; });
    }));
  }
});
