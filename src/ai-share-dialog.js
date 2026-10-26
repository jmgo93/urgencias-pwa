import { icon } from './ui.js';

const PROVIDERS = Object.freeze({
  chatgpt: { name: 'ChatGPT', url: 'https://chatgpt.com/' },
  gemini: { name: 'Gemini', url: 'https://gemini.google.com/app/' },
});

const formatSize = bytes => bytes >= 1000000
  ? `${(bytes / 1000000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} MB`
  : `${Math.max(1, Math.ceil(bytes / 1000)).toLocaleString('es-ES')} kB`;

/** Prepare private files locally; every external action requires its own user click. */
export function setupAiShare({ button, getContext, isContextCurrent = () => true }) {
  if (!button || typeof getContext !== 'function') return { open() {}, close() {}, dispose() {} };
  const dialog = document.createElement('dialog');
  dialog.id = 'ai-share-dialog';
  dialog.className = 'ai-share-dialog';
  dialog.setAttribute('aria-labelledby', 'ai-share-title');
  dialog.setAttribute('aria-describedby', 'ai-share-description');
  dialog.innerHTML = `
    <div class="ai-share-heading"><span class="ai-share-symbol">${icon('spark')}</span><form method="dialog"><button type="submit" class="icon-button" aria-label="Cerrar consulta con IA" autofocus>${icon('close')}</button></form></div>
    <div class="ai-share-scroll">
    <h2 id="ai-share-title">Consulta este documento con IA</h2>
    <p id="ai-share-description">Prepara el PDF abierto y su texto para consultarlos en la IA que elijas.</p>
    <p id="ai-document-summary" class="ai-document-summary"></p>
    <fieldset class="ai-provider-options"><legend>Elige tu IA</legend><div><label><input id="ai-provider-chatgpt" type="radio" name="ai-provider" value="chatgpt" checked /><span>ChatGPT</span></label><label><input id="ai-provider-gemini" type="radio" name="ai-provider" value="gemini" /><span>Gemini</span></label></div></fieldset>
    <label class="ai-question-label" for="ai-question">¿Qué quieres preguntarle?</label>
    <textarea id="ai-question" rows="3" maxlength="4000" placeholder="Por ejemplo: explica este algoritmo y propón un caso clínico para repasarlo."></textarea>
    <fieldset class="ai-material-options"><legend>Material que vas a compartir</legend><label><input id="ai-include-pdf" type="checkbox" checked /><span>PDF de este documento</span></label><label><input id="ai-include-text" type="checkbox" checked /><span>Texto extraído / OCR del documento</span></label></fieldset>
    <p class="ai-share-privacy">Sólo se comparte este documento cuando eliges enviarlo. La IA que elijas lo recibirá.</p>
    <p class="ai-offline-note">Puedes preparar y descargar aquí sin conexión. Para consultar la IA necesitarás Internet.</p>
    <p id="ai-share-status" class="ai-share-status" role="status" aria-live="polite"></p>
    <ul id="ai-material-warnings" class="ai-material-warnings" hidden></ul>
    <p id="ai-native-help" class="ai-native-help"></p>
    <details id="ai-manual-share" class="ai-manual-share"><summary id="ai-manual-title">Adjuntar desde la web</summary><p>Descarga los archivos que quieras usar, abre tu IA y adjúntalos en su conversación. Puedes copiar la pregunta preparada para pegarla allí.</p><ul id="ai-files" class="ai-files"></ul><div class="ai-web-actions"><button id="ai-copy-prompt" type="button" class="button button-tonal" disabled>Copiar pregunta</button><a id="ai-open-provider" class="button button-primary" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer" referrerpolicy="no-referrer" aria-disabled="true" tabindex="-1">Abrir ChatGPT ${icon('external')}</a></div></details>
    <details id="ai-prompt-details" class="ai-prompt-details"><summary>Ver la pregunta preparada</summary><label class="sr-only" for="ai-prepared-prompt">Pregunta preparada para la IA</label><textarea id="ai-prepared-prompt" readonly rows="6"></textarea></details>
    </div>
    <div class="ai-share-footer"><button id="ai-share-native" type="button" class="button button-primary ai-share-native" disabled>${icon('spark')}<span>Compartir archivos…</span></button><form method="dialog" class="ai-share-close"><button type="submit" class="button button-text">Volver al documento</button></form></div>`;
  document.body.append(dialog);
  button.setAttribute('aria-haspopup', 'dialog');
  button.setAttribute('aria-controls', dialog.id);

  const find = id => dialog.querySelector(`#${id}`);
  const question = find('ai-question');
  const includePdf = find('ai-include-pdf');
  const includeText = find('ai-include-text');
  const status = find('ai-share-status');
  const shareButton = find('ai-share-native');
  const copyButton = find('ai-copy-prompt');
  const providerLink = find('ai-open-provider');
  const filesList = find('ai-files');
  const warnings = find('ai-material-warnings');
  const preparedPrompt = find('ai-prepared-prompt');
  const promptDetails = find('ai-prompt-details');
  const urls = new Map();
  let material;
  let generation = 0;
  let prepareTimer;
  let disposed = false;
  let restoreFocusOnClose = true;

  function provider() { return PROVIDERS[dialog.querySelector('[name="ai-provider"]:checked')?.value] ?? PROVIDERS.chatgpt; }
  function current() {
    try { return !disposed && dialog.open && Boolean(isContextCurrent()); } catch { return false; }
  }
  function revokeDownloads() {
    for (const [url, timer] of urls) { clearTimeout(timer); URL.revokeObjectURL(url); }
    urls.clear();
  }
  function setReady(ready) {
    copyButton.disabled = !ready;
    providerLink.setAttribute('aria-disabled', String(!ready));
    providerLink.tabIndex = ready ? 0 : -1;
    shareButton.disabled = !ready;
  }
  function clearMaterial() {
    clearTimeout(prepareTimer);
    generation++;
    material = undefined;
    revokeDownloads();
    filesList.replaceChildren();
    warnings.replaceChildren();
    warnings.hidden = true;
    preparedPrompt.value = '';
    setReady(false);
  }
  function updateProvider() {
    const selected = provider();
    providerLink.href = selected.url;
    providerLink.innerHTML = `Abrir ${selected.name} ${icon('external')}`;
    find('ai-native-help').textContent = shareButton.hidden
      ? `Este navegador no permite compartir estos archivos directamente. Descárgalos y adjúntalos al abrir ${selected.name}.`
      : `Se abrirá el menú de compartir del dispositivo. Elige ${selected.name} si aparece; también puedes adjuntar los archivos desde su web.`;
  }
  function guard() {
    if (current() && material) return true;
    close({ restoreFocus: false });
    return false;
  }
  function download(file) {
    if (!guard()) return;
    const url = URL.createObjectURL(file);
    const timer = setTimeout(() => { URL.revokeObjectURL(url); urls.delete(url); }, 60000);
    urls.set(url, timer);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = file.name;
    anchor.hidden = true;
    dialog.append(anchor);
    anchor.click();
    anchor.remove();
    status.textContent = 'Descarga solicitada. Adjunta el archivo descargado en la conversación de tu IA.';
  }
  function showMaterial(value) {
    if (!value || !Array.isArray(value.files) || !value.files.length || typeof value.prompt !== 'string'
      || value.files.some(file => !(file instanceof Blob) || typeof file.name !== 'string' || file.size <= 0)) {
      throw new Error('No se han podido preparar los archivos de este documento.');
    }
    material = value;
    const summary = value.summary ?? {};
    const title = summary.title || value.documentTitle || 'Documento abierto';
    const location = Number.isInteger(summary.originalStart) && Number.isInteger(summary.originalEnd)
      ? ` · páginas ${summary.originalStart}–${summary.originalEnd} del libro` : '';
    const selectedPage = Number.isInteger(summary.selectedLocalPage) && Number.isInteger(summary.selectedOriginalPage)
      ? ` · Estabas en la página ${summary.selectedLocalPage} del PDF (página ${summary.selectedOriginalPage} del libro).` : '';
    find('ai-document-summary').textContent = `${title}${location}${selectedPage}`;
    for (const warning of summary.warnings ?? []) {
      const item = document.createElement('li');
      item.textContent = String(warning);
      warnings.append(item);
    }
    warnings.hidden = warnings.children.length === 0;
    for (const file of value.files) {
      const item = document.createElement('li');
      const label = document.createElement('span');
      label.className = 'ai-file-name';
      label.textContent = `${file.name} · ${formatSize(file.size)}`;
      const downloadButton = document.createElement('button');
      downloadButton.type = 'button';
      downloadButton.className = 'button button-tonal';
      downloadButton.textContent = file.type === 'application/pdf' ? 'Descargar PDF' : 'Descargar texto OCR';
      downloadButton.addEventListener('click', () => download(file));
      item.append(label, downloadButton);
      filesList.append(item);
    }
    preparedPrompt.value = value.prompt;
    let supportsFiles = false;
    try { supportsFiles = typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: value.files }); } catch {}
    shareButton.hidden = !supportsFiles;
    find('ai-manual-share').open = !supportsFiles;
    setReady(true);
    updateProvider();
    status.textContent = `${value.files.length === 1 ? 'Archivo preparado' : `${value.files.length} archivos preparados`} en este dispositivo. Elige cómo compartirlo${value.files.length === 1 ? '' : 's'}.`;
  }
  async function prepare() {
    clearMaterial();
    const preparedGeneration = generation;
    if (!current()) return;
    if (!includePdf.checked && !includeText.checked) {
      status.textContent = 'Elige al menos el PDF o el texto extraído / OCR.';
      return;
    }
    status.textContent = 'Preparando únicamente el documento abierto…';
    try {
      const value = await getContext({ question: question.value.trim(), includePdf: includePdf.checked, includeText: includeText.checked });
      if (generation !== preparedGeneration || !current()) return;
      showMaterial(value);
    } catch (error) {
      if (generation !== preparedGeneration || !current()) return;
      clearMaterial();
      status.textContent = error?.message || 'No se pudo preparar el documento. Vuelve a abrirlo e inténtalo de nuevo.';
    }
  }
  function schedulePrepare() {
    clearMaterial();
    status.textContent = 'Actualizando la pregunta y los archivos…';
    prepareTimer = setTimeout(prepare, 300);
  }
  function open() {
    if (disposed) return;
    try { if (!isContextCurrent()) return; } catch { return; }
    restoreFocusOnClose = true;
    question.value = '';
    includePdf.checked = true;
    includeText.checked = true;
    promptDetails.open = false;
    find('ai-document-summary').textContent = 'Documento abierto';
    if (!dialog.open) dialog.showModal();
    void prepare();
  }
  function close({ restoreFocus = true } = {}) {
    restoreFocusOnClose = restoreFocus;
    clearMaterial();
    question.value = '';
    find('ai-document-summary').textContent = '';
    status.textContent = '';
    if (dialog.open) dialog.close();
  }
  function onClose() {
    if (dialog.open) return;
    clearMaterial();
    question.value = '';
    find('ai-document-summary').textContent = '';
    status.textContent = '';
    if (!disposed && restoreFocusOnClose && button.isConnected && !button.disabled && button.getClientRects().length) button.focus({ preventScroll: true });
  }
  function share() {
    if (!guard() || shareButton.disabled || shareButton.hidden) return;
    const sharedGeneration = generation;
    const sharedMaterial = material;
    const selected = provider();
    let request;
    try {
      // This call must remain synchronous inside the click gesture, before any await.
      request = navigator.share({ files: sharedMaterial.files, title: sharedMaterial.summary?.title || 'Documento de urgencias', text: sharedMaterial.prompt });
    } catch (error) {
      status.textContent = error?.name === 'AbortError' ? 'Has cancelado el menú de compartir.' : 'No se pudo abrir el menú. Puedes descargar los archivos y adjuntarlos desde la web.';
      return;
    }
    shareButton.disabled = true;
    Promise.resolve(request).then(() => {
      if (generation === sharedGeneration && current()) status.textContent = `Compartición solicitada al dispositivo. Comprueba en ${selected.name} que se hayan adjuntado los archivos y envía allí tu pregunta.`;
    }, error => {
      if (generation === sharedGeneration && current()) status.textContent = error?.name === 'AbortError'
        ? 'Has cancelado el menú de compartir. Puedes volver a abrirlo.'
        : 'No se pudieron compartir estos archivos. Puedes descargarlos y adjuntarlos desde la web.';
    }).finally(() => { if (generation === sharedGeneration && current()) shareButton.disabled = false; });
  }
  async function copyPrompt() {
    if (!guard()) return;
    const copiedGeneration = generation;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(material.prompt);
      if (generation === copiedGeneration && current()) status.textContent = 'Pregunta copiada. Pégala en la conversación junto a los archivos.';
    } catch {
      if (generation !== copiedGeneration || !current()) return;
      promptDetails.open = true;
      preparedPrompt.focus();
      preparedPrompt.select();
      status.textContent = 'Selecciona Copiar en tu dispositivo para copiar la pregunta marcada.';
    }
  }
  const onProviderOpen = event => { if (!guard() || providerLink.getAttribute('aria-disabled') === 'true') event.preventDefault(); };
  button.addEventListener('click', open);
  question.addEventListener('input', schedulePrepare);
  includePdf.addEventListener('change', prepare);
  includeText.addEventListener('change', prepare);
  for (const radio of dialog.querySelectorAll('[name="ai-provider"]')) radio.addEventListener('change', updateProvider);
  shareButton.addEventListener('click', share);
  copyButton.addEventListener('click', copyPrompt);
  providerLink.addEventListener('click', onProviderOpen);
  dialog.addEventListener('close', onClose);
  return {
    open,
    close,
    dispose() {
      disposed = true;
      close({ restoreFocus: false });
      button.removeEventListener('click', open);
      dialog.removeEventListener('close', onClose);
      dialog.remove();
    },
  };
}
