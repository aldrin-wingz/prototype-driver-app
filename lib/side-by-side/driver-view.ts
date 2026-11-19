/**
 * PROTOTYPE — side-by-side, driver pane: the shared state (computed by the harness in the CS Tool
 * repo) turned into what the wizard renders. No gate is decided here; statuses arrive ready.
 */
import type { SbsState, SbsStepStatus } from "./contract";
import { templateFor, type StageView, type TemplateStage, type TemplateStep } from "@/lib/verida-ga-onboarding/market-flow";

const STEP_INDEX: Map<string, TemplateStep> = (() => {
  const m = new Map<string, TemplateStep>();
  for (const key of ["non-ga", "verida-ga"] as const) for (const s of templateFor(key)) for (const st of s.steps) m.set(String(st.id), st);
  return m;
})();

/** The stage list the engine chose, with the template's own step definitions. */
export function sbsStages(state: SbsState): TemplateStage[] {
  return state.stages.map((s) => ({
    id: s.id,
    title: s.title,
    layout: s.layout,
    advancement: s.advancement,
    steps: s.stepIds.map((id) => STEP_INDEX.get(id)).filter((x): x is TemplateStep => Boolean(x)),
  }));
}

function rollUp(sts: SbsStepStatus[]): SbsStepStatus {
  if (sts.every((s) => s === "locked")) return "locked";
  if (sts.includes("change_requested")) return "change_requested";
  if (sts.every((s) => s === "completed")) return "completed";
  if (sts.includes("in_progress") || sts.includes("locked")) return "in_progress";
  return "pending_review";
}

export function sbsViews(stages: TemplateStage[], state: SbsState): StageView[] {
  return stages.map((stage) => {
    const steps = stage.steps.map((step) => ({ step, status: state.status[String(step.id)] ?? "locked" }));
    return { stage, status: rollUp(steps.map((x) => x.status)), steps };
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
