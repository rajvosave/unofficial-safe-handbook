// Small DOM helpers shared by the topic visuals. Text always goes in as text
// nodes (never as markup), so content strings cannot inject HTML.

export function h(tag, attrs = {}, ...children) {
  const n = document.createElement(tag);
  setAttrs(n, attrs);
  for (const c of children) if (c !== null && c !== undefined && c !== false) n.append(c);
  return n;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

export function s(tag, attrs = {}, ...children) {
  const n = document.createElementNS(SVG_NS, tag);
  setAttrs(n, attrs);
  for (const c of children) if (c) n.append(c);
  return n;
}

function setAttrs(n, attrs) {
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v === undefined || v === null) continue;
    n.setAttribute(k, v === true ? '' : String(v));
  }
}

export const fmt = (str, vars) => String(str).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

// Unique id prefix per mount, so ids never collide if a visual is mounted twice.
let seq = 0;
export const uid = (prefix) => `${prefix}${++seq}`;

export const routeLink = (route, attrs, ...children) => h('a', { href: `#${route}`, 'data-route': route, ...attrs }, ...children);

// One delegated click listener per container, however often it is remounted.
// Each mount swaps in the current navigate callback and click handler; the
// handler returns true when it consumed the click.
export function bindClicks(container, navigate, onClick) {
  container.visualNavigate = navigate;
  container.visualOnClick = onClick;
  if (container.dataset.visualBound) return;
  container.dataset.visualBound = '1';
  container.addEventListener('click', (e) => {
    if (typeof container.visualOnClick === 'function' && container.visualOnClick(e)) return;
    const a = e.target.closest?.('a[data-route]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (typeof container.visualNavigate !== 'function') return;
    e.preventDefault();
    container.visualNavigate(a.dataset.route);
  });
}
