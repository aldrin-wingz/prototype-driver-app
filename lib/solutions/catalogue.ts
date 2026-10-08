/**
 * The 26 proposed features from the support call analysis, made executable.
 *
 * Source: `References/Support Call Volume by Subject Area - Problems and
 * Proposed Features.xlsx`. One entry per row of that table, so the prototype
 * selector is a faithful mirror of the analysis rather than a convenient subset
 * of it — including the rows there is nothing to build for, which carry a
 * reason instead of an entry point.
 *
 * ⚠️ `calls` is the SUBJECT AREA's total, not the row's. Several rows share one
 * subject area, exactly as the spreadsheet merges those cells. Summing `calls`
 * across entries would therefore multiply-count; sum across DISTINCT subject
 * areas, which is what `scripts/verify-solutions.ts` asserts.
 */

/** Total support calls that carry a subject area at all. The denominator. */
export const CATEGORIZED_CALLS = 7483;

/**
 * Calls covered by the 15 subject areas below.
 *
 * ⚠️ Declared, not derived. A total computed from the same array it checks
 * cannot fail. `verify-solutions` compares the array against this literal.
 */
export const COVERED_CALLS = 6665;

/**
 * What kind of thing the proposed feature is. This decides what "built" means.
 *
 * - `form`    — a driver submission, rendered by the shared support form runtime
 * - `surface` — a driver-facing screen, state, banner or control; no submission
 * - `no-app-surface` — backend, data or policy. Listed so the set stays
 *   complete and the call totals still reconcile, but there is nothing to build
 *   in the driver app.
 */
export type SolutionClass = "form" | "surface" | "no-app-surface";

/**
 * ⚠️ Project vocabulary, locked at scaffold. These render as "In prototype" and
 * "⚠️ Not in prototype yet". Never "BUILT" / "NOT-BUILT".
 */
export type BuildState = "in-prototype" | "not-yet";

export interface SolutionEntry {
  /** Where the demo starts. */
  route: string;
  /** What the driver does from there. */
  label: string;
  /**
   * Other states of the SAME slice worth showing.
   *
   * ⚠️ A slice is not always one screen. Rider No-Show has two branches of a
   * single check — the driver is at the pick-up, or they are not — and showing
   * only one of them demonstrates half the case. Alternates keep the catalogue
   * at one row per spreadsheet row while making both reachable.
   */
  alternates?: Array<{ route: string; label: string }>;
}

export interface Solution {
  id: string;
  /** 1-26, call-volume order — the order the phases are built in. */
  order: number;
  subjectArea: string;
  /** The SUBJECT AREA's call total. Shared across that area's rows. */
  calls: number;
  problem: string;
  useCase: string;
  proposedFeature: string;
  klass: SolutionClass;
  buildState: BuildState;
  /** `null` until the slice is in the prototype. */
  entry: SolutionEntry | null;
  /** Several rows can point at one build — the requests tray serves two. */
  sharedBuildWith?: string;
  /** Required when `klass` is `no-app-surface`; forbidden otherwise. */
  noSurfaceReason?: string;
}

/**
 * ⚠️ Production ALREADY collects the proof that row 02 proposes to act on.
 *
 * Selecting `Cancel At Door` on the production Member No-Show screen swaps
 * `Driver Signature` for `Member Signature` and adds a required free-text
 * `Spoke with`. Confirmed three ways: a 2026-10 production screenshot; the
 * warehouse columns `bronze.ride_observation.noshow_type` and `.spoke_with`;
 * and the shape of the data — `spoke_with` holds 3,601 DISTINCT values across
 * 6,940 Cancel At Door observations in the last 12 months (real names), versus
 * 122 and 51 distinct for the other two types, which are placeholders.
 *
 * ⛔ The Apr-2026 captures (CAP-229/230/231) show only the EMPTY state, so the
 * capture library does not contain this variant. The screenshot needs
 * registering before anything is built against it.
 *
 * So row 02 is not "add a signature". It is "stop discarding one".
 */
const NO_SHOW =
  "Driver waits → gives up and leaves → remembers the no-show → now too far for the app to accept it → calls Support";

