import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('index.html has description, Open Graph tags and a favicon that exists', () => {
  assert.match(html, /<meta name="description" content="[^"]{50,}">/);
  for (const p of ['og:type', 'og:title', 'og:description']) assert.match(html, new RegExp(`<meta property="${p}" content="[^"]+">`), p);
  const icon = /<link rel="icon" href="([^"]+)"/.exec(html);
  assert.ok(icon, 'favicon link');
  assert.ok(existsSync(new URL(`../${icon[1]}`, import.meta.url)), `missing ${icon[1]}`);
});

test('index.html has a noscript message and a no-js class swapped by an inline script', () => {
  assert.match(html, /<noscript>[\s\S]*JavaScript[\s\S]*<\/noscript>/);
  assert.match(html, /<html lang="en" class="no-js">/);
  assert.match(html, /classList\.replace\('no-js',\s*'js'\)/);
});
