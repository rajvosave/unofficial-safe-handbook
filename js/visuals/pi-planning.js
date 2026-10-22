import { buildPiCalendar, RECURRING_EVENTS } from '../pi-calendar.js';
import { findTopic } from '../topics.js';

// ---- Data (pure, importable in node) ----

const item = (slug, time) => ({ time, titleKey: `pi.agenda.${slug}.title`, descKey: `pi.agenda.${slug}.desc` });

// Typical, illustrative times only; the UI labels them as such.
export const AGENDA = {
  day1: [
    item('business-context', '08:00–09:00'),
    item('vision', '09:00–10:30'),
    item('architecture', '10:30–11:30'),
    item('planning-context', '11:30–13:00'),
    item('breakout-1', '13:00–16:00'),
    item('draft-review', '16:00–17:00'),
    item('management-review', '17:00–18:00'),
  ],
  day2: [
    item('adjustments', '08:00–09:00'),
    item('breakout-2', '09:00–11:00'),
    item('final-review', '11:00–13:00'),
    item('risks', '13:00–14:00'),
    item('confidence-vote', '14:00–14:15'),
    item('rework', '14:15–15:00'),
    item('retro', '15:00–16:00'),
  ],
};

const step = (id, day) => ({ id, day, titleKey: `pi.flow.${id}.title`, descKey: `pi.flow.${id}.desc` });

export const FLOW_STEPS = [
  step('business-context', 1),
  step('vision', 1),
  step('breakouts', 1),
  step('draft-review', 1),
  step('management-review', 1),
  step('final-plan', 2),
  step('confidence-vote', 2),
];

const out = (id, route, linkKey) => ({ id, route, linkKey, titleKey: `pi.out.${id}.title`, descKey: `pi.out.${id}.desc` });

export const OUTPUTS = [
  out('objectives', '/artifacts/pi-objectives', 'pi.out.objectives.link'),
  out('board', '/reference/glossary', 'pi.out.glossary'),
  out('risks', '/reference/glossary', 'pi.out.glossary'),
];

// Event lanes in the calendar. `at` places the marker at the start or the end
// of its iteration cell; `key` marks PI-level events (styled differently).
export const EVENT_LANES = [
  { id: 'iteration-planning', at: 'start' },
  { id: 'system-demo', at: 'end' },
  { id: 'iteration-review-retro', at: 'end' },
  { id: 'inspect-adapt', at: 'start', key: true },
  { id: 'pi-planning', at: 'end', key: true },
];

const DEV_OPTIONS = [3, 4, 5];
const WEEK_OPTIONS = [1, 2, 3];

// Survives remounts (language switch, navigating away and back).
const state = { day: 'day1', devIterations: 4, iterationWeeks: 2 };

// ---- DOM helpers ----

function h(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v === undefined || v === null) continue;
    n.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children) if (c !== null && c !== undefined) n.append(c);
  return n;
}

const fmt = (s, vars) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

const eventRoute = (id) => findTopic(`/events/${id}`)?.route ?? '/';

function routeLink(route, attrs, ...children) {
  return h('a', { href: `#${route}`, 'data-route': route, ...attrs }, ...children);
}

// ---- Agenda tabs ----

function renderAgenda(t) {
  const days = ['day1', 'day2'];
  const tablist = h('div', { class: 'pi-tabs', role: 'tablist', 'aria-label': t('pi.agenda.tabs') });
  const panels = [];
  const tabs = days.map((day) => {
    const selected = state.day === day;
    const tab = h('button', {
      type: 'button',
      role: 'tab',
      class: 'pi-tab',
      id: `pi-tab-${day}`,
      'aria-controls': `pi-panel-${day}`,
      'aria-selected': String(selected),
      tabindex: selected ? '0' : '-1',
      'data-day': day,
    }, t(`pi.agenda.${day}`));
    tablist.append(tab);

    const list = h('ol', { class: 'pi-agenda' });
    AGENDA[day].forEach((row, i) => {
      const descId = `pi-agenda-${day}-${i}`;
      const btn = h(
        'button',
        { type: 'button', class: 'pi-agenda-btn', 'aria-expanded': 'false', 'aria-controls': descId },
        h('span', { class: 'pi-agenda-time' }, row.time),
        h('span', { class: 'pi-agenda-title' }, t(row.titleKey)),
        h('span', { class: 'pi-agenda-chev', 'aria-hidden': 'true' }),
      );
      const desc = h('div', { class: 'pi-agenda-desc', id: descId, hidden: true }, h('p', {}, t(row.descKey)));
      btn.addEventListener('click', () => {
        const open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!open));
        desc.hidden = open;
      });
      list.append(h('li', { class: 'pi-agenda-item' }, btn, desc));
    });
    const panel = h('div', {
      role: 'tabpanel',
      class: 'pi-panel',
      id: `pi-panel-${day}`,
      'aria-labelledby': `pi-tab-${day}`,
      tabindex: '0',
      hidden: !selected,
    }, list);
    panels.push(panel);
    return tab;
  });

  function select(index, focus) {
    tabs.forEach((tab, i) => {
      const on = i === index;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      panels[i].hidden = !on;
    });
    state.day = days[index];
    if (focus) tabs[index].focus();
  }

  tablist.addEventListener('click', (e) => {
    const tab = e.target.closest('[role="tab"]');
    if (tab) select(tabs.indexOf(tab), false);
  });
  tablist.addEventListener('keydown', (e) => {
    const i = tabs.indexOf(e.target.closest('[role="tab"]'));
    if (i < 0) return;
    const last = tabs.length - 1;
    const next = { ArrowRight: i === last ? 0 : i + 1, ArrowLeft: i === 0 ? last : i - 1, Home: 0, End: last }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    select(next, true);
  });

  return h(
    'div',
    { class: 'pi-block' },
    h('h3', {}, t('pi.agenda.title')),
    h('p', { class: 'pi-note' }, t('pi.agenda.note')),
    tablist,
    ...panels,
  );
}

