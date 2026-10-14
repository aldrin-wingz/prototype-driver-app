import { showsProposal, type DemoFocus } from "@/lib/solutions/demo-mode";
import type { Trip, TripLeg } from "@/lib/driver-data/mock-trips";
import type { SupportFieldOption } from "@/types/support";

/**
 * Update Trip Details — catalogue row **20**, `Trip / Ride Modification`,
 * 364 calls.
 *
 * The driver asks Support to change a ride's pick-up or drop-off **time or
 * address**. They cannot change it themselves and the form never pretends they
 * can: what it produces is a request, and the ride goes on showing its old
 * values until the client acts.
 *
 * ⛔⛔ **"Leg" means two things in this app and row 22 uses the one the code does
 * not.** Driver-facing, "A Leg" / "B Leg" are the outbound ride and the return —
 * two `Trip` objects tied by `tripGroup`, which is what row 17's checklist walks.
 * In the data model `Trip.legs[]` is something else entirely: the **time anchors**
 * on ONE ride's timeline. Row 22 is about the first sense, so there is no
 * checklist here and no round-trip question — the form is about the ride the
 * driver opened, and the anchors are its two ends.
 */

/** The driver-facing name of the whole thing — tile, issue label and sheet title. */
export const TRIP_CHANGE_LABEL = "Update Trip Details";

/**
 * Which end of the ride an anchor is.
 *
 * ⚠️ Derived from POSITION, not from `TimeAnchorType`. The seed labels a
 * destination `appointment` on 24 trips and `scheduled` on 2, and uses
 * `scheduled` for a pick-up as well — so the type cannot tell an end from a
 * middle. Position can: first is the pick-up, last is the drop-off, anything
 * between is a stop.
 */
export type ChangeAnchorKind = "pickup" | "stop" | "dropoff";

export interface ChangeAnchor {
  /** The anchor's own leg id, or the trip id for the first anchor. */
  legId: string;
  /** Position in `trip.legs`, and the only thing field ids are built from. */
  index: number;
  kind: ChangeAnchorKind;
  /**
   * The anchor's label **exactly as the ride prints it** — "Est Pick-up Time",
   * "Appointment Time", "Scheduled Drop-off".
   *
   * ⛔ Used verbatim as the time field's label. A form that said "Drop-off time"
   * beside a ride that says "Appointment Time" would be asking the driver to
   * work out whether those are the same row. They are, and nothing in the app
   * says so.
   */
  label: string;
  /** What the form calls the address for this anchor. */
  addressLabel: string;
  /** Clock face as seeded, e.g. "11:05 AM". */
  time: string;
  address: string;
  /**
   * The ride has already moved past this anchor.
   *
   * A passed anchor is shown LOCKED, not hidden: Support still needs to see what
   * the other end currently is, and a driver looking at half a form cannot tell
   * whether the rest is missing or merely settled.
   */
  passed: boolean;
}

/**
 * The badge beside a locked anchor's fields.
 *
 * ⛔ **Not "Already recorded" and not "Already happened".** Both claim the value
 * beside them is something the app captured, and it is not: a locked field shows
 * the ride's SCHEDULED time — 1:20 PM — while the swipe that passed it landed at
 * 1:22 PM. What has happened is the END, not the number. Caught in the walk on
 * 2026-10-13, after the badge went out saying the opposite.
 *
 * ⚠️ For the same reason it does not fall through to the renderer's default,
 * which is "Already recorded" and belongs on a timestamp the app took.
 */
export const PASSED_ANCHOR_BADGE = "This end is behind you";

/** The noun the form uses for an anchor's address. */
function addressNoun(kind: ChangeAnchorKind): string {
  if (kind === "pickup") return "Pick-up";
  if (kind === "dropoff") return "Drop-off";
  return "Stop";
}

/**
 * Has the ride moved past this anchor?
 *
 * ⚠️ Read off the SWIPES, never off a clock. The prototype has no live clock to
 * compare a scheduled time against — `MOCK_TODAY` is a string in the seed — so
 * "has this happened" can only mean "did the driver mark it".
 *
 * ⛔ `progress` lives on the first anchor only, which is where the seed puts it.
 * The destination anchor has no `progress` of its own, so its state has to be
 * read from the pick-up anchor's `droppedOffAt`. Reading `leg.progress` on the
 * destination would find `undefined` and call a finished drop-off editable.
 */
function anchorPassed(trip: Trip, kind: ChangeAnchorKind): boolean {
  const progress = trip.legs.find((leg) => leg.progress)?.progress;
  if (!progress) return false;
  if (kind === "pickup") return Boolean(progress.pickedUpAt);
  // A stop and the drop-off both end with the ride.
  return Boolean(progress.droppedOffAt);
}

