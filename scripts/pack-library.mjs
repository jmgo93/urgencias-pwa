import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, open, readFile, realpath, rename, stat, unlink } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { finished } from 'node:stream/promises';
import { createHash, randomBytes } from 'node:crypto';

export const MAGIC = Buffer.from('URG001\n', 'ascii');
const MAX_BOOTSTRAP_BYTES = 16 * 1024 * 1024;
const BLOCK_BYTES = 1024 * 1024;
const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const defaultLibrary = resolve(project, '../biblioteca-local/cifrado');
const defaultOutput = resolve(project, '../biblioteca-local/Para el movil/Biblioteca.urgencias');

function validateBootstrap(bootstrap) {
  if (bootstrap.schemaVersion !== 1 || bootstrap.algorithm !== 'AES-256-GCM'
      || !/^[a-f0-9]{20}$/.test(bootstrap.corpusVersion)
      || !bootstrap.assets || typeof bootstrap.assets !== 'object' || Array.isArray(bootstrap.assets)) {
    throw new Error('El manifiesto cifrado no tiene el formato admitido.');
  }
  if (bootstrap.kdf?.name !== 'PBKDF2' || bootstrap.kdf?.hash !== 'SHA-256'
      || !Number.isInteger(bootstrap.kdf.iterations)
      || bootstrap.kdf.iterations < 100000 || bootstrap.kdf.iterations > 2000000
      || Buffer.from(bootstrap.kdf.salt || '', 'base64').length < 16) {
    throw new Error('Los parámetros de protección del manifiesto no son válidos.');
  }
  const assets = Object.values(bootstrap.assets);
  const names = new Set();
  const ivs = new Set();
  let total = 0;
  for (const [id, asset] of Object.entries(bootstrap.assets)) {
    if (!/^(corpus|d\d{3})$/.test(id) || asset.id !== id
        || !/^[a-f0-9]{64}\.bin$/.test(asset.file)
        || !Number.isSafeInteger(asset.bytes) || asset.bytes < 16
        || Buffer.from(asset.iv || '', 'base64').length !== 12
        || ![null, 'gzip'].includes(asset.compression ?? null)
        || names.has(asset.file) || ivs.has(asset.iv)) {
      throw new Error('Un activo cifrado tiene metadatos inválidos o duplicados.');
    }
    names.add(asset.file);
    ivs.add(asset.iv);
    total += asset.bytes;
  }
  if (!Number.isSafeInteger(total) || total !== bootstrap.totalBytes
      || !Number.isSafeInteger(bootstrap.documentCount)
      || assets.length !== bootstrap.documentCount + 1 || !bootstrap.assets.corpus) {
    throw new Error('El inventario cifrado no coincide con sus totales.');
  }
  return assets;
}

async function readExactly(handle, bytes, position) {
  const buffer = Buffer.alloc(bytes);
  let read = 0;
  while (read < bytes) {
    const result = await handle.read(buffer, read, bytes - read, position + read);
    if (result.bytesRead === 0) throw new Error('El paquete está truncado.');
    read += result.bytesRead;
  }
  return buffer;
}

