import { HOTSPOTS, VIEWBOX, hotspotLinks } from './hotspots.js';

const NS = 'http://www.w3.org/2000/svg';
const CHAR_EM = 0.56; // rough average glyph width in em for the UI font
const LABEL_FS = 20;

// Greedy word wrap. Words longer than the limit stay whole on their own line.
export function wrapLabel(text, maxChars) {
  const lines = [];
  let line = '';
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && next.length > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function svgEl(tag, attrs = {}) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  return n;
}

function htmlEl(tag, attrs = {}, text) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  if (text !== undefined) n.textContent = text;
  return n;
}

// Multi-line centered label at (cx, cy); rotate = -90 for vertical text.
function label(text, cx, cy, width, { fs = LABEL_FS, cls = 'ig-label', rotate = 0 } = {}) {
  const maxChars = Math.max(4, Math.floor((width - 24) / (fs * CHAR_EM)));
  const lines = wrapLabel(text, maxChars);
  const lh = fs * 1.2;
  const node = svgEl('text', {
    class: cls,
    x: cx,
    y: cy - ((lines.length - 1) * lh) / 2,
    'font-size': fs,
    'text-anchor': 'middle',
    'dominant-baseline': 'central',
  });
  if (rotate) node.setAttribute('transform', `rotate(${rotate} ${cx} ${cy})`);
  lines.forEach((l, i) => {
    const ts = svgEl('tspan', { x: cx, dy: i === 0 ? 0 : lh });
    ts.textContent = l;
    node.append(ts);
  });
  return node;
}

// Original, text-free decoration: small rounded "cars" suggesting a train of teams.
function cars(g, x, y, w, h, count, cls) {
  const gap = 8;
  const cw = (w - gap * (count - 1)) / count;
  for (let i = 0; i < count; i++) {
    g.append(svgEl('rect', { class: cls, x: x + i * (cw + gap), y, width: cw, height: h, rx: 6 }));
  }
}

function drawBackground(svg, t) {
  const bg = svgEl('g', { 'aria-hidden': 'true' });
  bg.append(
    svgEl('rect', { class: 'ig-band ig-band-full', x: 6, y: 88, width: 1188, height: 624, rx: 14 }),
    svgEl('rect', { class: 'ig-band ig-band-portfolio', x: 90, y: 92, width: 1100, height: 104, rx: 10 }),
    svgEl('rect', { class: 'ig-band ig-band-solution', x: 90, y: 204, width: 1100, height: 96, rx: 10 }),
    svgEl('rect', { class: 'ig-band ig-band-essential', x: 90, y: 308, width: 1100, height: 400, rx: 10 }),
    svgEl('rect', { class: 'ig-band ig-band-team', x: 276, y: 570, width: 910, height: 130, rx: 8 }),
  );
  // Value-stream chevrons in the portfolio band.
  for (let i = 0; i < 3; i++) {
    const x = 900 + i * 94;
    bg.append(
      svgEl('polygon', {
        class: 'ig-chevron',
        points: `${x},120 ${x + 70},120 ${x + 90},144 ${x + 70},168 ${x},168 ${x + 20},144`,
      }),
    );
  }
  // Cadence arrow behind the events row.
  bg.append(svgEl('path', { class: 'ig-cadence', d: 'M 290 524 H 1172 M 1158 512 L 1174 524 L 1158 536' }));
  const heading = svgEl('text', { class: 'ig-heading', x: 294, y: 590, 'font-size': 18 });
  heading.textContent = t('infographic.teamLevel');
  bg.append(heading);
  svg.append(bg);
}

function drawHotspot(h, t) {
  const g = svgEl('g', {
    class: `hotspot hs-${h.group}${h.tab ? ' hs-tab' : ''}`,
    tabindex: 0,
    role: 'link',
    'aria-label': t(h.labelKey),
    'aria-describedby': `ig-desc-${h.id}`,
    'data-id': h.id,
    'data-route': h.route,
  });
  const inset = 4;
  const sx = h.x + inset;
  const sy = h.y + inset;
  const sw = h.w - inset * 2;
  const sh = h.h - inset * 2;
  const rx = h.group === 'competency' ? sh / 2 : 10;
  g.append(
    svgEl('rect', { class: 'hs-hit', x: h.x, y: h.y, width: h.w, height: h.h }),
    svgEl('rect', { class: 'hs-shape', x: sx, y: sy, width: sw, height: sh, rx }),
  );
  const text = t(h.labelKey);
  if (h.vertical) {
    g.append(label(text, h.x + h.w / 2, h.y + h.h / 2, h.h, { cls: 'ig-label ig-label-strong', rotate: -90, fs: 22 }));
  } else if (h.cars) {
    const decoW = 300;
    const deco = svgEl('g', { 'aria-hidden': 'true' });
    cars(deco, sx + sw - decoW - 16, sy + 16, decoW, sh - 32, h.cars, 'ig-car');
    g.append(deco);
    const lw = sw - decoW - 32;
    g.append(label(text, sx + lw / 2 + 8, h.y + h.h / 2, lw, { cls: 'ig-label ig-label-strong', fs: 22 }));
  } else {
    const strong = h.group === 'competency' || h.tab;
    const fs = h.group === 'competency' ? 19 : LABEL_FS;
    g.append(label(text, h.x + h.w / 2, h.y + h.h / 2, h.w, { cls: `ig-label${strong ? ' ig-label-strong' : ''}`, fs }));
  }
  return g;
}

