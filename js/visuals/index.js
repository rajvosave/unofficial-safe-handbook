// Registry of topic-page visuals, keyed by topic id.
// Each entry is mount(container, t, navigate): it must be idempotent
// (replace the container's children on every call) because the page is
// re-rendered on language switch. Register more visuals here by topic id.
import { mountPiPlanning } from './pi-planning.js';
import { mountInspectAdapt } from './inspect-adapt.js';
import { mountArtifacts } from './artifacts.js';
import { mountRoles } from './roles.js';
import { mountPiObjectives } from './pi-objectives.js';
import { mountMetrics } from './metrics.js';

export const VISUALS = Object.freeze({
  'pi-planning': mountPiPlanning,
  'inspect-adapt': mountInspectAdapt,
  backlogs: mountArtifacts,
  'roles-overview': mountRoles,
  'pi-objectives': mountPiObjectives,
  metrics: mountMetrics,
});

export const hasVisual = (id) => Object.hasOwn(VISUALS, id);
