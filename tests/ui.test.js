import test from 'node:test';
import assert from 'node:assert/strict';
import { renderResults } from '../src/ui.js';
test('source text and query labels cannot introduce executable HTML in results', () => {
  const html = renderResults([{ id: 'x" onclick="alert(1)', title: '<img src=x onerror=alert(1)>',
    excerpt: '<script>alert(1)</script>', matchedTerms: ['<iframe>'], missingTerms: ['<object>'],
    sectionTitle: '<svg onload=alert(1)>', originalPage: 74, localPage: 4 }]);
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('<script'));
  assert.ok(!html.includes('<iframe'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('Pág. 74 del libro'));
  assert.ok(html.includes('pág. 4 del PDF'));
});
test('missing subsection metadata never appears as an undefined heading', () => {
  const html = renderResults([{ id: 'page', title: 'Documento', excerpt: 'Texto', matchedTerms: [],
    originalPage: 74, localPage: 4, bytes: 1048576, pageCount: 7 }]);
  assert.ok(!html.includes('undefined'));
  assert.ok(!html.includes('Referencia de texto'));
  assert.ok(html.includes('7 páginas'));
});

test('compact results use closed native disclosures whose title reveals the summary rather than opening a PDF', () => {
  const html = renderResults([{ id: 'x" onclick="bad()', title: '<img src=x onerror=bad()>',
    excerpt: '<script>bad()</script>', matchedTerms: ['<iframe>'], originalPage: 74, localPage: 4 }], [], { compact: true });
  const opening = html.match(/^<details\b[^>]*>/)?.[0];
  const summary = html.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/)?.[1];
  assert.ok(opening);
  assert.ok(!/\sopen(?:\s|=|>)/.test(opening), 'Each new compact result starts closed.');
  assert.ok(summary.includes('<h2>'));
  assert.ok(summary.includes('&lt;img'));
  assert.ok(!summary.includes('data-open-result'));
  assert.ok(!summary.includes('result-snippet'));
  assert.ok(!summary.includes('Pág.'));
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('<script'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.equal((html.match(/data-open-result=/g) ?? []).length, 1, 'The explicit PDF action stays inside the expanded body.');
});

test('compact and complete result views preserve the same evidence, warnings and PDF destinations', () => {
  const result = { id: 'frag-7', title: 'Documento', excerpt: 'Resumen de la coincidencia.',
    subsectionTitle: 'Exploraciones', sectionTitle: 'Urgencias neurológicas', source: 'ocr',
    matchedTerms: ['cefalea'], missingTerms: ['fiebre'], originalPage: 74, localPage: 4,
    bytes: 1048576, pageCount: 7 };
  const full = renderResults([result]);
  const compact = renderResults([result], [], { compact: true });
  assert.match(full, /^<details\b[^>]*\sopen>/);
  assert.equal((full.match(/data-open-result="frag-7"/g) ?? []).length, 1);
  for (const text of ['Resumen de la coincidencia.', 'Referencia de texto: Exploraciones',
    'Urgencias neurológicas', 'OCR pendiente de revisión', 'cefalea',
    'Sin coincidencia en este fragmento: fiebre.', 'Pág. 74 del libro', 'pág. 4 del PDF', '7 páginas', 'Abrir página']) {
    assert.ok(full.includes(text), `Full view keeps ${text}`);
    assert.ok(compact.includes(text), `Compact view keeps ${text} behind its title.`);
  }
  assert.ok(compact.indexOf('result-snippet') > compact.indexOf('</summary>'));
  assert.ok(compact.includes('data-open-result="frag-7"'));
});