export const SOLUTIONS: Solution[] = [
  {
    id: "rider-no-show",
    order: 1,
    subjectArea: "Member / Rider No-Show",
    calls: 882,
    problem: "Rider no-show",
    useCase: NO_SHOW,
    proposedFeature:
      "Driver files the no-show in-app at the curb; the answers submit to Zendesk as a ticket, handled asynchronously instead of on a call",
    klass: "form",
    buildState: "in-prototype",
    entry: {
      route: "/my-rides/1049800377/more",
      label:
        "More Options → Member No-Show. The driver is 0.6 mi out at a hospital campus, so waiting can never place them at the pick-up and the form is offered.",
      alternates: [
        {
          route: "/my-rides/1049800373/more",
          label:
            "The other branch — the driver IS at the pick-up but short of ten minutes, so the refusal carries a live countdown and deliberately offers NO form. A form here would be a way to skip the wait.",
        },
      ],
    },
  },
  {
    id: "cancel-at-door-signature",
    order: 2,
    subjectArea: "Member / Rider No-Show",
    calls: 882,
    problem: "Driver must still wait 10 min even after selecting Cancel at Door",
    useCase:
      "Driver selects Cancel at Door → signs the member's refusal and names who they spoke with → app enforces the 10-minute wait anyway → driver calls Support",
    proposedFeature:
      "Let the member signature the app ALREADY captures on Cancel at Door skip the 10-minute wait — the proof exists, it is just discarded",
    klass: "form",
    buildState: "not-yet",
    entry: null,
  },
  {
    id: "missed-swipe",
    order: 3,
    subjectArea: "Trip Data Update / Completion",
    calls: 805,
    problem: "Missed swipe",
    useCase:
      "Driver completes the trip → forgets to swipe at pick-up/drop-off → already left → calls Support to correct the record",
    proposedFeature:
      "In-app form to correct the swipe record after the fact, with the leg and times prefilled",
    klass: "form",
    buildState: "not-yet",
    entry: null,
  },
  {
    id: "tag-number-invalid",
    order: 4,
    subjectArea: "Trip Confirmation",
    calls: 747,
    problem:
      "Driver wants to push through with the trip but cannot reach the member",
    useCase:
      "Ex 1 — Number is invalid → Support calls to confirm it is invalid → Support calls the broker for a new number",
    proposedFeature:
      "Driver tags the number invalid from the app so Support skips the verification call",
    klass: "surface",
    buildState: "not-yet",
    entry: null,
  },
  {
    id: "cannot-reach-member",
    order: 5,
    subjectArea: "Trip Confirmation",
    calls: 747,
    problem:
      "Driver wants to push through with the trip but cannot reach the member",
    useCase:
      "Ex 2 — Driver calls the facility → hits a confusing IVR → gives up → Support navigates the IVR for them",
    proposedFeature:
      "“Cannot reach member” in-app form where the driver adds what they tried; filed asynchronously instead of being held on the line",
    klass: "form",
    buildState: "not-yet",
    entry: null,
  },
  {
    id: "ai-assistant",
    order: 6,
    subjectArea: "Trip-Related Questions",
    calls: 657,
    problem: "Random questions that are unclear to the driver",
    useCase:
      "Ex 1 — Instruction reads “Do not book Police department: UBM” → driver cannot tell what it means → calls Support",
    proposedFeature:
      "In-app AI assistant answering from Help Desk articles and the current leg's own data, escalating anything it cannot resolve",
    klass: "surface",
    buildState: "not-yet",
    entry: null,
  },
  {
    id: "multiload-disclosure",
    order: 7,
    subjectArea: "Trip-Related Questions",
    calls: 657,
    problem: "Random questions that are unclear to the driver",
    useCase:
      "Ex 2 — Driver assigned a multiload → unsure the member agreed to share → calls Support to verify",
    proposedFeature:
      "Ride Details states plainly that the leg is shared, how many riders, and that the client authorised it",
    klass: "surface",
    buildState: "not-yet",
    entry: null,
  },
  {
    id: "coded-term-definitions",
    order: 8,
    subjectArea: "Trip-Related Questions",
    calls: 657,
    problem: "Random questions that are unclear to the driver",
    useCase:
      "Ex 3 — Driver sees C2C / D2D on the trip → does not know what they mean → calls Support",
    proposedFeature: "Tap any coded term on Ride Details for a one-line definition",
    klass: "surface",
    buildState: "not-yet",
    entry: null,
  },
  {
    id: "auto-assign-request",
    order: 9,
    subjectArea: "Trip / Ride Assignment",
    calls: 610,
    problem: "Member wants the same driver next time",
    useCase:
      "Member asks → driver calls to confirm it is assigned → trip is not created yet → Support asks the broker → broker is slow → repeat follow-ups",
    proposedFeature: "In-app request to be auto-assigned that member's future trips",
    klass: "form",
    buildState: "not-yet",
    entry: null,
  },
  {
    id: "request-feed-member-filter",
    order: 10,
    subjectArea: "Trip / Ride Assignment",
    calls: 610,
    problem: "Member wants the same driver next time",
    useCase:
      "Member asks → driver calls to confirm it is assigned → trip is not created yet → Support asks the broker → broker is slow → repeat follow-ups",
    proposedFeature:
      "Request Feed filter by member, so the driver can find that member's trips themselves",
    klass: "surface",
    buildState: "not-yet",
    entry: null,
  },
  {
    id: "vehicle-capacity-cleanse",
    order: 11,
    subjectArea: "Trip / Ride Assignment",
    calls: 610,
    problem: "Driver blocked by over-capacity logic",
    useCase: "Driver tries to take a trip → blocked by over-capacity → calls Support",
    proposedFeature:
      "One-off cleanse of stored vehicle capacity so the block reflects the real vehicle",
    klass: "no-app-surface",
    buildState: "not-yet",
    entry: null,
    noSurfaceReason:
      "A one-off cleanse of stored vehicle-capacity data. Nothing for the driver app to show.",
  },
  {
    id: "vehicle-capacity-backend",
    order: 12,
    subjectArea: "Trip / Ride Assignment",
    calls: 610,
    problem: "Driver blocked by over-capacity logic",
    useCase: "Driver tries to take a trip → blocked by over-capacity → calls Support",
    proposedFeature:
      "Backend path that updates capacity when a driver changes vehicle, so it stays correct",
    klass: "no-app-surface",
    buildState: "not-yet",
    entry: null,
    noSurfaceReason:
      "A backend path that keeps stored capacity correct when a vehicle changes. No driver-facing surface.",
  },
  {
    id: "send-back-reason-form",
    order: 13,
    subjectArea: "Send-back",
    calls: 609,
    problem: "Send-backs denied, specifically Standing Orders",
    useCase: "Driver needs to send back an SO → denied → calls Support",
    proposedFeature:
      "In-app send-back reason form that can bypass the Standing Order block",
    klass: "form",
    buildState: "not-yet",
    entry: null,
  },
  {
    id: "send-back-scoring",
    order: 14,
    subjectArea: "Send-back",
    calls: 609,
    problem: "Drivers avoid in-app send-back to dodge a penalty",
    useCase:
      "Driver wants out of a trip → avoids the in-app button → calls Support instead",
    proposedFeature:
      "Score a Support-mediated send-back identically to an in-app one, and weight the penalty by reason so a legitimate send-back is free",
    klass: "surface",
    buildState: "not-yet",
    entry: null,
  },
  {
    id: "account-self-service",
    order: 15,
    subjectArea: "Other / not listed (catch-all)",
    calls: 567,
    problem: "Driver cannot update their own account details in the app",
    useCase:
      "Ex 1 — Email needs changing → no in-app route → calls Support\nEx 2 — Password needs resetting → calls Support\nEx 3 — Phone number needs changing → calls Support",
    proposedFeature:
      "Let drivers change their own email, password and phone number in the app",
    klass: "surface",
    buildState: "not-yet",
    entry: null,
  },
  {
    id: "rider-initiated-cancellation",
    order: 16,
    subjectArea: "Trip / Ride Cancellation",
    calls: 509,
    problem:
      "Driver wants Support to cancel the trip so it is not counted against them",
    useCase:
      "Member declines during member confirmation → the driver's own route out is a send-back, which penalises them → so they call Support to cancel it instead",
    proposedFeature:
      "In-app rider-initiated cancellation form that records the member's cancellation as a cancellation, not as a driver send-back",
    klass: "form",
    buildState: "not-yet",
    entry: null,
  },
  {
    id: "requests-tray",
    order: 17,
    subjectArea: "Trip / Ride Cancellation",
    calls: 509,
    problem: "Driver cannot easily see whether the cancellation went through",
    useCase:
      "Driver reports it → client takes a while to confirm → nothing obvious changes in the app → driver calls back repeatedly",
    proposedFeature:
      "Requests tray — one list of every in-app request the driver has submitted and its current state",
    klass: "surface",
    buildState: "not-yet",
    entry: null,
  },
  {
    id: "requests-tray-modifications",
    order: 18,
    subjectArea: "Trip / Ride Modification",
    calls: 364,
    problem:
      "Confirming a request was handled takes hunting, so the driver stays on the line",
    useCase:
      "Driver asks for a leg to be added → the only way to check is to open upcoming rides and find the member's name for that day → not explicit enough to rely on → stays on the call until Support confirms it",
    proposedFeature:
      "Requests tray — one list of every in-app request the driver has submitted and its current state",
    klass: "surface",
    buildState: "not-yet",
    entry: null,
    sharedBuildWith: "requests-tray",
  },
  {
    id: "add-leg-request",
    order: 19,
    subjectArea: "Trip / Ride Modification",
    calls: 364,
    problem: "A leg needs to be added",
    useCase: "Trip needs an extra leg → driver calls Support to add it",
    proposedFeature:
      "In-app request form to add a leg, tagged critical when it is same-day or the driver has already started",
    klass: "form",
    buildState: "not-yet",
    entry: null,
  },
  {
    id: "change-pickup-dropoff",
    order: 20,
    subjectArea: "Trip / Ride Modification",
    calls: 364,
    problem: "A leg's pick-up/drop-off address or time needs changing",
    useCase:
      "Address or time is wrong on an existing leg → driver calls Support to change it",
    proposedFeature:
      "In-app form to request a change to a leg's pick-up or drop-off address or time",
    klass: "form",
    buildState: "not-yet",
    entry: null,
  },
  {
    id: "eta-send-back-explicit",
    order: 21,
    subjectArea: "ETA Request",
    calls: 196,
    problem: "Driver needs the member told about a changed arrival",
    useCase:
      "Driver knows they will arrive early or late → cannot reach the member → calls Support to relay it",
    proposedFeature:
      "Make it explicit in the flow that a driver who cannot accommodate the timing sends the trip back, rather than asking Support to relay a message",
    klass: "surface",
    buildState: "not-yet",
    entry: null,
  },
  {
    id: "compliance-status",
    order: 22,
    subjectArea: "Compliance Related",
    calls: 167,
    problem: "Driver confirming their requirements were received",
    useCase:
      "Driver submits requirements → no confirmation in the app that it landed → calls Support to check",
    proposedFeature:
      "Compliance section in the driver app showing which requirements have been received and which are outstanding",
    klass: "surface",
    buildState: "not-yet",
    entry: null,
  },
  {
    id: "dispatch-chat",
    order: 23,
    subjectArea: "Trip Requests",
    calls: 156,
    problem: "Driver asking for more trips — not Support's role",
    useCase: "Driver wants more work → calls Support to ask",
    proposedFeature:
      "In-app chat with Dispatch, so drivers ask for work there instead of calling Support",
    klass: "surface",
    buildState: "not-yet",
    entry: null,
  },
  {
    id: "distribution-restriction",
    order: 24,
    subjectArea: "Payment Issues",
    calls: 146,
    problem: "Driver wants to know when they will get paid",
    useCase:
      "Driver is suspended → loses access to the app → cannot check their payout themselves → calls Support",
    proposedFeature:
      "Restrict trip distribution for non-compliant drivers instead of suspending them, so they keep app access and can check their own earnings",
    klass: "surface",
    buildState: "not-yet",
    entry: null,
  },
  {
    id: "technical-issues",
    order: 25,
    subjectArea: "Technical Issues",
    calls: 127,
    problem: "Generic and varied — no single recurring cause",
    useCase:
      "Most recent frequent blocker: Zendesk chat stopped working → driver had no route in → called Support",
    proposedFeature: "—",
    klass: "no-app-surface",
    buildState: "not-yet",
    entry: null,
    noSurfaceReason:
      "No proposal yet. The subject area is generic and has no single recurring cause to design against.",
  },
  {
    id: "otp-exclusion",
    order: 26,
    subjectArea: "OTP",
    calls: 123,
    problem: "Drivers are dinged for lateness even when the delay was legitimate",
    useCase:
      "Driver is late for a good reason → submits a Late Reason form → reason is recorded but the trip still counts against OTP → strict client flags the OTP miss → calls follow, with no way to exclude the trip",
    proposedFeature:
      "Allow a trip to be excluded from the OTP calculation when the late reason is accepted",
    klass: "surface",
    buildState: "not-yet",
    entry: null,
  },
];

