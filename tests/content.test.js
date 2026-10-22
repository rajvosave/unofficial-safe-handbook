import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import en from '../content/en.js';
import { findTopic } from '../js/topics.js';
import { OUTPUTS } from '../js/visuals/pi-planning.js';

const src = readFileSync(new URL('../content/en.js', import.meta.url), 'utf8');

test('no English string uses a retired SAFe term', () => {
  for (const [k, v] of Object.entries(en)) {
    assert.doesNotMatch(v, /program increment|program backlog|program board|program kanban/i, k);
  }
});

test('English strings use US spelling for common -ise/-our/-re words', () => {
  const british = /(organis|realis|optimis|prioritis|summaris|visualis|recognis|minimis|maximis|standardis)(e|ed|es|ing|ation|ations)\b|\b(analys(e|ed|ing)|behaviour|colour|favour|labelled|centres?|programme)\b/i;
  for (const [k, v] of Object.entries(en)) assert.doesNotMatch(v, british, k);
});

test('content/en.js uses single-quoted keys and values throughout', () => {
  assert.doesNotMatch(src, /^\s*"/m);
});

test('source item slugs share the src- prefix', () => {
  for (const slug of findTopic('/reference/sources').items) assert.match(slug, /^src-/);
});

test('PI outputs links have distinct labels', () => {
  const labels = OUTPUTS.map((o) => en[o.linkKey]);
  for (const l of labels) assert.ok(l, 'missing link label');
  assert.equal(new Set(labels).size, labels.length);
});

test('glossary item titles are in alphabetical order', () => {
  const titles = findTopic('/reference/glossary').items.map((s) => en[`topic.glossary.item.${s}.title`]);
  const sorted = [...titles].sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
  assert.deepEqual(titles, sorted);
});
