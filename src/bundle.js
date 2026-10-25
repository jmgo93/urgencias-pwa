const MAGIC = 'URG001\n';
const HEADER_BYTES = 11;
const MAX_MANIFEST_BYTES = 1024 * 1024;
const MAX_ASSET_BYTES = 64 * 1024 * 1024;
const MAX_BUNDLE_BYTES = 2 * 1024 * 1024 * 1024;
const MAX_ASSETS = 5000;
const filePattern = /^[a-f0-9]{64}\.bin$/iu;
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

function invalid(message) {
  throw new Error(message);
}

function base64Bytes(value, label, minimum, maximum = minimum) {
  if (typeof value !== 'string' || value.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/u.test(value)) {
    invalid(`${label}: codificación no válida.`);
  }
  let binary;
  try { binary = atob(value); } catch { invalid(`${label}: codificación no válida.`); }
  if (binary.length < minimum || binary.length > maximum || btoa(binary) !== value) {
    invalid(`${label}: longitud o codificación no válida.`);
  }
  return binary;
}

function validateManifest(manifest) {
  if (!object(manifest) || manifest.schemaVersion !== 1 || manifest.algorithm !== 'AES-256-GCM'
    || typeof manifest.corpusVersion !== 'string' || !/^[a-f0-9]{20}$/iu.test(manifest.corpusVersion)) {
    invalid('El paquete usa un formato de biblioteca no compatible.');
  }
  const { kdf } = manifest;
  if (!object(kdf) || kdf.name !== 'PBKDF2' || kdf.hash !== 'SHA-256'
    || !Number.isInteger(kdf.iterations) || kdf.iterations < 100000 || kdf.iterations > 2000000) {
    invalid('La configuración de protección del paquete no es válida.');
  }
  base64Bytes(kdf.salt, 'Sal de protección', 16, 64);
  if (!object(manifest.assets) || !Object.hasOwn(manifest.assets, 'corpus')) {
    invalid('El paquete no contiene el índice de la biblioteca.');
  }
  const assets = Object.entries(manifest.assets);
  if (!assets.length || assets.length > MAX_ASSETS) invalid('El paquete contiene demasiados elementos.');
  const files = new Set();
  const ivs = new Set();
  let totalBytes = 0;
  for (const [id, asset] of assets) {
    if (!/^[a-z0-9][a-z0-9_-]{0,127}$/iu.test(id) || !object(asset) || asset.id !== id) {
      invalid('Un elemento del paquete tiene un identificador no válido.');
    }
    if (typeof asset.file !== 'string' || !filePattern.test(asset.file)) {
      invalid('Un elemento del paquete tiene una ruta no válida.');
    }
    const file = asset.file.toLowerCase();
    if (files.has(file)) invalid('El paquete contiene rutas duplicadas.');
    files.add(file);
    if (!Number.isSafeInteger(asset.bytes) || asset.bytes < 16 || asset.bytes > MAX_ASSET_BYTES) {
      invalid('Un elemento del paquete supera el tamaño permitido o tiene una longitud no válida.');
    }
    const iv = base64Bytes(asset.iv, 'Vector de cifrado', 12);
    if (ivs.has(iv)) invalid('El paquete repite un vector de cifrado.');
    ivs.add(iv);
    if (asset.compression !== undefined && asset.compression !== null && asset.compression !== 'gzip') {
      invalid('El paquete usa una compresión no compatible.');
    }
    totalBytes += asset.bytes;
    if (!Number.isSafeInteger(totalBytes) || totalBytes > MAX_BUNDLE_BYTES) invalid('El paquete es demasiado grande.');
  }
  if (manifest.totalBytes !== undefined && manifest.totalBytes !== totalBytes) {
    invalid('El tamaño declarado de la biblioteca no coincide con sus elementos.');
  }
  if (manifest.documentCount !== undefined && (!Number.isInteger(manifest.documentCount)
    || manifest.documentCount !== assets.length - 1)) {
    invalid('El número de documentos declarado no coincide con el paquete.');
  }
  return assets.map(([, asset]) => asset);
}

/**
 * Inspect only the small header/manifest. Every encrypted asset stays a Blob slice;
 * importing the bundle never requires loading the complete book into memory.
 * Offsets are byte-based and end-exclusive.
 */
export async function inspectBundle(file) {
  if (!file || typeof file.slice !== 'function' || !Number.isSafeInteger(file.size)
    || file.size < HEADER_BYTES) invalid('El archivo no es un paquete de biblioteca válido.');
  if (file.size > MAX_BUNDLE_BYTES) invalid('El paquete supera el límite de 2 GiB.');
  const header = new Uint8Array(await file.slice(0, HEADER_BYTES).arrayBuffer());
  if (header.length !== HEADER_BYTES || new TextDecoder().decode(header.subarray(0, 7)) !== MAGIC) {
    invalid('La cabecera del paquete no es válida.');
  }
  const manifestLength = new DataView(header.buffer, header.byteOffset, header.byteLength).getUint32(7, true);
  if (!manifestLength || manifestLength > MAX_MANIFEST_BYTES) invalid('El índice del paquete supera el tamaño permitido o está vacío.');
  const manifestEnd = HEADER_BYTES + manifestLength;
  if (manifestEnd > file.size) invalid('El paquete está incompleto: falta parte del índice.');
  let manifest;
  try {
    const raw = await file.slice(HEADER_BYTES, manifestEnd).arrayBuffer();
    if (raw.byteLength !== manifestLength) invalid('Índice incompleto.');
    manifest = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw));
  } catch {
    invalid('El índice del paquete está incompleto o no es válido.');
  }
  const assets = validateManifest(manifest);
  const entries = [];
  let cursor = manifestEnd;
  for (const asset of assets) {
    const end = cursor + asset.bytes;
    if (!Number.isSafeInteger(end) || end > file.size) invalid('El paquete está incompleto: faltan documentos cifrados.');
    const blob = file.slice(cursor, end);
    if (blob.size !== asset.bytes) invalid('El paquete está incompleto: un documento tiene una longitud incorrecta.');
    entries.push({ asset, start: cursor, end, blob });
    cursor = end;
  }
  if (cursor !== file.size) invalid('El paquete contiene datos adicionales no declarados.');
  return { manifest, entries };
}

/** Verify one encrypted asset at a time before writing it to the offline cache. */
export async function verifyBundleEntry(entry) {
  if (!object(entry) || !object(entry.asset) || typeof entry.asset.file !== 'string'
    || !filePattern.test(entry.asset.file) || !entry.blob || typeof entry.blob.arrayBuffer !== 'function'
    || !Number.isSafeInteger(entry.asset.bytes) || entry.asset.bytes < 16 || entry.asset.bytes > MAX_ASSET_BYTES
    || entry.blob.size !== entry.asset.bytes) {
    invalid('No se puede verificar un elemento del paquete.');
  }
  const bytes = await entry.blob.arrayBuffer();
  if (bytes.byteLength !== entry.asset.bytes) invalid('El elemento del paquete está incompleto.');
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  const hash = [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  if (hash !== entry.asset.file.slice(0, 64).toLowerCase()) {
    invalid('La comprobación de integridad ha fallado. El paquete puede estar dañado.');
  }
  return true;
}
