"use client";

/**
 * FEATURE — Verida GA onboarding (prototype/verida-ga-onboarding).
 *
 * A web rebuild of the production NATIVE onboarding wizard, so the market rule can be shown on
 * the surface drivers actually use. In-app onboarding is not the portal in a WebView — it is
 * React Native, calling /driver-onboarding/form-progress directly.
 *
 * Visual source, highest first:
 *   capture CAP-132 "11-01 - B2 Application - Getting Started Top" (header, nav row, step card)
 *   capture CAP-134 "11-03 - B2 Application - Progress Stages Top" (Progress panel)
 *   real: App/Components/Onboarding/Wizard/OnboardingWizardHeader.tsx @ cb752e402
 *   real: App/Components/Onboarding/Wizard/OnboardingStagePickerModal.tsx @ cb752e402
 *   real: App/Components/Onboarding/Wizard/OnboardingProgressBar.tsx @ cb752e402
 *   real: App/Themes/Colors.ts @ cb752e402 (green._1 #16CFA9, gray._3 #9B9B9B, gray._7 #D9D9D9)
 *
 * ⚠️ Built from code, never captured: the fields of every stage after Basic Information are
 * rendered by a simplified field renderer here, not a port of App/Components/DynamicForm.
 */
import { useMemo, useState } from "react";

import { RichField } from "./rich-field";
import { Check, CircleHelp, LayoutGrid, Lock, LogOut, X } from "lucide-react";

import {
  type Cursor,
  type FieldDef,
  type MarketKey,
  type StageView,
  MARKET_FIELD_SLUG,
  buildStageViews,
  countCompletedStages,
  driverFields,
  initialCursor,
  marketIdFor,
  marketKeyFor,
  marketOptions,
  nextCursor,
  overallProgress,
  stagesVisibleTo,
} from "@/lib/verida-ga-onboarding/market-flow";

const GREEN = "#16CFA9";
const GRAY_3 = "#9B9B9B";
const GRAY_7 = "#D9D9D9";
const BLACK_1 = "#111111";
const COORDINATOR_TINT = "#F6FFF8";
const STEP_ACTIVE = "#E8FAF4";

export interface WizardState {
  /** The SUBMITTED market answer — what the backend has stored. Drives the stage list. */
  marketState: string | null;
  /** What the dropdown shows before Continue. Choosing is not giving: nothing is revealed until submit. */
  draftMarket: string | null;
  heardFrom: string | null;
  cursor: Cursor;
}

export function initialWizardState(): WizardState {
  return { marketState: null, draftMarket: null, heardFrom: null, cursor: initialCursor(stagesVisibleTo(null)) };
}

