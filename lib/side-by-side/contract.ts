/**
 * PROTOTYPE — side-by-side contract, schema 4 (Verida GA, 2026-11-20; compliance + clock 2026-11-23;
 * OCR dates, staff change requests, last trip + BGC Check Fee, consent rounds, pre-adverse dispute 2026-11-24).
 *
 * ⛔ This file exists twice, byte for byte:
 *   wingz-cs-tool            lib/prototype/side-by-side/contract.ts   (the harness and the engine live here)
 *   prototype-driver-app     lib/side-by-side/contract.ts             (renders the driver pane)
 * `contract.ts.sha256` sits beside both; each repo's verify script fails if the file and its hash disagree.
 * Change it in the CS Tool repo, copy it across, regenerate both hashes.
 *
 * The harness page owns one driver's state. The engine derives every gate and status; the driver
 * app only renders what it is given and reports what the driver did. No data leaves the browser.
 */

export const SBS_SCHEMA = 4 as const;

/** The one synthetic driver the side-by-side shows. Not a real record. */
export const SBS_DRIVER_ID = 700901;

export type SbsStepStatus = "locked" | "in_progress" | "pending_review" | "change_requested" | "completed";
export type SbsValueSource = "driver" | "agent" | "ai";
export type SbsActor = "driver" | "agent" | "system";

export interface SbsValue {
  value: unknown;
  source: SbsValueSource;
}

export interface SbsChangeRequest {
  fields: string[];
  reason: string;
  /**
   * 2026-11-24: the flagged fields are staff uploads (e.g. D.Lawson's report): the request goes to Onboarding, who
   * replaces the file. The driver has nothing to change, so the app does not show the step as Change Requested.
   */
  forStaff?: boolean;
}

/** What has happened to one template step (form). */
export interface SbsStep {
  submitted: boolean;
  verified: boolean;
  changeRequest: SbsChangeRequest | null;
  values: Record<string, SbsValue>;
}

/** The stage list the driver sees, in order. Step ids point into the shared payload. */
export interface SbsStage {
  id: string;
  title: string;
  layout: "linear" | "accordion";
  advancement: "auto" | "manual";
  stepIds: string[];
  /** Set when this stage differs from the production template (shown with a "Proposed" tag). */
  proposed?: string;
}

export interface SbsLogEntry {
  seq: number;
  actor: SbsActor;
  text: string;
}

export type SbsCheck = "bgc" | "mvr" | "drug";
export type SbsResult = "pending" | "pass" | "fail" | "decisional";
export type SbsLifecycle = "in_progress" | "on_hold" | "rejected" | "for_final_compliance_review" | "for_activation" | "activated";

/** A value on a Compliance requirement card: copied from onboarding (D20/D21/D25/D30) or entered by Compliance. */
export interface SbsComplianceValue {
  value: unknown;
  source: SbsValueSource;
  /** The onboarding step it was copied from (Request Changes before activation flags that step). Null = Compliance entered it. */
  fromStepId: string | null;
  /** The prototype day it arrived. */
  on: string;
}

/** Compliance's decision on one requirement. It holds only while the card's data is what was reviewed (`sig`). */
export interface SbsReview {
  state: "approved" | "change_requested";
  sig: string;
  on: string;
}

/** D28–D31: one pre-adverse case per driver, started from a D.Lawson card. */
export interface SbsPreAdverse {
  slug: string;
  startedOn: string;
  /** 5 business days after the start (D31): Send post-adverse unlocks then. */
  rejectFrom: string;
  /** Luis 2026-11-24: the driver disputes — the clock stops; Compliance then rejects (with a reason) or removes the hold. */
  disputedOn?: string | null;
  /** The lifecycle the hold replaced, restored on Remove from hold. An activated driver stays activated (no hold). */
  heldFrom: SbsLifecycle;
}

/** Phase C, activated driver: one renewal the driver sent from the app (the In-App Compliance build's upload status). */
export interface SbsRenewalUpload {
  status: "in_review" | "pending" | "change_requested" | "approved";
  how?: "upload" | "attest" | "date" | "esign";
  attested?: boolean;
  givenDate?: string;
  /** 2026-11-24: the date OCR read from this round's document (the driver's upload, or the one Compliance attached). */
  ocrDate?: string;
  /** 2026-11-24 (D.Lawson round): Compliance approved the signed consent; the checks stay Pending Review until the report. */
  consentApproved?: boolean;
  resubmitted?: boolean;
  agent_note?: string | null;
  /** The prototype day it was sent. */
  on: string;
}

