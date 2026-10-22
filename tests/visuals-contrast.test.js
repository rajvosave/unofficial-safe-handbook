import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Same approach as tests/pi-contrast.test.js, for the Inspect & Adapt (--ia-*),
// artifact hierarchy (--av-*) and role cards (--rv-*) visuals.
const tokensCss = readFileSync(new URL('../css/tokens.css', import.meta.url), 'utf8');
const compCss = readFileSync(new URL('../css/components.css', import.meta.url), 'utf8');

const vars = (block) => Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*(#[0-9a-f]{6})/gi)].map((m) => [m[1], m[2]]));
const blockAfter = (css, marker) => {
  const start = css.indexOf('{', css.indexOf(marker)) + 1;
  return css.slice(start, css.indexOf('}', start));
};
const light = vars(blockAfter(tokensCss, ':root {'));
const darkMedia = vars(blockAfter(tokensCss, ':root:not([data-theme="light"])'));
const darkExplicit = vars(blockAfter(tokensCss, ':root[data-theme="dark"]'));
const dark = { ...light, ...darkExplicit };

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// [foreground, background, minimum]. 4.5 for text, 3 for non-text marks.
const PAIRS = [
  // Inspect & Adapt: steps (rest, hover, expanded), numbers, arrows, workshop
  ['--ia-step-text', '--ia-step-fill', 4.5],
  ['--ia-step-muted', '--ia-step-fill', 4.5],
  ['--ia-step-text', '--ia-step-hover', 4.5],
  ['--ia-step-muted', '--ia-step-hover', 4.5],
  ['--ia-step-text', '--ia-step-open', 4.5],
  ['--ia-step-muted', '--ia-step-open', 4.5],
  ['--ia-num-text', '--ia-num-fill', 4.5],
  ['--ia-step-line', '--ia-step-fill', 3],
  ['--ia-step-line', '--bg', 3],
  ['--ia-arrow', '--bg', 3],
  ['--ia-ws-text', '--ia-ws-fill', 4.5],
  ['--ia-ws-line', '--ia-ws-fill', 3],
  ['--ia-ws-num-text', '--ia-ws-num-fill', 4.5],
  ['--accent', '--bg', 4.5],
  ['--accent', '--ia-step-fill', 4.5],
  ['--text-muted', '--bg', 4.5],
  // Artifact hierarchy: nodes (rest, hover), enablers (rest, hover), tags, connectors
  ['--av-node-text', '--av-node-fill', 4.5],
  ['--av-node-muted', '--av-node-fill', 4.5],
  ['--av-node-text', '--av-node-hover', 4.5],
  ['--av-node-muted', '--av-node-hover', 4.5],
  ['--av-node-line', '--bg', 3],
  ['--av-en-text', '--av-en-fill', 4.5],
  ['--av-en-muted', '--av-en-fill', 4.5],
  ['--av-en-text', '--av-en-hover', 4.5],
  ['--av-en-muted', '--av-en-hover', 4.5],
  ['--av-en-line', '--bg', 3],
  ['--av-tag-text', '--av-tag-fill', 4.5],
  ['--av-connector', '--bg', 3],
  // Role cards: rest, hover, selected, highlighted, badges, links
  ['--rv-card-text', '--rv-card-fill', 4.5],
  ['--rv-card-muted', '--rv-card-fill', 4.5],
  ['--rv-card-text', '--rv-hover', 4.5],
  ['--rv-card-muted', '--rv-hover', 4.5],
  ['--accent', '--rv-card-fill', 4.5],
  ['--rv-sel-text', '--rv-sel-fill', 4.5],
  ['--rv-sel-muted', '--rv-sel-fill', 4.5],
  ['--rv-sel-badge-text', '--rv-sel-badge-fill', 4.5],
  ['--rv-hl-text', '--rv-hl-fill', 4.5],
  ['--rv-hl-muted', '--rv-hl-fill', 4.5],
  ['--accent', '--rv-hl-fill', 4.5],
  ['--rv-hl-line', '--rv-hl-fill', 3],
  ['--rv-hl-line', '--bg', 3],
  ['--rv-badge-text', '--rv-badge-fill', 4.5],
  ['--rv-sel-fill', '--bg', 3],
  // Role pages: responsibility / anti-pattern cards
  ['--text', '--cl-do-fill', 4.5],
  ['--text', '--cl-avoid-fill', 4.5],
  ['--cl-do-icon-text', '--cl-do-line', 4.5],
  ['--cl-avoid-icon-text', '--cl-avoid-line', 4.5],
  ['--cl-do-line', '--cl-do-fill', 3],
  ['--cl-avoid-line', '--cl-avoid-fill', 3],
  // Focus ring (drawn outside the element, on the page or box background)
  ['--focus', '--bg', 3],
  ['--focus', '--surface', 3],
];

const PREFIXES = ['--ia-', '--av-', '--rv-', '--cl-'];
const ours = (k) => PREFIXES.some((p) => k.startsWith(p));

test('ia/av/rv tokens exist in light, media-dark and explicit-dark blocks identically', () => {
  const keys = Object.keys(light).filter(ours);
  assert.ok(keys.length >= 30, `expected visual tokens in :root, found ${keys.length}`);
  for (const k of keys) {
    assert.ok(k in darkMedia, `${k} missing in prefers-color-scheme dark block`);
    assert.ok(k in darkExplicit, `${k} missing in [data-theme="dark"] block`);
    assert.equal(darkMedia[k], darkExplicit[k], `${k} differs between dark blocks`);
    assert.notEqual(light[k], darkExplicit[k], `${k} has no dark override`);
  }
  for (const k of [...Object.keys(darkMedia), ...Object.keys(darkExplicit)].filter(ours)) {
    assert.ok(k in light, `${k} missing in :root`);
  }
});

test('every pair token is defined and every new token is covered by a pair', () => {
  const used = new Set(PAIRS.flatMap(([a, b]) => [a, b]));
  for (const k of Object.keys(light).filter(ours)) assert.ok(used.has(k), `${k} has no contrast pair`);
});

test('visual label/fill pairs meet WCAG AA in light and dark', () => {
  for (const [theme, tok] of [['light', light], ['dark', dark]]) {
    for (const [fg, bg, min] of PAIRS) {
      assert.ok(tok[fg] && tok[bg], `${theme}: unresolved ${fg} or ${bg}`);
      const r = ratio(tok[fg], tok[bg]);
      assert.ok(r >= min, `${theme}: ${fg} ${tok[fg]} on ${bg} ${tok[bg]} = ${r.toFixed(2)} < ${min}`);
    }
  }
});

test('visual CSS uses tokens only and respects reduced motion', () => {
  const start = compCss.indexOf('/* ---- Inspect & Adapt, artifacts and roles visuals ---- */');
  assert.ok(start > -1, 'section marker missing in components.css');
  const css = compCss.slice(start);
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgb\(|hsl\(/i);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  for (const v of css.matchAll(/var\((--(?:ia|av|rv)-[\w-]+)\)/g)) assert.ok(v[1] in light, `${v[1]} used but not defined`);
});
