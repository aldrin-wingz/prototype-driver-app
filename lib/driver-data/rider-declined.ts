import {
  mockInProgressTrips,
  mockNeedsActionTrips,
  mockUpcomingTrips,
  type Trip,
} from "./mock-trips";
import type { SupportFieldOption } from "@/types/support";

/**
 * "The rider declined the trip" — the rules behind catalogue row 16.
 *
 * Named here rather than worked out inside the modal or the form, because FIVE
 * surfaces read them: the declined sheet, the form's field set, the ride's
 * cancellation banner, the footer swap and `scripts/verify-solutions.ts`. A rule
 * spelled out in JSX is a rule no check can reach.
 *
 * ⛔⛔ **Filing this does NOT cancel anything.** Production's own popup says so
 * in capitals — *"This is NOT a confirmation for the trip cancellation"* — and
 * it is right: the client owns the cancellation and a driver's report is
 * evidence for one. Everything here is named `…requested` for that reason, and
 * nothing in this module may grow a function that removes a ride.
 */

// ---------------------------------------------------------------------------
// The declined sheet
// ---------------------------------------------------------------------------

/**
 * The two production bodies, five years apart.
 *
 * ⚠️ Both are kept because they are both real and they are NOT the same screen.
 * `CAP-090` (iOS, a 2021 ride) offers one button, `Call Support`. `CAP-224` /
 * `s-04b` (Android, an Aug-2026 ride) offers `Chat with Support` AND a walk-back,
 * `Rider Needs Transportation`. The prototype replicated the 2021 one until this
 * slice; this is what it was.
 */
export const DECLINED_BODY_2021 =
  "This is NOT a confirmation for the trip cancellation. Please contact support for further instructions.";
export const DECLINED_BODY_2026 =
  "Please chat with support to remove it from your manifest.";

/** Headline — identical in both captures, so there is nothing to choose. */
export const DECLINED_TITLE = "Rider declined the trip";

/**
 * Our body, and it departs from `CAP-224` on purpose.
 *
 * ⚠️ The captured sheet sends the driver to a chat. This one sends them to a
 * form, so the copy has to say so — a button marked `Chat with Support` that
 * opens a form is a small lie about the very next tap. Same reasoning the
 * Phase 5 option note was written under.
 */
export const DECLINED_BODY =
  "Support needs a few details before we can remove it from your manifest.";
export const DECLINED_CONTINUE = "Continue";

/**
 * The walk-back, verbatim from `CAP-224`.
 *
 * ⛔ It files NOTHING and changes nothing — it returns the driver to the option
 * list. A driver who tapped the wrong option must be able to leave without
 * having reported a member said something they did not.
 */
export const DECLINED_WALK_BACK = "Rider Needs Transportation";

/**
 * ⛔⛔ **How long to wait before opening the next sheet.**
 *
 * Found by walking, 2026-10-13. The declined popup used to be an `AlertDialog`,
 * which layers over a vaul `Drawer` happily. Rebuilt as a sheet it is a SECOND
 * drawer, and two vaul drawers open in the same frame do not hand over — the
 * first stays on screen with the second peeking out underneath it, so the
 * driver sees two stacked sheets and neither is usable.
 *
 * ⛔ **500, and the number is read off vaul rather than guessed.**
 * `node_modules/vaul/dist/index.mjs` sets `TRANSITIONS.DURATION = 0.5`, so a
 * sheet is on screen for half a second after it is told to close. The first fix
 * used 250 — the figure the existing `close()` already used — and the sheets
 * STILL stacked, which is the whole lesson: a delay tuned by eye is a delay
 * that works on one machine. ⚠️ A `0` is not even close; the race is the close
 * ANIMATION, not the React update.
 */
export const SHEET_SWAP_MS = 500;

// ---------------------------------------------------------------------------
// How the driver was told — and what proof can exist
// ---------------------------------------------------------------------------

export type DeclineChannel =
  | "text"
  | "call"
  | "in-person"
  | "caregiver"
  | "facility";

