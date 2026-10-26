import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import {
  libraryCacheName, getActiveLibraryManifest, saveLibraryManifest, inspectLibraryCache,
  getLibraryAssetResponse,
} from '../src/offline.js';

const origin = 'https://example.test';
const scope = `${origin}/urgencias-pwa/`;
const response = (body, status = 200) => new Response(body, { status });
const key = (request) => typeof request === 'string' ? request : request.url ?? request.href;

class MemoryCache {
  entries = new Map();
  precacheRequests = [];
  async match(request) { return this.entries.get(key(request))?.clone(); }
  async put(request, value) { this.entries.set(key(request), value.clone()); }
  async keys() { return [...this.entries.keys()].map((url) => new Request(url)); }
  async delete(request) { return this.entries.delete(key(request)); }
  async addAll(requests) {
    this.precacheRequests.push(...requests);
    for (const request of requests) await this.put(request, response(`saved:${key(request)}`));
  }
}
class MemoryCaches {
  stores = new Map();
  async open(name) {
    if (!this.stores.has(name)) this.stores.set(name, new MemoryCache());
    return this.stores.get(name);
  }
  async keys() { return [...this.stores.keys()]; }
  async delete(name) { return this.stores.delete(name); }
  async match(request) {
    for (const cache of this.stores.values()) {
      const found = await cache.match(request);
      if (found) return found;
    }
  }
}

// Execute the actual generator against synthetic build files, without altering dist.
async function generateServiceWorker() {
  const source = await readFile(new URL('../scripts/build-sw.mjs', import.meta.url), 'utf8');
  const input = new Map([
    ['index.html', '<html>Application</html>'],
    ['manifest.webmanifest', '{"start_url":"./"}'],
    ['assets/app-fixture.js', 'Application code'],
    ['assets/search-worker-fixture.js', 'Search worker'],
    ['assets/pdf-worker-fixture.mjs', 'PDF worker'],
    ['vendor/pdfjs/cmaps/fixture.bcmap', 'Character maps'],
    ['vendor/pdfjs/standard_fonts/fixture.pfb', 'Fonts'],
    ['vendor/pdfjs/wasm/fixture.wasm', 'PDF decoder'],
  ]);
  let generated;
  const scriptURL = new URL('../scripts/build-sw.mjs', import.meta.url).href;
  const distURL = new URL('../dist/', import.meta.url).href;
  const context = vm.createContext({
    URL, createHash, console: { log() {} },
    readFile: async (url) => {
      if (url.href === scriptURL) return Buffer.from(source);
      if (url.pathname.endsWith('/scripts/serve.mjs')) return Buffer.from('// synthetic server');
      const contents = input.get(url.href.slice(distURL.length));
      if (contents === undefined) throw new Error(`Unexpected build read: ${url}`);
      return Buffer.from(contents);
    },
    readdir: async (url) => {
      const prefix = url.href.slice(distURL.length);
      const names = new Set([...input.keys()].filter((path) => path.startsWith(prefix)).map((path) => path.slice(prefix.length).split('/')[0]));
      return [...names].map((name) => ({ name, isDirectory: () => !input.has(prefix + name) }));
    },
    writeFile: async (_url, contents) => { generated = contents; },
  });
  const executable = source.replace(/^import .*;\r?\n/gmu, '').replaceAll('import.meta.url', JSON.stringify(scriptURL));
  await new vm.Script(`(async () => { ${executable} })()`).runInContext(context);
  assert.equal(typeof generated, 'string');
  return generated;
}

async function serviceWorker() {
  const source = await generateServiceWorker();
  const listeners = new Map();
  const caches = new MemoryCaches();
  const requests = [];
  let network = async () => response('network');
  const self = {
    location: new URL(`${scope}sw.js`),
    clients: { claim: async () => {} },
    skipWaiting: async () => {},
    addEventListener(type, callback) { listeners.set(type, callback); },
  };
  vm.runInNewContext(source, {
    self, caches, URL, Request, Response, AbortController, DOMException,
    setTimeout, clearTimeout, console,
    fetch: async (...args) => { requests.push(args); return network(...args); },
  });
  async function lifecycle(type) {
    let pending;
    listeners.get(type)({ waitUntil(value) { pending = value; } });
    await pending;
  }
  async function request(path, options = {}) {
    let pending;
    listeners.get('fetch')({
      request: { url: new URL(path, scope).href, method: 'GET', mode: 'same-origin', ...options },
      respondWith(value) { pending = Promise.resolve(value); },
      waitUntil() {},
    });
    return pending;
  }
  return { caches, requests, request, lifecycle, listeners, network: (value) => { network = value; } };
}

