import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TOPICS } from '../js/topics.js';
import en from '../content/en.js';
import { buildPage, sitemapXml, robotsTxt, describe, pathTo, prefixFor } from '../scripts/pages.js';
import { startRouter } from '../js/router.js';

const shell = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const t = (k) => en[k] ?? k;
const siteUrl = 'https://example.org/handbook';

test('every topic gets its own title, description, canonical and visible text', () => {
  const titles = new Set();
  for (const topic of TOPICS) {
    const html = buildPage(shell, { topic, t, siteUrl });
    const title = /<title>([^<]+)<\/title>/.exec(html)[1];
    titles.add(title);
    assert.match(html, new RegExp(`<link rel="canonical" href="https://example.org/handbook${topic.route}/">`), topic.id);
    assert.match(html, /<meta name="description" content="[^"]{30,160}">/, topic.id);
    assert.match(html, new RegExp(`<body data-route="${topic.route}">`), topic.id);
    assert.match(html, /<main id="app" tabindex="-1"><article class="topic"><h1>[^<]+<\/h1>/, topic.id);
    assert.doesNotMatch(html, /<noscript>/);
  }
  assert.equal(titles.size, TOPICS.length, 'titles are unique');
});

test('assets resolve from nested pages and links are real paths', () => {
  const html = buildPage(shell, { topic: TOPICS.find((x) => x.id === 'pi-planning'), t, siteUrl });
  assert.match(html, /href="\.\.\/\.\.\/css\/tokens\.css"/);
  assert.match(html, /src="\.\.\/\.\.\/js\/main\.js"/);
  assert.match(html, /<a href="\.\.\/\.\.\/roles\/rte\/">/);
  assert.match(html, /<span data-i18n="footer\.disclaimer">Unofficial guide/);
});

test('home page keeps root-relative assets, a WebSite record and section cards', () => {
  const html = buildPage(shell, { topic: null, t, siteUrl });
  assert.match(html, /href="css\/tokens\.css"/);
  assert.match(html, /"@type":"WebSite"/);
  assert.match(html, /<link rel="canonical" href="https:\/\/example\.org\/handbook\/">/);
  assert.match(html, /<li class="card"><h2><a href="foundations\/overview\/">/);
  assert.doesNotMatch(html, /data-route=/);
});

test('structured data is valid JSON and cannot close the script tag', () => {
  for (const topic of [null, ...TOPICS]) {
    const html = buildPage(shell, { topic, t, siteUrl });
    for (const m of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)) JSON.parse(m[1]);
  }
});

test('sitemap lists the home page and every topic; robots points at it', () => {
  const xml = sitemapXml(siteUrl, '2026-01-01');
  assert.equal((xml.match(/<loc>/g) ?? []).length, TOPICS.length + 1);
  assert.match(xml, /<loc>https:\/\/example\.org\/handbook\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/example\.org\/handbook\/events\/pi-planning\/<\/loc>/);
  assert.match(robotsTxt(siteUrl), /Sitemap: https:\/\/example\.org\/handbook\/sitemap\.xml/);
});

test('helpers', () => {
  assert.equal(prefixFor('/events/pi-planning'), '../../');
  assert.equal(pathTo('/', '/'), './');
  assert.equal(pathTo('/roles/rte', '/events/pi-planning'), '../../roles/rte/');
  assert.equal(describe('short text'), 'short text');
  assert.ok(describe('word '.repeat(60)).length <= 160);
});

test('router shows the prerendered topic while the hash is empty, then follows the hash', () => {
  const listeners = {};
  const win = {
    location: { hash: '' },
    document: { body: { dataset: { route: '/events/pi-planning' } } },
    addEventListener: (n, f) => { listeners[n] = f; },
  };
  const seen = [];
  startRouter((r) => seen.push(r.route), win);
  win.location.hash = '#/roles/rte';
  listeners.hashchange();
  win.location.hash = '';
  listeners.hashchange();
  assert.deepEqual(seen, ['/events/pi-planning', '/roles/rte', '/events/pi-planning']);
});
