import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOPICS, findTopic, topicsBySection, roleEvents } from '../js/topics.js';

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

const ROLE_IDS = ['team', 'rte', 'product-owner', 'product-management', 'system-architect', 'scrum-master', 'business-owners', 'epic-owners', 'lpm'];
const EVENT_IDS = ['pi-planning', 'iteration-planning', 'daily-standup', 'iteration-review-retro', 'system-demo', 'inspect-adapt', 'art-sync', 'po-sync'];

test('roleEvents references existing role and event topic ids', () => {
  for (const [role, events] of Object.entries(roleEvents)) {
    assert.equal(findTopic(`/roles/${role}`)?.id, role, `unknown role ${role}`);
    for (const e of events) {
      assert.ok(EVENT_IDS.includes(e), `${role} lists unknown event ${e}`);
      assert.equal(findTopic(`/events/${e}`)?.id, e);
    }
  }
});

test('each of the 9 role ids lists at least one event', () => {
  for (const r of ROLE_IDS) {
    assert.ok(Array.isArray(roleEvents[r]) && roleEvents[r].length > 0, `${r} has no events`);
  }
});

test('every topic has .what content in content/en.js', { skip: process.env.CHECK_CONTENT !== '1' && 'set CHECK_CONTENT=1 to enable' }, async () => {
  const mod = await import('../content/en.js');
  const en = mod.default ?? mod.en ?? mod;
  for (const t of TOPICS) {
    assert.ok(`topic.${t.id}.what` in en, `topic ${t.id} is missing topic.${t.id}.what`);
  }
});

test('every item slug has title and body keys', { skip: process.env.CHECK_CONTENT !== '1' && 'set CHECK_CONTENT=1 to enable' }, async () => {
  const mod = await import('../content/en.js');
  const en = mod.default ?? mod.en ?? mod;
  for (const t of TOPICS.filter((x) => x.items)) {
    for (const slug of t.items) {
      for (const part of ['title', 'body']) {
        assert.ok(`topic.${t.id}.item.${slug}.${part}` in en, `topic ${t.id} item ${slug} missing ${part}`);
      }
    }
  }
});

test('glossary and sources declare items', () => {
  assert.ok(findTopic('/reference/glossary').items.length >= 25);
  assert.ok(findTopic('/reference/sources').items.length >= 6);
});

const EXPECTED_ATTENDEES = {
  'pi-planning': ['team', 'rte', 'product-owner', 'scrum-master', 'product-management', 'system-architect', 'business-owners', 'epic-owners', 'lpm'],
  'iteration-planning': ['team', 'product-owner', 'scrum-master'],
  'daily-standup': ['team', 'scrum-master'],
  'iteration-review-retro': ['team', 'product-owner', 'scrum-master'],
  'system-demo': ['team', 'rte', 'product-owner', 'scrum-master', 'product-management', 'system-architect', 'business-owners'],
  'inspect-adapt': ['team', 'rte', 'product-owner', 'scrum-master', 'product-management', 'system-architect', 'business-owners', 'epic-owners', 'lpm'],
  'art-sync': ['rte', 'product-owner', 'scrum-master', 'system-architect'],
  'po-sync': ['rte', 'product-owner', 'product-management'],
};

test('roleEvents matches the explicit attendance table for each event', () => {
  for (const ev of EVENT_IDS) {
    const actual = Object.entries(roleEvents).filter(([, evs]) => evs.includes(ev)).map(([r]) => r).sort();
    assert.deepEqual(actual, [...EXPECTED_ATTENDEES[ev]].sort(), `attendees of ${ev}`);
  }
});
