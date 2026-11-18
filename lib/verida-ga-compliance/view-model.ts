/**
 * PORT — verbatim from the driver app, In-App Compliance (driver app #353).
 * real: App/Data/compliance/complianceViewModel.ts @ d690c4af (fix/in-app-compliance-needs-discussion)
 * Only change: moment → dayjs (same formats). Every banner, sheet, page and Requests string comes from here,
 * so the Verida screens show exactly what the shipped app would, fed a Verida payload.
 */
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

import type { ComplianceBanner, ComplianceExpiryResponse, ComplianceItem, ComplianceMilestone, ComplianceRenewalMethod } from "./types";

dayjs.extend(customParseFormat);

/**
 * Derives every piece of Compliance UI (banners, sheet, full page, Requests cutoff, Options row, tab dot)
 * from the GET /driver/compliance-expiry/ payload. The UI never recomputes milestones or dates — it only
 * reads `banner`, `milestone`, `days_until_expiration` and `expiration_date` from the server.
 */

export interface ComplianceTheme {
  bg: string;
  border: string;
  iconBg: string;
  iconFg: string;
  bodyColor: string;
  chevronColor: string;
  dot: string;
}

type ThemeKey = ComplianceMilestone | "today";

export const COMPLIANCE_THEMES: Record<ThemeKey | "review" | "changes" | "ok", ComplianceTheme> = {
  "30_day": {
    bg: "#FFF6D6",
    border: "#EDD174",
    iconBg: "#FBEAA6",
    iconFg: "#8A6A00",
    bodyColor: "#6B5A1E",
    chevronColor: "#A88400",
    dot: "#E9C23A",
  },
  "15_day": {
    bg: "#FFE9D6",
    border: "#F3B37E",
    iconBg: "#FCD5B3",
    iconFg: "#C2560F",
    bodyColor: "#8A4108",
    chevronColor: "#C2560F",
    dot: "#F08A3C",
  },
  today: {
    bg: "#FFDDD1",
    border: "#EE9879",
    iconBg: "#FBBFAA",
    iconFg: "#B8360F",
    bodyColor: "#7E2A10",
    chevronColor: "#B8360F",
    dot: "#E85A33",
  },
  expired: {
    bg: "#FCE2E4",
    border: "#EFA3AB",
    iconBg: "#F8C6CB",
    iconFg: "#B91C1C",
    bodyColor: "#8A1C1C",
    chevronColor: "#B91C1C",
    dot: "#E0344B",
  },
  review: {
    bg: "#E6EEFE",
    border: "#A9C3F8",
    iconBg: "#D2E0FC",
    iconFg: "#2F5FD0",
    bodyColor: "#3B4A6B",
    chevronColor: "#2F5FD0",
    dot: "#4C7FEA",
  },
  changes: {
    bg: "#FEF5D0",
    border: "#F6CB57",
    iconBg: "#FCE7A0",
    iconFg: "#D97706",
    bodyColor: "#92400E",
    chevronColor: "#D97706",
    dot: "#D97706",
  },
  ok: {
    bg: "#F1FCF8",
    border: "#BDEEDC",
    iconBg: "#E8F6F2",
    iconFg: "#00B692",
    bodyColor: "#4B5452",
    chevronColor: "#00B692",
    dot: "#16CFA9",
  },
};

export const COMPLIANCE_ICON_PATHS = {
  document: "M7 3h7l4 4v14H7zM14 3v4h4M9.5 12h5M9.5 15.5h5M9.5 19h3",
  documentPlain: "M7 3h7l4 4v14H7zM14 3v4h4",
  warning: "M12 3.5L2.5 20h19L12 3.5zM12 10v4.5M12 17.2v.3",
  clock: "M12 7.5v4.5l3 2M12 21a9 9 0 110-18 9 9 0 010 18z",
  pencil: "M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4",
  check: "M5 12.5l4.5 4.5L19 7.5",
  optionsRow: "M6 3h9l3 3v15H6zM9 8h7M9 11.5h7M9 15h4",
  paused: "M6 3h9l3 3v15H6zM9 9h6M9 13h6M9 17h3",
  upload: "M12 16V4M7 9l5-5 5 5M5 20h14",
  close: "M6 6l12 12M18 6L6 18",
  chevron: "M9 5.5l7 6.5-7 6.5",
  camera: "M4 8h3l2-3h6l2 3h3v11H4z",
  idCard: "M5.5 16c.5-1.6 1.6-2.5 3-2.5s2.5.9 3 2.5M14 9.5h4.5M14 12.5h4.5",
};

