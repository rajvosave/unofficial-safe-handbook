import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createI18n } from '../js/i18n.js';

const dicts = { en: { a: 'Hello', b: 'Only EN' }, hr: { a: 'Bok' } };
const memStore = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, v) };
};

test('returns active language string', () => {
  const i = createI18n({ dicts, defaultLang: 'hr', storage: memStore() });
  assert.equal(i.t('a'), 'Bok');
});

test('falls back to en when key missing in hr', () => {
  const i = createI18n({ dicts, defaultLang: 'hr', storage: memStore() });
  assert.equal(i.t('b'), 'Only EN');
});

test('returns the key when missing everywhere', () => {
  const i = createI18n({ dicts, defaultLang: 'hr', storage: memStore() });
  assert.equal(i.t('nope.key'), 'nope.key');
});

test('setLang persists via storage and getLang restores it on a new instance', () => {
  const storage = memStore();
  const i = createI18n({ dicts, defaultLang: 'en', storage });
  i.setLang('hr');
  assert.equal(i.getLang(), 'hr');
  const j = createI18n({ dicts, defaultLang: 'en', storage });
  assert.equal(j.getLang(), 'hr');
});

test('does not throw when storage.setItem throws', () => {
  const storage = { getItem: () => null, setItem: () => { throw new Error('quota'); } };
  const i = createI18n({ dicts, defaultLang: 'en', storage });
  assert.doesNotThrow(() => i.setLang('hr'));
  assert.equal(i.getLang(), 'hr');
});

test('ignores unknown language codes and keeps current', () => {
  const i = createI18n({ dicts, defaultLang: 'en', storage: memStore() });
  i.setLang('xx');
  assert.equal(i.getLang(), 'en');
});

test('survives missing or throwing storage and ignores unknown saved lang', () => {
  assert.equal(createI18n({ dicts, defaultLang: 'en', storage: null }).getLang(), 'en');
  const bad = { getItem: () => { throw new Error('x'); }, setItem: () => {} };
  assert.equal(createI18n({ dicts, defaultLang: 'en', storage: bad }).getLang(), 'en');
  const stale = { getItem: () => 'zz', setItem: () => {} };
  assert.equal(createI18n({ dicts, defaultLang: 'en', storage: stale }).getLang(), 'en');
});
