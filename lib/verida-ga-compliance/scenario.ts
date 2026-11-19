/**
 * FEATURE — In-App Compliance for Verida Fully Credentialled: a stand-in for the backend.
 *
 * Holds one synthetic driver's Verida requirements and answers what GET /driver/compliance-expiry/ would
 * return for them, plus the driver's submissions and Compliance's approvals. The rules are the approved
 * stories', each named where it is applied:
 *   S1  Renew each Verida Fully Credentialled requirement in the app
 *   S2  Renew the inspection's photo requirements with the inspection
 *   C4  Set Verida Fully Credentialled renewal dates
 *   GA / TN  Release In-App Compliance to Verida GA / TN drivers
 * Pure functions over plain objects, so scripts/verify-verida-ga-compliance.ts can test every rule.
 */
import dayjs from "dayjs";

import {
  BGC_SLUG,
  DRUG_SLUG,
  FC_ONLY_SLUGS,
  FEE_SLUG,
  INSPECTION_SLUG,
  SHARED_SLUGS,
  TNC_ONLY_CATALOG,
  TNC_ONLY_SLUGS,
  MVR_SLUG,
  VERIDA_CATALOG,
  WITH_INSPECTION,
  catalogItem,
  type CatalogItem,
} from "./catalog";
import type { ComplianceExpiryResponse, ComplianceItem, ComplianceMilestone, ComplianceUploadStatus } from "./types";

export interface Upload {
  status: ComplianceUploadStatus;
  attested?: boolean;
  /** ⚠️ PROPOSED: how it was sent ("date" / "esign" are new), and the date the driver gave. */
  how?: RenewHow;
  givenDate?: string;
  resubmitted?: boolean;
  agent_note?: string | null;
}

export interface RequirementRecord {
  /** Current expiry on file (YYYY-MM-DD). */
  expires: string;
  upload?: Upload;
  /** S2: this photo requirement's new photos are approved and it waits for the inspection renewal's approval. */
  photosApprovedAwaitingInspection?: boolean;
  /** ⚠️ PROPOSED: requested by a program switch (Request Change) — nothing of the new program on file yet. */
  requested?: boolean;
}

/** ⚠️ PROPOSED (Luis, 2026-11-20): the credential program, from the client tags (Verida → Fully Credentialled). */
export type Program = "fc" | "tnc";

export type MarketState = "Georgia" | "Tennessee";

export interface DriverState {
  today: string;
  market: MarketState;
  /** GA / TN: whether this client-market has left the exclusion list. */
  released: Record<MarketState, boolean>;
  records: Record<string, RequirementRecord>;
  /** S2: the inspection's new expiry once its renewal is approved, until every photo requirement has followed. */
  inspectionRenewedTo?: string;
  /** ⚠️ PROPOSED (Luis, 2026-11-20): assumptions to verify — an EPassport for every drug screening renewal; the BGC fee on every renewal. */
  assume: Assumptions;
  /** ⚠️ PROPOSED: the date Compliance put this round's new EPassport on file — only then does the app show it. */
  epassportGiven?: string;
  /** ⚠️ PROPOSED (Luis, 2026-11-20): the EPassport photo field's versions, oldest first (the last is current). */
  epassports: { on: string; file: string }[];
  /** ⚠️ PROPOSED (Luis, 2026-11-20): the driver's credential program, and a switch still in progress. */
  program: Program;
  switching?: { to: Program; on: string };
}

export interface Assumptions {
  epassport: boolean;
  fee: boolean;
}

export const DEFAULT_ASSUMPTIONS: Assumptions = { epassport: true, fee: true };

const fmt = (d: dayjs.Dayjs) => d.format("YYYY-MM-DD");
export const addDays = (iso: string, n: number) => fmt(dayjs(iso).add(n, "day"));
export const addMonths = (iso: string, n: number) => fmt(dayjs(iso).add(n, "month"));
export const daysBetween = (from: string, to: string) => dayjs(to).diff(dayjs(from), "day");

/** Reminder tiers as the backend sends them: 30 days or less, 15 days or less, past the date. */
export function milestoneFor(days: number): ComplianceMilestone | null {
  if (days < 0) return "expired";
  if (days <= 15) return "15_day";
  if (days <= 30) return "30_day";
  return null;
}

// ---------------------------------------------------------------------------------------------- scenarios

export const TODAY = "2026-11-19";

