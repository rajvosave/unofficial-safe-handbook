import { test } from 'node:test';
import assert from 'node:assert/strict';
import { revealNewView } from '../js/focus-view.js';

test('revealNewView scrolls to the top, then focuses the view without scrolling', () => {
  const calls = [];
  const win = { scrollTo: (...a) => calls.push(['scrollTo', ...a]) };
  const app = { focus: (opts) => calls.push(['focus', opts]) };
  revealNewView(app, win);
  assert.deepEqual(calls, [['scrollTo', 0, 0], ['focus', { preventScroll: true }]]);
});