test('service worker precaches the app, search/PDF workers and every PDF dependency', async () => {
  const sw = await serviceWorker();
  await sw.lifecycle('install');
  const [name] = await sw.caches.keys();
  const cache = await sw.caches.open(name);
  for (const path of ['./', 'index.html', 'assets/search-worker-fixture.js', 'assets/pdf-worker-fixture.mjs',
    'vendor/pdfjs/cmaps/fixture.bcmap', 'vendor/pdfjs/standard_fonts/fixture.pfb', 'vendor/pdfjs/wasm/fixture.wasm']) {
    assert.ok(await cache.match(new URL(path, scope).href), `Missing offline dependency: ${path}`);
  }
  assert.equal((await cache.keys()).some(({ url }) => url.includes('/library/')), false);
});

test('every installation request bypasses stale HTTP cache, including HTML and worker code', async () => {
  const sw = await serviceWorker();
  await sw.lifecycle('install');
  const [name] = await sw.caches.keys();
  const cache = await sw.caches.open(name);
  assert.ok(cache.precacheRequests.length > 0);
  for (const request of cache.precacheRequests) {
    assert.ok(request instanceof Request, 'Precache must use explicit Request cache options.');
    assert.equal(request.cache, 'reload', `May reuse stale HTTP data: ${request.url}`);
  }
  for (const path of ['./', 'index.html', 'assets/app-fixture.js', 'assets/search-worker-fixture.js', 'assets/pdf-worker-fixture.mjs']) {
    assert.ok(cache.precacheRequests.some(request => request.url === new URL(path, scope).href), `Missing fresh install request: ${path}`);
  }
});

test('cached application opens immediately without waiting for an unreachable network', async () => {
  const sw = await serviceWorker();
  await sw.lifecycle('install');
  sw.network(async () => new Promise(() => {}));
  const actual = await Promise.race([
    sw.request('./', { mode: 'navigate' }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Navigation waited for network')), 250)),
  ]);
  assert.match(await actual.text(), /saved:/u);
  assert.equal(sw.requests.length, 0);
});

test('encrypted library is cache-first, including bootstrap, without a network probe', async () => {
  const sw = await serviceWorker();
  const encrypted = await sw.caches.open('urgencias-encrypted-fixture');
  for (const path of ['library/bootstrap.json', `library/${'a'.repeat(64)}.bin`]) {
    await encrypted.put(new URL(path, scope).href, response('encrypted bytes'));
    sw.network(async () => { throw new TypeError('Offline'); });
    assert.equal(await (await sw.request(path)).text(), 'encrypted bytes');
  }
  assert.equal(sw.requests.length, 0);
});

test('a missing encrypted PDF preserves its HTTP failure and never receives the application HTML', async () => {
  const sw = await serviceWorker();
  await sw.lifecycle('install');
  sw.network(async () => response('Not found', 404));
  const actual = await sw.request(`library/${'b'.repeat(64)}.bin`);
  assert.equal(actual.status, 404);
  assert.equal(await actual.text(), 'Not found');
});

test('service worker ignores external URLs, sibling Pages sites and non-GET requests', async () => {
  const sw = await serviceWorker();
  assert.equal(await sw.request('https://external.test/asset.js'), undefined);
  assert.equal(await sw.request('/another-project/'), undefined);
  assert.equal(await sw.request('./', { method: 'POST' }), undefined);
  assert.equal(sw.requests.length, 0);
});

test('application updates preserve encrypted library caches and unrelated applications', async () => {
  const sw = await serviceWorker();
  await sw.caches.open('urgencias-shell-oldest');
  await sw.caches.open('urgencias-shell-previous');
  await sw.caches.open('urgencias-encrypted-fixture');
  await sw.caches.open('another-application');
  await sw.lifecycle('install');
  await sw.lifecycle('activate');
  assert.equal((await sw.caches.keys()).includes('urgencias-shell-oldest'), false);
  assert.equal((await sw.caches.keys()).includes('urgencias-shell-previous'), true);
  assert.equal((await sw.caches.keys()).includes('urgencias-encrypted-fixture'), true);
  assert.equal((await sw.caches.keys()).includes('another-application'), true);
});

test('shell readiness checks every required URL and detects a missing PDF decoder', async () => {
  const sw = await serviceWorker();
  await sw.lifecycle('install');
  const ask = async () => {
    let actual;
    let pending;
    sw.listeners.get('message')({ data: { type: 'GET_OFFLINE_STATUS' },
      ports: [{ postMessage(value) { actual = value; } }], waitUntil(value) { pending = value; } });
    await pending;
    return actual;
  };
  assert.equal((await ask()).complete, true);
  const [name] = await sw.caches.keys();
  await (await sw.caches.open(name)).delete(`${scope}vendor/pdfjs/wasm/fixture.wasm`);
  const partial = await ask();
  assert.equal(partial.type, 'OFFLINE_STATUS');
  assert.equal(partial.complete, false);
  assert.ok(partial.missing.includes(`${scope}vendor/pdfjs/wasm/fixture.wasm`));
});

function fixture(version = '0123456789abcdefabcd') {
  const assets = Object.fromEntries(['corpus', 'document-001'].map((id, index) => {
    const bytes = Buffer.alloc(index ? 32 : 20, index + 1);
    return [id, { id, file: `${createHash('sha256').update(bytes).digest('hex')}.bin`, bytes: bytes.length,
      iv: Buffer.alloc(12, index + 1).toString('base64'), compression: index ? null : 'gzip' }];
  }));
  return {
    schemaVersion: 1, algorithm: 'AES-256-GCM', corpusVersion: version,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: 600000, salt: Buffer.alloc(24, 3).toString('base64') },
    assets, documentCount: 1, totalBytes: 52,
  };
}
const assetLocation = (asset) => `${scope}library/${asset.file}`;

