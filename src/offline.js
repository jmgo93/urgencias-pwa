export const LIBRARY_PREFIX = 'urgencias-encrypted-';
export const CONTROL_CACHE = 'urgencias-offline-control-v1';
const versionPattern = /^[a-f0-9]{20}$/;
const appBase = base => new URL('./', base);
const metadataURL = base => new URL('library/bootstrap.json', appBase(base)).href;
const pointerURL = base => new URL('library/active.json', appBase(base)).href;

export function libraryCacheName(manifest) {
  if (!versionPattern.test(manifest?.corpusVersion)) throw new Error('Versión de biblioteca inválida.');
  return LIBRARY_PREFIX + manifest.corpusVersion;
}
function assetURL(asset, base) {
  if (!/^[a-f0-9]{64}\.bin$/.test(asset?.file)) throw new Error('Archivo de biblioteca inválido.');
  return new URL('library/' + asset.file, appBase(base)).href;
}
function isManifest(value, version) {
  return value?.schemaVersion === 1 && versionPattern.test(value.corpusVersion)
    && (!version || value.corpusVersion === version) && value.assets?.corpus;
}
async function writePointer(manifest, base, cacheStorage) {
  const cache = await cacheStorage.open(CONTROL_CACHE);
  await cache.put(pointerURL(base), new Response(JSON.stringify({ corpusVersion: manifest.corpusVersion }), {
    headers: { 'Content-Type': 'application/json' },
  }));
}
export async function saveLibraryManifest(manifest, base, { cacheStorage = globalThis.caches } = {}) {
  const cache = await cacheStorage.open(libraryCacheName(manifest));
  await cache.put(metadataURL(base), new Response(JSON.stringify(manifest), { headers: { 'Content-Type': 'application/json' } }));
  await writePointer(manifest, base, cacheStorage);
}
export async function getActiveLibraryManifest(base, { cacheStorage = globalThis.caches } = {}) {
  if (!cacheStorage) return null;
  const names = await cacheStorage.keys();
  if (names.includes(CONTROL_CACHE)) {
    const response = await (await cacheStorage.open(CONTROL_CACHE)).match(pointerURL(base));
    if (response) {
      let pointer;
      try { pointer = await response.json(); } catch { return null; }
      if (versionPattern.test(pointer?.corpusVersion)) {
        const name = libraryCacheName(pointer);
        if (!names.includes(name)) return null;
        const metadata = await (await cacheStorage.open(name)).match(metadataURL(base));
        if (!metadata) return null;
        try { const value = await metadata.json(); return isManifest(value, pointer.corpusVersion) ? value : null; } catch { return null; }
      }
    }
  }
  // Preserve previously imported v0.1 libraries, which did not have an active pointer.
  for (const name of names.filter(name => name.startsWith(LIBRARY_PREFIX)).reverse()) {
    const response = await (await cacheStorage.open(name)).match(metadataURL(base));
    if (!response) continue;
    try {
      const value = await response.json();
      if (isManifest(value) && libraryCacheName(value) === name) {
        await writePointer(value, base, cacheStorage);
        return value;
      }
    } catch { /* An incomplete or unsupported library is not an active library. */ }
  }
  return null;
}
export async function inspectLibraryCache(manifest, base, { cacheStorage = globalThis.caches } = {}) {
  const assets = Object.values(manifest.assets);
  const result = { complete: false, present: 0, total: assets.length, missingIds: [], bytes: 0,
    totalBytes: assets.reduce((sum, asset) => sum + asset.bytes, 0), hasManifest: false };
  const name = libraryCacheName(manifest);
  const names = await cacheStorage.keys();
  const cache = names.includes(name) ? await cacheStorage.open(name) : null;
  const urls = new Set(cache ? (await cache.keys()).map(request => request.url) : []);
  for (const asset of assets) {
    if (urls.has(assetURL(asset, base))) { result.present++; result.bytes += asset.bytes; }
    else result.missingIds.push(asset.id);
  }
  if (cache && urls.has(metadataURL(base))) {
    try {
      const saved = await (await cache.match(metadataURL(base))).json();
      result.hasManifest = isManifest(saved, manifest.corpusVersion)
        && ['name', 'hash', 'iterations', 'salt'].every(field => saved.kdf?.[field] === manifest.kdf?.[field])
        && Object.keys(saved.assets).length === assets.length
        && assets.every(asset => ['file', 'iv', 'bytes', 'compression'].every(field => saved.assets[asset.id]?.[field] === asset[field]));
    } catch {}
  }
  result.hasManifest = Boolean(result.hasManifest);
  result.complete = result.hasManifest && result.missingIds.length === 0;
  return result;
}
export async function fetchWithTimeout(url, { fetcher = globalThis.fetch, signal, timeoutMs = 5000 } = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true });
  let timer;
  try {
    return await Promise.race([
      fetcher(url, { credentials: 'omit', cache: 'no-store', signal: controller.signal }),
      new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error('La conexión está tardando demasiado.')); }, timeoutMs); }),
    ]);
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
export async function getLibraryAssetResponse(asset, manifest, base,
  { cacheStorage = globalThis.caches, fetcher = globalThis.fetch, signal, timeoutMs = 5000 } = {}) {
  const url = assetURL(asset, base);
  let cache;
  try {
    cache = await cacheStorage?.open(libraryCacheName(manifest));
    const cached = await cache?.match(url);
    if (cached) return cached;
  } catch { /* Reading online can still work if the browser disallows storage. */ }
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', abort, { once: true });
  let timer;
  let response;
  try {
    response = await Promise.race([
      (async () => {
        const received = await fetcher(url, { credentials: 'omit', cache: 'no-store', signal: controller.signal });
        if (!received.ok) throw new Error('Este archivo no está guardado. Importa de nuevo la biblioteca.');
        // Keep the timeout active through the body: a response can stall after HTTP 200.
        const bytes = await received.arrayBuffer();
        if (controller.signal.aborted) throw controller.signal.reason;
        const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('');
        if (bytes.byteLength !== asset.bytes || hash !== asset.file.slice(0, 64)) throw new Error('El archivo descargado está incompleto o ha cambiado.');
        return new Response(bytes, { status: received.status, statusText: received.statusText, headers: received.headers });
      })(),
      new Promise((_, reject) => { timer = setTimeout(() => {
        const error = new Error('La descarga está tardando demasiado. Puedes volver a intentarlo con mejor conexión.');
        controller.abort(error); reject(error);
      }, timeoutMs); }),
    ]);
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  try { await cache?.put(url, response.clone()); } catch { /* The availability panel will report the missing local copy. */ }
  return response;
}
