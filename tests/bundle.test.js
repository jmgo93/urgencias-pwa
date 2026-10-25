import assert from 'node:assert/strict';
import test from 'node:test';
import { inspectBundle, verifyBundleEntry } from '../src/bundle.js';

const encoder = new TextEncoder();
const base64 = (bytes) => Buffer.from(bytes).toString('base64');
const fixture = async () => {
  const parts = [new Uint8Array(20).fill(7), new Uint8Array(32).fill(9)];
  const assets = {};
  for (const [index, id] of ['corpus', 'd001'].entries()) {
    const digest = await crypto.subtle.digest('SHA-256', parts[index]);
    assets[id] = {
      id, file: `${Buffer.from(digest).toString('hex')}.bin`, bytes: parts[index].length,
      iv: base64(new Uint8Array(12).fill(index + 1)), compression: index ? null : 'gzip',
    };
  }
  return {
    manifest: {
      schemaVersion: 1, algorithm: 'AES-256-GCM', corpusVersion: '0123456789abcdefabcd',
      kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: 600000, salt: base64(new Uint8Array(24).fill(3)) },
      assets, documentCount: 1, totalBytes: 52,
    }, parts,
  };
};
function pack(manifest, parts, raw) {
  const json = raw ?? encoder.encode(JSON.stringify(manifest));
  const header = new Uint8Array(11);
  header.set(encoder.encode('URG001\n'));
  new DataView(header.buffer).setUint32(7, json.length, true);
  return new Blob([header, json, ...parts]);
}
const change = async (mutate) => {
  const { manifest, parts } = await fixture();
  mutate(manifest);
  return pack(manifest, parts);
};

test('valid bundle uses ordered, exact Blob slices and verifies their SHA-256', async () => {
  const { manifest, parts } = await fixture();
  const file = pack(manifest, parts);
  Object.defineProperty(file, 'arrayBuffer', { value: () => { throw new Error('Must not read the entire bundle.'); } });
  const result = await inspectBundle(file);
  assert.deepEqual(result.manifest, manifest);
  assert.deepEqual(result.entries.map((entry) => entry.asset.id), ['corpus', 'd001']);
  assert.equal(result.entries[0].start, 11 + encoder.encode(JSON.stringify(manifest)).length);
  assert.equal(result.entries[0].end, result.entries[1].start);
  assert.equal(result.entries[1].end, file.size);
  for (const [index, entry] of result.entries.entries()) {
    assert.deepEqual(new Uint8Array(await entry.blob.arrayBuffer()), parts[index]);
    assert.equal(await verifyBundleEntry(entry), true);
  }
});

test('truncated header, wrong magic and oversized manifest are rejected', async () => {
  await assert.rejects(inspectBundle(new Blob(['URG001\n'])), /válido/u);
  await assert.rejects(inspectBundle(new Blob(['BAD001\n', new Uint8Array(4)])), /cabecera/u);
  for (const length of [0, 1024 * 1024 + 1, 0xffffffff]) {
    const header = new Uint8Array(11);
    header.set(encoder.encode('URG001\n'));
    new DataView(header.buffer).setUint32(7, length, true);
    await assert.rejects(inspectBundle(new Blob([header])), /tamaño|vacío/u);
  }
  await assert.rejects(inspectBundle({ size: 2 * 1024 ** 3 + 1, slice() { throw new Error('Must not read.'); } }), /2 GiB/u);
});

test('truncated JSON/assets, trailing data, invalid JSON and invalid UTF-8 are rejected', async () => {
  const { manifest, parts } = await fixture();
  const full = pack(manifest, parts);
  await assert.rejects(inspectBundle(full.slice(0, 15)), /incompleto/u);
  await assert.rejects(inspectBundle(full.slice(0, full.size - 1)), /incompleto/u);
  await assert.rejects(inspectBundle(new Blob([full, 'trailing'])), /adicionales/u);
  await assert.rejects(inspectBundle(pack(null, [], encoder.encode('{bad json'))), /índice/u);
  await assert.rejects(inspectBundle(pack(null, [], Uint8Array.of(0xff, 0xfe))), /índice/u);
});

test('manifest identity, KDF, salt, IV, compression and declared counts are validated', async () => {
  const mutations = [
    (value) => { value.schemaVersion = 2; },
    (value) => { value.algorithm = 'AES-CBC'; },
    (value) => { value.corpusVersion = 'not-a-version'; },
    (value) => { value.kdf.name = 'scrypt'; },
    (value) => { value.kdf.hash = 'SHA-1'; },
    (value) => { value.kdf.iterations = 99999; },
    (value) => { value.kdf.iterations = 2000001; },
    (value) => { value.kdf.iterations = 600000.5; },
    (value) => { value.kdf.salt = base64(new Uint8Array(15)); },
    (value) => { value.kdf.salt = base64(new Uint8Array(65)); },
    (value) => { value.kdf.salt = '!!!!'; },
    (value) => { value.assets.corpus.iv = base64(new Uint8Array(11)); },
    (value) => { value.assets.d001.iv = value.assets.corpus.iv; },
    (value) => { value.assets.corpus.compression = 'zip'; },
    (value) => { value.documentCount = 2; },
    (value) => { value.totalBytes = 53; },
  ];
  for (const mutate of mutations) await assert.rejects(inspectBundle(await change(mutate)));
});

test('missing index, asset identity, paths, duplicate paths and byte limits are rejected', async () => {
  const mutations = [
    (value) => { delete value.assets.corpus; },
    (value) => { value.assets = []; },
    (value) => { value.assets.corpus.id = 'other'; },
    (value) => { value.assets.corpus.file = '../private.bin'; },
    (value) => { value.assets.corpus.file = `${'a'.repeat(63)}.bin`; },
    (value) => { value.assets.d001.file = value.assets.corpus.file; },
    (value) => { value.assets.d001.file = value.assets.corpus.file.toUpperCase().replace('.BIN', '.bin'); },
    (value) => { value.assets.corpus.bytes = 15; },
    (value) => { value.assets.corpus.bytes = 64 * 1024 ** 2 + 1; },
    (value) => { value.assets.corpus.bytes = 20.5; },
    (value) => { value.assets.corpus.bytes = '20'; },
  ];
  for (const mutate of mutations) await assert.rejects(inspectBundle(await change(mutate)));
  const tooMany = await fixture();
  tooMany.manifest.assets = Object.fromEntries(Array.from({ length: 5001 }, (_, index) => [index ? `d${index}` : 'corpus', {}]));
  await assert.rejects(inspectBundle(pack(tooMany.manifest, [])), /demasiados/u);
});

test('integrity verification rejects modified content and reads at most one asset', async () => {
  const { manifest, parts } = await fixture();
  const { entries } = await inspectBundle(pack(manifest, parts));
  await assert.rejects(verifyBundleEntry({ ...entries[0], blob: new Blob([new Uint8Array(20)]) }), /integridad/u);
  await assert.rejects(verifyBundleEntry({ ...entries[0], blob: new Blob([new Uint8Array(19)]) }), /verificar/u);
  let called = false;
  await assert.rejects(verifyBundleEntry({
    asset: { ...entries[0].asset, bytes: 64 * 1024 ** 2 + 1 },
    blob: { size: 64 * 1024 ** 2 + 1, arrayBuffer() { called = true; throw new Error('Must not read.'); } },
  }), /verificar/u);
  assert.equal(called, false);
});
