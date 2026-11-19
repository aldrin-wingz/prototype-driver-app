"use client";

/**
 * FEATURE — In-App Compliance for Verida Fully Credentialled. Prototype route: /verida-ga-compliance
 *
 * Left: the driver app at phone width, In-App Compliance screens ported from driver app #353 @ d690c4af.
 * Right: prototype controls that are NOT part of the app — they stand in for the backend (the Verida catalog,
 * the release list) and for the Compliance agent in Documents for Review.
 */
import { useMemo, useState } from "react";

import { ComplianceApp, type Tab } from "@/components/verida-ga-compliance/compliance-app";
import { UPLOAD_LAYOUTS, type UploadLayout } from "@/components/verida-ga-compliance/upload-layouts";
import { NEVER_DUE, VERIDA_CATALOG, VEHICLE_RENEWAL, catalogItem } from "@/lib/verida-ga-compliance/catalog";
import {
  SCENARIOS,
  addDays,
  approvable,
  approve,
  epassportNeeded,
  expiryResponse,
  giveEpassport,
  renewalLocks,
  horizon,
  reviewQueue,
  scenarioState,
  sendBack,
  submitRenewal,
  type DriverState,
  type MarketState,
  type ScenarioKey,
} from "@/lib/verida-ga-compliance/scenario";
import { buildComplianceViewModel, complianceSnoozeKey, formatComplianceDate } from "@/lib/verida-ga-compliance/view-model";
import { asBuildResponse, proposedKindFor, withProposedRows } from "@/lib/verida-ga-compliance/proposed-methods";

const KIND_LABEL = {
  upload: "Photo",
  attest: "Provider",
  yardstik: "Yardstik",
  date: "Provider + date ⚠️",
  esign: "Consent form ⚠️",
} as const;

