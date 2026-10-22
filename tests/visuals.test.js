import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import en from '../content/en.js';
import { VISUALS, hasVisual } from '../js/visuals/index.js';
import { buildInspectAdaptModel, mountInspectAdapt } from '../js/visuals/inspect-adapt.js';
import { buildArtifactsModel, mountArtifacts } from '../js/visuals/artifacts.js';
import { buildRolesModel, relatedTo, mountRoles } from '../js/visuals/roles.js';
import { buildPiObjectivesModel } from '../js/visuals/pi-objectives.js';
import { buildMetricsModel } from '../js/visuals/metrics.js';
import { findTopic, roleEvents } from '../js/topics.js';

const EVENT_IDS = ['pi-planning', 'iteration-planning', 'daily-standup', 'iteration-review-retro', 'system-demo', 'inspect-adapt', 'art-sync', 'po-sync'];

// ---- Tiny fake DOM (just enough for the mount functions) ----

class FakeEl {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.attrs = {};
    this.children = [];
    this.parent = null;
    this.dataset = {};
    this.listeners = [];
    this.hidden = false;
    const cls = new Set();
    this.classList = {
      add: (...c) => c.forEach((x) => cls.add(x)),
      remove: (...c) => c.forEach((x) => cls.delete(x)),
      toggle: (c, on = !cls.has(c)) => (on ? cls.add(c) : cls.delete(c), on),
      contains: (c) => cls.has(c),
    };
    this.cls = cls;
  }
  setAttribute(k, v) {
    if (k === 'class') String(v).split(/\s+/).filter(Boolean).forEach((c) => this.cls.add(c));
    if (k.startsWith('data-')) this.dataset[k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = String(v);
    this.attrs[k] = String(v);
  }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  append(...nodes) {
    for (const n of nodes) {
      const node = typeof n === 'string' ? { text: n } : n;
      node.parent = this;
      this.children.push(node);
    }
  }
  replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
  addEventListener(type, fn) { this.listeners.push([type, fn]); }
  set textContent(v) { this.children = [{ text: String(v) }]; }
  get textContent() { return this.children.map((c) => (c.text ?? c.textContent ?? '')).join(''); }
  *walk() { for (const c of this.children) if (c instanceof FakeEl) { yield c; yield* c.walk(); } }
  all(pred) { return [...this.walk()].filter(pred); }
}

const fakeDocument = {
  createElement: (tag) => new FakeEl(tag),
  createElementNS: (_ns, tag) => new FakeEl(tag),
};

function withFakeDom(fn) {
  const prev = globalThis.document;
  globalThis.document = fakeDocument;
  try { return fn(); } finally { if (prev === undefined) delete globalThis.document; else globalThis.document = prev; }
}

const t = (k) => (Object.hasOwn(en, k) ? en[k] : k);
const hasClass = (c) => (n) => n.cls.has(c);

// ---- Registry ----

test('registry maps the three new topic ids to their mount functions', () => {
  assert.equal(VISUALS['inspect-adapt'], mountInspectAdapt);
  assert.equal(VISUALS.backlogs, mountArtifacts);
  assert.equal(VISUALS['roles-overview'], mountRoles);
  for (const id of ['inspect-adapt', 'backlogs', 'roles-overview', 'pi-planning']) assert.equal(hasVisual(id), true, id);
  for (const id of ['epic', 'feature', 'story', 'rte']) assert.equal(hasVisual(id), false, id);
});

// ---- Inspect & Adapt ----

test('inspect-adapt model has the three parts in order with existing keys', () => {
  const m = buildInspectAdaptModel();
  assert.deepEqual(m.parts.map((p) => p.id), ['demo', 'measure', 'workshop']);
  for (const p of m.parts) {
    assert.ok(Array.isArray(p.detailKeys) && p.detailKeys.length >= 2, p.id);
    for (const k of [p.titleKey, p.descKey, ...p.detailKeys]) assert.ok(Object.hasOwn(en, k), `missing ${k}`);
  }
  assert.match(en[m.parts[0].titleKey], /PI System Demo/);
  assert.match(en[m.parts[1].titleKey], /quantitative and qualitative/i);
  assert.match(en[m.parts[2].titleKey], /retrospective and problem-solving workshop/i);
});

