/**
 * FEATURE — In-App Compliance for Verida Fully Credentialled (prototype/verida-ga-onboarding).
 *
 * The Verida catalog as the BACKEND would send it. Nothing here is app code: story 1 says the renewal
 * method is set per requirement in the catalog (`presentation.renewal_methods`), so the app at
 * driver app #353 @ d690c4af renders a Verida driver with no change. The screens in
 * components/verida-ga-compliance are ports of that build; this file is the config they are fed.
 *
 * Sources:
 *   PRD 2 › In-App Compliance › "Renew each Verida Fully Credentialled requirement in the app" (renewal-method table)
 *   PRD 2 › "Renew the inspection's photo requirements with the inspection" (the three photo requirements)
 *   PRD 2 › "Set Verida Fully Credentialled renewal dates" (terms)
 *   Provider instructions: read from the Verida Fully Credentialled onboarding step for the driver's market
 *   (lib/verida-ga-onboarding/payloads.json), as story 1's amended config row says — never a hard-coded copy.
 */
import { marketIdFor, resolveFieldLink, templateFor, type FieldDef } from "@/lib/verida-ga-onboarding/market-flow";

import type { ComplianceProvider, ComplianceProviderBlock, ComplianceRenewalMethod } from "./types";

export type CatalogKind = "photo" | "provider" | "provider-or-photo" | "with-background-check" | "with-inspection";

export interface UploadField {
  slug: string;
  label: string;
  /** The onboarding field's `metadata.example_image` — the same guide image the onboarding step shows. */
  exampleImage?: string;
  /** ⚠️ PROPOSED (checklist): first line of the onboarding field's own text ("2 required — for back seats"). */
  hint?: string;
}

export interface CatalogItem {
  slug: string;
  title: string;
  /** What story 1's table says, in words — shown in the prototype readout. */
  renewsBy: string;
  kind: CatalogKind;
  /** Sent to the app as `renewal_methods`. Never "yardstik" for a Verida Fully Credentialled driver. */
  renewal_methods: ComplianceRenewalMethod[];
  /** Field on the Verida Fully Credentialled onboarding step whose step supplies the provider page. */
  providerAnchor?: string;
  /** ⚠️ PROPOSED (Luis, 2026-11-20): false = not listed in the app (MVR: its date comes from the D.Lawson report). */
  inApp?: boolean;
  /** ⚠️ PROPOSED (Luis, 2026-11-20): assumed charged on every renewal, to verify (the "fee" switch). */
  assumption?: "fee";
  /** ⚠️ PROPOSED ("date"): the onboarding step's date field the driver fills instead of ticking "I've completed it". */
  dateField?: { slug: string; label: string };
  /** ⚠️ PROPOSED ("esign"): the onboarding step's consent form. */
  esignField?: string;
  /** ⚠️ PROPOSED (Luis, 2026-11-20): onboarding step whose instructions and download button the upload screen shows. */
  instructionsStep?: string;
  /** One line above Continue on the renew screen (`external_link.description`). */
  providerDescription?: string;
  /** Photos the driver uploads, in order (one per screen in the app). */
  uploadFields: UploadField[];
  /** Months added to the approved date. null = the document's own expiry, saved by the agent. */
  termMonths: number | null;
}

/** Photo/file fields of a Verida onboarding step, by step title — so the upload asks for what onboarding asked for. */
function stepPhotos(stepTitle: string, only?: string[]): UploadField[] {
  for (const stage of templateFor("verida-ga")) {
    const step = stage.steps.find((s) => s.title === stepTitle);
    if (!step) continue;
    return step.field_definitions
      .filter((f) => (f.field_type === "photo" || f.field_type === "file") && f.visibility !== "internal")
      .filter((f) => !only || only.includes(f.slug))
      .map((f) => {
        const example = (f.metadata as { example_image?: string } | null | undefined)?.example_image;
        const hint = (f.content ?? "").split(/\n|\\n/)[0]?.trim();
        return {
          slug: f.slug,
          label: f.label,
          ...(example ? { exampleImage: example } : {}),
          ...(hint ? { hint } : {}),
        };
      });
  }
  throw new Error(`Verida step not found: ${stepTitle}`);
}

