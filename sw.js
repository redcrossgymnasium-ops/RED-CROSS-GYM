// Red Cross Gym service worker. The app page loads the newest copy (waits up to 3 seconds), then falls back to the saved copy, so updates show up straight away and a slow connection never leaves a blank screen.
const V = "rcg-v4";
self.addEventListener("install", e => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())));
const keep = (r, res) => { if (res && res.status === 200 && res.type !== "opaque") { const c = res.clone(); caches.open(V).then(ch => ch.put(r, c)).catch(() => {}); } return res; };
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || r.headers.has("range")) return; // video seeking and partial requests go straight to the network
  if (u.hostname === "api.nal.usda.gov") return; // live food search, never cache
  if (u.hostname === "script.google.com" || u.hostname.endsWith("googleusercontent.com")) return; // never cache live data
  if (u.origin === location.origin && (r.mode === "navigate" || /\.html$|\/$/.test(u.pathname))) { // the app page: newest copy first (waits up to 3 seconds), saved copy if the connection is slow or offline
    e.respondWith(new Promise(done => {
      let fin = 0;
      const old = () => caches.match(r).then(h => h || caches.match("./"));
      const t = setTimeout(() => old().then(h => { if (h && !fin) { fin = 1; done(h); } }), 3000);
      fetch(r, { cache: "no-cache" }).then(res => { clearTimeout(t); keep(r, res); if (!fin) { fin = 1; done(res); } }).catch(() => { clearTimeout(t); old().then(h => { if (!fin) { fin = 1; done(h || Response.error()); } }); });
    }));
    return;
  }
  if (u.origin === location.origin) { // other files: saved copy first, refreshed in the background
    e.respondWith(caches.match(r).then(hit => {
      const net = fetch(r).then(res => keep(r, res));
      if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
      return net.catch(() => caches.match("./"));
    }));
  } else if (u.hostname === "cdnjs.cloudflare.com") { // libraries: cached, so the app starts faster
    e.respondWith(caches.match(r).then(x => x || fetch(r).then(res => keep(r, res))));
  }
});
