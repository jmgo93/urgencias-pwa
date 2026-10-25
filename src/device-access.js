const DATABASE = 'urgencias-device-access-v1';
const STORE = 'device-access';
const RECORD = 'active-library';
const encoder = new TextEncoder();

function storageError(action, cause) {
  const message = action === 'forget'
    ? 'No se ha podido olvidar este dispositivo. Inténtalo de nuevo o elimina los datos de esta app en el navegador.'
    : 'No se ha podido recordar este dispositivo. Puedes seguir consultando e introducir la contraseña la próxima vez.';
  return new Error(message, { cause });
}

export function createDeviceAccess({ indexedDB = globalThis.indexedDB, crypto = globalThis.crypto, timeoutMs = 5000 } = {}) {
  const deadline = Number.isFinite(timeoutMs) && timeoutMs > 0 ? Math.min(timeoutMs, 5000) : 5000;

  function usableKey(key) {
    const Key = crypto?.CryptoKey ?? globalThis.CryptoKey;
    return typeof Key === 'function' && key instanceof Key && key.type === 'secret'
      && key.extractable === false && key.algorithm?.name === 'AES-GCM' && key.algorithm.length === 256
      && key.usages.includes('decrypt');
  }

  async function fingerprint(manifest) {
    const { kdf, assets } = manifest ?? {};
    const corpus = assets?.corpus;
    if (!crypto?.subtle || !/^[a-f0-9]{20}$/.test(manifest?.corpusVersion)
      || kdf?.name !== 'PBKDF2' || kdf.hash !== 'SHA-256'
      || !Number.isInteger(kdf.iterations) || kdf.iterations < 100000 || kdf.iterations > 2000000
      || typeof kdf.salt !== 'string' || !kdf.salt
      || !/^[a-f0-9]{64}\.bin$/.test(corpus?.file) || typeof corpus.iv !== 'string' || !corpus.iv) {
      throw new Error('Biblioteca no compatible con el acceso de este dispositivo.');
    }
    const context = [DATABASE, manifest.corpusVersion, kdf.name, kdf.hash, kdf.iterations, kdf.salt, corpus.file, corpus.iv];
    const digest = await crypto.subtle.digest('SHA-256', encoder.encode(JSON.stringify(context)));
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  }

  function access(mode, operation) {
    return new Promise((resolve, reject) => {
      if (!indexedDB?.open) { reject(new Error('El almacenamiento del navegador no está disponible.')); return; }
      let database;
      let transaction;
      let settled = false;
      let value;
      const finish = (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (error) { try { transaction?.abort(); } catch {} }
        database?.close();
        if (error) reject(error); else resolve(value);
      };
      const timer = setTimeout(() => finish(new Error('El almacenamiento está tardando demasiado.')), deadline);
      let request;
      try { request = indexedDB.open(DATABASE, 1); } catch (error) { finish(error); return; }
      request.onerror = () => finish(request.error ?? new Error('No se pudo abrir el almacenamiento.'));
      request.onblocked = () => finish(new Error('Otra ventana está bloqueando el almacenamiento.'));
      request.onupgradeneeded = () => {
        const opened = request.result;
        if (settled) { try { request.transaction?.abort(); } catch {} return; }
        try {
          if (!opened.objectStoreNames.contains(STORE)) opened.createObjectStore(STORE);
        } catch (error) { finish(error); }
      };
      request.onsuccess = () => {
        database = request.result;
        if (settled) { database.close(); return; }
        database.onversionchange = () => database.close();
        try {
          transaction = database.transaction(STORE, mode);
          transaction.oncomplete = () => finish();
          transaction.onerror = () => finish(transaction.error ?? new Error('No se pudo completar el almacenamiento.'));
          transaction.onabort = () => finish(transaction.error ?? new Error('El almacenamiento se ha cancelado.'));
          const entry = operation(transaction.objectStore(STORE));
          entry.onsuccess = () => { value = entry.result; };
          entry.onerror = () => finish(entry.error ?? new Error('No se pudo acceder a este dispositivo.'));
        } catch (error) { finish(error); }
      };
    });
  }

  return {
    async saveDeviceAccess(manifest, key) {
      try {
        if (!usableKey(key)) throw new Error('Se requiere una clave AES-GCM no exportable.');
        const context = await fingerprint(manifest);
        // IndexedDB stores the CryptoKey by structured clone; key bytes are never exported.
        await access('readwrite', store => store.put({ fingerprint: context, key, savedAt: Date.now() }, RECORD));
      } catch (error) { throw storageError('save', error); }
    },
    async loadDeviceAccess(manifest) {
      try {
        const context = await fingerprint(manifest);
        const saved = await access('readonly', store => store.get(RECORD));
        return saved?.fingerprint === context && usableKey(saved.key) ? saved.key : null;
      } catch { return null; }
    },
    async forgetDeviceAccess() {
      if (!indexedDB?.open) return;
      try { await access('readwrite', store => store.delete(RECORD)); }
      catch (error) { throw storageError('forget', error); }
    },
  };
}

const access = createDeviceAccess();
export const saveDeviceAccess = access.saveDeviceAccess;
export const loadDeviceAccess = access.loadDeviceAccess;
export const forgetDeviceAccess = access.forgetDeviceAccess;
