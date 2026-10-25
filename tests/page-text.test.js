import test from 'node:test';
import assert from 'node:assert/strict';
import { reconstructPage } from '../src/page-text.js';
test('overlapping search fragments reconstruct exact source text without duplicate paragraphs', () => {
  const text = 'Primera línea.\nSegunda fórmula α + β.\nÚltima línea 🧪.';
  const points = Array.from(text);
  const fragments = [[0, 25], [15, 40], [32, points.length]].map(([start, end]) => ({
    pageTextStart: start, pageTextEnd: end, text: points.slice(start, end).join(''),
  }));
  assert.equal(reconstructPage(fragments.reverse()), text);
});
test('incomplete or corrupted source fragments are not silently presented as a complete page', () => {
  assert.throws(() => reconstructPage([{ pageTextStart: 2, pageTextEnd: 5, text: 'abc' }]));
  assert.throws(() => reconstructPage([{ pageTextStart: 0, pageTextEnd: 5, text: 'abc' }]));
});