test('PDF identity groups pages and every occurrence without merging documents with the same title', () => {
  const base = { title: 'Mismo título', sectionTitle: 'Sección', matchedTerms: ['disnea'], bytes: 1048576, pageCount: 8 };
  const rows = [
    { ...base, id: 'a-page-2', documentId: 'pdf-a', originalPage: 75, localPage: 2, excerpt: 'Segunda página.', score: 400, occurrenceStart: 0 },
    { ...base, id: 'a-page-1-second', documentId: 'pdf-a', originalPage: 74, localPage: 1, excerpt: 'Segundo pasaje de la primera página.', score: 200, occurrenceStart: 80 },
    { ...base, id: 'a-page-1-first', documentId: 'pdf-a', originalPage: 74, localPage: 1, excerpt: 'Primer pasaje de la primera página.', score: 300, occurrenceStart: 0 },
    { ...base, id: 'a-page-4', documentId: 'pdf-a', originalPage: 77, localPage: 4, excerpt: 'Cuarta página.', score: 100 },
    { ...base, id: 'b-page-1', documentId: 'pdf-b', originalPage: 300, localPage: 1, excerpt: 'Otro documento.', score: 900 },
  ];
  const html = renderResults(rows);
  assert.equal((html.match(/class="result-card result-document-card/g) ?? []).length, 2);
  assert.equal((html.match(/class="result-page"/g) ?? []).length, 4);
  assert.equal((html.match(/class="result-occurrence"/g) ?? []).length, 5);
  assert.equal((html.match(/<h2><span>Mismo título<\/span>/g) ?? []).length, 2);
  assert.ok(html.includes('3 páginas con 4 coincidencias'));
  assert.ok(html.includes('1 página con 1 coincidencia'));
  assert.ok(html.indexOf('data-document-id="pdf-b"') < html.indexOf('data-document-id="pdf-a"'), 'Best document evidence determines card ranking.');
  const pdfA = html.slice(html.indexOf('data-document-id="pdf-a"'));
  assert.ok(pdfA.indexOf('data-local-page="1"') < pdfA.indexOf('data-local-page="2"'));
  assert.ok(pdfA.indexOf('data-local-page="2"') < pdfA.indexOf('data-local-page="4"'));
  assert.ok(pdfA.indexOf('data-occurrence-id="a-page-1-first"') < pdfA.indexOf('data-occurrence-id="a-page-1-second"'));
  assert.match(pdfA, /class="result-page" data-local-page="2" open>/);
  assert.match(pdfA, /class="result-page" data-local-page="1">/);
  for (const row of rows) {
    assert.equal((html.match(new RegExp(`data-open-result="${row.id}"`, 'g')) ?? []).length, 1, `${row.id} has its own exact PDF destination.`);
    assert.ok(html.includes(row.excerpt));
  }
});

test('compact and expanded PDF groups retain all page selectors and occurrence actions', () => {
  const rows = [
    { id: 'one', documentId: 'pdf', title: 'Documento', excerpt: 'Primer pasaje.', originalPage: 11, localPage: 1, score: 10 },
    { id: 'two', documentId: 'pdf', title: 'Documento', excerpt: 'Otro pasaje.', originalPage: 11, localPage: 1, score: 8 },
    { id: 'three', documentId: 'pdf', title: 'Documento', excerpt: 'Otra página.', originalPage: 13, localPage: 3, source: 'ocr', score: 9 },
  ];
  const expanded = renderResults(rows);
  const compact = renderResults(rows, [], { compact: true });
  assert.match(expanded, /^<details\b[^>]*\sopen>/);
  assert.doesNotMatch(compact.match(/^<details\b[^>]*>/)[0], /\sopen(?:\s|=|>)/);
  assert.equal((compact.match(/class="result-page"/g) ?? []).length, 2);
  assert.ok(compact.includes('2 páginas con 3 coincidencias'));
  for (const row of rows) {
    assert.ok(expanded.includes(`data-open-result="${row.id}"`));
    assert.ok(compact.includes(`data-open-result="${row.id}"`));
    assert.ok(compact.includes(row.excerpt));
  }
  assert.ok(compact.includes('OCR pendiente de revisión'));
  assert.ok(!compact.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/)[1].includes('data-open-result'));
});

test('group metadata is escaped and a missing PDF identity never merges unrelated results by title', () => {
  const html = renderResults([
    { id: 'safe', documentId: 'pdf" onclick="bad()', title: 'Documento', excerpt: 'Texto', localPage: '1" onclick="bad()', originalPage: '<img src=x>' },
    { id: 'no-doc-1', title: 'Título repetido', excerpt: 'Uno.' },
    { id: 'no-doc-2', title: 'Título repetido', excerpt: 'Dos.' },
  ]);
  assert.equal((html.match(/class="result-card result-document-card/g) ?? []).length, 3);
  assert.ok(html.includes('data-document-id="pdf&quot; onclick=&quot;bad()"'));
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes(' onclick="bad()'));
  assert.ok(!html.includes('undefined'));
});
