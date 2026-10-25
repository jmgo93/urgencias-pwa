import assert from 'node:assert/strict';
import test from 'node:test';
import { createDeviceAccess, saveDeviceAccess, loadDeviceAccess, forgetDeviceAccess } from '../src/device-access.js';

const fixture = () => ({
  corpusVersion: '0123456789abcdefabcd',
  kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: 600000, salt: Buffer.alloc(24, 3).toString('base64') },
  assets: { corpus: { file: `${'a'.repeat(64)}.bin`, iv: Buffer.alloc(12, 1).toString('base64') } },
});
const makeKey = (extractable = false) => crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, extractable, ['encrypt', 'decrypt']);

// Small event-driven IndexedDB double. Writes become visible only on transaction complete.
function memoryIndexedDB(options = {}) {
  const state = { records: new Map(), created: false, closed: 0, committed: 0, requestsSucceeded: 0, opened: 0, ...options };
  function open() {
    state.opened++;
    const request = {};
    const database = {
      objectStoreNames: { contains: () => state.created },
      createObjectStore() { state.created = true; },
      close() { state.closed++; },
      transaction(_store, mode) {
        let aborted = false;
        const transaction = {
          abort() { aborted = true; queueMicrotask(() => transaction.onabort?.()); },
          objectStore() {
            function operation(type, value, id) {
              const entry = {};
              queueMicrotask(() => {
                if (aborted) return;
                if (state.requestError) {
                  entry.error = new DOMException('Storage denied', 'QuotaExceededError');
                  entry.onerror?.();
                  return;
                }
                entry.result = type === 'get' ? structuredClone(state.records.get(id)) : id;
                const stored = type === 'put' ? structuredClone(value) : null;
                state.requestsSucceeded++;
                entry.onsuccess?.();
                if (state.neverCommit) return;
                setTimeout(() => {
                  if (aborted) return;
                  if (state.abortAfterRequest) {
                    transaction.error = new DOMException('Commit aborted', 'AbortError');
                    transaction.onabort?.();
                    return;
                  }
                  if (type === 'put') state.records.set(id, stored);
                  if (type === 'delete') state.records.delete(id);
                  state.committed++;
                  transaction.oncomplete?.();
                }, 0);
              });
              return entry;
            }
            return {
              get: id => operation('get', null, id),
              put: (value, id) => { assert.equal(mode, 'readwrite'); return operation('put', value, id); },
              delete: id => { assert.equal(mode, 'readwrite'); return operation('delete', null, id); },
            };
          },
        };
        return transaction;
      },
    };
    const succeed = () => {
      request.result = database;
      if (!state.created) request.onupgradeneeded?.();
      request.onsuccess?.();
    };
    state.finishOpen = succeed;
    queueMicrotask(() => {
      if (state.neverOpen) return;
      if (state.blocked) { request.onblocked?.(); return; }
      if (state.openError) { request.error = new DOMException('Storage denied', 'SecurityError'); request.onerror?.(); return; }
      succeed();
    });
    return request;
  }
  return { indexedDB: { open }, state };
}

test('public API is available and absent browser storage safely falls back to a password', async () => {
  assert.equal(typeof saveDeviceAccess, 'function');
  assert.equal(typeof loadDeviceAccess, 'function');
  assert.equal(typeof forgetDeviceAccess, 'function');
  const access = createDeviceAccess({ indexedDB: null, crypto });
  assert.equal(await access.loadDeviceAccess(fixture()), null);
  await assert.rejects(access.saveDeviceAccess(fixture(), await makeKey()), /recordar este dispositivo/u);
  await access.forgetDeviceAccess();
});

test('stores a structured-cloned, non-extractable AES key without a password or exported key bytes', async () => {
  const { indexedDB, state } = memoryIndexedDB();
  const access = createDeviceAccess({ indexedDB, crypto });
  const manifest = fixture();
  const original = await makeKey();
  await access.saveDeviceAccess(manifest, original);
  const record = state.records.get('active-library');
  assert.deepEqual(Object.keys(record).sort(), ['fingerprint', 'key', 'savedAt']);
  assert.match(record.fingerprint, /^[a-f0-9]{64}$/u);
  assert.equal(typeof record.savedAt, 'number');
  const restored = await access.loadDeviceAccess(manifest);
  assert.ok(restored instanceof CryptoKey);
  assert.notEqual(restored, original);
  assert.equal(restored.extractable, false);
  await assert.rejects(crypto.subtle.exportKey('raw', restored));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const bytes = new TextEncoder().encode('Synthetic library verification');
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, original, bytes);
  assert.deepEqual(new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, restored, encrypted)), bytes);
  assert.equal(state.committed, 2);
  assert.equal(state.closed, 2);
});

