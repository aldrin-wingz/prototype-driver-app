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
import { useEffect, useMemo, useRef, useState } from "react";

import { RichField } from "./rich-field";
import { FEE_WAIVER_MIN, feeWaiverShortfall, isBlankValue } from "@/lib/side-by-side/proposals";
import { continueLabel, isFieldVisible, type Values } from "@/lib/verida-ga-onboarding/field-logic";
import { AlertCircle, AlertTriangle, ArrowLeft, ArrowRight, Check, ChevronLeft, ChevronRight, CircleHelp, Clock, FileText, LayoutGrid, Lock, LogOut, Pause, X, XCircle } from "lucide-react";

import {
  type Cursor,
  type FieldDef,
  type MarketKey,
  type StageView,
  type StepStatus,
  type TemplateStage,
  MARKET_FIELD_SLUG,
  buildStageViews,
  countCompletedStages,
  driverFields,
  initialCursor,
  isManualStage,
  isStepDoneForProgress,
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
  /**
   * Every answer so far, keyed by field slug — one store for the whole application, as the backend
   * keeps it per driver. A certificate uploaded on Pre-Gentech Training Check is therefore already
   * there on Gentech Training (same slug). Nothing is submitted anywhere.
   */
  values: Values;
}

/**
 * PROTOTYPE — side-by-side mode. The harness decides the stage list and every status; the wizard
 * renders them and reports what the driver did. Absent = the standalone prototype, unchanged.
 */
export interface WizardSbs {
  stages: TemplateStage[];
  views: StageView[];
  changeRequest: { fields: string[]; reason: string } | null;
  onSubmit: (stepId: string, values: Values, marketState?: string | null) => void;
  onOpen: (stepId: string) => void;
  /** Application lifecycle: on hold and rejected replace the wizard (production LifecycleOnHoldView / LifecycleRejectionView). */
  lifecycle?: string;
  lifecycleReason?: string | null;
  driverFirstName?: string;
}

export function initialWizardState(): WizardState {
  return { marketState: null, draftMarket: null, heardFrom: null, cursor: initialCursor(stagesVisibleTo(null)), values: {} };
}

