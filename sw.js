// Red Cross Gym service worker. The app page opens instantly from the saved copy and refreshes itself quietly in the background, so a slow or weak connection never leaves a blank screen. A new version is picked up the next time the app is opened.
const V = "rcg-v3";
self.addEventListener("install", e => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())));
const keep = (r, res) => { if (res && res.status === 200 && res.type !== "opaque") { const c = res.clone(); caches.open(V).then(ch => ch.put(r, c)).catch(() => {}); } return res; };
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || r.headers.has("range")) return; // video seeking and partial requests go straight to the network
  if (u.hostname === "script.google.com" || u.hostname.endsWith("googleusercontent.com")) return; // never cache live data
  if (u.origin === location.origin) { // the app page and its files: saved copy first, refreshed in the background
    e.respondWith(caches.match(r).then(hit => {
      const net = fetch(r).then(res => keep(r, res));
      if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
      return net.catch(() => caches.match("./"));
    }));
  } else if (u.hostname === "cdnjs.cloudflare.com") { // libraries: cached, so the app starts faster
    e.respondWith(caches.match(r).then(x => x || fetch(r).then(res => keep(r, res))));
  }
});