test('problem-solving workshop has the six steps in order', () => {
  const m = buildInspectAdaptModel();
  assert.deepEqual(m.workshopSteps.map((s) => s.id), ['agree', 'root-cause', 'biggest', 'restate', 'brainstorm', 'backlog']);
  for (const s of m.workshopSteps) for (const k of [s.titleKey, s.descKey]) assert.ok(Object.hasOwn(en, k), `missing ${k}`);
});

test('model is pure: fresh objects each call', () => {
  assert.notEqual(buildInspectAdaptModel().parts, buildInspectAdaptModel().parts);
  assert.notEqual(buildArtifactsModel().nodes, buildArtifactsModel().nodes);
  assert.notEqual(buildRolesModel().roles, buildRolesModel().roles);
});

// ---- Artifacts ----

test('artifact hierarchy is Epic > Capability > Feature > Story with backlog levels', () => {
  const { nodes } = buildArtifactsModel();
  assert.deepEqual(nodes.map((n) => n.id), ['epic', 'capability', 'feature', 'story']);
  assert.deepEqual(nodes.map((n) => n.parentId), [null, 'epic', 'capability', 'feature']);
  assert.deepEqual(nodes.map((n) => n.level), ['portfolio', 'solution', 'art', 'team']);
  for (const n of nodes) {
    assert.equal(n.topicId, n.id);
    for (const k of [n.titleKey, n.descKey, `artifactsviz.level.${n.level}`]) assert.ok(Object.hasOwn(en, k), `missing ${k}`);
  }
});

test('every artifact node and enabler route resolves via findTopic', () => {
  const { nodes, enablers } = buildArtifactsModel();
  for (const n of nodes) assert.equal(findTopic(n.route)?.id, n.topicId, n.route);
  assert.equal(findTopic(enablers.route)?.id, 'enabler');
  assert.equal(enablers.topicId, 'enabler');
});

test('enablers attach at every level as a parallel branch', () => {
  const { nodes, enablers } = buildArtifactsModel();
  assert.deepEqual(enablers.attachesTo, nodes.map((n) => n.id));
  assert.deepEqual(enablers.variants.map((v) => v.attachesTo), nodes.map((n) => n.id));
  for (const v of enablers.variants) for (const k of [v.titleKey, v.descKey]) assert.ok(Object.hasOwn(en, k), `missing ${k}`);
});

// ---- Roles ----

test('roles model lists every roleEvents role exactly once, with a level', () => {
  const { roles } = buildRolesModel();
  const ids = roles.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual([...ids].sort(), Object.keys(roleEvents).sort());
  for (const r of roles) {
    assert.ok(['team', 'art', 'solution-portfolio'].includes(r.level), `${r.id} level ${r.level}`);
    assert.deepEqual(r.eventIds, roleEvents[r.id].filter((e) => EVENT_IDS.includes(e)).sort((a, b) => EVENT_IDS.indexOf(a) - EVENT_IDS.indexOf(b)));
    assert.equal(findTopic(r.route)?.id, r.id);
    assert.ok(Object.hasOwn(en, r.titleKey));
  }
});

test('roles model lists the 8 events and role/event relation is symmetric', () => {
  const { roles, events } = buildRolesModel();
  assert.deepEqual(events.map((e) => e.id), EVENT_IDS);
  for (const e of events) {
    assert.equal(findTopic(e.route)?.id, e.id);
    assert.ok(Object.hasOwn(en, e.titleKey));
    for (const r of e.roleIds) assert.ok(roles.find((x) => x.id === r).eventIds.includes(e.id), `${r}/${e.id}`);
  }
  for (const r of roles) for (const e of r.eventIds) assert.ok(events.find((x) => x.id === e).roleIds.includes(r.id), `${r.id}/${e}`);
});

