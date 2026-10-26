import '@fontsource/nunito/latin-400.css';
import '@fontsource/nunito/latin-600.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/poppins/latin-600.css';
import '@fontsource/poppins/latin-700.css';
import './styles.css';
import './reader.css';
import './offline.css';
import './ai-share.css';
import { mountUI, escapeHtml } from './ui.js';
import { deriveLibraryKey, decryptAsset } from './crypto.js';
import { inspectBundle, verifyBundleEntry } from './bundle.js';
import { reconstructPage } from './page-text.js';
import { disposePDFTask } from './pdf-lifecycle.js';
import { setupInstallation } from './install.js';
import { setupAiShare } from './ai-share-dialog.js';
import { buildAiMaterial } from './ai-material.js';
import { saveDeviceAccess, loadDeviceAccess, forgetDeviceAccess } from './device-access.js';
import { readPreparedSearch, writePreparedSearch, readSearchHistory, writeSearchHistory,
  clearSearchHistory, forgetLocalSearchData } from './local-search-data.js';
import { libraryCacheName, getActiveLibraryManifest, saveLibraryManifest, inspectLibraryCache,
  getLibraryAssetResponse, fetchWithTimeout, CONTROL_CACHE, LIBRARY_PREFIX } from './offline.js';
import pdfWorkerURL from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

const ui = mountUI(document.querySelector('#app'));
const e = ui.elements;
const resultsViewPreference = 'urgencias-result-view-v1';
try { e.compactResults.checked = localStorage.getItem(resultsViewPreference) === 'titles'; } catch {}
const base = new URL('./', document.baseURI);
const libraryURL = new URL('library/', base);
setupInstallation(e.installButton);
const offlinePanel = document.createElement('section');
offlinePanel.className = 'offline-panel';
offlinePanel.setAttribute('aria-label', 'Disponibilidad sin conexión');
offlinePanel.innerHTML = `<div class="offline-overview"><div><strong id="offline-ready" role="status" aria-live="polite">Comprobando el uso sin conexión…</strong><span id="network-status"></span></div><div class="offline-actions"></div></div><div class="offline-progress"></div><details><summary>Ver qué está guardado en este dispositivo</summary><ul><li id="offline-app-state">Aplicación: comprobando…</li><li id="offline-library-state">Biblioteca: comprobando…</li><li id="offline-storage-state">Almacenamiento: comprobando…</li></ul><p>La contraseña también funciona sin Internet. Conserva tu archivo de biblioteca por si borras los datos de la app o el navegador libera su almacenamiento.</p><div class="offline-remove"></div></details>`;
document.querySelector('.app-header').after(offlinePanel);
offlinePanel.querySelector('.offline-actions').append(e.offlineButton);
offlinePanel.querySelector('.offline-progress').append(e.offlineStatus);
offlinePanel.querySelector('.offline-remove').append(e.removeOfflineButton);
e.offlineButton.textContent = 'Preparar uso sin conexión';
e.offlineButton.className = 'button button-tonal button-compact';
e.removeOfflineButton.textContent = 'Eliminar biblioteca del dispositivo';
const localHost = ['localhost', '127.0.0.1'].includes(location.hostname);
if (!localHost) document.querySelector('.local-badge').lastChild.textContent = ' Biblioteca del dispositivo';
const importer = document.createElement('div');
importer.className = 'library-import';
importer.innerHTML = `<button id="import-library-button" type="button" class="button button-tonal">Importar biblioteca del dispositivo</button><input id="library-file" type="file" hidden aria-describedby="import-status"><p id="import-status" role="status" aria-live="polite">Selecciona Biblioteca.urgencias una vez. El archivo permanece en este dispositivo y no se sube a Internet.</p>`;
document.querySelector('.unlock-card').append(importer);
document.querySelector('#import-library-button').addEventListener('click', () => document.querySelector('#library-file').click());
const formatBytes = bytes => `${(bytes / 1000000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} MB`;
let manifest;
let session;
let results = [];
let currentResult;
let resultIndex = -1;
let queryRequest = 0;
let debounce;
let historyDebounce;
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
let offlineAbort;
let importingLibrary = false;
let availabilityGeneration = 0;
let serviceWorkerRegistration;
let openingLibrary = false;
let restoringDevice = false;
let localWrites = Promise.resolve();
let aiContext;
const aiShare = setupAiShare({
  button: e.readerAiShare,
  getContext(options) {
    if (!session || !pdfBytes || !pdfDocument || pdfDocumentId !== currentResult?.documentId
      || document.body.dataset.view !== 'reader') throw new Error('Abre un PDF antes de preparar la consulta.');
    const active = session;
    const sourceDocument = active.corpus.documents.find(item => item.id === pdfDocumentId);
    aiContext = { session: active, documentId: pdfDocumentId, page: pageNumber, generation: openGeneration };
    return buildAiMaterial({ document: sourceDocument,
      fragments: active.corpus.fragments.filter(item => item.documentId === pdfDocumentId),
      pdfBytes, pageNumber, ...options });
  },
  isContextCurrent() {
    return Boolean(session && pdfBytes && pdfDocument && pdfDocumentId === currentResult?.documentId
      && document.body.dataset.view === 'reader' && (!aiContext || (aiContext.session === session
        && aiContext.documentId === pdfDocumentId && aiContext.page === pageNumber && aiContext.generation === openGeneration)));
  },
});
function closeAiShare() {
  aiShare.close({ restoreFocus: false });
  aiContext = undefined;
}
function queueLocalWrite(operation) {
  const pending = localWrites.then(operation);
  localWrites = pending.catch(() => {});
  return pending;
}
async function forgetPersonalAccess() {
  const active = session;
  if (active) active.forgetting = true;
  try {
    await queueLocalWrite(async () => { await forgetLocalSearchData(); await forgetDeviceAccess(); });
  } catch (error) {
    if (session === active && active) active.forgetting = false;
    throw error;
  }
}

