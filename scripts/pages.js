// Pure helpers that turn the topic data and the index.html shell into static,
// crawlable pages. Used by scripts/build.js; no file or DOM access here.
import { TOPICS } from '../js/topics.js';
import {
  SECTION_ORDER, topicTitle, visibleSections, parseBlocks, splitLead, splitParagraphs,
  visibleItems, itemAnchor, itemLink, relatedLinks, roleEventLinks, isRoleTopic, buildNavModel,
} from '../js/render.js';

export const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const has = (t, key) => t(key) !== key;

// "../" repeated once per path segment, so a page at /events/pi-planning/
// reaches css/ and js/ at the site root.
export const prefixFor = (route) => '../'.repeat(route.split('/').filter(Boolean).length);

// A route like /events/pi-planning becomes a real directory URL relative to the
// page that links to it.
export const pathTo = (route, fromRoute) => {
  const target = route === '/' ? '' : `${route.slice(1)}/`;
  return `${prefixFor(fromRoute)}${target}` || './';
};

export function describe(text, max = 160) {
  const s = String(text).replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

function blockHtml(block) {
  if (block.type === 'p') return `<p>${esc(block.text)}</p>`;
  const items = block.items.map((item) => {
    const { lead, rest } = splitLead(item);
    return `<li>${lead ? `<strong>${esc(lead)}: </strong>` : ''}${esc(rest)}</li>`;
  }).join('');
  const ul = `<ul class="point-list">${items}</ul>`;
  if (block.tone === 'plain') return block.label ? `<div><p>${esc(block.label)}:</p>${ul}</div>` : ul;
  const icon = `<span class="callout-icon" aria-hidden="true">${block.tone === 'do' ? '✓' : '!'}</span>`;
  return `<div class="callout callout-${block.tone}"><h3>${icon}${esc(block.label)}</h3>${ul}</div>`;
}

export function topicArticleHtml(topic, t) {
  const from = topic.route;
  const out = [`<article class="topic"><h1>${esc(topicTitle(topic, t))}</h1>`];
  if (has(t, topic.summaryKey)) out.push(`<p class="summary">${esc(t(topic.summaryKey))}</p>`);
  for (const s of visibleSections(topic, t)) {
    out.push(`<section class="topic-section"><h2>${esc(t(s.headingKey))}</h2>`);
    for (const b of parseBlocks(t(s.contentKey))) out.push(blockHtml(b));
    if (s.key === 'cadence' && isRoleTopic(topic)) {
      const events = roleEventLinks(topic, t);
      if (events.length) {
        const lis = events.map((l) => `<li><a href="${pathTo(l.href.slice(1), from)}">${esc(l.label)}</a></li>`).join('');
        out.push(`<p class="chips-label">${esc(t('ui.role.events'))}</p><ul class="event-chips">${lis}</ul>`);
      }
    }
    if (s.key === 'what') {
      for (const item of visibleItems(topic, t)) {
        out.push(`<h3 id="${itemAnchor(item.id)}">${esc(item.title)}</h3>`);
        for (const para of splitParagraphs(item.body)) out.push(`<p>${esc(para)}</p>`);
        const link = itemLink(topic, item.id, t);
        if (link) out.push(`<p><a href="${esc(link.href)}" class="external" target="_blank" rel="noopener noreferrer">${esc(link.text)}<span class="visually-hidden"> (${esc(link.note)})</span></a></p>`);
      }
    }
    out.push('</section>');
  }
  const links = relatedLinks(topic, t);
  if (links.length) {
    const lis = links.map((l) => `<li><a href="${pathTo(l.href.slice(1), from)}">${esc(l.label)}</a></li>`).join('');
    out.push(`<section class="topic-section"><h2>${esc(t('ui.section.related'))}</h2><ul class="related">${lis}</ul></section>`);
  }
  out.push('</article>');
  return out.join('');
}

export function homeArticleHtml(t) {
  const cards = SECTION_ORDER.map((section) => {
    const first = TOPICS.find((x) => x.section === section);
    return `<li class="card"><h2><a href="${pathTo(first.route, '/')}">${esc(t(`nav.${section}`))}</a></h2><p>${esc(t(`ui.home.card.${section}`))}</p></li>`;
  }).join('');
  return `<article class="home"><h1>${esc(t('ui.home.title'))}</h1><p class="summary">${esc(t('ui.home.intro'))}</p><div id="infographic"></div><ul class="cards">${cards}</ul></article>`;
}

export function navHtml(t, fromRoute) {
  return buildNavModel(t).map((g) => {
    const lis = g.items.map((i) => `<li><a href="${pathTo(i.href.slice(1), fromRoute)}">${esc(i.label)}</a></li>`).join('');
    return `<h2>${esc(g.label)}</h2><ul>${lis}</ul>`;
  }).join('');
}

function jsonLd(data) {
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

const swap = (html, re, replacement) => {
  if (!re.test(html)) throw new Error(`index.html is missing ${re}`);
  return html.replace(re, () => replacement);
};

// Builds one page from the index.html shell. `topic` is null for the home page.
export function buildPage(shell, { topic, t, siteUrl }) {
  const route = topic ? topic.route : '/';
  const base = siteUrl.replace(/\/$/, '');
  const url = `${base}${route === '/' ? '/' : `${route}/`}`;
  const siteName = t('app.title');
  const title = topic ? `${topicTitle(topic, t)} | ${siteName}` : siteName;
  const desc = topic
    ? describe(has(t, topic.summaryKey) ? t(topic.summaryKey) : t('ui.home.intro'))
    : null;
  let html = shell;

  if (topic) {
    html = swap(html, /<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
    html = swap(html, /<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(desc)}">`);
    html = swap(html, /<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${esc(title)}">`);
    html = swap(html, /<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${esc(desc)}">`);
    html = swap(html, /<meta property="og:type" content="website">/, '<meta property="og:type" content="article">');
  }
  const desc0 = /<meta name="description" content="([^"]*)">/.exec(html)[1];

  const crumbs = topic
    ? [{ name: siteName, url: `${base}/` }, { name: t(`nav.${topic.section}`), url: `${base}/${topic.section}/${TOPICS.find((x) => x.section === topic.section).id}/` }, { name: topicTitle(topic, t), url }]
    : null;
  const ld = topic
    ? [
        { '@context': 'https://schema.org', '@type': 'Article', headline: topicTitle(topic, t), description: desc, inLanguage: 'en', url, isPartOf: { '@type': 'WebSite', name: siteName, url: `${base}/` } },
        { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: c.url })) },
      ]
    : [{ '@context': 'https://schema.org', '@type': 'WebSite', name: siteName, url: `${base}/`, description: desc0, inLanguage: 'en' }];

  const head = [
    `<link rel="canonical" href="${esc(url)}">`,
    `<meta property="og:url" content="${esc(url)}">`,
    `<meta property="og:site_name" content="${esc(siteName)}">`,
    '<meta property="og:locale" content="en">',
    '<meta name="twitter:card" content="summary">',
    ...ld.map(jsonLd),
  ].join('\n');
  html = swap(html, /<\/head>/, `${head}\n</head>`);

  const prefix = prefixFor(route);
  html = html.replace(/(href|src)="(favicon\.svg|css\/|js\/)/g, (_m, attr, p) => `${attr}="${prefix}${p}`);
  if (topic) html = swap(html, /<body>/, `<body data-route="${esc(route)}">`);
  html = swap(html, /<noscript>[\s\S]*?<\/noscript>\n?/, '');
  html = swap(html, /<nav id="nav" data-i18n-aria-label="ui\.nav"><\/nav>/, `<nav id="nav" aria-label="${esc(t('ui.nav'))}">${navHtml(t, route)}</nav>`);
  html = swap(html, /<main id="app" tabindex="-1"><\/main>/, `<main id="app" tabindex="-1">${topic ? topicArticleHtml(topic, t) : homeArticleHtml(t)}</main>`);
  // Fill the labels the app would otherwise set from JS, so the page reads
  // fully without scripts.
  html = html.replace(/(<(\w+)[^>]*\sdata-i18n="([^"]+)"[^>]*>)<\/\2>/g, (_m, open, tag, key) => `${open}${esc(t(key))}</${tag}>`);
  return html;
}

export function sitemapXml(siteUrl, lastmod) {
  const base = siteUrl.replace(/\/$/, '');
  const urls = ['/', ...TOPICS.map((x) => `${x.route}/`)];
  const body = urls.map((u) => `  <url><loc>${esc(base + u)}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export const robotsTxt = (siteUrl) => `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl.replace(/\/$/, '')}/sitemap.xml\n`;
