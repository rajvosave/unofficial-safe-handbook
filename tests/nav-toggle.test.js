import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NAV_NARROW_QUERY, navReducer } from '../js/nav-toggle.js';

test('narrow-screen query matches the 720px layout breakpoint', () => {
  assert.equal(NAV_NARROW_QUERY, '(max-width: 720px)');
});

test('navReducer: toggle flips, navigate/escape/wide close, unknown keeps', () => {
  assert.equal(navReducer(false, 'toggle'), true);
  assert.equal(navReducer(true, 'toggle'), false);
  for (const ev of ['navigate', 'escape', 'wide']) {
    assert.equal(navReducer(true, ev), false, ev);
    assert.equal(navReducer(false, ev), false, ev);
  }
  assert.equal(navReducer(true, 'bogus'), true);
  assert.equal(navReducer(false, 'bogus'), false);
});
