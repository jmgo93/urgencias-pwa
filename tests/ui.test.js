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
  assert.ok(full.startsWith('<article'));
  assert.ok(full.includes('class="result-title-button" data-open-result="frag-7"'));
  for (const text of ['Resumen de la coincidencia.', 'Referencia de texto: Exploraciones',
    'Urgencias neurológicas', 'OCR pendiente de revisión', 'cefalea',
    'Sin coincidencia en este fragmento: fiebre.', 'Pág. 74 del libro', 'pág. 4 del PDF', '7 páginas', 'Abrir página']) {
    assert.ok(full.includes(text), `Full view keeps ${text}`);
    assert.ok(compact.includes(text), `Compact view keeps ${text} behind its title.`);
  }
  assert.ok(compact.indexOf('result-snippet') > compact.indexOf('</summary>'));
  assert.ok(compact.includes('data-open-result="frag-7"'));
});
