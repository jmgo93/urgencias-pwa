import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile, stat, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer as createNetServer } from 'node:net';
import {
  assetAAD, decryptAsset, deriveLibraryKey, encryptAsset, fromBase64, toBase64,
} from '../src/crypto.js';

const encoder = new TextEncoder();
const fixturePassword = 'fixture-only-not-a-library-password';
const fixtureKdf = {
  name: 'PBKDF2', hash: 'SHA-256', iterations: 100000,
  salt: toBase64(encoder.encode('synthetic-salt-for-unit-tests')),
};
const fixtureVersion = 'unit-fixture-v1';
const fixtureId = 'synthetic-document';
const fixtureBytes = encoder.encode('Texto sintético de prueba: café, niño, 42 mmol/L.');
const fixtureKey = deriveLibraryKey(fixturePassword, fixtureKdf);

async function fixture(compression = null) {
  const key = await fixtureKey;
  const iv = randomBytes(12);
  const input = compression === 'gzip' ? gzipSync(fixtureBytes) : fixtureBytes;
  const ciphertext = await encryptAsset(input, key, fixtureVersion, fixtureId, iv);
  const asset = { id: fixtureId, iv: toBase64(iv), compression };
  return { key, ciphertext, asset };
}

test('base64 round trip preserves every byte, including zero and high bytes', () => {
  const bytes = Uint8Array.from({ length: 256 }, (_, n) => n);
  assert.deepEqual(fromBase64(toBase64(bytes)), bytes);
});

test('AES-GCM round trip retains synthetic content and uses a non-extractable key', async () => {
  const { key, ciphertext, asset } = await fixture();
  assert.equal(key.extractable, false);
  assert.equal(key.algorithm.name, 'AES-GCM');
  assert.equal(key.algorithm.length, 256);
  assert.equal(ciphertext.length, fixtureBytes.length + 16);
  assert.deepEqual(await decryptAsset(ciphertext, key, asset, fixtureVersion), fixtureBytes);
  await assert.rejects(crypto.subtle.exportKey('raw', key));
});

test('AES-GCM rejects a wrong password', async () => {
  const { ciphertext, asset } = await fixture();
  const wrongKey = await deriveLibraryKey('different-synthetic-fixture-password', fixtureKdf);
  await assert.rejects(decryptAsset(ciphertext, wrongKey, asset, fixtureVersion));
});

test('AES-GCM rejects modifications of ciphertext, authentication tag and IV', async () => {
  const { key, ciphertext, asset } = await fixture();
  for (const position of [0, Math.floor(ciphertext.length / 2), ciphertext.length - 1]) {
    const tampered = ciphertext.slice();
    tampered[position] ^= 0x01;
    await assert.rejects(decryptAsset(tampered, key, asset, fixtureVersion));
  }
  const changedIv = fromBase64(asset.iv);
  changedIv[0] ^= 0x01;
  await assert.rejects(decryptAsset(ciphertext, key, { ...asset, iv: toBase64(changedIv) }, fixtureVersion));
  await assert.rejects(decryptAsset(ciphertext.subarray(0, ciphertext.length - 1), key, asset, fixtureVersion));
});

test('authenticated additional data binds ciphertext to document ID and corpus version', async () => {
  const { key, ciphertext, asset } = await fixture();
  assert.deepEqual(assetAAD(fixtureVersion, fixtureId), encoder.encode(`${fixtureVersion}\0${fixtureId}`));
  await assert.rejects(decryptAsset(ciphertext, key, { ...asset, id: 'another-synthetic-document' }, fixtureVersion));
  await assert.rejects(decryptAsset(ciphertext, key, asset, 'unit-fixture-v2'));
});

test('Node gzip output is decoded through the browser-standard DecompressionStream API', async () => {
  assert.equal(typeof DecompressionStream, 'function');
  const { key, ciphertext, asset } = await fixture('gzip');
  assert.deepEqual(await decryptAsset(ciphertext, key, asset, fixtureVersion), fixtureBytes);
});