/** One onboarding field by step title and slug (its label as the driver read it). */
function stepField(stepTitle: string, slug: string): { slug: string; label: string } {
  for (const stage of templateFor("verida-ga")) {
    const f = stage.steps.find((s) => s.title === stepTitle)?.field_definitions.find((d) => d.slug === slug);
    if (f) return { slug: f.slug, label: f.label };
  }
  throw new Error(`Verida field not found: ${stepTitle} › ${slug}`);
}

export const VERIDA_CATALOG: CatalogItem[] = [
  {
    slug: "drivers-license",
    title: "Driver's License and Profile Photo",
    renewsBy: "New photo",
    kind: "photo",
    renewal_methods: ["upload"],
    uploadFields: [...stepPhotos("Driver's License & SSN", ["dl_front", "dl_back"]), ...stepPhotos("Profile Photos & Bio", ["profile_photo"])],
    termMonths: null,
  },
  {
    slug: "vehicle-registration",
    title: "Vehicle Registration and Images",
    renewsBy: "New photo",
    kind: "photo",
    renewal_methods: ["upload"],
    uploadFields: [
      ...stepPhotos("Vehicle Insurance & Registration", ["vehicle_registration_doc"]),
      ...stepPhotos("Profile Photos & Bio").filter((f) => f.slug.startsWith("vehicle_photo_exterior")),
    ],
    termMonths: null,
  },
  {
    slug: "insurance",
    title: "Insurance",
    renewsBy: "New photo",
    kind: "photo",
    renewal_methods: ["upload"],
    uploadFields: stepPhotos("Vehicle Insurance & Registration", ["insurance_documents"]),
    termMonths: null,
  },
  {
    slug: "vehicle-inspection",
    title: "Vehicle Inspection",
    renewsBy: "Provider (Rideshare Mechanic) + the inspection date",
    kind: "provider",
    // ⚠️ PROPOSED (Luis, 2026-11-20): was ["attest", "upload"]. Provider + date; not a training, so no upload of its own.
    renewal_methods: ["date"],
    providerAnchor: "book_vehicle_inspection_button",
    providerDescription:
      "Book your inspection with Rideshare Mechanic, then tell us the date. Have your safety equipment, Wingz trade dress and safety rules signage in the vehicle: the inspector checks them. They send the results straight to our Compliance team.",
    dateField: stepField("Vehicle Inspection", "inspection_date"),
    uploadFields: [],
    termMonths: 6,
  },
  {
    slug: "hipaa",
    title: "HIPAA",
    renewsBy: "Provider, or a photo of the new certificate",
    kind: "provider-or-photo",
    renewal_methods: ["attest", "upload"],
    providerAnchor: "hipaa_video",
    uploadFields: [{ slug: "hipaa_certificate", label: "HIPAA certificate" }],
    termMonths: 12,
  },
  {
    slug: "background-check",
    title: "Background Check (D.Lawson)",
    renewsBy: "Consent form signed in the app (D.Lawson). Also renews the Motor Vehicle Record",
    kind: "provider",
    renewal_methods: ["esign"],
    providerAnchor: "bgc_info",
    providerDescription: "D.Lawson runs your background check and Motor Vehicle Record again. Compliance confirms both with them.",
    // ⚠️ PROPOSED (Luis, 2026-11-20): was ["attest"]. Signing the onboarding consent form (HelloSign) is the submission.
    esignField: "bgc_esign_file",
    uploadFields: [],
    termMonths: 12,
  },
  {
    slug: "mvr",
    title: "Motor Vehicle Record (D.Lawson)",
    renewsBy: "Listed on its own (11-24): signed with the background check's consent, approved on its own from the D.Lawson report",
    kind: "with-background-check",
    inApp: false,
    renewal_methods: ["esign"],
    esignField: "bgc_esign_file",
    providerAnchor: "bgc_info",
    providerDescription: "Renews with your D.Lawson background check: one confirmation covers both.",
    uploadFields: [],
    termMonths: 12,
  },
  {
    slug: "drug-screening",
    title: "Drug Screening",
    renewsBy: "Provider + the screening date, once Compliance gives the EPassport",
    kind: "provider",
    // ⚠️ PROPOSED (Luis, 2026-11-20): was ["attest"]. The date replaces the tick. Not a training, so no upload of its own.
    renewal_methods: ["date"],
    providerAnchor: "schedule_drug_screening_button",
    providerDescription: "Book your drug screening, then tell us the date. After your screening, upload the receipt the facility gives you. The facility sends the result to our Compliance team.",
    dateField: stepField("Schedule Drug Screening", "drug_screen_date"),
    // D32 (Luis, 2026-11-23): after the screening the driver uploads the facility receipt.
    uploadFields: [{ slug: "drug_screen_receipt", label: "Facility receipt" }],
    termMonths: 12,
  },
  {
    // Nov 20 meeting (Luis, 2026-11-24): due only when the driver has completed no trip in more than 60 days (`feeDue`);
    // otherwise Wingz covers the renewal. Paid and approved before the consent form can be signed.
    slug: "background-check-fee",
    title: "BGC Check Fee",
    renewsBy: "Requested by Compliance (Request Changes on the receipt) when the last trip was 60+ days ago: onboarding's Background Check Fee step — pay, upload a new receipt; approved before the consent",
    kind: "photo",
    renewal_methods: ["upload"],
    assumption: "fee",
    // Luis 2026-11-24: the same section as onboarding — its receipt field, Stripe link and instructions.
    uploadFields: stepPhotos("Background Check Fee", ["background_check_fee_receipt"]),
    instructionsStep: "Background Check Fee",
    termMonths: 12,
  },
  ...(
    [
      ["gentech-pass-basic", "PASS Basic (GenTech)", "gentech_pass_basic_certificate"],
      ["gentech-defensive-driving", "Defensive Driving (GenTech)", "gentech_defensive_driving_certificate"],
      ["gentech-first-aid", "First Aid (GenTech)", "gentech_first_aid_certificate"],
    ] as const
  ).map(
    ([slug, title, field]): CatalogItem => ({
      slug,
      title,
      renewsBy: "Provider (GenTech LMS), or a photo of the new certificate",
      kind: "provider-or-photo",
      // ⚠️ PROPOSED (Luis, 2026-11-20): was ["upload"]. A training like HIPAA: the LMS + tick, or upload the certificate.
      renewal_methods: ["attest", "upload"],
      providerAnchor: "gentech_training_button",
      providerDescription: "Retake the course on the GenTech LMS. Compliance confirms your new certificate with GenTech.",
      uploadFields: stepPhotos("GenTech Training", [field]),
      termMonths: 24,
    }),
  ),
  {
    slug: "safety-equipment",
    title: "Vehicle Safety Equipment",
    renewsBy: "New photos, due with the inspection",
    kind: "with-inspection",
    renewal_methods: ["upload"],
    uploadFields: stepPhotos("Safety Equipment"),
    termMonths: 6,
  },
  {
    slug: "trade-dress",
    title: "Wingz Trade Dress",
    renewsBy: "New photos, due with the inspection",
    kind: "with-inspection",
    renewal_methods: ["upload"],
    uploadFields: stepPhotos("Wingz Trade Dress"),
    instructionsStep: "Wingz Trade Dress",
    termMonths: 6,
  },
  {
    slug: "safety-rules-signage",
    title: "Safety Rules Signage",
    renewsBy: "New photos, due with the inspection",
    kind: "with-inspection",
    renewal_methods: ["upload"],
    uploadFields: stepPhotos("Safety Rules Signage"),
    instructionsStep: "Safety Rules Signage",
    termMonths: 6,
  },
];

