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
const CONTROL = 'urgencias-offline-control-v1';
const absolute = path => new URL(path, self.location).href;
async function shellStatus() {
  const cache = await caches.open(CACHE);
  const present = new Set((await cache.keys()).map(request => request.url));
  const missing = FILES.map(absolute).filter(url => !present.has(url));
  return { type: 'OFFLINE_STATUS', version: CACHE, complete: !missing.length, present: FILES.length - missing.length, total: FILES.length, missing };
}
async function localLibrary(request) {
  const pointer = await (await caches.open(CONTROL)).match(absolute('library/active.json'));
  if (pointer) {
    try {
      const value = await pointer.json();
      if (/^[a-f0-9]{20}$/.test(value.corpusVersion)) return (await caches.open('urgencias-encrypted-' + value.corpusVersion)).match(request);
    } catch {}
  }
  // Migration support for libraries imported before the active-version pointer existed.
  for (const name of (await caches.keys()).filter(name => name.startsWith('urgencias-encrypted-')).reverse()) {
    const response = await (await caches.open(name)).match(request);
    if (response) return response;
  }
}
async function network(request) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try { return await fetch(request, { signal: controller.signal }); } finally { clearTimeout(timer); }
}
self.addEventListener('install', event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  await cache.addAll(FILES.map(path => new Request(absolute(path), { cache: 'reload' })));
  await self.skipWaiting();
})()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  const previous = (await caches.keys()).filter(name => name.startsWith('urgencias-shell-') && name !== CACHE).slice(-1)[0];
  for (const name of await caches.keys()) if (name.startsWith('urgencias-shell-') && name !== CACHE && name !== previous) await caches.delete(name);
  await self.clients.claim();
})()));
self.addEventListener('message', event => {
  if (event.data?.type !== 'GET_OFFLINE_STATUS') return;
  event.waitUntil((async () => {
    const result = await shellStatus();
    event.ports?.[0]?.postMessage(result);
  })());
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;
  if (url.pathname.startsWith(BASE + 'library/')) {
    event.respondWith((async () => {
      return (await localLibrary(request)) || network(request);
    })());
    return;
  }
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (request.mode === 'navigate') {
      return (await cache.match(absolute('./'))) || network(request);
    }
    const cached = (await cache.match(request)) || (await caches.match(request));
    if (cached) return cached;
    return network(request);
  })());
});
`);
console.log(`PWA: ${files.length} archivos de aplicación preparados; biblioteca personal excluida.`);
