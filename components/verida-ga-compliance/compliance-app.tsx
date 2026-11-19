"use client";

/**
 * FEATURE — In-App Compliance for a Verida Fully Credentialled driver, inside the phone frame.
 *
 * Home / Requests / Options with the In-App Compliance entry points of driver app #353 @ d690c4af:
 *   Home: ComplianceBanner variant "home" (dismissible at 30 days)
 *   Requests: ComplianceBanner "compact" + trips cut off after the horizon, footer line
 *             (real: App/Containers/RequestsScreen.tsx:1331-1351), or RequestsPausedView when expired
 *   Options: Compliance row with optionsSubtitle and the tab dot
 * The trips are synthetic. Navigation is a small in-frame stack, not the app's router.
 */
import { useEffect, useState } from "react";
import { ClipboardCheck, ClipboardList, Calendar, Home, Menu } from "lucide-react";

import {
  BGC_SLUG,
  DRUG_SLUG,
  EPASSPORT_SAMPLE_URL,
  MVR_SLUG,
  catalogItem,
  consentFor,
  epassportInfo,
  instructionsFor,
  providerFor,
  type ProviderOptions,
} from "@/lib/verida-ga-compliance/catalog";
import { addDays, renewalLocks, type DriverState, type RenewHow } from "@/lib/verida-ga-compliance/scenario";
import type { ComplianceExpiryResponse } from "@/lib/verida-ga-compliance/types";
import {
  COMPLIANCE_ICON_PATHS,
  changeRequestBody,
  type ComplianceRenewKind,
  type ComplianceRow,
  type ComplianceViewModel,
} from "@/lib/verida-ga-compliance/view-model";

import { Banner, INK, Icon, PAGE_BG, Sheet } from "./parts";
import { CompliancePage, ProviderScreen, RenewScreen, RequestsPaused, UploadScreen } from "./screens";
import type { UploadLayout } from "./upload-layouts";
import { DateRenewScreen, EsignRenewScreen } from "./renew-proposed";
import { proposedKindFor, type RenewKind } from "@/lib/verida-ga-compliance/proposed-methods";

export type Tab = "home" | "requests" | "options";
type Route =
  | { name: "tabs" }
  | { name: "compliance" }
  | { name: "renew"; slug: string }
  | { name: "provider"; slug: string }
  | { name: "upload"; slug: string }
  | { name: "renew-date"; slug: string } // ⚠️ PROPOSED
  | { name: "esign"; slug: string } // ⚠️ PROPOSED
  | { name: "instructions"; slug: string }; // ⚠️ PROPOSED: an upload's onboarding instructions, on their own page

export interface ComplianceAppProps {
  state: DriverState;
  response: ComplianceExpiryResponse;
  vm: ComplianceViewModel;
  providerOpts: ProviderOptions;
  tab: Tab;
  onTab: (t: Tab) => void;
  onSubmit: (slug: string, how: RenewHow, givenDate?: string) => void;
  snoozed: boolean;
  onSnooze: () => void;
  uploadLayout?: UploadLayout;
  /** Prototype control: open this requirement's renewal directly (n changes on every click). */
  openRequest?: { slug: string; n: number } | null;
}

/** Synthetic trip offers, by pickup day from today. */
const TRIP_DAYS = [1, 4, 9, 16, 24, 38];

function routeFor(slug: string, kind: RenewKind): Route {
  if (kind === "attest") return { name: "renew", slug };
  if (kind === "date") return { name: "renew-date", slug };
  if (kind === "esign") return { name: "esign", slug };
  return { name: "upload", slug };
}

