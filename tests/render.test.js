import test from 'node:test';
import assert from 'node:assert/strict';
import { buildNavModel, visibleSections, topicTitle, relatedLinks, SECTION_ORDER, visibleItems, splitParagraphs, itemAnchor, externalLink, itemLink } from '../js/render.js';
import en from '../content/en.js';
import { TOPICS, findTopic } from '../js/topics.js';

const dict = {
  'nav.foundations': 'Foundations',
  'topic.overview.title': 'Overview',
  'topic.overview.what': 'What text',
  'topic.overview.io': 'IO text',
  'topic.art.title': 'ART',
};
const t = (k) => (Object.hasOwn(dict, k) ? dict[k] : k);

test('buildNavModel groups every topic by section in order', () => {
  const nav = buildNavModel(t);
  assert.deepEqual(nav.map((s) => s.section), SECTION_ORDER);
  assert.equal(SECTION_ORDER.length, 7);
  assert.equal(nav[0].label, 'Foundations');
  assert.equal(nav.flatMap((s) => s.items).length, TOPICS.length);
  assert.deepEqual(nav[0].items[0], { id: 'overview', href: '#/foundations/overview', label: 'Overview' });
});

test('topicTitle falls back to id when title key missing', () => {
  assert.equal(topicTitle(findTopic('/foundations/principles'), t), 'principles');
  assert.equal(topicTitle(findTopic('/foundations/overview'), t), 'Overview');
});

test('visibleSections keeps order and omits absent keys', () => {
  const secs = visibleSections(findTopic('/foundations/overview'), t);
  assert.deepEqual(secs.map((s) => s.key), ['what', 'io']);
  assert.deepEqual(secs.map((s) => s.headingKey), ['ui.section.what', 'ui.section.io']);
  assert.deepEqual(visibleSections(findTopic('/foundations/art'), t), []);
});

test('relatedLinks builds hash links with title fallback', () => {
  const links = relatedLinks(findTopic('/foundations/overview'), t);
  assert.equal(links.length, 3);
  assert.equal(links[0].href, '#/foundations/core-competencies');
  assert.equal(links[0].label, 'core-competencies');
  assert.equal(relatedLinks(findTopic('/foundations/art'), t).find((l) => l.label === 'ART'), undefined);
});

test('relatedLinks skips unknown related ids', () => {
  assert.deepEqual(relatedLinks({ related: ['nope'] }, t), []);
});


test('visibleItems returns only items whose title key exists, in order', () => {
  const topic = { id: 'x', items: ['a', 'b', 'c'] };
  const d = { 'topic.x.item.a.title': 'A', 'topic.x.item.c.title': 'C', 'topic.x.item.c.body': 'Body C' };
  const tt = (k) => (Object.hasOwn(d, k) ? d[k] : k);
  assert.deepEqual(visibleItems(topic, tt), [
    { id: 'a', title: 'A', body: '' },
    { id: 'c', title: 'C', body: 'Body C' },
  ]);
  assert.deepEqual(visibleItems({ id: 'x' }, tt), []);
});

test('splitParagraphs splits on blank lines and drops empties', () => {
  assert.deepEqual(splitParagraphs('One\n\nTwo\n\n\nThree'), ['One', 'Two', 'Three']);
  assert.deepEqual(splitParagraphs(''), []);
});

test('item anchors are prefixed so they cannot collide with page ids', () => {
  assert.equal(itemAnchor('full'), 'item-full');
  assert.equal(itemAnchor('portfolio'), 'item-portfolio');
});

test('externalLink builds an https link model with host/path text and a new-tab note', () => {
  const tt = (k) => (k === 'ui.newTab' ? 'opens in a new tab' : k);
  assert.deepEqual(externalLink('https://framework.scaledagile.com/pi-planning/', tt), {
    href: 'https://framework.scaledagile.com/pi-planning/',
    text: 'framework.scaledagile.com/pi-planning',
    note: 'opens in a new tab',
  });
  assert.equal(externalLink('https://framework.scaledagile.com/', tt).text, 'framework.scaledagile.com');
  for (const bad of ['', 'not a url', 'javascript:alert(1)', 'http://example.com/', undefined]) {
    assert.equal(externalLink(bad, tt), null, String(bad));
  }
});

test('itemLink reads the optional .url key of an item', () => {
  const d = { 'topic.x.item.a.url': 'https://example.org/a' };
  const tt = (k) => (Object.hasOwn(d, k) ? d[k] : k);
  assert.equal(itemLink({ id: 'x' }, 'a', tt).href, 'https://example.org/a');
  assert.equal(itemLink({ id: 'x' }, 'b', tt), null);
});

test('every source item has a verified-domain https URL and no URL left in its body', () => {
  const tt = (k) => (Object.hasOwn(en, k) ? en[k] : k);
  const src = TOPICS.find((x) => x.id === 'sources');
  assert.ok(src.items.length >= 6 && src.items.length <= 10);
  for (const slug of src.items) {
    const link = itemLink(src, slug, tt);
    assert.ok(link, `${slug} has no url`);
    assert.match(link.href, /^https:\/\/framework\.scaledagile\.com\//, slug);
    assert.doesNotMatch(en[`topic.sources.item.${slug}.body`], /https?:\/\//, `${slug} body still contains a URL`);
  }
  assert.ok(en['ui.newTab']);
});
