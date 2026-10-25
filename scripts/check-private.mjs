import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(process.argv[2] || 'dist');
const rejected = [];
async function walk(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const file = resolve(dir, item.name);
    if (item.isDirectory()) await walk(file);
    else {
      if (/\.(pdf|bin|urgencias|pem|key)$/i.test(item.name) || /^(corpus|bootstrap)\.json$|ACCESO_LOCAL/i.test(item.name)) rejected.push(file);
      if (/\.(html|js|css|json|md|txt)$/i.test(item.name)) {
        const text = await readFile(file, 'utf8');
        if (/8840ec68ac1d05cb9d90639b584ad1a1a2fff2268ca5cb105e385f8c9eb26c00|pagina-original-157|"sourcePageCount"\s*:\s*1101/.test(text)) rejected.push(file);
      }
    }
  }
}
await walk(root);
if (rejected.length) throw new Error(`Contenido personal detectado en artefacto público: ${rejected.join(', ')}`);
console.log('Artefacto público comprobado: sin PDF, corpus, paquetes ni claves personales.');
