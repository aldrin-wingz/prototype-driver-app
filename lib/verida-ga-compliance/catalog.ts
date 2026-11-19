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
    renewsBy: "Provider (Rideshare Mechanic), or a photo of the new report",
    kind: "provider-or-photo",
    renewal_methods: ["attest", "upload"],
    providerAnchor: "book_vehicle_inspection_button",
    providerDescription: "Book your inspection with Rideshare Mechanic. They send the results straight to our Compliance team.",
    // ⚠️ The onboarding step has no driver photo of the report (the report is filed internally), so this one field is the
    // prototype's own. The story only says "a photo of the new report".
    uploadFields: [{ slug: "inspection_report", label: "Inspection report" }],
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
    renewsBy: "Provider (D.Lawson). Also renews the Motor Vehicle Record",
    kind: "provider",
    renewal_methods: ["attest"],
    providerAnchor: "bgc_info",
    providerDescription: "D.Lawson runs your background check and Motor Vehicle Record again. Compliance confirms both with them.",
    uploadFields: [],
    termMonths: 12,
  },
  {
    slug: "mvr",
    title: "Motor Vehicle Record (D.Lawson)",
    renewsBy: "Renews with the background check",
    kind: "with-background-check",
    renewal_methods: ["attest"],
    providerAnchor: "bgc_info",
    providerDescription: "Renews with your D.Lawson background check: one confirmation covers both.",
    uploadFields: [],
    termMonths: 12,
  },
  {
    slug: "drug-screening",
    title: "Drug Screening",
    renewsBy: "Provider (booking link from the Pre-Verida Training Check stage)",
    kind: "provider",
    renewal_methods: ["attest"],
    providerAnchor: "schedule_drug_screening_button",
    providerDescription: "Book your drug screening. The testing facility sends the result straight to our Compliance team.",
    uploadFields: [],
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
      renewsBy: "Photo of the new certificate",
      kind: "photo",
      renewal_methods: ["upload"],
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
export const MVR_SLUG = "mvr";
export const WITH_INSPECTION = VERIDA_CATALOG.filter((i) => i.kind === "with-inspection").map((i) => i.slug);
/** The four reviewed together as one vehicle renewal (story 2). */
export const VEHICLE_RENEWAL = [INSPECTION_SLUG, ...WITH_INSPECTION];

export function catalogItem(slug: string): CatalogItem {
  const item = VERIDA_CATALOG.find((i) => i.slug === slug);
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

/**
 * ⚠️ PROPOSED (Luis, 2026-11-20): the onboarding step's instructions and download button, shown on the upload screen of
 * Trade Dress and Signage — the same Verida Fully Credentialled step the driver saw in onboarding, for their market.
 */
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
    return { title: step.title, description: step.description ?? null, blocks };
  }
  throw new Error(`Verida step not found: ${stepTitle}`);
}