/** Every requirement valid well past 30 days: the base each scenario changes. */
function baseRecords(today: string): Record<string, RequirementRecord> {
  const inspection = addDays(today, 152);
  const at = (days: number) => addDays(today, days);
  return {
    "drivers-license": { expires: at(845) },
    "vehicle-registration": { expires: at(285) },
    insurance: { expires: at(164) },
    "vehicle-inspection": { expires: inspection },
    hipaa: { expires: at(286) },
    "background-check": { expires: at(203) },
    "background-check-fee": { expires: at(203) },
    mvr: { expires: at(203) },
    "drug-screening": { expires: at(218) },
    "gentech-pass-basic": { expires: at(598) },
    "gentech-defensive-driving": { expires: at(599) },
    "gentech-first-aid": { expires: at(600) },
    "safety-equipment": { expires: inspection },
    "trade-dress": { expires: inspection },
    "safety-rules-signage": { expires: inspection },
    // TNC+ only — on file for a driver who is, or was, TNC+.
    "ctaa-pass": { expires: at(410) },
    "background-check-yardstik": { expires: at(190) },
    "mvr-yardstik": { expires: at(190) },
    "drug-screening-yardstik": { expires: at(190) },
  };
}

export type ScenarioKey = "inspection-round" | "dlawson-drug" | "every-due" | "switch-to-fc" | "switch-to-tnc" | "insurance-expired" | "all-clear";

export const SCENARIOS: { key: ScenarioKey; label: string; story: string }[] = [
  { key: "inspection-round", label: "Inspection due in 20 days", story: "S2 — the inspection and its three photo requirements" },
  { key: "dlawson-drug", label: "D.Lawson + drug screening due", story: "S1 — provider renewals, no Yardstik; ⚠️ fee → consent → EPassport → date" },
  { key: "every-due", label: "Every requirement due", story: "⚠️ All of them at once, to see each renewal method" },
  { key: "switch-to-fc", label: "TN: TNC+ → Fully Credentialled", story: "⚠️ Verida tag added: FC items requested; Verida TN trips held, TCI trips on the TNC+ documents" },
  { key: "switch-to-tnc", label: "TN: Fully Credentialled → TNC+", story: "⚠️ Verida tag removed: TNC+ items requested; every trip on the FC documents until verified" },
  { key: "insurance-expired", label: "Insurance expired", story: "S1 + GA — Requests paused" },
  { key: "all-clear", label: "Everything up to date", story: "Nothing due" },
];

export function scenarioState(
  key: ScenarioKey,
  market: MarketState,
  released: Record<MarketState, boolean>,
  today = TODAY,
  assume: Assumptions = DEFAULT_ASSUMPTIONS,
): DriverState {
  const records = baseRecords(today);
  if (key === "inspection-round") {
    const due = addDays(today, 20);
    for (const slug of [INSPECTION_SLUG, ...WITH_INSPECTION]) records[slug] = { expires: due };
  }
  if (key === "dlawson-drug") {
    records[BGC_SLUG] = { expires: addDays(today, 15) };
    records[MVR_SLUG] = { expires: addDays(today, 15) };
    records[FEE_SLUG] = { expires: addDays(today, 15) };
    records["drug-screening"] = { expires: addDays(today, 25) };
  }
  if (key === "insurance-expired") {
    records.insurance = { expires: addDays(today, -3) };
    records["gentech-first-aid"] = { expires: addDays(today, 12) };
  }
  if (key === "every-due") {
    // Spread over the 30-day window so the list has an order; the vehicle four share the inspection's date (S2).
    VERIDA_CATALOG.forEach((c, i) => (records[c.slug] = { expires: addDays(today, 8 + i) }));
    for (const slug of WITH_INSPECTION) records[slug] = { expires: records[INSPECTION_SLUG].expires };
    records[MVR_SLUG] = { expires: records[BGC_SLUG].expires };
    records[FEE_SLUG] = { expires: records[BGC_SLUG].expires };
  }
  // The EPassport on file from onboarding: the field's first version.
  const epassports = [{ on: addDays(today, -300), file: "epassport-onboarding.svg" }];
  if (key === "switch-to-fc" || key === "switch-to-tnc") {
    // Tennessee only: a driver can hold both programs' clients there (Verida + TCI).
    const to: Program = key === "switch-to-fc" ? "fc" : "tnc";
    const on = addDays(today, -1);
    for (const slug of to === "fc" ? FC_ONLY_SLUGS : TNC_ONLY_SLUGS) records[slug] = { expires: on, requested: true };
    return { today, market: "Tennessee", released: { ...released, Tennessee: true }, records, assume, epassports, program: to, switching: { to, on } };
  }
  return { today, market, released, records, assume, epassports, program: "fc" };
}

