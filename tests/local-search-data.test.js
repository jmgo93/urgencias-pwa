import assert from 'node:assert/strict';
import test from 'node:test';
import { createLocalSearchData } from '../src/local-search-data.js';

const fixture = () => ({
  corpusVersion: '0123456789abcdefabcd',
  kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: 600000, salt: Buffer.alloc(24, 3).toString('base64') },
  assets: { corpus: { file: `${'a'.repeat(64)}.bin`, iv: Buffer.alloc(12, 1).toString('base64') } },
});
const makeKey = (extractable = false) => crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, extractable, ['encrypt', 'decrypt']);
const prepared = () => ({ schemaVersion: 1, index: { terms: [['synthetic-private-index-term', 2]] }, documents: [{ id: 'fixture', title: 'Synthetic prepared data' }] });
const history = () => [{ query: 'Synthetic private query 123', sectionId: 's003', kind: 'chapter', lastUsedAt: 1800000000000 }];

function memoryIndexedDB(options = {}) {
  const state = { records: new Map(), created: false, committed: 0, closed: 0, ...options };
  return {
    state,
    indexedDB: {
      open() {
        const request = {};
        const database = {
          objectStoreNames: { contains: () => state.created },
          createObjectStore() { state.created = true; },
          close() { state.closed++; },
          transaction(_name, mode) {
            let aborted = false;
            const transaction = {
              abort() { aborted = true; queueMicrotask(() => transaction.onabort?.()); },
              objectStore() {
                function operation(type, value, id) {
                  const entry = {};
                  queueMicrotask(() => {
                    if (aborted) return;
                    if (state.requestError) { entry.error = new DOMException('No space', 'QuotaExceededError'); entry.onerror?.(); return; }
                    entry.result = type === 'get' ? structuredClone(state.records.get(id)) : id;
                    const saved = type === 'put' ? structuredClone(value) : null;
                    entry.onsuccess?.();
                    if (state.neverCommit) return;
                    setTimeout(() => {
                      if (aborted) return;
                      if (state.abortAfterRequest) { transaction.error = new DOMException('Commit aborted', 'AbortError'); transaction.onabort?.(); return; }
                      if (type === 'put') state.records.set(id, saved);
                      if (type === 'delete') state.records.delete(id);
                      if (type === 'clear') state.records.clear();
                      state.committed++;
                      transaction.oncomplete?.();
                    }, 0);
                  });
                  return entry;
                }
                const write = (type, value, id) => { assert.equal(mode, 'readwrite'); return operation(type, value, id); };
                return {
                  get: id => operation('get', null, id), put: (value, id) => write('put', value, id),
                  delete: id => write('delete', null, id), clear: () => write('clear'),
                };
              },
            };
            return transaction;
          },
        };
        state.finishOpen = () => {
          request.result = database;
          if (!state.created) request.onupgradeneeded?.();
          request.onsuccess?.();
        };
        queueMicrotask(() => {
          if (state.neverOpen) return;
          if (state.blocked) { request.onblocked?.(); return; }
          if (state.openError) { request.error = new DOMException('Denied', 'SecurityError'); request.onerror?.(); return; }
          state.finishOpen();
        });
        return request;
      },
    },
  };
}