export function ComplianceApp({ state, response, vm, providerOpts, tab, onTab, onSubmit, onSnooze, uploadLayout, openRequest }: ComplianceAppProps) {
  const [stack, setStack] = useState<Route[]>([{ name: "tabs" }]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const locks = renewalLocks(state); // ⚠️ PROPOSED
  // ⚠️ PROPOSED (checklist batches): photos sent so far per requirement; the requirement reaches review once all are in.
  const [sentPhotos, setSentPhotos] = useState<Record<string, string[]>>({});
  const partialCounts = Object.fromEntries(
    Object.entries(sentPhotos)
      .filter(([, s]) => s.length > 0)
      .map(([slug, s]) => [slug, { sent: s.length, total: catalogItem(slug).uploadFields.length }]),
  );
  const route = stack[stack.length - 1];
  const push = (r: Route) => setStack((s) => [...s, r]);
  const pop = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  const replace = (r: Route) => setStack((s) => [...s.slice(0, -1), r]);
  const itemFor = (slug: string) => response.items.find((i) => i.item_slug === slug);

  // real: openComplianceRenewal.ts — upload → upload screen, attest → renew screen, yardstik → Yardstik web view.
  const renew = (target: { slug: string; renewKind: ComplianceRenewKind }) => {
    setSheetOpen(false);
    // ⚠️ PROPOSED: the route comes from the proposed kind ("date" / "esign"), which the build's row can't carry.
    const item = itemFor(target.slug);
    const kind = item ? proposedKindFor(item) : target.renewKind;
    if (locks[target.slug]) return; // ⚠️ PROPOSED: an earlier step of the round comes first
    if (kind === "yardstik") throw new Error("A Verida Fully Credentialled driver is never sent to Yardstik");
    push(routeFor(target.slug, kind));
  };
  useEffect(() => {
    if (!openRequest) return;
    const item = response.items.find((i) => i.item_slug === openRequest.slug);
    const c = catalogItem(openRequest.slug);
    const kind = proposedKindFor({ item_slug: c.slug, renewal_methods: c.renewal_methods, upload: item?.upload ?? null });
    setSheetOpen(false);
    setStack([{ name: "tabs" }, { name: "compliance" }, routeFor(c.slug, kind)]);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reopen only when the control is clicked
  }, [openRequest]);
  const renewRow = (row: ComplianceRow) => renew({ slug: row.slug, renewKind: row.renewKind });

  const lastDay = vm.pickupDayLock?.lastDay ?? null;
  const trips = TRIP_DAYS.map((d) => addDays(state.today, d));
  const shown = lastDay ? trips.filter((t) => t <= lastDay) : trips;

  let screen: React.ReactNode;
  if (route.name === "compliance") {
    screen = <CompliancePage vm={vm} onBack={pop} onRenew={renewRow} partial={uploadLayout === "checklist" ? partialCounts : {}} locks={locks} />;
  } else if (route.name === "renew") {
    const c = catalogItem(route.slug);
    screen = (
      <RenewScreen
        key={route.slug}
        title={c.title}
        description={c.providerDescription ?? "Complete it with the provider. They send the result to our Compliance team."}
        canUploadInstead={c.renewal_methods.includes("upload")}
        untilLine={vm.untilLine}
        onBack={pop}
        onContinue={() => push({ name: "provider", slug: route.slug })}
        onUploadInstead={() => replace({ name: "upload", slug: route.slug })}
        onSubmit={() => onSubmit(route.slug, "attest")}
      />
    );
  } else if (route.name === "provider") {
    const c = catalogItem(route.slug);
    const kind = proposedKindFor({ item_slug: c.slug, renewal_methods: c.renewal_methods, upload: itemFor(route.slug)?.upload ?? null });
    screen = (
      <ProviderScreen
        title={c.title}
        provider={providerFor(route.slug, state.market, providerOpts)}
        onBack={pop}
        next={kind === "date" ? "date" : "tick"}
        epassport={route.slug === DRUG_SLUG && state.assume.epassport && state.epassportGiven ? { url: EPASSPORT_SAMPLE_URL, info: epassportInfo() } : null}
      />
    );
  } else if (route.name === "instructions") {
    const c = catalogItem(route.slug);
    screen = <ProviderScreen title={c.title} provider={instructionsFor(route.slug, state.market)} onBack={pop} next={route.slug === "background-check-fee" ? "receipt" : "photo"} />;
  } else if (route.name === "renew-date") {
    const c = catalogItem(route.slug);
    screen = (
      <DateRenewScreen
        key={route.slug}
        title={c.title}
        description={c.providerDescription ?? "Book it with the provider, then tell us the date."}
        dateLabel={c.dateField?.label ?? "Date"}
        today={state.today}
        canUploadInstead={c.renewal_methods.includes("upload")}
        untilLine={vm.untilLine}
        epassport={route.slug === DRUG_SLUG && state.assume.epassport && state.epassportGiven ? { url: EPASSPORT_SAMPLE_URL, info: epassportInfo() } : null}
        onBack={pop}
        onInstructions={() => push({ name: "provider", slug: route.slug })}
        onUploadInstead={() => replace({ name: "upload", slug: route.slug })}
        onSubmit={(date) => onSubmit(route.slug, "date", date)}
      />
    );
  } else if (route.name === "esign") {
    const c = catalogItem(route.slug);
    const consent = consentFor(route.slug);
    const lead = c.slug === MVR_SLUG ? catalogItem(BGC_SLUG) : c;
    const other = c.slug === MVR_SLUG ? c : c.slug === BGC_SLUG ? catalogItem(MVR_SLUG) : null;
    screen = (
      <EsignRenewScreen
        key={route.slug}
        title={lead.title}
        text={consent?.text ?? null}
        formLabel={consent?.formLabel ?? "Review & Sign"}
        alsoRenews={other?.title ?? null}
        untilLine={vm.untilLine}
        onBack={pop}
        onSubmit={() => onSubmit(lead.slug, "esign")}
      />
    );
  } else if (route.name === "upload") {
    const c = catalogItem(route.slug);
    const item = itemFor(route.slug);
    const changes = item?.upload?.status === "change_requested";
    screen = (
      <UploadScreen
        key={route.slug}
        title={c.title}
        fields={c.uploadFields}
        changeNote={changes ? changeRequestBody(item) : null}
        untilLine={vm.untilLine}
        layout={uploadLayout}
        submitted={sentPhotos[route.slug] ?? []}
        instructions={instructionsFor(route.slug, state.market)}
        onInstructions={() => push({ name: "instructions", slug: route.slug })}
        onReplace={(slug) => setSentPhotos((p) => ({ ...p, [route.slug]: (p[route.slug] ?? []).filter((s) => s !== slug) }))}
        onPartialSubmit={(slugs) => setSentPhotos((p) => ({ ...p, [route.slug]: [...(p[route.slug] ?? []), ...slugs] }))}
        onBack={pop}
        onSubmit={() => {
          setSentPhotos((p) => ({ ...p, [route.slug]: [] }));
          onSubmit(route.slug, "upload");
        }}
      />
    );
  } else {
    screen = (
      <>
        <div className="flex h-12 shrink-0 items-center justify-center border-b border-[#EEF2F0] bg-white">
          <div className="text-[16px] font-bold" style={{ color: INK }}>
            {tab === "home" ? "Home" : tab === "requests" ? "Requests" : "Options"}
          </div>
        </div>
        <div className="flex flex-1 flex-col overflow-y-auto" style={{ background: PAGE_BG }}>
          {tab === "home" && (
            <div className="space-y-3 p-3" data-testid="tab-home">
              <Banner vm={vm} variant="home" onPress={() => setSheetOpen(true)} onDismiss={onSnooze} />
              <div className="rounded-[14px] bg-white p-4 text-[13px] text-[#6B7280]">Dashboard (unchanged by this feature)</div>
            </div>
          )}
          {tab === "requests" &&
            (vm.requestsPaused ? (
              <RequestsPaused
                vm={vm}
                onBanner={() => setSheetOpen(true)}
                onCta={() =>
                  vm.pausedAction === "upload" && vm.pausedUploadTarget
                    ? renew(vm.pausedUploadTarget)
                    : vm.pausedAction === "page"
                      ? push({ name: "compliance" })
                      : setSheetOpen(true)
                }
              />
            ) : (
              <div className="space-y-2.5 p-3" data-testid="tab-requests">
                <Banner vm={vm} variant="compact" onPress={() => setSheetOpen(true)} />
                {shown.map((d) => (
                  <div key={d} data-testid="trip-offer" className="flex items-center justify-between rounded-[14px] bg-white px-4 py-3 text-[13px]">
                    <span className="font-semibold" style={{ color: INK }}>
                      Trip offer · pickup {d}
                    </span>
                    <span className="text-[#6B7280]">synthetic</span>
                  </div>
                ))}
                {vm.showRequestsCutoff && (
                  <div className="flex items-center gap-2.5 px-4 pt-4">
                    <div className="h-px flex-1 bg-[#E3E7E5]" />
                    <div className="max-w-[230px] text-center text-[12px] text-[#9AA5A0]" data-testid="requests-cutoff">
                      {vm.requestsCutoffText}
                    </div>
                    <div className="h-px flex-1 bg-[#E3E7E5]" />
                  </div>
                )}
              </div>
            ))}
          {tab === "options" && (
            <div className="p-3" data-testid="tab-options">
              {vm.inRelease ? (
                <button
                  type="button"
                  data-testid="options-compliance"
                  onClick={() => push({ name: "compliance" })}
                  className="flex w-full items-center gap-3 rounded-[14px] bg-white px-4 py-3.5 text-left"
                >
                  <Icon path={COMPLIANCE_ICON_PATHS.optionsRow} color={INK} strokeWidth={1.7} />
                  <div className="min-w-0 flex-1">
                    <div className="text-[15px] font-semibold" style={{ color: INK }}>
                      Compliance
                    </div>
                    <div className="text-[12.5px] text-[#9AA5A0]" data-testid="options-subtitle">
                      {vm.optionsSubtitle}
                    </div>
                  </div>
                  <Icon path={COMPLIANCE_ICON_PATHS.chevron} color="#9AA5A0" size={16} strokeWidth={2.2} />
                </button>
              ) : (
                <div className="rounded-[14px] bg-white px-4 py-3.5 text-[13px] text-[#6B7280]" data-testid="options-no-compliance">
                  No Compliance row: this driver is outside the In-App Compliance release.
                </div>
              )}
            </div>
          )}
        </div>
        <nav className="flex h-16 shrink-0 items-center justify-around border-t border-[#1F2937] bg-[#111827]">
          {(
            [
              ["home", "Home", Home],
              ["requests", "Requests", ClipboardList],
              [null, "Planner", Calendar],
              [null, "My Rides", ClipboardCheck],
              ["options", "Options", Menu],
            ] as const
          ).map(([key, label, Ico]) => {
            const active = key === tab;
            return (
              <button
                key={label}
                type="button"
                disabled={!key}
                data-testid={key ? `nav-${key}` : undefined}
                onClick={() => key && onTab(key)}
                className={`relative flex flex-col items-center gap-1 px-2 py-2 ${active ? "text-[#10B981]" : "text-gray-400"} disabled:opacity-50`}
              >
                <Ico className="h-6 w-6 stroke-current" fill="none" />
                <span className="text-xs font-medium">{label}</span>
                {key === "options" && vm.tabBadgeColor && (
                  <span data-testid="tab-dot" className="absolute right-2 top-1.5 h-2 w-2 rounded-full" style={{ background: vm.tabBadgeColor }} />
                )}
              </button>
            );
          })}
        </nav>
      </>
    );
  }

  return (
    <div className="relative flex h-full flex-col font-wingz">
      {screen}
      <Sheet
        vm={vm}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onRenew={renewRow}
        onViewPage={() => {
          setSheetOpen(false);
          push({ name: "compliance" });
        }}
      />
    </div>
  );
}