/** Every anchor on the ride, in timeline order, with its edit state worked out. */
export function changeAnchors(trip: Trip): ChangeAnchor[] {
  const last = trip.legs.length - 1;
  return trip.legs.map((leg: TripLeg, index) => {
    const kind: ChangeAnchorKind =
      index === 0 ? "pickup" : index === last ? "dropoff" : "stop";
    return {
      legId: leg.id,
      index,
      kind,
      label: leg.label,
      addressLabel: `${addressNoun(kind)} address`,
      time: leg.time,
      address: leg.address,
      passed: anchorPassed(trip, kind),
    };
  });
}

/** The anchors a driver can still ask to change. */
export function editableAnchors(trip: Trip): ChangeAnchor[] {
  return changeAnchors(trip).filter((anchor) => !anchor.passed);
}

/**
 * Ride states the entry points appear on.
 *
 * ⛔ `before-taken` is deliberately absent. That is an offer the driver has not
 * accepted, and "I would take it if it were an hour later" is **row 23** — the
 * ETA row, whose proposal is that a driver who cannot accommodate the timing
 * sends the trip back. Offering this form there would answer row 23 without
 * specifying it.
 *
 * ⛔ `completed` likewise. A finished ride's times are history, and correcting
 * them is **row 03, Missed Swipe**, which owns that already.
 */
export const TRIP_CHANGE_STATES: readonly string[] = [
  "needs-action",
  "in-progress",
];

/** Whether this ride's state admits a change request at all. */
export function stateAllowsTripChange(state: string): boolean {
  return TRIP_CHANGE_STATES.includes(state);
}

/**
 * Whether the driver can open the form on this ride right now.
 *
 * Three conditions, and they fail for three different reasons the copy below
 * tells apart.
 */
export function canRequestTripChange(
  trip: Trip,
  state: string,
  alreadyRequested: boolean
): boolean {
  return (
    stateAllowsTripChange(state) &&
    !alreadyRequested &&
    editableAnchors(trip).length > 0
  );
}

/**
 * Why the form would not open.
 *
 * ⚠️ Three distinct messages, following `NO_SHOW_STAGE_REFUSAL`: a driver told
 * "you can't do that here" learns nothing, and the three causes have three
 * different next steps.
 */
export const TRIP_CHANGE_REFUSAL = {
  state:
    "This ride is not one you can ask us to change. Call Support if something about it is wrong.",
  pending:
    "This ride already has a change request with Support. They will come back to you about it.",
  allPassed:
    "This ride is already under way past both ends, so there is nothing left to change. Call Support if something about it is wrong.",
} as const;

/** The refusal that applies, or `null` when the form opens. */
export function tripChangeRefusal(
  trip: Trip,
  state: string,
  alreadyRequested: boolean
): string | null {
  if (!stateAllowsTripChange(state)) return TRIP_CHANGE_REFUSAL.state;
  if (alreadyRequested) return TRIP_CHANGE_REFUSAL.pending;
  if (editableAnchors(trip).length === 0) return TRIP_CHANGE_REFUSAL.allPassed;
  return null;
}

/**
 * Whether the pencil and the tile are drawn at all, for the solution in focus.
 *
 * ⛔⛔ **A proposal belongs to its own build.** `buildGridTiles` has enforced
 * this on the More Options grid since Phase 6 — and the Reach Rider modal's
 * fourth option escaped it until the user caught it on 2026-10-13. The pencil on
 * the ride is a third surface with the same obligation, so the rule is named
 * here where both the grid and the ride can read the same one.
 *
 * `null` means nothing is focused, which means no filtering — the same reading
 * `ridesForSolution` and `buildGridTiles` take.
 */
export const TRIP_CHANGE_SOLUTION = "change-pickup-dropoff";
export const TRIP_CHANGE_SOLUTIONS: readonly string[] = [TRIP_CHANGE_SOLUTION];
export function showsTripChangeEntry(focus: DemoFocus): boolean {
  return showsProposal(focus, TRIP_CHANGE_SOLUTIONS);
}

// ---- Field ids ---------------------------------------------------------
//
// ⚠️ Built from the anchor INDEX, not from the leg id. Leg ids carry suffixes
// ("1049800398-b") and the first anchor's id is the trip id itself, so an id
// built from them would be unstable in a way the `requireChangedFrom` list and
// the submitted-values map both depend on not being.

export function changeTimeFieldId(index: number): string {
  return `changeTime${index}`;
}

export function changeAddressFieldId(index: number): string {
  return `changeAddress${index}`;
}