test('prepared index and query history round-trip while persistent records contain ciphertext only', async () => {
  const { indexedDB, state } = memoryIndexedDB();
  const data = createLocalSearchData({ indexedDB, crypto });
  const manifest = fixture();
  const key = await makeKey();
  await data.writePreparedSearch(manifest, key, prepared());
  await data.writeSearchHistory(manifest, key, history());
  assert.deepEqual(await data.readPreparedSearch(manifest, key), prepared());
  assert.deepEqual(await data.readSearchHistory(manifest, key), history());
  assert.equal(state.records.size, 2);
  for (const [id, record] of state.records) {
    assert.match(id, /^[a-f0-9]{64}:(prepared-search|history):v1$/u);
    assert.deepEqual(Object.keys(record).sort(), ['ciphertext', 'encoding', 'iv', 'schemaVersion']);
    assert.equal(record.schemaVersion, 1);
    assert.equal(record.encoding, id.includes(':history:') ? 'json' : 'gzip');
    assert.equal(record.iv.byteLength, 12);
    assert.ok(record.ciphertext instanceof ArrayBuffer);
    assert.ok(record.ciphertext.byteLength > 16);
    const cipher = Buffer.from(record.ciphertext);
    assert.equal(cipher.includes(Buffer.from('Synthetic private query')), false);
    assert.equal(cipher.includes(Buffer.from('synthetic-private-index-term')), false);
    assert.equal(JSON.stringify(record).includes('private-query'), false);
  }
});

test('prepared JSON is compressed before encryption while history retains its JSON encoding', async () => {
  const { indexedDB, state } = memoryIndexedDB();
  const data = createLocalSearchData({ indexedDB, crypto });
  const manifest = fixture();
  const key = await makeKey();
  const repeated = { schemaVersion: 1, index: { syntheticTerms: 'Synthetic compression fixture only. '.repeat(16000) } };
  await data.writePreparedSearch(manifest, key, repeated);
  const record = [...state.records.values()][0];
  assert.equal(record.encoding, 'gzip');
  assert.ok(record.ciphertext.byteLength < new TextEncoder().encode(JSON.stringify(repeated)).byteLength / 10);
  assert.deepEqual(await data.readPreparedSearch(manifest, key), repeated);
  await data.writeSearchHistory(manifest, key, history());
  const historyRecord = [...state.records.entries()].find(([id]) => id.includes(':history:'))[1];
  assert.equal(historyRecord.encoding, 'json');
  assert.equal(historyRecord.ciphertext.byteLength, new TextEncoder().encode(JSON.stringify(history())).byteLength + 16);
});

test('encoding is authenticated and cannot be changed to reinterpret a stored encrypted payload', async () => {
  const { indexedDB, state } = memoryIndexedDB();
  const data = createLocalSearchData({ indexedDB, crypto });
  const manifest = fixture();
  const key = await makeKey();
  await data.writePreparedSearch(manifest, key, prepared());
  await data.writeSearchHistory(manifest, key, history());
  for (const [id, record] of state.records) {
    state.records.set(id, { ...record, encoding: record.encoding === 'gzip' ? 'json' : 'gzip' });
  }
  assert.equal(await data.readPreparedSearch(manifest, key), null);
  assert.deepEqual(await data.readSearchHistory(manifest, key), []);
});

test('every encrypted write uses a new IV, including repeated identical queries', async () => {
  const { indexedDB, state } = memoryIndexedDB();
  const data = createLocalSearchData({ indexedDB, crypto });
  const manifest = fixture();
  const key = await makeKey();
  await data.writeSearchHistory(manifest, key, history());
  const first = structuredClone([...state.records.values()][0]);
  await data.writeSearchHistory(manifest, key, history());
  const second = [...state.records.values()][0];
  assert.notDeepEqual(second.iv, first.iv);
  assert.notDeepEqual(new Uint8Array(second.ciphertext), new Uint8Array(first.ciphertext));
});

test('wrong keys, tampered ciphertext and changed IVs cannot expose saved private data', async () => {
  const { indexedDB, state } = memoryIndexedDB();
  const data = createLocalSearchData({ indexedDB, crypto });
  const manifest = fixture();
  const key = await makeKey();
  await data.writePreparedSearch(manifest, key, prepared());
  await data.writeSearchHistory(manifest, key, history());
  assert.equal(await data.readPreparedSearch(manifest, await makeKey()), null);
  assert.deepEqual(await data.readSearchHistory(manifest, await makeKey()), []);
  const entries = [...state.records.entries()].map(([id, value]) => [id, structuredClone(value)]);
  for (const mutate of [record => { new Uint8Array(record.ciphertext)[0] ^= 1; }, record => { record.iv[0] ^= 1; }, record => { record.schemaVersion = 2; }]) {
    for (const [id, original] of entries) { const record = structuredClone(original); mutate(record); state.records.set(id, record); }
    assert.equal(await data.readPreparedSearch(manifest, key), null);
    assert.deepEqual(await data.readSearchHistory(manifest, key), []);
  }
});

