const CACHE_NAME = "choprek-offline-v1"
const OFFLINE_URL = "/offline"

// Assets to cache for offline functionality
const STATIC_CACHE_URLS = [
  OFFLINE_URL,
  "/",
  "/manifest.json",
  // Add other critical assets
  "/_next/static/css/",
  "/_next/static/js/",
]

// Install event - cache offline page and critical assets
self.addEventListener("install", (event) => {
  console.log("Service Worker installing...")

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Caching offline page and assets")
        return cache.addAll([OFFLINE_URL])
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker
        return self.skipWaiting()
      }),
  )
})

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...")

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("Deleting old cache:", cacheName)
              return caches.delete(cacheName)
            }
          }),
        )
      })
      .then(() => {
        // Ensure the new service worker takes control immediately
        return self.clients.claim()
      }),
  )
})

// Fetch event - serve cached content when offline
self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) return

  // Handle Next.js chunks and static assets
  if (event.request.url.includes("/_next/static/chunks/") || 
      event.request.url.includes("/_next/static/js/") ||
      event.request.url.includes("/_next/static/css/")) {
    
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful responses
          if (response.status === 200) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          // Try to serve from cache if network fails
          return caches.match(event.request)
        })
    )
    return
  }

  // Skip API routes and internal Next.js requests
  if (
    event.request.url.includes("/api/") ||
    event.request.url.includes("/_next/webpack-hmr") ||
    event.request.url.includes("/favicon.ico")
  ) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If we get a valid response, clone and cache it
        if (response.status === 200) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
        }
        return response
      })
      .catch(() => {
        // Network failed, try to serve from cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse
          }

          // If no cached version, serve the offline page for navigation requests
          if (event.request.mode === "navigate") {
            return caches.match(OFFLINE_URL)
          }

          // For other requests, return a basic offline response
          return new Response("Offline", {
            status: 503,
            statusText: "Service Unavailable",
          })
        })
      }),
  )
})

// Listen for messages from the main thread
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting()
  }
})
