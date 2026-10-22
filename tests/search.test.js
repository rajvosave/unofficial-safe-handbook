import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TOPICS } from '../js/topics.js';
import en from '../content/en.js';
import hr from '../content/hr.js';
import { buildIndex, search, nextActiveIndex, escapeAction } from '../js/search.js';

const tEn = (k) => (Object.hasOwn(en, k) ? en[k] : k);
const tHr = (k) => (Object.hasOwn(hr, k) ? hr[k] : tEn(k));
const index = buildIndex(TOPICS, tEn);

const fake = (entries) => buildIndex(
  entries.map((e, i) => ({ id: `t${i}`, route: `/x/t${i}`, titleKey: `t${i}.title`, summaryKey: `t${i}.summary` })),
  (k) => {
    const m = /^t(\d+)\.(title|summary)$/.exec(k);
    return m ? entries[Number(m[1])][m[2]] : k;
  },
);

test('index has one entry per topic with lowercase text', () => {
  assert.equal(index.length, TOPICS.length);
  const e = index.find((x) => x.id === 'pi-planning');
  assert.equal(e.route, '/events/pi-planning');
  assert.equal(e.title, tEn('topic.pi-planning.title'));
  assert.equal(e.titleLower, e.title.toLowerCase());
  assert.equal(e.text, e.text.toLowerCase());
});

test('index title falls back to id when key is missing', () => {
  const idx = buildIndex([{ id: 'zzz', route: '/z', titleKey: 'nope' }], (k) => k);
  assert.equal(idx[0].title, 'zzz');
});

test('index includes item titles and bodies', () => {
  const e = index.find((x) => x.id === 'glossary');
  assert.ok(e.text.includes(tEn('topic.glossary.item.wsjf.title').toLowerCase()));
});

test('finds "PI Planning" by title and ranks it first', () => {
  const r = search(index, 'PI Planning');
  assert.ok(r.length > 0);
  assert.equal(r[0].route, '/events/pi-planning');
  assert.equal(r[0].title, tEn('topic.pi-planning.title'));
});

test('retro finds the iteration review and retrospective topic', () => {
  const r = search(index, 'retro');
  assert.ok(r.some((x) => x.route === '/events/iteration-review-retro'));
});

test('ranks exact title, then prefix, then substring, then body', () => {
  const idx = fake([
    { title: 'Zebra stripes', summary: 'mentions plan once' },
    { title: 'Big Plan', summary: 'x' },
    { title: 'Planning', summary: 'x' },
    { title: 'Plan', summary: 'x' },
  ]);
  assert.deepEqual(search(idx, 'plan').map((r) => r.title), ['Plan', 'Planning', 'Big Plan', 'Zebra stripes']);
});

test('ranks a title match above a body-only match', () => {
  const idx = fake([
    { title: 'Alpha', summary: 'budget budget budget budget' },
    { title: 'Budget', summary: 'x' },
  ]);
  assert.equal(search(idx, 'budget')[0].title, 'Budget');
});

test('body matches with more occurrences come first', () => {
  const idx = fake([
    { title: 'A', summary: 'cat once' },
    { title: 'B', summary: 'cat cat cat' },
  ]);
  assert.deepEqual(search(idx, 'cat').map((r) => r.title), ['B', 'A']);
});

test('regex metacharacter queries return without throwing', () => {
  for (const q of ['(', '[', '.*', '\\', '+', '?', '$', '^', '{']) {
    assert.doesNotThrow(() => search(index, q), q);
    assert.ok(Array.isArray(search(index, q)));
  }
  assert.deepEqual(search(index, '.*'), []);
});

test('whitespace, empty and non-string queries return []', () => {
  for (const q of ['', '   ', '\t\n', null, undefined, 42, {}, []]) assert.deepEqual(search(index, q), []);
});

