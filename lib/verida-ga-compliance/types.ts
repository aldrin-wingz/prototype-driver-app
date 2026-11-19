/** PORT — verbatim. real: App/Data/compliance/types.ts @ d690c4af */
/**
 * Compliance document expiry — shapes for GET /driver/compliance-expiry/ and the renewal endpoints
 * (backend docs: api/docs/driver_compliance_expiry_banner.md, api/docs/driver_compliance_renewal.md).
 */

export type ComplianceMilestone = "30_day" | "15_day" | "expired";

export type ComplianceBanner = ComplianceMilestone | null;

/**
 * `pending` = a provider-run check is in progress (Yardstik background check / MVR / drug screening).
 * `in_review` = submitted by the driver (upload or "I've completed this"), waiting on Compliance.
 */
export type ComplianceUploadStatus = "in_review" | "pending" | "change_requested" | "approved";

/**
 * How a driver can renew an item:
 * - `upload`: photo/file + form fields, reviewed by Compliance.
 * - `attest`: driver completes it with an outside provider (inspection, CTAA PASS, Northpass HIPAA) — the provider sends
 *   the files to Compliance — and confirms "I've completed this", which puts it in review.
 * - `yardstik`: driver restarts the Yardstik apply flow (consent + steps) in a web view; then it shows Pending.
 */
export type ComplianceRenewalMethod = "upload" | "attest" | "yardstik";

export interface ComplianceExternalLink {
  url: string;
  /** Button label, e.g. "Open Northpass". */
  label: string;
  /** One-line explanation shown above the button. */
  description?: string | null;
}

export interface ComplianceUpload {
  status: ComplianceUploadStatus;
  /** Overall note from Compliance when changes are requested (onboarding `agent_note`). */
  agent_note?: string | null;
  /** Field slug → comment (onboarding `flag_comments`). */
  flag_comments?: Record<string, string> | null;
  /** True once the driver re-uploads after a change request. */
  resubmitted?: boolean;
  /** True when the driver confirmed completion with an outside provider instead of uploading. */
  attested?: boolean;
}

export interface ComplianceItem {
  item_slug: string;
  item_title: string;
  /** Catalog field that produced the date (e.g. `dl_expiration`, `inspection_date`). */
  expiration_field_slug?: string | null;
  /** ISO date (YYYY-MM-DD). */
  expiration_date: string;
  days_until_expiration: number;
  /** Null when the document is outside the 30-day reminder window. */
  milestone: ComplianceMilestone | null;
  /** Set while the item is in review or sent back; null when the driver can start a renewal. */
  upload?: ComplianceUpload | null;
  /** How the item is renewed, preferred first. Falls back to a per-slug default when missing (see `renewalMethodsFor`). */
  renewal_methods?: ComplianceRenewalMethod[] | null;
  /** Provider link for the `attest` method (catalog `presentation.external_link`). */
  external_link?: ComplianceExternalLink | null;
}

export interface ComplianceExpiryResponse {
  /**
   * False for a driver outside the compliance release (tagged for an excluded client-market): the rest of the
   * payload is empty and the app shows no compliance at all. Missing (older backend) means in the release.
   */
  in_release?: boolean;
  /** Earliest expiration among due items — also the Requests cutoff date. */
  expiration_date: string | null;
  days_until_expiration: number | null;
  banner: ComplianceBanner;
  items: ComplianceItem[];
}

/** One saved field on the compliance item. A file field's `value` is the URL already on file. */
export interface ComplianceFieldValue {
  field_slug: string;
  value: unknown;
}

/** Raw onboarding form-builder template for a compliance item upload (field_definitions shape). */
export interface ComplianceUploadForm {
  form_template_id: number | null;
  field_definitions: Array<Record<string, unknown>>;
  /** Current values. Empty when the item has none yet. */
  field_values: ComplianceFieldValue[];
}

/**
 * Renew with the provider (Vehicle Inspection, CTAA PASS, HIPAA): the instructions and link the driver portal shows
 * for that onboarding step, in the driver's market. `null` from the backend = no provider for the market.
 */
export interface ComplianceProvider {
  title: string | null;
  description: string | null;
  blocks: ComplianceProviderBlock[];
}

export interface ComplianceProviderBlock {
  /** "list": `text` has one item per line. "link": open `url` with `button_label`. */
  kind: "text" | "list" | "link";
  label: string | null;
  text: string | null;
  button_label: string | null;
  url: string | null;
  /** ⚠️ PROPOSED: a file to download (the onboarding button's `metadata.download`), e.g. the trade dress or signage. */
  download?: boolean;
}

export interface ComplianceUploadSubmission {
  item_slug: string;
  form_template_id: number | null;
  values: Record<string, unknown>;
  /** Photo/file field slug -> picked photo (e.g. front and back of a driver's license). */
  photos: Record<string, CompliancePhoto>;
}

export interface CompliancePhoto {
  uri: string | null;
  /** True only for the old stubbed capture; real picks are data URLs. */
  isPlaceholder: boolean;
}

/** Yardstik renewal progress — the same internal fields onboarding polls on form-progress. */
export interface ComplianceYardstikStatus {
  /** `created` until the driver submits the Yardstik intake; anything else means submitted. */
  report_status: string | null;
  /** Drug test scheduling link, set by the Yardstik webhook once the report includes a drug screen. */
  drug_screening_schedule_url: string | null;
}
