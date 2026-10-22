import { createI18n } from './i18n.js';
import { startRouter } from './router.js';
import { findTopic } from './topics.js';
import en from '../content/en.js';
import hr from '../content/hr.js';
import { buildNavModel, topicTitle, renderTopic, renderNotFound, renderHome } from './render.js';

const i18n = createI18n({ dicts: { en, hr }, defaultLang: 'en' });
const { t } = i18n;
const $ = (id) => document.getElementById(id);
let currentRoute = { route: '/' };

function applyStatic() {
  document.documentElement.lang = i18n.getLang();
  for (const n of document.querySelectorAll('[data-i18n]')) n.textContent = t(n.dataset.i18n);
  for (const n of document.querySelectorAll('[data-i18n-placeholder]')) n.placeholder = t(n.dataset.i18nPlaceholder);
  for (const n of document.querySelectorAll('[data-i18n-aria]')) n.setAttribute('aria-label', t(n.dataset.i18nAria));
  for (const n of document.querySelectorAll('[data-i18n-aria-label]')) n.setAttribute('aria-label', t(n.dataset.i18nAriaLabel));
}

function renderNav() {
  const nav = $('nav');
  nav.replaceChildren();
  for (const group of buildNavModel(t)) {
    const h = document.createElement('h2');
    h.textContent = group.label;
    const ul = document.createElement('ul');
    for (const item of group.items) {
      const a = document.createElement('a');
      a.href = item.href;
      a.textContent = item.label;
      if (item.href === `#${currentRoute.route}`) a.setAttribute('aria-current', 'page');
      const li = document.createElement('li');
      li.append(a);
      ul.append(li);
    }
    nav.append(h, ul);
  }
}

function renderLangOptions() {
  const sel = $('lang');
  sel.replaceChildren();
  for (const code of ['en', 'hr']) {
    const o = document.createElement('option');
    o.value = code;
    o.textContent = code.toUpperCase();
    o.selected = code === i18n.getLang();
    sel.append(o);
  }
}

function renderPage(focus) {
  const topic = findTopic(currentRoute.route);
  const app = $('app');
  let view;
  let title;
  if (currentRoute.route === '/') {
    view = renderHome(t);
    title = t('app.title');
  } else if (topic) {
    view = renderTopic(topic, t);
    title = `${topicTitle(topic, t)} | ${t('app.title')}`;
  } else {
    view = renderNotFound(t);
    title = `${t('ui.notFound.title')} | ${t('app.title')}`;
  }
  app.replaceChildren(view);
  document.title = title;
  renderNav();
  if (focus) app.focus();
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('safe.theme', theme); } catch { /* ignore */ }
}

function currentTheme() {
  const set = document.documentElement.dataset.theme;
  if (set) return set;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

document.querySelector('.skip-link').addEventListener('click', (e) => {
  e.preventDefault();
  $('app').focus();
});

$('theme').addEventListener('click', () => setTheme(currentTheme() === 'dark' ? 'light' : 'dark'));
$('lang').addEventListener('change', (e) => {
  i18n.setLang(e.target.value);
  applyStatic();
  renderPage(false);
});

renderLangOptions();
applyStatic();
startRouter((r) => {
  currentRoute = r;
  renderPage(true);
});
