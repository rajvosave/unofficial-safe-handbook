import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHash, startRouter } from '../js/router.js';

test('normalizes case, slashes and leading #', () => {
  assert.deepEqual(parseHash('#/EVENTS/PI-Planning/'), { section: 'events', topic: 'pi-planning', route: '/events/pi-planning' });
});

test('empty and degenerate hashes map to /', () => {
  for (const h of ['', '#', '#/', '#//', '///']) {
    assert.deepEqual(parseHash(h), { section: null, topic: null, route: '/' });
  }
});

test('non-string input maps to /', () => {
  for (const h of [undefined, null, 42, {}]) {
    assert.equal(parseHash(h).route, '/');
  }
});

test('section only', () => {
  assert.deepEqual(parseHash('#/roles'), { section: 'roles', topic: null, route: '/roles' });
});

test('repeated slashes collapse and extra segments are ignored', () => {
  assert.equal(parseHash('#//events///pi-planning//x/y').route, '/events/pi-planning');
});

test('startRouter calls immediately and on hashchange, tolerating undefined hash', () => {
  const listeners = {};
  const win = { location: { hash: '#/Roles/Team' }, addEventListener: (n, f) => { listeners[n] = f; } };
  const seen = [];
  startRouter((p) => seen.push(p.route), win);
  assert.deepEqual(seen, ['/roles/team']);
  win.location.hash = '#/events';
  listeners.hashchange();
  assert.deepEqual(seen, ['/roles/team', '/events']);
  win.location.hash = undefined;
  listeners.hashchange();
  assert.equal(seen[2], '/');
});
