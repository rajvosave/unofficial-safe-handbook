import { h, s, fmt, uid, routeLink, bindClicks } from './dom.js';

// ---- Model (pure, importable in node) ----

const part = (id, details) => ({
  id,
  titleKey: `inspect.part.${id}.title`,
  descKey: `inspect.part.${id}.desc`,
  detailKeys: Array.from({ length: details }, (_, i) => `inspect.part.${id}.d${i + 1}`),
});

const wsStep = (id) => ({ id, titleKey: `inspect.ws.${id}.title`, descKey: `inspect.ws.${id}.desc` });

export function buildInspectAdaptModel() {
  return {
    parts: [part('demo', 3), part('measure', 3), part('workshop', 3)],
    workshopSteps: ['agree', 'root-cause', 'biggest', 'restate', 'brainstorm', 'backlog'].map(wsStep),
  };
}

// Which parts are open survives remounts (language switch, back navigation).
const state = { open: new Set() };

// ---- Sketches for the workshop steps (decorative; the text carries meaning) ----

const line = (d) => s('path', { d, class: 'ia-sk-line' });
const dot = (cx, cy, r) => s('circle', { cx, cy, r, class: 'ia-sk-fill' });
const box = (x, y, w, hgt, cls = 'ia-sk-line') => s('rect', { x, y, width: w, height: hgt, rx: 2, class: cls });

const SKETCHES = {
  // A problem card with a pin.
  agree: () => [box(14, 8, 36, 26), dot(32, 8, 3), line('M20 18h24M20 25h16')],
  // Fishbone: spine leading to the problem head, with cause bones.
  'root-cause': () => [
    line('M6 20h40'), box(46, 13, 12, 14, 'ia-sk-fill'),
    line('M14 20l-6-10M26 20l-6-10M38 20l-6-10M14 20l-6 10M26 20l-6 10M38 20l-6 10'),
  ],
  // Pareto: descending bars with a rising cumulative line; the biggest bar is filled.
  biggest: () => [
    box(8, 10, 9, 24, 'ia-sk-fill'), box(20, 18, 9, 16), box(32, 24, 9, 10), box(44, 29, 9, 5),
    line('M12 9L24 5L37 3L49 2'), line('M4 35h56'),
  ],
  // Rewriting the problem: one card turns into a sharper one.
  restate: () => [box(4, 10, 20, 18), line('M8 16h12M8 22h8'), line('M28 19h10M34 15l4 4-4 4'), box(42, 10, 18, 18, 'ia-sk-fill')],
  // Many ideas around a session.
  brainstorm: () => [dot(32, 20, 5), ...[[14, 10], [50, 10], [12, 30], [52, 30], [32, 5], [32, 35]].map(([x, y]) => s('circle', { cx: x, cy: y, r: 4, class: 'ia-sk-line' })), line('M27 18L18 12M37 18L46 12M27 23L16 28M37 23L48 28')],
  // An ordered list of improvement items, the top one ready.
  backlog: () => [box(10, 5, 44, 8, 'ia-sk-fill'), box(10, 16, 44, 8), box(10, 27, 44, 8)],
};

const sketch = (id) => s('svg', { viewBox: '0 0 64 40', class: 'ia-sketch', 'aria-hidden': 'true', focusable: 'false' }, ...SKETCHES[id]());

// ---- Rendering ----

function renderFlow(model, t, prefix) {
  const flow = h('ol', { class: 'ia-flow', 'aria-label': t('inspect.flow.label') });
  model.parts.forEach((p, i) => {
    const open = state.open.has(p.id);
    const panelId = `${prefix}-panel-${p.id}`;
    const btn = h(
      'button',
      { type: 'button', class: 'ia-toggle', 'aria-expanded': String(open), 'aria-controls': panelId, 'data-ia-part': p.id },
      h('span', { class: 'ia-num', 'aria-hidden': 'true' }, String(i + 1)),
      h(
        'span',
        { class: 'ia-head' },
        h('span', { class: 'ia-part' }, fmt(t('inspect.part.label'), { n: i + 1 })),
        h('span', { class: 'ia-title' }, t(p.titleKey)),
      ),
      h('span', { class: 'ia-chev', 'aria-hidden': 'true' }),
    );
    const panel = h('div', { class: 'ia-panel', id: panelId, hidden: !open }, h('ul', {}, ...p.detailKeys.map((k) => h('li', {}, t(k)))));
    flow.append(
      h(
        'li',
        { class: `ia-step${open ? ' is-open' : ''}` },
        h('h3', { class: 'ia-step-h' }, btn),
        h('p', { class: 'ia-desc' }, t(p.descKey)),
        panel,
      ),
    );
  });
  return flow;
}

function renderOutcome(t) {
  return h(
    'div',
    { class: 'ia-outcome' },
    h('h3', {}, t('inspect.outcome.title')),
    h('p', {}, t('inspect.outcome.text')),
    h(
      'p',
      { class: 'ia-links' },
      routeLink('/artifacts/backlogs', { class: 'ia-link' }, t('inspect.outcome.backlogs')),
      routeLink('/events/pi-planning', { class: 'ia-link' }, t('inspect.outcome.pi')),
    ),
  );
}

function renderWorkshop(model, t) {
  const list = h('ol', { class: 'ia-ws' });
  model.workshopSteps.forEach((st, i) => {
    list.append(
      h(
        'li',
        { class: 'ia-ws-step' },
        h('span', { class: 'ia-ws-num', 'aria-hidden': 'true' }, String(i + 1)),
        sketch(st.id),
        h('strong', { class: 'ia-ws-title' }, t(st.titleKey)),
        h('span', { class: 'ia-ws-desc' }, t(st.descKey)),
      ),
    );
  });
  return h('div', { class: 'ia-block' }, h('h3', {}, t('inspect.ws.title')), h('p', {}, t('inspect.ws.intro')), list);
}

function toggle(btn) {
  const open = btn.getAttribute('aria-expanded') !== 'true';
  btn.setAttribute('aria-expanded', String(open));
  const panel = btn.closest('.ia-step').querySelector('.ia-panel');
  panel.hidden = !open;
  btn.closest('.ia-step').classList.toggle('is-open', open);
  if (open) state.open.add(btn.dataset.iaPart);
  else state.open.delete(btn.dataset.iaPart);
}

export function mountInspectAdapt(container, t, navigate) {
  const model = buildInspectAdaptModel();
  const prefix = uid('ia');
  container.replaceChildren();
  container.classList.add('ia-visual');
  container.append(
    h('h2', {}, t('inspect.visual.title')),
    h('p', {}, t('inspect.visual.intro')),
    renderFlow(model, t, prefix),
    renderOutcome(t),
    renderWorkshop(model, t),
  );
  bindClicks(container, navigate, (e) => {
    const btn = e.target.closest?.('button[data-ia-part]');
    if (!btn) return false;
    toggle(btn);
    return true;
  });
}