test('different IVs produce different ciphertext for the same synthetic content', async () => {
  const first = await fixture();
  const second = await fixture();
  assert.notEqual(first.asset.iv, second.asset.iv);
  assert.notDeepEqual(first.ciphertext, second.ciphertext);
});

test('KDF rejects unsupported algorithms, hashes and iteration values outside its bounds', async () => {
  const invalidSettings = [
    { name: 'SHA-256' }, { hash: 'SHA-1' }, { hash: 'sha-256' },
    { iterations: 99999 }, { iterations: 2000001 }, { iterations: 100000.5 },
    { iterations: '600000' }, { iterations: NaN }, { iterations: undefined },
  ];
  for (const invalid of invalidSettings) {
    await assert.rejects(deriveLibraryKey(fixturePassword, { ...fixtureKdf, ...invalid }));
  }
});

test('KDF rejects short or malformed salts', async () => {
  await assert.rejects(deriveLibraryKey(fixturePassword, { ...fixtureKdf, salt: toBase64(new Uint8Array(15)) }));
  await assert.rejects(deriveLibraryKey(fixturePassword, { ...fixtureKdf, salt: 'invalid base64!' }));
});

test('KDF accepts its minimum and maximum iteration bounds', async () => {
  for (const iterations of [100000, 2000000]) {
    const key = await deriveLibraryKey(fixturePassword, { ...fixtureKdf, iterations });
    assert.equal(key.algorithm.name, 'AES-GCM');
  }
});

const project = fileURLToPath(new URL('..', import.meta.url));
const localBootstrap = resolve(project, '../biblioteca-local/cifrado/bootstrap.json');
let hasLocalBootstrap = false;
try { await access(localBootstrap); hasLocalBootstrap = true; } catch {}

test('optional local encrypted manifest has unique 96-bit IVs and matching ciphertext sizes', {
  skip: !hasLocalBootstrap ? 'Personal encrypted manifest has not been generated locally.' : false,
}, async () => {
  // Read public bootstrap metadata only; never read the password or personal corpus.
  const bootstrap = JSON.parse(await readFile(localBootstrap, 'utf8'));
  assert.equal(bootstrap.schemaVersion, 1);
  assert.equal(bootstrap.algorithm, 'AES-256-GCM');
  assert.match(bootstrap.corpusVersion, /^[a-f0-9]{20}$/);
  assert.equal(bootstrap.kdf.iterations, 600000);
  assert.equal(fromBase64(bootstrap.kdf.salt).length, 24);
  const assets = Object.values(bootstrap.assets);
  assert.equal(assets.length, bootstrap.documentCount + 1);
  assert.equal(new Set(assets.map(asset => asset.iv)).size, assets.length);
  assert.equal(new Set(assets.map(asset => asset.file)).size, assets.length);
  assert.equal(assets.reduce((n, asset) => n + asset.bytes, 0), bootstrap.totalBytes);
  for (const [id, asset] of Object.entries(bootstrap.assets)) {
    assert.equal(asset.id, id);
    assert.match(id, /^(corpus|d\d{3})$/);
    assert.equal(fromBase64(asset.iv).length, 12);
    assert.match(asset.file, /^[a-f0-9]{64}\.bin$/);
    assert.ok(asset.bytes >= 16);
    const info = await stat(resolve(localBootstrap, '..', asset.file));
    assert.equal(info.size, asset.bytes);
  }
});

const distPath = resolve(project, 'dist');
let hasDist = false;
try { await access(distPath); hasDist = true; } catch {}