test('key restoration is bound to all key-derivation and encrypted-corpus identity fields', async () => {
  const { indexedDB } = memoryIndexedDB();
  const access = createDeviceAccess({ indexedDB, crypto });
  const manifest = fixture();
  await access.saveDeviceAccess(manifest, await makeKey());
  const mutations = [
    value => { value.corpusVersion = 'fedcba9876543210abcd'; },
    value => { value.kdf.name = 'scrypt'; },
    value => { value.kdf.hash = 'SHA-512'; },
    value => { value.kdf.iterations = 700000; },
    value => { value.kdf.salt = Buffer.alloc(24, 8).toString('base64'); },
    value => { value.assets.corpus.file = `${'b'.repeat(64)}.bin`; },
    value => { value.assets.corpus.iv = Buffer.alloc(12, 8).toString('base64'); },
  ];
  for (const mutate of mutations) {
    const changed = structuredClone(manifest);
    mutate(changed);
    assert.equal(await access.loadDeviceAccess(changed), null);
  }
  assert.ok(await access.loadDeviceAccess(manifest));
});

test('only genuine non-extractable AES-256-GCM decryption keys can be remembered', async () => {
  const { indexedDB, state } = memoryIndexedDB();
  const access = createDeviceAccess({ indexedDB, crypto });
  const invalid = [
    await makeKey(true),
    await crypto.subtle.generateKey({ name: 'AES-GCM', length: 128 }, false, ['decrypt']),
    await crypto.subtle.generateKey({ name: 'AES-CBC', length: 256 }, false, ['decrypt']),
    await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt']),
    { type: 'secret', extractable: false, algorithm: { name: 'AES-GCM', length: 256 }, usages: ['decrypt'] },
  ];
  for (const key of invalid) await assert.rejects(access.saveDeviceAccess(fixture(), key), /recordar este dispositivo/u);
  assert.equal(state.records.size, 0);
  assert.equal(state.opened, 0);
});

test('a new remembered library replaces the previous key and forgetting removes automatic access', async () => {
  const { indexedDB, state } = memoryIndexedDB();
  const access = createDeviceAccess({ indexedDB, crypto });
  const first = fixture();
  await access.saveDeviceAccess(first, await makeKey());
  const second = fixture();
  second.kdf.salt = Buffer.alloc(24, 7).toString('base64');
  await access.saveDeviceAccess(second, await makeKey());
  assert.equal(state.records.size, 1);
  assert.equal(await access.loadDeviceAccess(first), null);
  assert.ok(await access.loadDeviceAccess(second));
  await access.forgetDeviceAccess();
  assert.equal(state.records.size, 0);
  assert.equal(await access.loadDeviceAccess(second), null);
});

test('request success does not report a write as saved before its transaction commits', async () => {
  const { indexedDB, state } = memoryIndexedDB({ abortAfterRequest: true });
  const access = createDeviceAccess({ indexedDB, crypto });
  await assert.rejects(access.saveDeviceAccess(fixture(), await makeKey()), /recordar este dispositivo/u);
  assert.equal(state.requestsSucceeded, 1);
  assert.equal(state.committed, 0);
  assert.equal(state.records.size, 0);
});

test('blocked, denied or failed storage returns no key and gives actionable write/delete failures', async () => {
  for (const options of [{ blocked: true }, { openError: true }, { requestError: true }]) {
    const { indexedDB } = memoryIndexedDB(options);
    const access = createDeviceAccess({ indexedDB, crypto });
    assert.equal(await access.loadDeviceAccess(fixture()), null);
    await assert.rejects(access.saveDeviceAccess(fixture(), await makeKey()), /recordar este dispositivo/u);
    await assert.rejects(access.forgetDeviceAccess(), /olvidar este dispositivo/u);
  }
});

test('pending database opens and pending transactions are bounded and do not leave an open connection', async () => {
  for (const options of [{ neverOpen: true }, { neverCommit: true }]) {
    const { indexedDB, state } = memoryIndexedDB(options);
    const access = createDeviceAccess({ indexedDB, crypto, timeoutMs: 20 });
    assert.equal(await access.loadDeviceAccess(fixture()), null);
    if (options.neverOpen) {
      state.finishOpen();
      assert.equal(state.closed, 1);
    } else assert.equal(state.closed, 1);
    await assert.rejects(access.saveDeviceAccess(fixture(), await makeKey()), /recordar este dispositivo/u);
  }
});

test('corrupt stored records and extractable keys cannot activate automatic access', async () => {
  const { indexedDB, state } = memoryIndexedDB();
  const access = createDeviceAccess({ indexedDB, crypto });
  const manifest = fixture();
  await access.saveDeviceAccess(manifest, await makeKey());
  const valid = state.records.get('active-library');
  for (const record of [null, {}, { ...valid, key: await makeKey(true) }, { ...valid, fingerprint: 'not-the-library' }]) {
    state.records.set('active-library', record);
    assert.equal(await access.loadDeviceAccess(manifest), null);
  }
});
