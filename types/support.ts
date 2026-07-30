/**
 * In-App Support Requests — case + form model.
 *
 * A support case is DATA, not a screen. The runtime renders any case from its
 * field schema, so adding the next case is a config object rather than new
 * components. Modelled on reference screenshot `s-02a` (the app's existing
 * "Late pickup reason" sheet), which is the base pattern for every form.
 */

/**
 * Field types the runtime can render.
 *
 * Deliberately only the types a specified case actually needs. Adding one is a
 * new branch in the renderer plus an entry here — cheap. Building types nothing
 * uses is speculative, so we don't.
 */
export type SupportFieldType = "select" | "textarea" | "text" | "time";

export interface SupportFieldOption {
  value: string;
  label: string;
}

export interface SupportField {
  id: string;
  type: SupportFieldType;
  /** Label above the control. A required field renders a red asterisk after it. */
  label: string;
  /** Placeholder inside the control. */
  placeholder?: string;
  /** Helper copy under the control. */
  helpText?: string;
  required?: boolean;
  /** For `select`. */
  options?: SupportFieldOption[];
  /** Max length for free-text types. */
  maxLength?: number;
  /**
   * Show this field only when another field holds one of these values, e.g. a
   * "please specify" box that appears when Reason is "Other".
   */
  showIf?: { field: string; equals: string[] };
}

/** Tint of the context callout above the fields. */
export type SupportCalloutTone = "danger" | "warning" | "info";

/**
 * The context block at the top of the sheet — what the app already knows,
 * echoed back so the driver can confirm they're filing against the right thing.
 * In `s-02a` this is the pink "Scheduled time: 3:19 PM / 63 mins late" box.
 */
export interface SupportCallout {
  tone: SupportCalloutTone;
  /** Bold first line. */
  title: string;
  /** Secondary line under it. */
  detail?: string;
}

export type SupportResolutionPath = "auto-resolve" | "cs-queue" | "hybrid";

/** Whether a case is actually built, per the project's status-flag legend. */
export type SupportBuildState = "in-prototype" | "provisional" | "not-yet";

export interface SupportCaseDefinition {
  id: string;
  /** Driver-facing sheet title, e.g. "Late pickup reason". */
  title: string;
  /** One-line description for the options menu row. */
  summary?: string;
  category: "Trip Issue" | "Pay" | "Rider" | "Vehicle" | "App";
  buildState: SupportBuildState;
  /** Label on the primary footer button — case-specific ("Save Reason"). */
  submitLabel: string;
  /** Label on the secondary footer button. */
  cancelLabel?: string;
  fields: SupportField[];
  resolution: SupportResolutionPath;
  /** Confirmation copy shown after a successful submit. */
  successMessage?: string;
  /** What this replaces today — for deflection tracking. */
  zendeskEquivalent?: string;
}

export type SupportRequestStatus =
  | "Submitted"
  | "In Review"
  | "Needs Info"
  | "Resolved"
  | "Rejected";

export interface SupportRequest {
  id: string;
  caseId: string;
  tripId: string;
  legId?: string;
  status: SupportRequestStatus;
  submittedAt: string;
  /** Field id → submitted value. */
  values: Record<string, string>;
}
