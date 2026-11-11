/*
 * Service worker con caché selectiva.
 * - Páginas: red primero; si no hay conexión, la última copia guardada.
 * - Archivos estáticos con huella (/_next/static): caché primero (su nombre cambia si cambia el contenido).
 * - Texturas (/textures, sin huella en el nombre): se sirve la copia guardada y se revalida en
 *   segundo plano con el servidor. Una textura corregida llega en la visita siguiente.
 * - No se guardan teselas del mapa (dependen de OpenStreetMap y de su política
 *   de uso) ni respuestas de otros dominios.
 * Sube VERSION si cambia la lógica de este archivo: al activarse, se borran las cachés anteriores.
 */
const VERSION = "v2";
const PAGES = `paginas-${VERSION}`;
const ASSETS = `recursos-${VERSION}`;
const MAX_PAGES = 40;
const MAX_ASSETS = 160;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PAGES).then((c) => c.addAll(["/"]).catch(() => undefined)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== PAGES && k !== ASSETS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/textures/")) {
    event.respondWith(
      caches.open(ASSETS).then(async (cache) => {
        const hit = await cache.match(req);
        // Revalidación con el servidor (petición condicional: si no cambió, responde 304 sin descargar).
        const network = fetch(req, { cache: "no-cache" }).then((res) => {
          if (res.ok) cache.put(req, res.clone()).then(() => trim(ASSETS, MAX_ASSETS));
          return res;
        });
        if (hit) {
          event.waitUntil(network.catch(() => undefined));
          return hit;
        }
        return network;
      }),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.open(ASSETS).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone()).then(() => trim(ASSETS, MAX_ASSETS));
        return res;
      }),
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(PAGES).then((c) => c.put(req, copy)).then(() => trim(PAGES, MAX_PAGES));
          }
          return res;
        })
        .catch(async () => (await caches.match(req)) || (await caches.match("/")) || Response.error()),
    );
  }
});
