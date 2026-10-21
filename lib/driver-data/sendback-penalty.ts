import { showsProposal, type DemoFocus } from "@/lib/solutions/demo-mode";
import type { Trip, TripPill } from "./mock-trips";

/**
 * What a send-back costs this trip right now, and when that figure changes.
 *
 * Catalogue rows 16 and 17. One home, because FIVE surfaces say the number: the
 * Upcoming card's pill, the Request Feed card's pill, the accept warning, the
 * send-back penalty dialog and the send-back completion message.
 *
 * ⛔⛔ **This module exists because the number was a constant and the constant
 * was about to become a lie.** `SEND_BACK_PENALTY_USD = 25` was read by three
 * renderers that all agreed, which is fine while every penalty is $25. The
 * moment a $10 band exists, a trip shows "$10 to send back" on its card and
 * "A $25 penalty will be applied" in the dialog it opens — one rule in several
 * renderers, all agreeing, all wrong, which is a failure this repo has already
 * shipped once. Every one of the five now reads `sendbackPenaltyFor`.
 *
 * ⛔⛔ **Never explain the amount by "how close to pickup".** The warehouse is
 * explicit and measured: 57h and 76h were charged nothing, 6h was charged
 * $12.50, 43h was charged $5.00. `sendback_calculation_reason` names the RULE
 * and the rule decides — `calc_before_cutoff` charges 1.2% of the time,
 * `calc_lead_time` 21.3%, and three same-day rules 100%. So a band here is a
 * band of a named market rule, not a distance from pickup, and `rule` below
 * carries the market's own words so nobody re-derives it as hours.
 * Source: `Project - In-App Balance Dashboard/References/Reference -
 * Transaction Type Triggers.md` §1c.
 *
 * ⚠️ **There is no 72-hour threshold anywhere in this business.** The real
 * thresholds are 48h, 24h, same-day, "the calendar day before", and named
 * wall-clock times in a mix of local/EST/CST. 72h is an EXPIRATION rule and
 * belongs to a different mechanism entirely.
 */

/**
 * ⛔⛔ **Two rows, two gates, and they must stay two.** Row 16 is what a driver
 * sees BEFORE taking a trip — the Request Feed pill and the accept warning. Row
 * 17 is what they see after — the two Upcoming pills. One gate would light both
 * from either row, and a reviewer focused on row 16 would meet row 17's
 * countdown on the way past, which reads as one feature rather than two.
 *
 * ⛔ Named here rather than called as `showsProposal(demo, [...])` in each page.
 * An inline gate is a rule no check can reach, and these two are swept by the
 * surface fingerprint that proves a built row behaves differently on the two
 * sides.
 */
export const SHORT_NOTICE_AT_TAKE_SOLUTIONS = ["short-notice-at-take"] as const;
export const SENDBACK_COUNTDOWN_SOLUTIONS = ["short-notice-countdown"] as const;

/** Row 16 — the Request Feed pill and the warning at the accept swipe. */
export function showsShortNoticeAtTake(focus: DemoFocus): boolean {
  return showsProposal(focus, SHORT_NOTICE_AT_TAKE_SOLUTIONS);
}

/** Row 17 — the two price pills on an Upcoming card. */
export function showsSendbackPenaltyPills(focus: DemoFocus): boolean {
  return showsProposal(focus, SENDBACK_COUNTDOWN_SOLUTIONS);
}

/** One band of a market's ladder. */
export interface PenaltyBand {
  /** Dollars a send-back costs inside this band. */
  amount: number;
  /**
   * The market's own words for when this band applies.
   *
   * ⛔ Quoted from `Reference - Client Market Setup/Rules and SLA Matrix.md`,
   * never paraphrased into hours. Paraphrasing is how "at or after 10:00 AM the
   * calendar day before pickup" becomes "within 24 hours", which is a different
   * rule that happens to agree on most trips.
   */
  rule: string;
}

/**
 * Each market's ladder, cheapest band first.
 *
 * ⚠️ **Keyed by `client·market`, because the rule is per CLIENT-MARKET.**
 * "GA" alone is not enough — Verida GA and MTM GA agree today and are still two
 * rows in the matrix, and Verida GA, Verida AR and Verida TN disagree with each
 * other. The key shape is what stops a later reader keying it on one of them.
 *
 * ⛔ Seeded from a document that already drifts from live: the Sept-2026 matrix
 * and the Feb-2026 agent reference disagree for Alivi FL and TCI TN, and two of
 * the per-market stories in `Other/Sendback Penalty/` say so in their own words.
 * This is a prototype's reading of the rule, not the rule.
 *
 * ⚠️ `CareSource` is deliberately absent — it has no row in the matrix, so
 * there is no rule to seed and `penaltyLadderFor` returns null for it. An
 * invented ladder would be worse than no pill.
 */
export const PENALTY_LADDERS: Record<string, readonly PenaltyBand[]> = {
  "Verida·GA": [
    { amount: 0, rule: "Greater than 48 hours" },
    { amount: 10, rule: "Less than 48 hours but not same day" },
    { amount: 25, rule: "Same-day sendback" },
  ],
  "MTM·GA": [
    { amount: 0, rule: "Greater than 48 hours" },
    { amount: 10, rule: "Less than 48 hours but not same day" },
    { amount: 25, rule: "Same-day sendback" },
  ],
  "Verida·TN": [
    { amount: 0, rule: "Greater than 24 hours" },
    { amount: 25, rule: "Same-day sendback" },
  ],
  "TCI·TN": [
    { amount: 0, rule: "Before 10 AM local the calendar day before pickup" },
    { amount: 25, rule: "At or after 10 AM local the calendar day before pickup" },
  ],
  "Alivi·FL": [
    { amount: 0, rule: "Before 11:00 AM the day prior" },
    { amount: 25, rule: "At or after 11:00 AM the day prior" },
    { amount: 40, rule: "Same-day, or after the scheduled pickup" },
  ],
};