/**
 * ⚠️ PROPOSED: requirements listed in the app — never the MVR, the fee only while it is assumed, and only the driver's
 * program (Luis, 2026-11-20). During a switch both programs show: the new one requested, the old one still counting
 * (TCI trips on the TNC+ documents; every trip on the FC documents). Once the switch completes the old one is hidden.
 */
export function listedInApp(s: Pick<DriverState, "assume" | "program" | "switching">) {
  const fcItems = VERIDA_CATALOG.filter((c) => c.inApp !== false && (c.assumption !== "fee" || s.assume.fee));
  const tncItems = TNC_ONLY_CATALOG.filter((c) => c.slug !== "mvr-yardstik" || true);
  if (s.switching) return [...fcItems, ...tncItems];
  return s.program === "fc" ? fcItems : [...fcItems.filter((c) => SHARED_SLUGS.includes(c.slug)), ...tncItems];
}

// ---------------------------------------------------------------------------------------------- the payload

/** GA / TN: a driver in an excluded client-market sees no compliance at all (`in_release: false`). */
export function inRelease(s: DriverState): boolean {
  return s.released[s.market];
}

const SWITCH_NOTE: Record<Program, string> = {
  fc: "New for Verida Fully Credentialled. Upload it to get Verida trips again.",
  tnc: "Needed for TNC+. Until it's approved, your trips follow your Verida Fully Credentialled documents.",
};

/** What GET /driver/compliance-expiry/ returns for this driver. */
export function expiryResponse(s: DriverState): ComplianceExpiryResponse {
  if (!inRelease(s)) return { in_release: false, expiration_date: null, days_until_expiration: null, banner: null, items: [] };
  const items: ComplianceItem[] = listedInApp(s).map((c) => {
    const r = s.records[c.slug];
    if (r.requested) {
      // ⚠️ PROPOSED: requested by the switch — shown as Request Change with no date of its own (no expiry banner).
      return {
        item_slug: c.slug,
        item_title: c.title,
        expiration_date: addDays(s.today, 400),
        days_until_expiration: 400,
        milestone: null,
        upload: r.upload ?? { status: "change_requested", agent_note: SWITCH_NOTE[s.switching?.to ?? "fc"] },
        renewal_methods: c.renewal_methods,
        external_link: c.providerDescription ? { url: "", label: "", description: c.providerDescription } : null,
        program_switch_request: s.switching?.to ?? null,
      };
    }
    const days = daysBetween(s.today, r.expires);
    return {
      item_slug: c.slug,
      item_title: c.title,
      expiration_date: r.expires,
      days_until_expiration: days,
      milestone: milestoneFor(days),
      upload: r.upload ? { status: r.upload.status, attested: r.upload.attested, resubmitted: r.upload.resubmitted, agent_note: r.upload.agent_note } : null,
      renewal_methods: c.renewal_methods,
      external_link: c.providerDescription ? { url: "", label: "", description: c.providerDescription } : null,
    };
  });
  const dated = items.filter((i) => i.milestone).sort((a, b) => a.days_until_expiration - b.days_until_expiration);
  const first = dated[0];
  return {
    in_release: true,
    expiration_date: first?.expiration_date ?? null,
    days_until_expiration: first?.days_until_expiration ?? null,
    banner: first?.milestone ?? null,
    items,
  };
}

/** The horizon: last pickup day the driver is still offered (earliest expiry on file). Same-day OK (GA TC-006). */
export function horizon(s: DriverState): string {
  // ⚠️ PROPOSED: the fee is a step of the background check renewal, not a credential, so it never restricts trips itself.
  return earliest(s, s.program === "fc" || s.switching?.to === "tnc" ? [...SHARED_SLUGS, ...FC_ONLY_SLUGS] : [...SHARED_SLUGS, ...TNC_ONLY_SLUGS]);
}

function earliest(s: DriverState, slugs: string[]): string {
  return slugs
    .filter((slug) => slug !== FEE_SLUG && s.records[slug] && !s.records[slug].requested)
    .map((slug) => s.records[slug].expires)
    .sort()[0];
}

/**
 * ⚠️ PROPOSED (Luis, 2026-11-20): the horizon per client in Tennessee. null = that client's trips are not offered.
 *   TNC+ → FC (in progress): Verida TN trips held until every FC item is approved; TCI trips on the TNC+ documents.
 *   FC → TNC+ (in progress): every trip on the FC documents; Verida trips stop once the TNC+ items are verified.
 *   Done: the program's own documents for every client it serves (FC: Verida + TCI; TNC+: TCI only).
 */