/** Never come due: no date, so the backend never lists them (story 1, TC-009). */
export const NEVER_DUE = [
  { title: "Social Security", why: "No date" },
  { title: "Benefits Trafficking (BTT) Certificate", why: "No expiry" },
];

export const INSPECTION_SLUG = "vehicle-inspection";
export const BGC_SLUG = "background-check";
export const FEE_SLUG = "background-check-fee";
export const DRUG_SLUG = "drug-screening";
export const MVR_SLUG = "mvr";
export const WITH_INSPECTION = VERIDA_CATALOG.filter((i) => i.kind === "with-inspection").map((i) => i.slug);
/** The four reviewed together as one vehicle renewal (story 2). */
export const VEHICLE_RENEWAL = [INSPECTION_SLUG, ...WITH_INSPECTION];

/**
 * ⚠️ PROPOSED (Luis, 2026-11-20): the TNC+-only requirements, for a Tennessee driver switching program. They renew as
 * #353 renews them for TNC+ (CTAA PASS by photo, the Yardstik three in Yardstik).
 */
export const TNC_ONLY_CATALOG: CatalogItem[] = [
  { slug: "ctaa-pass", title: "CTAA PASS", renewsBy: "Photo of the new certificate", kind: "photo", renewal_methods: ["upload"], uploadFields: [{ slug: "ctaa_pass_certificate", label: "CTAA PASS certificate" }], termMonths: 36 },
  { slug: "background-check-yardstik", title: "Background Check (Yardstik)", renewsBy: "Yardstik", kind: "provider", renewal_methods: ["yardstik"], uploadFields: [], termMonths: 12 },
  { slug: "mvr-yardstik", title: "Motor Vehicle Record (Yardstik)", renewsBy: "Yardstik", kind: "provider", renewal_methods: ["yardstik"], uploadFields: [], termMonths: 12 },
  { slug: "drug-screening-yardstik", title: "Drug Screening (Yardstik)", renewsBy: "Yardstik", kind: "provider", renewal_methods: ["yardstik"], uploadFields: [], termMonths: 12 },
];

