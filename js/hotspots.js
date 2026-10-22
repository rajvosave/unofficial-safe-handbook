// Hotspot geometry for the original SAFe 6.0 overview drawing.
// Units are SVG viewBox units (0 0 1200 800). Each rectangle is the full
// hit area; the visible shape is drawn inset inside it.

export const VIEWBOX = { x: 0, y: 0, w: 1200, h: 800 };

// Below 720px container width the drawing stops shrinking (css: min-width 720px),
// so the smallest scale is 0.6 and 74 units >= 44 CSS px.
export const MIN_HIT = 74;

const hs = (id, route, group, x, y, w, h, extra = {}) => ({
  id,
  labelKey: `infographic.${id}.label`,
  descKey: `infographic.${id}.desc`,
  route,
  group,
  x,
  y,
  w,
  h,
  ...extra,
});

const COMP = '/foundations/core-competencies';
const CONF = '/foundations/configurations';

export const HOTSPOTS = [
  // Core competencies: top row (4) here, bottom row (3) last, so tab order
  // follows reading order top to bottom.
  hs('competency-lean-agile-leadership', COMP, 'competency', 10, 6, 287, 76),
  hs('competency-team-and-technical-agility', COMP, 'competency', 307, 6, 287, 76),
  hs('competency-agile-product-delivery', COMP, 'competency', 604, 6, 287, 76),
  hs('competency-enterprise-solution-delivery', COMP, 'competency', 901, 6, 287, 76),

  // Configurations: a bracket for Full SAFe and one tab per band.
  hs('config-full', CONF, 'full', 10, 92, 76, 616, { vertical: true }),
  hs('config-portfolio', CONF, 'portfolio', 94, 92, 170, 104, { tab: true }),
  hs('config-large-solution', CONF, 'solution', 94, 204, 170, 96, { tab: true }),
  hs('config-essential', CONF, 'essential', 94, 308, 170, 400, { tab: true }),

  // Portfolio band.
  hs('lpm', '/roles/lpm', 'portfolio', 284, 106, 290, 76),
  hs('epic-owners', '/roles/epic-owners', 'portfolio', 584, 106, 290, 76),

  // Large Solution band.
  hs('solution-train', '/foundations/solution-train', 'solution', 284, 214, 896, 76, { cars: 3 }),

  // Essential band: the train, its roles and its events.
  hs('art', '/foundations/art', 'essential', 284, 318, 896, 76, { cars: 6 }),
  hs('rte', '/roles/rte', 'essential', 284, 402, 216, 76),
  hs('product-management', '/roles/product-management', 'essential', 510, 402, 216, 76),
  hs('system-architect', '/roles/system-architect', 'essential', 736, 402, 216, 76),
  hs('business-owners', '/roles/business-owners', 'essential', 962, 402, 216, 76),
  hs('pi-planning', '/events/pi-planning', 'event', 284, 486, 292, 76),
  hs('system-demo', '/events/system-demo', 'event', 586, 486, 292, 76),
  hs('inspect-adapt', '/events/inspect-adapt', 'event', 888, 486, 292, 76),

  // Team level inside the Essential band.
  hs('agile-teams', '/roles/team', 'team', 284, 604, 292, 76),
  hs('product-owner', '/roles/product-owner', 'team', 586, 604, 292, 76),
  hs('scrum-master', '/roles/scrum-master', 'team', 888, 604, 292, 76),

  // Core competencies, bottom row.
  hs('competency-lean-portfolio-management', COMP, 'competency', 10, 718, 386, 76),
  hs('competency-organizational-agility', COMP, 'competency', 407, 718, 386, 76),
  hs('competency-continuous-learning-culture', COMP, 'competency', 804, 718, 386, 76),
];
