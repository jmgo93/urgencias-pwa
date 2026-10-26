import test from 'node:test';
import assert from 'node:assert/strict';
import { renderResults, renderSectionBadge } from '../src/ui.js';
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

test('stars identify the best exact passage and its page without treating every PDF as the global best', () => {
  const base = { sectionId: 's03', sectionTitle: 'Urgencias cardiovasculares', title: 'Documento', matchedTerms: ['disnea'] };
  const rows = [
    { ...base, id: 'early', documentId: 'a', localPage: 1, originalPage: 100, occurrenceStart: 0, score: 10 },
    { ...base, id: 'later-first', documentId: 'a', localPage: 2, originalPage: 101, occurrenceStart: 0, score: 20 },
    { ...base, id: 'later-best', documentId: 'a', localPage: 2, originalPage: 101, occurrenceStart: 100, score: 40 },
    { ...base, id: 'other', documentId: 'b', localPage: 1, originalPage: 200, score: 30 },
  ];
  for (const compact of [false, true]) {
    const html = renderResults(rows, [], { compact });
    const occurrences = new Map([...html.matchAll(/<article class="result-occurrence" data-occurrence-id="([^"]+)">([\s\S]*?)<\/article>/g)].map(match => [match[1], match[2]]));
    assert.equal((html.match(/data-best-match="global"/g) ?? []).length, 1);
    assert.equal((html.match(/data-best-match="page"/g) ?? []).length, 2);
    assert.equal((html.match(/data-best-match="occurrence"/g) ?? []).length, 2);
    assert.ok(occurrences.get('later-best').includes('data-best-match="occurrence"'));
    assert.ok(!occurrences.get('early').includes('data-best-match'));
    assert.ok(!occurrences.get('later-first').includes('data-best-match'));
    const firstSummary = html.match(/<summary class="result-summary">([\s\S]*?)<\/summary>/)[1];
    assert.ok(firstSummary.includes('data-best-match="global"'));
    assert.ok(firstSummary.includes('Mejor coincidencia'));
    const pages = [...html.matchAll(/<details class="result-page" data-local-page="([^"]+)"[^>]*>([\s\S]*?)<\/details>/g)];
    assert.ok(!pages[0][2].includes('data-best-match="page"'));
    assert.ok(pages[1][2].includes('data-best-match="page"'));
    assert.ok(pages[1][2].includes('Mejor en este PDF'));
    assert.equal((html.match(/data-open-result=/g) ?? []).length, rows.length);
  }
});

test('compact PDF headers keep a named section identity with its icon and safe theme independently of supplied titles', () => {
  const rows = [
    { id: 'cardio', documentId: 'a', sectionId: 's03', sectionTitle: 'Texto ajeno al nombre', title: 'Uno', localPage: 1, score: 20 },
    { id: 'resp', documentId: 'b', sectionId: 's04', title: 'Dos', localPage: 1, score: 10 },
    { id: 'unknown', documentId: 'c', sectionId: 's03" onclick="bad()', title: 'Tres', localPage: 1, score: 5 },
  ];
  const html = renderResults(rows, [], { compact: true });
  const summaries = [...html.matchAll(/<summary class="result-summary">([\s\S]*?)<\/summary>/g)].map(match => match[1]);
  assert.ok(summaries[0].includes('data-section-theme="s03"'));
  assert.ok(summaries[1].includes('data-section-theme="s04"'));
  assert.ok(summaries[2].includes('data-section-theme="other"'));
  for (const summary of summaries) {
    assert.ok(summary.includes('section-icon'));
    assert.ok(summary.includes('aria-hidden="true"'));
    assert.ok(!summary.includes('data-open-result'));
    assert.ok(!summary.includes('result-snippet'));
  }
  assert.ok(!html.includes('onclick'));
  assert.ok(summaries[2].includes('Otras secciones'));
  assert.notEqual(summaries[0].match(/<svg[\s\S]*?<\/svg>/)[0], summaries[1].match(/<svg[\s\S]*?<\/svg>/)[0]);
});

test('the shared section badge cannot accept a selector, class attribute or SVG payload from untrusted metadata', () => {
  const badge = renderSectionBadge('s04][onmouseover=bad()]', { className: 'x" onfocus="bad()' });
  assert.ok(badge.includes('data-section-theme="other"'));
  assert.ok(badge.includes('Otras secciones'));
  assert.ok(badge.includes('x&quot; onfocus=&quot;bad()'));
  assert.ok(!badge.includes(' onfocus="'));
  assert.ok(!badge.includes('onmouseover'));
});
