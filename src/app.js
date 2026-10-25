import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/poppins/latin-600.css';
import '@fontsource/poppins/latin-700.css';
import './styles.css';
import './reader.css';
import { mountUI, escapeHtml } from './ui.js';
import { deriveLibraryKey, decryptAsset } from './crypto.js';
import { inspectBundle, verifyBundleEntry } from './bundle.js';
import { reconstructPage } from './page-text.js';
import { disposePDFTask } from './pdf-lifecycle.js';
import pdfWorkerURL from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

const ui = mountUI(document.querySelector('#app'));
const e = ui.elements;
const base = new URL('./', document.baseURI);
const libraryURL = new URL('library/', base);
const localHost = ['localhost', '127.0.0.1'].includes(location.hostname);
if (!localHost) document.querySelector('.local-badge').lastChild.textContent = ' Biblioteca del dispositivo';
const importer = document.createElement('div');
importer.className = 'library-import';
importer.innerHTML = `<button id="import-library-button" type="button" class="button button-tonal">Importar biblioteca del dispositivo</button><input id="library-file" type="file" hidden aria-describedby="import-status"><p id="import-status" role="status" aria-live="polite">Selecciona Biblioteca.urgencias una vez. El archivo permanece en este dispositivo y no se sube a Internet.</p>`;
document.querySelector('.unlock-card').append(importer);
document.querySelector('#import-library-button').addEventListener('click', () => document.querySelector('#library-file').click());
const formatBytes = bytes => `${(bytes / 1048576).toFixed(1)} MB`;
let manifest;
let session;
let results = [];
let currentResult;
let resultIndex = -1;
let queryRequest = 0;
let debounce;
let lockTimer;
let searchScroll = 0;
let pdfLibrary;
let pdfDocument;
let pdfLoadingTask;
let pdfBytes;
let pdfDocumentId;
let renderTask;
let renderGeneration = 0;
let openGeneration = 0;
let pageNumber = 1;
let zoom = 1;
let blobURL;
let installPrompt;
let offlineAbort;

function touchSession() {
  clearTimeout(lockTimer);
  if (session) lockTimer = setTimeout(() => lock('La biblioteca se ha bloqueado tras 15 minutos sin actividad.'), 15 * 60 * 1000);
}
for (const event of ['pointerdown', 'keydown']) document.addEventListener(event, touchSession, { passive: true });

async function fetchSafe(url) {
  try {
    const response = await fetch(url, { credentials: 'omit', cache: 'no-store' });
    if (!response.ok) throw new Error('Archivo no disponible.');
    return response;
  } catch (error) {
    const response = await caches.match(url);
    if (response) return response;
    throw error;
  }
}
function assetURL(asset) {
  if (!asset || !/^[a-f0-9]{64}\.bin$/.test(asset.file)) throw new Error('Archivo de biblioteca inválido.');
  return new URL(asset.file, libraryURL).href;
}
function validateManifest(value) {
  if (value.schemaVersion !== 1 || value.algorithm !== 'AES-256-GCM' || !value.assets?.corpus ||
      !/^[a-f0-9]{20}$/.test(value.corpusVersion)) throw new Error('Biblioteca no compatible.');
  for (const [id, asset] of Object.entries(value.assets)) {
    if (asset.id !== id) throw new Error('Manifiesto inválido.');
    assetURL(asset);
  }
  return value;
}
async function loadManifest() {
  return validateManifest(await (await fetchSafe(new URL('bootstrap.json', libraryURL).href)).json());
}
async function readAsset(id, activeSession = session) {
  if (!activeSession) throw new Error('La biblioteca está bloqueada.');
  const asset = activeSession.manifest.assets[id];
  const cipher = await (await fetchSafe(assetURL(asset))).arrayBuffer();
  if (session !== activeSession) throw new Error('La sesión ha terminado.');
  return decryptAsset(cipher, activeSession.key, asset, activeSession.manifest.corpusVersion);
}

