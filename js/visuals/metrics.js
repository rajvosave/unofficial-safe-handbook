import { h, uid, bindClicks } from './dom.js';

// ---- Model (pure, importable in node) ----

const dim = (id, glyph, measures, tone) => ({
  id,
  glyph,
  tone,
  titleKey: `mviz.dim.${id}.title`,
  questionKey: `mviz.dim.${id}.question`,
  howKey: `mviz.dim.${id}.how`,
  usedByKey: `mviz.dim.${id}.usedBy`,
  measures: measures.map((m) => ({ id: m, termKey: `mviz.dim.${id}.m.${m}.term`, descKey: `mviz.dim.${id}.m.${m}.desc` })),
});

export function buildMetricsModel() {
  return {
    dimensions: [
      dim('outcomes', '◎', ['satisfaction', 'business', 'adoption', 'okr'], 'outcomes'),
      dim('flow', '≋', ['time', 'load', 'velocity', 'efficiency', 'distribution', 'predictability'], 'flow'),
      dim('competency', '▲', ['teams', 'leaders'], 'competency'),
    ],
    do: ['outcomes', 'several', 'trends'],
    avoid: ['points', 'reward'],
  };
}

// ---- Rendering ----

function card(d, t) {
  const list = h('ul', { class: 'mv-measures' });
  for (const m of d.measures) {
    list.append(h('li', {}, h('strong', {}, t(m.termKey)), h('span', {}, t(m.descKey))));
  }
  return h(
    'li',
    { class: `mv-dim mv-${d.tone}` },
    h('h3', {}, h('span', { class: 'mv-glyph', 'aria-hidden': 'true' }, d.glyph), t(d.titleKey)),
    h('p', { class: 'mv-question' }, t(d.questionKey)),
    h('p', { class: 'mv-how-title' }, t(d.howKey)),
    list,
    h('p', { class: 'mv-used' }, t(d.usedByKey)),
  );
}

function rules(kind, ids, titleKey, t) {
  const ul = h('ul', { class: 'point-list' });
  for (const id of ids) ul.append(h('li', {}, t(`mviz.${kind}.${id}`)));
  return h(
    'div',
    { class: `callout callout-${kind === 'do' ? 'do' : 'avoid'}` },
    h('h3', {}, h('span', { class: 'callout-icon', 'aria-hidden': 'true' }, kind === 'do' ? '✓' : '!'), t(titleKey)),
    ul,
  );
}

export function mountMetrics(container, t, navigate) {
  const m = buildMetricsModel();
  const prefix = uid('mv');
  container.replaceChildren();
  container.classList.add('mv-visual');
  const dims = h('ul', { class: 'mv-dims', 'aria-labelledby': `${prefix}-title` });
  for (const d of m.dimensions) dims.append(card(d, t));
  container.append(
    h('h2', { id: `${prefix}-title` }, t('mviz.title')),
    h('p', {}, t('mviz.intro')),
    dims,
    h('div', { class: 'mv-rules' }, rules('do', m.do, 'mviz.do.title', t), rules('avoid', m.avoid, 'mviz.avoid.title', t)),
  );
  bindClicks(container, navigate, null);
}
