import { h, uid, routeLink, bindClicks } from './dom.js';

// ---- Model (pure, importable in node) ----

// Epic > Capability > Feature > Story, each with the backlog it usually lives in.
const LEVELS = [
  ['epic', 'portfolio'],
  ['capability', 'solution'],
  ['feature', 'art'],
  ['story', 'team'],
];

export function buildArtifactsModel() {
  const nodes = LEVELS.map(([id, level], i) => ({
    id,
    topicId: id,
    level,
    parentId: i === 0 ? null : LEVELS[i - 1][0],
    titleKey: `topic.${id}.title`,
    descKey: `artifactsviz.node.${id}.desc`,
    route: `/artifacts/${id}`,
    ...(id === 'capability' ? { noteKey: 'artifactsviz.capability.note' } : {}),
  }));
  const attachesTo = nodes.map((n) => n.id);
  return {
    nodes,
    // Enablers are a parallel branch: one variant per level, all explained on the Enabler page.
    enablers: {
      id: 'enabler',
      topicId: 'enabler',
      route: '/artifacts/enabler',
      titleKey: 'topic.enabler.title',
      attachesTo,
      variants: attachesTo.map((at) => ({
        attachesTo: at,
        titleKey: `artifactsviz.enabler.${at}.title`,
        descKey: `artifactsviz.enabler.${at}.desc`,
      })),
    },
  };
}

// ---- Rendering ----

function nodeLink(route, cls, title, desc, note) {
  return routeLink(
    route,
    { class: `av-node ${cls}` },
    h('strong', { class: 'av-title' }, title),
    h('span', { class: 'av-desc' }, desc),
    note ? h('span', { class: 'av-note' }, note) : null,
  );
}

export function mountArtifacts(container, t, navigate) {
  const { nodes, enablers } = buildArtifactsModel();
  const headingId = `${uid('av')}-heading`;
  container.replaceChildren();
  container.classList.add('av-visual');

  const levels = h('ol', { class: 'av-levels' });
  nodes.forEach((n, i) => {
    const variant = enablers.variants.find((v) => v.attachesTo === n.id);
    levels.append(
      h(
        'li',
        { class: 'av-level', 'data-level': n.level },
        h('span', { class: 'av-tag' }, t(`artifactsviz.level.${n.level}`)),
        nodeLink(n.route, 'av-main', t(n.titleKey), t(n.descKey), n.noteKey ? t(n.noteKey) : null),
        nodeLink(enablers.route, 'av-enabler', t(variant.titleKey), t(variant.descKey)),
        i < nodes.length - 1 ? h('span', { class: 'visually-hidden' }, t('artifactsviz.splits')) : null,
      ),
    );
  });

  container.append(
    h('h2', { id: headingId }, t('artifactsviz.title')),
    h('p', {}, t('artifactsviz.intro')),
    h(
      'div',
      { class: 'av-diagram', role: 'group', 'aria-labelledby': headingId },
      h(
        'div',
        { class: 'av-cols', 'aria-hidden': 'true' },
        h('span', { class: 'av-col av-col-level' }, t('artifactsviz.col.level')),
        h('span', { class: 'av-col' }, t('artifactsviz.col.business')),
        h('span', { class: 'av-col' }, t('artifactsviz.col.enabler')),
      ),
      levels,
    ),
  );
  bindClicks(container, navigate, null);
}
