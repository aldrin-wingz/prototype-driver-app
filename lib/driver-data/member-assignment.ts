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

/**
 * The More Options tile, and what the form calls itself.
 *
 * ⛔⛔ **"Member requested" — the MEMBER asked, not the driver.** The earlier
 * wording, "Ask to be their regular driver", described a driver putting
 * themselves forward, and Support would have had to establish consent before
 * acting on any of it. User direction 2026-10-12: *"I just want explicit that
 * the member has agreed and it's not just the driver asking."* The whole case
 * reads differently as a result — see `PREFERRED_REQUESTERS`, which asks WHO
 * asked rather than why the driver wants it.
 */
export const AUTO_ASSIGN_LABEL = "Member requested me as preferred driver";

/**
 * ⚠️ The longest label on the More Options grid, by some way — the production
 * tiles top out at 24 characters ("Map to Drop-off Location"). The label box is
 * `max-w-[150px]` inside a `min-h-[168px]` tile, which holds three wrapped
 * lines; this one takes all three. Capped so the next edit cannot quietly push
 * it to four and overflow the cell.
 */
export const MAX_TILE_LABEL_CHARS = 40;

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
export const MAX_SCOPE_LABEL_CHARS = 34;

/**
 * **What the driver is asking for**, and the field that decides whether a
 * schedule is owed.
 *
 * ⛔⛔ **This replaced a list of WHO asked, which replaced a list of the
 * driver's reasons.** Both earlier versions asked about the request's
 * provenance, and neither told Support anything it could act on: once the case
 * says the member requested this driver, Support's next question is not who
 * said so, it is **what to actually set up**. "All their future trips", "a
 * standing order" and "one specific trip" are three different pieces of work
 * for three different teams — only the second and third have a schedule, and
 * without one neither can be matched to anything.
 *
 * ⚠️ `ASSIGNMENT_SCOPE_ALL` is the only answer that owes nothing further, which
 * is why it is named: the two fields below are gated on NOT being it, and a
 * gate written as "is one of the other two" silently stops covering a fourth
 * answer the day someone adds one.
 */
export const ASSIGNMENT_SCOPE_ALL = "all-future";
export const ASSIGNMENT_SCOPE_STANDING = "standing-order";
export const ASSIGNMENT_SCOPE_SPECIFIC = "specific-trip";

export const ASSIGNMENT_SCOPES: SupportFieldOption[] = [
  { value: ASSIGNMENT_SCOPE_ALL, label: "All their future trips" },
  { value: ASSIGNMENT_SCOPE_STANDING, label: "A standing order" },
  { value: ASSIGNMENT_SCOPE_SPECIFIC, label: "Only a specific trip" },
];

/**
 * The scopes that owe a schedule.
 *
 * ⛔ Declared as a list rather than written inline in the field's `showIf`,
 * because TWO fields gate on it — the standing-order pattern and the specific
 * trip's date — and the check asserts the pair covers exactly this set. Two
 * inline copies could drift into leaving one scope with no schedule field at
 * all, which is the one state this design exists to prevent.
 */
export const SCOPES_NEEDING_SCHEDULE = [
  ASSIGNMENT_SCOPE_STANDING,
  ASSIGNMENT_SCOPE_SPECIFIC,
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


/**
 * Whether to ask, at the end of a leg, if this member requested the driver.
 *
 * ⛔⛔ **Three conditions, and all three are the point.**
 *
 * **The feature is in scope.** A proposal must not surface while a different
 * solution is focused — the same rule the More Options grid follows. `null`
 * means the plain mirror, where nothing is filtered.
 *
 * **The member has not opted out of being asked.** "Don't ask again for this
 * member" is per MEMBER, not per trip or per leg: a standing order is a weekly
 * ride, so a per-trip flag would ask the same driver the same question about
 * the same person every week — which is the behaviour that makes people stop
 * reading prompts.
 *
 * **There is a member to ask about.** A multi-load has no one member, so there
 * is no preferred-driver relationship to report.
 */
export function shouldAskPreferredDriver({
  trip,
  activeSolutionId,
  suppressedMembers,
}: {
  trip: Trip;
  activeSolutionId: string | null;
  suppressedMembers: string[];
}): boolean {
  if (activeSolutionId !== null && !PREFERRED_DRIVER_SOLUTIONS.includes(activeSolutionId)) {
    return false;
  }
  if (isGroupRide(trip)) return false;
  return !suppressedMembers.includes(trip.rider);
}

/**
 * The catalogue rows this proposal belongs to.
 *
 * Both rows, because 09 and 10 are ONE build — the same list the More Options
 * tile and the scenario rides carry, and declared once here so the three cannot
 * drift into disagreeing about which prototype this feature is part of.
 */
export const PREFERRED_DRIVER_SOLUTIONS = [
  "auto-assign-request",
  "request-feed-member-filter",
];

/** The question the end-of-leg prompt asks. */
export const PREFERRED_DRIVER_QUESTION = "Did they ask for you next time?";

/** The opt-out beside it. */
export const PREFERRED_DRIVER_SUPPRESS_LABEL = "Don't ask again for this member";
