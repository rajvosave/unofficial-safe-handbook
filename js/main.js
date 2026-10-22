import { createI18n } from './i18n.js';
import { startRouter } from './router.js';
import { findTopic, TOPICS } from './topics.js';
import en from '../content/en.js';
import hr from '../content/hr.js';
import { buildNavModel, topicTitle, renderTopic, renderNotFound, renderHome } from './render.js';
import { mountInfographic } from './infographic.js';
import { hasVisual } from './visuals/index.js';
import { mountSearch } from './search-ui.js';
import { mountNavToggle } from './nav-toggle.js';

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
    o.textContent = t(`lang.${code}`);
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
    view = renderTopic(topic, t, navigateTo);
    title = `${topicTitle(topic, t)} | ${t('app.title')}`;
  } else {
    view = renderNotFound(t);
    title = `${t('ui.notFound.title')} | ${t('app.title')}`;
  }
  app.replaceChildren(view);
  const isHome = currentRoute.route === '/';
  app.classList.toggle('wide', isHome || Boolean(topic && hasVisual(topic.id)));
  if (isHome) mountInfographic($('infographic'), t, navigateTo);
  document.title = title;
  renderNav();
  if (focus) app.focus();
}

const navToggle = mountNavToggle($('nav-toggle'), $('nav'));

function navigateTo(route) {
  location.hash = `#${route}`;
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('safe.theme', theme); } catch { /* ignore */ }
  syncThemeButton();
}

// The button reads "Dark theme" and is pressed while the dark theme is active.
function syncThemeButton() {
  $('theme').setAttribute('aria-pressed', String(currentTheme() === 'dark'));
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
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', syncThemeButton);
syncThemeButton();
$('lang').addEventListener('change', (e) => {
  i18n.setLang(e.target.value);
  applyStatic();
  search.rebuild();
  renderPage(false);
});

const search = mountSearch(
  { input: $('search'), panel: $('search-panel'), list: $('search-results'), empty: $('search-empty'), status: $('search-status') },
  { topics: TOPICS, t, navigate: navigateTo },
);

renderLangOptions();
applyStatic();
// The first render keeps focus where the browser put it (top of the page);
// later route changes move focus to the new content for keyboard and AT users.
let firstRender = true;
startRouter((r) => {
  currentRoute = r;
  renderPage(!firstRender);
  if (!firstRender) navToggle.navigated();
  firstRender = false;
});
