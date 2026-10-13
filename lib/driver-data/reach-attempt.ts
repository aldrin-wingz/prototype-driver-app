import { showsProposal, type DemoFocus } from "@/lib/solutions/demo-mode";
import type { Trip, TripContacts } from "./mock-trips";
import type { SupportFieldOption } from "@/types/support";

/**
 * "I could not reach the member" — the rules behind catalogue rows 04 and 05.
 *
 * Named here rather than worked out inside the modal or the form, because FOUR
 * surfaces read them: the Reach Rider modal's new option, the More Options tile,
 * the form's field set and `scripts/verify-solutions.ts`. A rule spelled out in
 * JSX is a rule the check cannot reach, and two entry points that each decided
 * for themselves which numbers to offer would be two forms wearing one name.
 */

/**
 * The member-facing numbers, in the order production's Phone Options popup
 * lists them.
 *
 * ⛔ Three, not four. The popup's fourth entry is `Wingz Support`, and it is
 * deliberately absent: calling us is not an attempt to reach the member, so
 * offering it here would let a driver file our own phone number as proof they
 * tried the member's.
 */
export const CONTACT_CHANNELS: Array<{
  key: keyof TripContacts;
  value: string;
  label: string;
}> = [
  { key: "riderPhone", value: "rider-phone", label: "Rider Phone" },
  { key: "pickupPhone", value: "pickup-phone", label: "Pickup Phone" },
  { key: "dropoffPhone", value: "dropoff-phone", label: "Dropoff Phone" },
];

/**
 * The numbers THIS trip actually carries, as form options.
 *
 * ⚠️ Derived from the seed, never a fixed list of three. The stage map records
 * the numbers as client-provided and varying per trip; a trip with no drop-off
 * number must not offer "Dropoff Phone", or the driver can report an attempt on
 * a number that was never on their screen and Support chases a call that never
 * happened.
 *
 * The number itself is in the label. A driver picking between three entries
 * called "Pickup Phone" and "Dropoff Phone" is picking between words; what they
 * dialled is a number, and it is the number Support has to act on.
 */
export function contactOptionsFor(trip: Trip): SupportFieldOption[] {
  const contacts = trip.contacts ?? {};
  return CONTACT_CHANNELS.filter((channel) => contacts[channel.key]).map(
    (channel) => ({
      value: channel.value,
      label: `${channel.label} — ${contacts[channel.key]}`,
    })
  );
}

/** How many member-facing numbers this trip carries. */
export function contactCount(trip: Trip): number {
  return contactOptionsFor(trip).length;
}

/** The answer that opens the "tell us what happened" box. */
export const REACH_OUTCOME_OTHER = "other";

/**
 * What happened when the driver dialled.
 *
 * ⚠️ **This is NOT the driver tagging a number invalid.** Catalogue row 04 was
 * written as "driver tags the number invalid from the app", and that is the
 * wrong actor: deciding a number is invalid is an agent-side CS Tool judgement
 * made across every trip that number appears on, not something one driver can
 * see from one failed call. What the driver can honestly report is what happened
 * when they dialled. `disconnected` is the answer an agent reads as a candidate
 * invalid number — the signal row 04 wanted, sourced from someone who can
 * actually observe it.
 */
export const REACH_OUTCOMES: SupportFieldOption[] = [
  { value: "no-answer", label: "It rang, nobody picked up" },
  { value: "voicemail", label: "It went to voicemail" },
  { value: "disconnected", label: "Disconnected or not in service" },
  { value: "wrong-person", label: "Someone else answered" },
  { value: "ivr", label: "Stuck in the phone menu" },
  { value: REACH_OUTCOME_OTHER, label: "Something else" },
];

/**
 * ⛔ The longest option label the select can show on a phone without clipping.
 *
 * The shared `select` primitive does NOT wrap its items: a longer label is cut
 * at the panel edge with no ellipsis and no overflow scroll, so "Disconnected or
 * not in service" read as "Disconnected or not in serv". Nothing errors and
 * nothing looks broken — the sentence just quietly ends early.
 *
 * Measured against the 366px-wide phone frame the prototype is walked in.
 * `scripts/verify-solutions.ts` asserts it, so the next person to add an answer
 * finds out from the gate rather than from a screenshot.
 */
export const MAX_OUTCOME_LABEL_CHARS = 32;

/**
 * The new option on the Reach Rider modal, and the label on the More Options
 * tile.
 *
 * One string, two entry points. They are the same claim, so they say the same
 * words — two labels would read as two different things a driver could file.
 */
export const CANNOT_REACH_LABEL = "I can't reach the member";

/**
 * The catalogue rows this proposal belongs to.
 *
 * ⛔⛔ **A proposal belongs to its own build.** `buildGridTiles` has enforced
 * this on the More Options grid since Phase 6 — with a solution focused, the
 * grid shows that solution's proposed tiles and no others, because two
 * proposals side by side read as one feature. The Reach Rider modal's fourth
 * option is the same kind of thing and was MISSED: it showed on every focus,
 * so a reviewer walking row 16 met "I can't reach the member" on the way to a
 * flow it has nothing to do with. Found by the user, 2026-10-13.
 *
 * ⚠️ Named here rather than inside the modal so the rule sits beside the label
 * it governs, and so `verify-solutions` can build the real option list for each
 * focus instead of grepping for a line.
 */
export const CANNOT_REACH_SOLUTIONS: readonly string[] = [
  "tag-number-invalid",
  "cannot-reach-member",
];

/**
 * Whether the proposed fourth option shows for the solution in focus.
 *
 * ⚠️ `null` — nothing focused — shows it, the same rule `ridesForSolution` and
 * `buildGridTiles` use: no focus means no filtering rather than an empty
 * screen, so the plain mirror still carries every proposal.
 */
export function showsCannotReachOption(focus: DemoFocus): boolean {
  return showsProposal(focus, CANNOT_REACH_SOLUTIONS);
}

/**
 * ⛔ Submitting changes NOTHING about the trip.
 *
 * The same outcome as today's `No, try again later`: the modal closes, the trip
 * is still unconfirmed and the orange CTA is still there. That is the truthful
 * state — the member still has not been reached — and it leaves the driver able
 * to confirm the moment they do get through. Stated here because it is a
 * decision, not an omission, and a later entry point must not quietly pick
 * differently.
 */
export const CANNOT_REACH_LEAVES_TRIP_UNCONFIRMED = true;