export function OnboardingWizard({
  state,
  onChange,
}: {
  state: WizardState;
  onChange: (next: WizardState) => void;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const market: MarketKey | null = marketKeyFor(state.marketState);
  const stages = useMemo(() => stagesVisibleTo(market), [market]);
  const views = useMemo(() => buildStageViews(stages, state.cursor), [stages, state.cursor]);
  const progress = overallProgress(views);
  const current = views[state.cursor.stageIndex];
  const currentStep = current?.steps[state.cursor.stepIndex]?.step;

  const advance = (patch: Partial<WizardState> = {}) => {
    const merged = { ...state, ...patch };
    // The list the driver continues into is the one for the market they just gave.
    const list = stagesVisibleTo(marketKeyFor(merged.marketState));
    const next = nextCursor(list, merged.cursor);
    onChange({ ...merged, cursor: next ?? merged.cursor });
  };

  return (
    <div className="relative flex h-full flex-col bg-white font-wingz" style={{ color: BLACK_1 }}>
      {/* Header — real: OnboardingWizardHeader.tsx */}
      <div className="border-b border-[#EEE] px-4 pb-3 pt-5">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/WINGZLOGO2.png" alt="Wingz" className="h-10 w-10 rounded-lg bg-black object-contain p-1" />
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-medium uppercase tracking-wide" style={{ color: GRAY_3 }}>
              Driver onboarding
            </div>
            <div className="text-[20px] font-semibold leading-tight">Your application</div>
          </div>
          <CircleHelp className="h-6 w-6" style={{ color: GREEN }} />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPanelOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border bg-white px-2.5 py-1.5 text-[14px] font-medium"
            style={{ borderColor: GRAY_7 }}
            aria-label="Open stages"
            data-testid="open-stages"
          >
            <LayoutGrid className="h-4 w-4" /> Stages
          </button>
          <div className="min-w-0 flex-1 truncate text-[13px] font-medium" data-testid="breadcrumb">
            {current?.stage.title} · {currentStep?.title}
          </div>
          <div className="text-[14px] font-semibold" style={{ color: GREEN }} data-testid="percent">
            {Math.round(progress * 100)}%
          </div>
        </div>
        <ProgressBar progress={progress} />
      </div>

      {/* Step body */}
      <div className="flex-1 overflow-y-auto bg-[#FAFAFA] p-4">
        {currentStep ? (
          <div className="rounded-xl border border-[#E8E8E8] bg-white p-4">
            <div className="text-[18px] font-semibold">{currentStep.title}</div>
            {currentStep.description ? (
              <p className="mt-1 text-[14px]" style={{ color: GRAY_3 }}>
                {currentStep.description}
              </p>
            ) : null}
            <div className="mt-4 space-y-4">
              {driverFields(currentStep).map((f) =>
                f.slug === MARKET_FIELD_SLUG ? (
                  <SelectField
                    key={f.slug}
                    field={f}
                    options={marketOptions()}
                    value={state.draftMarket}
                    testId="market-select"
                    onChange={(v) => onChange({ ...state, draftMarket: v })}
                  />
                ) : f.slug === "how_did_you_hear_about_wingz" ? (
                  <SelectField
                    key={f.slug}
                    field={f}
                    options={optionLabels(f)}
                    value={state.heardFrom}
                    onChange={(v) => onChange({ ...state, heardFrom: v })}
                  />
                ) : (
                  <RichField key={f.slug} field={f} marketId={marketIdFor(state.marketState)} />
                ),
              )}
            </div>
            <button
              type="button"
              data-testid="continue"
              disabled={isGettingStarted(currentStep.field_definitions) && !state.draftMarket}
              onClick={() =>
                advance(isGettingStarted(currentStep.field_definitions) ? { marketState: state.draftMarket } : {})
              }
              className="mt-6 w-full rounded-lg py-3 text-[15px] font-semibold text-white disabled:opacity-40"
              style={{ backgroundColor: GREEN }}
            >
              {currentStep.action_button_text || "Continue"}
            </button>
          </div>
        ) : null}
      </div>

      {panelOpen ? (
        <StagePanel
          views={views}
          cursor={state.cursor}
          progress={progress}
          onClose={() => setPanelOpen(false)}
        />
      ) : null}
    </div>
  );
}

function isGettingStarted(fields: FieldDef[]) {
  return fields.some((f) => f.slug === MARKET_FIELD_SLUG);
}

function optionLabels(f: FieldDef): string[] {
  const raw = Array.isArray(f.options) ? (f.options as unknown[]) : [];
  return raw.map((o) => (typeof o === "string" ? o : String((o as { label?: string }).label ?? "")));
}

/** real: OnboardingProgressBar.tsx — 5px track #E8E8E8, green fill. */
function ProgressBar({ progress }: { progress: number }) {
  const pct = Math.min(1, Math.max(0, progress));
  return (
    <div className="mt-3 h-[5px] overflow-hidden rounded-sm bg-[#E8E8E8]">
      <div className="h-full transition-all" style={{ width: `${pct * 100}%`, backgroundColor: GREEN }} />
    </div>
  );
}

function SelectField({
  field,
  options,
  value,
  onChange,
  testId,
}: {
  field: FieldDef;
  options: string[];
  value: string | null;
  onChange: (v: string) => void;
  testId?: string;
}) {
  return (
    <label className="block">
      <span className="text-[14px] font-medium">
        {field.label}
        {field.required ? <span className="text-red-500"> *</span> : null}
      </span>
      <select
        data-testid={testId}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded-lg border bg-white px-3 py-3 text-[15px]"
        style={{ borderColor: GRAY_7 }}
      >
        <option value="" disabled>
          {field.slug === MARKET_FIELD_SLUG ? "Select state" : "Select an option"}
        </option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {field.help_text ? (
        <span className="mt-1 block text-[13px]" style={{ color: GRAY_3 }}>
          {field.help_text}
        </span>
      ) : null}
    </label>
  );
}

/** real: OnboardingStagePickerModal.tsx — full-width sheet, Progress header, stage rows. */
function StagePanel({
  views,
  cursor,
  progress,
  onClose,
}: {
  views: StageView[];
  cursor: Cursor;
  progress: number;
  onClose: () => void;
}) {
  const { done, total } = countCompletedStages(views);
  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-white" data-testid="stage-panel">
      <div className="border-b border-[#EEE] px-4 pb-3 pt-5">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[16px] font-semibold">Progress</div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mb-2.5 flex items-center justify-between">
          <div className="text-[13px]" style={{ color: GRAY_3 }} data-testid="stage-count">
            {done} of {total} stages completed
          </div>
          <div className="text-[14px] font-semibold" style={{ color: GREEN }}>
            {Math.round(progress * 100)}%
          </div>
        </div>
        <ProgressBar progress={progress} />
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {views.map((v, si) => {
          const active = si === cursor.stageIndex;
          const locked = v.status === "locked";
          const parallel = v.stage.layout === "parallel" || v.stage.layout === "accordion";
          const completedSteps = v.steps.filter((s) => s.status === "completed").length;
          const showSteps = active || v.status === "completed";
          return (
            <div
              key={String(v.stage.id)}
              className="border-b border-[#E8E8E8] px-1"
              style={{ opacity: locked ? 0.55 : 1 }}
              data-testid="stage-row"
            >
              <div className="my-2 rounded-[10px]" style={{ backgroundColor: active ? COORDINATOR_TINT : undefined }}>
                <div className="flex items-center gap-2.5 p-3.5">
                  <StageIcon index={si} status={v.status} active={active} />
                  <div className="flex-1">
                    <div className="text-[14px] font-medium" style={{ color: locked ? GRAY_3 : BLACK_1 }}>
                      {v.stage.title}
                    </div>
                    {parallel ? (
                      <div className="mt-1 text-[12px]" style={{ color: GRAY_3 }}>
                        {completedSteps} / {v.steps.length} completed
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
              {showSteps ? (
                <div className="mb-3 ml-6 border-l border-[#E8E8E8] pl-6 pr-2.5">
                  {v.steps.map((s, ti) => {
                    const stepActive = active && ti === cursor.stepIndex;
                    return (
                      <div
                        key={String(s.step.id)}
                        className="mb-1 flex items-center gap-2.5 rounded-lg px-3 py-2"
                        style={{ backgroundColor: stepActive ? STEP_ACTIVE : undefined }}
                      >
                        {s.status === "completed" ? (
                          <Check className="h-3 w-3" style={{ color: GREEN }} />
                        ) : (
                          <span
                            className="h-2 w-2 rounded-full border-2"
                            style={{
                              borderColor: stepActive ? GREEN : GRAY_7,
                              backgroundColor: stepActive ? GREEN : "#fff",
                            }}
                          />
                        )}
                        <span
                          className="text-[14px]"
                          style={{
                            color: stepActive ? GREEN : s.status === "completed" ? GRAY_3 : BLACK_1,
                            fontWeight: stepActive ? 600 : 400,
                          }}
                        >
                          {s.step.title}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
        <div className="-mx-4 mt-7 border-t border-[#EEE] bg-[#FAFAFA] px-4 py-5">
          <div className="flex items-center justify-center gap-2 text-[15px]" style={{ color: GRAY_3 }}>
            <LogOut className="h-[18px] w-[18px]" /> Save &amp; Exit
          </div>
        </div>
      </div>
    </div>
  );
}

/** real: StageNavIcon — check / lock / numbered ring. */
function StageIcon({ index, status, active }: { index: number; status: string; active: boolean }) {
  if (status === "completed") {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full" style={{ backgroundColor: GREEN }}>
        <Check className="h-3.5 w-3.5 text-white" />
      </span>
    );
  }
  if (status === "locked") {
    return (
      <span className="flex h-6 w-6 items-center justify-center rounded-full border" style={{ borderColor: GRAY_3 }}>
        <Lock className="h-3 w-3" style={{ color: GRAY_3 }} />
      </span>
    );
  }
  return (
    <span
      className="flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-semibold"
      style={{ border: `${active ? 2 : 1}px solid ${active ? GREEN : GRAY_7}`, color: active ? GREEN : BLACK_1 }}
    >
      {index + 1}
    </span>
  );
}
