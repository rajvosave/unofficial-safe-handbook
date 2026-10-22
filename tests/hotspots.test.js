import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HOTSPOTS, VIEWBOX, MIN_HIT } from '../js/hotspots.js';
import { findTopic } from '../js/topics.js';
import { wrapLabel } from '../js/infographic.js';
import en from '../content/en.js';

const COMPETENCY_SLUGS = [
  'lean-agile-leadership',
  'team-and-technical-agility',
  'agile-product-delivery',
  'enterprise-solution-delivery',
  'lean-portfolio-management',
  'organizational-agility',
  'continuous-learning-culture',
];

test('viewBox is 0 0 1200 800', () => {
  assert.deepEqual(VIEWBOX, { x: 0, y: 0, w: 1200, h: 800 });
});

test('every hotspot route resolves via findTopic', () => {
  for (const h of HOTSPOTS) assert.ok(findTopic(h.route), `${h.id} -> ${h.route}`);
});

test('hotspot ids are unique', () => {
  assert.equal(new Set(HOTSPOTS.map((h) => h.id)).size, HOTSPOTS.length);
});

test('every hotspot rectangle lies inside the viewBox', () => {
  for (const h of HOTSPOTS) {
    assert.ok(h.x >= 0 && h.y >= 0, h.id);
    assert.ok(h.x + h.w <= VIEWBOX.w && h.y + h.h <= VIEWBOX.h, h.id);
  }
});

test('hotspot hit rectangles never overlap and are at least MIN_HIT units on each side', () => {
  for (const h of HOTSPOTS) assert.ok(h.w >= MIN_HIT && h.h >= MIN_HIT, `${h.id} ${h.w}x${h.h}`);
  for (let i = 0; i < HOTSPOTS.length; i++) {
    for (let j = i + 1; j < HOTSPOTS.length; j++) {
      const a = HOTSPOTS[i];
      const b = HOTSPOTS[j];
      const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
      assert.ok(!overlap, `${a.id} overlaps ${b.id}`);
    }
  }
});

test('hotspots cover all seven core competencies', () => {
  const comps = HOTSPOTS.filter((h) => h.id.startsWith('competency-'));
  assert.equal(comps.length, 7);
  assert.deepEqual(comps.map((h) => h.id.slice('competency-'.length)).sort(), [...COMPETENCY_SLUGS].sort());
  for (const h of comps) assert.equal(h.route, '/foundations/core-competencies');
});

test('hotspots cover the required configurations, trains, events and roles', () => {
  const byRoute = (route) => HOTSPOTS.filter((h) => h.route === route).length;
  assert.equal(byRoute('/foundations/configurations'), 4);
  for (const r of [
    '/foundations/art', '/foundations/solution-train',
    '/events/pi-planning', '/events/system-demo', '/events/inspect-adapt',
    '/roles/rte', '/roles/product-owner', '/roles/product-management', '/roles/system-architect',
    '/roles/business-owners', '/roles/epic-owners', '/roles/lpm',
  ]) assert.ok(byRoute(r) >= 1, r);
  assert.ok(HOTSPOTS.some((h) => h.id === 'lpm' && h.route === '/roles/lpm'));
});

test('label and description keys follow the naming scheme and exist in en.js', () => {
  for (const h of HOTSPOTS) {
    assert.equal(h.labelKey, `infographic.${h.id}.label`);
    assert.equal(h.descKey, `infographic.${h.id}.desc`);
    assert.ok(Object.hasOwn(en, h.labelKey), h.labelKey);
    assert.ok(Object.hasOwn(en, h.descKey), h.descKey);
  }
  for (const k of ['infographic.title', 'infographic.desc']) assert.ok(Object.hasOwn(en, k), k);
});

test('wrapLabel splits on words within the limit and never drops text', () => {
  assert.deepEqual(wrapLabel('Release Train Engineer', 15), ['Release Train', 'Engineer']);
  assert.deepEqual(wrapLabel('ART', 15), ['ART']);
  assert.deepEqual(wrapLabel('Supercalifragilistic word', 10), ['Supercalifragilistic', 'word']);
  assert.equal(wrapLabel('a b c d e f', 3).join(' '), 'a b c d e f');
});