test('library inspection verifies exact files and metadata rather than an inflated cache entry count', async () => {
  const cacheStorage = new MemoryCaches();
  const manifest = fixture();
  const cache = await cacheStorage.open(libraryCacheName(manifest));
  await saveLibraryManifest(manifest, new URL(scope), { cacheStorage });
  await cache.put(assetLocation(manifest.assets.corpus), response(Buffer.alloc(20, 1)));
  for (let index = 0; index < 4; index++) await cache.put(`${scope}library/unrelated-${index}.bin`, response('unrelated'));
  const partial = await inspectLibraryCache(manifest, new URL(scope), { cacheStorage });
  assert.equal(partial.complete, false);
  assert.equal(partial.present, 1);
  assert.equal(partial.total, 2);
  assert.equal(partial.hasManifest, true);
  assert.deepEqual(partial.missingIds, ['document-001']);
  assert.equal(partial.bytes, 20);
  assert.equal(partial.totalBytes, 52);
  await cache.put(assetLocation(manifest.assets['document-001']), response(Buffer.alloc(32, 2)));
  assert.equal((await inspectLibraryCache(manifest, new URL(scope), { cacheStorage })).complete, true);
  await cache.put(`${scope}library/bootstrap.json`, response(JSON.stringify(fixture('fedcba9876543210abcd'))));
  const wrongVersion = await inspectLibraryCache(manifest, new URL(scope), { cacheStorage });
  assert.equal(wrongVersion.complete, false);
  assert.equal(wrongVersion.hasManifest, false);
  await cache.delete(`${scope}library/bootstrap.json`);
  assert.equal((await inspectLibraryCache(manifest, new URL(scope), { cacheStorage })).complete, false);
});

test('active manifest pointer selects the imported version and does not contact a server', async () => {
  const cacheStorage = new MemoryCaches();
  assert.equal(await getActiveLibraryManifest(new URL(scope), { cacheStorage }), null);
  const first = fixture();
  const second = fixture('fedcba9876543210abcd');
  await saveLibraryManifest(first, new URL(scope), { cacheStorage });
  await saveLibraryManifest(second, new URL(scope), { cacheStorage });
  assert.deepEqual(await getActiveLibraryManifest(new URL(scope), { cacheStorage }), second);
  const controls = await cacheStorage.open('urgencias-offline-control-v1');
  assert.deepEqual(await (await controls.match(`${scope}library/active.json`)).json(), { corpusVersion: second.corpusVersion });
});