export interface DeclineChannelRule {
  value: DeclineChannel;
  label: string;
  /**
   * An artifact of the decline can exist for this channel.
   *
   * ⛔⛔ **This is the load-bearing flag.** A member who tells you at the door
   * leaves nothing to screenshot, and a form that demanded a file would make the
   * in-person and second-hand declines unfileable — which are exactly the ones
   * that ring Support today. So the proof field's LABEL and its asterisk both
   * follow this, and where it is false the driver names who told them instead.
   */
  hasArtifact: boolean;
  /**
   * The member did not say it themselves.
   *
   * ⚠️ CASE-07's finding, kept: *a caregiver saying "she isn't going today" is
   * not the same evidence as the member saying it themselves*, and Support
   * should be able to see which one they are acting on.
   */
  secondHand: boolean;
  /**
   * What the proof field is called when this channel is chosen.
   *
   * ⛔ Found by walking, 2026-10-13: three of these help strings said "below"
   * about a field that renders ABOVE the proof box. Help text must never name
   * another field's POSITION — field order is a property of the case registry
   * and this table cannot see it. Checked.
   */
  proofLabel: string;
  proofHelp: string;
}

/**
 * The five ways a driver learns a member is not going.
 *
 * ⚠️ One table, not three parallel lists. Which channels carry an artifact and
 * which are second-hand decide different things — the proof field's label, and
 * whether the "who told you" field exists at all — and two lists that could
 * disagree would let the form ask for a screenshot of a conversation that
 * happened on a doorstep.
 */
export const DECLINE_CHANNELS: readonly DeclineChannelRule[] = [
  {
    value: "text",
    label: "By text or app message",
    hasArtifact: true,
    secondHand: false,
    proofLabel: "Screenshot of the message",
    proofHelp:
      "The message where they said they no longer need the ride. ⚠️ Not in prototype yet — the real form would require this, and you can submit without it here.",
  },
  {
    value: "call",
    label: "On a call with the member",
    hasArtifact: true,
    secondHand: false,
    proofLabel: "Screenshot of your call log",
    proofHelp:
      "Your phone's call log showing the call. It shows the call happened, not what was said — which is what the question about their words is for. ⚠️ Not in prototype yet — the real form would require this, and you can submit without it here.",
  },
  {
    value: "in-person",
    label: "In person, at the pick-up",
    hasArtifact: false,
    secondHand: false,
    proofLabel: "Anything that supports this (optional)",
    proofHelp:
      "There is usually nothing to attach to a doorstep conversation — your account of it and your signature are the record.",
  },
  {
    value: "caregiver",
    label: "Through a family member or caregiver",
    hasArtifact: false,
    secondHand: true,
    proofLabel: "Anything that supports this (optional)",
    proofHelp:
      "Nothing to attach is normal here. Naming who told you is what Support can check.",
  },
  {
    value: "facility",
    label: "Through the facility",
    hasArtifact: false,
    secondHand: true,
    proofLabel: "Anything that supports this (optional)",
    proofHelp:
      "Nothing to attach is normal here. Naming who told you is what Support can check.",
  },
];

export function declineChannelRule(
  value: string
): DeclineChannelRule | undefined {
  return DECLINE_CHANNELS.find((channel) => channel.value === value);
}

export const DECLINE_CHANNEL_OPTIONS: SupportFieldOption[] =
  DECLINE_CHANNELS.map(({ value, label }) => ({ value, label }));

/** The channels where a screenshot or log can exist. */
export const ARTIFACT_CHANNELS: DeclineChannel[] = DECLINE_CHANNELS.filter(
  (channel) => channel.hasArtifact
).map((channel) => channel.value);

/** The channels where somebody other than the member did the telling. */
export const SECOND_HAND_CHANNELS: DeclineChannel[] = DECLINE_CHANNELS.filter(
  (channel) => channel.secondHand
).map((channel) => channel.value);

// ---------------------------------------------------------------------------
// Which legs come off
// ---------------------------------------------------------------------------

/**
 * ⭐ **Production's own template removes several legs at once.**
 *
 * `CAP-225` / `s-04c` composes *"I need help in removing the following rides
 * from my manifest"* and then lists **two** leg ids. A member who is not going
 * has usually dropped the return as well, and the captured message assumes it.
 *
 * ⚠️ But not always — a member whose family drove them to the appointment still
 * needs the ride home. So the form ASKS, with every leg ticked. The default is
 * production's assumption; the tick box is the exception production cannot
 * express.
 */
export const DECLINED_LEGS_FIELD = "declinedLegs";

