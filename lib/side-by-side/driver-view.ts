/**
 * PROTOTYPE — side-by-side, driver pane: the shared state (computed by the harness in the CS Tool
 * repo) turned into what the wizard renders. No gate is decided here; statuses arrive ready.
 */
import type { SbsState, SbsStepStatus } from "./contract";
import { proposeStep, type ProposalStep } from "./proposals";
import { isManualStage, templateFor, type StageView, type TemplateStage, type TemplateStep } from "@/lib/verida-ga-onboarding/market-flow";

const STEP_INDEX: Map<string, TemplateStep> = (() => {
  const m = new Map<string, TemplateStep>();
  for (const key of ["non-ga", "verida-ga"] as const) for (const s of templateFor(key)) for (const st of s.steps) m.set(String(st.id), st);
  return m;
})();

/** The template's own stage fields (driver note, description) by stage id. */
const STAGE_INDEX: Map<string, TemplateStage> = (() => {
  const m = new Map<string, TemplateStage>();
  for (const key of ["non-ga", "verida-ga"] as const) for (const s of templateFor(key)) m.set(String(s.id), s);
  return m;
})();

/** The stage list the engine chose, with the template's own step definitions. */
export function sbsStages(state: SbsState): TemplateStage[] {
  return state.stages.map((s) => ({
    id: s.id,
    title: s.title,
    description: STAGE_INDEX.get(String(s.id))?.description ?? null,
    driver_note: STAGE_INDEX.get(String(s.id))?.driver_note ?? null,
    layout: s.layout,
    advancement: s.advancement,
    proposed: s.proposed,
    steps: s.stepIds
      .map((id) => STEP_INDEX.get(id))
      .filter((x): x is TemplateStep => Boolean(x))
      .map((st) => (state.proposalsOn ? (proposeStep(st as unknown as ProposalStep) as unknown as TemplateStep) : st)),
  }));
}

/**
 * real: stageAdvancementHydration.ts hydrateStageStatusFromSteps + onboardingNavigation.ts
 * markAutoStageCompletedInConfig (v6.0.538-production-ios):
 *   - a change request anywhere in the stage makes it active again;
 *   - every step verified → completed;
 *   - every step submitted: a manual stage waits (pending_review), any other stage is done for the
 *     driver (completed) even while agents still verify it.
 */
function rollUp(stage: TemplateStage, sts: SbsStepStatus[]): SbsStepStatus {
  if (sts.every((s) => s === "locked")) return "locked";
  if (sts.includes("change_requested")) return "in_progress";
  if (sts.every((s) => s === "completed")) return "completed";
  if (sts.every((s) => s === "completed" || s === "pending_review")) return isManualStage(stage) ? "pending_review" : "completed";
  return "in_progress";
}

export function sbsViews(stages: TemplateStage[], state: SbsState): StageView[] {
  return stages.map((stage) => {
    const steps = stage.steps.map((step) => ({ step, status: state.status[String(step.id)] ?? "locked" }));
    return { stage, status: rollUp(stage, steps.map((x) => x.status)), steps };
  });
}

export function sbsCursor(stages: TemplateStage[], stepId: string | null): { stageIndex: number; stepIndex: number } {
  for (const [si, s] of stages.entries()) {
    const ti = s.steps.findIndex((st) => String(st.id) === stepId);
    if (ti >= 0) return { stageIndex: si, stepIndex: ti };
  }
  return { stageIndex: 0, stepIndex: 0 };
}

/** Every answer so far, by slug — the shape the wizard's field renderer reads. */
export function sbsValues(state: SbsState): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const s of Object.values(state.steps)) for (const [slug, v] of Object.entries(s.values)) out[slug] = v.value;
  return out;
}
