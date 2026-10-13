import { showsProposal, type DemoFocus } from "@/lib/solutions/demo-mode";
import { getLegStage, MOCK_TODAY, type Trip } from "./mock-trips";
import { ALL_POOLS, groupMembers } from "./trip-groups";
import type { SupportFieldOption } from "@/types/support";

/**
 * Add Leg to Trip — catalogue row **19**, `Trip / Ride Modification`, 364 calls.
 * ⭐ The last of the ten `klass: "form"` rows.
 *
 * The member needs one more ride on the same trip — most often said at the door,
 * seconds after the driver swiped drop-off. Today that is a phone call, because
 * nothing in the app can even state where the new leg goes in the sequence.
 *
 * ⛔⛔ **"Leg" here is a `Trip` in a `tripGroup`**, not an anchor on one trip's
 * timeline. See `trip-groups.ts` — the seed contains both models and only this
 * one gives a leg its own id, revenue and swipes.
 *
 * ⛔ Filing adds NOTHING. The client owns the manifest; this is a request, and
 * the group goes on showing exactly the legs it already had.
 */

export const ADD_LEG_LABEL = "Add Leg to Trip";

/** Minutes between one leg ending and the next being able to start. */
export const LEG_TURNAROUND_MINUTES = 15;

/**
 * The estimate for a group that cannot supply one of its own.
 *
 * ⚠️ Used by the commonest real case — a **single** completed leg with no
 * sibling, so no two-anchor sample to average. Declared rather than derived so
 * the figure is visible and arguable instead of emerging from an empty mean.
 */
export const NEW_LEG_DEFAULT_MINUTES = 45;

/** What a leg of the group is doing, as far as inserting ahead of it goes. */
export type LegActivity = "completed" | "active" | "pending";

export interface GroupLeg {
  trip: Trip;
  /** Position in the group, ordered by pick-up time. */
  index: number;
  /** "A", "B", … — the position's letter, not whatever the seed happened to set. */
  letter: string;
  activity: LegActivity;
  /** Minutes past midnight, or `null` for a leg with no readable clock. */
  pickupMinutes: number | null;
  dropoffMinutes: number | null;
  pickupLabel: string;
  dropoffLabel: string;
  address: string;
}

/** "11:05 AM" → 665. `null` for anything unreadable, e.g. the `Will-Call` leg. */
export function clockToMinutes(clock: string | undefined): number | null {
  if (!clock) return null;
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(clock.trim());
  if (!match) return null;
  const hour = Number(match[1]) % 12;
  const minutes = Number(match[2]);
  return (match[3].toUpperCase() === "PM" ? hour + 12 : hour) * 60 + minutes;
}

