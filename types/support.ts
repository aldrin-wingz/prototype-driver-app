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
export type SupportFieldType =
  | "select"
  | "textarea"
  | "text"
  | "time"
  | "date"
  | "number"
  | "file"
  /**
   * Draw-to-sign attestation.
   *
   * Belongs LAST in a field set: the driver is signing for what they just filled
   * in, so anything after it would be signed for before it was written.
   */
  | "signature"
  /** One control for a date AND a time. */
  | "datetime"
  /** A number with − / + buttons either side. */
  | "stepper"
  /** Searchable picker over the driver's own legs. Selecting one drives prefill. */
  | "leg-picker"
  /** Searchable picker over members the driver has driven recently. */
  | "member-picker"
  /**
   * A repeating row group, e.g. one row per expected leg.
   *
   * Its columns come from `rowFields`. The runtime's only composite type — every
   * other field owns exactly one value.
   */
  | "leg-repeater"
  /**
   * Not an input — a block of copy standing in for a field set that isn't built.
   *
   * An issue can be a real, registered support case while its questions are still
   * unknown. Showing the notice keeps the issue visible in the dropdown without
   * implying the flow behind it works.
   */
  | "notice";

/**
 * Where a field's value comes from when the app already knows it.
 *
 * This is the point of moving these forms in-app: the web form makes drivers
 * retype the leg id, the pick-up date, their own email address and every
 * timestamp the app already recorded. Anything resolvable here arrives prefilled
 * so the driver only supplies what is genuinely new.
 */
export type SupportPrefillSource =
  | "issueType"
  | "driverEmail"
  | "riderName"
  /**
   * The member's number as the app has it on file.
   *
   * Resolves to `""` when the trip carries none, which leaves the field editable
   * so the driver can say what they actually tried.
   */
  | "riderPhone"
  | "pickupDate"
  | "legPositionLetter"
  | "legId"
  | "enRouteTime"
  | "pickupTime"
  | "dropOffTime"
  /** Arrival at the pick-up, when the app recorded one. */
  | "arrivedAt";

export interface SupportFieldOption {
  value: string;
  label: string;
}

/** Which of the driver's legs a leg picker offers. */
export type LegScope = "all" | "in-progress";

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
  /**
   * Required in the real flow, but not enforced here.
   *
   * For a field the live product would insist on that a prototype cannot
   * reasonably demand — an uploaded file being the obvious one, since nobody
   * walking through a demo has a call-log screenshot to hand. Keeps the asterisk
   * so the real requirement is visible, and carries the project's flag wording in
   * help text so a passable required field doesn't read as a bug.
   */
  requiredNotEnforced?: boolean;
  /** For `select`. */
  options?: SupportFieldOption[];
  /** Max length for free-text types. */
  maxLength?: number;
  /**
   * Show this field only when another field holds one of these values, e.g. a
   * "please specify" box that appears when Reason is "Other".
   */
  showIf?: { field: string; equals: string[] };
  /** Resolve this field's initial value from the ride rather than the driver. */
  prefillFrom?: SupportPrefillSource;
  /**
   * For `leg-picker` — which of the driver's legs are offered.
   *
   * `"in-progress"` restricts the picker to rides that are actually under way,
   * for issues that only make sense on a live trip.
   */
  legScope?: LegScope;
  /**
   * For `leg-repeater` — the columns making up one row.
   *
   * Row values live in the flat values map under `${field.id}.${index}.${rowFieldId}`,
   * and the row count under `${field.id}Count`. Flat keys rather than nested
   * objects, so drafts, prefill and the submitted-form view all keep working
   * against one `Record<string, string>`.
   */
  rowFields?: SupportField[];
  /** For `leg-repeater` — label on the add-another-row button. */
  addRowLabel?: string;
  /** For `leg-repeater` — what one row is called, e.g. "Ride" → "Ride 1". */
  rowLabel?: string;
  /**
   * For `leg-repeater` — the field that HOLDS the row count.
   *
   * Not a copy of the count, the count itself: the repeater reads and writes this
   * key, so a stepper bound to the same field and the Add / remove controls can
   * never disagree. Without it the repeater falls back to its own `${id}Count`.
   */
  rowCountFrom?: string;
  /** For `stepper` and `number` — bounds on the value. */
  min?: number;
  max?: number;
  /**
   * Starting value when the form opens blank.
   *
   * Not the same as a prefill: a prefill comes from the ride, this is just the
   * sensible place to start (one ride row, rather than none).
   */
  defaultValue?: string;
  /**
   * Lock this field once a prefilled value resolves.
   *
   * Used for values the app already recorded — a swipe time we hold is context,
   * not something the driver should retype. Evaluated per render, because which
   * timestamps are known changes with the selected leg.
   */
  lockWhenPrefilled?: boolean;
  /**
   * Badge shown beside the label while locked.
   *
   * Defaults to "Already recorded", which is right for a timestamp the app
   * captured but wrong for something taken off the ride the driver opened.
   */
  lockedBadge?: string;
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
  /**
   * The value this case maps to in the web form's "Please choose your issue
   * below" dropdown, when it replaces an existing web-form submission.
   */
  issueType?: string;
  /** One-line description for the options menu row. */
  summary?: string;
  /**
   * Purpose line at the top of the sheet.
   *
   * For the general support form this is only the fallback shown before an issue
   * is chosen — once one is, the issue's own description replaces it, because a
   * form whose field set swaps needs a purpose that swaps with it.
   */
  description?: string;
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