test('roles model does not duplicate roleEvents data in its source', () => {
  const src = readFileSync(new URL('../js/visuals/roles.js', import.meta.url), 'utf8');
  assert.match(src, /roleEvents/);
  assert.doesNotMatch(src, /'daily-standup'/);
});

test('relatedTo highlights events of a role and roles of an event', () => {
  const m = buildRolesModel();
  assert.deepEqual(relatedTo(m, null), { roles: [], events: [] });
  assert.deepEqual(relatedTo(m, { kind: 'role', id: 'rte' }), { roles: [], events: m.roles.find((r) => r.id === 'rte').eventIds });
  const ds = relatedTo(m, { kind: 'event', id: 'daily-standup' });
  assert.deepEqual([...ds.roles].sort(), ['scrum-master', 'team']);
  assert.deepEqual(ds.events, []);
  assert.deepEqual(relatedTo(m, { kind: 'role', id: 'nope' }), { roles: [], events: [] });
});

// ---- Content hygiene ----

test('all literal inspect/artifactsviz/rolesviz keys used in sources exist', () => {
  for (const [file, prefix] of [['inspect-adapt', 'inspect'], ['artifacts', 'artifactsviz'], ['roles', 'rolesviz'], ['pi-objectives', 'poviz'], ['metrics', 'mviz']]) {
    const src = readFileSync(new URL(`../js/visuals/${file}.js`, import.meta.url), 'utf8');
    const re = new RegExp(`['"\`](${prefix}\\.[a-z0-9.-]+[a-z0-9])['"\`]`, 'g');
    const literals = [...src.matchAll(re)].map((m) => m[1]);
    assert.ok(literals.length >= 3, `${file}: expected literal keys`);
    for (const k of literals) assert.ok(Object.hasOwn(en, k), `${file}: missing ${k}`);
  }
});

