import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { deriveLibraryKey, encryptAsset, toBase64 } from '../src/crypto.js';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const library = resolve(project, '../biblioteca-local');
const input = resolve(process.argv[2] || resolve(library, 'preparado'));
const output = resolve(process.argv[3] || resolve(library, 'cifrado'));
await mkdir(output, { recursive: true });
const corpusBytes = await readFile(resolve(input, 'corpus.json'));
const corpus = JSON.parse(corpusBytes);
const accessPath = resolve(library, 'ACCESO_LOCAL.txt');
let password = process.env.URGENCIAS_LIBRARY_PASSWORD;
if (!password) {
  try { password = (await readFile(accessPath, 'utf8')).match(/^Contraseña: (.+)$/m)?.[1]; } catch {}
}
if (!password) password = randomBytes(21).toString('base64url');
if (password.length < 16) throw new Error('Usa una contraseña de al menos 16 caracteres.');
const accessText = `ACCESO A LA BIBLIOTECA LOCAL\n\nDirección: http://localhost:4173/urgencias-pwa/\nContraseña: ${password}\n\nAbre la aplicación, copia la contraseña y pulsa Desbloquear biblioteca.\nEste archivo no se sirve en la web ni se incorpora al repositorio.\nNo compartas la carpeta biblioteca-local ni la contraseña.\n`;
const corpusVersion = createHash('sha256').update(corpusBytes).digest('hex').slice(0, 20);
const kdf = { name: 'PBKDF2', hash: 'SHA-256', iterations: 600000, salt: toBase64(randomBytes(24)) };
const key = await deriveLibraryKey(password, kdf);
password = undefined;
const assets = {};
async function pack(id, bytes, compression) {
  const iv = randomBytes(12);
  const source = compression === 'gzip' ? gzipSync(bytes) : bytes;
  const encrypted = await encryptAsset(source, key, corpusVersion, id, iv);
  const file = `${createHash('sha256').update(encrypted).digest('hex')}.bin`;
  await writeFile(resolve(output, file), encrypted);
  assets[id] = { id, file, iv: toBase64(iv), compression: compression || null, bytes: encrypted.length };
}
await pack('corpus', corpusBytes, 'gzip');
for (let i = 0; i < corpus.documents.length; i++) {
  const document = corpus.documents[i];
  const path = resolve(input, document.fileName);
  if (!path.startsWith(input + '\\') && !path.startsWith(input + '/')) throw new Error('Ruta fuera del corpus.');
  await pack(document.id, await readFile(path));
  if ((i + 1) % 25 === 0) console.log(`Cifrados ${i + 1}/${corpus.documents.length} documentos`);
}
const bootstrapTemp = resolve(output, `bootstrap.${process.pid}.tmp`);
await writeFile(bootstrapTemp, JSON.stringify({
  schemaVersion: 1, corpusVersion, algorithm: 'AES-256-GCM', kdf, assets,
  documentCount: corpus.documents.length, pageCount: corpus.sourcePageCount,
  totalBytes: Object.values(assets).reduce((n, asset) => n + asset.bytes, 0),
}, null, 2));
// Keep the previous bootstrap and access file intact until every encrypted asset exists.
await rename(bootstrapTemp, resolve(output, 'bootstrap.json'));
await writeFile(accessPath, accessText, { mode: 0o600 });
console.log(`Biblioteca cifrada lista: ${corpus.documents.length} documentos. Clave en biblioteca-local/ACCESO_LOCAL.txt (no mostrada).`);