export function OnboardingWizard({
  state,
  onChange,
  sbs,
}: {
  state: WizardState;
  onChange: (next: WizardState) => void;
  sbs?: WizardSbs;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [state.cursor.stageIndex, state.cursor.stepIndex]);
  const market: MarketKey | null = marketKeyFor(state.marketState);
  const ownStages = useMemo(() => stagesVisibleTo(market), [market]);
  const ownViews = useMemo(() => buildStageViews(ownStages, state.cursor), [ownStages, state.cursor]);
  const stages = sbs ? sbs.stages : ownStages;
  const views = sbs ? sbs.views : ownViews;
  const progress = overallProgress(views);
  const current = views[state.cursor.stageIndex];
  const currentStep = current?.steps[state.cursor.stepIndex]?.step;
  const currentStatus: StepStatus | undefined = current?.steps[state.cursor.stepIndex]?.status;
  const waiting = Boolean(sbs) && (currentStatus === "pending_review" || currentStatus === "completed");
  const manualStage = current ? isManualStage(current.stage) : false;

  /*
   * Change requested: only the flagged fields can be edited (real: onboardingStepPresentation.ts, non-flagged
   * fields disabled), and a flagged field always shows even if an answer would hide it (P-FLAG-EMPTY: the
   * agent may flag an upload the driver's answer hid).
   */
  const flagged: Set<string> | null =
    sbs && currentStatus === "change_requested" ? new Set(sbs.changeRequest?.fields ?? []) : null;
  const shown = (f: FieldDef) => isFieldVisible(f, state.values) || Boolean(flagged?.has(f.slug));
  const [missing, setMissing] = useState<string[]>([]);
  const [stepError, setStepError] = useState<string | null>(null);
  useEffect(() => {
    setMissing([]);
    setStepError(null);
  }, [currentStep?.id, currentStatus]);

  /*
   * Side-by-side: a stage done in any order opens on its checklist hub (real: OnboardingParallelHub.tsx);
   * tapping an item opens it, and submitting it returns to the hub (production "Save & Return").
   */
  const [openItem, setOpenItem] = useState<string | null>(null);
  const hubLayout = Boolean(sbs) && current ? isChecklistHub(current.stage) : false;
  // real: onboardingNavigation.ts — an outstanding change request opens its step directly, not the hub.
  const showHub = hubLayout && currentStatus !== "change_requested" && openItem !== (currentStep ? String(currentStep.id) : null);
  const openStep = (stepId: string, inHub: boolean) => {
    setOpenItem(inHub ? stepId : null);
    sbs?.onOpen(stepId);
  };

  /**
   * real: onboardingNavigation.ts resolveAdvanceOnlyContinueNav — Continue on a step already submitted
   * is navigation only: an outstanding change request first, else the next step the driver can open.
   */
  const advanceOnlyTarget = (() => {
    if (!sbs || !currentStep) return null;
    const flat = views.flatMap((v) => v.steps.map((x) => ({ id: String(x.step.id), status: x.status, stage: v.stage })));
    const here = flat.findIndex((x) => x.id === String(currentStep.id));
    const cr = flat.find((x) => x.status === "change_requested" && x.id !== String(currentStep.id));
    if (cr) return cr;
    // A manual stage awaiting verification: production keeps the driver here (canAutoAdvancePastLinearStep).
    for (const x of flat.slice(here + 1)) {
      if (x.status === "locked") continue;
      if (x.stage !== current?.stage && manualStage && current?.status !== "completed") return null;
      return x;
    }
    return null;
  })();

  /*
   * real: onboardingStepPresentation.ts shouldHideSubmitButton / AwaitingReviewBanner (v6.0.538-production-ios):
   * a manual stage whose driver work is all in is "awaiting agent review" — banner on top, Continue hidden on
   * the checklist and on every step of the stage, only Back left in the footer.
   */
  const awaitingAgent = Boolean(sbs) && manualStage && current?.status === "pending_review";

  /** real: OnboardingWizardScreen.tsx canFooterBack + goBack — previous step, or the previous stage (its checklist). */
  const backTarget = (() => {
    if (!sbs || !current) return null;
    if (hubLayout && !showHub) return null; // a checklist item uses "Back to checklist" instead
    const open = (x: { step: { title: string }; status: StepStatus }) => x.status !== "locked" && !SIGN_UP_TITLES.has(x.step.title);
    if (!showHub) {
      for (let ti = state.cursor.stepIndex - 1; ti >= 0; ti--) {
        const x = current.steps[ti];
        if (x && open(x)) return { id: String(x.step.id), hub: false };
      }
    }
    for (let si = state.cursor.stageIndex - 1; si >= 0; si--) {
      const v = views[si];
      const reachable = v.steps.filter(open);
      if (!reachable.length) continue;
      const target = isChecklistHub(v.stage) ? reachable[0] : reachable[reachable.length - 1];
      return { id: String(target.step.id), hub: isChecklistHub(v.stage) };
    }
    return null;
  })();

  /** real: onboardingNavigation.ts shouldShowChecklistHubContinueButton — a change request first, else the next stage once settled. */
  const hubContinueTarget = (() => {
    if (!sbs || !showHub || !current) return null;
    const cr = current.steps.find((x) => x.status === "change_requested");
    if (cr) return { id: String(cr.step.id), item: true };
    if (manualStage && current.status !== "completed") return null;
    const settled = current.steps.every((x) => x.status === "completed" || x.status === "pending_review");
    if (current.status !== "completed" && !settled) return null;
    for (const v of views.slice(state.cursor.stageIndex + 1)) {
      const first = v.steps.find((x) => x.status !== "locked");
      if (first) return { id: String(first.step.id), item: false };
      if (v.status === "locked") return null;
    }
    return null;
  })();

  /** real: onboardingStepPresentation.ts resolveOnboardingContinueLabel. */
  const submitLabel = (isLast: boolean) =>
    currentStatus === "change_requested"
      ? RESUBMIT_CHANGES_LABEL
      : hubLayout
        ? SAVE_AND_RETURN_LABEL
        : continueLabel(isLast);

  const submitSbs = () => {
    if (!sbs || !currentStep) return;
    /*
     * Production holds a resubmit while a flagged field is empty (the flag stays open), and validates every
     * required field. Here that check covers the fields under review: a required field an answer reveals
     * (P-LEASE-ASK) and any required Proposed field (the questions themselves). Other required fields are
     * not checked so the review can click through; the scripted steps fill them.
     */
    const blocking = driverFields(currentStep).filter((f) => {
      if (!shown(f)) return false;
      if (flagged?.has(f.slug)) return isBlankValue(state.values[f.slug]);
      const rule = (f as FieldDef & { visibility_rule?: unknown }).visibility_rule;
      const proposed = Boolean((f.metadata as { proposed?: string } | null | undefined)?.proposed);
      return Boolean(f.required) && (rule != null || proposed) && isBlankValue(state.values[f.slug]);
    });
    if (blocking.length) {
      setMissing(blocking.map((f) => f.slug));
      return;
    }
    // P-FEE-WAIVER: at least 2 item photos on this step.
    const stepValues = Object.fromEntries(driverFields(currentStep).map((f) => [f.slug, state.values[f.slug]]));
    if (feeWaiverShortfall(stepValues) > 0) {
      setStepError(`Upload photos of at least ${FEE_WAIVER_MIN} safety equipment items to have the fee waived.`);
      return;
    }
    const gettingStarted = isGettingStarted(currentStep.field_definitions);
    const values: Values = {};
    for (const f of driverFields(currentStep)) if (state.values[f.slug] !== undefined) values[f.slug] = state.values[f.slug];
    if (gettingStarted) {
      values[MARKET_FIELD_SLUG] = state.draftMarket;
      if (state.heardFrom) values.how_did_you_hear_about_wingz = state.heardFrom;
    }
    sbs.onSubmit(String(currentStep.id), values, gettingStarted ? state.draftMarket : undefined);
    setOpenItem(null);
  };

  const advance = (patch: Partial<WizardState> = {}) => {
    const merged = { ...state, ...patch };
    // The list the driver continues into is the one for the market they just gave.
    const list = stagesVisibleTo(marketKeyFor(merged.marketState));
    const next = nextCursor(list, merged.cursor);
    onChange({ ...merged, cursor: next ?? merged.cursor });
  };

  /** One field: the two Getting Started selects, or the shared field renderer. The app shows no design labels. */
  const renderField = (f: FieldDef) => renderFieldBody(f);

  const renderFieldBody = (f: FieldDef) =>
    f.field_type === "voucher" ? (
      <VoucherField key={f.slug} field={f} value={state.values[f.slug]} />
    ) :
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
      <RichField
        key={f.slug}
        field={f}
        marketId={marketIdFor(state.marketState)}
        value={state.values[f.slug]}
        onChange={(slug, v) => onChange({ ...state, values: { ...state.values, [slug]: v } })}
        readOnly={waiting}
      />
    );

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
            {current?.stage.title} · {showHub ? "Checklist" : currentStep?.title}
          </div>
          <div className="text-[14px] font-semibold" style={{ color: GREEN }} data-testid="percent">
            {Math.round(progress * 100)}%
          </div>
        </div>
        <ProgressBar progress={progress} />
      </div>

      {sbs && (sbs.lifecycle === "on_hold" || sbs.lifecycle === "rejected") ? (
        <div className="flex-1 overflow-y-auto bg-[#FAFAFA] p-4">
          <LifecycleView kind={sbs.lifecycle} name={sbs.driverFirstName ?? "there"} reason={sbs.lifecycleReason ?? null} />
        </div>
      ) : null}
      {/* Step body — back to the top on every step, as a new screen would be. */}
      <div ref={bodyRef} className={`flex-1 overflow-y-auto bg-[#FAFAFA] p-4 ${sbs && (sbs.lifecycle === "on_hold" || sbs.lifecycle === "rejected") ? "hidden" : ""}`}>
        {showHub && current ? (
          <div className="rounded-xl border border-[#D9D9D9] bg-white px-5 pb-4 pt-5" data-testid="hub-card">
            {awaitingAgent ? (
              <AmberBanner
                icon="clock"
                title={isFinalReview(current.stage.title) ? FINAL_REVIEW_SUBMITTED_TITLE : AWAITING_REVIEW_TITLE}
                body={isFinalReview(current.stage.title) ? FINAL_REVIEW_SUBMITTED_BODY : AWAITING_REVIEW_BODY}
              />
            ) : null}
            <ParallelHub view={current} onOpenStep={(id) => openStep(id, true)} />
            <StepFooter
              onBack={backTarget ? () => openStep(backTarget.id, false) : undefined}
              continueLabel="Continue"
              onContinue={hubContinueTarget ? () => openStep(hubContinueTarget.id, hubContinueTarget.item) : undefined}
              testId="continue-advance-only"
            />
          </div>
        ) : currentStep ? (
          <div className="rounded-xl border border-[#D9D9D9] bg-white px-5 pb-4 pt-5">
            {/* real: OnboardingWizardScreen.tsx — AwaitingReviewBanner sits above the step title. */}
            {hubLayout ? (
              <button
                type="button"
                onClick={() => setOpenItem(null)}
                className="mb-3 flex items-center gap-1 text-[13px] font-medium"
                style={{ color: GREEN }}
                data-testid="back-to-checklist"
              >
                <ChevronLeft className="h-4 w-4" /> Back to checklist
              </button>
            ) : null}
            {/* real: AwaitingReviewBanner.tsx — manual (agent) stages only. */}
            {awaitingAgent ? (
              <AmberBanner
                icon="clock"
                title={isFinalReview(current?.stage.title) ? FINAL_REVIEW_SUBMITTED_TITLE : AWAITING_REVIEW_TITLE}
                body={isFinalReview(current?.stage.title) ? FINAL_REVIEW_SUBMITTED_BODY : AWAITING_REVIEW_BODY}
              />
            ) : null}
            <div className="text-[18px] font-semibold">{currentStep.title}</div>
            {currentStep.description ? (
              <p className="mt-1 text-[14px]" style={{ color: GRAY_3 }}>
                {currentStep.description}
              </p>
            ) : null}
            {sbs && currentStatus === "change_requested" ? (
              <div className="mt-4">
                <AmberBanner
                  icon="alert"
                  title={CHANGE_REQUESTED_TITLE}
                  body={
                    sbs.changeRequest?.reason?.trim() ||
                    (sbs.changeRequest?.fields.length ? CHANGE_REQUESTED_BODY_WITH_FLAGS : CHANGE_REQUESTED_BODY_GENERIC)
                  }
                />
              </div>
            ) : null}
            <div
              className={`mt-4 space-y-4 ${waiting ? "pointer-events-none opacity-70" : ""}`}
              aria-disabled={waiting || undefined}
              data-testid={waiting ? "step-read-only" : undefined}
            >
              {driverFields(currentStep).filter(shown).map((f) =>
                flagged?.has(f.slug) ? (
                  <ChangeRequestFieldFrame key={`cr-${f.slug}`} message={sbs?.changeRequest?.reason ?? ""}>
                    {renderField(f)}
                    {missing.includes(f.slug) ? <MissingNote field={f} /> : null}
                  </ChangeRequestFieldFrame>
                ) : flagged ? (
                  <div key={`ro-${f.slug}`} className="pointer-events-none opacity-60" aria-disabled data-testid="not-flagged-read-only">
                    {renderField(f)}
                  </div>
                ) : missing.includes(f.slug) ? (
                  <div key={`m-${f.slug}`}>
                    {renderField(f)}
                    <MissingNote field={f} />
                  </div>
                ) : (
                  renderField(f)
                ),
              )}
            </div>
            {stepError ? (
              <div className="mt-4 flex items-start gap-2 text-[13px] text-[#CF1322]" data-testid="step-error">
                <AlertCircle className="mt-0.5 h-[18px] w-[18px] shrink-0" /> {stepError}
              </div>
            ) : null}
            {sbs ? (
              <StepFooter
                onBack={backTarget ? () => openStep(backTarget.id, false) : undefined}
                continueLabel={waiting ? (hubLayout ? SAVE_AND_RETURN_LABEL : "Continue") : submitLabel(market !== null && nextCursor(stages, state.cursor) === null)}
                onContinue={
                  awaitingAgent
                    ? undefined
                    : waiting
                      ? hubLayout
                        ? () => setOpenItem(null)
                        : advanceOnlyTarget
                          ? () => openStep(advanceOnlyTarget.id, isChecklistHub(advanceOnlyTarget.stage) && advanceOnlyTarget.stage === current?.stage)
                          : undefined
                      : submitSbs
                }
                continueDisabled={!waiting && isGettingStarted(currentStep.field_definitions) && !state.draftMarket}
                testId={waiting ? "continue-advance-only" : "continue"}
              />
            ) : (
              <StepFooter
                continueLabel={continueLabel(market !== null && nextCursor(stages, state.cursor) === null)}
                onContinue={() => advance(isGettingStarted(currentStep.field_definitions) ? { marketState: state.draftMarket } : {})}
                continueDisabled={isGettingStarted(currentStep.field_definitions) && !state.draftMarket}
                testId="continue"
              />
            )}
          </div>
        ) : null}
      </div>

      {panelOpen ? (
        <StagePanel
          views={views}
          cursor={state.cursor}
          progress={progress}
          onClose={() => setPanelOpen(false)}
          onPickStep={
            sbs
              ? (stepId) => {
                  const inHub = views.some((v) => isChecklistHub(v.stage) && v.steps.some((x) => String(x.step.id) === stepId));
                  openStep(stepId, inHub);
                  setPanelOpen(false);
                }
              : undefined
          }
        />
      ) : null}
    </div>
  );
}

