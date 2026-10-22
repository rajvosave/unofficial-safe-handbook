# SAFe 6.0 Handbook — Design

## Goal
A public, interactive handbook explaining SAFe 6.0 (Scaled Agile Framework): how it works, roles, events, artifacts. Primary language English; Croatian translation added later as a separate step.

## Audience and constraints
- Public audience, shareable deep links, mobile-friendly.
- Original content and original diagrams. No copying of Scaled Agile, Inc. text or the official Big Picture. Footer disclaimer: unofficial, not affiliated with Scaled Agile, Inc.; links to official sources.
- Static site (HTML/CSS/vanilla JS), no backend, no framework. Hostable anywhere.
- Accuracy checked against public SAFe 6.0 sources; owner reviews content before publishing.

## Architecture
- `index.html` — shell: header (language toggle, search), nav, content outlet.
- `css/` — tokens, light/dark theme, layout.
- `js/router.js` — hash routing (`#/events/pi-planning`), deep links, back/forward.
- `js/i18n.js` — language switch; all text lives in `content/en.js` and `content/hr.js`, keyed identically. Missing `hr` keys fall back to `en`.
- `js/infographic.js` + `assets/big-picture.svg` — original SVG of SAFe 6.0 (Portfolio, Large Solution, Essential/ART, team level, 7 core competencies) with clickable hotspots; hover tooltip; tap on mobile; keyboard focusable.
- `js/pages/*.js` — topic page renderer using one template: what it is, who takes part, inputs/outputs, cadence/duration, related topics.
- `js/search.js` — client-side search over content.

## Topic pages
Overview; 7 core competencies; configurations; principles and mindset; roles (team, RTE, Product Owner, Product Management, System Architect, Scrum Master, Business Owners, Epic Owners, LPM); ART and Solution Train; events (PI Planning, Iteration Planning, Daily Stand-up, Iteration Review/Retro, System Demo, Inspect & Adapt, ART Sync, PO Sync); artifacts (backlogs, Epic, Capability, Feature, Story, Enabler, PI Objectives); measurement; getting started; glossary and sources.

Special visuals:
- PI Planning: two-day agenda (tabs Day 1 / Day 2), PI calendar (iterations + Innovation & Planning) with events marked, flow to final plan and confidence vote, outputs (PI Objectives, program board, risks).
- Inspect & Adapt: three parts (PI System Demo, measurement, retro + problem-solving workshop).
- Roles: cards linking to events where the role participates.
- Artifacts: Epic → Capability → Feature → Story hierarchy, plus Enablers.

## Quality
Light/dark theme, responsive, keyboard accessible, sufficient contrast, semantic HTML.

## Build phases
1. Skeleton, i18n, routing.
2. Main SVG infographic with hotspots.
3. English content for all topics.
4. Special visuals (PI Planning, I&A, artifacts, roles).
5. Mobile/a11y check, publish-ready.
6. Croatian translation (separate, on request).

## Out of scope
Backend, accounts, quizzes, CMS, the Croatian text itself (until phase 6).
