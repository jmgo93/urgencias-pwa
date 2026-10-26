import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { build } from 'esbuild';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.AI_SHARE_TEST_PORT || 4184);
const result = await build({
  entryPoints: [resolve(project, 'tests/fixtures/ai-share.js')],
  outdir: resolve(project, 'tmp/ai-share-fixture'),
  bundle: true, write: false, format: 'esm', platform: 'browser', logLevel: 'silent',
});
const files = new Map(result.outputFiles.map(file => [file.path.endsWith('.css') ? '/fixture.css' : '/fixture.js', file.contents]));
const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Prueba sintética de compartir con IA</title><link rel="stylesheet" href="/fixture.css"></head><body><main style="width:min(920px,calc(100% - 32px));margin:32px auto"><h1>Prueba sintética: compartir con IA</h1><p>Todos los envíos, copias, aperturas y descargas están sustituidos por un registro. No se carga ni se comparte el libro.</p><p><label>Resultado de compartir <select id="fixture-mode"><option value="supported">Compatible</option><option value="cancel">Cancelación</option><option value="unsupported">No compatible</option><option value="error">Error de permisos</option></select></label></p><p><label><input type="checkbox" id="fixture-expire"> Invalidar el documento durante la preparación</label></p><p><button id="fixture-open" class="button button-primary" type="button">Consultar con IA</button> <button id="fixture-reset" class="button button-tonal" type="button">Reiniciar prueba</button></p><h2>Registro de acciones</h2><pre id="fixture-events" role="status" aria-live="polite" style="white-space:pre-wrap;overflow-wrap:anywhere;font-size:14px"></pre></main><script type="module" src="/fixture.js"></script></body></html>`;

createServer((request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  if (request.method !== 'GET') { response.writeHead(405).end(); return; }
  const path = new URL(request.url, 'http://localhost').pathname;
  if (path === '/') { response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end(html); return; }
  const file = files.get(path);
  if (!file) { response.writeHead(404).end(); return; }
  response.setHeader('Content-Type', path.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/javascript; charset=utf-8');
  response.end(file);
}).listen(port, '127.0.0.1', () => console.log(`Prueba sintética de IA: http://localhost:${port}/`));