/*
 * Review states — ported from production (v6.0.538-production-ios):
 *   real: App/Data/onboarding/copy/onboardingBannerCopy.ts (copy)
 *   real: App/Components/Onboarding/Wizard/AwaitingReviewBanner.tsx, OnboardingAmberBanner.tsx (amber strip)
 *   real: App/Components/DynamicForm/ChangeRequestFieldFrame.tsx (flagged field frame)
 */
const CHANGE_REQUESTED_TITLE = "Changes Requested";
/* real: App/Data/onboarding/onboardingStepPresentation.ts */
const RESUBMIT_CHANGES_LABEL = "Resubmit Changes";
const SAVE_AND_RETURN_LABEL = "Save & Return";
/** Sign-up steps the app never sends the driver back to. */
const SIGN_UP_TITLES = new Set(["Phone Verification", "Email Verification"]);
const CHANGE_REQUESTED_BODY_WITH_FLAGS = "Please update the highlighted fields below and resubmit.";
const CHANGE_REQUESTED_BODY_GENERIC = "Please review this step and resubmit your changes.";
const AWAITING_REVIEW_TITLE = "Awaiting Review";
const AWAITING_REVIEW_BODY =
  "Your submission has been received and is currently being reviewed by a Wingz onboarding agent. You'll be notified once it has been reviewed.";
