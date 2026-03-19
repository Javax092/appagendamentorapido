// ALTERACAO: versiona o cache para garantir troca limpa entre deploys.
const SHELL_CACHE = "opaitaon-shell-v2";
const STATIC_CACHE = "opaitaon-static-v2";
const APP_SHELL = ["/", "/manifest.webmanifest", "/paitaon.png", "/paion2.png", "/favicon.svg"];

function isStaticAsset(requestUrl) {
  return (
    requestUrl.pathname.startsWith("/assets/") ||
    requestUrl.pathname.endsWith(".png") ||
    requestUrl.pathname.endsWith(".svg") ||
    requestUrl.pathname.endsWith(".jpeg") ||
    requestUrl.pathname.endsWith(".jpg") ||
    requestUrl.pathname.endsWith(".css") ||
    requestUrl.pathname.endsWith(".js")
  );
}

function isSupabaseRequest(requestUrl) {
  return requestUrl.hostname.includes("supabase.co");
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  const validCaches = [SHELL_CACHE, STATIC_CACHE];

  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => !validCaches.includes(key)).map((key) => caches.delete(key)))
    )
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);

  // ALTERACAO: nao intercepta Supabase nem requests externos sensiveis.
  if (isSupabaseRequest(requestUrl) || requestUrl.origin !== self.location.origin) {
    return;
  }

  // ALTERACAO: navigations usam network-first para refletir deploy novo rapidamente.
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const responseClone = networkResponse.clone();
          caches.open(SHELL_CACHE).then((cache) => cache.put("/", responseClone));
          return networkResponse;
        })
        .catch(async () => {
          const cachedShell = await caches.match("/");
          return cachedShell || Response.error();
        })
    );
    return;
  }

  // ALTERACAO: assets estaticos usam stale-while-revalidate sem contaminar HTML/API.
  if (isStaticAsset(requestUrl)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const networkFetch = fetch(event.request)
          .then((networkResponse) => {
            const responseClone = networkResponse.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, responseClone));
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || networkFetch;
      })
    );
    return;
  }

  // ALTERACAO: manifest e demais recursos leves usam network-first com fallback local.
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        const responseClone = networkResponse.clone();
        caches.open(SHELL_CACHE).then((cache) => cache.put(event.request, responseClone));
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