export interface SbsRenewal {
  /** The app's requirement slug → its latest renewal this round. */
  uploads: Record<string, SbsRenewalUpload>;
  /** D20/D22: the day Compliance uploaded this round's EPassport (the app shows it only then). */
  epassportGivenOn: string | null;
}

export interface SbsCompliance {
  /** Field slug → value. Requirements read their fields from here (one value can show on two cards, e.g. the D.Lawson report). */
  fields: Record<string, SbsComplianceValue>;
  /** Requirement slug → Compliance's decision. */
  reviews: Record<string, SbsReview>;
  /** "Send to Onboarding For Activation" done. */
  sentForActivation: boolean;
  preAdverse: SbsPreAdverse | null;
  /** Activated: In-App Compliance renewals. */
  renewal: SbsRenewal;
}

export interface SbsState {
  schema: typeof SBS_SCHEMA;
  driver: { id: number; first: string; last: string };
  /** On: the 2026-11-20 proposals apply (proposals.ts). Off: production-based payload as is. */
  proposalsOn: boolean;
  /** D.Lawson results, filed by Compliance. */
  results: Record<SbsCheck, SbsResult>;
  lifecycle: SbsLifecycle;
  lifecycleReason: string | null;
  /** The submitted Getting Started market answer. Null = no market yet. */
  marketState: string | null;
  /** Derived by the engine from `marketState`. */
  stages: SbsStage[];
  steps: Record<string, SbsStep>;
  /** Derived by the engine. Every step of every listed stage has one. */
  status: Record<string, SbsStepStatus>;
  /** The step the driver app shows. */
  cursorStepId: string | null;
  /** The prototype's today (YYYY-MM-DD); the bar moves it forward. */
  today: string;
  /** 2026-11-24 (Nov 20 meeting): the driver's last completed trip. More than 60 days ago = the renewal fee is due. Null = none. */
  lastTripOn: string | null;
  compliance: SbsCompliance;
  log: SbsLogEntry[];
}

export type SbsAction =
  | { type: "driver/submitStep"; stepId: string; values: Record<string, unknown>; marketState?: string | null }
  | { type: "driver/open"; stepId: string }
  | { type: "agent/verify"; stepId: string }
  | { type: "agent/requestChanges"; stepId: string; fields: string[]; reason: string }
  | { type: "agent/setValue"; stepId: string; slug: string; value: unknown }
  | { type: "agent/setLifecycle"; lifecycle: SbsLifecycle; reason?: string | null }
  | { type: "system/result"; check: SbsCheck; result: SbsResult }
  | { type: "bar/setProposals"; on: boolean }
  | { type: "bar/advanceDays"; days: number }
  | { type: "bar/setLastTrip"; on: string | null }
  /** Prototype setup only: put a card's date where a scenario needs it (stands in for time passing). Never Compliance. */
  | { type: "bar/setDate"; field: string; value: string }
  | { type: "driver/renew"; slug: string; how: "upload" | "attest" | "date" | "esign"; givenDate?: string }
  | { type: "compliance/approve"; slug: string }
  | { type: "compliance/requestChanges"; slug: string; note?: string }
  | { type: "compliance/clear"; slug: string }
  | { type: "compliance/setValue"; slug: string; field: string; value: unknown }
  | { type: "compliance/sendForActivation" }
  | { type: "compliance/startPreAdverse"; slug: string }
  /** Remove from hold: closes the case (from a dispute). */
  | { type: "compliance/liftPreAdverse" }
  /** Send post-adverse: reject, reason "Failed background check", post-adverse email (from 5 business days). */
  | { type: "compliance/rejectFailedBackgroundCheck" }
  | { type: "compliance/disputePreAdverse" }
  /** From a dispute: reject with Compliance's reason. */
  | { type: "compliance/rejectDisputed"; reason: string };

export type SbsMessage =
  | { kind: "sbs:state"; state: SbsState }
  | { kind: "sbs:action"; action: SbsAction }
  | { kind: "sbs:ready" };

export function isSbsMessage(data: unknown): data is SbsMessage {
  if (!data || typeof data !== "object") return false;
  const kind = (data as { kind?: unknown }).kind;
  return kind === "sbs:state" || kind === "sbs:action" || kind === "sbs:ready";
}