export default function VeridaGaCompliancePage() {
  const [scenario, setScenario] = useState<ScenarioKey>("inspection-round");
  const [market, setMarket] = useState<MarketState>("Georgia");
  const [released, setReleased] = useState<Record<MarketState, boolean>>({
    Georgia: true,
    Tennessee: false,
  });
  const [tnLink, setTnLink] = useState(false);
  const [state, setState] = useState<DriverState>(() =>
    scenarioState("inspection-round", "Georgia", {
      Georgia: true,
      Tennessee: false,
    }),
  );
  const [tab, setTab] = useState<Tab>("home");
  const [snoozeKey, setSnoozeKey] = useState<string | null>(null);
  const [appKey, setAppKey] = useState(0);
  const [dates, setDates] = useState<Record<string, string>>({});
  const [uploadLayout, setUploadLayout] = useState<UploadLayout>("checklist");
  const [openRequest, setOpenRequest] = useState<{
    slug: string;
    n: number;
  } | null>(null);

  const response = useMemo(() => expiryResponse(state), [state]);
  const snoozed = snoozeKey !== null && snoozeKey === complianceSnoozeKey(response);
  const vm = useMemo(
    () => withProposedRows(buildComplianceViewModel(asBuildResponse(response), { snoozed }), response, renewalLocks(state)),
    [response, snoozed, state],
  );
  const queue = reviewQueue(state);

  const load = (key: ScenarioKey, m: MarketState, rel: Record<MarketState, boolean>) => {
    setScenario(key);
    setMarket(m);
    setReleased(rel);
    setState((prev) => scenarioState(key, m, rel, undefined, prev.assume));
    setSnoozeKey(null);
    setDates({});
    setAppKey((k) => k + 1);
  };

  const groups = [
    { name: "Vehicle renewal", entries: queue.filter((e) => e.group) },
    ...queue.filter((e) => !e.group).map((e) => ({ name: null as string | null, entries: [e] })),
  ].filter((g) => g.entries.length);

  return (
    <div className="min-h-screen bg-[#F3F4F6] px-4 py-6 font-wingz">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 md:flex-row">
        <div className="mx-auto h-[760px] w-full max-w-[375px] shrink-0 overflow-hidden rounded-[28px] border-[6px] border-black bg-white shadow-xl md:mx-0">
          <ComplianceApp
            key={appKey}
            state={state}
            response={response}
            vm={vm}
            providerOpts={{ tennesseeInspectionLinkSet: tnLink }}
            tab={tab}
            onTab={setTab}
            onSubmit={(slug, how, givenDate) => setState((s) => submitRenewal(s, slug, how, givenDate))}
            snoozed={snoozed}
            onSnooze={() => setSnoozeKey(complianceSnoozeKey(response))}
            uploadLayout={uploadLayout}
            openRequest={openRequest}
          />
        </div>

        <aside className="w-full space-y-4 rounded-xl bg-white p-4 text-[14px] shadow-sm" data-testid="controls">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-wide text-gray-500">Prototype controls</div>
            <h1 className="mt-1 text-[18px] font-semibold">In-App Compliance — Verida Fully Credentialled</h1>
            <p className="mt-1 text-gray-600">
              The app on the left is the In-App Compliance build (driver app #353) with no change. Everything Verida comes from the backend:
              the requirement list, how each one renews, and the provider instructions from the Verida Fully Credentialled onboarding step
              for the driver&apos;s market.
            </p>
          </div>

          <section>
            <div className="mb-1.5 font-medium">Driver</div>
            <div className="flex flex-wrap gap-2">
              {SCENARIOS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  data-testid={`scenario-${s.key}`}
                  title={s.story}
                  onClick={() => load(s.key, market, released)}
                  className={`rounded-full border px-3 py-1.5 ${scenario === s.key ? "border-[#16CFA9] bg-[#E8FAF4] font-semibold" : "border-gray-300"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-gray-500">Market</span>
              {(["Georgia", "Tennessee"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  data-testid={`market-${m}`}
                  onClick={() => load(scenario, m, released)}
                  className={`rounded-full border px-3 py-1 ${market === m ? "border-[#16CFA9] bg-[#E8FAF4] font-semibold" : "border-gray-300"}`}
                >
                  {m}
                </button>
              ))}
              <span className="ml-2 text-gray-500">Today {state.today}</span>
              <button
                type="button"
                data-testid="advance-day"
                onClick={() => setState((s) => ({ ...s, today: addDays(s.today, 1) }))}
                className="rounded border border-gray-300 px-2 py-0.5 text-[12px]"
              >
                +1 day
              </button>
              <button
                type="button"
                data-testid="advance-week"
                onClick={() => setState((s) => ({ ...s, today: addDays(s.today, 7) }))}
                className="rounded border border-gray-300 px-2 py-0.5 text-[12px]"
              >
                +7 days
              </button>
            </div>
          </section>

          <section data-testid="assumptions-control">
            <div className="mb-1.5 font-medium">
              Assumptions <span className="font-normal text-amber-700">⚠️ to verify with Compliance</span>
            </div>
            <div className="flex flex-wrap gap-4">
              {(
                [
                  ["epassport", "A new EPassport for every drug screening renewal"],
                  ["fee", "The Background Check Fee is charged on every renewal"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    data-testid={`assume-${key}`}
                    checked={state.assume[key]}
                    onChange={(e) => {
                      const assume = {
                        ...state.assume,
                        [key]: e.target.checked,
                      };
                      setState((s) => ({ ...s, assume }));
                    }}
                  />
                  {label}
                </label>
              ))}
            </div>
            <p className="mt-1 text-[12px] text-gray-500">
              The D.Lawson round goes in order: the fee (if charged) → the consent form (background check + MVR in review the moment it is
              signed) → Compliance approves the consent, which flags the Drug Screening&apos;s EPassport field → Compliance uploads a new EPassport (if needed) → the driver books and gives the drug screening date (in review the
              moment it is given). Only trainings (HIPAA, GenTech) can be supplied by the driver.
            </p>
          </section>

          <section data-testid="upload-layout-control">
            <div className="mb-1.5 font-medium">
              Photo upload layout <span className="font-normal text-amber-700">⚠️ proposed (V14), compare the feel</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {UPLOAD_LAYOUTS.map((l) => (
                <button
                  key={l.key}
                  type="button"
                  data-testid={`layout-${l.key}`}
                  title={l.note}
                  onClick={() => setUploadLayout(l.key)}
                  className={`rounded-full border px-3 py-1.5 ${uploadLayout === l.key ? "border-[#16CFA9] bg-[#E8FAF4] font-semibold" : "border-gray-300"}`}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[12px] text-gray-500">
              {UPLOAD_LAYOUTS.find((l) => l.key === uploadLayout)?.note} Applies to Safety Equipment (9 photos), Trade Dress and Signage,
              the requirements whose photos have a guide image. Try it: pick a driver with Safety Equipment due → Renew.
            </p>
          </section>

          <section>
            <div className="mb-1.5 font-medium">Release (backend exclusion list)</div>
            <div className="flex flex-wrap gap-4">
              {(["Georgia", "Tennessee"] as const).map((m) => (
                <label key={m} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    data-testid={`released-${m}`}
                    checked={released[m]}
                    onChange={(e) => {
                      const rel = { ...released, [m]: e.target.checked };
                      setReleased(rel);
                      setState((s) => ({ ...s, released: rel }));
                    }}
                  />
                  Verida {m === "Georgia" ? "GA" : "TN"} released
                </label>
              ))}
              <label className="flex items-center gap-2">
                <input type="checkbox" data-testid="tn-link" checked={tnLink} onChange={(e) => setTnLink(e.target.checked)} />
                TN inspection booking link set (P30)
              </label>
            </div>
            <p className="mt-1 text-[12px] text-gray-500">
              Unticking a market is today: Verida GA and TN are excluded, so the driver sees no banner, no Compliance row and no paused
              Requests. Lifting it is a backend deploy; the app is the same build.
            </p>
          </section>

          <section>
            <div className="mb-1.5 font-medium">
              Documents for Review <span className="font-normal text-gray-500">(the Compliance agent)</span>
            </div>
            {state.assume.epassport && (
              // ⚠️ PROPOSED (Luis, 2026-11-20): the EPassport is a photo field on Drug Screening (internal), with versions. A new one
              // is requested once the new consent form is approved; the app shows it only once a new version is uploaded.
              <div
                className={`mb-2 rounded-lg border p-2 ${epassportNeeded(state) ? "border-amber-300 bg-amber-50" : "border-gray-200"}`}
                data-testid="epassport-field"
              >
                <div className="flex items-center justify-between text-[13px]">
                  <span className="font-semibold">
                    Drug Screening › EPassport <span className="font-normal text-gray-500">(photo field, internal)</span>
                  </span>
                  {epassportNeeded(state) && (
                    <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[11px] font-semibold text-amber-900" data-testid="epassport-needed">
                      New EPassport needed
                    </span>
                  )}
                </div>
                <div className="mt-1 text-[12px] text-gray-600">
                  Current: {state.epassports[state.epassports.length - 1].file} ·{" "}
                  {formatComplianceDate(state.epassports[state.epassports.length - 1].on)}
                  {state.epassportGiven ? " — shown in the driver's app" : " — not shown in the app (previous round)"}
                </div>
                {state.epassports.length > 1 && (
                  <div className="mt-0.5 text-[11.5px] text-gray-500" data-testid="epassport-history">
                    Version history:{" "}
                    {state.epassports
                      .slice(0, -1)
                      .reverse()
                      .map((v) => `${v.file} (${formatComplianceDate(v.on)})`)
                      .join(", ")}
                  </div>
                )}
                {epassportNeeded(state) ? (
                  <button
                    type="button"
                    data-testid="give-epassport"
                    onClick={() => setState((s) => giveEpassport(s))}
                    className="mt-1.5 rounded border border-amber-400 bg-white px-2 py-0.5 text-[12px] font-semibold"
                  >
                    Upload new EPassport
                  </button>
                ) : (
                  !state.epassportGiven && (
                    <div className="mt-1 text-[11.5px] text-gray-500">A new EPassport is requested once the new background check consent is approved.</div>
                  )
                )}
              </div>
            )}
            {groups.length === 0 && !epassportNeeded(state) && (
              <div className="text-[13px] text-gray-500" data-testid="queue-empty">
                Nothing waiting. Renew something in the app.
              </div>
            )}
            <div className="space-y-2" data-testid="review-queue">
              {groups.map((g, gi) => (
                <div
                  key={g.name ?? `single-${gi}`}
                  className={g.name ? "rounded-lg border border-[#16CFA9] p-2" : ""}
                  data-testid={g.name ? "group-vehicle-renewal" : undefined}
                >
                  {g.name && (
                    <div className="mb-1.5 text-[12px] font-semibold text-[#00966F]">
                      {g.name} · {g.entries.length} of {VEHICLE_RENEWAL.length} submitted · each approved on its own
                    </div>
                  )}
                  {g.entries.map((e) => {
                    const date = dates[e.slug] ?? e.defaultDate;
                    const needsDate = !e.dateLabel.startsWith("No date");
                    const ok = approvable(state, e.slug, date);
                    return (
                      <div key={e.slug} className="mb-1.5 rounded-md bg-gray-50 p-2 text-[13px]" data-testid={`review-${e.slug}`}>
                        <div className="font-semibold">
                          {e.title}{" "}
                          <span className="font-normal text-gray-500">
                            ·{" "}
                            {e.how === "date"
                            ? `${catalogItem(e.slug).dateField?.label ?? "date"}: ${e.givenDate ? formatComplianceDate(e.givenDate) : "—"}`
                            : e.how === "esign"
                              ? "consent form signed"
                              : e.slug === "background-check-fee"
                                ? "fee receipt uploaded"
                                : e.attested
                                  ? "marked complete with the provider"
                                  : "new photos"}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          {needsDate ? (
                            <label className="flex items-center gap-1 text-[12px] text-gray-600">
                              {e.dateLabel}
                              <input
                                type="date"
                                value={date}
                                data-testid={`date-${e.slug}`}
                                onChange={(ev) =>
                                  setDates((d) => ({
                                    ...d,
                                    [e.slug]: ev.target.value,
                                  }))
                                }
                                className="rounded border border-gray-300 px-1"
                              />
                            </label>
                          ) : (
                            <span className="text-[12px] text-gray-600">{e.dateLabel}</span>
                          )}
                          <button
                            type="button"
                            data-testid={`approve-${e.slug}`}
                            disabled={!ok}
                            title={ok ? "" : "Approve needs a date later than the one on file"}
                            onClick={() => setState((s) => approve(s, e.slug, date))}
                            className="rounded bg-[#16CFA9] px-2.5 py-1 text-[12px] font-semibold text-white disabled:opacity-40"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            data-testid={`sendback-${e.slug}`}
                            onClick={() => setState((s) => sendBack(s, e.slug, "The photo is blurry. Please upload a clearer one."))}
                            className="rounded border border-amber-400 px-2.5 py-1 text-[12px] font-semibold text-amber-700"
                          >
                            Send back
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-1.5 font-medium">What the backend sends</div>
            <p className="mb-1.5 text-[12px] text-gray-500">
              <b>Open</b> shows any requirement&apos;s renewal in the app, due or not. ⚠️ marks a proposed renewal method #353 does not
              have: the inspection and drug screening take the date instead of the tick; the background check is a consent form signed in
              the app, and the MVR is not listed (it takes the D.Lawson report&apos;s date). GenTech renews like HIPAA: the provider, or the
              driver&apos;s own certificate. Pick <b>Every requirement due</b> to see them all on the Compliance page.
            </p>
            <dl className="mb-2 grid grid-cols-[auto,1fr] gap-x-3 gap-y-0.5 text-[13px]" data-testid="readout">
              <dt className="text-gray-500">In release</dt>
              <dd data-testid="readout-in-release">{response.in_release ? "Yes" : "No — no compliance in the app"}</dd>
              <dt className="text-gray-500">Horizon</dt>
              <dd data-testid="readout-horizon">
                {formatComplianceDate(horizon(state))} — trips picked up after it are not offered
                {!response.in_release && " (not applied while excluded)"}
              </dd>
            </dl>
            <table className="w-full text-[12.5px]" data-testid="catalog-table">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-1 pr-2 font-medium">Requirement</th>
                  <th className="py-1 pr-2 font-medium">Renews by</th>
                  <th className="py-1 pr-2 font-medium">App opens</th>
                  <th className="py-1 pr-2 font-medium">Expires</th>
                  <th className="py-1 font-medium" />
                </tr>
              </thead>
              <tbody>
                {VERIDA_CATALOG.filter((c) => c.assumption !== "fee" || state.assume.fee).map((c) => {
                  const item = response.items.find((i) => i.item_slug === c.slug);
                  return (
                    <tr key={c.slug} className="border-t border-gray-100 align-top" data-testid={`catalog-${c.slug}`}>
                      <td className="py-1 pr-2">{c.title}</td>
                      <td className="py-1 pr-2 text-gray-600">{c.renewsBy}</td>
                      <td className="py-1 pr-2" data-testid={`opens-${c.slug}`}>
                        {c.inApp === false
                          ? "Not in the app ⚠️"
                          : KIND_LABEL[
                              proposedKindFor({
                                item_slug: c.slug,
                                renewal_methods: c.renewal_methods,
                                upload: item?.upload ?? null,
                              })
                            ]}
                        {!!renewalLocks(state)[c.slug] && (
                          <span className="block text-[11px] text-amber-700">{renewalLocks(state)[c.slug]}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap py-1">
                        {formatComplianceDate(state.records[c.slug].expires)}
                        {state.records[c.slug].photosApprovedAwaitingInspection && (
                          <span className="block text-[11px] text-amber-700">photos approved · waits on the inspection</span>
                        )}
                      </td>
                      <td className="py-1">
                        {c.inApp !== false && (
                          <button
                            type="button"
                            data-testid={`open-${c.slug}`}
                            title="Open this requirement's renewal in the app, whether or not it is due"
                            onClick={() =>
                              setOpenRequest((o) => ({
                                slug: c.slug,
                                n: (o?.n ?? 0) + 1,
                              }))
                            }
                            className="rounded border border-gray-300 px-2 py-0.5 text-[11.5px] hover:border-[#16CFA9]"
                          >
                            Open
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {NEVER_DUE.map((n) => (
                  <tr key={n.title} className="border-t border-gray-100 text-gray-500">
                    <td className="py-1 pr-2">{n.title}</td>
                    <td className="py-1 pr-2">Never comes due ({n.why})</td>
                    <td className="py-1 pr-2">—</td>
                    <td className="py-1 pr-2">Not listed</td>
                    <td />
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <div className="space-y-1.5 rounded-lg bg-amber-50 p-3 text-[12px] text-amber-900">
            <div>
              ⚠️ A photo requirement approved before the inspection keeps its old date and stays under Needs attention with no button or
              pill: the build has no &quot;approved, waiting on the inspection&quot; state. The copy for that moment is not decided.
            </div>
            <div>
              ⚠️ The Motor Vehicle Record is listed on its own with its own Renew button; confirming either one sends both. One approval
              sets both.
            </div>
            <div>⚠️ D.Lawson consent on renewal is TBD — Compliance, so the D.Lawson page shows the onboarding information only.</div>
            <div>
              ⚠️ Copied as-is, the onboarding step&apos;s instructions still say &quot;tell us when it is&quot; and &quot;record the date
              and time of your appointment below&quot;, but a renewal has no date fields: the driver only ticks &quot;I&apos;ve completed
              it&quot;. Either the provider page needs its own copy, or the renewal needs the appointment fields.
            </div>
            <div>
              ⚠️ The inspection&apos;s &quot;Upload it yourself&quot; asks for one &quot;Inspection report&quot; photo. The onboarding step
              has no driver photo of the report, so that field is the prototype&apos;s own.
            </div>
            <div>
              ⚠️ Proposed (V14): equipment, trade dress and signage photos show onboarding&apos;s guide image (the field&apos;s example
              image). #353 shows an icon card for every photo and goes through them one at a time in a fixed order, so any layout but
              &quot;#353 as built&quot; is an app change, to fold into #353 before it ships.
            </div>
          </div>

          <p className="text-[12px] text-gray-500">
            Screens: driver app #353 @ d690c4af (fix/in-app-compliance-needs-discussion), copy verbatim. Rules: PRD 2 › In-App Compliance (4
            stories) and <em>Set Verida Fully Credentialled renewal dates</em>. Provider pages: the Verida Fully Credentialled onboarding
            template in this prototype. Driver and trips are synthetic. Upload capture is a placeholder, as in the PR.
          </p>
          <p className="text-[12px] text-gray-500">
            {catalogItem("vehicle-inspection").title}: inspection date + 6 months; GenTech + 2 years; D.Lawson and drug screening + 1 year;
            licence, registration and insurance keep the document&apos;s own date.
          </p>
        </aside>
      </div>
    </div>
  );
}
