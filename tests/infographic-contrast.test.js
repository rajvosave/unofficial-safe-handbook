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
const dark = vars(blockAfter(tokensCss, ':root[data-theme="dark"]'));

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// Collect every rule in components.css that sets --hs-* variant properties.
function variants() {
  const out = [];
  let base = null;
  for (const m of compCss.matchAll(/([^{}]+)\{([^{}]*--hs-[^{}]*)\}/g)) {
    const props = Object.fromEntries([...m[2].matchAll(/(--hs-[\w-]+):\s*var\((--[\w-]+)\)/g)].map((p) => [p[1], p[2]]));
    const sel = m[1].trim().split('\n').pop().trim();
    if (sel === '.hotspot') base = props;
    else out.push({ sel, props });
  }
  return [{ sel: '.hotspot', props: base }, ...out.map((v) => ({ sel: v.sel, props: { ...base, ...v.props } }))];
}

test('dark tokens are identical in the media-query block and the explicit theme block', () => {
  assert.deepEqual(darkMedia, dark);
});

test('every hotspot variant label is >= 4.5:1 on its normal and hover/focus fill, light and dark', () => {
  const vs = variants();
  assert.ok(vs.length >= 6, 'expected base + variant rules');
  for (const [theme, tok] of [['light', light], ['dark', { ...light, ...dark }]]) {
    for (const { sel, props } of vs) {
      for (const state of ['--hs-fill', '--hs-fill-hover']) {
        const bg = tok[props[state]];
        const fg = tok[props['--hs-text']];
        assert.ok(bg && fg, `${theme} ${sel} ${state}: unresolved token`);
        const r = ratio(fg, bg);
        assert.ok(r >= 4.5, `${theme} ${sel} ${state}: ${fg} on ${bg} = ${r.toFixed(2)}`);
      }
    }
  }
});

test('hover/focus fill is driven by a single rule, not per-variant overrides', () => {
  const stateRules = [...compCss.matchAll(/([^{}]*:(?:hover|focus)[^{}]*)\{([^}]*)\}/g)].filter((m) => /\bfill\s*:/.test(m[2]));
  assert.equal(stateRules.length, 1, stateRules.map((m) => m[1].trim()).join(' | '));
  assert.match(stateRules[0][2], /fill:\s*var\(--hs-fill-hover\)/);
});