/** Requirements both programs share. Everything else in VERIDA_CATALOG is Verida Fully Credentialled only. */
export const SHARED_SLUGS = ["drivers-license", "vehicle-registration", "insurance", "vehicle-inspection", "hipaa"];
export const FC_ONLY_SLUGS = VERIDA_CATALOG.map((c) => c.slug).filter((s) => !SHARED_SLUGS.includes(s));
export const TNC_ONLY_SLUGS = TNC_ONLY_CATALOG.map((c) => c.slug);

export function catalogItem(slug: string): CatalogItem {
  const item = VERIDA_CATALOG.find((i) => i.slug === slug) ?? TNC_ONLY_CATALOG.find((i) => i.slug === slug);
  if (!item) throw new Error(`Unknown Verida requirement: ${slug}`);
  return item;
}

/** Template text carries `**bold**` and, in places, a literal backslash-n for a line break. */
const stripMarkdown = (s: string) => s.replace(/\*\*/g, "").replace(/\\n/g, "\n");

function blockFor(field: FieldDef, marketId: number | null): ComplianceProviderBlock | null {
  switch (field.field_type) {
    case "info":
      return field.content ? { kind: "text", label: field.label || null, text: stripMarkdown(field.content), button_label: null, url: null } : null;
    case "info_list": {
      const lines = field.items?.length
        ? field.items.map((i) => stripMarkdown(i.text))
        : (field.content ?? "").split(/\n|\\n/).filter((l) => l.trim());
      return lines.length ? { kind: "list", label: field.label || null, text: lines.join("\n"), button_label: null, url: null } : null;
    }
    case "button":
    case "video": {
      const url = resolveFieldLink(field, marketId);
      if (!url) return null;
      const download = Boolean((field.metadata as { download?: boolean } | null | undefined)?.download);
      return { kind: "link", label: null, text: null, button_label: field.label || field.content || "Open", url, ...(download ? { download } : {}) };
    }
    default:
      return null;
  }
}

export interface ProviderOptions {
  /** P30 (open): Tennessee's inspection booking link on the Verida Fully Credentialled workflow. */
  tennesseeInspectionLinkSet: boolean;
}

/**
 * The provider page for a requirement in the driver's market: the Verida Fully Credentialled onboarding step
 * holding the anchor field, whichever workflow the driver onboarded on. No booking link for the market → null,
 * and the app says "Contact support to renew it" (story 1, TC-015).
 */