/** Share of categorised calls this entry's subject area accounts for. */
export function shareOfCategorized(solution: Solution): number {
  return solution.calls / CATEGORIZED_CALLS;
}

export function formatShare(solution: Solution): string {
  return `${(shareOfCategorized(solution) * 100).toFixed(1)}%`;
}

export function findSolution(id: string | null): Solution | undefined {
  if (!id) return undefined;
  return SOLUTIONS.find((s) => s.id === id);
}

/** ⚠️ Locked vocabulary. Never "BUILT" / "NOT-BUILT". */
export function buildStateLabel(state: BuildState): string {
  return state === "in-prototype" ? "In prototype" : "⚠️ Not in prototype yet";
}

export const CLASS_LABEL: Record<SolutionClass, string> = {
  form: "In-app form",
  surface: "App surface",
  "no-app-surface": "No driver-app surface",
};

/** Subject areas in call order, each appearing once. */
export function subjectAreaGroups(): Array<{ subjectArea: string; calls: number; solutions: Solution[] }> {
  const groups: Array<{ subjectArea: string; calls: number; solutions: Solution[] }> = [];
  for (const s of [...SOLUTIONS].sort((a, b) => a.order - b.order)) {
    const last = groups[groups.length - 1];
    if (last && last.subjectArea === s.subjectArea) last.solutions.push(s);
    else groups.push({ subjectArea: s.subjectArea, calls: s.calls, solutions: [s] });
  }
  return groups;
}
