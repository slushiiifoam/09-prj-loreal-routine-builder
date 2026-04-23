/*
  Minimal service worker for installability.
  No caching or offline behavior is added.
*/
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  /* Intentionally empty: network behavior stays unchanged. */
});