export function providerFor(slug: string, marketState: string, opts: ProviderOptions): ComplianceProvider | null {
  const anchor = catalogItem(slug).providerAnchor;
  if (!anchor) return null;
  const marketId = marketIdFor(marketState);
  for (const stage of templateFor("verida-ga")) {
    for (const step of stage.steps) {
      const fields = step.field_definitions.filter((f) => f.visibility !== "internal");
      if (!fields.some((f) => f.slug === anchor)) continue;
      const anchorField = fields.find((f) => f.slug === anchor)!;
      const needsLink = anchorField.field_type === "button" || anchorField.field_type === "video";
      const tnUnset = slug === INSPECTION_SLUG && marketState === "Tennessee" && !opts.tennesseeInspectionLinkSet;
      if (needsLink && (tnUnset || !resolveFieldLink(anchorField, marketId))) return null;
      const blocks = fields.map((f) => blockFor(f, marketId)).filter((b): b is ComplianceProviderBlock => !!b);
      return { title: step.title, description: step.description ?? null, blocks };
    }
  }
  return null;
}

/** ⚠️ PROPOSED (V14): the page-selector and checklist upload layouts apply only where every photo has a guide image. */
export function hasGuides(fields: UploadField[]) {
  return fields.length > 0 && fields.every((f) => !!f.exampleImage);
}

/** ⚠️ PROPOSED: the checklist upload applies where every photo has a guide, or the onboarding step has instructions to show. */
export function usesChecklist(c: Pick<CatalogItem, "uploadFields" | "instructionsStep">) {
  return hasGuides(c.uploadFields) || (!!c.instructionsStep && c.uploadFields.length > 0);
}

/**
 * ⚠️ PROPOSED (Luis, 2026-11-20): the onboarding step's instructions and download button, shown on the upload screen of
 * Trade Dress and Signage — the same Verida Fully Credentialled step the driver saw in onboarding, for their market.
 */
/**
 * Luis 2026-11-24: the renewal fee is a market setting. The renewal fee item uses the onboarding Background Check Fee
 * section's layout and instructions with the RENEWAL amount and link; the onboarding fee stays $15 with its own link.
 * (Backend: a per-market renewal setting, like the per-market inspection link.)
 */
export interface MarketRenewalSettings {
  renewal_fee_amount: string;
  renewal_fee_link: string;
}
export const MARKET_RENEWAL_SETTINGS: Record<string, MarketRenewalSettings> = {
  Georgia: {
    renewal_fee_amount: "$71",
    // ⚠️ Placeholder: Georgia's renewal Stripe link is not set yet (it may differ from onboarding's $15 link).
    renewal_fee_link: "https://buy.stripe.com/renewal-fee-ga-placeholder",
  },
};

/** The onboarding fee section rewritten for a renewal: the market's renewal amount and link; onboarding-only lines go. */
function asRenewalFee(blocks: ComplianceProviderBlock[], settings: MarketRenewalSettings): ComplianceProviderBlock[] {
  const text = (t: string | null) =>
    t
      ?.replace(/ that we discussed during the Info Call/g, "")
      // The onboarding fee is refunded after the first trip; the renewal fee is not.
      .replace(/ ?[^.\n]*refunded[^.\n]*\./g, "")
      .replace(/ which partially covers the background check process\./g, " for your background check, Motor Vehicle Record and drug test renewal.")
      .replace(/\$15\b/g, settings.renewal_fee_amount)
      .trim() ?? null;
  return blocks.map((b) =>
    b.kind === "link" && /stripe\.com/.test(b.url ?? "")
      ? { ...b, url: settings.renewal_fee_link }
      : { ...b, text: text(b.text) },
  );
}

export function instructionsFor(slug: string, marketState: string): ComplianceProvider | null {
  const stepTitle = catalogItem(slug).instructionsStep;
  if (!stepTitle) return null;
  const marketId = marketIdFor(marketState);
  for (const stage of templateFor("verida-ga")) {
    const step = stage.steps.find((s) => s.title === stepTitle);
    if (!step) continue;
    const blocks = step.field_definitions
      .filter((f) => f.visibility !== "internal")
      .map((f) => blockFor(f, marketId))
      .filter((b): b is ComplianceProviderBlock => !!b);
    const renewal = slug === FEE_SLUG ? MARKET_RENEWAL_SETTINGS[marketState] : undefined;
    if (slug === FEE_SLUG && !renewal) return null; // no renewal fee set for this market: nothing to pay in the app
    return {
      title: renewal ? "BGC Check Fee" : step.title,
      description: renewal ? "Pay the renewal fee, then upload your receipt as proof of payment." : (step.description ?? null),
      blocks: renewal ? asRenewalFee(blocks, renewal) : blocks,
    };
  }
  throw new Error(`Verida step not found: ${stepTitle}`);
}

