import { roleEvents, topicsBySection } from '../topics.js';
import { h, fmt, uid, routeLink, bindClicks } from './dom.js';

// ---- Model (pure, importable in node) ----
// Everything is derived from roleEvents in js/topics.js; only the grouping of
// roles into levels lives here.

export const LEVELS = ['team', 'art', 'solution-portfolio'];
const ROLE_LEVEL = {
  team: 'team',
  'product-owner': 'team',
  'scrum-master': 'team',
  rte: 'art',
  'product-management': 'art',
  'system-architect': 'art',
  'business-owners': 'art',
  'epic-owners': 'solution-portfolio',
  lpm: 'solution-portfolio',
};

export function buildRolesModel() {
  const used = new Set(Object.values(roleEvents).flat());
  const eventTopics = topicsBySection('events').filter((x) => used.has(x.id));
  const order = eventTopics.map((x) => x.id);
  const roleTopics = topicsBySection('roles').filter((x) => Object.hasOwn(roleEvents, x.id));
  const roles = roleTopics.map((x) => ({
    id: x.id,
    route: x.route,
    titleKey: x.titleKey,
    level: ROLE_LEVEL[x.id],
    eventIds: order.filter((e) => roleEvents[x.id].includes(e)),
  }));
  const events = eventTopics.map((x) => ({
    id: x.id,
    route: x.route,
    titleKey: x.titleKey,
    roleIds: roles.filter((r) => r.eventIds.includes(x.id)).map((r) => r.id),
  }));
  return { roles, events };
}

// What to highlight for a selection {kind: 'role'|'event', id}.
export function relatedTo(model, sel) {
  if (sel?.kind === 'role') return { roles: [], events: model.roles.find((r) => r.id === sel.id)?.eventIds ?? [] };
  if (sel?.kind === 'event') return { roles: model.events.find((e) => e.id === sel.id)?.roleIds ?? [], events: [] };
  return { roles: [], events: [] };
}

// Survives remounts (language switch).
const state = { sel: null };

// ---- Rendering ----

const count = (t, kind, n) => (n === 1 ? t(`rolesviz.count.${kind}.one`) : fmt(t(`rolesviz.count.${kind}`), { n }));

function card(kind, item, meta, t) {
  const name = t(item.titleKey);
  const badge = h('span', { class: 'rv-badge', hidden: true });
  const toggle = h(
    'button',
    { type: 'button', class: 'rv-toggle', 'aria-pressed': 'false', 'data-kind': kind, 'data-id': item.id },
    h('span', { class: 'rv-name' }, name),
    h('span', { class: 'rv-meta' }, meta),
    badge,
  );
  const link = routeLink(item.route, { class: 'rv-link' }, t('rolesviz.open'), h('span', { class: 'visually-hidden' }, `: ${name}`));
  const li = h('li', { class: 'rv-card', [`data-${kind}`]: item.id }, toggle, link);
  return { kind, id: item.id, name, li, toggle, badge };
}

export function mountRoles(container, t, navigate) {
  const model = buildRolesModel();
  const prefix = uid('rv');
  container.replaceChildren();
  container.classList.add('rv-visual');

  const cards = [];
  const rolesBox = h('div', { class: 'rv-roles' }, h('h3', { id: `${prefix}-roles` }, t('rolesviz.roles.title')));
  for (const level of LEVELS) {
    const list = h('ul', { class: 'rv-grid', 'aria-labelledby': `${prefix}-g-${level}` });
    for (const r of model.roles.filter((x) => x.level === level)) {
      const c = card('role', r, count(t, 'events', r.eventIds.length), t);
      cards.push(c);
      list.append(c.li);
    }
    rolesBox.append(h('h4', { class: 'rv-group', id: `${prefix}-g-${level}` }, t(`rolesviz.group.${level}`)), list);
  }

  const eventList = h('ul', { class: 'rv-grid', 'aria-labelledby': `${prefix}-events` });
  for (const e of model.events) {
    const c = card('event', e, count(t, 'roles', e.roleIds.length), t);
    cards.push(c);
    eventList.append(c.li);
  }
  const eventsBox = h('div', { class: 'rv-events' }, h('h3', { id: `${prefix}-events` }, t('rolesviz.events.title')), eventList);

  const status = h('p', { class: 'rv-status', 'aria-live': 'polite' });
  const clear = h('button', { type: 'button', class: 'rv-clear', 'data-rv-clear': '' }, t('rolesviz.clear'));
  const bar = h('div', { class: 'rv-bar' }, status, clear);

  function apply() {
    const sel = state.sel;
    const rel = relatedTo(model, sel);
    const names = [];
    for (const c of cards) {
      const selected = Boolean(sel && sel.kind === c.kind && sel.id === c.id);
      const related = (c.kind === 'role' ? rel.roles : rel.events).includes(c.id);
      c.toggle.setAttribute('aria-pressed', String(selected));
      c.li.classList.toggle('is-selected', selected);
      c.li.classList.toggle('is-related', related);
      c.badge.hidden = !(selected || related);
      c.badge.textContent = selected ? t('rolesviz.badge.selected') : related ? t(`rolesviz.badge.${c.kind}`) : '';
      if (related) names.push(c.name);
    }
    const current = sel && cards.find((c) => c.kind === sel.kind && c.id === sel.id);
    status.textContent = current
      ? fmt(t(sel.kind === 'role' ? 'rolesviz.status.role' : 'rolesviz.status.event'), { name: current.name, list: names.join(', ') })
      : t('rolesviz.status.none');
    clear.hidden = !current;
  }

  container.append(
    h('h2', {}, t('rolesviz.title')),
    h('p', {}, t('rolesviz.intro')),
    bar,
    h('div', { class: 'rv-layout' }, rolesBox, eventsBox),
  );
  apply();

  bindClicks(container, navigate, (e) => {
    if (e.target.closest?.('[data-rv-clear]')) {
      const prev = state.sel && cards.find((c) => c.kind === state.sel.kind && c.id === state.sel.id);
      state.sel = null;
      apply();
      // The clear button hides itself; keep keyboard focus on the card that was selected.
      prev?.toggle.focus();
      return true;
    }
    const btn = e.target.closest?.('button[data-kind]');
    if (!btn) return false;
    const { kind, id } = btn.dataset;
    state.sel = state.sel && state.sel.kind === kind && state.sel.id === id ? null : { kind, id };
    apply();
    return true;
  });
}