function touchSession() {
  clearTimeout(lockTimer);
  if (session && !session.remembered) lockTimer = setTimeout(() => lock('La biblioteca se ha bloqueado tras 15 minutos sin actividad.'), 15 * 60 * 1000);
}
for (const event of ['pointerdown', 'keydown']) document.addEventListener(event, touchSession, { passive: true });

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
  const local = await getActiveLibraryManifest(base);
  if (local) return validateManifest(local);
  const response = await fetchWithTimeout(new URL('bootstrap.json', libraryURL).href);
  if (!response.ok) throw new Error('Importa la biblioteca del dispositivo.');
  const value = validateManifest(await response.json());
  try { await saveLibraryManifest(value, base); } catch {}
  return value;
}
async function readAsset(id, activeSession = session) {
  if (!activeSession) throw new Error('La biblioteca está bloqueada.');
  const asset = activeSession.manifest.assets[id];
  const cipher = await (await getLibraryAssetResponse(asset, activeSession.manifest, base)).arrayBuffer();
  if (session !== activeSession) throw new Error('La sesión ha terminado.');
  return decryptAsset(cipher, activeSession.key, asset, activeSession.manifest.corpusVersion);
}

e.unlockForm.addEventListener('submit', async event => {
  event.preventDefault();
  await openLibrary({ password: e.password.value, remember: e.rememberDevice.checked });
});
async function openLibrary({ password, savedKey, knownManifest, remember = false } = {}) {
  if (openingLibrary || importingLibrary || session || (restoringDevice && !savedKey)) return;
  openingLibrary = true;
  const openedAt = performance.now();
  e.unlockButton.disabled = true;
  e.lockButton.disabled = true;
  e.rememberDevice.disabled = true;
  e.removeOfflineButton.disabled = true;
  document.querySelector('#import-library-button').disabled = true;
  e.deviceAccessStatus.textContent = '';
  e.unlockStatus.textContent = savedKey ? 'Abriendo la biblioteca de este dispositivo…' : 'Abriendo la biblioteca protegida…';
  e.password.value = '';
  let active;
  try {
    manifest = knownManifest ?? await loadManifest();
    const key = savedKey ?? await deriveLibraryKey(password, manifest.kdf);
    password = undefined;
    active = { key, manifest, corpus: null, worker: null, remembered: Boolean(savedKey), ready: false, history: [] };
    session = active;
    e.sectionFilter.disabled = true;
    e.kindFilter.disabled = true;
    if (savedKey) {
      ui.setLocked(false);
      e.startupStatus.textContent = 'Abriendo tu búsqueda…';
      history.replaceState({}, '', base.pathname);
      window.scrollTo(0, 0);
      e.query.focus();
    }
    const [bytes, preparedSearch, searchHistory] = await Promise.all([
      readAsset('corpus', active), readPreparedSearch(manifest, key), readSearchHistory(manifest, key),
    ]);
    const corpus = JSON.parse(new TextDecoder().decode(bytes));
    bytes.fill(0);
    if (corpus.schemaVersion !== 1 || !Array.isArray(corpus.fragments) || !Array.isArray(corpus.documents)) throw new Error('Contenido no compatible.');
    active.corpus = corpus;
    active.history = searchHistory;
    e.sectionFilter.innerHTML = '<option value="">Todas las secciones</option>' + corpus.sections.map(section => `<option value="${escapeHtml(section.id)}">${escapeHtml(section.title)}</option>`).join('');
    e.sectionFilter.disabled = false;
    e.kindFilter.disabled = false;
    e.libraryTitle.textContent = `${corpus.documents.length} documentos · ${corpus.sourcePageCount} páginas`;
    ui.renderHistory(active.history);
    ui.setLocked(false);
    e.startupStatus.textContent = preparedSearch ? 'Abriendo tu buscador guardado…' : 'Primera preparación del buscador. Ya puedes escribir tu búsqueda.';
    if (!savedKey) {
      history.replaceState({}, '', base.pathname);
      window.scrollTo(0, 0);
      e.query.focus();
    }
    const worker = new Worker(new URL('./search-worker.js', import.meta.url), { type: 'module' });
    active.worker = worker;
    worker.addEventListener('message', onSearchMessage);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('El buscador está tardando demasiado.')), 60000);
      worker.addEventListener('error', () => { clearTimeout(timer); reject(new Error('No se pudo iniciar el buscador.')); }, { once: true });
      worker.addEventListener('message', function onMessage({ data }) {
        if (session !== active) { clearTimeout(timer); reject(new Error('Sesión cerrada.')); return; }
        if (data.type === 'progress') e.startupStatus.textContent = `Preparando la primera búsqueda… ${Math.round((data.loaded || data.completed || 0) / corpus.fragments.length * 100)} %. Puedes ir escribiendo.`;
        if (data.type === 'error') { clearTimeout(timer); reject(new Error(data.message)); }
        if (data.type === 'ready') {
          clearTimeout(timer); worker.removeEventListener('message', onMessage);
          active.ready = true;
          e.startupStatus.dataset.restored = String(data.restored === true);
          e.startupStatus.dataset.engineMs = String(data.durationMs);
          e.startupStatus.dataset.startupMs = String(Math.round(performance.now() - openedAt));
          e.startupStatus.textContent = '';
          if (data.preparedSearch) queueLocalWrite(async () => {
            if (session === active && !active.forgetting) await writePreparedSearch(active.manifest, active.key, data.preparedSearch);
          }).catch(() => { if (session === active) e.startupStatus.textContent = 'Puedes buscar. No se pudo guardar la preparación para el próximo inicio.'; });
          if (e.query.value.trim()) search();
          resolve();
        }
      });
      worker.postMessage({ type: 'init', requestId: 0, corpus, preparedSearch });
    });
    e.offlineButton.title = `Descarga cifrada: ${formatBytes(manifest.totalBytes)}`;
    if (session !== active) return;
    if (!savedKey) {
      try {
        if (remember) { await saveDeviceAccess(manifest, key); active.remembered = true; }
        else await forgetDeviceAccess();
      } catch (error) {
        active.forgetRequired = !remember;
        e.deviceAccessStatus.textContent = remember
          ? 'La biblioteca está abierta, pero no se pudo recordar este dispositivo. Tendrás que introducir la contraseña la próxima vez.'
          : error.message;
      }
    }
    if (session !== active) return;
    if (active.remembered && !savedKey) e.deviceAccessStatus.textContent = 'Dispositivo recordado. La biblioteca se abrirá automáticamente, también sin conexión.';
    e.lockButton.querySelector('span').textContent = active.remembered || active.forgetRequired ? 'Olvidar este dispositivo' : 'Bloquear';
    e.unlockStatus.textContent = '';
    touchSession();
    updateOfflineState();
  } catch {
    password = undefined;
    active?.worker?.terminate();
    const message = savedKey ? 'No se pudo abrir el acceso recordado. Introduce la contraseña para volver a abrir la biblioteca.' : manifest
      ? 'No se ha podido abrir. Comprueba la contraseña y que la biblioteca esté disponible.'
      : 'Importa primero tu archivo Biblioteca.urgencias para activar el buscador.';
    await lock(message);
  } finally {
    password = undefined;
    savedKey = undefined;
    openingLibrary = false;
    e.unlockButton.disabled = false;
    e.lockButton.disabled = false;
    e.rememberDevice.disabled = false;
    e.removeOfflineButton.disabled = Boolean(importingLibrary || offlineAbort || restoringDevice);
    document.querySelector('#import-library-button').disabled = false;
  }
}
async function restoreDeviceAccess() {
  if (openingLibrary || importingLibrary || session || restoringDevice) return;
  restoringDevice = true;
  e.unlockButton.disabled = true;
  e.rememberDevice.disabled = true;
  e.removeOfflineButton.disabled = true;
  document.querySelector('#import-library-button').disabled = true;
  try {
    const local = await getActiveLibraryManifest(base);
    if (!local) return;
    const key = await loadDeviceAccess(validateManifest(local));
    if (key) await openLibrary({ savedKey: key, knownManifest: local, remember: true });
  } catch { /* The password form remains available when device access cannot be restored. */ }
  finally {
    restoringDevice = false;
    e.unlockButton.disabled = false;
    e.rememberDevice.disabled = false;
    e.removeOfflineButton.disabled = Boolean(openingLibrary || importingLibrary || offlineAbort);
    document.querySelector('#import-library-button').disabled = false;
  }
}