test('authenticated context separates index from history even if storage records are swapped', async () => {
  const { indexedDB, state } = memoryIndexedDB();
  const data = createLocalSearchData({ indexedDB, crypto });
  const manifest = fixture();
  const key = await makeKey();
  await data.writePreparedSearch(manifest, key, prepared());
  await data.writeSearchHistory(manifest, key, history());
  const [first, second] = [...state.records.entries()];
  state.records.set(first[0], second[1]);
  state.records.set(second[0], first[1]);
  assert.equal(await data.readPreparedSearch(manifest, key), null);
  assert.deepEqual(await data.readSearchHistory(manifest, key), []);
});

test('different library versions, key parameters and corpus files never reuse prepared data or history', async () => {
  const { indexedDB } = memoryIndexedDB();
  const data = createLocalSearchData({ indexedDB, crypto });
  const manifest = fixture();
  const key = await makeKey();
  await data.writePreparedSearch(manifest, key, prepared());
  await data.writeSearchHistory(manifest, key, history());
  for (const mutate of [
    value => { value.corpusVersion = 'fedcba9876543210abcd'; },
    value => { value.kdf.iterations = 700000; },
    value => { value.kdf.salt = Buffer.alloc(24, 9).toString('base64'); },
    value => { value.assets.corpus.file = `${'b'.repeat(64)}.bin`; },
    value => { value.assets.corpus.iv = Buffer.alloc(12, 9).toString('base64'); },
  ]) {
    const changed = structuredClone(manifest);
    mutate(changed);
    assert.equal(await data.readPreparedSearch(changed, key), null);
    assert.deepEqual(await data.readSearchHistory(changed, key), []);
  }
});

test('history retains at most twenty entries and only its four allowed fields', async () => {
  const { indexedDB } = memoryIndexedDB();
  const data = createLocalSearchData({ indexedDB, crypto });
  const key = await makeKey();
  const entries = Array.from({ length: 25 }, (_, index) => ({ ...history()[0], query: `Synthetic query ${index}`, ignored: 'not retained' }));
  await data.writeSearchHistory(fixture(), key, entries);
  const saved = await data.readSearchHistory(fixture(), key);
  assert.equal(saved.length, 20);
  assert.equal(saved[0].query, 'Synthetic query 0');
  assert.equal(saved[19].query, 'Synthetic query 19');
  assert.deepEqual(Object.keys(saved[0]).sort(), ['kind', 'lastUsedAt', 'query', 'sectionId']);
  for (const mutate of [
    value => { value.query = ''; }, value => { value.query = 42; }, value => { value.sectionId = null; },
    value => { value.kind = {}; }, value => { value.lastUsedAt = -1; }, value => { value.lastUsedAt = NaN; },
  ]) {
    const entry = structuredClone(history()[0]);
    mutate(entry);
    await assert.rejects(data.writeSearchHistory(fixture(), key, [entry]), /historial/u);
  }
  await assert.rejects(data.writeSearchHistory(fixture(), key, {}), /historial/u);
});

test('clearing history preserves the prepared index, and forgetting removes every saved library', async () => {
  const { indexedDB, state } = memoryIndexedDB();
  const data = createLocalSearchData({ indexedDB, crypto });
  const manifest = fixture();
  const key = await makeKey();
  await data.writePreparedSearch(manifest, key, prepared());
  await data.writeSearchHistory(manifest, key, history());
  await data.clearSearchHistory(manifest);
  assert.deepEqual(await data.readSearchHistory(manifest, key), []);
  assert.deepEqual(await data.readPreparedSearch(manifest, key), prepared());
  const second = fixture();
  second.corpusVersion = 'fedcba9876543210abcd';
  await data.writeSearchHistory(second, key, history());
  await data.forgetLocalSearchData();
  assert.equal(state.records.size, 0);
  assert.equal(await data.readPreparedSearch(manifest, key), null);
  assert.deepEqual(await data.readSearchHistory(second, key), []);
});