// ---- PI calendar ----

function iterationName(it, t) {
  return it.kind === 'ip' ? t('pi.cal.ip') : fmt(t('pi.cal.iteration'), { n: it.index });
}

function weekRange(it, t) {
  return it.startWeek === it.endWeek
    ? fmt(t('pi.cal.weekOne'), { n: it.startWeek })
    : fmt(t('pi.cal.weeks'), { from: it.startWeek, to: it.endWeek });
}

function renderCalendarTable(cal, t) {
  const { iterationWeeks } = state;
  const col = Math.max(3, 7 / iterationWeeks);
  const table = h('table', {
    class: 'pi-cal',
    style: `--pi-col: ${col}rem; --pi-weeks: ${cal.totalWeeks}`,
  });
  table.append(h('caption', { class: 'visually-hidden' }, t('pi.cal.caption')));

  const colgroup = h('colgroup', {}, h('col', { class: 'pi-col-head' }));
  for (let w = 1; w <= cal.totalWeeks; w++) colgroup.append(h('col', { class: 'pi-col-week' }));
  table.append(colgroup);

  const ipWeek = (w) => w >= cal.iterations.at(-1).startWeek;
  const headRow = h('tr', {}, h('th', { scope: 'col', class: 'pi-head' }, t('pi.cal.week')));
  for (let w = 1; w <= cal.totalWeeks; w++) {
    headRow.append(h('th', { scope: 'col', class: `pi-week${ipWeek(w) ? ' pi-ip-col' : ''}` }, String(w)));
  }
  table.append(h('thead', {}, headRow));

  const body = h('tbody');
  const bandRow = h('tr', { class: 'pi-row-iter' }, h('th', { scope: 'row', class: 'pi-head' }, t('pi.cal.iterations')));
  for (const it of cal.iterations) {
    bandRow.append(
      h(
        'td',
        { colspan: iterationWeeks, class: `pi-band pi-band-${it.kind}` },
        h('span', { class: 'pi-band-name' }, iterationName(it, t)),
        h('span', { class: 'pi-band-weeks' }, weekRange(it, t)),
      ),
    );
  }
  body.append(bandRow);

  EVENT_LANES.forEach((lane, li) => {
    const label = t(`pi.cal.lane.${lane.id}`);
    const row = h(
      'tr',
      { class: `pi-row-event${li % 2 ? ' pi-row-alt' : ''}` },
      h('th', { scope: 'row', class: 'pi-head' }, routeLink(eventRoute(lane.id), { class: 'pi-lane-link' }, label)),
    );
    for (const it of cal.iterations) {
      const cell = h('td', { colspan: iterationWeeks, class: `pi-cell pi-at-${lane.at}${it.kind === 'ip' ? ' pi-ip-col' : ''}` });
      if (it.events.includes(lane.id)) {
        const where = fmt(t(`pi.cal.at.${lane.at}`), { iteration: iterationName(it, t) });
        const text = `${label}, ${where}`;
        cell.append(
          routeLink(
            eventRoute(lane.id),
            { class: `pi-marker${lane.key ? ' pi-marker-key' : ''}`, title: text },
            h('span', { class: 'pi-marker-shape', 'aria-hidden': 'true' }),
            h('span', { class: 'visually-hidden' }, text),
          ),
        );
      }
      row.append(cell);
    }
    body.append(row);
  });

  for (const id of RECURRING_EVENTS) {
    const row = h(
      'tr',
      { class: `pi-row-recurring pi-recurring-${id}` },
      h(
        'th',
        { scope: 'row', class: 'pi-head' },
        routeLink(eventRoute(id), { class: 'pi-lane-link' }, t(`pi.cal.lane.${id}`)),
        h('span', { class: 'pi-lane-freq' }, t('pi.cal.weekly')),
      ),
    );
    for (let w = 1; w <= cal.totalWeeks; w++) {
      row.append(h('td', { class: `pi-tick-cell${ipWeek(w) ? ' pi-ip-col' : ''}` }, h('span', { class: 'pi-tick', 'aria-hidden': 'true' })));
    }
    body.append(row);
  }
  table.append(body);
  return table;
}

function calendarSummary(cal, t) {
  return fmt(t('pi.cal.summary'), {
    weeks: cal.totalWeeks,
    dev: state.devIterations,
    len: t(`pi.cal.len.${state.iterationWeeks}`),
  });
}

