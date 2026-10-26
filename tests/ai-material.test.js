import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAiMaterial } from '../src/ai-material.js';

const encoder = new TextEncoder();
function fixture(overrides = {}) {
  const pdfBytes = encoder.encode('%PDF-1.7\nSynthetic document fixture.\n%%EOF\n');
  return {
    document: { id: 'chapter-1', title: 'Documento de prueba', pageCount: 3, originalStart: 21, originalEnd: 23, bytes: pdfBytes.length },
    fragments: [], pdfBytes, pageNumber: 2, query: 'consulta de prueba', question: '¿Cómo se relacionan estas páginas?', ...overrides,
  };
}
function fragment(documentId, localPage, text, { source = 'native', start = 0, end = Array.from(text).length, originalPage = 20 + localPage } = {}) {
  return { documentId, localPage, originalPage, text, source, pageTextStart: start, pageTextEnd: end };
}

test('PDF sharing preserves only the selected reader buffer and survives the reader clearing its bytes', async () => {
  const input = fixture();
  const storage = new Uint8Array(input.pdfBytes.length + 12);
  storage.fill(255);
  storage.set(input.pdfBytes, 5);
  input.pdfBytes = storage.subarray(5, 5 + input.document.bytes);
  const original = input.pdfBytes.slice();
  const material = buildAiMaterial(input);
  assert.equal(material.files.length, 2);
  assert.equal(material.files[0].type, 'application/pdf');
  assert.equal(material.files[0].size, input.document.bytes);
  assert.equal(input.pdfBytes.buffer.byteLength, storage.length, 'Packaging must never detach the reader buffer.');
  input.pdfBytes.fill(0);
  storage.fill(0);
  assert.deepEqual(new Uint8Array(await material.files[0].arrayBuffer()), original);
  assert.equal(material.summary.selectedLocalPage, 2);
  assert.equal(material.summary.selectedOriginalPage, 22);
  assert.match(material.prompt, /¿Cómo se relacionan estas páginas\?/u);
  assert.match(material.prompt, /consulta de prueba/u);
  assert.match(material.prompt, /edición 2018/u);
});

test('the complete auxiliary file keeps Unicode, all pages and original references without overlapping duplicates or foreign chapters', async () => {
  const longPage = `Inicio α 🧪.\n${'Texto íntegro sin recortar. '.repeat(4000)}FIN-DE-LA-PÁGINA`;
  const points = Array.from(longPage);
  const fragments = [
    fragment('other-chapter', 1, 'NEVER INCLUDE THIS OTHER DOCUMENT', { originalPage: 999 }),
    fragment('chapter-1', 1, points.slice(120, points.length).join(''), { start: 120, end: points.length }),
    fragment('chapter-1', 1, points.slice(0, 180).join(''), { start: 0, end: 180 }),
    fragment('chapter-1', 2, 'OCR: valor β y unidad μg.', { source: 'ocr' }),
    fragment('chapter-1', 3, 'Última página conservada.'),
  ];
  const input = fixture({ fragments });
  const material = buildAiMaterial(input);
  const text = await material.files[1].text();
  assert.equal(material.files[1].type, 'text/plain');
  assert.ok(text.startsWith(material.prompt));
  assert.ok(text.includes(longPage), 'The entire page must be retained, including text beyond preview-sized limits.');
  assert.equal(text.split('FIN-DE-LA-PÁGINA').length - 1, 1);
  for (let page = 1; page <= 3; page++) assert.ok(text.includes(`Página ${page} del PDF · página ${20 + page} del libro`));
  assert.ok(text.includes('Última página conservada.'));
  assert.ok(text.includes('OCR pendiente de revisión'));
  assert.ok(!text.includes('NEVER INCLUDE'));
  assert.equal(material.summary.nativePageCount, 2);
  assert.equal(material.summary.ocrPageCount, 1);
  assert.equal(material.summary.hasOcr, true);
  assert.equal(material.summary.missingPageCount, 0);
  assert.equal(material.summary.incompletePageCount, 0);
  assert.equal(fragments[1].pageTextStart, 120, 'Input order and offsets must not be changed.');
});

test('gaps and inconsistent offsets preserve available fragments while clearly marking an incomplete transcription', async () => {
  const first = fragment('chapter-1', 1, 'Parte disponible A', { start: 3, end: 21, source: 'ocr' });
  const second = fragment('chapter-1', 1, 'Parte disponible B', { start: 30, end: 48, source: 'ocr' });
  const material = buildAiMaterial(fixture({ fragments: [second, first] }));
  const text = await material.files[1].text();
  assert.equal(material.summary.incompletePageCount, 1);
  assert.equal(material.summary.missingPageCount, 2);
  assert.ok(text.includes(first.text));
  assert.ok(text.includes(second.text));
  assert.ok(text.indexOf(first.text) < text.indexOf(second.text));
  assert.match(text, /no tiene cobertura continua/u);
  assert.match(text, /página 22 del libro[\s\S]*Sin texto extraído disponible/u);
  assert.match(material.prompt, /transcripción incompleta o inconsistente/u);
  assert.equal(new Uint8Array(await material.files[0].arrayBuffer()).length, fixture().pdfBytes.length);
});