function onSearchMessage({ data }) {
  if (!session || data.requestId !== queryRequest) return;
  ui.setSearchBusy(false);
  if (data.type === 'error') { e.searchStatus.textContent = data.message; return; }
  if (data.type !== 'results') return;
  clearTimeout(historyDebounce);
  historyDebounce = setTimeout(() => rememberSearch({ automatic: true }), 1200);
  results = data.results;
  ui.renderResults(results, session.corpus.sections, { compact: e.compactResults.checked });
  ui.renderInterpretation(data.interpretation);
  const total = data.totalDocuments ?? new Set(results.map(item => item.documentId)).size;
  e.resultCount.textContent = `${results.length} destinos · ${total} ${total === 1 ? 'documento con coincidencias' : 'documentos con coincidencias'}`;
  e.searchStatus.textContent = `${data.durationMs.toFixed(0)} ms de búsqueda · ${data.total} fragmentos con coincidencias${data.total > results.length ? ' · se muestran los destinos más relevantes' : ''}`;
  if (data.interpretation.ambiguous?.length) e.searchStatus.textContent += ` · ${data.interpretation.ambiguous.join(' ')}`;
}
e.compactResults.addEventListener('change', () => {
  try { localStorage.setItem(resultsViewPreference, e.compactResults.checked ? 'titles' : 'expanded'); } catch {}
  if (!session || e.searchSummary.hidden) return;
  const count = e.resultCount.textContent;
  ui.renderResults(results, session.corpus.sections, { compact: e.compactResults.checked });
  e.resultCount.textContent = count;
});
function search() {
  clearTimeout(debounce);
  clearTimeout(historyDebounce);
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
  if (!session.ready) {
    e.searchStatus.textContent = 'Tu consulta está preparada. Los resultados aparecerán al terminar esta primera preparación.';
    return;
  }
  e.searchStatus.textContent = 'Relacionando conceptos en el libro completo…';
  session.worker.postMessage({ type: 'search', requestId: queryRequest, query,
    filters: { sectionId: e.sectionFilter.value, kind: e.kindFilter.value, limit: 30 } });
}
function rememberSearch({ automatic = false } = {}) {
  clearTimeout(historyDebounce);
  const active = session;
  const query = e.query.value.trim().replace(/\s+/g, ' ').slice(0, 500);
  if (!active || active.forgetting || !query) return;
  if (automatic && active.historyCleared) return;
  if (!automatic) active.historyCleared = false;
  const entry = { query, sectionId: e.sectionFilter.value, kind: e.kindFilter.value, lastUsedAt: Date.now() };
  const identity = value => JSON.stringify([value.query.toLocaleLowerCase('es'), value.sectionId, value.kind]);
  active.history = [entry, ...active.history.filter(value => identity(value) !== identity(entry))].slice(0, 20);
  ui.renderHistory(active.history);
  const entries = active.history.slice();
  queueLocalWrite(async () => {
    if (session === active && !active.forgetting) await writeSearchHistory(active.manifest, active.key, entries);
  }).catch(() => { if (session === active) e.startupStatus.textContent = 'La búsqueda funciona, pero no se pudo guardar el historial en este dispositivo.'; });
}
e.searchForm.addEventListener('submit', event => { event.preventDefault(); rememberSearch(); search(); });
e.query.addEventListener('input', () => { if (session) session.historyCleared = false; ++queryRequest; clearTimeout(debounce); clearTimeout(historyDebounce); debounce = setTimeout(search, 180); });
for (const filter of [e.sectionFilter, e.kindFilter]) filter.addEventListener('change', () => { if (session) session.historyCleared = false; search(); });
e.clearQuery.addEventListener('click', () => { clearTimeout(historyDebounce); e.query.value = ''; search(); e.query.focus(); });
document.addEventListener('click', event => {
  const example = event.target.closest('[data-query]');
  if (example && session) { e.query.value = example.dataset.query; rememberSearch(); search(); e.query.focus(); }
  const previous = event.target.closest('[data-history-query]');
  if (previous && session) {
    e.query.value = previous.dataset.historyQuery;
    e.sectionFilter.value = previous.dataset.historySection || '';
    e.kindFilter.value = previous.dataset.historyKind || '';
    rememberSearch(); search(); e.query.focus({ preventScroll: true });
  }
  const result = event.target.closest('[data-open-result]');
  if (result) {
    rememberSearch();
    searchScroll = window.scrollY;
    openResult(result.dataset.openResult, true);
  }
});
e.clearHistoryButton.addEventListener('click', async () => {
  clearTimeout(historyDebounce);
  const active = session;
  if (!active || active.forgetting) return;
  const previousHistory = active.history.slice();
  active.historyCleared = true;
  active.history = [];
  ui.renderHistory([]);
  e.query.focus({ preventScroll: true });
  try { await queueLocalWrite(() => clearSearchHistory(active.manifest)); }
  catch { if (session === active) {
    active.history = [...active.history, ...previousHistory].slice(0, 20);
    ui.renderHistory(active.history);
    e.startupStatus.textContent = 'No se pudo borrar el historial guardado. Vuelve a intentarlo antes de cerrar la app.';
  } }
});