test('optional public build excludes personal PDF, corpus, encrypted packages and access files', {
  skip: !hasDist ? 'Public build has not been generated locally.' : false,
}, async () => {
  const privateSourceDigest = '8840ec68ac1d05cb9d90639b584ad1a1a2fff2268ca5cb105e385f8c9eb26c00';
  async function inspect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      assert.equal(entry.isSymbolicLink(), false, 'Build must contain regular files and directories only.');
      if (entry.isDirectory()) { await inspect(path); continue; }
      assert.doesNotMatch(entry.name, /\.(pdf|bin|urgencias|pem|key)$/i);
      assert.doesNotMatch(entry.name, /^(corpus|bootstrap)\.json$|ACCESO_LOCAL|\.env/i);
      if (/\.(html|js|css|json|md|txt)$/i.test(entry.name)) {
        const text = await readFile(path, 'utf8');
        assert.equal(text.includes(privateSourceDigest), false);
        assert.doesNotMatch(text, /pagina-original-157|"sourcePageCount"\s*:\s*1101|^Contraseña: /m);
      }
    }
  }
  await inspect(distPath);
});

test('local HTTP server rejects private paths, traversal attempts and write methods', { timeout: 15000 }, async () => {
  const reservation = createNetServer();
  await new Promise((resolveListen, reject) => {
    reservation.once('error', reject);
    reservation.listen(0, '127.0.0.1', resolveListen);
  });
  const port = reservation.address().port;
  await new Promise(resolveClose => reservation.close(resolveClose));
  const child = spawn(process.execPath, ['scripts/serve.mjs'], {
    cwd: project,
    env: { ...process.env, PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  try {
    await new Promise((resolveReady, reject) => {
      const timer = setTimeout(() => reject(new Error('Local test server did not become ready.')), 5000);
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('exit', () => { clearTimeout(timer); reject(new Error('Local test server exited before readiness.')); });
      child.stdout.on('data', () => { clearTimeout(timer); resolveReady(); });
    });
    const origin = `http://127.0.0.1:${port}`;
    const forbidden = [
      '/ACCESO_LOCAL.txt',
      '/biblioteca-local/ACCESO_LOCAL.txt',
      '/urgencias-pwa/ACCESO_LOCAL.txt',
      '/urgencias-pwa/corpus.json',
      '/urgencias-pwa/library/ACCESO_LOCAL.txt',
      '/urgencias-pwa/library/corpus.json',
      '/urgencias-pwa/library/pdf/d001.pdf',
      '/urgencias-pwa/library/%2e%2e%2fACCESO_LOCAL.txt',
      '/urgencias-pwa/%2e%2e%2f%2e%2e%2fbiblioteca-local%2fACCESO_LOCAL.txt',
      '/urgencias-pwa/library/..%5cACCESO_LOCAL.txt',
      '/urgencias-pwa/.env',
      '/urgencias-pwa/%00',
    ];
    for (const path of forbidden) {
      const response = await fetch(origin + path, { signal: AbortSignal.timeout(2000) });
      assert.equal(response.status, 404);
      await response.arrayBuffer();
    }
    const written = await fetch(origin + '/urgencias-pwa/', { method: 'POST', signal: AbortSignal.timeout(2000) });
    assert.equal(written.status, 405);
    if (hasDist) {
      const assets = await readdir(resolve(distPath, 'assets'));
      const worker = assets.find(name => name.startsWith('pdf.worker.') && name.endsWith('.mjs'));
      assert.ok(worker, 'PDF worker is bundled locally.');
      const response = await fetch(origin + '/urgencias-pwa/assets/' + worker, { method: 'HEAD' });
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type'), /^text\/javascript/);
    }
    if (hasLocalBootstrap) {
      const metadata = await fetch(origin + '/urgencias-pwa/library/bootstrap.json', { signal: AbortSignal.timeout(2000) });
      assert.equal(metadata.status, 200);
      assert.equal(metadata.headers.get('cache-control'), 'no-store');
      assert.equal(metadata.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(metadata.headers.get('referrer-policy'), 'no-referrer');
      assert.match(metadata.headers.get('content-security-policy'), /default-src 'self'/);
      const body = await metadata.json();
      assert.equal(body.algorithm, 'AES-256-GCM');
    }
  } finally {
    child.kill();
    if (child.exitCode === null && child.signalCode === null) {
      await new Promise(resolveExit => child.once('exit', resolveExit));
    }
  }
});