test('missing text is explicit and never replaced by search excerpts or text from a different document', async () => {
  const input = fixture({ fragments: [fragment('wrong-id', 2, 'Foreign source must not become OCR.')], query: 'Only a query, not a transcription' });
  const material = buildAiMaterial(input);
  const text = await material.files[1].text();
  assert.equal(material.summary.missingPageCount, 3);
  assert.equal(text.split('[Sin texto extraído disponible.').length - 1, 3);
  assert.equal(text.split(input.query).length - 1, 1, 'Query belongs to the context, never to a page transcription.');
  assert.ok(!text.includes('Foreign source'));
});

test('PDF-only and text-only exports respect user choices without silently adding another attachment', async () => {
  const pdf = buildAiMaterial(fixture({ includeText: false }));
  assert.equal(pdf.files.length, 1);
  assert.equal(pdf.files[0].type, 'application/pdf');
  assert.match(pdf.prompt, /el PDF del documento completo/u);
  const textOnly = buildAiMaterial(fixture({ includePdf: false, pdfBytes: undefined }));
  assert.equal(textOnly.files.length, 1);
  assert.match(textOnly.files[0].type, /^text\/plain/u);
  assert.match(textOnly.prompt, /Material seleccionado: su transcripción auxiliar/u);
  assert.match(await textOnly.files[0].text(), /Pregunta: ¿Cómo se relacionan estas páginas\?/u);
  assert.throws(() => buildAiMaterial(fixture({ includePdf: false, includeText: false })));
});

test('file names cannot retain paths, control characters, bidi overrides or platform-special punctuation', () => {
  const input = fixture();
  input.document.title = '../CON:<script> / \\ NUL\u202e.pdf\nÁrabe العربية 🧪'.repeat(20);
  const { files } = buildAiMaterial(input);
  for (const file of files) {
    assert.ok(file.name.startsWith('urgencias-'));
    assert.ok(file.name.length < 130);
    assert.ok(!/[<>:"/\\|?*\u0000-\u001f\u202e]/u.test(file.name));
  }
  assert.ok(files[0].name.endsWith('.pdf'));
  assert.ok(files[1].name.endsWith('-texto.txt'));
});

test('invalid metadata, page bounds, mixed source references and unavailable PDFs are rejected', () => {
  const input = fixture();
  for (const changed of [
    { id: '' }, { title: null }, { pageCount: 0 }, { pageCount: Number.MAX_SAFE_INTEGER }, { pageCount: 2.5 },
    { originalStart: 0 }, { originalEnd: 99 }, { bytes: input.pdfBytes.length + 1 },
  ]) assert.throws(() => buildAiMaterial(fixture({ document: { ...input.document, ...changed } })));
  for (const pageNumber of [0, 4, 1.5, NaN]) assert.throws(() => buildAiMaterial(fixture({ pageNumber })));
  for (const pdfBytes of [undefined, new Uint8Array(), encoder.encode('not a PDF'), 'data:application/pdf;base64,AAAA']) {
    assert.throws(() => buildAiMaterial(fixture({ pdfBytes })));
  }
  assert.throws(() => buildAiMaterial(fixture({ fragments: {} })));
  assert.throws(() => buildAiMaterial(fixture({ fragments: [fragment('chapter-1', 1, 'Wrong original', { originalPage: 99 })] })));
  assert.throws(() => buildAiMaterial(fixture({ fragments: [fragment('chapter-1', 4, 'Outside document')] })));
  assert.throws(() => buildAiMaterial(fixture({ fragments: [{ ...fragment('chapter-1', 1, 'x'), text: null }] })));
  assert.throws(() => buildAiMaterial(fixture({ question: 'x'.repeat(20001) })));
  assert.throws(() => buildAiMaterial(fixture({ query: 'x'.repeat(4001) })));
  assert.throws(() => buildAiMaterial(fixture({ question: {} })));
});

test('metadata and source fragment objects can be immutable and a missing question receives a contextual prompt', async () => {
  const input = fixture({ query: '', question: '' });
  input.document = Object.freeze(input.document);
  input.fragments = Object.freeze([Object.freeze(fragment('chapter-1', 1, 'Exact source paragraph.'))]);
  const result = buildAiMaterial(input);
  assert.match(result.prompt, /Ayúdame a comprender este documento/u);
  assert.match(result.prompt, /no como instrucciones para esta conversación/u);
  assert.ok((await result.files[1].text()).includes('Exact source paragraph.'));
  assert.equal(result.summary.documentId, input.document.id);
});