e.unlockForm.addEventListener('submit', async event => {
  event.preventDefault();
  e.unlockButton.disabled = true;
  e.unlockStatus.textContent = 'Abriendo la biblioteca protegida…';
  let password = e.password.value;
  e.password.value = '';
  let active;
  try {
    manifest = await loadManifest();
    const key = await deriveLibraryKey(password, manifest.kdf);
    password = undefined;
    active = { key, manifest, corpus: null, worker: null };
    session = active;
    const bytes = await readAsset('corpus', active);
    const corpus = JSON.parse(new TextDecoder().decode(bytes));
    bytes.fill(0);
    if (corpus.schemaVersion !== 1 || !Array.isArray(corpus.fragments) || !Array.isArray(corpus.documents)) throw new Error('Contenido no compatible.');
    active.corpus = corpus;
    e.unlockStatus.textContent = 'Preparando el buscador del libro completo…';
    const worker = new Worker(new URL('./search-worker.js', import.meta.url), { type: 'module' });
    active.worker = worker;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('El buscador está tardando demasiado.')), 60000);
      worker.addEventListener('error', () => { clearTimeout(timer); reject(new Error('No se pudo iniciar el buscador.')); }, { once: true });
      worker.addEventListener('message', function onMessage({ data }) {
        if (session !== active) { clearTimeout(timer); reject(new Error('Sesión cerrada.')); return; }
        if (data.type === 'progress') e.unlockStatus.textContent = `Preparando el buscador… ${Math.round((data.loaded || data.completed || 0) / corpus.fragments.length * 100)} %`;
        if (data.type === 'error') { clearTimeout(timer); reject(new Error(data.message)); }
        if (data.type === 'ready') { clearTimeout(timer); worker.removeEventListener('message', onMessage); resolve(); }
      });
      worker.postMessage({ type: 'init', requestId: 0, corpus });
    });
    worker.addEventListener('message', onSearchMessage);
    e.sectionFilter.innerHTML = '<option value="">Todas las secciones</option>' + corpus.sections.map(section => `<option value="${escapeHtml(section.id)}">${escapeHtml(section.title)}</option>`).join('');
    e.libraryTitle.textContent = `${corpus.documents.length} documentos · ${corpus.sourcePageCount} páginas`;
    e.offlineButton.title = `Descarga cifrada: ${formatBytes(manifest.totalBytes)}`;
    e.unlockStatus.textContent = '';
    ui.setLocked(false);
    history.replaceState({}, '', base.pathname);
    touchSession();
    window.scrollTo(0, 0);
    e.query.focus();
    updateOfflineState();
  } catch {
    password = undefined;
    active?.worker?.terminate();
    session = undefined;
    e.unlockStatus.textContent = manifest
      ? 'No se ha podido abrir. Comprueba la contraseña y que la biblioteca esté disponible.'
      : 'Importa primero tu archivo Biblioteca.urgencias para activar el buscador.';
    e.password.focus();
  } finally { e.unlockButton.disabled = false; }
});

function onSearchMessage({ data }) {
  if (!session || data.requestId !== queryRequest) return;
  ui.setSearchBusy(false);
  if (data.type === 'error') { e.searchStatus.textContent = data.message; return; }
  if (data.type !== 'results') return;
  results = data.results;
  ui.renderResults(results, session.corpus.sections);
  ui.renderInterpretation(data.interpretation);
  const total = data.totalDocuments ?? new Set(results.map(item => item.documentId)).size;
  e.resultCount.textContent = `${results.length} destinos · ${total} ${total === 1 ? 'documento relacionado' : 'documentos relacionados'}`;
  e.searchStatus.textContent = `${data.durationMs.toFixed(0)} ms de búsqueda · ${data.total} fragmentos relacionados${data.total > results.length ? ' · se muestran los destinos más relevantes' : ''}`;
  if (data.interpretation.ambiguous?.length) e.searchStatus.textContent += ` · ${data.interpretation.ambiguous.join(' ')}`;
}
function search() {
  clearTimeout(debounce);
  if (!session?.worker) return;
  const query = e.query.value.trim();
  ++queryRequest;
  if (!query) {
    results = [];
    ui.setSearchBusy(false);
    e.results.replaceChildren();
    e.emptyState.hidden = false;
    e.searchSummary.hidden = true;
    e.interpretation.hidden = true;
    e.searchStatus.textContent = '';
    return;
  }
  ui.setSearchBusy(true);
  e.searchStatus.textContent = 'Relacionando conceptos en el libro completo…';
  session.worker.postMessage({ type: 'search', requestId: queryRequest, query,
    filters: { sectionId: e.sectionFilter.value, kind: e.kindFilter.value, limit: 30 } });
}
e.searchForm.addEventListener('submit', event => { event.preventDefault(); search(); });
e.query.addEventListener('input', () => { ++queryRequest; clearTimeout(debounce); debounce = setTimeout(search, 180); });
e.sectionFilter.addEventListener('change', search);
e.kindFilter.addEventListener('change', search);
e.clearQuery.addEventListener('click', () => { e.query.value = ''; search(); e.query.focus(); });
document.addEventListener('click', event => {
  const example = event.target.closest('[data-query]');
  if (example && session) { e.query.value = example.dataset.query; search(); e.query.focus(); }
  const result = event.target.closest('[data-open-result]');
  if (result) {
    searchScroll = window.scrollY;
    openResult(result.dataset.openResult, true);
  }
});