test('complete asset keys cannot hide malformed or different-version library metadata', async () => {
  const manifest = fixture();
  for (const body of ['{invalid json', JSON.stringify(fixture('fedcba9876543210abcd'))]) {
    const cacheStorage = new MemoryCaches();
    const cache = await cacheStorage.open(libraryCacheName(manifest));
    for (const asset of Object.values(manifest.assets)) await cache.put(assetLocation(asset), response(Buffer.alloc(asset.bytes)));
    await cache.put(`${scope}library/bootstrap.json`, response(body));
    const actual = await inspectLibraryCache(manifest, new URL(scope), { cacheStorage });
    assert.equal(actual.present, 2);
    assert.equal(actual.complete, false);
    assert.equal(actual.hasManifest, false);
  }
});

test('same-version metadata with different key parameters or encrypted assets is not ready offline', async () => {
  const manifest = fixture();
  const mutations = [
    (value) => { value.kdf.salt = Buffer.alloc(24, 9).toString('base64'); },
    (value) => { value.kdf.iterations = 700000; },
    (value) => { value.assets.corpus.file = `${'f'.repeat(64)}.bin`; },
    (value) => { value.assets.corpus.iv = Buffer.alloc(12, 9).toString('base64'); },
  ];
  for (const mutate of mutations) {
    const cachedManifest = structuredClone(manifest);
    mutate(cachedManifest);
    const cacheStorage = new MemoryCaches();
    const cache = await cacheStorage.open(libraryCacheName(manifest));
    for (const asset of Object.values(manifest.assets)) await cache.put(assetLocation(asset), response(Buffer.alloc(asset.bytes)));
    await cache.put(`${scope}library/bootstrap.json`, response(JSON.stringify(cachedManifest)));
    const actual = await inspectLibraryCache(manifest, new URL(scope), { cacheStorage });
    assert.equal(actual.present, 2);
    assert.equal(actual.hasManifest, false);
    assert.equal(actual.complete, false);
  }
});

test('legacy imported library is found locally, while unrelated and malformed metadata are ignored', async () => {
  const cacheStorage = new MemoryCaches();
  const manifest = fixture();
  const cache = await cacheStorage.open(libraryCacheName(manifest));
  await cache.put(`${scope}library/bootstrap.json`, response(JSON.stringify(manifest)));
  const invalid = await cacheStorage.open('urgencias-encrypted-invalid');
  await invalid.put(`${scope}library/bootstrap.json`, response('{invalid json'));
  const unrelated = await cacheStorage.open('another-app');
  await unrelated.put(`${scope}library/bootstrap.json`, response(JSON.stringify(fixture('fedcba9876543210abcd'))));
  assert.deepEqual(await getActiveLibraryManifest(new URL(scope), { cacheStorage }), manifest);
});

test('library reads use only the selected version cache and avoid all network activity when present', async () => {
  const cacheStorage = new MemoryCaches();
  const manifest = fixture();
  const asset = manifest.assets.corpus;
  await (await cacheStorage.open(libraryCacheName(manifest))).put(assetLocation(asset), response(Buffer.alloc(20, 1)));
  let networkCalls = 0;
  const actual = await getLibraryAssetResponse(asset, manifest, new URL(scope), { cacheStorage,
    fetcher: async () => { ++networkCalls; throw new TypeError('No connection'); } });
  assert.equal((await actual.arrayBuffer()).byteLength, 20);
  assert.equal(networkCalls, 0);
});

test('missing encrypted assets are fetched once, saved, and available for later offline reads', async () => {
  const cacheStorage = new MemoryCaches();
  const manifest = fixture();
  const asset = manifest.assets['document-001'];
  let networkCalls = 0;
  await getLibraryAssetResponse(asset, manifest, new URL(scope), { cacheStorage,
    fetcher: async () => { ++networkCalls; return response(Buffer.alloc(32, 2)); } });
  const actual = await getLibraryAssetResponse(asset, manifest, new URL(scope), { cacheStorage,
    fetcher: async () => { throw new TypeError('Offline'); } });
  assert.equal((await actual.arrayBuffer()).byteLength, 32);
  assert.equal(networkCalls, 1);
});

test('an asset in another version or another app cannot satisfy the selected library', async () => {
  const cacheStorage = new MemoryCaches();
  const manifest = fixture();
  const asset = manifest.assets.corpus;
  await (await cacheStorage.open('another-app')).put(assetLocation(asset), response('not this library'));
  await (await cacheStorage.open(libraryCacheName(fixture('fedcba9876543210abcd')))).put(assetLocation(asset), response(Buffer.alloc(20, 1)));
  await assert.rejects(getLibraryAssetResponse(asset, manifest, new URL(scope), { cacheStorage,
    fetcher: async () => response('Not found', 404) }));
  assert.equal(await (await cacheStorage.open(libraryCacheName(manifest))).match(assetLocation(asset)), undefined);
});

