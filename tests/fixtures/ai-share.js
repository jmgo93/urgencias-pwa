import '../../src/styles.css';
import '../../src/ai-share.css';
import { setupAiShare } from '../../src/ai-share-dialog.js';

const events = document.querySelector('#fixture-events');
const mode = document.querySelector('#fixture-mode');
const expire = document.querySelector('#fixture-expire');
const openButton = document.querySelector('#fixture-open');
let current = true;
let sequence = 0;
let invalidationTimer;

function record(type, detail = {}) {
  events.textContent += JSON.stringify({ sequence: ++sequence, type, ...detail }) + '\n';
}

// Every outbound action is replaced before the production dialogue is mounted.
Object.defineProperty(navigator, 'canShare', { configurable: true, value(data) {
  const supported = mode.value !== 'unsupported' && Array.isArray(data?.files) && data.files.length > 0;
  record('canShare', { supported, files: data?.files?.map(file => file.name) ?? [] });
  return supported;
} });
Object.defineProperty(navigator, 'share', { configurable: true, value(data) {
  record('share', { userActivation: navigator.userActivation?.isActive === true,
    files: data.files?.map(file => ({ name: file.name, type: file.type, size: file.size })),
    title: data.title, text: data.text, url: data.url ?? null });
  if (mode.value === 'cancel') return Promise.reject(new DOMException('Synthetic cancellation', 'AbortError'));
  if (mode.value === 'error') return Promise.reject(new DOMException('Synthetic denial', 'NotAllowedError'));
  return Promise.resolve();
} });
Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText(text) {
  record('clipboard', { text });
  return Promise.resolve();
} } });
window.open = (url) => { record('provider-open', { url: String(url) }); return null; };
const nativeAnchorClick = HTMLAnchorElement.prototype.click;
HTMLAnchorElement.prototype.click = function click() {
  if (this.download) {
    record('download', { name: this.download, blobURL: this.href.startsWith('blob:') });
    return;
  }
  return nativeAnchorClick.call(this);
};
document.addEventListener('click', event => {
  const anchor = event.target.closest('a');
  if (!anchor) return;
  if (anchor.download) {
    event.preventDefault();
    record('download', { name: anchor.download, blobURL: anchor.href.startsWith('blob:') });
  } else if (anchor.id === 'ai-open-provider') {
    if (!event.defaultPrevented) record('provider-open', { url: anchor.href });
    event.preventDefault();
  }
});

const controller = setupAiShare({
  button: openButton,
  isContextCurrent: () => current,
  async getContext({ question, includePdf, includeText }) {
    record('prepare-start', { question, includePdf, includeText });
    await new Promise(resolve => setTimeout(resolve, 180));
    const prompt = `MATERIAL SINTÉTICO DE PRUEBA. Pregunta: ${question || 'Explica el documento de prueba.'}`;
    const files = [];
    if (includePdf) files.push(new File(['%PDF-1.4\nDocumento sintético de prueba.\n%%EOF'], 'documento-sintetico.pdf', { type: 'application/pdf' }));
    if (includeText) files.push(new File([prompt + '\nPágina original 12; página 2 del documento.\nOCR sintético: texto de prueba.'], 'documento-sintetico-ocr.txt', { type: 'text/plain;charset=utf-8' }));
    record('prepare-end', { files: files.map(file => file.name) });
    return { files, prompt, summary: {
      title: 'Documento sintético — no contiene el libro', pageCount: 3,
      originalStart: 11, originalEnd: 13, selectedLocalPage: 2, selectedOriginalPage: 12,
      ocrPageCount: 1, warnings: ['OCR sintético pendiente de revisión.'],
    } };
  },
});

openButton.addEventListener('click', () => {
  if (!expire.checked) return;
  clearTimeout(invalidationTimer);
  invalidationTimer = setTimeout(() => {
    current = false;
    record('context-expired');
  }, 60);
});
document.querySelector('#fixture-reset').addEventListener('click', () => {
  current = true;
  clearTimeout(invalidationTimer);
  events.textContent = '';
  sequence = 0;
  controller.close({ restoreFocus: false });
  record('reset');
});
record('fixture-ready', { outboundActionsMocked: true });
