// Pure search logic: index building, ranking, snippets, keyboard state.
// No DOM access here; see search-ui.js for the wiring.

const SNIPPET_LEN = 120;
const LEAD = 40;
const ELLIPSIS = '…';

const squash = (s) => String(s).replace(/\s+/g, ' ').trim();

export function buildIndex(topics, t) {
  const get = (key) => {
    if (!key) return '';
    const v = t(key);
    return typeof v === 'string' && v !== key ? squash(v) : '';
  };
  return topics.map((topic) => {
    const title = get(topic.titleKey) || topic.id;
    const summary = get(topic.summaryKey);
    const parts = [summary];
    for (const f of ['what', 'who', 'io', 'cadence']) parts.push(get(`topic.${topic.id}.${f}`));
    for (const slug of topic.items ?? []) {
      parts.push(get(`topic.${topic.id}.item.${slug}.title`), get(`topic.${topic.id}.item.${slug}.body`));
    }
    const raw = parts.filter(Boolean).join(' ');
    const text = raw.toLowerCase();
    return {
      id: topic.id,
      route: topic.route,
      title,
      titleLower: title.toLowerCase(),
      summary,
      raw: raw.length === text.length ? raw : text,
      text,
    };
  });
}

function countOccurrences(hay, needle) {
  let n = 0;
  let i = hay.indexOf(needle);
  while (i !== -1) {
    n += 1;
    i = hay.indexOf(needle, i + needle.length);
  }
  return n;
}

function clip(s) {
  return s.length > SNIPPET_LEN ? `${s.slice(0, SNIPPET_LEN).trimEnd()}${ELLIPSIS}` : s;
}

function snippetFor(entry, words, inTitle) {
  if (!inTitle) {
    let at = -1;
    for (const w of words) {
      const i = entry.text.indexOf(w);
      if (i !== -1 && (at === -1 || i < at)) at = i;
    }
    if (at !== -1) {
      const start = Math.max(0, at - LEAD);
      const end = Math.min(entry.raw.length, start + SNIPPET_LEN);
      const cut = entry.raw.slice(start, end).trim();
      return `${start > 0 ? ELLIPSIS : ''}${cut}${end < entry.raw.length ? ELLIPSIS : ''}`;
    }
  }
  return clip(entry.summary || entry.raw);
}

export function search(index, query, limit = 8) {
  if (typeof query !== 'string') return [];
  const q = squash(query).toLowerCase();
  if (!q || !Array.isArray(index)) return [];
  const words = q.split(' ');
  const max = Number.isFinite(limit) ? Math.floor(limit) : 8;
  if (max <= 0) return [];
  const hits = [];
  index.forEach((entry, pos) => {
    const hay = `${entry.titleLower} ${entry.text}`;
    if (!words.every((w) => hay.includes(w))) return;
    let tier;
    if (entry.titleLower === q) tier = 0;
    else if (entry.titleLower.startsWith(q)) tier = 1;
    else if (entry.titleLower.includes(q)) tier = 2;
    else if (words.every((w) => entry.titleLower.includes(w))) tier = 3;
    else tier = 4;
    const occ = words.reduce((n, w) => n + countOccurrences(hay, w), 0);
    hits.push({ entry, pos, tier, occ });
  });
  hits.sort((a, b) => a.tier - b.tier || b.occ - a.occ || a.entry.title.length - b.entry.title.length || a.pos - b.pos);
  return hits.slice(0, max).map(({ entry, tier }) => ({
    route: entry.route,
    title: entry.title,
    snippet: snippetFor(entry, words, tier < 4),
  }));
}

export function nextActiveIndex(current, key, length) {
  if (!length) return -1;
  switch (key) {
    case 'ArrowDown': return current < 0 || current >= length - 1 ? 0 : current + 1;
    case 'ArrowUp': return current <= 0 ? length - 1 : current - 1;
    case 'Home': return 0;
    case 'End': return length - 1;
    default: return current;
  }
}

// Escape in the search field: an open panel closes first (the query stays so
// the user can reopen it); a second press clears the query.
export function escapeAction(open, value) {
  if (open) return 'close';
  return value ? 'clear' : 'none';
}
