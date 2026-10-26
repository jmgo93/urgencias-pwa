const DATABASE = 'urgencias-local-search-v1';
const STORE = 'records';
const SCHEMA = 1;
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

function normalizeHistory(value) {
  if (!Array.isArray(value)) throw new Error('Historial inválido.');
  return value.slice(0, 20).map(entry => {
    if (!entry || typeof entry.query !== 'string' || !entry.query.trim() || entry.query.length > 10000
      || typeof entry.sectionId !== 'string' || entry.sectionId.length > 200
      || typeof entry.kind !== 'string' || entry.kind.length > 100
      || !Number.isSafeInteger(entry.lastUsedAt) || entry.lastUsedAt < 0) throw new Error('Entrada de historial inválida.');
    return { query: entry.query, sectionId: entry.sectionId, kind: entry.kind, lastUsedAt: entry.lastUsedAt };
  });
}

export function createLocalSearchData({ indexedDB = globalThis.indexedDB, crypto = globalThis.crypto, timeoutMs = 5000 } = {}) {
  const deadline = Number.isFinite(timeoutMs) && timeoutMs > 0 ? Math.min(timeoutMs, 5000) : 5000;
  let generation = 0;
  let historyGeneration = 0;

  async function context(manifest, type) {
    const { kdf, assets } = manifest ?? {};
    const corpus = assets?.corpus;
    if (!crypto?.subtle || !/^[a-f0-9]{20}$/.test(manifest?.corpusVersion)
      || kdf?.name !== 'PBKDF2' || kdf.hash !== 'SHA-256'
      || !Number.isInteger(kdf.iterations) || kdf.iterations < 100000 || kdf.iterations > 2000000
      || typeof kdf.salt !== 'string' || !kdf.salt
      || !/^[a-f0-9]{64}\.bin$/.test(corpus?.file) || typeof corpus.iv !== 'string' || !corpus.iv) {
      throw new Error('Biblioteca no compatible.');
    }
    const identity = [DATABASE, SCHEMA, manifest.corpusVersion, kdf.name, kdf.hash, kdf.iterations, kdf.salt, corpus.file, corpus.iv];
    const hash = await crypto.subtle.digest('SHA-256', encoder.encode(JSON.stringify(identity)));
    const fingerprint = [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
    const id = `${fingerprint}:${type}:v${SCHEMA}`;
    return { id, aad: encoding => encoder.encode(JSON.stringify([DATABASE, SCHEMA, fingerprint, type, encoding])) };
  }

  function checkKey(key, usage) {
    const Key = crypto?.CryptoKey ?? globalThis.CryptoKey;
    if (typeof Key !== 'function' || !(key instanceof Key) || key.extractable !== false || key.type !== 'secret'
      || key.algorithm?.name !== 'AES-GCM' || key.algorithm.length !== 256 || !key.usages.includes(usage)) {
      throw new Error('Clave de biblioteca inválida.');
    }
  }

  // One deadline covers crypto, opening the database and committing the transaction.
  async function operation(work) {
    let timer;
    let cancelStorage;
    let cancelled = false;
    const check = () => { if (cancelled) throw new Error('Operación cancelada.'); };
    const access = (mode, action, guard = () => {}) => new Promise((resolve, reject) => {
      check();
      if (!indexedDB?.open) { reject(new Error('Almacenamiento no disponible.')); return; }
      let database;
      let transaction;
      let settled = false;
      let result;
      const finish = error => {
        if (settled) return;
        settled = true;
        if (error) { try { transaction?.abort(); } catch {} }
        database?.close();
        if (error) reject(error); else resolve(result);
      };
      cancelStorage = () => finish(new Error('El almacenamiento está tardando demasiado.'));
      let request;
      try { guard(); request = indexedDB.open(DATABASE, 1); } catch (error) { finish(error); return; }
      request.onerror = () => finish(request.error ?? new Error('No se pudo abrir el almacenamiento.'));
      request.onblocked = () => finish(new Error('Otra ventana está bloqueando el almacenamiento.'));
      request.onupgradeneeded = () => {
        if (settled || cancelled) { try { request.transaction?.abort(); } catch {} return; }
        try { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE); }
        catch (error) { finish(error); }
      };
      request.onsuccess = () => {
        database = request.result;
        if (settled || cancelled) { database.close(); return; }
        database.onversionchange = () => database.close();
        try {
          check(); guard();
          transaction = database.transaction(STORE, mode);
          transaction.oncomplete = () => finish();
          transaction.onerror = () => finish(transaction.error ?? new Error('El almacenamiento ha fallado.'));
          transaction.onabort = () => finish(transaction.error ?? new Error('El almacenamiento se ha cancelado.'));
          const entry = action(transaction.objectStore(STORE));
          entry.onsuccess = () => { result = entry.result; };
          entry.onerror = () => finish(entry.error ?? new Error('No se pudo acceder al almacenamiento.'));
        } catch (error) { finish(error); }
      };
    });
    try {
      return await Promise.race([
        work(access, check),
        new Promise((_, reject) => { timer = setTimeout(() => {
          cancelled = true;
          cancelStorage?.();
          reject(new Error('La operación está tardando demasiado.'));
        }, deadline); }),
      ]);
    } finally { clearTimeout(timer); }
  }

  async function read(manifest, key, type) {
    return operation(async (access, check) => {
      checkKey(key, 'decrypt');
      const current = await context(manifest, type);
      check();
      const record = await access('readonly', store => store.get(current.id));
      if (record?.schemaVersion !== SCHEMA || !['json', 'gzip'].includes(record.encoding)
        || (type === 'history' && record.encoding !== 'json')
        || !(record.iv instanceof Uint8Array) || record.iv.byteLength !== 12
        || !(record.ciphertext instanceof ArrayBuffer) || record.ciphertext.byteLength < 16) return null;
      const plain = new Uint8Array(await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: record.iv, additionalData: current.aad(record.encoding), tagLength: 128 }, key, record.ciphertext,
      ));
      let decoded = plain;
      try {
        if (record.encoding === 'gzip') {
          decoded = new Uint8Array(await new Response(new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
        }
        check();
        return JSON.parse(decoder.decode(decoded));
      } finally { plain.fill(0); if (decoded !== plain) decoded.fill(0); }
    });
  }

  async function write(manifest, key, type, value) {
    const epoch = generation;
    const historyEpoch = historyGeneration;
    const guard = () => {
      if (epoch !== generation || (type === 'history' && historyEpoch !== historyGeneration)) throw new Error('Los datos se han eliminado.');
    };
    return operation(async (access, check) => {
      checkKey(key, 'encrypt');
      const current = await context(manifest, type);
      check(); guard();
      const bytes = encoder.encode(JSON.stringify(value));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encoding = type === 'prepared-search' ? 'gzip' : 'json';
      let payload = bytes;
      let ciphertext;
      try {
        if (encoding === 'gzip') {
          payload = new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
        }
        check(); guard();
        ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: current.aad(encoding), tagLength: 128 }, key, payload);
      } finally { bytes.fill(0); if (payload !== bytes) payload.fill(0); }
      check(); guard();
      await access('readwrite', store => store.put({ schemaVersion: SCHEMA, encoding, iv, ciphertext }, current.id), guard);
    });
  }

  return {
    async readPreparedSearch(manifest, key) {
      try { const value = await read(manifest, key, 'prepared-search'); return value && typeof value === 'object' && !Array.isArray(value) ? value : null; }
      catch { return null; }
    },
    async writePreparedSearch(manifest, key, data) {
      try {
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Índice inválido.');
        await write(manifest, key, 'prepared-search', data);
      } catch { throw new Error('No se ha podido guardar el buscador preparado. La búsqueda actual sigue disponible.'); }
    },
    async readSearchHistory(manifest, key) {
      try { const value = await read(manifest, key, 'history'); return value === null ? [] : normalizeHistory(value); }
      catch { return []; }
    },
    async writeSearchHistory(manifest, key, history) {
      try { await write(manifest, key, 'history', normalizeHistory(history)); }
      catch { throw new Error('No se ha podido guardar el historial en este dispositivo. La búsqueda actual sigue disponible.'); }
    },
    async clearSearchHistory(manifest) {
      historyGeneration++;
      if (!indexedDB?.open) return;
      try {
        await operation(async (access, check) => {
          const current = await context(manifest, 'history');
          check();
          await access('readwrite', store => store.delete(current.id));
        });
      } catch { throw new Error('No se ha podido borrar el historial de este dispositivo. Inténtalo de nuevo.'); }
    },
    async forgetLocalSearchData() {
      generation++;
      historyGeneration++;
      if (!indexedDB?.open) return;
      try { await operation(access => access('readwrite', store => store.clear())); }
      catch { throw new Error('No se han podido eliminar los datos de búsqueda de este dispositivo. Inténtalo de nuevo.'); }
    },
  };
}

const data = createLocalSearchData();
export const readPreparedSearch = data.readPreparedSearch;
export const writePreparedSearch = data.writePreparedSearch;
export const readSearchHistory = data.readSearchHistory;
export const writeSearchHistory = data.writeSearchHistory;
export const clearSearchHistory = data.clearSearchHistory;
export const forgetLocalSearchData = data.forgetLocalSearchData;