async function getPDFLibrary() {
  if (!pdfLibrary) {
    pdfLibrary = await import('pdfjs-dist');
    pdfLibrary.GlobalWorkerOptions.workerSrc = pdfWorkerURL;
  }
  return pdfLibrary;
}
async function closePDF() {
  ++renderGeneration;
  renderTask?.cancel();
  renderTask = undefined;
  const previousTask = pdfLoadingTask ?? pdfDocument?.loadingTask;
  pdfDocument = undefined;
  pdfLoadingTask = undefined;
  pdfBytes?.fill(0);
  pdfBytes = undefined;
  pdfDocumentId = undefined;
  if (blobURL) URL.revokeObjectURL(blobURL);
  blobURL = undefined;
  e.readerCanvas.width = 0;
  e.readerCanvas.height = 0;
  e.readerText.replaceChildren();
  e.readerText.hidden = true;
  e.readerCanvas.parentElement.hidden = false;
  e.readerTextToggle.setAttribute('aria-expanded', 'false');
  e.readerTextToggle.querySelector('span').textContent = 'Ver texto';
  try { await disposePDFTask(previousTask); } catch { console.warn('El lector no pudo completar su cierre.'); }
}
async function openResult(id, addHistory = false) {
  if (!session) return;
  const active = session;
  const result = results.find(item => item.id === id);
  if (!result) return;
  const generation = ++openGeneration;
  currentResult = result;
  resultIndex = results.indexOf(result);
  ui.showView('reader');
  if (addHistory) history.pushState({ reader: true }, '', '#lectura');
  e.readerTitle.textContent = result.title;
  e.readerLocation.textContent = `${result.sectionTitle} · página ${result.originalPage} del libro`;
  e.readerEvidence.textContent = `Coincidencias: ${result.matchedTerms.join(', ') || 'consulta literal'}. Destino a nivel de página${result.source === 'ocr' ? ' · OCR pendiente de revisión' : ''}.`;
  e.readerResultPrev.disabled = resultIndex <= 0;
  e.readerResultNext.disabled = resultIndex >= results.length - 1;
  e.readerStatus.textContent = 'Abriendo únicamente el PDF de este documento…';
  e.readerCanvas.hidden = true;
  e.readerNativeOpen.disabled = true;
  e.readerTitle.tabIndex = -1;
  e.readerTitle.focus({ preventScroll: true });
  window.scrollTo(0, 0);
  try {
    if (pdfDocumentId !== result.documentId) {
      await closePDF();
      const [pdfjs, bytes] = await Promise.all([getPDFLibrary(), readAsset(result.documentId, active)]);
      if (session !== active || generation !== openGeneration) { bytes.fill(0); return; }
      pdfBytes = bytes;
      // PDF.js transfers its input buffer to a worker; retain a separate copy for explicit PDF opening.
      const task = pdfjs.getDocument({ data: bytes.slice(),
        cMapUrl: new URL('vendor/pdfjs/cmaps/', base).href, cMapPacked: true,
        standardFontDataUrl: new URL('vendor/pdfjs/standard_fonts/', base).href,
        wasmUrl: new URL('vendor/pdfjs/wasm/', base).href,
        isEvalSupported: false, enableXfa: false });
      pdfLoadingTask = task;
      const loaded = await task.promise;
      if (session !== active || generation !== openGeneration) { await disposePDFTask(task); return; }
      pdfDocument = loaded;
      pdfDocumentId = result.documentId;
      blobURL = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    }
    if (generation !== openGeneration || session !== active) return;
    const sourceDocument = active.corpus.documents.find(document => document.id === result.documentId);
    e.readerLocation.textContent = `${result.sectionTitle} · PDF de ${pdfDocument.numPages} páginas · ${formatBytes(sourceDocument.bytes)}`;
    pageNumber = result.localPage;
    zoom = 1;
    e.pageTotal.textContent = pdfDocument.numPages;
    e.pageNumber.max = pdfDocument.numPages;
    e.readerNativeOpen.disabled = false;
    await renderPage();
  } catch (error) {
    console.warn('No se pudo abrir el lector PDF:', error.message);
    if (session === active && generation === openGeneration) e.readerStatus.textContent = 'No se pudo abrir el PDF. Comprueba la conexión o descarga antes la biblioteca para usarla sin conexión.';
  }
}
async function renderPage() {
  if (!pdfDocument || !session) return;
  const doc = pdfDocument;
  const active = session;
  const generation = ++renderGeneration;
  const started = performance.now();
  renderTask?.cancel();
  try {
    const page = await doc.getPage(pageNumber);
    if (generation !== renderGeneration || session !== active) return;
    const stage = e.readerCanvas.parentElement;
    const unscaled = page.getViewport({ scale: 1 });
    const width = Math.max(280, Math.min(1120, stage.clientWidth - (window.innerWidth < 520 ? 16 : 48)));
    const scale = width / unscaled.width * zoom;
    const viewport = page.getViewport({ scale });
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const canvas = e.readerCanvas;
    canvas.width = Math.ceil(viewport.width * pixelRatio);
    canvas.height = Math.ceil(viewport.height * pixelRatio);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    canvas.hidden = false;
    e.readerStatus.textContent = 'Preparando la página original…';
    renderTask = page.render({ canvasContext: canvas.getContext('2d'), viewport,
      transform: pixelRatio === 1 ? null : [pixelRatio, 0, 0, pixelRatio, 0, 0] });
    await renderTask.promise;
    if (generation !== renderGeneration || session !== active) return;
    const sourceDocument = active.corpus.documents.find(item => item.id === pdfDocumentId);
    const originalPage = sourceDocument.originalStart + pageNumber - 1;
    const fragments = active.corpus.fragments.filter(item => item.documentId === pdfDocumentId && item.localPage === pageNumber);
    const text = reconstructPage(fragments);
    e.readerText.textContent = `Transcripción auxiliar de la página ${originalPage}. ${fragments.some(item => item.source === 'ocr') ? 'Texto obtenido mediante OCR; pendiente de revisión.' : ''} Las columnas y fórmulas pueden perder su orden en esta vista; compruébalas en el PDF original.\n\n${text}`;
    e.pageNumber.value = pageNumber;
    e.pagePrev.disabled = pageNumber <= 1;
    e.pageNext.disabled = pageNumber >= doc.numPages;
    e.readerCanvas.setAttribute('aria-label', `${sourceDocument.title}, página ${originalPage} del libro, ${pageNumber} de este PDF`);
    e.readerStatus.textContent = `Página ${originalPage} del libro · ${pageNumber}/${doc.numPages} del PDF · preparada en ${(performance.now() - started).toFixed(0)} ms${fragments.some(item => item.source === 'ocr') ? ' · OCR pendiente de revisión' : ''}`;
    page.cleanup();
  } catch (error) {
    if (error.name !== 'RenderingCancelledException' && generation === renderGeneration && session === active) e.readerStatus.textContent = 'No se pudo dibujar esta página. Puedes abrir el PDF con el botón de la barra.';
  }
}
function returnToSearch() {
  if (!session) return;
  ++openGeneration;
  renderTask?.cancel();
  ui.showView('search');
  window.scrollTo(0, searchScroll);
  const button = [...e.results.querySelectorAll('[data-open-result]')].find(item => item.dataset.openResult === currentResult?.id);
  button?.focus({ preventScroll: true });
}
e.readerBack.addEventListener('click', () => {
  if (history.state?.reader) history.back(); else returnToSearch();
});
window.addEventListener('popstate', () => { if (session) returnToSearch(); });
e.readerResultPrev.addEventListener('click', () => { if (resultIndex > 0) openResult(results[resultIndex - 1].id); });
e.readerResultNext.addEventListener('click', () => { if (resultIndex < results.length - 1) openResult(results[resultIndex + 1].id); });
e.pagePrev.addEventListener('click', () => { if (pageNumber > 1) { --pageNumber; renderPage(); } });
e.pageNext.addEventListener('click', () => { if (pdfDocument && pageNumber < pdfDocument.numPages) { ++pageNumber; renderPage(); } });
e.pageNumber.addEventListener('change', () => {
  if (!pdfDocument) return;
  pageNumber = Math.max(1, Math.min(pdfDocument.numPages, parseInt(e.pageNumber.value, 10) || 1)); renderPage();
});
e.zoomIn.addEventListener('click', () => { zoom = Math.min(3, zoom + 0.25); renderPage(); });
e.zoomOut.addEventListener('click', () => { zoom = Math.max(0.5, zoom - 0.25); renderPage(); });
e.readerTextToggle.addEventListener('click', () => {
  e.readerText.hidden = !e.readerText.hidden;
  e.readerTextToggle.setAttribute('aria-expanded', String(!e.readerText.hidden));
  e.readerTextToggle.querySelector('span').textContent = e.readerText.hidden ? 'Ver texto' : 'Ocultar texto';
  e.readerCanvas.parentElement.hidden = !e.readerText.hidden;
});
e.readerNativeOpen.addEventListener('click', () => {
  if (blobURL) window.open(`${blobURL}#page=${pageNumber}`, '_blank', 'noopener,noreferrer');
});

