// מעיין: שמירת האפליקציה לעבודה בלי רשת. קודם רשת (כדי לקבל עדכונים), ואם אין — מהמטמון.
const C = "maayan-v3";
self.addEventListener("install", e => { self.skipWaiting(); e.waitUntil(caches.open(C).then(c => c.addAll(["./", "manifest.json", "icons/icon-192.png", "fonts/rubik-hebrew.woff2", "fonts/rubik-latin.woff2", "fonts/rubik-latin-ext.woff2"])).catch(() => {})); });
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== C).map(x => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin || u.pathname.includes("/download/")) return;
  e.respondWith(fetch(e.request).then(r => { if (r.ok) { const copy = r.clone(); caches.open(C).then(c => c.put(e.request, copy)); } return r; }).catch(() => caches.match(e.request).then(r => r || caches.match("./"))));
});