/** Per-slug fallback when the backend doesn't send `renewal_methods` yet. */
const DEFAULT_RENEWAL_METHODS: Record<string, ComplianceRenewalMethod[]> = {
  "vehicle-inspection": ["attest", "upload"],
  "ctaa-pass": ["attest", "upload"],
  hipaa: ["attest", "upload"],
  "background-check": ["yardstik"],
  mvr: ["yardstik"],
  "drug-screening": ["yardstik"],
};

export function renewalMethodsFor(item: Pick<ComplianceItem, "item_slug" | "renewal_methods">): ComplianceRenewalMethod[] {
  return item.renewal_methods?.length ? item.renewal_methods : (DEFAULT_RENEWAL_METHODS[item.item_slug] ?? ["upload"]);
}

/**
 * Which screen a renewal opens: "upload" (photo + fields), "attest" (provider link + "I've completed this", with upload
 * as the alternative when allowed) or "yardstik" (apply flow in a web view). A change request always reopens the upload form.
 */
export type ComplianceRenewKind = "upload" | "attest" | "yardstik";

export function renewKindFor(item: Pick<ComplianceItem, "item_slug" | "renewal_methods" | "upload">): ComplianceRenewKind {
  const methods = renewalMethodsFor(item);
  // A change request reopens the upload form when the item takes uploads; a Yardstik-only item goes back to Yardstik.
  if (item.upload?.status === "change_requested" && methods.includes("upload")) return "upload";
  if (methods.includes("yardstik")) return "yardstik";
  if (methods.includes("attest")) return "attest";
  return "upload";
}

/** Fallback labels for flagged fields when the form template isn't loaded. */
const FIELD_LABELS: Record<string, string> = { front_photo: "Front photo", expiration_date: "Expiration date" };

export const DEFAULT_CHANGE_REQUEST_BODY_WITH_FLAGS = "Please update the highlighted fields below and resubmit.";
export const DEFAULT_CHANGE_REQUEST_BODY = "Please review this step and resubmit your changes.";

export interface ComplianceFlag {
  slug: string;
  label: string;
  comment: string;
}

export interface ComplianceRow {
  slug: string;
  title: string;
  dot: string;
  text: string;
  textColor: string;
  isDue: boolean;
  inReview: boolean;
  /** Provider-run check in progress (Yardstik). Also counted as `inReview`. */
  pending: boolean;
  changes: boolean;
  approved: boolean;
  /** The driver can act on it in the app (upload, confirm completion, or start Yardstik). */
  canUpload: boolean;
  renewKind: ComplianceRenewKind;
  /** Short label for the sheet row button ("Upload" / "Renew" / "Start" / "Fix"). */
  uploadLabel: string;
  /** Full-width CTA on the Compliance page. */
  uploadCta: string;
  agentNote: string;
  flags: ComplianceFlag[];
}

export interface ComplianceViewModel {
  hasData: boolean;
  /**
   * False when the backend says this driver is outside the compliance release: no banner, tab dot, Options row,
   * paused Requests or Pickup Day cutoff. True until the backend says otherwise.
   */
  inRelease: boolean;
  /** Banner on Home / Requests. */
  showBanner: boolean;
  bannerKind: ComplianceBanner | "review" | null;
  isChanges: boolean;
  theme: ComplianceTheme;
  iconPath: string;
  title: string;
  shortLine: string;
  dismissible: boolean;
  /** Bottom sheet. */
  sheetTitle: string;
  sheetBody: string;
  sheetRows: ComplianceRow[];
  uploadNote: string;
  /** Requests tab. */
  requestsPaused: boolean;
  pausedCta: string;
  /** "upload": straight to the one due document's upload. "sheet": open the details sheet. "page": open the Compliance page. */
  pausedAction: "upload" | "sheet" | "page";
  pausedUploadTarget: { slug: string; title: string; renewKind: ComplianceRenewKind } | null;
  showRequestsCutoff: boolean;
  requestsCutoffText: string;
  /** Locked last row of Requests › Filter › Pickup Day ("October 11 onward"). Null when nothing is cut off. */
  pickupDayLock: { label: string; sub: string; lastDay: string } | null;
  uploadEnabled: boolean;
  /** Options row + tab dot. */
  tabBadgeColor: string | null;
  optionsSubtitle: string;
  /** Full Compliance page. */
  page: {
    theme: ComplianceTheme;
    iconPath: string;
    title: string;
    body: string;
    due: ComplianceRow[];
    ok: ComplianceRow[];
    note: string;
  };
  /** Upload "Submitted" screen. */
  untilLine: string;
  isReview: boolean;
}