/** ⚠️ PROPOSED ("esign"): the consent step's text and the form, from the Verida Fully Credentialled onboarding step. */
export function consentFor(slug: string): { stepTitle: string; text: string | null; formLabel: string } | null {
  const field = catalogItem(slug).esignField;
  if (!field) return null;
  for (const stage of templateFor("verida-ga")) {
    for (const step of stage.steps) {
      const form = step.field_definitions.find((f) => f.slug === field);
      if (!form) continue;
      const info = step.field_definitions.find((f) => f.field_type === "info" && f.visibility !== "internal");
      return { stepTitle: step.title, text: info?.content ? stripMarkdown(info.content) : null, formLabel: form.label };
    }
  }
  throw new Error(`Consent field not found: ${field}`);
}

/** ⚠️ PROPOSED (Luis, 2026-11-20): the onboarding EPassport step's text, shown with the EPassport on the drug screening renewal. */
export function epassportInfo(): string | null {
  for (const stage of templateFor("verida-ga")) {
    const f = stage.steps.find((s) => s.title === "EPassport (Voucher)")?.field_definitions.find((d) => d.slug === "drug_screen_epassport_info");
    if (f) return f.content ? stripMarkdown(f.content) : null;
  }
  return null;
}

/** Prototype placeholder for the EPassport file Compliance puts on file (synthetic). */
/**
 * D15 (2026-11-21) at renewal: the inspection's read-first requirements, from the onboarding step, answered with a
 * single Yes before the booking link and date appear.
 */
export function agreementFor(slug: string): string | null {
  if (slug !== INSPECTION_SLUG) return null;
  for (const stage of templateFor("verida-ga")) {
    const f = stage.steps.find((s) => s.title === "Vehicle Inspection")?.field_definitions.find((d) => d.slug === "ack_inspection_requirements");
    if (f) return stripMarkdown(String(f.content ?? f.label ?? ""));
  }
  return null;
}

export const EPASSPORT_SAMPLE_URL = "/dev/epassport-sample.svg";

/**
 * Luis 2026-11-24 (#3): before the inspection's read-first requirements and Book link, the driver goes through three short
 * pages of what to bring — Safety Equipment, Safety Rules Signage, Wingz Trade Dress — built from the same onboarding
 * steps (their intro, the item list with its guide images, and the signage / trade dress print link Jovita asked for).
 */
export interface BringPage {
  key: "safety-equipment" | "safety-rules-signage" | "trade-dress";
  title: string;
  intro: string | null;
  items: { label: string; image: string | null; hint: string | null }[];
  print: { label: string; url: string } | null;
  confirm: string;
}

export function inspectionBringPages(marketState: string): BringPage[] {
  const marketId = marketIdFor(marketState);
  const step = (title: string) => {
    for (const stage of templateFor("verida-ga")) {
      const st = stage.steps.find((s) => s.title === title);
      if (st) return st;
    }
    throw new Error(`Verida step not found: ${title}`);
  };
  const page = (key: BringPage["key"], title: string, stepTitle: string, confirm: string): BringPage => {
    const st = step(stepTitle);
    const fields = st.field_definitions.filter((f) => f.visibility !== "internal");
    const info = fields.find((f) => f.field_type === "info");
    const button = fields.find((f) => f.field_type === "button" && (f.metadata as { download?: boolean } | null | undefined)?.download);
    const url = button ? resolveFieldLink(button, marketId) : null;
    return {
      key,
      title,
      intro: info?.content ? stripMarkdown(info.content) : null,
      items: stepPhotos(stepTitle).map((f) => ({ label: f.label, image: f.exampleImage ?? null, hint: f.hint ?? null })),
      print: button && url ? { label: `Print / download: ${button.label}`, url } : null,
      confirm,
    };
  };
  return [
    page("safety-equipment", "Safety Equipment", "Safety Equipment", "I'll bring these to my inspection"),
    page("safety-rules-signage", "Safety Rules Signage", "Safety Rules Signage", "I'll have the sign in my vehicle"),
    page("trade-dress", "Wingz Trade Dress", "Wingz Trade Dress", "I'll have the trade dress on my vehicle"),
  ];
}
