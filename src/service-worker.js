/// <reference types="@sveltejs/kit" />
/// <reference lib="webworker" />

import { build, files, version } from "$service-worker";

const assets = build.concat(files);

// install service worker
self.addEventListener("install", (event) => {
  async function addFilesToCache() {
    const cache = await caches.open(version);
    await cache.addAll(assets);
  }

  event.waitUntil(addFilesToCache());
});

// activate service worker
self.addEventListener("activate", (event) => {
  async function deleteOldCaches() {
    for (const key of await caches.keys()) {
      if (key !== version) await caches.delete(key);
    }
  }

  event.waitUntil(deleteOldCaches());
});

// listen for fetch events
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  async function respond() {
    const url = new URL(event.request.url);
    const cache = await caches.open(version);

    // server build files from cache
    if (assets.includes(url.pathname)) {
      const cached = await cache.match(event.request);
      if (cached) return cached;
    }

    try {
      const isExtension = url.protocol !== "http:" && url.protocol !== "https:";
      if (isExtension) return;

      const response = await fetch(event.request);
      const isSuccess = response.status >= 200 && response.status < 300;

      if (isSuccess) cache.put(event.request, response.clone());

      return response;
    } catch (err) {
      const cached = await cache.match(url.pathname);
      if (cached) return cached;
    }

    return new Response("Not found", { status: 404 });
  }

  event.respondWith(respond());
});

self.addEventListener("message", (event) => {
  if (event.data.type === "SKIP_WAITING") self.skipWaiting();
});
