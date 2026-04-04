const CACHE_NAME = "sour-house-v1";
const PRECACHE_URLS = ["/", "/manifest.json"];

self.addEventListener("install", (event) => {
	event.waitUntil(
		caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
	);
	self.skipWaiting();
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		caches.keys().then((keys) =>
			Promise.all(
				keys
					.filter((key) => key !== CACHE_NAME)
					.map((key) => caches.delete(key)),
			),
		),
	);
	self.clients.claim();
});

self.addEventListener("fetch", (event) => {
	if (event.request.method !== "GET") return;

	// Network-first for API and navigation, cache-first for static assets
	if (
		event.request.url.includes("/api/") ||
		event.request.mode === "navigate"
	) {
		event.respondWith(
			fetch(event.request).catch(() => caches.match(event.request)),
		);
	} else {
		event.respondWith(
			caches.match(event.request).then((cached) => cached || fetch(event.request)),
		);
	}
});
