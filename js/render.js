import { TOPICS, topicsBySection, findTopic } from './topics.js';

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

export function renderTopic(topic, t) {
  const article = el('article', { class: 'topic' });
  article.append(el('h1', {}, topicTitle(topic, t)));
  if (has(t, topic.summaryKey)) article.append(el('p', { class: 'summary' }, t(topic.summaryKey)));
  for (const s of visibleSections(topic, t)) {
    article.append(
      el('section', { class: 'topic-section' }, el('h2', {}, t(s.headingKey)), el('p', {}, t(s.contentKey))),
    );
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