export function horizonsByClient(s: DriverState): { verida: string | null; tci: string | null } {
  const fc = earliest(s, [...SHARED_SLUGS, ...FC_ONLY_SLUGS]);
  const tnc = earliest(s, [...SHARED_SLUGS, ...TNC_ONLY_SLUGS]);
  if (s.switching?.to === "fc") return { verida: null, tci: tnc };
  if (s.switching?.to === "tnc") return { verida: fc, tci: fc };
  return s.program === "fc" ? { verida: fc, tci: s.market === "Tennessee" ? fc : null } : { verida: null, tci: tnc };
}

/** ⚠️ PROPOSED: the switch completes once every requested item is approved; the old program is then hidden. */
function completeSwitch(s: DriverState): DriverState {
  if (!s.switching) return s;
  const pending = (s.switching.to === "fc" ? FC_ONLY_SLUGS : TNC_ONLY_SLUGS).filter(
    (slug) => s.records[slug].requested && (slug !== FEE_SLUG || s.assume.fee) && slug !== MVR_SLUG,
  );
  return pending.length ? s : { ...s, switching: undefined };
}

// ---------------------------------------------------------------------------------------------- ⚠️ PROPOSED: renewal order

const submitted = (r: RequirementRecord | undefined) => r?.upload?.status === "in_review" || r?.upload?.status === "pending";
const due = (s: DriverState, slug: string) => daysBetween(s.today, s.records[slug].expires) <= 30;

/**
 * ⚠️ PROPOSED (Luis, 2026-11-20): the D.Lawson round goes in order —
 *   1. the Background Check Fee (when charged) before the consent form;
 *   2. the consent form before the drug screening;
 *   3. the drug screening date only once Compliance has put the EPassport on file (when one is needed).
 * Returns, per requirement still to renew, why it can't be started yet. (Luis, 2026-11-20: a new EPassport is requested
 * when the new consent form is APPROVED, and the app shows it only once Compliance uploads it in the EPassport field.)
 */
export function renewalLocks(s: DriverState): Record<string, string> {
  const locks: Record<string, string> = {};
  const open = (slug: string) => due(s, slug) && !submitted(s.records[slug]) && s.records[slug].upload?.status !== "approved";
  if (s.assume.fee && open(BGC_SLUG) && due(s, FEE_SLUG) && !submitted(s.records[FEE_SLUG]) && s.records[FEE_SLUG].upload?.status !== "approved") {
    locks[BGC_SLUG] = "Pay the Background Check Fee first";
  }
  if (open(DRUG_SLUG)) {
    if (due(s, BGC_SLUG) && !submitted(s.records[BGC_SLUG]) && s.records[BGC_SLUG].upload?.status !== "approved") {
      locks[DRUG_SLUG] = "Sign the background check consent form first";
    } else if (s.assume.epassport && !s.epassportGiven) {
      locks[DRUG_SLUG] = "Waiting for your EPassport from Compliance";
    }
  }
  return locks;
}

/** ⚠️ PROPOSED: the EPassport field is flagged for a new upload once the new consent form is approved. */
export function epassportNeeded(s: DriverState): boolean {
  if (!s.assume.epassport || s.epassportGiven || !due(s, DRUG_SLUG) || submitted(s.records[DRUG_SLUG])) return false;
  // Flagged once the new consent form is approved (or the background check isn't part of this round).
  return s.records[BGC_SLUG].upload?.status === "approved" || !due(s, BGC_SLUG);
}

/** Compliance uploads a new version in the Drug Screening's EPassport field; the previous one moves to its history. */
export function giveEpassport(s: DriverState): DriverState {
  return { ...s, epassportGiven: s.today, epassports: [...s.epassports, { on: s.today, file: `epassport-${s.today}.svg` }] };
}

// ---------------------------------------------------------------------------------------------- driver actions

/** S1: one D.Lawson confirmation covers the background check and the Motor Vehicle Record. */
const linked = (slug: string) => (slug === BGC_SLUG || slug === MVR_SLUG ? [BGC_SLUG, MVR_SLUG] : [slug]);

export type RenewHow = "upload" | "attest" | "date" | "esign";

export function submitRenewal(s: DriverState, slug: string, how: RenewHow, givenDate?: string): DriverState {
  const records = { ...s.records };
  for (const sl of linked(slug)) {
    const prev = records[sl].upload;
    records[sl] = {
      ...records[sl],
      photosApprovedAwaitingInspection: false,
      upload: { status: "in_review", attested: how !== "upload", how, givenDate, resubmitted: prev?.status === "change_requested" },
    };
  }
  return { ...s, records };
}

