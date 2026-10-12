import { getMemberOptions } from "@/lib/support-data/member-options";
import type { Trip } from "./mock-trips";
import type { SupportFieldOption } from "@/types/support";

/**
 * The rules behind catalogue rows **09** and **10** — `Trip / Ride Assignment`,
 * 610 calls, one problem: *the member wants the same driver next time*.
 *
 * Two surfaces read this file. Row 09 is the ask — a support request saying
 * "assign me this member's future trips". Row 10 is the self-serve — a Request
 * Feed filter so the driver can find that member's posted trips themselves.
 * They are one build, and the member list they work from has to be the SAME
 * list or the two halves of one scenario would disagree about who the driver
 * knows.
 *
 * ⛔ Nothing here assigns anything. Assignment is the broker's, and what this
 * absorbs is the phone call that chases it.
 */

/** The More Options tile, and what the form calls itself. */
export const AUTO_ASSIGN_LABEL = "Ask to be their regular driver";

/**
 * ⛔⛔ **Filing this changes nothing about any trip** — not the one it was filed
 * from, not the member's future ones. It is a request to a human, and the trips
 * it is about do not exist yet.
 *
 * Named as a constant for the same reason `CANNOT_REACH_LEAVES_TRIP_UNCONFIRMED`
 * is: it is the single most load-bearing fact about the case, it is invisible in
 * the diff of a form that simply omits a state change, and a check can read it.
 */
export const AUTO_ASSIGN_CHANGES_NOTHING = true;

/**
 * ⚠️ The shared `select` primitive does NOT wrap its items and does not
 * ellipsize — a long option is cut mid-word. Learned on Can't Reach Member,
 * where "The number was disconnected or not in service" lost its last three
 * words on a phone-width screen. Every option below is held under this, and a
 * check asserts it so a later edit cannot quietly re-break it.
 */
export const MAX_REASON_LABEL_CHARS = 34;

export const ASSIGNMENT_REASON_OTHER = "other";

/**
 * Why the driver thinks they should get this member's future trips.
 *
 * ⚠️ These are what Support has to weigh, so they are categories rather than
 * free text: "the member asked" and "I already drive them" are different claims
 * and the second one is checkable against the ride history the request carries.
 */
export const ASSIGNMENT_REASONS: SupportFieldOption[] = [
  { value: "member-asked", label: "The member asked me directly" },
  { value: "already-regular", label: "I already drive them most weeks" },
  { value: "equipment", label: "They need help I'm set up for" },
  { value: "standing-appointment", label: "Same appointment every week" },
  { value: ASSIGNMENT_REASON_OTHER, label: "Something else" },
];

/**
 * A trip with no single member.
 *
 * ⛔ Two seeded requests carry `"Group: 3 riders"` / `"Group: 4 riders"` instead
 * of a name — a multi-load with no one member to filter for. They must never
 * match a member filter, and the test is the stored shape rather than a guess,
 * because `rider` is a display string and this is the only thing in it that is
 * not a person.
 */
export const GROUP_RIDER_PREFIX = "Group:";

export function isGroupRide(trip: Trip): boolean {
  return trip.rider.startsWith(GROUP_RIDER_PREFIX);
}

/**
 * The members the Request Feed filter offers.
 *
 * ⛔⛔ **Drawn from who the driver has DRIVEN, not from who is in the feed.**
 * Listing the feed's own riders would put twenty strangers' names in a dropdown
 * to solve a problem that only exists for a member the driver already knows —
 * and the 610 calls are all the second kind. It also means the filter can come
 * up empty, which is a real answer: that member has no trips posted right now.
 *
 * Same source as the form's member picker, so the two halves of one scenario
 * cannot disagree about who the driver knows.
 */
export function memberFilterOptions(): SupportFieldOption[] {
  return getMemberOptions().map((member) => ({
    value: member.name,
    label: member.name,
  }));
}

/**
 * The feed, narrowed to one member.
 *
 * Exact name match, because the name IS the identifier here — the seed has no
 * member id and inventing one would be modelling a join the prototype does not
 * have. Group rides are excluded explicitly rather than falling out by accident.
 */
export function filterRequestsByMember(trips: Trip[], member: string): Trip[] {
  if (!member) return trips;
  return trips.filter((trip) => !isGroupRide(trip) && trip.rider === member);
}