/** Who asked for the change, and the free-text box beside it. */
export const CHANGE_SOURCE_FIELD = "changeRequestedBy";
export const CHANGE_NOTES_FIELD = "changeNotes";

/**
 * Who the change came from.
 *
 * ⚠️ **Not in the user's four-field list, and required anyway.** A driver does
 * not invent a new pick-up address — somebody told them. Support's first move on
 * a bare "move this to 11:30" is to find out who said so, and a form that cannot
 * answer that produces the callback this row exists to remove.
 *
 * ⛔ No "Other": every row below is a person or a discovery, and the free-text
 * box beside it takes whatever does not fit. An Other option here would collect
 * the same sentence twice.
 */
export const CHANGE_SOURCE_OPTIONS: readonly SupportFieldOption[] = [
  { value: "member", label: "The member told me" },
  { value: "caregiver", label: "A caregiver or family member told me" },
  { value: "facility", label: "The facility told me" },
  { value: "client", label: "Dispatch or the client told me" },
  { value: "driver", label: "I found the details are wrong" },
];

/**
 * One change the driver is asking for.
 *
 * Holds BOTH values, because a request that named only the new one would arrive
 * at Support with nothing to compare it against — and the ride itself goes on
 * showing the old value, so the pair is what makes the banner readable.
 */
export interface TripChange {
  /** The anchor's label as the ride prints it. */
  anchorLabel: string;
  /** "time" or the address label. */
  what: string;
  was: string;
  asked: string;
}

/**
 * What actually changed, comparing what the driver submitted against what the
 * form opened with.
 *
 * ⛔⛔ **This is the whole case.** Every form before this one asked for values
 * the app did not have; this one opens with every answer already filled in, so
 * the request is the DIFF and nothing else. A submission with an empty diff is a
 * request to change a ride to exactly what it already is.
 *
 * ⚠️ Times are compared as the `<input type="time">` values they are ("11:05"),
 * never as clock faces — the two formats are not comparable and a mixed compare
 * would report every untouched time as changed.
 */
export function tripChanges(
  anchors: ChangeAnchor[],
  initialValues: Record<string, string>,
  values: Record<string, string>
): TripChange[] {
  const changes: TripChange[] = [];
  for (const anchor of anchors) {
    if (anchor.passed) continue;
    const timeId = changeTimeFieldId(anchor.index);
    const addressId = changeAddressFieldId(anchor.index);
    const timeBefore = initialValues[timeId] ?? "";
    const timeAfter = values[timeId] ?? "";
    if (timeAfter !== timeBefore) {
      changes.push({
        anchorLabel: anchor.label,
        what: "time",
        was: timeBefore,
        asked: timeAfter,
      });
    }
    const addressBefore = initialValues[addressId] ?? "";
    const addressAfter = values[addressId] ?? "";
    if (addressAfter.trim() !== addressBefore.trim()) {
      changes.push({
        anchorLabel: anchor.label,
        what: anchor.addressLabel.toLowerCase(),
        was: addressBefore,
        asked: addressAfter.trim(),
      });
    }
  }
  return changes;
}

/**
 * The field ids the diff gate watches.
 *
 * Only the editable anchors: a locked field cannot change, so naming it here
 * would put a field in the gate's list that can never satisfy it.
 */
export function changeWatchedFields(anchors: ChangeAnchor[]): string[] {
  return anchors
    .filter((anchor) => !anchor.passed)
    .flatMap((anchor) => [
      changeTimeFieldId(anchor.index),
      changeAddressFieldId(anchor.index),
    ]);
}

// ---- What the ride says afterwards -------------------------------------

export const TRIP_CHANGE_REQUESTED_TITLE = "Change requested";
export const TRIP_CHANGE_REQUESTED_DETAIL =
  // ⛔ Not "the ride below". Copy cannot see layout — this banner's position is
  // decided in `ride-detail-layout.tsx` and the sentence lives here — so a line
  // that points at a neighbouring block is making a claim it is in no position
  // to make. Row 17 shipped three of these before a check caught them.
  "Support has your request. This ride still shows what the client has — it will not change until they update it.";
export const TRIP_CHANGE_SUBMIT_TOAST =
  "Support has what you asked for. The ride still shows the old details until the client updates them.";

/**
 * ⛔ The app never learns the outcome.
 *
 * The client owns the manifest. Whether they accept the new time never comes
 * back down to the driver's app, so this case files with `appTracksStatus:
 * false` like rows 05, 09, 14 and 17 — and what the ride shows claims only what
 * we did, never what happened next.
 *
 * Knowing the outcome is **catalogue row 18**, the requests tray, 509 calls and
 * specified nowhere. Row 22 is the fifth build leaning on it.
 */
export const TRIP_CHANGE_TRACKED_BY_APP = false;