async function getPDFLibrary() {
  if (!pdfLibrary) {
    pdfLibrary = await import('pdfjs-dist');
    pdfLibrary.GlobalWorkerOptions.workerSrc = pdfWorkerURL;
  }
  return pdfLibrary;
}
async function closePDF() {
  closeAiShare();
  e.readerAiShare.disabled = true;
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
  closeAiShare();
  e.readerAiShare.disabled = true;
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
    e.readerAiShare.disabled = false;
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
  closeAiShare();
  e.readerAiShare.disabled = true;
  ++openGeneration;
  renderTask?.cancel();
  ui.showView('search');
  window.scrollTo(0, searchScroll);
  const button = [...e.results.querySelectorAll('[data-open-result]')].find(item => item.dataset.openResult === currentResult?.id);
  const disclosure = button?.closest('details.result-card');
  if (disclosure) disclosure.open = true;
  button?.focus({ preventScroll: true });
}
e.readerBack.addEventListener('click', () => {
  if (history.state?.reader) history.back(); else returnToSearch();
});
window.addEventListener('popstate', () => { if (session) returnToSearch(); });
e.readerResultPrev.addEventListener('click', () => { if (resultIndex > 0) openResult(results[resultIndex - 1].id); });
e.readerResultNext.addEventListener('click', () => { if (resultIndex < results.length - 1) openResult(results[resultIndex + 1].id); });
e.pagePrev.addEventListener('click', () => { if (pageNumber > 1) { closeAiShare(); --pageNumber; renderPage(); } });
e.pageNext.addEventListener('click', () => { if (pdfDocument && pageNumber < pdfDocument.numPages) { closeAiShare(); ++pageNumber; renderPage(); } });
e.pageNumber.addEventListener('change', () => {
  if (!pdfDocument) return;
  closeAiShare();
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
  closeAiShare();
  ++openGeneration;
  ++queryRequest;
  clearTimeout(debounce);
  clearTimeout(historyDebounce);
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
  e.startupStatus.textContent = '';
  delete e.startupStatus.dataset.restored;
  delete e.startupStatus.dataset.engineMs;
  delete e.startupStatus.dataset.startupMs;
  ui.renderHistory([]);
  e.offlineStatus.textContent = '';
  e.interpretation.replaceChildren();
  e.interpretation.hidden = true;
  e.searchSummary.hidden = true;
  e.emptyState.hidden = false;
  ui.setSearchBusy(false);
  ui.setLocked(true);
  e.deviceAccessStatus.textContent = '';
  e.lockButton.querySelector('span').textContent = 'Bloquear';
  e.unlockStatus.textContent = typeof message === 'string' ? message : '';
  history.replaceState({}, '', base.pathname);
  window.scrollTo(0, 0);
  e.password.focus();
  updateOfflineState();
}
e.lockButton.addEventListener('click', async () => {
  e.lockButton.disabled = true;
  try {
    if (session?.remembered || session?.forgetRequired) {
      await forgetPersonalAccess();
      await lock('Este dispositivo se ha olvidado. La próxima vez tendrás que introducir la contraseña.');
    } else await lock();
  } catch {
    e.deviceAccessStatus.textContent = 'No se pudo olvidar este dispositivo. Vuelve a intentarlo antes de dejar de usarlo.';
  } finally { e.lockButton.disabled = false; }
});

document.querySelector('#library-file').addEventListener('change', async event => {
  const file = event.target.files?.[0];
  if (!file) return;
  const status = document.querySelector('#import-status');
  const label = importer.querySelector('button');
  e.unlockButton.disabled = true;
  label.disabled = true;
  event.target.disabled = true;
  importingLibrary = true;
  e.offlineButton.disabled = true;
  e.removeOfflineButton.disabled = true;
  try {
    status.textContent = 'Comprobando el paquete de la biblioteca…';
    const bundle = await inspectBundle(file);
    validateManifest(bundle.manifest);
    try { await navigator.storage?.persist?.(); } catch {}
    const cache = await caches.open(libraryCacheName(bundle.manifest));
    for (let i = 0; i < bundle.entries.length; i++) {
      const entry = bundle.entries[i];
      await verifyBundleEntry(entry);
      await cache.put(assetURL(entry.asset), new Response(entry.blob, { headers: { 'Content-Type': 'application/octet-stream' } }));
      status.textContent = `Importando biblioteca cifrada: ${i + 1}/${bundle.entries.length}. No cierres esta ventana.`;
    }
    await saveLibraryManifest(bundle.manifest, base);
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
    importingLibrary = false;
    e.offlineButton.disabled = false;
    e.removeOfflineButton.disabled = false;
    updateOfflineState();
  }
});
function getAppOfflineStatus() {
  const worker = navigator.serviceWorker?.controller;
  if (!worker) return Promise.resolve({ complete: false, present: 0, total: 0 });
  return new Promise(resolve => {
    const channel = new MessageChannel();
    const finish = result => { clearTimeout(timer); channel.port1.close(); resolve(result); };
    const timer = setTimeout(() => finish({ complete: false, present: 0, total: 0 }), 2500);
    channel.port1.onmessage = ({ data }) => finish(data?.type === 'OFFLINE_STATUS' ? data : { complete: false });
    worker.postMessage({ type: 'GET_OFFLINE_STATUS' }, [channel.port2]);
  });
}
async function updateOfflineState() {
  const generation = ++availabilityGeneration;
  const network = document.querySelector('#network-status');
  network.textContent = navigator.onLine ? 'Conexión detectada · se usa primero la copia local' : 'Sin conexión · se usa la copia local';
  if (!('caches' in window) || !('serviceWorker' in navigator)) {
    document.querySelector('#offline-ready').textContent = 'Este navegador no permite guardar la app sin conexión';
    document.querySelector('#offline-app-state').textContent = 'Abre la aplicación en Safari, Chrome o Edge con almacenamiento habilitado.';
    e.offlineButton.disabled = true;
    return;
  }
  try {
    const library = session?.manifest ?? manifest ?? await getActiveLibraryManifest(base);
    const [shell, saved, persistent, names] = await Promise.all([
      getAppOfflineStatus(),
      library ? inspectLibraryCache(library, base) : null,
      navigator.storage?.persisted?.().catch(() => false) ?? false,
      caches.keys(),
    ]);
    if (generation !== availabilityGeneration) return;
    const ready = Boolean(shell.complete && saved?.complete);
    offlinePanel.dataset.ready = String(ready);
    document.querySelector('#offline-ready').textContent = ready ? 'Lista para usar sin conexión'
      : saved?.complete ? 'Biblioteca guardada · preparando la aplicación'
      : shell.complete ? 'Aplicación guardada · prepara tu biblioteca'
      : 'Prepara la app para usarla sin conexión';
    document.querySelector('#offline-app-state').textContent = shell.complete ? 'Aplicación: guardada con el buscador y el lector de PDF.' : 'Aplicación: pendiente de completar su descarga.';
    document.querySelector('#offline-library-state').textContent = saved?.complete
      ? `Biblioteca: todos los documentos guardados · ${formatBytes(saved.totalBytes)} cifrados.`
      : saved ? `Biblioteca: ${saved.present} de ${saved.total} archivos guardados. Faltan documentos.`
      : 'Biblioteca: importa tu archivo personal Biblioteca.urgencias.';
    document.querySelector('#offline-storage-state').textContent = persistent
      ? 'Almacenamiento persistente: concedido por el navegador.'
      : 'Almacenamiento del navegador: conserva también una copia del archivo de biblioteca.';
    e.offlineButton.title = library ? `Comprueba y completa la copia local de ${formatBytes(library.totalBytes)}.` : 'Guarda la app e importa la biblioteca para poder consultar sin Internet.';
    e.removeOfflineButton.hidden = !names.some(name => name.startsWith(LIBRARY_PREFIX));
  } catch {
    if (generation === availabilityGeneration) document.querySelector('#offline-ready').textContent = 'No se ha podido comprobar el almacenamiento local';
  }
}
async function prepareAppOffline() {
  if (!('serviceWorker' in navigator)) throw new Error('Abre esta página en un navegador que permita instalar aplicaciones.');
  let status = await getAppOfflineStatus();
  if (!status.complete && !status.version) {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('La aplicación todavía se está guardando. Espera unos instantes y vuelve a intentarlo.')), 20000);
      Promise.resolve(serviceWorkerRegistration).then(() => navigator.serviceWorker.ready)
        .then(registration => { clearTimeout(timer); resolve(registration); }, error => { clearTimeout(timer); reject(error); });
    });
    if (!navigator.serviceWorker.controller) await new Promise(resolve => {
      const done = () => { clearTimeout(timer); navigator.serviceWorker.removeEventListener('controllerchange', done); resolve(); };
      const timer = setTimeout(done, 8000);
      navigator.serviceWorker.addEventListener('controllerchange', done, { once: true });
    });
    status = await getAppOfflineStatus();
  }
  if (!status.version) throw new Error('La aplicación se está actualizando. Vuelve a abrirla y prepara el uso sin conexión.');
  if (!status.complete) {
    const cache = await caches.open(status.version);
    for (const path of status.missing || []) {
      const url = new URL(path);
      if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname) || url.pathname.startsWith(libraryURL.pathname)) throw new Error('Recurso de aplicación inválido.');
      const response = await fetchWithTimeout(url.href);
      if (!response.ok) throw new Error('No se pudo completar la descarga de la app. Vuelve a intentarlo con conexión.');
      await cache.put(url.href, response);
    }
    status = await getAppOfflineStatus();
  }
  if (!status.complete) throw new Error('Faltan recursos de la aplicación. Vuelve a intentarlo con conexión.');
}
e.offlineButton.addEventListener('click', async () => {
  if (offlineAbort || importingLibrary) return;
  const abort = new AbortController();
  offlineAbort = abort;
  e.offlineButton.disabled = true;
  e.removeOfflineButton.disabled = true;
  try {
    e.offlineStatus.textContent = 'Comprobando la descarga de la aplicación…';
    try { await navigator.storage?.persist?.(); } catch {}
    await prepareAppOffline();
    const library = session?.manifest ?? manifest ?? await getActiveLibraryManifest(base);
    if (!library) {
      e.offlineStatus.textContent = 'La aplicación está guardada. Importa ahora Biblioteca.urgencias desde este dispositivo.';
      importer.querySelector('button').focus();
      return;
    }
    const assets = Object.values(library.assets);
    const saved = await inspectLibraryCache(library, base);
    if (!saved.complete) {
      const missing = new Set(saved.missingIds);
      let loaded = saved.bytes;
      let present = saved.present;
      for (const asset of assets.filter(asset => missing.has(asset.id))) {
        if (abort.signal.aborted) throw new DOMException('Aborted', 'AbortError');
        const response = await getLibraryAssetResponse(asset, library, base, { signal: abort.signal });
        await response.body?.cancel();
        loaded += asset.bytes;
        present++;
        e.offlineStatus.textContent = `Guardando biblioteca cifrada: ${present}/${assets.length} · ${formatBytes(loaded)} de ${formatBytes(library.totalBytes)}`;
      }
    }
    if (abort.signal.aborted) throw new DOMException('Aborted', 'AbortError');
    await saveLibraryManifest(library, base);
    if (!(await inspectLibraryCache(library, base)).complete) throw new Error('Faltan documentos. Importa de nuevo tu archivo Biblioteca.urgencias.');
    e.offlineStatus.textContent = 'Comprobación completa. Puedes cerrar la app y volver a abrirla sin Internet.';
  } catch (error) {
    e.offlineStatus.textContent = error.name === 'QuotaExceededError'
      ? 'No hay espacio suficiente para guardar todos los documentos. Libera espacio y vuelve a preparar la biblioteca.'
      : error.name === 'AbortError' ? 'Preparación cancelada. Puedes continuarla más adelante.' : error.message;
  } finally {
    offlineAbort = undefined;
    e.offlineButton.disabled = false;
    e.removeOfflineButton.disabled = false;
    updateOfflineState();
  }
});
e.removeOfflineButton?.addEventListener('click', async () => {
  if (importingLibrary || offlineAbort || openingLibrary || restoringDevice) return;
  e.removeOfflineButton.disabled = true;
  try {
    await forgetPersonalAccess();
    for (const name of await caches.keys()) if (name.startsWith(LIBRARY_PREFIX) || name === CONTROL_CACHE) await caches.delete(name);
    await lock('Biblioteca retirada del dispositivo. Importa tu archivo para volver a consultarla.');
    e.offlineStatus.textContent = 'Biblioteca eliminada de este dispositivo. La aplicación sigue instalada.';
    e.removeOfflineButton.hidden = true;
  } catch {
    e.offlineStatus.textContent = 'No se pudo retirar la biblioteca y su acceso guardado. Vuelve a intentarlo.';
  } finally { e.removeOfflineButton.disabled = false; }
});
if ('serviceWorker' in navigator) {
  serviceWorkerRegistration = navigator.serviceWorker.register(new URL('sw.js', base), { scope: base.pathname, updateViaCache: 'none' })
    .then(registration => { updateOfflineState(); return registration; })
    .catch(async () => {
      // An update check may fail offline while the installed application is complete.
      if (!(await getAppOfflineStatus()).complete) e.offlineStatus.textContent = 'No se pudo guardar la aplicación. Vuelve a prepararla con conexión.';
      updateOfflineState();
      return null;
    });
  navigator.serviceWorker.addEventListener('controllerchange', updateOfflineState);
}
window.addEventListener('online', updateOfflineState);
window.addEventListener('offline', updateOfflineState);
window.addEventListener('focus', updateOfflineState);
document.addEventListener('visibilitychange', () => { if (!document.hidden) updateOfflineState(); });
ui.setLocked(true);
updateOfflineState();
restoreDeviceAccess();
