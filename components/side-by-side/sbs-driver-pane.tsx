"use client";

/**
 * PROTOTYPE — side-by-side, driver pane (`/verida-ga-onboarding?embed=sbs`).
 *
 * Lives inside the harness page of the CS Tool prototype. Receives the shared state by
 * postMessage, renders the real onboarding wizard from it, and reports what the driver does.
 * Only the embedding parent frame may drive it (`event.source === window.parent`); replies go back
 * to the origin that sent the state. Nothing here leaves the browser.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { OnboardingWizard, type WizardState } from "@/components/verida-ga-onboarding/onboarding-wizard";
import { isSbsMessage, type SbsAction, type SbsState } from "@/lib/side-by-side/contract";
import { sbsCursor, sbsStages, sbsValues, sbsViews } from "@/lib/side-by-side/driver-view";
import type { Values } from "@/lib/verida-ga-onboarding/field-logic";

interface Draft {
  draftMarket: string | null;
  heardFrom: string | null;
  values: Values;
}

const EMPTY_DRAFT: Draft = { draftMarket: null, heardFrom: null, values: {} };

export function SbsDriverPane() {
  const [shared, setShared] = useState<SbsState | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const parentOrigin = useRef<string | null>(null);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.source !== window.parent || !isSbsMessage(e.data) || e.data.kind !== "sbs:state") return;
      parentOrigin.current = e.origin;
      setShared(e.data.state);
      // Whatever the driver was typing belongs to the state they were looking at.
      setDraft(EMPTY_DRAFT);
    };
    window.addEventListener("message", onMessage);
    if (window.parent !== window) window.parent.postMessage({ kind: "sbs:ready" }, "*");
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const send = useCallback((action: SbsAction) => {
    if (parentOrigin.current) window.parent.postMessage({ kind: "sbs:action", action }, parentOrigin.current);
  }, []);

  const stages = useMemo(() => (shared ? sbsStages(shared) : []), [shared]);
  const views = useMemo(() => (shared ? sbsViews(stages, shared) : []), [stages, shared]);

  if (!shared) {
    return (
      <div className="flex h-screen items-center justify-center p-6 text-center text-[14px] text-gray-500">
        Waiting for the side-by-side page to send the driver&apos;s state…
      </div>
    );
  }

  const cursor = sbsCursor(stages, shared.cursorStepId);
  const state: WizardState = {
    marketState: shared.marketState,
    draftMarket: draft.draftMarket ?? shared.marketState,
    heardFrom: draft.heardFrom,
    cursor,
    values: { ...sbsValues(shared), ...draft.values },
  };
  const currentId = shared.cursorStepId;
  const changeRequest = currentId ? (shared.steps[currentId]?.changeRequest ?? null) : null;

  return (
    <div className="h-screen w-full bg-white" data-testid="sbs-driver-pane">
      <OnboardingWizard
        state={state}
        onChange={(next) =>
          setDraft({ draftMarket: next.draftMarket, heardFrom: next.heardFrom, values: next.values })
        }
        sbs={{
          stages,
          views,
          changeRequest,
          onSubmit: (stepId, values, marketState) =>
            send({ type: "driver/submitStep", stepId, values, ...(marketState !== undefined ? { marketState } : {}) }),
          onOpen: (stepId) => send({ type: "driver/open", stepId }),
          lifecycle: shared.lifecycle,
          lifecycleReason: shared.lifecycleReason,
          driverFirstName: shared.driver.first,
        }}
      />
    </div>
  );
}
