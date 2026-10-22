import { TOPICS, topicsBySection, findTopic } from './topics.js';
import { VISUALS, hasVisual } from './visuals/index.js';

export const SECTION_ORDER = [...new Set(TOPICS.map((x) => x.section))];

const SECTION_KEYS = [
  ['what', 'ui.section.what'],
  ['who', 'ui.section.who'],
  ['io', 'ui.section.io'],
  ['cadence', 'ui.section.cadence'],
];

const has = (t, key) => t(key) !== key;

export function topicTitle(topic, t) {
  return has(t, topic.titleKey) ? t(topic.titleKey) : topic.id;
}

export function buildNavModel(t) {
  return SECTION_ORDER.map((section) => ({
    section,
    label: t(`nav.${section}`),
    items: topicsBySection(section).map((x) => ({
      id: x.id,
      href: `#${x.route}`,
      label: topicTitle(x, t),
    })),
  }));
}

export function visibleSections(topic, t) {
  return SECTION_KEYS.map(([key, headingKey]) => ({
    key,
    headingKey,
    contentKey: `topic.${topic.id}.${key}`,
  })).filter((s) => has(t, s.contentKey));
}

export function splitParagraphs(text) {
  return String(text).split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
}

export function visibleItems(topic, t) {
  return (topic.items ?? [])
    .filter((id) => has(t, `topic.${topic.id}.item.${id}.title`))
    .map((id) => {
      const bodyKey = `topic.${topic.id}.item.${id}.body`;
      return { id, title: t(`topic.${topic.id}.item.${id}.title`), body: has(t, bodyKey) ? t(bodyKey) : '' };
    });
}

export function relatedLinks(topic, t) {
  return (topic.related ?? [])
    .map((id) => TOPICS.find((x) => x.id === id))
    .filter(Boolean)
    .map((x) => ({ href: `#${x.route}`, label: topicTitle(x, t) }));
}

// ---- DOM builders (thin) ----

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  for (const c of children) node.append(c);
  return node;
}

// Topics registered in js/visuals/index.js get their visual right after the
// "What it is" section (or after the summary when that section is absent).
function renderVisual(topic, t, navigate) {
  if (!hasVisual(topic.id)) return null;
  const box = el('section', { class: 'topic-section topic-visual', 'data-visual': topic.id });
  VISUALS[topic.id](box, t, navigate);
  return box;
}

export function renderTopic(topic, t, navigate = () => {}) {
  const article = el('article', { class: 'topic' });
  article.append(el('h1', {}, topicTitle(topic, t)));
  if (has(t, topic.summaryKey)) article.append(el('p', { class: 'summary' }, t(topic.summaryKey)));
  const sections = visibleSections(topic, t);
  const visual = renderVisual(topic, t, navigate);
  if (visual && !sections.some((s) => s.key === 'what')) article.append(visual);
  for (const s of sections) {
    const section = el('section', { class: 'topic-section' }, el('h2', {}, t(s.headingKey)));
    for (const para of splitParagraphs(t(s.contentKey))) section.append(el('p', {}, para));
    if (s.key === 'what') {
      for (const item of visibleItems(topic, t)) {
        section.append(el('h3', { id: item.id }, item.title));
        for (const para of splitParagraphs(item.body)) section.append(el('p', {}, para));
      }
    }
    article.append(section);
    if (s.key === 'what' && visual) article.append(visual);
  }
  const links = relatedLinks(topic, t);
  if (links.length) {
    const ul = el('ul', { class: 'related' });
    for (const l of links) ul.append(el('li', {}, el('a', { href: l.href }, l.label)));
    article.append(el('section', { class: 'topic-section' }, el('h2', {}, t('ui.section.related')), ul));
  }
  return article;
}

export function renderNotFound(t) {
  return el(
    'article',
    { class: 'topic' },
    el('h1', {}, t('ui.notFound.title')),
    el('p', {}, t('ui.notFound.body')),
    el('p', {}, el('a', { href: '#/' }, t('ui.home.link'))),
  );
}

export function renderHome(t) {
  const cards = el('ul', { class: 'cards' });
  for (const section of SECTION_ORDER) {
    const first = topicsBySection(section)[0];
    cards.append(
      el(
        'li',
        { class: 'card' },
        el('h2', {}, el('a', { href: `#${first.route}` }, t(`nav.${section}`))),
        el('p', {}, t(`ui.home.card.${section}`)),
      ),
    );
  }
  return el(
    'article',
    { class: 'home' },
    el('h1', {}, t('ui.home.title')),
    el('p', { class: 'summary' }, t('ui.home.intro')),
    el('div', { id: 'infographic' }),
    cards,
  );
}

export { findTopic };
