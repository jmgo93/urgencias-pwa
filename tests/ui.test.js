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
