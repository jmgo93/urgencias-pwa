import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat, realpath } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(project, 'dist');
const library = resolve(project, '../biblioteca-local/cifrado');
const base = '/urgencias-pwa/';
const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.wasm': 'application/wasm', '.bin': 'application/octet-stream', '.png': 'image/png' };
createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' blob: data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (path === '/') { res.writeHead(302, { Location: base }).end(); return; }
    if (!path.startsWith(base)) { res.writeHead(404).end(); return; }
    const relative = path.slice(base.length) || 'index.html';
    const isLibrary = relative.startsWith('library/');
    const name = isLibrary ? relative.slice(8) : relative;
    if (name.split('/').some(piece => piece.startsWith('.') || piece.includes('\\'))) { res.writeHead(404).end(); return; }
    if (isLibrary && !/^(bootstrap\.json|[a-f0-9]{64}\.bin)$/.test(name)) { res.writeHead(404).end(); return; }
    const root = isLibrary ? library : dist;
    const file = resolve(root, name);
    if (!file.startsWith(root + sep)) { res.writeHead(404).end(); return; }
    const info = await stat(file);
    if (!info.isFile()) { res.writeHead(404).end(); return; }
    const realRoot = await realpath(root);
    const realFile = await realpath(file);
    if (!realFile.startsWith(realRoot + sep)) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
    res.setHeader('Content-Length', info.size);
    res.setHeader('Cache-Control', isLibrary || name === 'sw.js' || name === 'index.html' ? 'no-store' : 'public, max-age=3600');
    if (name === 'sw.js') res.setHeader('Service-Worker-Allowed', base);
    res.writeHead(200);
    if (req.method === 'HEAD') res.end(); else createReadStream(file).pipe(res);
  } catch { res.writeHead(404).end('No encontrado'); }
}).listen(port, '127.0.0.1', () => console.log(`Biblioteca local: http://localhost:${port}${base}`));