// ---------------------------------------------------------------------------------------------- Compliance actions

export interface ReviewEntry {
  slug: string;
  title: string;
  attested: boolean;
  how: RenewHow;
  givenDate: string | null;
  /** The date the agent saves before approving: the inspection / completion date, or the document's own expiry. */
  dateLabel: string;
  defaultDate: string;
  /** "Vehicle renewal" when the four inspection requirements are reviewed together (S2). */
  group: string | null;
}

/** Documents for Review for this driver. MVR is folded into its background check (one approval, S1). */
export function reviewQueue(s: DriverState): ReviewEntry[] {
  return [...VERIDA_CATALOG, ...TNC_ONLY_CATALOG].filter((c) => s.records[c.slug]?.upload?.status === "in_review" && c.slug !== MVR_SLUG).map((c) => {
    const ownDate = c.termMonths === null;
    const photoFollower = c.kind === "with-inspection";
    return {
      slug: c.slug,
      title: c.slug === BGC_SLUG ? `${c.title} + Motor Vehicle Record` : c.title,
      attested: !!s.records[c.slug].upload?.attested,
      how: s.records[c.slug].upload?.how ?? (s.records[c.slug].upload?.attested ? "attest" : "upload"),
      givenDate: s.records[c.slug].upload?.givenDate ?? null,
      dateLabel: photoFollower
        ? "No date: takes the inspection's new expiry"
        : ownDate
          ? "Expiry read from the photo"
          : c.slug === INSPECTION_SLUG
            ? "Inspection date"
            : c.slug === BGC_SLUG
              ? "D.Lawson report date"
              : "Completion date",
      defaultDate: ownDate ? addMonths(s.today, 12) : s.today,
      group: [INSPECTION_SLUG, ...WITH_INSPECTION].includes(c.slug) ? "Vehicle renewal" : null,
    };
  });
}

function newExpiry(c: CatalogItem, date: string): string {
  return c.termMonths === null ? date : addMonths(date, c.termMonths);
}

/**
 * Approve one renewal. S1: the date moves only on approval, and only to a later date than the one on file
 * (`approvable` is false otherwise — the CS Tool keeps Approve disabled). S2: approving the inspection
 * approves nothing else; a photo requirement takes the inspection's new expiry once both are approved,
 * whichever is last.
 */
export function approvable(s: DriverState, slug: string, date: string): boolean {
  const c = catalogItem(slug);
  if (c.kind === "with-inspection" || s.records[slug].requested) return true;
  return dayjs(newExpiry(c, date)).isAfter(dayjs(s.records[slug].expires));
}

export function approve(s: DriverState, slug: string, date: string): DriverState {
  if (!approvable(s, slug, date)) return s;
  const c = catalogItem(slug);
  const records = { ...s.records };
  let inspectionRenewedTo = s.inspectionRenewedTo;

  if (s.records[slug].requested) {
    // ⚠️ PROPOSED: a switch-requested item takes its own new date; the inspection-linked three take the inspection's.
    const exp = c.kind === "with-inspection" ? records[INSPECTION_SLUG].expires : newExpiry(c, date);
    for (const sl of linked(slug)) records[sl] = { expires: exp, upload: { status: "approved" } };
    return completeSwitch({ ...s, records });
  }
  if (c.kind === "with-inspection") {
    if (inspectionRenewedTo && dayjs(inspectionRenewedTo).isAfter(records[slug].expires)) {
      records[slug] = { expires: inspectionRenewedTo, upload: { status: "approved" } };
    } else {
      records[slug] = { ...records[slug], upload: { status: "approved" }, photosApprovedAwaitingInspection: true };
    }
  } else {
    const exp = newExpiry(c, date);
    for (const sl of linked(slug)) records[sl] = { expires: exp, upload: { status: "approved" } };
    if (slug === INSPECTION_SLUG) {
      inspectionRenewedTo = exp;
      for (const sl of WITH_INSPECTION) {
        if (records[sl].photosApprovedAwaitingInspection) records[sl] = { expires: exp, upload: { status: "approved" } };
      }
    }
  }
  // ⚠️ PROPOSED: each drug screening round needs its own EPassport.
  return { ...s, records, inspectionRenewedTo, epassportGiven: slug === DRUG_SLUG ? undefined : s.epassportGiven };
}

export function sendBack(s: DriverState, slug: string, note: string): DriverState {
  const records = { ...s.records };
  for (const sl of linked(slug)) {
    records[sl] = { ...records[sl], photosApprovedAwaitingInspection: false, upload: { status: "change_requested", agent_note: note } };
  }
  return { ...s, records };
}