export async function verifyPackage(packagePath, expectedBootstrapBytes = null) {
  const handle = await open(packagePath, 'r');
  try {
    const header = await readExactly(handle, MAGIC.length + 4, 0);
    if (!header.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error('Cabecera de paquete no válida.');
    const bootstrapLength = header.readUInt32LE(MAGIC.length);
    if (bootstrapLength < 2 || bootstrapLength > MAX_BOOTSTRAP_BYTES) throw new Error('Longitud de manifiesto no válida.');
    const bootstrapBytes = await readExactly(handle, bootstrapLength, header.length);
    if (expectedBootstrapBytes && !bootstrapBytes.equals(expectedBootstrapBytes)) {
      throw new Error('El manifiesto incluido difiere del original.');
    }
    const bootstrap = JSON.parse(bootstrapBytes.toString('utf8'));
    const assets = validateBootstrap(bootstrap);
    const info = await handle.stat();
    const expectedSize = header.length + bootstrapBytes.length + bootstrap.totalBytes;
    if (info.size !== expectedSize) throw new Error('El tamaño del paquete no coincide con el inventario.');
    const packageHash = createHash('sha256').update(header).update(bootstrapBytes);
    const buffer = Buffer.alloc(BLOCK_BYTES);
    let offset = header.length + bootstrapBytes.length;
    for (const asset of assets) {
      const hash = createHash('sha256');
      let remaining = asset.bytes;
      while (remaining > 0) {
        const wanted = Math.min(remaining, buffer.length);
        const result = await handle.read(buffer, 0, wanted, offset);
        if (result.bytesRead === 0) throw new Error('Un activo del paquete está truncado.');
        const chunk = buffer.subarray(0, result.bytesRead);
        hash.update(chunk);
        packageHash.update(chunk);
        offset += result.bytesRead;
        remaining -= result.bytesRead;
      }
      if (`${hash.digest('hex')}.bin` !== asset.file) throw new Error(`Integridad incorrecta del activo ${asset.id}.`);
    }
    if (offset !== info.size) throw new Error('Hay bytes sobrantes en el paquete.');
    return {
      format: 'URG001', bootstrapBytes: bootstrapBytes.length,
      assetsVerified: assets.length, documentCount: bootstrap.documentCount,
      totalBytes: info.size, packageSha256: packageHash.digest('hex'),
      exactBootstrap: expectedBootstrapBytes ? true : null,
      everyAssetSha256Matches: true,
    };
  } finally {
    await handle.close();
  }
}

export async function packLibrary(inputDirectory = defaultLibrary, outputPath = defaultOutput) {
  const input = await realpath(resolve(inputDirectory));
  const output = resolve(outputPath);
  if (!/\.urgencias$/i.test(output)) throw new Error('El archivo de destino debe terminar en .urgencias.');
  const bootstrapBytes = await readFile(resolve(input, 'bootstrap.json'));
  if (bootstrapBytes.length > MAX_BOOTSTRAP_BYTES) throw new Error('El manifiesto supera el tamaño admitido.');
  const bootstrap = JSON.parse(bootstrapBytes.toString('utf8'));
  const assets = validateBootstrap(bootstrap);
  await mkdir(dirname(output), { recursive: true });
  const temporary = `${output}.${randomBytes(6).toString('hex')}.partial`;
  const writer = createWriteStream(temporary, { flags: 'wx', highWaterMark: BLOCK_BYTES });
  const completed = finished(writer);
  // Register a rejection handler immediately so a write error never escapes unhandled.
  completed.catch(() => {});
  let created = false;
  try {
    await once(writer, 'open');
    created = true;
    async function writeChunk(chunk) {
      if (!writer.write(chunk)) await once(writer, 'drain');
    }
    const length = Buffer.alloc(4);
    length.writeUInt32LE(bootstrapBytes.length);
    await writeChunk(MAGIC);
    await writeChunk(length);
    await writeChunk(bootstrapBytes);
    for (let index = 0; index < assets.length; index++) {
      const asset = assets[index];
      const file = await realpath(resolve(input, asset.file));
      if (!file.startsWith(input + sep)) throw new Error('Un activo sale de la biblioteca permitida.');
      if ((await stat(file)).size !== asset.bytes) throw new Error(`Tamaño incorrecto del activo ${asset.id}.`);
      const hash = createHash('sha256');
      let copied = 0;
      for await (const chunk of createReadStream(file, { highWaterMark: BLOCK_BYTES })) {
        hash.update(chunk);
        copied += chunk.length;
        await writeChunk(chunk);
      }
      if (copied !== asset.bytes || `${hash.digest('hex')}.bin` !== asset.file) {
        throw new Error(`Integridad incorrecta del activo de origen ${asset.id}.`);
      }
      if ((index + 1) % 50 === 0) console.log(`Empaquetados ${index + 1}/${assets.length} activos cifrados`);
    }
    writer.end();
    await completed;
    const report = await verifyPackage(temporary, bootstrapBytes);
    await rename(temporary, output);
    return { ...report, file: output };
  } catch (error) {
    writer.destroy();
    await completed.catch(() => {});
    if (created) await unlink(temporary).catch(() => {});
    throw error;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const report = process.argv[2] === '--verify'
      ? await verifyPackage(resolve(process.argv[3] || defaultOutput))
      : await packLibrary(process.argv[2] || defaultLibrary, process.argv[3] || defaultOutput);
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.error(`No se pudo preparar o verificar la biblioteca: ${error.message}`);
    process.exitCode = 1;
  }
}
