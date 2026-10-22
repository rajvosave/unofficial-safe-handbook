# SAFe 6.0 Handbook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a public, bilingual-ready (English first) interactive handbook for SAFe 6.0 with a clickable SVG infographic and detailed topic pages.

**Architecture:** Static site, vanilla ES modules, no build step. Pure logic (i18n, router parsing, search, PI calendar, topic registry) lives in small modules tested with `node --test`; DOM code is thin and checked in the browser. All text lives in `content/<lang>.js`; code contains no user-facing strings.

**Tech Stack:** HTML, CSS (custom properties), vanilla JS ES modules, inline SVG, `node:test` (Node 20+), `python3 -m http.server` for local preview.

**Spec:** `docs/superpowers/specs/2026-10-22-safe-handbook-design.md`

## Global Constraints

- Static site only: no backend, no framework, no runtime dependencies, no build step.
- Primary language English; Croatian is out of scope for this plan. `content/hr.js` exists as an empty export so the fallback path is exercised.
- Missing keys in a non-English language fall back to `en`; the page never shows a raw key for a key that exists in `en`.
- Original text and original diagrams only. No copying from Scaled Agile, Inc. material or the official Big Picture.
- Footer disclaimer (verbatim key `footer.disclaimer`): "Unofficial guide. Not affiliated with or endorsed by Scaled Agile, Inc. SAFe® is a registered trademark of Scaled Agile, Inc." Footer also links to the official SAFe site.
- SAFe 6.0 facts used in content: seven core competencies are Lean-Agile Leadership, Team and Technical Agility, Agile Product Delivery, Enterprise Solution Delivery, Lean Portfolio Management, Organizational Agility, Continuous Learning Culture. Configurations are Essential, Large Solution, Portfolio, Full. A PI is typically 8–12 weeks: four development iterations plus one Innovation & Planning (IP) iteration; iterations default to 2 weeks; PI Planning is two days.
- Content facts must be checked against public SAFe 6.0 sources before a content task is marked done; the owner reviews content before publishing.
- Routes are hash-based, lowercase, kebab-case: `#/<section>/<topic>`; unknown routes render a not-found page, never a blank screen.
- Accessibility: semantic HTML, keyboard operable hotspots, visible focus, WCAG AA contrast in light and dark themes, usable at 360px width.
- Language and theme preferences persist in `localStorage` inside try/catch; the site works when storage is unavailable.

## Review Focus

- Unknown or malformed hash (`#/events/nope`, `#//`, `#/EVENTS/PI-Planning/`) → not-found page / normalized route, no exception.
- Language set to `hr` with partial content → falls back to `en` per key; `localStorage` throwing must not break startup.
- Search with regex metacharacters (`(`, `[`, `.*`) or an empty/whitespace query → no exception, empty-state result.
- PI calendar for non-default PI lengths (3, 4, 5 dev iterations; 1- and 3-week iterations) → correct week count and IP placement last.
- Infographic hotspot activated by keyboard (Enter/Space) and by touch → same navigation as click; hotspot pointing at a removed topic is caught by a test.

---

## File Structure

```
index.html                  shell: header, nav, <main id="app">, footer
package.json                "type":"module"; scripts: test, serve
css/tokens.css              colors, spacing, type scale, light/dark
css/base.css                reset, layout, typography
css/components.css          cards, tabs, timeline, hotspots, panels
js/main.js                  bootstrap: wires i18n, router, nav, render
js/i18n.js                  createI18n, language persistence
js/router.js                parseHash, startRouter
js/topics.js                topic registry (id, section, route, related, roles/events links)
js/render.js                topic page template -> DOM
js/search.js                buildIndex, search
js/pi-calendar.js           buildPiCalendar (pure)
js/infographic.js           mounts SVG, wires hotspots
js/hotspots.js              hotspot definitions (id, shape, labelKey, route)
js/visuals/pi-planning.js   agenda tabs + calendar rendering
js/visuals/inspect-adapt.js three-part visual
js/visuals/artifacts.js     Epic→Capability→Feature→Story hierarchy
js/visuals/roles.js         role cards with event links
content/en.js               all English text, keyed
content/hr.js               `export default {}` until translation phase
tests/*.test.js             node:test suites
```