test('storage absence or denial falls back to uncached search without persisting plaintext', async () => {
  const key = await makeKey();
  for (const indexedDB of [null, memoryIndexedDB({ blocked: true }).indexedDB, memoryIndexedDB({ openError: true }).indexedDB,
    memoryIndexedDB({ requestError: true }).indexedDB]) {
    const data = createLocalSearchData({ indexedDB, crypto });
    assert.equal(await data.readPreparedSearch(fixture(), key), null);
    assert.deepEqual(await data.readSearchHistory(fixture(), key), []);
    await assert.rejects(data.writePreparedSearch(fixture(), key, prepared()), /guardar el buscador/u);
    await assert.rejects(data.writeSearchHistory(fixture(), key, history()), /guardar el historial/u);
    if (indexedDB === null) { await data.clearSearchHistory(fixture()); await data.forgetLocalSearchData(); }
    else {
      await assert.rejects(data.clearSearchHistory(fixture()), /borrar el historial/u);
      await assert.rejects(data.forgetLocalSearchData(), /eliminar los datos/u);
    }
  }
});

test('writes require a successful commit and bounded operations close late database connections', async () => {
  const key = await makeKey();
  for (const options of [{ abortAfterRequest: true }, { neverOpen: true }, { neverCommit: true }]) {
    const { indexedDB, state } = memoryIndexedDB(options);
    const data = createLocalSearchData({ indexedDB, crypto, timeoutMs: 20 });
    await assert.rejects(data.writePreparedSearch(fixture(), key, prepared()), /guardar el buscador/u);
    assert.equal(state.committed, 0);
    assert.equal(state.records.size, 0);
    if (options.neverOpen) { state.finishOpen(); assert.equal(state.closed, 1); }
    assert.equal(await data.readPreparedSearch(fixture(), key), null);
  }
});

test('forgetting while encryption is pending prevents that old write from recreating private data', async () => {
  const { indexedDB, state } = memoryIndexedDB();
  let releaseEncryption;
  let encryptionStarted;
  const started = new Promise(resolve => { encryptionStarted = resolve; });
  const heldCrypto = {
    CryptoKey, getRandomValues: value => crypto.getRandomValues(value),
    subtle: {
      digest: (...args) => crypto.subtle.digest(...args),
      encrypt: async (...args) => {
        encryptionStarted();
        await new Promise(resolve => { releaseEncryption = resolve; });
        return crypto.subtle.encrypt(...args);
      },
    },
  };
  const data = createLocalSearchData({ indexedDB, crypto: heldCrypto });
  const pending = data.writeSearchHistory(fixture(), await makeKey(), history());
  const rejection = assert.rejects(pending, /guardar el historial/u);
  await started;
  await data.forgetLocalSearchData();
  releaseEncryption();
  await rejection;
  assert.equal(state.records.size, 0);
});

test('extractable keys, invalid index payloads and unsupported manifests never get cached', async () => {
  const { indexedDB, state } = memoryIndexedDB();
  const data = createLocalSearchData({ indexedDB, crypto });
  const key = await makeKey();
  await assert.rejects(data.writePreparedSearch(fixture(), await makeKey(true), prepared()), /guardar el buscador/u);
  for (const invalid of [null, [], 'not an index']) await assert.rejects(data.writePreparedSearch(fixture(), key, invalid), /guardar el buscador/u);
  assert.equal(await data.readPreparedSearch({}, key), null);
  assert.deepEqual(await data.readSearchHistory({}, key), []);
  assert.equal(state.records.size, 0);
});
