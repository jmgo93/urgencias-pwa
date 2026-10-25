import { cp, mkdir } from 'node:fs/promises';
for (const name of ['cmaps', 'standard_fonts', 'wasm']) {
  const output = new URL(`../public/vendor/pdfjs/${name}/`, import.meta.url);
  await mkdir(output, { recursive: true });
  await cp(new URL(`../node_modules/pdfjs-dist/${name}/`, import.meta.url), output, { recursive: true });
}
