# SAFe 6.0 Handbook

An unofficial, plain-language guide to the Scaled Agile Framework (SAFe) 6.0:
how the pieces fit, who does what, the key events and artifacts, and how to get
started. It is a static site built with vanilla ES modules. There is no build
step and there are no runtime dependencies.

## Run it locally

The pages load ES modules, so serve the folder over HTTP rather than opening
`index.html` from disk:

```sh
npm run serve
```

Then open <http://localhost:8080>. (`npm run serve` runs `python3 -m http.server 8080`;
any static file server pointed at the repository root works too.)

## Tests

```sh
npm test
```

This runs `node --test` (Node.js 18 or newer) over `tests/`. The suite covers the
router, i18n fallback, topic registry and content completeness (every topic has
a title, summary and "What it is" text; every item has a title and body), the
infographic hotspots, the PI calendar, search ranking and keyboard state, the
visuals, and color contrast of the theme tokens in light and dark mode.

## Project structure

```
index.html          App shell: header, search, nav, main, footer
favicon.svg         Site icon
css/tokens.css      Design tokens for the light and dark themes
css/base.css        Reset, typography, focus and utility styles
css/components.css  Layout, navigation, infographic, visuals and search
js/main.js          Boot: i18n, router, rendering, theme and language switch
js/router.js        Hash router (#/section/topic)
js/i18n.js          Dictionary lookup with English fallback
js/topics.js        Topic registry (sections, routes, related topics, items)
js/render.js        Topic, home and not-found page builders
js/hotspots.js      Geometry and routes of the clickable overview drawing
js/infographic.js   The overview drawing (SVG) and its fallback link list
js/nav-toggle.js    Collapsible navigation on narrow screens
js/search.js        Search index, ranking and snippets (pure)
js/search-ui.js     Search combobox wiring
js/pi-calendar.js   Planning Interval calendar model
js/visuals/         PI Planning, Inspect and Adapt, artifact and role visuals
content/en.js       All English text, keyed by id
content/hr.js       Croatian text (empty for now, so not offered yet)
tests/              node:test suites
```

## Add or complete a language

All text lives in flat dictionaries in `content/`. To translate into Croatian:

1. Copy the keys you want to translate from `content/en.js` into
   `content/hr.js` and replace the English values.
2. Keep the keys exactly as they are. Any key missing from `hr.js` falls back
   to English automatically, so you can translate step by step.
3. Paragraphs inside a value are separated by a blank line (`\n\n`).

A language is only offered once its dictionary has at least one key: while
`hr.js` is empty the site is English-only and the language menu is hidden. As
soon as you add keys to `hr.js`, "Hrvatski" appears in the menu automatically.

To add another language, create `content/<code>.js` with the same shape,
import it in `js/main.js`, add it to the object passed to `availableLangs`, and
add a `lang.<code>` key with the language's own name (for example
`'lang.de': 'Deutsch'`) to `content/en.js`.

## Publish

The site is static, so the repository root can be published as-is:

- **GitHub Pages:** Settings → Pages → deploy from a branch, choose the branch
  and the `/ (root)` folder.
- **Netlify** (or any static host): no build command; set the publish
  directory to the repository root.

Routing uses the URL hash (`#/events/pi-planning`), so no server rewrites are
needed.

## Search engine visibility

`npm run build` (also run by the Pages workflow) writes `_site/` with a static
HTML page per topic, for example `_site/events/pi-planning/index.html`, each
with its own title, description, canonical address and structured data, plus
`sitemap.xml` and `robots.txt`. The app still takes over in the browser. The
public address comes from `SITE_URL` (default: the GitHub Pages address); set it
when the site moves to a custom domain. Adding a topic to `js/topics.js` adds
its page and sitemap entry automatically.

## Contributing

Corrections, new topics and translations are welcome. Open an issue or a pull
request at <https://github.com/rajvosave/unofficial-safe-handbook>.

## Trademark and disclaimer

This is an independent, unofficial learning resource. It is not affiliated
with, endorsed by or sponsored by Scaled Agile, Inc. SAFe® and Scaled Agile
Framework® are registered trademarks of Scaled Agile, Inc. All descriptions
are written in original wording; the drawings are original and do not
reproduce the official SAFe Big Picture. For the authoritative framework, see
<https://framework.scaledagile.com/>.