async function lock(message = '') {
  ++openGeneration;
  ++queryRequest;
  clearTimeout(debounce);
  clearTimeout(lockTimer);
  offlineAbort?.abort();
  offlineAbort = undefined;
  session?.worker?.terminate();
  session = undefined;
  results = [];
  currentResult = undefined;
  manifest = undefined;
  await closePDF();
  e.readerCanvas.parentElement.hidden = false;
  e.readerTitle.textContent = '';
  e.readerLocation.textContent = '';
  e.readerEvidence.textContent = '';
  e.readerStatus.textContent = '';
  e.query.value = '';
  e.results.replaceChildren();
  e.sectionFilter.innerHTML = '<option value="">Todas las secciones</option>';
  e.kindFilter.value = '';
  e.searchStatus.textContent = '';
  e.offlineStatus.textContent = '';
  e.interpretation.replaceChildren();
  e.interpretation.hidden = true;
  e.searchSummary.hidden = true;
  e.emptyState.hidden = false;
  ui.setSearchBusy(false);
  ui.setLocked(true);
  e.unlockStatus.textContent = typeof message === 'string' ? message : '';
  history.replaceState({}, '', base.pathname);
  window.scrollTo(0, 0);
  e.password.focus();
}
e.lockButton.addEventListener('click', () => lock());