function radioGroup(name, legendKey, options, current, labelOf, onChange) {
  const fs = h('fieldset', { class: 'pi-seg' }, h('legend', {}, legendKey));
  for (const v of options) {
    const input = h('input', { type: 'radio', name, value: v, checked: v === current });
    input.addEventListener('change', () => input.checked && onChange(v));
    fs.append(h('label', { class: 'pi-seg-opt' }, input, h('span', {}, labelOf(v))));
  }
  return fs;
}

function renderCalendar(t) {
  const scroll = h('div', {
    class: 'pi-cal-scroll',
    tabindex: '0',
    role: 'region',
    'aria-labelledby': 'pi-cal-heading',
  });
  const summary = h('p', { class: 'pi-cal-summary', 'aria-live': 'polite' });

  function draw() {
    const cal = buildPiCalendar({ devIterations: state.devIterations, iterationWeeks: state.iterationWeeks });
    scroll.replaceChildren(renderCalendarTable(cal, t));
    summary.textContent = calendarSummary(cal, t);
  }

  const controls = h(
    'div',
    { class: 'pi-cal-controls' },
    radioGroup('pi-dev', t('pi.cal.devIterations'), DEV_OPTIONS, state.devIterations, String, (v) => {
      state.devIterations = v;
      draw();
    }),
    radioGroup('pi-len', t('pi.cal.iterationLength'), WEEK_OPTIONS, state.iterationWeeks, (v) => t(`pi.cal.len.${v}`), (v) => {
      state.iterationWeeks = v;
      draw();
    }),
  );

  const swatch = (cls) => h('span', { class: `pi-swatch ${cls}`, 'aria-hidden': 'true' });
  const legend = h(
    'ul',
    { class: 'pi-legend' },
    h('li', {}, swatch('pi-sw-dev'), t('pi.cal.legend.dev')),
    h('li', {}, swatch('pi-sw-ip'), t('pi.cal.legend.ip')),
    h('li', {}, swatch('pi-sw-marker'), t('pi.cal.legend.marker')),
    h('li', {}, swatch('pi-sw-key'), t('pi.cal.legend.key')),
    h('li', {}, swatch('pi-sw-lane'), t('pi.cal.legend.lane')),
  );

  draw();
  return h(
    'div',
    { class: 'pi-block' },
    h('h3', { id: 'pi-cal-heading' }, t('pi.cal.title')),
    h('p', {}, t('pi.cal.intro')),
    controls,
    summary,
    h('p', { class: 'pi-cal-hint' }, t('pi.cal.hint')),
    scroll,
    legend,
    h('p', { class: 'pi-note' }, t('pi.cal.ipNote')),
    h('p', { class: 'pi-note' }, t('pi.cal.typical')),
  );
}

// ---- Flow and outputs ----

function renderFlow(t) {
  const list = h('ol', { class: 'pi-flow' });
  FLOW_STEPS.forEach((s, i) => {
    list.append(
      h(
        'li',
        { class: `pi-flow-step pi-flow-day${s.day}` },
        h('span', { class: 'pi-flow-num', 'aria-hidden': 'true' }, String(i + 1)),
        h(
          'span',
          { class: 'pi-flow-body' },
          h('span', { class: 'pi-flow-day' }, t(`pi.agenda.day${s.day}`)),
          h('strong', { class: 'pi-flow-title' }, t(s.titleKey)),
          h('span', { class: 'pi-flow-desc' }, t(s.descKey)),
        ),
      ),
    );
  });
  return h('div', { class: 'pi-block' }, h('h3', {}, t('pi.flow.title')), h('p', {}, t('pi.flow.intro')), list);
}

function renderOutputs(t) {
  const list = h('ul', { class: 'pi-outputs' });
  for (const o of OUTPUTS) {
    list.append(
      h(
        'li',
        { class: 'pi-out' },
        h('h4', {}, t(o.titleKey)),
        h('p', {}, t(o.descKey)),
        routeLink(o.route, { class: 'pi-out-link' }, t(o.linkKey)),
      ),
    );
  }
  return h('div', { class: 'pi-block' }, h('h3', {}, t('pi.out.title')), list);
}

// ---- Mount ----

export function mountPiPlanning(container, t, navigate) {
  container.replaceChildren();
  container.classList.add('pi-visual');
  container.append(
    h('h2', {}, t('pi.visual.title')),
    h('p', {}, t('pi.visual.intro')),
    renderAgenda(t),
    renderCalendar(t),
    renderFlow(t),
    renderOutputs(t),
  );
  // Internal links go through navigate(); modified clicks keep browser behavior.
  // Remounting the same container replaces its children and the navigate
  // callback but never stacks a second listener.
  container.piNavigate = navigate;
  if (container.dataset.piBound) return;
  container.dataset.piBound = '1';
  container.addEventListener('click', (e) => {
    const a = e.target.closest?.('a[data-route]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (typeof container.piNavigate !== 'function') return;
    e.preventDefault();
    container.piNavigate(a.dataset.route);
  });
}