/** 665 → "11:05 AM". */
export function minutesToClock(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const hour24 = Math.floor(wrapped / 60);
  const shown = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${shown}:${String(wrapped % 60).padStart(2, "0")} ${hour24 < 12 ? "AM" : "PM"}`;
}

/** "14:05" (an `<input type="time">` value) → 845. */
export function timeInputToMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** 845 → "14:05". */
export function minutesToTimeInput(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;
}

const LETTERS = ["A", "B", "C", "D", "E", "F"];

/**
 * How far along a leg is.
 *
 * ⚠️ Reads BOTH the trip's status and its swipes. `status === "completed"` is a
 * finished ride in the completed pool; a ride still in the In Progress pool can
 * also be finished by its swipes, and either one is a leg nothing may be
 * inserted ahead of.
 */
function activityOf(trip: Trip): LegActivity {
  if (trip.status === "completed") return "completed";
  const leg = trip.legs.find((candidate) => candidate.progress);
  const stage = leg ? getLegStage(leg) : "not-started";
  if (stage === "completed") return "completed";
  return stage === "not-started" ? "pending" : "active";
}

/**
 * The group's legs in timeline order, with everything the form needs.
 *
 * ⛔ Ordered by PICK-UP TIME, and the letter is assigned from that order rather
 * than copied from `legCode`. The seed's letters and its times agree today; a
 * form that trusted the letter would place an inserted leg by a label while
 * computing the cascade from a clock, and the two would eventually disagree.
 * ⚠️ A leg with no readable clock (`Will-Call`) sorts LAST and keeps its place —
 * it has no time to compare, so it cannot be ordered against one.
 */
export function groupLegs(trip: Trip): GroupLeg[] {
  const members = groupMembers(trip, ALL_POOLS);
  const sorted = [...members].sort((a, b) => {
    const left = clockToMinutes(a.legs[0]?.time);
    const right = clockToMinutes(b.legs[0]?.time);
    if (left === null) return right === null ? 0 : 1;
    if (right === null) return -1;
    return left - right;
  });
  return sorted.map((member, index) => {
    const first = member.legs[0];
    const last = member.legs[member.legs.length - 1];
    return {
      trip: member,
      index,
      letter: letterAt(index),
      activity: activityOf(member),
      pickupMinutes: clockToMinutes(first?.time),
      dropoffMinutes:
        member.legs.length > 1 ? clockToMinutes(last?.time) : null,
      pickupLabel: first?.time ?? "—",
      dropoffLabel: member.legs.length > 1 ? (last?.time ?? "—") : "—",
      address: first?.address ?? "",
    };
  });
}

/**
 * The first slot the new leg may take.
 *
 * ⛔ User direction: *"if one of the legs are already active/completed you can't
 * put it before it."* So the floor is one past the LAST leg that has started —
 * not the first, which would let a new leg land between two legs the driver has
 * already begun.
 */
export function earliestSlot(legs: GroupLeg[]): number {
  let floor = 0;
  legs.forEach((leg, index) => {
    if (leg.activity !== "pending") floor = index + 1;
  });
  return floor;
}

/**
 * The letter a row shows **once the new leg is placed at `slot`**.
 *
 * ⛔⛔ Walk-found 2026-10-13. Without this the list printed `New leg B` directly
 * above `Leg B` — the new leg took its post-insertion letter while every
 * existing leg kept its pre-insertion one, so two adjacent rows claimed the same
 * position. User direction was explicit that the letter is the question this
 * control answers (*"whether it will be B or C etc."*), and a control that
 * answers it twice over answers it not at all.
 *
 * ⚠️ A rule, not a formatting detail: it is the only place the group's letters
 * after the insertion are decided, and the new leg's own letter comes from the
 * same function so the two cannot disagree.
 */
export function letterAt(position: number): string {
  return LETTERS[position] ?? `${position + 1}`;
}

/** The letter an EXISTING row shows, given where the new leg is going. */
export function rowLetterWithInsertion(index: number, slot: number): string {
  return letterAt(index < slot ? index : index + 1);
}

/** The letter the NEW leg would take. */
export function newLegLetter(slot: number): string {
  return letterAt(slot);
}

/** Every insertion index the new leg may take, in order. */
export function allowedSlots(legs: GroupLeg[]): number[] {
  const floor = earliestSlot(legs);
  const slots: number[] = [];
  for (let index = floor; index <= legs.length; index++) slots.push(index);
  return slots;
}

/** Why a slot is closed, for the lock beside the row. */
export const SLOT_BLOCKED_REASON = {
  completed: "This leg is already done, so nothing can go before it.",
  active: "You have already started this leg, so nothing can go before it.",
} as const;

/**
 * How long the new leg is likely to take, **from the trip's own legs**.
 *
 * ⛔ **Not from location.** There are no coordinates anywhere in the seed and no
 * routing engine behind this prototype, so a figure presented as distance-based
 * would be invented. What the group genuinely knows is how long its own legs are
 * scheduled to take, and that is what this returns — rounded to five minutes,
 * because a mean to the minute would claim a precision the inputs do not have.
 *
 * ⚠️ Returns `null` when the group has no leg with two readable anchors, which
 * is the commonest real case: a single completed leg. The caller falls back to
 * `NEW_LEG_DEFAULT_MINUTES` and says so in different words, because "estimated
 * from this trip's other legs" would be a lie about a trip that has none.
 */
export function estimateFromGroup(legs: GroupLeg[]): number | null {
  const spans = legs
    .map((leg) =>
      leg.pickupMinutes !== null && leg.dropoffMinutes !== null
        ? leg.dropoffMinutes - leg.pickupMinutes
        : null
    )
    .filter((span): span is number => span !== null && span > 0);
  if (spans.length === 0) return null;
  const mean = spans.reduce((total, span) => total + span, 0) / spans.length;
  return Math.max(5, Math.round(mean / 5) * 5);
}

/** The estimate actually used, and whether it came from the group or the default. */
export function newLegMinutes(legs: GroupLeg[]): {
  minutes: number;
  source: "group" | "default";
} {
  const derived = estimateFromGroup(legs);
  return derived === null
    ? { minutes: NEW_LEG_DEFAULT_MINUTES, source: "default" }
    : { minutes: derived, source: "group" };
}

export const ESTIMATE_HELP = {
  group:
    "Estimated from this trip's other legs. Change it if you know better.",
  default:
    "This trip has no other leg to estimate from, so this is a standing default. Change it if you know better.",
} as const;

/** One existing leg the insertion would push later. */
export interface LegShift {
  tripId: string;
  letter: string;
  fromLabel: string;
  toLabel: string;
  toMinutes: number;
}

/**
 * The knock-on effect of inserting a leg, walking the group forward.
 *
 * ⭐ **A leg with slack does not move**, and that is the behaviour worth having:
 * a driver who inserts a morning leg into an afternoon round trip must not be
 * told the return has changed. Only a leg whose pick-up would now fall before
 * the previous leg's drop-off plus the turnaround is proposed later.
 *
 * ⚠️ A shifted leg keeps its **own** original duration rather than taking the
 * new leg's estimate — how long that leg takes is a fact about that leg, not
 * about this request.
 *
 * ⛔ **Single-day only**, inherited: the values map holds no date beside a time,
 * exactly as `getTimeOrderWarnings` documents. A leg that would be pushed past
 * midnight is reported through `overnight` rather than printed as a wrong time.
 */
export function cascadeShifts(
  legs: GroupLeg[],
  slot: number,
  newPickupMinutes: number,
  newDropoffMinutes: number
): { shifts: LegShift[]; overnight: boolean } {
  const shifts: LegShift[] = [];
  let previousDropoff = newDropoffMinutes;
  let overnight = false;

  for (const leg of legs.slice(slot)) {
    // A leg with no readable clock cannot be compared, so it is never shifted.
    if (leg.pickupMinutes === null) continue;
    const earliest = previousDropoff + LEG_TURNAROUND_MINUTES;
    if (leg.pickupMinutes >= earliest) {
      // It had slack. Nothing downstream of it can be squeezed either, because
      // this leg did not move — so the walk stops here.
      break;
    }
    const span =
      leg.dropoffMinutes !== null ? leg.dropoffMinutes - leg.pickupMinutes : 0;
    if (earliest >= 1440) overnight = true;
    shifts.push({
      tripId: leg.trip.id,
      // ⛔ The letter AFTER the insertion. A leg that is B today becomes C once
      // something is placed ahead of it, and "Leg B pick-up moves to" beside a
      // list calling the new leg B is the same contradiction the row letters
      // had. Same walk, same fix, second site.
      letter: rowLetterWithInsertion(leg.index, slot),
      fromLabel: minutesToClock(leg.pickupMinutes),
      toLabel: minutesToClock(earliest),
      toMinutes: earliest,
    });
    previousDropoff = earliest + span;
  }

  // ⚠️ The new leg itself can run past midnight even when nothing shifts.
  if (newDropoffMinutes >= 1440) overnight = true;
  return { shifts, overnight };
}

/**
 * The new leg's pick-up contradicts the slot it has been dropped into.
 *
 * ⛔⛔ Walk-found 2026-10-13. The position and the time are two separate answers
 * and nothing tied them together: a driver could place the new leg LAST and give
 * it a 1:00 PM pick-up, behind a leg that starts at 3:00 PM. `getTimeOrderWarnings`
 * could not see it either — it compares fields, and the leg in front has no field
 * on this form unless the insertion happened to shift it.
 *
 * ⚠️ **Warns, never blocks**, like every other time rule in this project. The
 * driver may know something the schedule does not. But it warns on the SLOT
 * rather than the time, because the slot is what is usually wrong — the time is
 * the thing they just deliberately typed.
 */
export function slotOrderWarning(
  legs: GroupLeg[],
  slot: number,
  newPickupMinutes: number | null
): string | undefined {
  if (newPickupMinutes === null || slot === 0) return undefined;
  const before = legs[slot - 1];
  if (!before || before.pickupMinutes === null) return undefined;
  if (newPickupMinutes >= before.pickupMinutes) return undefined;
  return `Leg ${rowLetterWithInsertion(before.index, slot)} starts at ${before.pickupLabel}, which is after the ${minutesToClock(newPickupMinutes)} you have given the new leg. Move the new leg earlier in the list, or change its pick-up time.`;
}

export const OVERNIGHT_WARNING =
  "These times would run past midnight. The app cannot work out which day they land on, so call Support for this one.";

// ---- Field ids ----------------------------------------------------------

export const SLOT_FIELD = "addLegSlot";
export const ADD_PICKUP_TIME_FIELD = "addLegPickupTime";
export const ADD_PICKUP_ADDRESS_FIELD = "addLegPickupAddress";
export const ADD_DROPOFF_TIME_FIELD = "addLegDropoffTime";
export const ADD_DROPOFF_ADDRESS_FIELD = "addLegDropoffAddress";
export const ADD_TIMING_FIELD = "addLegTiming";
export const ADD_SOURCE_FIELD = "addLegRequestedBy";
export const ADD_NOTES_FIELD = "addLegNotes";

/** Field id holding the proposed new pick-up for an existing leg. */
export function shiftFieldId(tripId: string): string {
  return `addLegShift_${tripId}`;
}

/**
 * Who asked for the new leg.
 *
 * ⛔ **Deliberately NOT row 20's `changeRequestedBy`.** That list offers *"I
 * found the details are wrong"*, because a driver can notice a bad address on a
 * leg they can see. Nobody notices a leg that does not exist — a new leg is
 * always asked for by a person, so this list is four options, not five. Two
 * fields sharing one id under different gates is the drift the case registry
 * already warns about.
 */
export const ADD_SOURCE_OPTIONS: readonly SupportFieldOption[] = [
  { value: "member", label: "The member told me" },
  { value: "caregiver", label: "A caregiver or family member told me" },
  { value: "facility", label: "The facility told me" },
  { value: "client", label: "Dispatch or the client told me" },
];

// ---- The "tagged critical" clause ---------------------------------------

/**
 * The catalogue asks for the request to be *"tagged critical when it is same-day
 * or the driver has already started"*.
 *
 * ⛔⛔ **The prototype states the CONDITION, never the verdict.** "Critical" is a
 * promise about what Support does with the request, and nobody has agreed one.
 * What the app can say without inventing anything is what is true: the date, and
 * whether a leg is under way. Support receives that and decides.
 *
 * ⚠️ Kept at all — unlike row 04's *"tag the number invalid"*, which was dropped
 * — because the ACTOR differs. Tagging a member's record is Support-side work
 * the driver does not perform; the urgency of a request is a property of the
 * request the driver is creating.
 */
export type AddLegTiming = "today-under-way" | "today" | "other-day";

export const TIMING_LABEL: Record<AddLegTiming, string> = {
  "today-under-way": "Today — you are already under way",
  today: "Today",
  /**
   * ⛔ "A different day", NOT "a future date". The entry point includes
   * COMPLETED rides, so the trip is at least as likely to be in the past as
   * ahead — and the catalogue's condition is *same-day*, which "a different day"
   * negates exactly while "a future date" would be false half the time it
   * printed.
   */
  "other-day": "A different day",
};

/**
 * Is this trip's date the prototype's today?
 *
 * ⚠️ Compared against `MOCK_TODAY`, never the real clock. Every seeded ride is
 * dated `Thu, Jul 31, 2026`; a rule reading `new Date()` would call all of them
 * a future date and the same-day condition would never fire once — a check
 * passing on a condition that can never be true is a check that tests nothing.
 */
export function isTripToday(trip: Trip): boolean {
  const parsed = new Date(trip.date.replace(/^\w{3},\s*/, ""));
  if (Number.isNaN(parsed.getTime())) return false;
  const iso = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
  return iso === MOCK_TODAY;
}

export function addLegTiming(legs: GroupLeg[], isToday: boolean): AddLegTiming {
  if (!isToday) return "other-day";
  return legs.some((leg) => leg.activity !== "pending")
    ? "today-under-way"
    : "today";
}

// ---- Entry points -------------------------------------------------------

export const ADD_LEG_SOLUTION = "add-leg-request";

/**
 * ⛔⛔ **A proposal belongs to its own build.** Row 19 has THREE surfaces under
 * this obligation — the More Options tile, the completed ride's own button, and
 * the banner — so the rule is named once, here, where all three read it.
 */
export const ADD_LEG_SOLUTIONS: readonly string[] = [ADD_LEG_SOLUTION];

export function showsAddLegEntry(focus: DemoFocus): boolean {
  return showsProposal(focus, ADD_LEG_SOLUTIONS);
}

/**
 * Ride states that offer a way in.
 *
 * ⭐ `completed` is INCLUDED, and it is the whole of user direction 1.1: a
 * driver who has just swiped drop-off is exactly who hears *"actually, I also
 * need the pharmacy"*. ⛔ No conflict with row 20, which refuses completed rides
 * — that one would be CORRECTING a finished leg, which is row 03's case. This
 * one does not touch the finished leg at all.
 *
 * ⛔ `before-taken` is absent: an offer the driver has not accepted is not
 * theirs to extend.
 */
export const ADD_LEG_STATES: readonly string[] = [
  "needs-action",
  "in-progress",
  "completed",
];

export function stateAllowsAddLeg(state: string): boolean {
  return ADD_LEG_STATES.includes(state);
}

export const ADD_LEG_REFUSAL = {
  state:
    "This trip is not one you can ask us to add a leg to. Call Support if the member needs another ride.",
  pending:
    "This trip already has a leg request with Support. They will come back to you about it.",
} as const;

export function addLegRefusal(
  state: string,
  alreadyRequested: boolean
): string | null {
  if (!stateAllowsAddLeg(state)) return ADD_LEG_REFUSAL.state;
  if (alreadyRequested) return ADD_LEG_REFUSAL.pending;
  return null;
}

export function canRequestAddLeg(
  state: string,
  alreadyRequested: boolean
): boolean {
  return addLegRefusal(state, alreadyRequested) === null;
}

// ---- What the ride says afterwards --------------------------------------

/**
 * ⛔ Keyed by GROUP, not by ride. A second request would contradict the first
 * about the same sequence, and every leg of the group has to show the one that
 * stands — including the leg the driver was not looking at when they filed.
 */
export function groupKey(trip: Trip): string {
  return trip.tripGroup ?? `solo:${trip.id}`;
}

export interface AddLegRequest {
  groupKey: string;
  letter: string;
  pickupLabel: string;
  dropoffLabel: string;
  pickupAddress: string;
  dropoffAddress: string;
  shifts: LegShift[];
}

export const ADD_LEG_REQUESTED_TITLE = "Leg requested";
export const ADD_LEG_REQUESTED_DETAIL =
  "Support has your request. The new leg is not on your manifest yet and will not be until the client adds it.";
export const ADD_LEG_SUBMIT_TOAST =
  "Support has the new leg. It will not appear on your manifest until the client adds it.";

/**
 * ⛔ The app never learns the outcome — the client owns the manifest. Filed with
 * `appTracksStatus: false`, like rows 05, 09, 13, 16 and 20. Knowing it landed
 * is **catalogue row 17**, the requests tray, and this is the sixth build
 * leaning on it.
 */
export const ADD_LEG_TRACKED_BY_APP = false;