const FINAL_REVIEW_SUBMITTED_TITLE = "Application submitted";
const FINAL_REVIEW_SUBMITTED_BODY =
  "Thank you for completing your application. Our onboarding team is reviewing your submission and will notify you when a decision is ready.";

function isFinalReview(title: string | undefined) {
  return (title ?? "").trim().toLowerCase() === "final review";
}

function AmberBanner({ icon, title, body }: { icon: "clock" | "alert"; title: string; body: string }) {
  return (
    <div
      className="mb-4 flex items-start gap-3 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] p-4"
      data-testid={icon === "clock" ? "awaiting-review" : "changes-requested"}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FEF3C7]">
        {icon === "clock" ? <Clock className="h-5 w-5 text-[#D97706]" /> : <AlertTriangle className="h-5 w-5 text-[#D97706]" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 text-[13px] font-semibold leading-[22px] text-[#92400E]">{title}</div>
        <div className="text-[12px] leading-5 text-[#B45309]">{body}</div>
      </div>
    </div>
  );
}

/** The template's own requiredMessage when it has one (production validation copy), else a plain fallback. */
/**
 * real: App/Components/Onboarding/Wizard/OnboardingStepFooter.tsx — divider, then outlined "← Back" on the left and
 * the teal "Continue →" on the right (capture CAP-133). No Continue while a manual stage awaits review: Back only.
 */
function StepFooter({
  onBack,
  continueLabel: label,
  onContinue,
  continueDisabled = false,
  testId,
}: {
  onBack?: () => void;
  continueLabel: string;
  onContinue?: () => void;
  continueDisabled?: boolean;
  testId: string;
}) {
  if (!onBack && !onContinue) return null;
  return (
    <div className="mt-4 pb-3" data-testid="step-footer">
      <div className="mb-6 h-px" style={{ backgroundColor: GRAY_7 }} />
      <div className="flex items-stretch justify-between gap-3">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="flex min-h-[44px] min-w-[80px] items-center justify-center gap-1.5 rounded-lg border bg-white px-5 text-[14px] font-medium"
            style={{ borderColor: GRAY_7, color: BLACK_1 }}
            data-testid="footer-back"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        ) : (
          <span />
        )}
        {onContinue ? (
          <button
            type="button"
            onClick={onContinue}
            disabled={continueDisabled}
            className="flex min-h-[44px] min-w-[120px] items-center justify-center gap-2 rounded-lg px-5 text-[14px] font-semibold text-white disabled:opacity-40"
            style={{ backgroundColor: GREEN }}
            data-testid={testId}
          >
            {label} <ArrowRight className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function MissingNote({ field }: { field: FieldDef }) {
  const msg = (field as FieldDef & { validation_rules?: { requiredMessage?: string } | null }).validation_rules?.requiredMessage?.trim();
  return (
    <div className="mt-1.5 text-[12px] font-medium text-[#CF1322]" data-testid="field-missing">
      {msg || "This field is required."}
    </div>
  );
}

function ChangeRequestFieldFrame({ message, children }: { message: string; children: React.ReactNode }) {
  if (!message.trim()) return <>{children}</>;
  return (
    <div className="rounded-lg border border-[#FCD34D] bg-[#FFFBEB] p-3" data-testid="flagged-field">
      <div className="mb-2 flex items-center">
        <span className="mr-2 h-1.5 w-1.5 rounded-full bg-[#D97706]" />
        <span className="text-[12px] font-semibold text-[#D97706]">Changes requested</span>
      </div>
      <div className="mb-3 flex items-stretch">
        <span className="mr-2 w-0.5 rounded bg-[#FCD34D]" />
        <span className="flex-1 text-[12px] leading-[18px] text-[#D97706]">{message}</span>
      </div>
      {children}
    </div>
  );
}

/** real: App/Components/DynamicForm/DynamicVoucherField.tsx — "Not yet available", then View / Download. */
function VoucherField({ field, value }: { field: FieldDef; value: unknown }) {
  const url = typeof value === "string" && value.trim() ? value : null;
  return (
    <div>
      <div className="mb-1.5 text-[14px] font-semibold">{field.label}</div>
      <div className="rounded-lg border bg-white p-3" style={{ borderColor: GRAY_7 }} data-testid="voucher-field">
        {url ? (
          <>
            <p className="mb-3.5 text-[12px] leading-[18px]" style={{ color: GRAY_3 }}>
              Your voucher is ready to view or download.
            </p>
            <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 block w-full rounded-lg py-2.5 text-center text-[14px] font-semibold text-white" style={{ backgroundColor: GREEN }}>
              View voucher
            </a>
            <a href={url} download className="mt-2 block w-full rounded-lg border py-2.5 text-center text-[14px] font-semibold" style={{ borderColor: GREEN, color: GREEN }}>
              Download PDF
            </a>
          </>
        ) : (
          <div className="flex items-center gap-2.5 text-[14px]" style={{ color: GRAY_3 }}>
            <FileText className="h-[18px] w-[18px]" />
            {field.content?.trim() || "Not yet available"}
          </div>
        )}
      </div>
    </div>
  );
}

/** real: LifecycleOnHoldView.tsx / LifecycleRejectionView.tsx (v6.0.538-production-ios), copy verbatim. */
function LifecycleView({ kind, name, reason }: { kind: "on_hold" | "rejected"; name: string; reason: string | null }) {
  if (kind === "on_hold") {
    return (
      <div className="flex flex-col items-center px-2 pt-10 text-center" data-testid="lifecycle-on-hold">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#FEF3C7]">
          <Pause className="h-9 w-9 text-[#D97706]" />
        </div>
        <div className="mt-5 text-[20px] font-semibold">Application On Hold</div>
        <p className="mt-2 text-[14px] leading-5" style={{ color: GRAY_3 }}>
          {reason?.trim() ||
            `Hi ${name}, your application is currently on hold. Our support team will reach out with next steps when there is an update.`}
        </p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center px-2 pt-10 text-center" data-testid="lifecycle-rejected">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
        <XCircle className="h-9 w-9 text-[#CF1322]" />
      </div>
      <div className="mt-5 text-[20px] font-semibold">Application Not Approved</div>
      <p className="mt-2 text-[14px] leading-5" style={{ color: GRAY_3 }}>
        {`Hi ${name}, after reviewing your application, we're unable to move forward with your application at this time.`}
      </p>
      <div className="mt-5 w-full rounded-lg border border-[#E8E8E8] bg-white p-4 text-left">
        <div className="text-[12px]" style={{ color: GRAY_3 }}>Reviewed on Nov 20, 2026</div>
        <div className="mt-2 text-[14px] font-semibold">{reason?.trim() || "Reason for Decision"}</div>
        <p className="mt-1 text-[13px]" style={{ color: GRAY_3 }}>
          After reviewing your application, we&apos;re unable to move forward at this time.
        </p>
      </div>
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

function isChecklistHub(stage: TemplateStage) {
  return stage.layout === "accordion" || stage.layout === "parallel";
}

/* real: App/Data/onboarding/copy/onboardingBannerCopy.ts (v6.0.538-production-ios) */
const HUB_DEFAULT_SUBTITLE = "Complete all items below in any order.";
const CHANGE_REQUESTED_HUB_HINT = "Open this step to see feedback on each highlighted field.";
const MANUAL_AGENT_HUB_HINT = "You've submitted all items in this section. A Wingz agent will review them before you can continue.";

/**
 * real: App/Components/Onboarding/Wizard/OnboardingParallelHub.tsx (v6.0.538-production-ios) — title,
 * subtitle, driver note, hint, progress row, one row per item (done = submitted or verified).
 */
function ParallelHub({ view, onOpenStep }: { view: StageView; onOpenStep: (stepId: string) => void }) {
  const { stage, steps } = view;
  const total = steps.length;
  const completed = steps.filter((x) => isStepDoneForProgress(stage, x.status)).length;
  const progress = total === 0 ? 0 : completed / total;
  const driverNote = stage.layout === "accordion" ? stage.driver_note?.trim() || null : null;
  const hint = steps.some((x) => x.status === "change_requested")
    ? CHANGE_REQUESTED_HUB_HINT
    : isManualStage(stage) && view.status === "pending_review"
      ? MANUAL_AGENT_HUB_HINT
      : null;
  return (
    <div data-testid="parallel-hub">
      <div className="mb-2 text-[16px] font-medium">{stage.title}</div>
      <div className="mb-4 text-[14px] leading-5" style={{ color: GRAY_3 }}>
        {HUB_DEFAULT_SUBTITLE}
      </div>
      {[driverNote, hint].filter(Boolean).map((m) => (
        <div key={m} className="mb-4 rounded-lg bg-[#E6F7F5] px-3 py-2.5 text-[13px] leading-[18px] text-[#2B2B2B]" data-testid="hub-note">
          {m}
        </div>
      ))}
      <div className="mb-4 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-[#E8E8E8]">
          <div className="h-full rounded-[3px]" style={{ width: `${progress * 100}%`, backgroundColor: GREEN }} />
        </div>
        <div className="min-w-9 text-right text-[14px] font-semibold" style={{ color: GRAY_3 }}>
          {completed} / {total}
        </div>
      </div>
      <div className="space-y-2.5">
        {steps.map(({ step, status }) => {
          const locked = status === "locked";
          const done = status === "completed" || status === "pending_review";
          const description = step.description?.trim() || step.field_definitions.find((f) => f.help_text?.trim())?.help_text?.trim() || "";
          return (
            <button
              key={String(step.id)}
              type="button"
              disabled={locked}
              onClick={() => onOpenStep(String(step.id))}
              className="flex w-full items-center gap-3 rounded-[10px] border px-3.5 py-3.5 text-left"
              style={{
                borderColor: done ? "rgba(0, 236, 175, 0.2)" : GRAY_7,
                backgroundColor: done ? "#EEFBF5" : "#fff",
                opacity: locked ? 0.55 : 1,
              }}
              data-testid="hub-row"
              data-status={status}
            >
              {done ? (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: GREEN }}>
                  <Check className="h-3.5 w-3.5 text-white" />
                </span>
              ) : status === "change_requested" ? (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-[#D48806] bg-white">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#FFE7BA]" />
                </span>
              ) : (
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 bg-white" style={{ borderColor: GRAY_7 }}>
                  <span className="h-2.5 w-2.5 rounded-full border border-[#838383]" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium" style={{ color: done ? GREEN : BLACK_1 }}>
                  {step.title}
                </span>
                {description ? (
                  <span className="mt-1 line-clamp-2 block text-[13px] leading-[18px]" style={{ color: GRAY_3 }}>
                    {description}
                  </span>
                ) : null}
              </span>
              <ChevronRight className="h-5 w-5 shrink-0" style={{ color: done ? GREEN : GRAY_3 }} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** real: OnboardingStagePickerModal.tsx — full-width sheet, Progress header, stage rows. */
function StagePanel({
  views,
  cursor,
  progress,
  onClose,
  onPickStep,
}: {
  views: StageView[];
  cursor: Cursor;
  progress: number;
  onClose: () => void;
  /** Side-by-side only: open a step the driver can see. */
  onPickStep?: (stepId: string) => void;
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
                    const pickable = Boolean(onPickStep) && s.status !== "locked";
                    return (
                      <div
                        key={String(s.step.id)}
                        className={`mb-1 flex items-center gap-2.5 rounded-lg px-3 py-2 ${pickable ? "cursor-pointer hover:bg-[#F3F4F6]" : ""}`}
                        style={{ backgroundColor: stepActive ? STEP_ACTIVE : undefined }}
                        onClick={pickable ? () => onPickStep?.(String(s.step.id)) : undefined}
                        data-testid="stage-step-row"
                        data-status={s.status}
                      >
                        {s.status === "completed" ? (
                          <Check className="h-3 w-3" style={{ color: GREEN }} />
                        ) : s.status === "pending_review" ? (
                          <Clock className="h-3 w-3 text-amber-500" />
                        ) : s.status === "change_requested" ? (
                          <AlertCircle className="h-3 w-3 text-red-500" />
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
  if (status === "pending_review" || status === "change_requested") {
    const red = status === "change_requested";
    return (
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full border ${red ? "border-red-400" : "border-amber-400"}`}
        title={red ? "Changes requested" : "Pending review"}
      >
        {red ? <AlertCircle className="h-3.5 w-3.5 text-red-500" /> : <Clock className="h-3.5 w-3.5 text-amber-500" />}
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
