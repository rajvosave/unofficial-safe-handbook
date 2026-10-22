// Pure model of a Planning Interval (PI) calendar.
//
// A PI is `devIterations` development iterations followed by exactly one
// Innovation and Planning (IP) iteration of the same length.
//
// Representation of events (ids match the event topic ids in js/topics.js):
// - Each iteration's `events` lists every event that happens in it, in rough
//   chronological order, each id at most once.
// - Development iterations: 'iteration-planning' (at the start), the recurring
//   syncs, then 'system-demo' and 'iteration-review-retro' (at the end).
// - IP iteration: the recurring syncs, then 'inspect-adapt' and 'pi-planning'
//   (PI Planning for the next PI).
// - Recurring syncs ('art-sync', 'po-sync') happen weekly. They are listed once
//   per iteration rather than once per week; the visual draws them as
//   continuous weekly lanes across every week of the iteration.
//
// Weeks are 1-based and inclusive; iterations are contiguous with no gaps.
// `index` is the 1-based position of the iteration in the PI.

export const RECURRING_EVENTS = ['art-sync', 'po-sync'];

const DEV_START = ['iteration-planning'];
const DEV_END = ['system-demo', 'iteration-review-retro'];
const IP_EVENTS = ['inspect-adapt', 'pi-planning'];

function checkPositiveInt(name, value) {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive integer (got ${String(value)})`);
  }
}

export function buildPiCalendar({ devIterations = 4, iterationWeeks = 2 } = {}) {
  checkPositiveInt('devIterations', devIterations);
  checkPositiveInt('iterationWeeks', iterationWeeks);

  const iterations = [];
  for (let i = 0; i <= devIterations; i++) {
    const kind = i < devIterations ? 'dev' : 'ip';
    const startWeek = i * iterationWeeks + 1;
    iterations.push({
      index: i + 1,
      kind,
      startWeek,
      endWeek: startWeek + iterationWeeks - 1,
      events: kind === 'dev'
        ? [...DEV_START, ...RECURRING_EVENTS, ...DEV_END]
        : [...RECURRING_EVENTS, ...IP_EVENTS],
    });
  }
  return { totalWeeks: (devIterations + 1) * iterationWeeks, iterations };
}
