import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { SECTION_THEMES, FALLBACK_SECTION_THEME, sectionTheme } from '../src/section-themes.js';
import { renderSectionTokens } from '../scripts/generate-section-tokens.mjs';

test('every book section has a stable, distinct color identity and local outline icon', () => {
  assert.deepEqual(SECTION_THEMES.map(theme => theme.id), Array.from({ length: 25 }, (_, index) => `s${String(index).padStart(2, '0')}`));
  assert.equal(new Set(SECTION_THEMES.map(theme => theme.slug)).size, 25);
  assert.equal(new Set(SECTION_THEMES.map(theme => theme.icon)).size, 25);
  for (const theme of SECTION_THEMES) {
    assert.equal(sectionTheme(theme.id), theme);
    assert.match(theme.slug, /^[a-z]+(?:-[a-z]+)*$/);
    assert.ok(theme.label.trim());
    assert.ok(theme.hue >= 0 && theme.hue < 360);
    assert.ok(theme.chroma > 0);
    assert.match(theme.icon, /^<(?:path|circle|rect) /);
    assert.doesNotMatch(theme.icon, /<(?:script|image|use|foreignObject)|on\w+=|href=|style=/i);
    assert.ok(Object.isFrozen(theme));
  }
});

test('unknown identities always use a safe neutral theme and never enter CSS selectors or SVG', () => {
  for (const id of [undefined, null, '', 's25', 'S03', '__proto__', 's03"]{color:red}', '<script>bad()</script>', {}, 3]) {
    assert.equal(sectionTheme(id), FALLBACK_SECTION_THEME);
  }
  assert.equal(sectionTheme({ toString() { throw Error('must not coerce external data'); } }), FALLBACK_SECTION_THEME);
  assert.equal(FALLBACK_SECTION_THEME.id, 'other');
});

const channels = hex => hex.slice(1).match(/../g).map(channel => parseInt(channel, 16) / 255)
  .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
function luminance(hex) {
  const [red, green, blue] = channels(hex);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}
function contrast(left, right) {
  const values = [luminance(left), luminance(right)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
function tokensFor(source, id) {
  const rule = source.split(`[data-section-theme="${id}"] {`)[1]?.split('}')[0];
  assert.ok(rule, `Missing CSS identity ${id}`);
  return Object.fromEntries([...rule.matchAll(/--section-([a-z-]+): (#[a-f\d]{6});/g)].map(([, role, color]) => [role, color]));
}

test('generated section roles are reproducible, unique and readable in light and dark themes', async () => {
  const css = await readFile(new URL('../src/section-tokens.css', import.meta.url), 'utf8');
  assert.equal(css, renderSectionTokens(), 'Run the generator after changing a section seed.');
  const [light, dark] = css.split('@media (prefers-color-scheme: dark) {');
  const appTokens = await readFile(new URL('../src/tokens.css', import.meta.url), 'utf8');
  const [appLight, appDark] = appTokens.split('@media (prefers-color-scheme: dark) {');
  for (const [mode, source, appSource] of [['light', light, appLight], ['dark', dark, appDark]]) {
    const surface = appSource.match(/--md-sys-color-surface: (#[a-f\d]{6});/)[1];
    const accents = new Set();
    for (const theme of [FALLBACK_SECTION_THEME, ...SECTION_THEMES]) {
      const tokens = tokensFor(source, theme.id);
      assert.equal(Object.keys(tokens).length, 3);
      assert.ok(contrast(tokens.accent, surface) >= 4.5, `${theme.id} ${mode}: accent must remain legible on app surface.`);
      assert.ok(contrast(tokens['on-container'], tokens.container) >= 4.5, `${theme.id} ${mode}: text must remain legible on section container.`);
      assert.ok(contrast(tokens.accent, tokens.container) >= 4.5, `${theme.id} ${mode}: accent can label its tonal container.`);
      if (theme.id !== 'other') accents.add(tokens.accent);
    }
    assert.equal(accents.size, 25, `${mode}: sections must have distinct generated accents.`);
  }
});
