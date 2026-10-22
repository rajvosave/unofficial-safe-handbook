import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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

const PAIRS = [
  ['--sr-text', '--sr-fill', 4.5],
  ['--sr-muted', '--sr-fill', 4.5],
  ['--sr-text', '--sr-hover', 4.5],
  ['--sr-muted', '--sr-hover', 4.5],
  ['--sr-active-text', '--sr-active-fill', 4.5],
  ['--sr-active-muted', '--sr-active-fill', 4.5],
  ['--sr-line', '--bg', 3],
  ['--sr-line', '--surface', 3],
  ['--focus', '--sr-fill', 3],
  ['--focus', '--surface', 3],
];

test('search tokens exist identically in light, media-dark and explicit-dark blocks', () => {
  const keys = Object.keys(light).filter((k) => k.startsWith('--sr-'));
  assert.ok(keys.length >= 8, 'expected --sr- tokens in :root');
  for (const k of keys) {
    assert.ok(k in darkMedia, `${k} missing in prefers-color-scheme dark block`);
    assert.equal(darkMedia[k], dark[k], `${k} differs between dark blocks`);
  }
});

test('search label/fill pairs meet WCAG AA in light and dark', () => {
  for (const [theme, tok] of [['light', light], ['dark', dark]]) {
    for (const [fg, bg, min] of PAIRS) {
      assert.ok(tok[fg] && tok[bg], `${theme}: unresolved ${fg} or ${bg}`);
      const r = ratio(tok[fg], tok[bg]);
      assert.ok(r >= min, `${theme}: ${fg} ${tok[fg]} on ${bg} ${tok[bg]} = ${r.toFixed(2)} < ${min}`);
    }
  }
});

test('search CSS uses tokens only (no hard-coded colors)', () => {
  const start = compCss.indexOf('/* ---- Search ---- */');
  assert.ok(start > -1, 'Search section marker missing in components.css');
  const end = compCss.indexOf('/* ---- ', start + 5);
  const css = compCss.slice(start, end === -1 ? undefined : end);
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i);
});
