import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const dist = new URL('../dist/', import.meta.url);
const files = [];
const hash = createHash('sha256');
hash.update(await readFile(new URL(import.meta.url)));
hash.update(await readFile(new URL('./serve.mjs', import.meta.url)));
async function walk(dir, prefix = '') {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'sw.js') continue;
    const name = prefix + entry.name;
    if (entry.isDirectory()) await walk(new URL(entry.name + '/', dir), name + '/');
    else { files.push(name); hash.update(await readFile(new URL(entry.name, dir))); }
  }
}
await walk(dist);
const version = hash.digest('hex').slice(0, 16);
await writeFile(new URL('sw.js', dist), `
const CACHE = 'urgencias-shell-${version}';
const BASE = new URL('./', self.location).pathname;
const FILES = ${JSON.stringify(['./', ...files])};
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  await cache.addAll(FILES.map(path => new URL(path, self.location).href));
  await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const name of await caches.keys()) if (name.startsWith('urgencias-shell-') && name !== CACHE) await caches.delete(name);
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;
  if (url.pathname.startsWith(BASE + 'library/')) {
    event.respondWith((async () => {
      if (url.pathname.endsWith('/bootstrap.json')) {
        try { return await fetch(request); } catch { return (await caches.match(request)) || Response.error(); }
      }
      return (await caches.match(request)) || fetch(request);
    })());
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (request.mode === 'navigate') {
      try { const response = await fetch(request); if (response.ok) return response; } catch {}
      return (await cache.match(new URL('./', self.location).href)) || Response.error();
    }
    const cached = await cache.match(request);
    if (cached) return cached;
    return fetch(request);
  })());
});
`);
console.log(`PWA: ${files.length} archivos de aplicación preparados; biblioteca personal excluida.`);
