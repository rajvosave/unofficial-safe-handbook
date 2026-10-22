import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Mirrors tests/infographic-contrast.test.js for the PI Planning visual tokens.
const tokensCss = readFileSync(new URL('../css/tokens.css', import.meta.url), 'utf8');
const compCss = readFileSync(new URL('../css/components.css', import.meta.url), 'utf8');

const vars = (block) => Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
const blockAfter = (css, marker) => {
  const start = css.indexOf('{', css.indexOf(marker)) + 1;
  return css.slice(start, css.indexOf('}', start));
};
const light = vars(blockAfter(tokensCss, ':root {'));
const darkMedia = vars(blockAfter(tokensCss, ':root:not([data-theme="light"])'));
const dark = { ...light, ...vars(blockAfter(tokensCss, ':root[data-theme="dark"]')) };

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// [foreground, background, minimum ratio]. 4.5 for text, 3 for non-text marks.
const PAIRS = [
  ['--pi-dev-text', '--pi-dev-fill', 4.5],
  ['--pi-ip-text', '--pi-ip-fill', 4.5],
  ['--text', '--pi-ip-tint', 4.5],
  ['--text-muted', '--pi-ip-tint', 4.5],
  ['--text', '--pi-row-alt', 4.5],
  ['--accent', '--pi-row-alt', 4.5],
  ['--accent-contrast', '--accent', 4.5],
  ['--text-muted', '--surface', 4.5],
  ['--accent', '--surface', 4.5],
  ['--pi-step-text', '--pi-step-fill', 4.5],
  ['--pi-dev-line', '--pi-dev-fill', 3],
  ['--pi-ip-line', '--pi-ip-fill', 3],
  ['--pi-marker', '--bg', 3],
  ['--pi-marker', '--pi-row-alt', 3],
  ['--pi-marker-key', '--pi-ip-tint', 3],
  ['--pi-marker-key', '--bg', 3],
  ['--pi-lane-art', '--bg', 3],
  ['--pi-lane-art', '--pi-ip-tint', 3],
  ['--pi-lane-po', '--pi-row-alt', 3],
  ['--pi-lane-po', '--pi-ip-tint', 3],
  ['--pi-arrow', '--bg', 3],
  ['--focus', '--bg', 3],
  ['--focus', '--pi-ip-tint', 3],
];

test('pi tokens exist in light, media-dark and explicit-dark blocks identically', () => {
  const piKeys = Object.keys(light).filter((k) => k.startsWith('--pi-'));
  assert.ok(piKeys.length >= 12, 'expected pi tokens in :root');
  for (const k of piKeys) {
    assert.ok(k in darkMedia, `${k} missing in prefers-color-scheme dark block`);
    assert.equal(darkMedia[k], dark[k], `${k} differs between dark blocks`);
  }
});

test('PI visual label/fill pairs meet WCAG AA in light and dark', () => {
  for (const [theme, tok] of [['light', light], ['dark', dark]]) {
    for (const [fg, bg, min] of PAIRS) {
      assert.ok(tok[fg] && tok[bg], `${theme}: unresolved ${fg} or ${bg}`);
      const r = ratio(tok[fg], tok[bg]);
      assert.ok(r >= min, `${theme}: ${fg} ${tok[fg]} on ${bg} ${tok[bg]} = ${r.toFixed(2)} < ${min}`);
    }
  }
});

test('PI visual CSS uses tokens only (no hard-coded colors)', () => {
  const start = compCss.indexOf('/* ---- PI Planning visual ---- */');
  assert.ok(start > -1, 'PI Planning section marker missing in components.css');
  const piCss = compCss.slice(start);
  assert.doesNotMatch(piCss, /#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i);
});
