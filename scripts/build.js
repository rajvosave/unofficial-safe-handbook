// Builds the deployable site into _site/: the app files, one static HTML page
// per topic (so search engines can index each topic), sitemap.xml and robots.txt.
// Usage: node scripts/build.js [outDir]   (SITE_URL overrides the public address)
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOPICS } from '../js/topics.js';
import en from '../content/en.js';
import { buildPage, sitemapXml, robotsTxt } from './pages.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] ?? join(root, '_site');
const siteUrl = process.env.SITE_URL ?? 'https://rajvosave.github.io/unofficial-safe-handbook';
const t = (key) => en[key] ?? key;

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const p of ['favicon.svg', 'css', 'js', 'content']) cpSync(join(root, p), join(out, p), { recursive: true });

const shell = readFileSync(join(root, 'index.html'), 'utf8');
writeFileSync(join(out, 'index.html'), buildPage(shell, { topic: null, t, siteUrl }));
for (const topic of TOPICS) {
  const dir = join(out, topic.route);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'index.html'), buildPage(shell, { topic, t, siteUrl }));
}
writeFileSync(join(out, 'sitemap.xml'), sitemapXml(siteUrl, new Date().toISOString().slice(0, 10)));
writeFileSync(join(out, 'robots.txt'), robotsTxt(siteUrl));
console.log(`Built ${TOPICS.length + 1} pages into ${out}`);
