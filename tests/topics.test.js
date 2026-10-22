import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOPICS, findTopic, topicsBySection } from '../js/topics.js';

const SECTIONS = ['foundations', 'roles', 'events', 'artifacts', 'measure', 'start', 'reference'];

test('has 35 topics with unique ids and routes', () => {
  assert.equal(TOPICS.length, 35);
  assert.equal(new Set(TOPICS.map((t) => t.id)).size, 35);
  assert.equal(new Set(TOPICS.map((t) => t.route)).size, 35);
});

test('shape and key naming', () => {
  for (const t of TOPICS) {
    assert.ok(SECTIONS.includes(t.section), t.id);
    assert.equal(t.route, `/${t.section}/${t.id}`);
    assert.equal(t.titleKey, `topic.${t.id}.title`);
    assert.equal(t.summaryKey, `topic.${t.id}.summary`);
    assert.ok(Array.isArray(t.related));
  }
});

test('findTopic', () => {
  assert.equal(findTopic('/events/pi-planning').id, 'pi-planning');
  assert.equal(findTopic('/events/nope'), undefined);
});

test('topicsBySection', () => {
  assert.equal(topicsBySection('roles').length, 10);
  assert.deepEqual(topicsBySection('measure').map((t) => t.id), ['metrics']);
  assert.deepEqual(topicsBySection('bogus'), []);
});

test('related ids exist and never self-reference', () => {
  const ids = new Set(TOPICS.map((t) => t.id));
  for (const t of TOPICS) {
    for (const r of t.related) {
      assert.ok(ids.has(r), `topic ${t.id} relates to unknown id ${r}`);
      assert.notEqual(r, t.id, `topic ${t.id} relates to itself`);
    }
  }
});

test('every titleKey/summaryKey exists in content/en.js', { skip: process.env.CHECK_CONTENT !== '1' && 'set CHECK_CONTENT=1 to enable' }, async () => {
  const mod = await import('../content/en.js');
  const en = mod.default ?? mod.en ?? mod;
  for (const t of TOPICS) {
    for (const k of [t.titleKey, t.summaryKey]) {
      assert.ok(k in en, `topic ${t.id} is missing content key ${k}`);
    }
  }
});
