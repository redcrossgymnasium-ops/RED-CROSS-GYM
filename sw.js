// Red Cross Gym service worker: the page always tries the network first (so updates arrive at once) and falls back to the saved copy offline.
const V = "rcg-v1";
self.addEventListener("install", e => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET") return;
  if (u.hostname === "script.google.com" || u.hostname.endsWith("googleusercontent.com")) return; // never cache live data
  if (u.origin === location.origin) { // the app page and its files: network first
    e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(V).then(ch => ch.put(r, c)); return res; }).catch(() => caches.match(r).then(x => x || caches.match("./"))));
  } else if (u.hostname === "cdnjs.cloudflare.com") { // libraries: cached, so the app starts faster
    e.respondWith(caches.match(r).then(x => x || fetch(r).then(res => { const c = res.clone(); caches.open(V).then(ch => ch.put(r, c)); return res; })));
  }
});
