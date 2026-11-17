"use client";

/**
 * FEATURE — Verida GA onboarding. Prototype route: /verida-ga-onboarding
 *
 * Left: the in-app onboarding wizard at phone width. Right: prototype controls that are NOT part
 * of the app — they set the driver's market answer directly so the stage list can be compared.
 */
import { useMemo, useState } from "react";

import { OnboardingWizard, initialWizardState, type WizardState } from "@/components/verida-ga-onboarding/onboarding-wizard";
import {
  BASELINE,
  MARKET_LABEL,
  PRE_MARKET_STAGE_TITLES,
  initialCursor,
  marketKeyFor,
  stagesVisibleTo,
} from "@/lib/verida-ga-onboarding/market-flow";

const PRESETS: { label: string; marketState: string | null }[] = [
  { label: "No market yet", marketState: null },
  { label: "Georgia", marketState: "Georgia" },
  { label: "Florida", marketState: "Florida" },
];

export default function VeridaGaOnboardingPage() {
  const [state, setState] = useState<WizardState>(initialWizardState);
  const market = marketKeyFor(state.marketState);
  const stages = useMemo(() => stagesVisibleTo(market), [market]);

  const jumpTo = (marketState: string | null) => {
    const list = stagesVisibleTo(marketKeyFor(marketState));
    // Giving a market finishes Getting Started; land on the stage after the app download.
    const cursor = marketState ? { stageIndex: Math.min(2, list.length - 1), stepIndex: 0 } : initialCursor(list);
    setState({ marketState, draftMarket: marketState, heardFrom: marketState ? "Indeed" : null, cursor });
  };

  return (
    <div className="min-h-screen bg-[#F3F4F6] px-4 py-6 font-wingz">
      <div className="mx-auto flex max-w-5xl flex-col items-start gap-6 md:flex-row">
        <div className="mx-auto h-[760px] w-full max-w-[375px] shrink-0 overflow-hidden rounded-[28px] border-[6px] border-black bg-white shadow-xl md:mx-0">
          <OnboardingWizard state={state} onChange={setState} />
        </div>

        <aside className="w-full space-y-4 rounded-xl bg-white p-4 text-[14px] shadow-sm md:max-w-md" data-testid="controls">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-wide text-gray-500">Prototype controls</div>
            <h1 className="mt-1 text-[18px] font-semibold">Verida GA — stages appear once the market is known</h1>
            <p className="mt-1 text-gray-600">
              Before the driver gives a market, the app lists only the stages every market shares. Giving the market
              in <em>Basic Information › Getting Started</em> reveals that market&apos;s full flow in the same session.
            </p>
          </div>

          <div>
            <div className="mb-1.5 font-medium">Driver&apos;s market answer</div>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p) => {
                const on = (state.marketState ?? null) === p.marketState;
                return (
                  <button
                    key={p.label}
                    type="button"
                    data-testid={`preset-${p.label}`}
                    onClick={() => jumpTo(p.marketState)}
                    className={`rounded-full border px-3 py-1.5 ${on ? "border-[#16CFA9] bg-[#E8FAF4] font-semibold" : "border-gray-300"}`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <dl className="grid grid-cols-[auto,1fr] gap-x-3 gap-y-1" data-testid="readout">
            <dt className="text-gray-500">Flow</dt>
            <dd>{market ? MARKET_LABEL[market] : "None yet — pre-market stages only"}</dd>
            <dt className="text-gray-500">Stages listed</dt>
            <dd data-testid="readout-stage-count">{stages.length}</dd>
            <dt className="text-gray-500">Pre-market</dt>
            <dd>{PRE_MARKET_STAGE_TITLES.join(" · ")}</dd>
          </dl>

          <ol className="list-decimal space-y-0.5 pl-5 text-[13px] text-gray-700" data-testid="readout-stages">
            {stages.map((s) => (
              <li key={String(s.id)}>{s.title}</li>
            ))}
          </ol>

          <div className="rounded-lg bg-amber-50 p-3 text-[12px] text-amber-900">
            ⚠️ Progress % is completed steps over the steps <em>listed</em> (production&apos;s formula). It drops when
            a market reveals more stages — the PRD has to say whether that is acceptable.
          </div>

          <p className="text-[12px] text-gray-500">
            Template: {BASELINE.environment} #{BASELINE.templateId} v{BASELINE.version}, captured {BASELINE.captured}.
            Shared stages realign when the production template is exported. Wizard rebuilt from the native app at
            develop cb752e402 and production captures 11-01 / 11-03.
          </p>
        </aside>
      </div>
    </div>
  );
}
