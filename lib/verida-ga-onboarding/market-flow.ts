/**
 * FEATURE — Verida GA onboarding (prototype/verida-ga-onboarding).
 *
 * The rule this prototype exists to show (PRD 2 "Show the market stage flow once the market is
 * known"): before the driver has given a market, the app lists Basic Information and Get the
 * Wingz Driver App only; once the market is given, the rest of THAT market's stages appear.
 *
 * Data: `payloads.json` is generated in wingz-driver-portal by
 * `scripts/export-market-payloads.ts` (one file shared with the portal preview and the CS Tool
 * prototype; sha256 in `payloads.json.sha256`). Never edit it by hand here.
 *
 * Status and progress logic is ported from the real app so the panel behaves like production:
 *   real: App/Data/onboarding/stageSidebarNav.ts @ cb752e402
 *   real: App/Containers/Onboarding/OnboardingWizardScreen.tsx:54 (computeOverallProgress) @ cb752e402
 */
import PAYLOADS from "./payloads.json";

export type MarketKey = "verida-ga" | "non-ga";

export type StepStatus = "locked" | "in_progress" | "completed";
export type StageStatus = "locked" | "in_progress" | "completed";

export interface FieldDef {
  slug: string;
  label: string;
  field_type: string;
  help_text?: string | null;
  content?: string | null;
  options?: unknown;
  required?: boolean;
  visibility?: string;
  video_url?: string | null;
  metadata?: Record<string, unknown> | null;
  items?: { text: string; image?: string; highlight?: string | boolean }[];
  list_type?: string | null;
  sign_url?: string | null;
  /** September Verida GA config puts some button links here (the portal adapter reads it too). */
  url?: string | null;
  scroll_required?: boolean | null;
}

export interface TemplateStep {
  id: number | string;
  title: string;
  description?: string | null;
  action_button_text?: string | null;
  field_definitions: FieldDef[];
}

export interface TemplateStage {
  id: number | string;
  title: string;
  description?: string | null;
  driver_note?: string | null;
  layout?: string | null;
  advancement?: string | null;
  steps: TemplateStep[];
}

interface MarketPayload {
  label: string;
  template: { id: number; version: string; stages: TemplateStage[] };
}

const DATA = PAYLOADS as unknown as {
  baseline: { environment: string; captured: string; templateId: number; version: string };
  preMarketStageTitles: string[];
  markets: Record<MarketKey, MarketPayload>;
};

export const BASELINE = DATA.baseline;
export const PRE_MARKET_STAGE_TITLES = DATA.preMarketStageTitles;
export const MARKET_LABEL: Record<MarketKey, string> = {
  "verida-ga": DATA.markets["verida-ga"].label,
  "non-ga": DATA.markets["non-ga"].label,
};

/** The Getting Started answer that decides the flow. The backend keys it to `Driver.id_market`. */
export const MARKET_FIELD_SLUG = "market_state";

/** Georgia is the only market with its own flow in this release; every other answer gets the shared flow. */
export function marketKeyFor(marketState: string | null | undefined): MarketKey | null {
  if (!marketState) return null;
  return marketState.trim().toLowerCase() === "georgia" ? "verida-ga" : "non-ga";
}

export function templateFor(market: MarketKey): TemplateStage[] {
  return DATA.markets[market].template.stages;
}

/**
 * ⭐ The rule. No market ⇒ the two pre-market stages only. A market ⇒ that market's full list.
 * The pre-market stages are taken from the shared flow; the export refuses to write a file in
 * which the two markets disagree about them.
 */
export function stagesVisibleTo(market: MarketKey | null): TemplateStage[] {
  if (!market) {
    return templateFor("non-ga").filter((s) => PRE_MARKET_STAGE_TITLES.includes(s.title));
  }
  return templateFor(market);
}

/** The market answer options, read from the template so the list is production's, not ours. */
export function marketOptions(): string[] {
  const field = templateFor("non-ga")
    .flatMap((s) => s.steps)
    .flatMap((st) => st.field_definitions)
    .find((f) => f.slug === MARKET_FIELD_SLUG);
  const raw = Array.isArray(field?.options) ? (field!.options as unknown[]) : [];
  return raw.map((o) => (typeof o === "string" ? o : String((o as { label?: string }).label ?? "")));
}

/* ------------------------------------------------------------------------------------------ *
 * Progress — a demo cursor over the visible list. Everything before the cursor is completed,
 * the cursor's step is in progress, everything after is locked. Phone and Email Verification
 * are completed at sign-up, exactly as the production capture shows (CAP-134).
 * ------------------------------------------------------------------------------------------ */