test('respects limit (default 8; zero or negative gives no results)', () => {
  assert.ok(search(index, 'a', 3).length <= 3);
  assert.equal(search(index, 'a', 3).length, 3);
  assert.equal(search(index, 'a').length, 8);
  assert.equal(search(index, 'a', 2.7).length, 2);
  assert.deepEqual(search(index, 'a', 0), []);
  assert.deepEqual(search(index, 'a', -5), []);
  assert.equal(search(index, 'a', NaN).length, 8);
});

test('snippet has match context and is ellipsized when cut', () => {
  const long = `${'lorem ipsum '.repeat(30)}needle${' dolor sit '.repeat(30)}`;
  const idx = fake([{ title: 'Doc', summary: long }]);
  const [r] = search(idx, 'needle');
  assert.ok(r.snippet.toLowerCase().includes('needle'));
  assert.ok(r.snippet.startsWith('…'));
  assert.ok(r.snippet.endsWith('…'));
  assert.ok(r.snippet.length <= 130);
});

test('snippet is not ellipsized when text is short', () => {
  const idx = fake([{ title: 'Doc', summary: 'a short needle here' }]);
  assert.equal(search(idx, 'needle')[0].snippet, 'a short needle here');
});

test('title-only match uses the summary as snippet', () => {
  const idx = fake([{ title: 'Unique', summary: 'the summary text' }]);
  assert.equal(search(idx, 'unique')[0].snippet, 'the summary text');
});

test('snippet is plain text (no markup produced)', () => {
  const idx = fake([{ title: 'Doc', summary: 'before <b>needle</b> after' }]);
  const [r] = search(idx, 'needle');
  assert.ok(r.snippet.includes('needle'));
  assert.equal(typeof r.snippet, 'string');
});

test('multi-word query requires all words (AND), title matches outrank', () => {
  const idx = fake([
    { title: 'One', summary: 'red green blue' },
    { title: 'Red green', summary: 'x' },
    { title: 'Two', summary: 'only red here' },
  ]);
  const r = search(idx, '  red   GREEN ');
  assert.deepEqual(r.map((x) => x.title), ['Red green', 'One']);
  assert.equal(search(idx, 'pi plan')[0], undefined);
});

test('"pi plan" ranks PI Planning first on the real index', () => {
  assert.equal(search(index, 'pi plan')[0].route, '/events/pi-planning');
});

test('matching is case-insensitive', () => {
  assert.deepEqual(search(index, 'PI PLANNING'), search(index, 'pi planning'));
});

test('index rebuilt with another language gives that language titles', () => {
  const a = buildIndex(TOPICS, tEn);
  const b = buildIndex(TOPICS, tHr);
  const ea = a.find((x) => x.id === 'pi-planning');
  const eb = b.find((x) => x.id === 'pi-planning');
  assert.equal(eb.title, hr['topic.pi-planning.title'] ?? ea.title);
  const q = hr['topic.pi-planning.title'] ?? 'PI Planning';
  assert.equal(search(b, q)[0].title, eb.title);
});

test('nextActiveIndex moves with arrows, wraps, and handles empty', () => {
  assert.equal(nextActiveIndex(-1, 'ArrowDown', 3), 0);
  assert.equal(nextActiveIndex(0, 'ArrowDown', 3), 1);
  assert.equal(nextActiveIndex(2, 'ArrowDown', 3), 0);
  assert.equal(nextActiveIndex(-1, 'ArrowUp', 3), 2);
  assert.equal(nextActiveIndex(0, 'ArrowUp', 3), 2);
  assert.equal(nextActiveIndex(2, 'ArrowUp', 3), 1);
  assert.equal(nextActiveIndex(0, 'Home', 3), 0);
  assert.equal(nextActiveIndex(0, 'End', 3), 2);
  assert.equal(nextActiveIndex(1, 'ArrowDown', 0), -1);
  assert.equal(nextActiveIndex(1, 'x', 3), 1);
});

test('escapeAction: first Escape closes an open panel, the next clears the query', () => {
  assert.equal(escapeAction(true, 'pi'), 'close');
  assert.equal(escapeAction(true, ''), 'close');
  assert.equal(escapeAction(false, 'pi'), 'clear');
  assert.equal(escapeAction(false, ''), 'none');
});