/** Values are joined with this, so one flat `Record<string, string>` still holds them. */
const LEG_SEPARATOR = ",";

/**
 * The other rides that belong to the same round trip.
 *
 * ⚠️ Read from an EXPLICIT `tripGroup` on the seed, never inferred from rider
 * name and date. Two members can share a name and one member can have two
 * unrelated rides in a day; an inferred group would put a stranger's leg on a
 * cancellation request. Declared, never derived — the repo's own rule.
 *
 * Returns the trip itself when it belongs to no group, which is the honest
 * answer for a one-way ride.
 */
export function legsInGroup(trip: Trip): Trip[] {
  if (!trip.tripGroup) return [trip];
  const pool = [
    ...mockNeedsActionTrips,
    ...mockUpcomingTrips,
    ...mockInProgressTrips,
  ];
  const group = pool.filter((other) => other.tripGroup === trip.tripGroup);
  return group.length > 0 ? group : [trip];
}

/**
 * The legs this report could cover, as checklist options.
 *
 * The VALUE is the leg id, which is what production's template lists and what
 * Support acts on. The label carries the leg letter, the time and the address,
 * because "Leg A" and "Leg B" on their own are not something a driver can check
 * against what the member told them.
 */
export function declineLegOptions(trip: Trip): SupportFieldOption[] {
  return legsInGroup(trip).map((other) => {
    const leg = other.legs[0];
    const letter = leg?.legCode ? `Leg ${leg.legCode}` : "Leg";
    return {
      value: leg?.id ?? other.id,
      label: `${letter} · ${leg?.time ?? ""} · ${leg?.address ?? ""}`,
    };
  });
}

/** Every leg ticked — the starting state, per the captured template. */
export function declineLegDefault(trip: Trip): string {
  return declineLegOptions(trip)
    .map((option) => option.value)
    .join(LEG_SEPARATOR);
}

export function parseLegSelection(value: string): string[] {
  return value.split(LEG_SEPARATOR).filter((id) => id.length > 0);
}

export function toggleLegSelection(value: string, legId: string): string {
  const selected = parseLegSelection(value);
  const next = selected.includes(legId)
    ? selected.filter((id) => id !== legId)
    : [...selected, legId];
  return next.join(LEG_SEPARATOR);
}

/**
 * The trip ids behind a leg selection.
 *
 * ⚠️ The banner is per RIDE, the checklist is per LEG, and in this seed one ride
 * carries one swipeable leg — so the mapping is one-to-one today and is written
 * out anyway. A ride whose second leg was also swipeable would otherwise have
 * its whole card marked cancelled because one of its legs was.
 */
export function tripIdsForLegs(trip: Trip, legIds: string[]): string[] {
  return legsInGroup(trip)
    .filter((other) =>
      other.legs.some((leg) => legIds.includes(leg.id))
    )
    .map((other) => other.id);
}

// ---------------------------------------------------------------------------
// What the ride says afterwards
// ---------------------------------------------------------------------------

/**
 * ⛔ The banner replaces production's red *"Confirmation required — please call
 * the rider first"*, and it has to: the driver has just told us the rider is not
 * going, so telling them to go and call the rider is the app arguing with
 * itself in two adjacent rectangles. CASE-07 found exactly that stacking.
 */
export const CANCELLATION_REQUESTED_TITLE = "Cancellation requested";
export const CANCELLATION_REQUESTED_DETAIL =
  "Support has your report and is taking it to the client. You do not need to drive this one — leave it with us.";

/**
 * The footer pill, where the orange `I REACHED OUT TO CONFIRM` button was.
 *
 * ⚠️ Re-offering the confirmation flow here would invite a second report about
 * the same member saying the same thing, which is how Support ends up with two
 * tickets for one conversation.
 */
export const CANCELLATION_REQUESTED_PILL = "CANCELLATION REQUESTED";

/**
 * ⛔⛔ Deliberately NOT said anywhere in the driver-facing copy: "cancelled",
 * "removed", "off your manifest". The client has not done it yet and the app
 * cannot see when they do — that is catalogue row 17, the requests tray, and it
 * is still specified nowhere. Promising an outcome we cannot read back is the
 * failure `appTracksStatus: false` exists to prevent.
 */
export const CANCELLATION_TRACKED_BY_APP = false;