test('new strings are plain text and avoid retired terms', () => {
  const entries = Object.entries(en).filter(([k]) => /^(inspect|artifactsviz|rolesviz|poviz|mviz)\./.test(k));
  assert.ok(entries.length > 30);
  for (const [k, v] of entries) {
    assert.equal(typeof v, 'string');
    assert.doesNotMatch(v, /<[a-z]/i, `${k} contains markup`);
    assert.doesNotMatch(v, /program increment|program backlog|program board|release train engineer's/i, `${k} retired or inconsistent term`);
  }
});

test('visual sources do not use innerHTML', () => {
  for (const f of ['inspect-adapt', 'artifacts', 'roles', 'pi-objectives', 'metrics']) {
    const src = readFileSync(new URL(`../js/visuals/${f}.js`, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /innerHTML|insertAdjacentHTML/, f);
  }
});

// ---- Minimal DOM-level checks ----

test('mountRoles renders one card per role and per event, idempotently', () => {
  withFakeDom(() => {
    const box = new FakeEl('section');
    mountRoles(box, t, () => {});
    mountRoles(box, t, () => {});
    const roleCards = box.all((n) => n.dataset.role && hasClass('rv-card')(n));
    const eventCards = box.all((n) => n.dataset.event && hasClass('rv-card')(n));
    assert.equal(roleCards.length, Object.keys(roleEvents).length);
    assert.equal(eventCards.length, EVENT_IDS.length);
    const toggles = box.all((n) => n.tagName === 'BUTTON' && n.getAttribute('aria-pressed') !== null);
    assert.equal(toggles.length, Object.keys(roleEvents).length + EVENT_IDS.length);
    const links = box.all((n) => n.tagName === 'A' && n.dataset.route);
    for (const a of links) assert.ok(findTopic(a.dataset.route), a.dataset.route);
    assert.equal(box.listeners.filter(([type]) => type === 'click').length, 1, 'click listener must not stack');
    const ids = box.all((n) => n.attrs.id).map((n) => n.attrs.id);
    assert.equal(new Set(ids).size, ids.length);
  });
});

test('mountArtifacts renders a link per node and enabler variant, all resolving', () => {
  withFakeDom(() => {
    const box = new FakeEl('section');
    mountArtifacts(box, t, () => {});
    mountArtifacts(box, t, () => {});
    const links = box.all((n) => n.tagName === 'A' && n.dataset.route);
    assert.equal(links.length, 8);
    for (const a of links) assert.ok(findTopic(a.dataset.route), a.dataset.route);
    assert.equal(box.listeners.filter(([type]) => type === 'click').length, 1);
  });
});

test('mountInspectAdapt renders three disclosure buttons controlling existing panels', () => {
  withFakeDom(() => {
    const box = new FakeEl('section');
    mountInspectAdapt(box, t);
    mountInspectAdapt(box, t);
    const btns = box.all((n) => n.tagName === 'BUTTON' && n.getAttribute('aria-expanded') !== null);
    assert.equal(btns.length, 3);
    const ids = new Set(box.all((n) => n.attrs.id).map((n) => n.attrs.id));
    for (const b of btns) assert.ok(ids.has(b.getAttribute('aria-controls')), 'aria-controls target exists');
    assert.equal(box.all(hasClass('ia-ws-step')).length, 6);
  });
});

test('hard-coded routeLink routes in visual sources resolve via findTopic', () => {
  let count = 0;
  for (const f of ['inspect-adapt', 'artifacts', 'roles', 'pi-planning', 'pi-objectives']) {
    const src = readFileSync(new URL(`../js/visuals/${f}.js`, import.meta.url), 'utf8');
    for (const m of src.matchAll(/routeLink\(\s*'([^']+)'/g)) {
      count += 1;
      assert.ok(findTopic(m[1]), `${f}: ${m[1]} does not resolve`);
    }
  }
  assert.ok(count >= 2, 'expected the inspect-adapt outcome links');
});

test('pi-objectives model: four steps in order, example keys exist, values on a 1 to 10 scale', () => {
  const m = buildPiObjectivesModel();
  assert.deepEqual(m.steps.map((x) => x.id), ['draft', 'plan', 'deliver', 'score']);
  for (const x of m.steps) for (const k of [x.titleKey, x.whoKey, x.descKey]) assert.ok(Object.hasOwn(en, k), k);
  assert.ok(m.example.some((x) => !x.committed));
  for (const x of m.example) {
    assert.ok(Object.hasOwn(en, x.nameKey), x.nameKey);
    for (const v of [x.planned, x.actual]) assert.ok(v >= 1 && v <= 10);
  }
  assert.equal(hasVisual('pi-objectives'), true);
});

test('ROAM block has all four groups with title, description and example', () => {
  for (const id of ['resolved', 'owned', 'accepted', 'mitigated']) {
    for (const part of ['title', 'desc', 'example']) assert.ok(Object.hasOwn(en, `pi.roam.${id}.${part}`), `${id}.${part}`);
  }
  for (const k of ['pi.roam.title', 'pi.roam.intro', 'pi.roam.uncommitted', 'pi.roam.link', 'poviz.kind.uncommitted.risk', 'poviz.kind.link']) assert.ok(Object.hasOwn(en, k), k);
});

test('metrics model: three dimensions with the six flow measures and existing keys', () => {
  const m = buildMetricsModel();
  assert.deepEqual(m.dimensions.map((d) => d.id), ['outcomes', 'flow', 'competency']);
  assert.equal(m.dimensions[1].measures.length, 6);
  for (const d of m.dimensions) {
    for (const k of [d.titleKey, d.questionKey, d.howKey, d.usedByKey, ...d.measures.flatMap((x) => [x.termKey, x.descKey])]) assert.ok(Object.hasOwn(en, k), k);
  }
  for (const k of [...m.do.map((x) => `mviz.do.${x}`), ...m.avoid.map((x) => `mviz.avoid.${x}`)]) assert.ok(Object.hasOwn(en, k), k);
  assert.equal(hasVisual('metrics'), true);
});