export function mountInfographic(container, t, navigate) {
  container.replaceChildren();
  container.classList.add('infographic');

  const svg = svgEl('svg', {
    viewBox: `${VIEWBOX.x} ${VIEWBOX.y} ${VIEWBOX.w} ${VIEWBOX.h}`,
    role: 'group',
    'aria-labelledby': 'ig-title ig-desc',
    focusable: 'false',
    tabindex: -1,
  });
  const title = svgEl('title', { id: 'ig-title' });
  title.textContent = t('infographic.title');
  const desc = svgEl('desc', { id: 'ig-desc' });
  desc.textContent = t('infographic.desc');
  svg.append(title, desc);
  drawBackground(svg, t);
  for (const h of HOTSPOTS) svg.append(drawHotspot(h, t));

  const scroll = htmlEl('div', { class: 'ig-scroll' });
  scroll.append(svg);
  const hint = htmlEl('p', { class: 'ig-hint' }, t('infographic.hint'));
  const tip = htmlEl('div', { class: 'ig-tooltip', role: 'tooltip', id: 'ig-tooltip', hidden: '' });
  const descs = htmlEl('div', { class: 'visually-hidden' });
  for (const h of HOTSPOTS) descs.append(htmlEl('span', { id: `ig-desc-${h.id}` }, t(h.descKey)));
  const list = htmlEl('ul', { class: 'ig-list', 'aria-label': t('infographic.list') });
  for (const l of hotspotLinks(t)) {
    const li = htmlEl('li');
    li.append(htmlEl('a', { href: l.href }, l.label));
    list.append(li);
  }
  container.append(hint, scroll, tip, descs, list);

  const byId = new Map(HOTSPOTS.map((h) => [h.id, h]));
  let hideTimer = null;
  let shownFor = null;

  function show(g) {
    clearTimeout(hideTimer);
    const h = byId.get(g.dataset.id);
    if (!h) return;
    shownFor = g;
    tip.replaceChildren(htmlEl('strong', {}, t(h.labelKey)), htmlEl('span', {}, t(h.descKey)));
    tip.hidden = false;
    const c = container.getBoundingClientRect();
    const r = g.getBoundingClientRect();
    const above = r.top + r.height / 2 > c.top + c.height / 2;
    const tw = tip.offsetWidth;
    let left = r.left - c.left + r.width / 2 - tw / 2;
    left = Math.max(0, Math.min(left, c.width - tw));
    tip.style.left = `${left}px`;
    tip.style.top = above ? `${r.top - c.top - tip.offsetHeight - 8}px` : `${r.bottom - c.top + 8}px`;
  }
  function hide() {
    clearTimeout(hideTimer);
    tip.hidden = true;
    shownFor = null;
  }
  const hideSoon = () => {
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hide, 150);
  };
  const hotspotOf = (e) => e.target.closest?.('.hotspot');

  svg.addEventListener('click', (e) => {
    const g = hotspotOf(e);
    if (g) navigate(g.dataset.route);
  });
  svg.addEventListener('keydown', (e) => {
    const g = hotspotOf(e);
    if (!g) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      navigate(g.dataset.route);
    } else if (e.key === 'Escape') {
      hide();
    }
  });
  svg.addEventListener('mouseover', (e) => {
    const g = hotspotOf(e);
    if (g && g !== shownFor) show(g);
    else if (g) clearTimeout(hideTimer);
  });
  svg.addEventListener('mouseout', (e) => {
    if (hotspotOf(e) && !e.relatedTarget?.closest?.('.hotspot')) hideSoon();
  });
  svg.addEventListener('focusin', (e) => {
    const g = hotspotOf(e);
    if (g) show(g);
  });
  svg.addEventListener('focusout', hide);
  tip.addEventListener('mouseenter', () => clearTimeout(hideTimer));
  tip.addEventListener('mouseleave', hideSoon);
}