---

### Task 1: Project scaffold and i18n

**Files:**
- Create: `package.json`, `.gitignore`, `js/i18n.js`, `content/en.js`, `content/hr.js`, `tests/i18n.test.js`

**Interfaces:**
- Produces: `createI18n({ dicts, defaultLang, storage }) -> { t(key, fallbackToKey?), setLang(lang), getLang() }`. `dicts` is `{ en: {...}, hr: {...} }` of flat dotted keys. `storage` is an injectable object with `getItem/setItem` (defaults to `globalThis.localStorage`, guarded). `t` returns the active-language string, else the `en` string, else the key itself.

- [ ] **Step 1: Write failing tests** in `tests/i18n.test.js`: `returns active language string`, `falls back to en when key missing in hr`, `returns the key when missing everywhere`, `setLang persists via storage and getLang restores it on a new instance`, `does not throw when storage.setItem throws`, `ignores unknown language codes and keeps current`.
- [ ] **Step 2: Run** `node --test tests/i18n.test.js` — Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `js/i18n.js` per the interface; add `package.json` (`"type":"module"`, `"scripts": {"test":"node --test tests/","serve":"python3 -m http.server 8080"}`), `.gitignore` (`node_modules`, `.DS_Store`), `content/en.js` exporting `{ 'app.title': 'SAFe 6.0 Handbook', 'footer.disclaimer': <spec text> }`, `content/hr.js` exporting `{}`.
- [ ] **Step 4: Run** `npm test` — Expected: all PASS.
- [ ] **Step 5: Commit** `feat: scaffold project and i18n module`.

### Task 2: Router and topic registry

**Files:**
- Create: `js/router.js`, `js/topics.js`, `tests/router.test.js`, `tests/topics.test.js`

**Interfaces:**
- Produces: `parseHash(hash: string) -> { section: string|null, topic: string|null, route: string }` — lowercases, strips leading `#`, collapses repeated and trailing slashes; `route` is the normalized `/section/topic` (or `/`).
- Produces: `startRouter(onRoute: (parsed) => void, win = window) -> void` — calls `onRoute` on load and `hashchange`.
- Produces: `TOPICS: Array<{ id, section, route, titleKey, summaryKey, related: string[] }>` and `findTopic(route) -> topic|undefined`, `topicsBySection(section)`. Sections: `foundations`, `roles`, `events`, `artifacts`, `measure`, `start`, `reference`. Initial topics (ids): `overview`, `core-competencies`, `configurations`, `principles`, `roles-overview`, `team`, `rte`, `product-owner`, `product-management`, `system-architect`, `scrum-master`, `business-owners`, `epic-owners`, `lpm`, `art`, `solution-train`, `pi-planning`, `iteration-planning`, `daily-standup`, `iteration-review-retro`, `system-demo`, `inspect-adapt`, `art-sync`, `po-sync`, `backlogs`, `epic`, `capability`, `feature`, `story`, `enabler`, `pi-objectives`, `metrics`, `getting-started`, `glossary`, `sources`.

- [ ] **Step 1: Write failing tests**: `parseHash('#/EVENTS/PI-Planning/')` → route `/events/pi-planning`; `parseHash('')` and `parseHash('#//')` → route `/`; `findTopic('/events/pi-planning')` returns the topic; every topic's `related` ids exist; every `titleKey`/`summaryKey` exists in `content/en.js` (this test fails until content tasks add keys — mark with the topic id in the failure message and keep it enabled).
- [ ] **Step 2: Run** `node --test tests/router.test.js tests/topics.test.js` — Expected: FAIL.
- [ ] **Step 3: Implement** both modules; `startRouter` must not throw when `parseHash` gets `undefined`.
- [ ] **Step 4: Run** the router test — PASS. The key-existence test stays red until Tasks 5–7; to keep the suite green per task, gate that single test on an env var `CHECK_CONTENT=1` and enable it in Task 11.
- [ ] **Step 5: Commit** `feat: router and topic registry`.

### Task 3: Shell, theming, and topic page renderer

**Files:**
- Create: `index.html`, `css/tokens.css`, `css/base.css`, `css/components.css`, `js/main.js`, `js/render.js`
- Modify: `content/en.js` (nav and UI strings)