export interface Cursor {
  stageIndex: number;
  stepIndex: number;
}

export interface StageView {
  stage: TemplateStage;
  status: StageStatus;
  steps: { step: TemplateStep; status: StepStatus }[];
}

const SIGN_UP_STEPS = new Set(["Phone Verification", "Email Verification"]);

export function buildStageViews(stages: TemplateStage[], cursor: Cursor): StageView[] {
  return stages.map((stage, si) => {
    const steps = stage.steps.map((step, ti) => {
      let status: StepStatus;
      if (si < cursor.stageIndex) status = "completed";
      else if (si > cursor.stageIndex) status = "locked";
      else if (ti === cursor.stepIndex) status = "in_progress";
      else if (si === 0 && SIGN_UP_STEPS.has(step.title)) status = "completed";
      else status = ti < cursor.stepIndex ? "completed" : "locked";
      return { step, status };
    });
    const status: StageStatus =
      si < cursor.stageIndex ? "completed" : si === cursor.stageIndex ? "in_progress" : "locked";
    return { stage, status, steps };
  });
}

/** real: OnboardingWizardScreen.tsx:54 — completed steps over ALL listed steps. */
export function overallProgress(views: StageView[]): number {
  let total = 0;
  let done = 0;
  for (const v of views) {
    for (const s of v.steps) {
      total += 1;
      if (s.status === "completed") done += 1;
    }
  }
  return total === 0 ? 0 : done / total;
}

/** real: stageSidebarNav.ts countCompletedStages */
export function countCompletedStages(views: StageView[]): { done: number; total: number } {
  return {
    done: views.filter((v) => v.steps.length > 0 && v.steps.every((s) => s.status === "completed")).length,
    total: views.length,
  };
}

/** The first step the driver lands on: Getting Started, the only Basic Information step with input. */
export function initialCursor(stages: TemplateStage[]): Cursor {
  const stepIndex = Math.max(
    0,
    stages[0]?.steps.findIndex((s) => s.field_definitions.some((f) => f.slug === MARKET_FIELD_SLUG)) ?? 0,
  );
  return { stageIndex: 0, stepIndex };
}

/** Next step in the visible list; null at the end. */
export function nextCursor(stages: TemplateStage[], c: Cursor): Cursor | null {
  const stage = stages[c.stageIndex];
  if (!stage) return null;
  // Basic Information: skip the sign-up steps the driver already finished.
  for (let t = c.stepIndex + 1; t < stage.steps.length; t++) {
    if (!(c.stageIndex === 0 && SIGN_UP_STEPS.has(stage.steps[t].title))) return { stageIndex: c.stageIndex, stepIndex: t };
  }
  return c.stageIndex + 1 < stages.length ? { stageIndex: c.stageIndex + 1, stepIndex: 0 } : null;
}

/** Driver-facing fields only — the app never renders `visibility: "internal"`. */
export function driverFields(step: TemplateStep): FieldDef[] {
  return step.field_definitions.filter((f) => f.visibility !== "internal");
}


/**
 * Production market ids (CS Tool lib/nemt-market-client-mappings.ts NEMT_MARKETS). The template
 * keys per-market links by these ids.
 */
const MARKET_ID_BY_STATE: Record<string, number> = {
  Arkansas: 23,
  Florida: 24,
  Georgia: 20,
  Indiana: 26,
  Louisiana: 28,
  Ohio: 25,
  Oklahoma: 29,
  Tennessee: 21,
  Virginia: 22,
  "West Virginia": 27,
};

export function marketIdFor(marketState: string | null): number | null {
  return marketState ? (MARKET_ID_BY_STATE[marketState] ?? null) : null;
}

/**
 * The link a button or video field opens for this driver. The inspection booking button carries
 * `metadata.video_urls_by_market`, which the backend resolves per driver before serving the
 * template (real: driver_onboarding/utils.py:1717-1728 @ backend f96b510dc); a market with no
 * entry gets the field's own `video_url`.
 */
export function resolveFieldLink(field: FieldDef, marketId: number | null): string | null {
  const byMarket = (field.metadata as { video_urls_by_market?: Record<string, string> } | null | undefined)
    ?.video_urls_by_market;
  const perMarket = marketId != null ? byMarket?.[String(marketId)] : undefined;
  const link = perMarket ?? field.video_url ?? field.url ?? field.sign_url ?? null;
  // External links, or a file this prototype serves itself (the trade dress, the signage PDF).
  return link && (/^https?:\/\//.test(link) || link.startsWith("/dev/")) ? link : null;
}