/** The ladder this trip's send-back is priced against, or `null` if unknown. */
export function penaltyLadderFor(trip: Trip): readonly PenaltyBand[] | null {
  if (!trip.market) return null;
  return PENALTY_LADDERS[`${trip.client}·${trip.market}`] ?? null;
}

/**
 * Which band the trip sits in now — clamped, so a seed can never index past the
 * end of its market's ladder and read `undefined.amount`.
 */
function bandIndex(trip: Trip, ladder: readonly PenaltyBand[]): number {
  return Math.min(trip.penaltyBand ?? 0, ladder.length - 1);
}

/** What a send-back costs this trip right now, in whole dollars. */
export function sendbackPenaltyFor(trip: Trip): number {
  const ladder = penaltyLadderFor(trip);
  if (!ladder) return 0;
  return ladder[bandIndex(trip, ladder)].amount;
}

/**
 * The next band and how long until it starts, or `null` when there is none.
 *
 * ⚠️ `hours` is SEEDED, not computed. The prototype is clockless on purpose —
 * `MOCK_TODAY` is a constant and every pick-up time is fiction — and
 * `formatLongWait` already records what happens when real-clock arithmetic meets
 * a seeded ride time: a 1:50 PM pick-up offering "available at 2:29 AM",
 * arithmetically right and plainly nonsense. A real build computes this from the
 * market rule's own next boundary.
 */
export function nextPenaltyStepFor(
  trip: Trip,
): { hours: number; amount: number } | null {
  const ladder = penaltyLadderFor(trip);
  if (!ladder) return null;
  const next = ladder[bandIndex(trip, ladder) + 1];
  if (!next || trip.hoursToNextPenalty === undefined) return null;
  return { hours: trip.hoursToNextPenalty, amount: next.amount };
}

/**
 * Whether sending this trip back costs anything — i.e. whether it is
 * "short-notice" in the term production already uses.
 *
 * ⛔⛔ **This REPLACES `trip.sameDay === true`**, and the difference is the
 * whole of row 16. Same-day was the only priced band when there was one price;
 * a $10 band is short-notice too, and gating on `sameDay` would show no warning
 * and no penalty step on a trip that costs $10 to hand back.
 *
 * ⚠️ `sameDay` is NOT dead — it still seeds the top band of a ladder. What
 * changed is that it is an input to the band, not the test.
 */
export function isShortNoticeSendBack(trip: Trip): boolean {
  return sendbackPenaltyFor(trip) > 0;
}

/**
 * The pill naming what a send-back costs today, or `null` when the market has
 * no rule to price it against.
 *
 * ⛔ Built here, not in JSX. A label assembled in a list screen is a rule no
 * check can reach, and three screens render this one.
 *
 * ⚠️ **The free band gets a pill too.** "No pill" is indistinguishable from
 * "not built yet", and the whole point of row 16 is that silence is what the
 * driver gets today.
 */
export function penaltyPillFor(trip: Trip): TripPill | null {
  const ladder = penaltyLadderFor(trip);
  if (!ladder) return null;
  const amount = sendbackPenaltyFor(trip);
  const top = amount === ladder[ladder.length - 1].amount;
  if (amount === 0) return { label: "Free to send back", variant: "success" };
  return {
    label: `$${amount} to send back`,
    variant: top ? "danger" : "warning",
  };
}

/**
 * The Request Feed's pill — the SAME label, but only when there is a price.
 *
 * ⛔⛔ **Row 16 shows nothing on a free request, and row 17 shows "Free to send
 * back". The difference is not an inconsistency, it is the surface.** Row 17's
 * three Upcoming cards are a ladder seen side by side, where the free band is a
 * rung and naming it is the point. The Request Feed is not filtered by focus —
 * it shows every trip of the day, because the map needs them — so a free pill
 * lands on every request whose market has a rule. Measured on this seed: 4 free
 * pills against the 1 priced one the row exists to point at. The signal lost to
 * its own background.
 *
 * ⚠️ So on a feed, absence means "nothing to warn you about", which is also what
 * absence means for a market with no rule at all. That ambiguity is accepted
 * here and nowhere else: the feed's question is "which of these will cost me",
 * not "what does each one cost".
 */
export function requestPenaltyPillFor(trip: Trip): TripPill | null {
  return sendbackPenaltyFor(trip) > 0 ? penaltyPillFor(trip) : null;
}

/** The pill naming the next step and when it lands. `null` when there is none. */
export function nextPenaltyPillFor(trip: Trip): TripPill | null {
  const step = nextPenaltyStepFor(trip);
  if (!step) return null;
  return {
    label: `$${step.amount} in ${step.hours} ${step.hours === 1 ? "hr" : "hrs"}`,
    variant: "neutral",
  };
}

/** Both pills a card carries, in order, skipping the ones that do not apply. */
export function sendbackPenaltyPills(trip: Trip): TripPill[] {
  return [penaltyPillFor(trip), nextPenaltyPillFor(trip)].filter(
    (p): p is TripPill => p !== null,
  );
}