**Interfaces:**
- Consumes: `createI18n`, `startRouter`, `findTopic`, `topicsBySection`.
- Produces: `renderTopic(topic, t) -> HTMLElement` with fixed sections in order: title, summary, "What it is", "Who takes part", "Inputs and outputs", "Cadence and duration", "Related topics" (links built from `topic.related`). A section is omitted when its content key is absent. `renderNotFound(t) -> HTMLElement`. `renderHome(t) -> HTMLElement` (hosts the infographic slot `#infographic`).

- [ ] **Step 1: Build shell**: `index.html` with header (title, language toggle, theme toggle, search input placeholder), `<nav>` grouped by section, `<main id="app" tabindex="-1">`, footer rendering `footer.disclaimer` plus link to scaledagileframework.com. Colors and spacing only through custom properties in `tokens.css`, redefined under `@media (prefers-color-scheme: dark)` and `[data-theme]`.
- [ ] **Step 2: Implement `main.js`**: on route, resolve topic, render into `#app`, move focus to `#app`, set `document.title`; unknown route → `renderNotFound`. Language and theme toggles persist (try/catch).
- [ ] **Step 3: Verify in browser** (`npm run serve`, open `http://localhost:8080/#/foundations/overview` and `#/nope`): not-found page shown for `#/nope`, language toggle switches without reload, no console errors. Use the preview browser and read the console.
- [ ] **Step 4: Commit** `feat: app shell, theming, topic renderer`.

### Task 4: Interactive infographic

**Files:**
- Create: `js/hotspots.js`, `js/infographic.js`, `tests/hotspots.test.js`
- Modify: `js/render.js` (home mounts infographic), `css/components.css`, `content/en.js`

**Interfaces:**
- Produces: `HOTSPOTS: Array<{ id, labelKey, descKey, route, x, y, w, h }>` in SVG viewBox units (`0 0 1200 800`); `mountInfographic(container: HTMLElement, t, navigate: (route) => void) -> void`.
- Consumes: `findTopic` for route validation.
- Layout (original drawing): Portfolio band on top, Large Solution band middle, Essential band bottom containing the ART and team level, seven core-competency pills around the outer ring. Hotspots cover at minimum: each of the 4 configurations, 7 competencies, ART, Solution Train, PI Planning, System Demo, Inspect & Adapt, and the roles RTE, Product Owner, Product Management, System Architect, Business Owners, Epic Owners, LPM.

- [ ] **Step 1: Write failing tests** in `tests/hotspots.test.js`: `every hotspot route resolves via findTopic`, `hotspot ids are unique`, `every hotspot rectangle lies inside the viewBox`, `hotspots cover all seven core competencies` (checks for the seven route ids under `foundations/core-competencies` anchors or dedicated topics — use anchors `#/foundations/core-competencies` with a `hash`-free distinct `id`, resolved by test through `route`).
- [ ] **Step 2: Run** `node --test tests/hotspots.test.js` — Expected: FAIL.
- [ ] **Step 3: Implement** hotspots and `mountInfographic`: each hotspot is an SVG `<a>`/`<g role="link" tabindex="0">` with `aria-label`; Enter/Space and click/tap call `navigate`; hover/focus shows a tooltip with `descKey`.
- [ ] **Step 4: Run** `npm test` — PASS. **Verify in browser**: tab through hotspots, press Enter, URL changes; check at 360px width that hotspots remain tappable (min 44px hit target via padded transparent rects).
- [ ] **Step 5: Commit** `feat: clickable SAFe 6.0 infographic`.

### Task 5: Content — foundations

**Files:**
- Modify: `content/en.js`

**Interfaces:**
- Produces: keys `topic.<id>.title`, `topic.<id>.summary`, `topic.<id>.what`, optional `.who`, `.io`, `.cadence` for `overview`, `core-competencies` (one paragraph per competency, anchors for each), `configurations` (Essential, Large Solution, Portfolio, Full; when to use each), `principles` (SAFe Lean-Agile principles and mindset, in original wording).

