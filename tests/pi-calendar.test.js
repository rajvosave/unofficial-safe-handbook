import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPiCalendar, RECURRING_EVENTS } from '../js/pi-calendar.js';

const contiguous = (cal) => {
  assert.equal(cal.iterations[0].startWeek, 1);
  for (let i = 1; i < cal.iterations.length; i++) {
    assert.equal(cal.iterations[i].startWeek, cal.iterations[i - 1].endWeek + 1, `gap before iteration ${i + 1}`);
  }
  assert.equal(cal.iterations.at(-1).endWeek, cal.totalWeeks);
};

test('default PI: 4 dev iterations of 2 weeks plus IP = 10 weeks, 5 iterations, last is ip', () => {
  const cal = buildPiCalendar({});
  assert.equal(cal.totalWeeks, 10);
  assert.equal(cal.iterations.length, 5);
  assert.equal(cal.iterations.at(-1).kind, 'ip');
  assert.deepEqual(cal.iterations.map((i) => i.kind), ['dev', 'dev', 'dev', 'dev', 'ip']);
  assert.deepEqual(cal.iterations.map((i) => i.index), [1, 2, 3, 4, 5]);
  assert.deepEqual(cal.iterations.map((i) => [i.startWeek, i.endWeek]), [[1, 2], [3, 4], [5, 6], [7, 8], [9, 10]]);
  assert.deepEqual(buildPiCalendar(), cal, 'no argument behaves like defaults');
  contiguous(cal);
});

test('non-default PI lengths', () => {
  for (const [opts, weeks, count] of [
    [{ devIterations: 3, iterationWeeks: 2 }, 8, 4],
    [{ devIterations: 5, iterationWeeks: 2 }, 12, 6],
    [{ devIterations: 4, iterationWeeks: 1 }, 5, 5],
    [{ devIterations: 3, iterationWeeks: 3 }, 12, 4],
    [{ devIterations: 5, iterationWeeks: 3 }, 18, 6],
    [{ devIterations: 1, iterationWeeks: 1 }, 2, 2],
  ]) {
    const cal = buildPiCalendar(opts);
    assert.equal(cal.totalWeeks, weeks, JSON.stringify(opts));
    assert.equal(cal.iterations.length, count, JSON.stringify(opts));
    contiguous(cal);
    for (const it of cal.iterations) assert.equal(it.endWeek - it.startWeek + 1, opts.iterationWeeks, 'every iteration, IP included, has the same length');
    assert.deepEqual(cal.iterations.map((i) => i.kind).filter((k) => k === 'ip'), ['ip'], 'exactly one IP iteration');
    assert.equal(cal.iterations.at(-1).kind, 'ip');
  }
});

test('IP iteration contains inspect-adapt and pi-planning, and no dev-only events', () => {
  const ip = buildPiCalendar({}).iterations.at(-1);
  assert.ok(ip.events.includes('inspect-adapt'));
  assert.ok(ip.events.includes('pi-planning'));
  assert.ok(ip.events.indexOf('inspect-adapt') < ip.events.indexOf('pi-planning'), 'I&A comes before PI Planning');
  for (const e of ['iteration-planning', 'system-demo', 'iteration-review-retro']) assert.ok(!ip.events.includes(e), e);
});

test('dev iterations hold iteration events; recurring syncs are listed once per iteration', () => {
  const cal = buildPiCalendar({ devIterations: 3, iterationWeeks: 1 });
  for (const it of cal.iterations.filter((i) => i.kind === 'dev')) {
    assert.equal(it.events[0], 'iteration-planning');
    for (const e of ['system-demo', 'iteration-review-retro']) assert.ok(it.events.includes(e), e);
    assert.ok(!it.events.includes('pi-planning'));
    assert.ok(!it.events.includes('inspect-adapt'));
  }
  assert.deepEqual(RECURRING_EVENTS, ['art-sync', 'po-sync']);
  for (const it of cal.iterations) {
    for (const e of RECURRING_EVENTS) assert.equal(it.events.filter((x) => x === e).length, 1, `${e} once in iteration ${it.index}`);
    assert.equal(new Set(it.events).size, it.events.length, 'no duplicate event ids');
  }
});

test('invalid input throws a clear RangeError', () => {
  for (const bad of [
    { devIterations: 0 },
    { devIterations: -2 },
    { devIterations: 2.5 },
    { devIterations: '4' },
    { devIterations: NaN },
    { iterationWeeks: 0 },
    { iterationWeeks: 1.5 },
    { iterationWeeks: Infinity },
  ]) {
    assert.throws(() => buildPiCalendar(bad), (e) => e instanceof RangeError && /(devIterations|iterationWeeks).*positive integer/.test(e.message), JSON.stringify(bad));
  }
});