export const formatComplianceDate = (iso: string | null | undefined): string =>
  iso ? dayjs(iso, "YYYY-MM-DD").format("MMM D, YYYY") : "";

const inDays = (n: number) => (n === 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`);

const themeFor = (milestone: ComplianceMilestone, days: number): ComplianceTheme =>
  COMPLIANCE_THEMES[milestone === "15_day" && days === 0 ? "today" : milestone];

const flagsFor = (item: ComplianceItem): ComplianceFlag[] =>
  Object.entries(item.upload?.flag_comments ?? {}).map(([slug, comment]) => ({ slug, label: FIELD_LABELS[slug] ?? slug, comment }));

export function changeRequestBody(item: Pick<ComplianceItem, "upload"> | null | undefined): string {
  const note = item?.upload?.agent_note?.trim();
  if (note) return note;
  return Object.keys(item?.upload?.flag_comments ?? {}).length ? DEFAULT_CHANGE_REQUEST_BODY_WITH_FLAGS : DEFAULT_CHANGE_REQUEST_BODY;
}

function toRow(i: ComplianceItem, uploadEnabled: boolean): ComplianceRow {
  const status = i.upload?.status;
  // Review states show whether or not the item is still within 30 days: a renewal's new date can move it out of
  // the window while Compliance is reviewing it or has sent it back.
  const pending = status === "pending";
  const inReview = status === "in_review" || pending;
  const changes = status === "change_requested";
  const renewKind = renewKindFor(i);
  const label = changes ? "Fix" : { upload: "Upload", attest: "Renew", yardstik: "Start" }[renewKind];
  const cta = changes
    ? renewKind === "yardstik"
      ? `Redo ${i.item_title} with Yardstik`
      : `Re-upload ${i.item_title}`
    : { upload: `Upload new ${i.item_title}`, attest: `Renew ${i.item_title}`, yardstik: `Start ${i.item_title} renewal` }[renewKind];
  const base: ComplianceRow = {
    slug: i.item_slug,
    title: i.item_title,
    dot: i.milestone ? themeFor(i.milestone, i.days_until_expiration).dot : COMPLIANCE_THEMES.ok.dot,
    text:
      i.days_until_expiration < 0
        ? `Expired ${formatComplianceDate(i.expiration_date)}`
        : i.milestone
          ? `Expires ${formatComplianceDate(i.expiration_date)} · ${inDays(i.days_until_expiration)}`
          : `Valid until ${formatComplianceDate(i.expiration_date)}`,
    textColor: i.milestone ? "#131A1B" : "#9AA5A0",
    isDue: !!i.milestone,
    inReview,
    pending,
    changes,
    approved: status === "approved",
    canUpload: uploadEnabled && (changes || (!!i.milestone && !status)),
    renewKind,
    uploadLabel: label,
    uploadCta: cta,
    agentNote: i.upload?.agent_note?.trim() ?? "",
    flags: changes ? flagsFor(i) : [],
  };
  if (pending) {
    return { ...base, text: "In progress with Yardstik · results can take a few days", dot: "#4C7FEA" };
  }
  if (inReview) {
    return {
      ...base,
      text: i.upload?.attested
        ? "Marked complete · Compliance will verify it"
        : `${i.upload?.resubmitted ? "Resubmitted" : "Submitted"} · usually reviewed within 1 business day`,
      dot: "#4C7FEA",
    };
  }
  if (changes) {
    return { ...base, text: "Changes requested", textColor: "#D97706", dot: "#D97706" };
  }
  return base;
}

interface Options {
  /** 30-day banner dismissed for this session. */
  snoozed?: boolean;
  /**
   * In-app renewal upload available. False while the upload endpoints don't exist: every Upload entry point is
   * hidden and the copy points drivers to support instead (the design's "without upload" variant).
   */
  uploadEnabled?: boolean;
}

/**
 * Identity of what a 30-day dismissal was for: every due item's date, tier and review state. Any change (a new
 * document comes due, a date or tier moves, an upload goes to review or comes back with changes) gives a new key,
 * so the dismissal no longer applies.
 */
export function complianceSnoozeKey(api: ComplianceExpiryResponse | null | undefined): string {
  return (api?.items ?? [])
    .filter((i) => i.milestone)
    .map((i) => `${i.item_slug}:${i.milestone}:${i.expiration_date}:${i.upload?.status ?? ""}`)
    .sort()
    .join("|");
}

export function buildComplianceViewModel(api: ComplianceExpiryResponse | null | undefined, opts: Options = {}): ComplianceViewModel {
  if (api?.in_release === false) {
    // Outside the release: build from nothing due (no banner, pause or cutoff) and hide the entry points.
    return {
      ...buildComplianceViewModel({ expiration_date: null, days_until_expiration: null, banner: null, items: [] }, opts),
      inRelease: false,
    };
  }
  // Earliest date overall (may belong to a document already in review): drives the Requests pause, cutoff and lock.
  const overallBanner = api?.banner ?? null;
  const items = api?.items ?? [];
  const byDays = (a: ComplianceItem, b: ComplianceItem) => a.days_until_expiration - b.days_until_expiration;
  const dueAll = items.filter((i) => i.milestone).sort(byDays);
  const isWaiting = (i: ComplianceItem) => i.upload?.status === "in_review" || i.upload?.status === "pending";
  const due = dueAll.filter((i) => !isWaiting(i));
  // Every renewal Compliance is reviewing, including one whose new date already moved it out of the 30-day window:
  // it's still listed under Needs attention, so the banner, page header and Options row say it's in review.
  const inReview = items.filter(isWaiting).sort(byDays);
  // Change requests on items outside the 30-day window (a renewal whose new date already counts) still need fixing.
  const offWindowChanges = items.filter((i) => !i.milestone && i.upload?.status === "change_requested");
  const chg = [...due.filter((i) => i.upload?.status === "change_requested"), ...offWindowChanges];
  const primary = due[0];
  // The banner names `primary` (first document still due), so its tier sets the copy, colors and dismissal —
  // not the overall horizon, which may be an expired document already in review.
  const banner: ComplianceBanner = primary?.milestone ?? null;
  const extra = due.length > 1 ? ` +${due.length - 1} more` : "";
  const cutoff = formatComplianceDate(api?.expiration_date);
  const isMulti = due.length > 1;
  const expiredCount = due.filter((i) => i.milestone === "expired").length;
  const uploadEnabled = opts.uploadEnabled ?? true;
  const rows = items
    .slice()
    .sort(byDays)
    .map((i) => toRow(i, uploadEnabled));

  // A change request always shows, even on a dismissed 30-day banner.
  let showBanner = !!banner && !!primary && !(banner === "30_day" && opts.snoozed && chg.length === 0);
  let bannerKind: ComplianceViewModel["bannerKind"] = null;
  let theme = COMPLIANCE_THEMES.ok;
  let iconPath = COMPLIANCE_ICON_PATHS.document;
  let title = "";
  let sheetTitle = "Compliance";
  let sheetBody = "Everything's up to date.";
  let dismissible = false;

  if (banner && primary) {
    bannerKind = banner;
    theme = themeFor(banner, primary.days_until_expiration);
    const name = primary.item_title;
    const d = primary.days_until_expiration;
    const copy = {
      "30_day": {
        title: `${name} expires ${formatComplianceDate(primary.expiration_date)}${extra}`,
        sheetTitle: `${name} expires ${formatComplianceDate(primary.expiration_date)}`,
        sheetBody: `You have ${d} days. Trip requests after ${cutoff} won't be offered until it's renewed.`,
      },
      "15_day": {
        title: `${name} expires ${inDays(d)}${extra}`,
        sheetTitle: `${name} expires ${inDays(d)}`,
        sheetBody:
          (d === 0 ? "You can still take trips today. " : `You can still take trips through ${cutoff}. `) +
          "After that, new requests are hidden until your renewal is on file.",
      },
      expired: {
        title: `Your ${name} has expired`,
        sheetTitle: `${name} expired ${formatComplianceDate(primary.expiration_date)}`,
        sheetBody: uploadEnabled
          ? `New trip requests are paused until your renewal is approved. ${renewKindFor(primary) === "yardstik" ? "Start the renewal now" : renewKindFor(primary) === "attest" ? "Renew it now" : "Upload it now"} and we'll review it quickly.`
          : "New trip requests are paused until your renewal is approved. Contact support and we'll help you get it renewed.",
      },
    }[banner];
    if (isMulti) {
      const soon = due.length - expiredCount;
      copy.title =
        banner === "expired"
          ? expiredCount > 1
            ? `${expiredCount} requirements have expired`
            : `1 requirement expired, ${soon} more due`
          : `${due.length} requirements expire ${banner === "30_day" ? "in the next 30 days" : "soon"}`;
      copy.sheetTitle = `${due.length} requirements need attention`;
      copy.sheetBody =
        banner === "expired"
          ? "New trip requests are paused until every expired requirement is renewed and approved. The soonest one is listed first."
          : `You can still take trips through ${cutoff}. That cutoff follows the requirement that expires first.`;
    }
    if (overallBanner === "expired" && banner !== "expired") {
      // An expired document is already in review: Requests are paused even though the one named here is not expired.
      copy.sheetBody = "New trip requests are paused until your expired requirement is approved. Renew the requirements below too.";
    }
    ({ title, sheetTitle, sheetBody } = copy);
    iconPath = banner === "expired" ? COMPLIANCE_ICON_PATHS.warning : COMPLIANCE_ICON_PATHS.document;
    // Never while Requests are paused (an expired document can still be in review).
    dismissible = banner === "30_day" && overallBanner === "30_day";
  }

  if (!primary && inReview.length) {
    showBanner = true;
    bannerKind = "review";
    theme = COMPLIANCE_THEMES.review;
    iconPath = COMPLIANCE_ICON_PATHS.clock;
    title =
      inReview.length > 1
        ? `${inReview.length} requirements in review`
        : `${inReview[0].item_title} ${inReview[0].upload?.status === "pending" ? "pending" : "in review"}`;
    sheetTitle = "In review";
    // A renewal completed with the provider was marked complete by the driver: never "we've got your upload".
    sheetBody = inReview.every((i) => i.upload?.attested)
      ? `You marked ${inReview.length > 1 ? "them" : "it"} complete. Compliance will verify ${inReview.length > 1 ? "them" : "it"} with the provider.`
      : inReview.some((i) => i.upload?.attested)
        ? "Compliance is reviewing your renewals. Requirements you marked complete are verified with the provider."
        : "Compliance is reviewing your renewal, usually within 1 business day.";
    dismissible = false;
  }

  if (!showBanner && offWindowChanges.length) {
    // Nothing due, but Compliance sent a renewal back: the change-request banner below takes over.
    showBanner = true;
    bannerKind = "review";
  }
  // The banner follows the most urgent requirement: a change request takes it over only when it is on that
  // requirement (e.g. an expired license whose renewal came back), when nothing else is due, or when the
  // 30-day banner was dismissed. An expired requirement with no upload outranks a change request on a later one.
  const changesLead =
    !primary || primary.upload?.status === "change_requested" || (banner === "30_day" && !!opts.snoozed);
  const isChanges = chg.length > 0 && showBanner && changesLead;
  if (isChanges) {
    theme = COMPLIANCE_THEMES.changes;
    iconPath = COMPLIANCE_ICON_PATHS.pencil;
    dismissible = false;
    title = `Changes Requested: ${chg.length > 1 ? `${chg.length} requirements` : chg[0].item_title}`;
    sheetTitle = "Changes Requested";
    sheetBody = changeRequestBody(chg[0]);
  }

  const shortLine = !title
    ? ""
    : isChanges
      ? overallBanner === "expired"
        ? "Requests stay paused · Tap to see what to fix"
        : "Tap to see what to fix"
      : bannerKind === "review"
        ? "Usually approved within 1 business day"
        : overallBanner === "expired"
          ? "New requests are paused · Tap for details"
          : "Tap for details";

  const uploadNote = !uploadEnabled
    ? due.length
      ? "Already renewed? Contact support to update it on file."
      : "Need to update a requirement early? Contact support."
    : due.length
      ? {
          upload: "Upload a clear photo of the renewed one and we'll review it, usually within 1 business day.",
          attest: "Finish it with the provider, then let us know here. Compliance verifies it, usually within 1 business day.",
          yardstik: "Start the renewal here. You'll go through the same Yardstik steps as when you signed up.",
        }[renewKindFor(due[0])]
      : inReview.length
        ? "Compliance usually reviews renewals within 1 business day."
        : "";

  const pausedCta = !uploadEnabled
    ? "View Compliance"
    : primary
      ? primary.upload?.status === "change_requested"
        ? `Fix ${primary.item_title}`
        : due.length > 1
          ? "Update requirements"
          : (rows.find((r) => r.slug === primary.item_slug)?.uploadCta ?? `Upload new ${primary.item_title}`)
      : "View status";
  const pausedUploadTarget =
    uploadEnabled && primary && due.length === 1
      ? { slug: primary.item_slug, title: primary.item_title, renewKind: renewKindFor(primary) }
      : null;

  const tabBadgeColor =
    showBanner && (banner === "15_day" || banner === "expired") && primary ? themeFor(banner, primary.days_until_expiration).dot : null;

  // First match wins: Changes requested, then In review, then dates.
  const optionsSubtitle = chg.length
    ? "Changes requested"
    : inReview.length
      ? "In review"
      : !api
        ? "License, insurance & more"
        : primary
          ? banner === "expired"
            ? expiredCount > 1
              ? `${expiredCount} requirements expired${due.length > expiredCount ? ` +${due.length - expiredCount} more` : ""}`
              : `${primary.item_title} expired${extra}`
            : `${primary.item_title} expires ${formatComplianceDate(primary.expiration_date)}${extra}`
          : items.length
            ? "All up to date"
            : "License, insurance & more";

  const dueRows = rows.filter((r) => r.isDue || r.inReview || r.changes);
  const okRows = rows.filter((r) => !r.isDue && !r.inReview && !r.changes);
  const hasDue = dueRows.length > 0;

  return {
    hasData: !!api,
    inRelease: true,
    showBanner,
    bannerKind,
    isChanges,
    theme,
    iconPath,
    title,
    shortLine,
    dismissible,
    sheetTitle,
    sheetBody,
    sheetRows: rows.filter((r) => r.isDue || r.inReview || r.changes),
    uploadNote,
    requestsPaused: overallBanner === "expired",
    pausedCta,
    pausedAction: !uploadEnabled ? "page" : pausedUploadTarget ? "upload" : "sheet",
    pausedUploadTarget,
    // Whenever trips past the cutoff are hidden: the 30-day level as well as the 15-day level.
    showRequestsCutoff: overallBanner === "30_day" || overallBanner === "15_day",
    requestsCutoffText: `Trips after ${cutoff} are hidden until your ${dueAll[0]?.item_title ?? "requirement"} is renewed and approved`,
    pickupDayLock:
      // The cutoff follows the earliest dated item, even one whose renewal is already in review.
      (overallBanner === "30_day" || overallBanner === "15_day") && api?.expiration_date && dueAll[0]
        ? {
            label: `${dayjs(api.expiration_date, "YYYY-MM-DD").add(1, "day").format("MMMM D")} onward`,
            sub: `Paused until your ${dueAll[0].item_title} is renewed`,
            // Last pickup day still offered (YYYY-MM-DD); later days are hidden from the Pickup Day picker.
            lastDay: api.expiration_date,
          }
        : null,
    uploadEnabled,
    tabBadgeColor,
    optionsSubtitle,
    page: {
      theme: hasDue ? theme : COMPLIANCE_THEMES.ok,
      iconPath: hasDue ? iconPath : COMPLIANCE_ICON_PATHS.check,
      title: hasDue ? title : "Everything is up to date",
      body: hasDue ? sheetBody : "Nothing needs your attention right now.",
      due: dueRows,
      ok: okRows,
      note: !uploadEnabled
        ? hasDue
          ? "Already renewed? Contact support to update it on file."
          : ""
        : dueRows.some((r) => r.canUpload)
          ? "Uploads are usually reviewed within 1 business day."
          : "",
    },
    untilLine:
      overallBanner === "expired"
        ? "Until it's approved, new trip requests stay paused."
        : cutoff
          ? `Until it's approved, you'll keep seeing trips through ${cutoff}.`
          : "",
    isReview: inReview.length > 0,
  };
}