- [ ] **Step 1:** Research public SAFe 6.0 sources (scaledagileframework.com overview pages) and write the text in original words; note sources in `sources` topic data.
- [ ] **Step 2:** Run `CHECK_CONTENT=1 node --test tests/topics.test.js` — foundations topics no longer reported missing.
- [ ] **Step 3: Verify in browser** that each foundations route renders all present sections and that competency anchors scroll correctly.
- [ ] **Step 4: Commit** `content: SAFe foundations`.

### Task 6: Content — roles and trains

**Files:**
- Modify: `content/en.js`, `js/topics.js`

**Interfaces:**
- Produces: content for `roles-overview`, `team`, `rte`, `product-owner`, `product-management`, `system-architect`, `scrum-master`, `business-owners`, `epic-owners`, `lpm`, `art`, `solution-train`. Adds to the registry a `roleEvents: { [roleId]: eventId[] }` map (exported) used by the roles visual and by event pages ("Who takes part" links back to roles).

- [ ] **Step 1: Write failing test** in `tests/topics.test.js`: `roleEvents references existing role and event topics` and `every role page lists at least one event`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3:** Write content (responsibilities, typical events, common anti-patterns) and the `roleEvents` map.
- [ ] **Step 4: Run** `npm test` — PASS. **Commit** `content: roles and trains`.

### Task 7: Content — events, artifacts, measurement, start, glossary

**Files:**
- Modify: `content/en.js`

**Interfaces:**
- Produces: content for all events (`pi-planning`, `iteration-planning`, `daily-standup`, `iteration-review-retro`, `system-demo`, `inspect-adapt`, `art-sync`, `po-sync`), artifacts (`backlogs`, `epic`, `capability`, `feature`, `story`, `enabler`, `pi-objectives`), `metrics`, `getting-started`, `glossary` (term list, alphabetical), `sources` (links to official pages and the plain-text trademark note). Each event page has `.cadence` (e.g. PI Planning: "Two days, at the start of every PI").

- [ ] **Step 1:** Write the text in original words, verified against public sources.
- [ ] **Step 2:** Run `CHECK_CONTENT=1 npm test` — Expected: PASS for all topics (no missing title/summary keys).
- [ ] **Step 3: Commit** `content: events, artifacts, measurement, glossary`.

### Task 8: PI Planning visual (agenda and PI calendar)

**Files:**
- Create: `js/pi-calendar.js`, `js/visuals/pi-planning.js`, `tests/pi-calendar.test.js`
- Modify: `js/render.js` (topic `pi-planning` mounts the visual), `content/en.js`, `css/components.css`

**Interfaces:**
- Produces: `buildPiCalendar({ devIterations = 4, iterationWeeks = 2 }) -> { totalWeeks: number, iterations: Array<{ index, kind: 'dev'|'ip', startWeek, endWeek, events: string[] }> }` — IP iteration is always last and one iteration long; `events` holds event ids (`iteration-planning` at each iteration start, `system-demo` at each iteration end for dev iterations, `inspect-adapt` and `pi-planning` in the IP iteration, `art-sync` weekly).
- Produces: `AGENDA: { day1: Array<{ time, titleKey }>, day2: Array<{ time, titleKey }> }`. Day 1: business context, product/solution vision, architecture vision and development practices, planning context, team breakout 1, draft plan review, management review and problem solving. Day 2: planning adjustments, team breakout 2, final plan review, program risks (ROAM), confidence vote, plan rework if needed, planning retrospective and next steps.

- [ ] **Step 1: Write failing tests**: default → `totalWeeks === 10`, 5 iterations, last is `ip`; `{devIterations:3, iterationWeeks:2}` → 8 weeks; `{devIterations:5, iterationWeeks:2}` → 12 weeks; `{devIterations:4, iterationWeeks:1}` → 5 weeks; IP iteration contains `inspect-adapt` and `pi-planning`; iteration ranges are contiguous with no gaps.
- [ ] **Step 2: Run** `node --test tests/pi-calendar.test.js` — FAIL.
- [ ] **Step 3: Implement** `buildPiCalendar`, then the visual: tabs Day 1 / Day 2 (arrow-key navigable, `role="tablist"`), a calendar timeline whose event markers link to their topic pages, and a flow diagram (business context → vision → breakouts → draft review → management review → final plan → confidence vote) plus an outputs panel (PI Objectives, program board, risks). A small control lets the reader switch among the supported PI lengths.
- [ ] **Step 4: Run** `npm test` — PASS. **Verify in browser** (`#/events/pi-planning`): tabs switch with keyboard, calendar markers navigate, layout holds at 360px.
- [ ] **Step 5: Commit** `feat: PI Planning agenda and PI calendar`.

