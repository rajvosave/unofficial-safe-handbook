const def = (section, id, related = [], items) => ({
  id,
  section,
  route: `/${section}/${id}`,
  titleKey: `topic.${id}.title`,
  summaryKey: `topic.${id}.summary`,
  related,
  ...(items ? { items } : {}),
});

export const TOPICS = [
  def('foundations', 'overview', ['core-competencies', 'configurations', 'principles']),
  def('foundations', 'core-competencies', ['overview', 'principles', 'metrics'], [
    'lean-agile-leadership',
    'team-technical-agility',
    'agile-product-delivery',
    'enterprise-solution-delivery',
    'lean-portfolio-management',
    'organizational-agility',
    'continuous-learning-culture',
  ]),
  def('foundations', 'configurations', ['overview', 'art', 'solution-train'], [
    'essential',
    'large-solution',
    'portfolio',
    'full',
  ]),
  def('foundations', 'principles', ['overview', 'core-competencies'], [
    'economic-view',
    'systems-thinking',
    'variability-options',
    'incremental-learning',
    'objective-milestones',
    'flow-wip',
    'cadence-sync',
    'intrinsic-motivation',
    'decentralize',
    'organize-value',
  ]),
  def('foundations', 'art', ['pi-planning', 'rte', 'system-demo', 'art-sync', 'solution-train']),
  def('foundations', 'solution-train', ['art', 'configurations', 'system-architect']),

  def('roles', 'roles-overview', ['team', 'rte', 'product-owner', 'product-management']),
  def('roles', 'team', ['roles-overview', 'iteration-planning', 'daily-standup', 'story']),
  def('roles', 'rte', ['art', 'pi-planning', 'art-sync', 'inspect-adapt']),
  def('roles', 'product-owner', ['backlogs', 'story', 'iteration-planning', 'po-sync']),
  def('roles', 'product-management', ['pi-planning', 'feature', 'backlogs', 'po-sync']),
  def('roles', 'system-architect', ['enabler', 'solution-train', 'system-demo', 'pi-planning']),
  def('roles', 'scrum-master', ['team', 'daily-standup', 'iteration-review-retro']),
  def('roles', 'business-owners', ['pi-planning', 'pi-objectives', 'inspect-adapt']),
  def('roles', 'epic-owners', ['epic', 'lpm', 'backlogs']),
  def('roles', 'lpm', ['epic-owners', 'epic', 'metrics']),

  def('events', 'pi-planning', ['art', 'product-management', 'rte', 'system-demo', 'pi-objectives']),
  def('events', 'iteration-planning', ['team', 'product-owner', 'story', 'daily-standup']),
  def('events', 'daily-standup', ['team', 'scrum-master', 'iteration-planning']),
  def('events', 'iteration-review-retro', ['team', 'scrum-master', 'system-demo']),
  def('events', 'system-demo', ['art', 'pi-planning', 'iteration-review-retro', 'inspect-adapt']),
  def('events', 'inspect-adapt', ['rte', 'system-demo', 'business-owners', 'metrics']),
  def('events', 'art-sync', ['art', 'rte', 'po-sync']),
  def('events', 'po-sync', ['product-owner', 'product-management', 'art-sync']),

  def('artifacts', 'backlogs', ['product-owner', 'product-management', 'epic', 'feature', 'story']),
  def('artifacts', 'epic', ['epic-owners', 'lpm', 'capability', 'feature', 'backlogs']),
  def('artifacts', 'capability', ['epic', 'feature', 'solution-train']),
  def('artifacts', 'feature', ['product-management', 'epic', 'capability', 'story', 'pi-planning']),
  def('artifacts', 'story', ['feature', 'product-owner', 'team', 'iteration-planning']),
  def('artifacts', 'enabler', ['system-architect', 'feature', 'story']),
  def('artifacts', 'pi-objectives', ['pi-planning', 'business-owners', 'inspect-adapt']),

  def('measure', 'metrics', ['inspect-adapt', 'core-competencies', 'lpm']),
  def('start', 'getting-started', ['overview', 'configurations', 'roles-overview']),
  def('reference', 'glossary', ['overview']),
  def('reference', 'sources', ['glossary']),
];

export const findTopic = (route) => TOPICS.find((t) => t.route === route);
export const topicsBySection = (section) => TOPICS.filter((t) => t.section === section);
