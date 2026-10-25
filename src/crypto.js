const encoder = new TextEncoder();
export function fromBase64(value) {
  return Uint8Array.from(atob(value), c => c.charCodeAt(0));
}
export function toBase64(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
export async function deriveLibraryKey(password, kdf) {
  if (kdf.name !== 'PBKDF2' || kdf.hash !== 'SHA-256' ||
      !Number.isInteger(kdf.iterations) || kdf.iterations < 100000 || kdf.iterations > 2000000) {
    throw new Error('Formato de protección no compatible.');
  }
  const salt = fromBase64(kdf.salt);
  if (salt.length < 16) throw new Error('Configuración de protección inválida.');
  const material = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: kdf.hash, salt, iterations: kdf.iterations },
    material, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'],
  );
}
export function assetAAD(version, id) { return encoder.encode(`${version}\0${id}`); }
export async function encryptAsset(bytes, key, version, id, iv) {
  return new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: assetAAD(version, id), tagLength: 128 }, key, bytes,
  ));
}
export async function decryptAsset(bytes, key, asset, version) {
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(asset.iv), additionalData: assetAAD(version, asset.id), tagLength: 128 },
    key, bytes,
  );
  if (asset.compression === 'gzip') {
    const stream = new Blob([decrypted]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }
  return new Uint8Array(decrypted);
}
