const CACHE_NAME = "moonbox-v1";

const APP_SHELL = [
  "./",
  "./index.html",

  // CSS
  "./css/navigation.css",
  "./css/tag.css",
  "./css/library.css",
  "./css/player.css",
  "./css/folders.css",
  "./css/login.css",

  // JavaScript
  "./js/navigation.js",
  "./js/tag.js",
  "./js/library.js",
  "./js/player.js",
  "./js/folders.js",
  "./js/login.js",
  "./js/cloud.js",

  // Icons
  "./assets/MoonBox_192.png",
  "./assets/MoonBox_512.png",
  "./assets/favicon-32.png"
];

/* ==========================================================
   INSTALL
========================================================== */

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );

  self.skipWaiting();
});

/* ==========================================================
   ACTIVATE
========================================================== */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );

  self.clients.claim();
});

/* ==========================================================
   FETCH
========================================================== */

self.addEventListener("fetch", (event) => {
  const request = event.request;

  /*
     Only handle GET requests.
  */

  if (request.method !== "GET") {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((response) => {
          /*
             Don't cache bad responses.
          */

          if (
            !response ||
            response.status !== 200 ||
            response.type === "opaque"
          ) {
            return response;
          }

          const responseClone = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });

          return response;
        })
        .catch(() => {
          return caches.match("./index.html");
        });
    })
  );
});