test('HTTP errors are not cached and storage failure still permits an online consultation', async () => {
  const manifest = fixture();
  const asset = manifest.assets.corpus;
  const cacheStorage = new MemoryCaches();
  await assert.rejects(getLibraryAssetResponse(asset, manifest, new URL(scope), { cacheStorage,
    fetcher: async () => response('Not found', 404) }));
  assert.equal(await (await cacheStorage.open(libraryCacheName(manifest))).match(assetLocation(asset)), undefined);
  const actual = await getLibraryAssetResponse(asset, manifest, new URL(scope), {
    cacheStorage: { open: async () => { throw new DOMException('No space', 'QuotaExceededError'); } },
    fetcher: async () => response(Buffer.alloc(20, 1)),
  });
  assert.equal((await actual.arrayBuffer()).byteLength, 20);
});

test('a 200 HTML error page or altered encrypted payload is rejected and never cached', async () => {
  const manifest = fixture();
  const asset = manifest.assets.corpus;
  for (const body of ['<html>Unexpected error</html>', Buffer.alloc(20, 9)]) {
    const cacheStorage = new MemoryCaches();
    await assert.rejects(getLibraryAssetResponse(asset, manifest, new URL(scope), { cacheStorage,
      fetcher: async () => response(body) }));
    assert.equal(await (await cacheStorage.open(libraryCacheName(manifest))).match(assetLocation(asset)), undefined);
  }
});

test('an unreachable network is aborted within the configured download timeout', async () => {
  const manifest = fixture();
  const asset = manifest.assets.corpus;
  const cacheStorage = new MemoryCaches();
  let abortSignal;
  const pending = getLibraryAssetResponse(asset, manifest, new URL(scope), { cacheStorage, timeoutMs: 20,
    fetcher: async (_url, { signal }) => {
      abortSignal = signal;
      return new Promise((_, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true }));
    } });
  await assert.rejects(pending);
  assert.equal(abortSignal.aborted, true);
  assert.equal(await (await cacheStorage.open(libraryCacheName(manifest))).match(assetLocation(asset)), undefined);
});

test('download timeout covers a response body that never finishes after successful HTTP headers', async () => {
  const manifest = fixture();
  const asset = manifest.assets.corpus;
  const cacheStorage = new MemoryCaches();
  let bodyController;
  let abortSignal;
  let guard;
  const pending = getLibraryAssetResponse(asset, manifest, new URL(scope), { cacheStorage, timeoutMs: 20,
    fetcher: async (_url, { signal }) => {
      abortSignal = signal;
      const body = new ReadableStream({ start(controller) { bodyController = controller; } });
      signal.addEventListener('abort', () => bodyController.error(signal.reason), { once: true });
      return response(body);
    } });
  let outcome;
  try {
    outcome = await Promise.race([
      pending.then(() => 'resolved', () => 'rejected'),
      new Promise((resolve) => { guard = setTimeout(() => resolve('body-still-pending'), 250); }),
    ]);
  } finally {
    clearTimeout(guard);
    // Release both branches of Response.clone() even when testing a broken timeout.
    bodyController?.error(new DOMException('Test cleanup', 'AbortError'));
    await pending.catch(() => {});
  }
  assert.equal(outcome, 'rejected', 'Successful headers must not disable the download time limit.');
  assert.equal(abortSignal.aborted, true);
  assert.equal(await (await cacheStorage.open(libraryCacheName(manifest))).match(assetLocation(asset)), undefined);
});

test('cancellation interrupts a missing-asset request and never creates a cached copy', async () => {
  const manifest = fixture();
  const asset = manifest.assets.corpus;
  const cacheStorage = new MemoryCaches();
  const controller = new AbortController();
  const pending = getLibraryAssetResponse(asset, manifest, new URL(scope), { cacheStorage, signal: controller.signal,
    fetcher: async (_url, { signal }) => new Promise((_, reject) => {
      if (signal.aborted) reject(signal.reason);
      else signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    }) });
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(await (await cacheStorage.open(libraryCacheName(manifest))).match(assetLocation(asset)), undefined);
});
