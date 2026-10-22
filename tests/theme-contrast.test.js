import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Global check of the base theme tokens (component tokens have their own tests).
const css = readFileSync(new URL('../css/tokens.css', import.meta.url), 'utf8');
const vars = (block) => Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
const blockAfter = (marker) => {
  const start = css.indexOf('{', css.indexOf(marker)) + 1;
  return css.slice(start, css.indexOf('}', start));
};
const light = vars(blockAfter(':root {'));
const dark = { ...light, ...vars(blockAfter(':root[data-theme="dark"]')) };

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// [foreground, background, minimum]
const PAIRS = [
  ['--text', '--bg', 4.5],
  ['--text', '--surface', 4.5],
  ['--text-muted', '--bg', 4.5],
  ['--text-muted', '--surface', 4.5],
  ['--accent', '--bg', 4.5],
  ['--accent', '--surface', 4.5],
  ['--accent-contrast', '--accent', 4.5],
  ['--focus', '--bg', 3],
  ['--focus', '--surface', 3],
  ['--control-border', '--bg', 3],
  ['--control-border', '--surface', 3],
];

for (const [name, tok] of [['light', light], ['dark', dark]]) {
  test(`base tokens meet contrast minimums in the ${name} theme`, () => {
    for (const [fg, bg, min] of PAIRS) {
      assert.ok(tok[fg] && tok[bg], `${name}: unresolved ${fg} or ${bg}`);
      const r = ratio(tok[fg], tok[bg]);
      assert.ok(r >= min, `${name} ${fg} ${tok[fg]} on ${bg} ${tok[bg]} = ${r.toFixed(2)} < ${min}`);
    }
  });
}

test('tokens.css declares no custom property twice in one block', () => {
  for (const block of css.split('}')) {
    const names = [...block.matchAll(/(--[\w-]+):/g)].map((m) => m[1]);
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    assert.deepEqual(dupes, [], `duplicated: ${dupes.join(', ')}`);
  }
});