### Task 9: Inspect & Adapt, artifacts, and roles visuals

**Files:**
- Create: `js/visuals/inspect-adapt.js`, `js/visuals/artifacts.js`, `js/visuals/roles.js`
- Modify: `js/render.js`, `content/en.js`, `css/components.css`

**Interfaces:**
- Consumes: `roleEvents`, `findTopic`.
- Produces: `mountInspectAdapt(el, t)` (three parts: PI System Demo, quantitative measurement, retrospective and problem-solving workshop; each expands with a description); `mountArtifacts(el, t)` (Epic → Capability → Feature → Story hierarchy with Enablers shown as a parallel branch; each node links to its topic); `mountRoles(el, t)` (role cards; selecting a role highlights its events and vice versa).

- [ ] **Step 1: Write failing test** `tests/visuals.test.js`: with a minimal DOM stub, `mountRoles` renders one card per key in `roleEvents`; hierarchy node routes from `mountArtifacts` all resolve via `findTopic`.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** the three visuals as accessible HTML/SVG with keyboard support.
- [ ] **Step 4: Run** `npm test` — PASS. **Verify in browser** on `#/events/inspect-adapt`, `#/artifacts/backlogs`, `#/roles/roles-overview`.
- [ ] **Step 5: Commit** `feat: Inspect & Adapt, artifact hierarchy, role cards`.

### Task 10: Search

**Files:**
- Create: `js/search.js`, `tests/search.test.js`
- Modify: `js/main.js`, `index.html`, `css/components.css`

**Interfaces:**
- Produces: `buildIndex(topics, t) -> Index` (one entry per topic: id, route, title, concatenated text, lowercased); `search(index, query: string, limit = 8) -> Array<{ route, title, snippet }>` ranked by title match first, then body; plain substring matching (never builds a RegExp from the query); empty or whitespace query → `[]`.

- [ ] **Step 1: Write failing tests**: finds "PI Planning" by title; ranks title match above body match; query `(` , `[`, `.*` returns without throwing; whitespace query returns `[]`; respects `limit`; index rebuilt when language changes.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement**; in `main.js` wire the header input to a results listbox (`role="listbox"`, arrow keys, Enter navigates, Escape closes).
- [ ] **Step 4: Run** `npm test` — PASS. **Verify in browser** by searching "retro" and "(".
- [ ] **Step 5: Commit** `feat: client-side search`.

### Task 11: Polish, accessibility, and publish-readiness

**Files:**
- Modify: `css/*.css`, `index.html`, `package.json`
- Create: `README.md`

- [ ] **Step 1:** Enable the content-completeness check by default (remove the `CHECK_CONTENT` gate) and run `npm test` — Expected: PASS.
- [ ] **Step 2:** Add `<meta>` description, Open Graph tags, favicon, and `<noscript>` message. Verify contrast of both themes; fix any failures.
- [ ] **Step 3: Verify in browser** at 360px, 768px, and desktop: no horizontal scroll, all hotspots and tabs keyboard-operable, visible focus, no console errors across every route listed in `TOPICS` (script a loop over `TOPICS` routes through the preview browser and read the console).
- [ ] **Step 4:** Write `README.md`: how to run, how to add a language (copy `en.js` keys into `hr.js`), trademark note, hosting hint (GitHub Pages / Netlify, publish repo root).
- [ ] **Step 5: Commit** `chore: polish and publish-readiness`.

---

## Self-Review Notes

- Spec coverage: architecture/i18n/router/infographic/topic template/search (Tasks 1–4, 10); topic list (Tasks 5–7); PI Planning, I&A, roles, artifacts visuals (Tasks 8–9); quality and disclaimer (Tasks 3, 11); Croatian translation intentionally excluded (phase 6).
- Review Focus items map to tests in Tasks 1 (storage, fallback), 2 (routing), 4 (hotspots), 8 (calendar), 10 (search).