function libraryCacheName(value) { return `urgencias-encrypted-${value.corpusVersion}`; }
document.querySelector('#library-file').addEventListener('change', async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  const status = document.querySelector('#import-status');
  const label = importer.querySelector('button');
  e.unlockButton.disabled = true;
  label.disabled = true;
  event.target.disabled = true;
  try {
    status.textContent = 'Comprobando el paquete de la biblioteca…';
    const bundle = await inspectBundle(file);
    validateManifest(bundle.manifest);
    await navigator.storage?.persist?.();
    const cache = await caches.open(libraryCacheName(bundle.manifest));
    for (let i = 0; i < bundle.entries.length; i++) {
      const entry = bundle.entries[i];
      await verifyBundleEntry(entry);
      await cache.put(assetURL(entry.asset), new Response(entry.blob, { headers: { 'Content-Type': 'application/octet-stream' } }));
      status.textContent = `Importando biblioteca cifrada: ${i + 1}/${bundle.entries.length}. No cierres esta ventana.`;
    }
    await cache.put(new URL('bootstrap.json', libraryURL).href, new Response(JSON.stringify(bundle.manifest), { headers: { 'Content-Type': 'application/json' } }));
    manifest = bundle.manifest;
    status.textContent = 'Biblioteca importada en este dispositivo. Introduce la contraseña para abrirla.';
    e.password.focus();
  } catch (error) {
    status.textContent = error.name === 'QuotaExceededError'
      ? 'No hay espacio suficiente. Libera espacio en el dispositivo y vuelve a importar la biblioteca.'
      : 'No se pudo importar. Selecciona el paquete Biblioteca.urgencias completo y sin modificar.';
  } finally {
    e.unlockButton.disabled = false;
    label.disabled = false;
    event.target.disabled = false;
    event.target.value = '';
  }
});
async function updateOfflineState() {
  if (!session || !('caches' in window)) return;
  const active = session;
  const name = libraryCacheName(active.manifest);
  const exists = (await caches.keys()).includes(name);
  let complete = false;
  if (exists) {
    const cache = await caches.open(name);
    const keys = await cache.keys();
    complete = keys.length >= Object.keys(active.manifest.assets).length + 1;
  }
  if (session !== active) return;
  e.offlineStatus.textContent = complete ? `Biblioteca guardada sin conexión · ${formatBytes(active.manifest.totalBytes)} cifrados` : '';
  e.offlineButton.textContent = complete ? 'Comprobar descarga' : 'Guardar sin conexión';
  if (e.removeOfflineButton) e.removeOfflineButton.hidden = !exists;
}
e.offlineButton.addEventListener('click', async () => {
  if (!session || offlineAbort) return;
  const active = session;
  const assets = Object.values(active.manifest.assets);
  const abort = new AbortController();
  offlineAbort = abort;
  e.offlineButton.disabled = true;
  try {
    await navigator.storage?.persist?.();
    const cache = await caches.open(libraryCacheName(active.manifest));
    let loaded = 0;
    for (let i = 0; i < assets.length; i++) {
      if (abort.signal.aborted || session !== active) throw new DOMException('Aborted', 'AbortError');
      const asset = assets[i];
      const url = assetURL(asset);
      if (!(await cache.match(url))) {
        const response = await fetch(url, { cache: 'no-store', credentials: 'omit', signal: abort.signal });
        if (!response.ok) throw new Error('Falta un documento.');
        await cache.put(url, response);
      }
      loaded += asset.bytes;
      e.offlineStatus.textContent = `Guardando archivos cifrados: ${i + 1}/${assets.length} · ${formatBytes(loaded)} de ${formatBytes(active.manifest.totalBytes)}`;
    }
    const bootstrap = new URL('bootstrap.json', libraryURL).href;
    await cache.put(bootstrap, new Response(JSON.stringify(active.manifest), { headers: { 'Content-Type': 'application/json' } }));
    e.offlineStatus.textContent = 'Biblioteca completa guardada sin conexión.';
  } catch (error) {
    if (session === active) e.offlineStatus.textContent = error.name === 'QuotaExceededError'
      ? 'No hay espacio suficiente para toda la biblioteca. Puedes eliminar las descargas y seguir consultando con conexión.'
      : 'La descarga no se completó. Vuelve a pulsar Guardar sin conexión para continuar.';
  } finally {
    offlineAbort = undefined;
    e.offlineButton.disabled = false;
    if (session === active) {
      const status = e.offlineStatus.textContent;
      await updateOfflineState();
      if (!e.offlineStatus.textContent) e.offlineStatus.textContent = status;
    }
  }
});
e.removeOfflineButton?.addEventListener('click', async () => {
  offlineAbort?.abort();
  for (const name of await caches.keys()) if (name.startsWith('urgencias-encrypted-')) await caches.delete(name);
  e.offlineStatus.textContent = 'Descargas eliminadas de este dispositivo.';
  e.removeOfflineButton.hidden = true;
  e.offlineButton.textContent = 'Guardar sin conexión';
});
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault(); installPrompt = event; e.installButton.hidden = false;
});
e.installButton.addEventListener('click', async () => {
  if (!installPrompt) return;
  await installPrompt.prompt();
  installPrompt = undefined; e.installButton.hidden = true;
});
window.addEventListener('appinstalled', () => { e.installButton.hidden = true; });
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register(new URL('sw.js', base), { scope: base.pathname }).catch(() => {
    e.offlineStatus.textContent = 'La consulta está disponible; la instalación sin conexión no ha podido activarse.';
  });
}
ui.setLocked(true);
