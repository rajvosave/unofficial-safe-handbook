import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import en from '../content/en.js';
import { AGENDA, FLOW_STEPS, OUTPUTS, EVENT_LANES, mountPiPlanning } from '../js/visuals/pi-planning.js';
import { VISUALS, hasVisual } from '../js/visuals/index.js';
import { RECURRING_EVENTS } from '../js/pi-calendar.js';
import { findTopic, TOPICS } from '../js/topics.js';

const DAY1 = ['business-context', 'vision', 'architecture', 'planning-context', 'breakout-1', 'draft-review', 'management-review'];
const DAY2 = ['adjustments', 'breakout-2', 'final-review', 'risks', 'confidence-vote', 'rework', 'retro'];

test('AGENDA has the agreed day 1 and day 2 items in order, with time strings', () => {
  assert.deepEqual(AGENDA.day1.map((x) => x.titleKey), DAY1.map((s) => `pi.agenda.${s}.title`));
  assert.deepEqual(AGENDA.day2.map((x) => x.titleKey), DAY2.map((s) => `pi.agenda.${s}.title`));
  for (const item of [...AGENDA.day1, ...AGENDA.day2]) {
    assert.equal(typeof item.time, 'string');
    assert.match(item.time, /^\d{2}:\d{2}/);
  }
});

test('agenda times increase within each day', () => {
  for (const day of [AGENDA.day1, AGENDA.day2]) {
    const starts = day.map((x) => x.time.slice(0, 5));
    assert.deepEqual([...starts].sort(), starts);
  }
});

test('every agenda, flow, output and lane key exists in content/en.js', () => {
  const keys = [
    ...[...AGENDA.day1, ...AGENDA.day2].flatMap((x) => [x.titleKey, x.descKey]),
    ...FLOW_STEPS.flatMap((x) => [x.titleKey, x.descKey]),
    ...OUTPUTS.flatMap((x) => [x.titleKey, x.descKey, x.linkKey]),
    ...[...EVENT_LANES.map((l) => l.id), ...RECURRING_EVENTS].map((id) => `pi.cal.lane.${id}`),
  ];
  for (const k of keys) assert.ok(Object.hasOwn(en, k), `missing ${k}`);
});

test('every literal pi.* key used in the visual source exists in content/en.js', () => {
  const src = readFileSync(new URL('../js/visuals/pi-planning.js', import.meta.url), 'utf8');
  const literals = [...src.matchAll(/['"](pi\.[a-z0-9.-]+[a-z0-9])['"]/g)].map((m) => m[1]);
  assert.ok(literals.length > 10);
  for (const k of literals) assert.ok(Object.hasOwn(en, k), `missing ${k}`);
});

test('pi.* strings are plain text and avoid retired terms', () => {
  for (const [k, v] of Object.entries(en).filter(([k]) => k.startsWith('pi.'))) {
    assert.doesNotMatch(v, /<[a-z]/i, `${k} contains markup`);
    assert.doesNotMatch(v, /program increment|release train engineer's|program backlog/i, `${k} uses a retired term`);
  }
});

test('flow follows business context to confidence vote', () => {
  assert.deepEqual(FLOW_STEPS.map((x) => x.id), ['business-context', 'vision', 'breakouts', 'draft-review', 'management-review', 'final-plan', 'confidence-vote']);
});

test('lane and output links resolve to existing topics', () => {
  for (const id of [...EVENT_LANES.map((l) => l.id), ...RECURRING_EVENTS]) {
    assert.equal(findTopic(`/events/${id}`)?.id, id);
  }
  for (const o of OUTPUTS) assert.ok(TOPICS.some((x) => x.route === o.route), o.route);
  assert.ok(OUTPUTS.some((o) => o.route === '/artifacts/pi-objectives'));
});

test('visual registry maps pi-planning to its mount and rejects non-visual or inherited ids', () => {
  assert.equal(VISUALS['pi-planning'], mountPiPlanning);
  assert.equal(hasVisual('pi-planning'), true);
  assert.equal(hasVisual('art-sync'), false);
  assert.equal(hasVisual('toString'), false);
});
