const CACHE_NAME = "deals-ai-shell-v1";
const SHELL = ["/manifest.webmanifest", "/favicon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).catch(() => new Response(
      "<!doctype html><meta name=viewport content=width=device-width><title>Deals.ai Offline</title><style>body{font:16px system-ui;background:#061126;color:#eaf3ff;display:grid;min-height:100vh;place-items:center;margin:0}main{max-width:420px;padding:32px;border:1px solid #ffffff24;border-radius:24px;background:#ffffff0d;text-align:center}button{padding:12px 18px;border:0;border-radius:99px;background:#4ca8ff;color:#061126;font-weight:800}</style><main><h1>You are offline</h1><p>Reconnect to refresh the latest deals and retailer prices.</p><button onclick=location.reload()>Try again</button></main>",
      { headers: { "Content-Type": "text/html; charset=utf-8" } },
    )));
    return;
  }
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
      return response;
    })));
  }
});
