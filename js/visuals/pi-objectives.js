import { h, fmt, uid, routeLink, bindClicks } from './dom.js';

// ---- Model (pure, importable in node) ----

// Life of one objective: written, rated, delivered, scored. The two ratings
// use the same 1 to 10 scale so they can be compared.
const STEPS = ['draft', 'plan', 'deliver', 'score'];

// Illustrative numbers only; the page says so.
const EXAMPLE = [
  { id: 'pay', planned: 8, actual: 8, committed: true },
  { id: 'search', planned: 6, actual: 3, committed: true },
  { id: 'reset', planned: 5, actual: 7, committed: false },
];

export function buildPiObjectivesModel() {
  return {
    steps: STEPS.map((id, i) => ({
      id,
      n: i + 1,
      titleKey: `poviz.step.${id}.title`,
      whoKey: `poviz.step.${id}.who`,
      descKey: `poviz.step.${id}.desc`,
    })),
    example: EXAMPLE.map((x) => ({ ...x, nameKey: `poviz.example.${x.id}` })),
    kinds: ['committed', 'uncommitted'],
  };
}

// ---- Rendering ----

function bar(cls, value) {
  return h('span', { class: `po-bar ${cls}`, 'aria-hidden': 'true' }, h('span', { class: 'po-fill', style: `width: ${value * 10}%` }));
}

export function mountPiObjectives(container, t, navigate) {
  const { steps, example, kinds } = buildPiObjectivesModel();
  const prefix = uid('po');
  container.replaceChildren();
  container.classList.add('po-visual');

  const list = h('ol', { class: 'po-steps' });
  for (const s of steps) {
    list.append(h(
      'li',
      { class: `po-step po-step-${s.id}` },
      h('span', { class: 'po-num', 'aria-hidden': 'true' }, String(s.n)),
      h('strong', { class: 'po-step-title' }, t(s.titleKey)),
      h('span', { class: 'po-who' }, t(s.whoKey)),
      h('span', { class: 'po-desc' }, t(s.descKey)),
    ));
  }

  const rows = h('tbody');
  for (const x of example) {
    rows.append(h(
      'tr',
      {},
      h(
        'th',
        { scope: 'row' },
        t(x.nameKey),
        x.committed ? null : h('span', { class: 'po-tag' }, t('poviz.kind.uncommitted.tag')),
      ),
      h('td', {}, h('span', { class: 'po-val' }, fmt(t('poviz.example.planned'), { n: x.planned })), bar('po-bar-planned', x.planned)),
      h('td', {}, h('span', { class: 'po-val' }, fmt(t('poviz.example.actual'), { n: x.actual })), bar('po-bar-actual', x.actual)),
    ));
  }
  const table = h(
    'table',
    { class: 'po-table' },
    h('caption', {}, t('poviz.example.caption')),
    h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, t('poviz.example.col.objective')), h('th', { scope: 'col' }, t('poviz.example.col.planned')), h('th', { scope: 'col' }, t('poviz.example.col.actual')))),
    rows,
  );

  const kindCards = h('ul', { class: 'po-kinds' });
  for (const k of kinds) {
    kindCards.append(h(
      'li',
      { class: `po-kind po-kind-${k}` },
      h('strong', {}, t(`poviz.kind.${k}.title`)),
      h('span', {}, t(`poviz.kind.${k}.desc`)),
      k === 'uncommitted' ? h('span', { class: 'po-kind-risk' }, t('poviz.kind.uncommitted.risk')) : null,
      k === 'uncommitted' ? routeLink('/events/pi-planning', { class: 'po-kind-link' }, t('poviz.kind.link')) : null,
    ));
  }

  container.append(
    h('h2', { id: `${prefix}-title` }, t('poviz.title')),
    h('p', {}, t('poviz.intro')),
    list,
    h('div', { class: 'po-loop' }, h('strong', {}, t('poviz.loop.title')), h('span', {}, t('poviz.loop.desc'))),
    h('h3', {}, t('poviz.example.title')),
    h('p', {}, t('poviz.example.intro')),
    table,
    h('p', { class: 'po-note' }, t('poviz.example.note')),
    h('h3', {}, t('poviz.kind.title')),
    kindCards,
  );
  bindClicks(container, navigate, null);
}
