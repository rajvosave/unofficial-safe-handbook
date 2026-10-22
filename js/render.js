import { TOPICS, topicsBySection, findTopic, roleEvents } from './topics.js';
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

// Role pages (and the roles overview) word the "who" and "cadence" headings
// for roles; other topics keep the generic ones.
export const isRoleTopic = (topic) => topic.section === 'roles';

export function visibleSections(topic, t) {
  return SECTION_KEYS.map(([key, headingKey]) => ({
    key,
    headingKey: isRoleTopic(topic) && has(t, `${headingKey}.role`) ? `${headingKey}.role` : headingKey,
    contentKey: `topic.${topic.id}.${key}`,
  })).filter((s) => has(t, s.contentKey));
}

// Events a role takes part in, as link models, in the order of the events section.
export function roleEventLinks(topic, t) {
  const ids = roleEvents[topic.id] ?? [];
  return topicsBySection('events')
    .filter((x) => ids.includes(x.id))
    .map((x) => ({ href: `#${x.route}`, label: topicTitle(x, t) }));
}

export function splitParagraphs(text) {
  return String(text).split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean);
}

// Splits a text into paragraphs and bullet lists. A list is a run of
// paragraphs starting with "- "; a preceding paragraph ending in ":" becomes
// its label. Lists labelled Responsibilities / anti-patterns get a tone so
// they can be drawn as cards.
export function parseBlocks(text) {
  const blocks = [];
  for (const para of splitParagraphs(text)) {
    if (para.startsWith('- ')) {
      const item = para.replace(/^-\s+/, '');
      const last = blocks[blocks.length - 1];
      if (last?.type === 'list') { last.items.push(item); continue; }
      const prev = last?.type === 'p' && last.text.endsWith(':') ? blocks.pop() : null;
      const label = prev ? prev.text.replace(/:$/, '') : '';
      const tone = /anti-?pattern/i.test(label) ? 'avoid' : /^responsibilit/i.test(label) ? 'do' : 'plain';
      blocks.push({ type: 'list', label, tone, items: [item] });
    } else {
      blocks.push({ type: 'p', text: para });
    }
  }
  return blocks;
}

// "Term: explanation" bullets get a bold term when the term is short.
export function splitLead(item) {
  const m = /^([^:.]{2,40}):\s+(.+)$/s.exec(item);
  return m && m[1].split(/\s+/).length <= 5 ? { lead: m[1], rest: m[2] } : { lead: '', rest: item };
}

// Item headings get an id prefixed so slugs like 'full' or 'portfolio' never
// clash with other ids on the page.
export const itemAnchor = (id) => `item-${id}`;

export function visibleItems(topic, t) {
  return (topic.items ?? [])
    .filter((id) => has(t, `topic.${topic.id}.item.${id}.title`))
    .map((id) => {
      const bodyKey = `topic.${topic.id}.item.${id}.body`;
      return { id, title: t(`topic.${topic.id}.item.${id}.title`), body: has(t, bodyKey) ? t(bodyKey) : '' };
    });
}

// External link model for an item's optional `.url` key. Only https URLs are
// accepted; the visible text is the address without the scheme.
export function externalLink(url, t) {
  if (typeof url !== 'string') return null;
  let u;
  try { u = new URL(url); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  const text = `${u.host}${u.pathname}`.replace(/\/$/, '');
  return { href: u.href, text, note: t('ui.newTab') };
}

export function itemLink(topic, id, t) {
  const key = `topic.${topic.id}.item.${id}.url`;
  return has(t, key) ? externalLink(t(key), t) : null;
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

function renderBlock(block) {
  if (block.type === 'p') return el('p', {}, block.text);
  const ul = el('ul', { class: 'point-list' });
  for (const item of block.items) {
    const { lead, rest } = splitLead(item);
    ul.append(el('li', {}, ...(lead ? [el('strong', {}, `${lead}: `), rest] : [rest])));
  }
  if (block.tone === 'plain') return block.label ? el('div', {}, el('p', {}, `${block.label}:`), ul) : ul;
  const icon = el('span', { class: 'callout-icon', 'aria-hidden': 'true' }, block.tone === 'do' ? '✓' : '!');
  return el('div', { class: `callout callout-${block.tone}` }, el('h3', {}, icon, block.label), ul);
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
    for (const block of parseBlocks(t(s.contentKey))) section.append(renderBlock(block));
    if (s.key === 'cadence' && isRoleTopic(topic)) {
      const events = roleEventLinks(topic, t);
      if (events.length) {
        const ul = el('ul', { class: 'event-chips' });
        for (const l of events) ul.append(el('li', {}, el('a', { href: l.href }, l.label)));
        section.append(el('p', { class: 'chips-label' }, t('ui.role.events')), ul);
      }
    }
    if (s.key === 'what') {
      for (const item of visibleItems(topic, t)) {
        section.append(el('h3', { id: itemAnchor(item.id) }, item.title));
        for (const para of splitParagraphs(item.body)) section.append(el('p', {}, para));
        const link = itemLink(topic, item.id, t);
        if (link) {
          section.append(el('p', {}, el(
            'a',
            { href: link.href, class: 'external', target: '_blank', rel: 'noopener noreferrer' },
            link.text,
            el('span', { class: 'visually-hidden' }, ` (${link.note})`),
          )));
        }
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
