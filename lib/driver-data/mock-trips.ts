import type { IncentiveType } from "@/lib/data/incentives";
import type { NoShowDemoRow } from "./no-show-rules";

/**
 * The day the prototype pretends it is.
 *
 * Seeded rather than read off the clock, following the repo's data-driven
 * convention: anything that windows on "the last N days" has to give the same
 * answer in a demo next month as it does today. Matches the dates already used by
 * the needs-action ride.
 */
/**
 * ⚠️ Every rider name here is INVENTED. Names shown in the production captures
 * are real members', so they are never copied into the seed — only their SHAPE
 * is (the app renders some names in caps, which the seed reproduces).
 */
export const MOCK_TODAY = "2026-07-31";

export type TripStatus = "request" | "upcoming" | "needs-action" | "in-progress" | "completed";
export type TimeAnchorType = "est-pickup" | "wait-for-call" | "appointment" | "scheduled";

/**
 * The market a trip belongs to.
 *
 * New with the Rider No-Show case, which is the first rule that varies by market
 * rather than by client alone. Nothing before this needed geography, so it is
 * optional — an absent market means "not one of the markets with a special rule".
 */
export type MarketCode = "GA" | "FL" | "NC" | "TN" | "IN";

/**
 * The three swipes a driver makes to move a leg forward.
 *
 * Sequence per reference screenshots `s-01a/b/c`:
 *   SWIPE TO START  →  PICK UP MEMBER  →  DROP OFF MEMBER
 *
 * Each value is the time the driver swiped, or `null` when that swipe has not been
 * made. Marks fill left to right; a driver cannot swipe out of order.
 *
 * Which mark is set is what gates Rider No-Show: only a leg that is en-route —
 * started, not yet picked up — can have a member who failed to come out.
 */
export interface LegSwipeProgress {
  /** Swiped "start" — the driver begins the leg / heads to pickup. */
  startedAt: string | null;
  /** Swiped "pick up member". */
  pickedUpAt: string | null;
  /** Swiped "drop off member" — completes the leg. */
  droppedOffAt: string | null;
  /**
   * Odometer readings captured BY the pick-up and drop-off swipes.
   *
   * ⚠️ Optional so the twenty-odd rides seeded before this slice stay valid —
   * absent means the reading was never captured, which is the honest state for a
   * ride nobody asked the question of.
   *
   * ⛔⛔ **An odometer is the one answer no amount of location data can
   * reconstruct.** A time can be proposed from the trail — the app saw where the
   * driver was and when. A reading exists only because a swipe captured it, and
   * on a missed swipe that is precisely what did not happen. So a missing
   * odometer opens BLANK and says so; it is never guessed at.
   */
  pickedUpOdometer?: number | null;
  droppedOffOdometer?: number | null;
}

/**
 * One location fix, as the server would have stored it.
 *
 * ⚠️ **SEEDED.** The prototype has no GPS. `ageMinutes` is the age at the moment
 * the screen mounted; a live clock advances it, so a countdown really does run
 * down and the gate really does open when it reaches zero.
 *
 * Declared here rather than beside the rule that reads it, because this is seed
 * data and `no-show-rules` already imports from this module — the other
 * direction would be a cycle.
 */
export interface LocationRecord {
  /** Minutes before "now" this fix was recorded, at mount. */
  ageMinutes: number;
  /**
   * Straight-line miles from the PICK-UP.
   *
   * ⚠️ The name predates there being a second anchor, and is kept because
   * `walkLocationRecords` is a line-for-line port of production and reads it.
   * Renaming it would make that port stop matching the code it mirrors.
   */
  distanceMiles: number;
  /**
   * Straight-line miles from the DROP-OFF.
   *
   * Optional, and only the Missed Swipe rides seed it — the no-show rule only
   * ever asks about the pick-up, so every ride that predates this slice has one
   * anchor and needs no second distance. A fix with no value here simply cannot
   * corroborate a drop-off, which is the honest reading of a record stored
   * before anyone asked the question.
   */
  dropoffDistanceMiles?: number;
  /**
   * The wall clock this fix was recorded at, e.g. "11:20 AM".
   *
   * ⛔⛔ **Why both this and `ageMinutes`.** `ageMinutes` is relative to the
   * driver's REAL phone clock, which is right for Rider No-Show — that case is
   * about the last twenty minutes, so a countdown has to run against now. It is
   * wrong for Missed Swipe, which reconstructs a leg whose other marks are
   * seeded clock faces on `MOCK_TODAY`: prefilling from `ageMinutes` produced a
   * pick-up of 3:19 AM against an en-route mark of 11:08 AM, and the form's own
   * time-order warning then told the driver their own prefilled answer was
   * impossible.
   *
   * So the missed-swipe rides seed the clock directly and the no-show rides do
   * not. `ageMinutes` still drives every rule — radius, ordering, the lookback —
   * and `at` is only how a matched fix is SHOWN. `verify-missed-swipe` asserts
   * the two agree in ordering, so a seed cannot drift into saying one thing by
   * age and another by clock.
   */
  at?: string;
}

export interface TripLeg {
  id: string;
  type: TimeAnchorType;
  label: string;
  time: string;
  address: string;
  county: string;
  revenue: number;
  /**
   * Leg identifier shown in the timeline marker and the swipe CTA sub-line
   * ("A Leg"), per reference screenshots.
   */
  legCode?: "A" | "B" | "C" | "D";
  /**
   * Revenue caption shown to the right of the time, e.g. "Accepted by you".
   * Per reference screenshots this replaces the stacked revenue display on
   * accepted/active rides.
   */
  revenueNote?: string;
  /**
   * Swipe state for this leg. Optional — only legs the driver has accepted
   * carry it, so the existing seeded trips are unaffected.
   */
  progress?: LegSwipeProgress;
  /**
   * The driver's location fixes, as the server would have them.
   *
   * ⚠️ **SEEDED, and the whole scenario lives here.** Every Rider No-Show
   * outcome is a different shape of this array — which is the point: the real
   * check is a walk over these records, so seeding the records rather than the
   * verdict means each ride genuinely exercises the rule.
   *
   * Newest-first is not required; `walkLocationRecords` sorts by age.
   */
  locationRecords?: LocationRecord[];
  /**
   * Minutes since the leg's scheduled pick-up time, at mount. Negative = early.
   *
   * ⚠️ Only read by the WellTrans Indiana rule, and only seeded on those rides.
   * Not derived from `time` because the prototype has no clock to compare it to.
   */
  minutesSinceScheduledPickup?: number;
}

/**
 * How far along a leg is, derived purely from which swipe marks are present.
 *
 * Marks fill left to right, always. A driver cannot swipe out of order, so there
 * is no "gap" state to model — a blank mark simply has not been made yet.
 *
 * `started` is the stage this branch cares about: en-route, member not yet
 * aboard. It is the only window in which a no-show can be filed.
 */
export type LegSwipeStage =
  | "not-started"
  | "started"
  | "picked-up"
  | "completed";

/** Which swipe a driver is expected to make next on a leg. */
export type NextSwipe = "start" | "pick-up" | "drop-off" | null;

/** Derive a leg's stage from its swipe marks. */
export function getLegStage(leg: TripLeg): LegSwipeStage {
  const p = leg.progress;
  if (!p) return "not-started";
  if (p.droppedOffAt) return "completed";
  if (p.pickedUpAt) return "picked-up";
  if (p.startedAt) return "started";
  return "not-started";
}

/** The swipe the driver is expected to make next; null once the leg is done. */
export function getNextSwipe(leg: TripLeg): NextSwipe {
  switch (getLegStage(leg)) {
    case "not-started":
      return "start";
    case "started":
      return "pick-up";
    case "picked-up":
      return "drop-off";
    case "completed":
      return null;
  }
}

/**
 * Driver-facing status for a leg, derived from its swipe marks.
 *
 * ⚠️ Provisional vocabulary. The real app's status names still need confirming —
 * "Ready for pickup" in particular may be a distinct state we do not model,
 * since our swipe sequence has no separate "arrived" mark.
 */
export function getLegStatusLabel(leg: TripLeg): string {
  switch (getLegStage(leg)) {
    case "not-started":
      return "Not started";
    case "started":
      return "Enroute";
    case "picked-up":
      return "Onboard";
    case "completed":
      return "Completed";
  }
}

/**
 * The numbers production's Phone Options popup offers for a trip.
 *
 * Keyed rather than a list because each one means something different to
 * Support: the rider's own phone, the number at the pick-up (often a facility
 * desk) and the number at the drop-off. "I could not reach them" is a different
 * claim about each.
 */
export interface TripContacts {
  riderPhone?: string;
  pickupPhone?: string;
  dropoffPhone?: string;
}

export interface Trip {
  id: string;
  date: string;
  rider: string;
  client: string;
  /**
   * Market this trip runs in. Optional — only seeded where a rule depends on it.
   *
   * Geography was previously inferrable only from `leg.address` / `leg.county`
   * free text, which is not something a rule should parse.
   */
  market?: MarketCode;
  passengerCount: number;
  distance: string;
  totalRevenue: number;
  notes: string;
  legs: TripLeg[];
  status: TripStatus;
  pills: TripPill[];
  /** Incentive programs this trip qualifies for (v1: multi-incentive support). */
  incentiveTypes: IncentiveType[];
  /** Whether this client/market is enrolled in incentive programs. */
  clientEnrolledInIncentives?: boolean;
  /**
   * Whether the rider's signature was captured on completion.
   *
   * ⚠️ **SEEDED.** The prototype captures no signatures. It exists because
   * Ride History's filter offers **Missing Signatures** (capture `04-03`) and a
   * filter with nothing to filter is a dead control. Completed Ride Details
   * shows a Signatures section (capture `04-04`), so the state is real in
   * production — only these values are invented.
   *
   * Absent is treated as captured; only an explicit `false` is "missing".
   */
  signatureCaptured?: boolean;
  /**
   * Whether the trip ran late against its appointment time.
   *
   * ⚠️ **SEEDED**, for the same reason — Ride History filters on **Late Trips**.
   * Not derived from the leg times, because the prototype has no clock to
   * compare them against.
   */
  wasLate?: boolean;
  /**
   * ⚠️ **DEMO SCAFFOLDING.** Which row of the Member No-Show comparison matrix
   * this ride demonstrates — a plain number is production today, a decimal is a
   * proposal. See `NoShowDemoRow`. Absent means today's behaviour.
   */
  noShowDemo?: NoShowDemoRow;
  /**
   * ⚠️ **DEMO SCAFFOLDING.** Which solution scenario this ride IS.
   *
   * The prototype carries 26 proposed features and one app, so by slice three
   * the ride list had become a pile of lookalike cards with production pills on
   * them and no way to tell which one demonstrated what. A scenario ride says so
   * on its own card, and the selector can show only the rides belonging to the
   * solution in focus.
   *
   * Absent means a plain mirror ride — one of the base's own state demos, kept
   * faithful and filtered OUT while a solution is focused.
   */
  scenario?: TripScenario;
  /**
   * The member-facing numbers this trip carries, as production's Phone Options
   * popup lists them.
   *
   * ⚠️ **Optional per key, deliberately.** The stage map records the numbers as
   * client-provided and varying per trip, so a leg may carry one, two or three.
   * Anything that offers these has to offer what the trip ACTUALLY has — a fixed
   * list of three would invite a driver to report an attempt on a number that
   * was never on their screen.
   *
   * ⛔ `Wingz Support` is in the production popup and is NOT here. It is calling
   * us, not the member, so it can never be evidence of trying to reach them.
   *
   * ⚠️ Every value is in the 555-01xx range reserved for fiction. These are
   * seeds; no real number belongs in this repo.
   */
  contacts?: TripContacts;
  /**
   * Whether this is a same-day / Will-Call trip.
   *
   * ⚠️ Seeded rather than derived from `date`. The prototype has no clock — a
   * derived version would flip to "same-day" on exactly one real-world day and
   * read as a bug on every other. What it selects is the Reach Rider modal's
   * SAME-DAY variant, whose third option advances the trip instead of closing.
   */
  sameDay?: boolean;
  /**
   * The round trip this ride is one leg of.
   *
   * ⚠️ EXPLICIT, never inferred from rider name and date. Two members can share
   * a name and one member can have two unrelated rides in a day; an inferred
   * group would offer a stranger's leg on a cancellation request. Declared,
   * never derived.
   *
   * Absent means a one-way ride, which is the honest answer for most of the
   * seed — only catalogue row 17 needs the grouping, because production's own
   * decline template removes several leg ids at once (`CAP-225`).
   */
  tripGroup?: string;
  /**
   * The standing order this trip belongs to, if any.
   *
   * ⚠️ **An ID, not a boolean**, because that is the shape production has:
   * `Project - Standing Order Offers` records that Verida carries an SO ID on
   * the trip/leg payload, while Alivi has none and is matched to a generated
   * internal id by member. A boolean would model neither and would have to be
   * replaced the moment anything needed to name the order.
   *
   * ⛔ Presence is the whole predicate here — see `isStandingOrder`. The
   * prototype does not resolve the order, list its trips or know its pattern;
   * that is the Standing Order Offers project's work, not this one's.
   */
  standingOrderId?: string;
  /**
   * The dispatch reference a driver reads down the phone when this request is
   * over the vehicle's capacity — catalogue rows 11 and 12.
   *
   * ⛔⛔ **Presence is the predicate** — see `isOverCapacity`. The screen
   * cannot render the swipe without the number, because it is in the first
   * line, so a trip flagged over-capacity without one would show a CTA with a
   * blank where its reference should be. One field, carrying the thing the
   * driver actually says out loud.
   *
   * ⚠️ `CAP-340` shows a THIRD identifier here: the header and `Leg:` both
   * read `202610131450161`, and the swipe says `Trip # 2156877`. The one number
   * the call turns on appears nowhere else on the screen.
   *
   * ⚠️ **SEEDED, and the shape is copied, not the value.** The capture's own
   * number belongs to a test trip; this is a seven-digit invention, like every
   * other identifier in this file.
   */
  overCapacityTripNumber?: string;
  /**
   * When the driver was TOLD Wingz cancelled this ride — the moment
   * production's alert fired, in the seed's own `date · time` format.
   *
   * ⛔⛔ **Presence is the whole predicate** — see `isClientCancelled`. The app
   * does not know when the cancellation was DECIDED, only when it learned;
   * naming the field for the notice is what stops a later reader treating it
   * as the client's own timestamp.
   *
   * ⛔⛔ **NOT the driver's own cancellation report.** That is
   * `cancellationRequests` in the ride-flow provider and `rider-declined.ts`,
   * and it runs the opposite direction — the driver asking for a trip to come
   * off, which nobody has granted. This one is Wingz having already done it.
   * The two must never be read as one field. `CAP-341` / `CAP-342`.
   *
   * ⚠️ A flat scalar, like `overCapacityTripNumber` and `standingOrderId`. A
   * one-key object is an invitation to add a second key nobody decided, and
   * there is no second fact here: production's own screen says "No action is
   * required" and gives neither a reason nor who asked.
   */
  clientCancelNoticeAt?: string;
  /**
   * Pills a SCREEN adds at render time, e.g. "Waiting on Support".
   *
   * ⚠️ Separate from `pills` because those are seed decoration and a scenario
   * ride replaces them, while this is live status and must survive that swap.
   * Collapsing the two hid the Pending tab's own marker the moment the ride
   * happened to be a scenario ride — which is every ride that can reach it.
   */
  statusPills?: TripPill[];
}

/**
 * A ride that exists to demonstrate one or more catalogue solutions.
 *
 * ⚠️ `solutions` holds catalogue ids, and `verify-solutions` resolves every one
 * of them — a typo here would silently filter a ride out of its own demo rather
 * than failing, which is the quietest possible way to break a walkthrough.
 */
export interface TripScenario {
  /**
   * Short, **stable** handle shown first on the pill, e.g. "03a".
   *
   * ⛔⛔ **Minted from the catalogue row number once, and never re-minted.**
   * Inserting a row renumbers every row after it, and the handles deliberately
   * do NOT follow: they are printed on pills, quoted in four check scripts and
   * used as identifiers, and a handle that moves is a handle nobody can cite.
   * After the 2026-10-15 insertion at order 13, `13a`–`13c` belong to row 14,
   * `16a`/`16b` to row 17, `18a`–`18m` to row 19, `19a`–`19f` to row 20 and
   * `20a`/`20b` to row 21.
   *
   * ⛔ So the handle is NOT the link to the catalogue. `solutions` below is,
   * and it is keyed by id — which no renumber touches.
   */
  code: string;
  /** What this ride is the case OF, in a few words. */
  label: string;
  /** Catalogue solution ids this ride demonstrates. */
  solutions: string[];
  /**
   * Tagged for the solution, but carrying NO demo pill.
   *
   * ⛔⛔ **For a row whose demo is the LIST, not any one ride in it.** Row 19's
   * argument is thirteen rides of which three are cancelled; each ride is the
   * backdrop, not the exhibit. Labelling every card `18a · Still on` put the
   * same sentence on ten cards and competed with the one pill that carries the
   * only distinction that matters — `Cancelled`. (User direction, 2026-10-15.)
   *
   * ⚠️ It silences the PILL and nothing else. The ride is still a scenario
   * ride: `ridesForSolution` still filters to it, `isScenarioFor` still
   * answers true, and every count that reads the seed still sees it. Dropping
   * `scenario` instead would empty the tab the moment the row was focused.
   */
  silent?: boolean;
}

export interface TripPill {
  label: string;
  variant: "success" | "warning" | "attention" | "neutral" | "danger";
}

// Mock request trips (available to claim).
// v1 MULTI-INCENTIVE: trips can qualify for multiple incentives (incentiveTypes array).
// Some trips have no incentive at all — incentiveTypes: [].
// Spread across 8 incentives with 2-3 qualifying trips each.
export const mockRequestTrips: Trip[] = [
  // ⚠️ DATES CLUSTERED for the map view. Requests filters by pickup day, so a
  // seed with one trip per day renders a map with one pin and never exercises
  // the screen. The 23 trips are grouped 16 / 4 / 3 across three days; the 16
  // reproduces the canonical capture's count line — "16 of 16 trips shown ·
  // Thu, Sep 24" (CAP row for `03-10 - B2 Map - Collapsed Loaded`) — so a
  // render can be held against that capture directly. Only the dates moved.
  /**
   * ⭐⭐ Catalogue rows 11 and 12's scenario request — the one with no accept
   * control. See `lib/driver-data/over-capacity.ts`.
   *
   * ⚠️ `passengerCount: 4` against a vehicle that cannot take four is the
   * whole case, and the prototype has no vehicle record to compare it to — so
   * the over-capacity state is SEEDED rather than derived. Deriving it would
   * mean inventing a vehicle table to make one screen reachable.
   */
  {
    id: "REQ-OVERCAP-001",
    date: "Thu, Sep 24, 2026",
    rider: "MARISOL ANDRADE",
    client: "Verida",
    passengerCount: 4,
    distance: "6.4 mi away",
    totalRevenue: 26.53,
    notes: "Wheelchair plus three accompanying passengers",
    overCapacityTripNumber: "2149503",
    scenario: {
      code: "11a",
      label: "Over capacity — no way to accept, only a number to call",
      solutions: [
        "vehicle-capacity-cleanse",
        "vehicle-capacity-backend",
        "over-capacity-exception",
      ],
    },
    legs: [
      {
        id: "leg-oc-a",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "9:05 AM",
        address: "2210 Pineview Terrace, Lonoke, AR 72086",
        county: "Lonoke County",
        revenue: 26.53,
      },
      {
        id: "leg-oc-b",
        type: "appointment",
        label: "Est Drop-off Time",
        time: "9:54 AM",
        address: "640 E South St, Cave City, AR 72521",
        county: "Sharp County",
        revenue: 0,
      },
    ],
    status: "request",
    pills: [{ label: "Expires in 6 days", variant: "neutral" }],
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },
  // ===== WEEKEND WARRIOR (3 trips) =====
  {
    id: "REQ-WW-001",
    date: "Thu, Sep 24, 2026",
    rider: "ROSALIND PEMBER",
    client: "Verida",
    passengerCount: 1,
    distance: "8.2 mi away",
    totalRevenue: 70.25,
    notes: "Standing weekend dialysis appointment",
    legs: [
      {
        id: "leg-1",
        type: "wait-for-call",
        label: "Est Pick-up Time - Wait For Call",
        time: "1:30 PM",
        address: "CHOA- Marcus Autism Center, 1920 Briarcliff Rd NE, Atlanta, GA 30329",
        county: "DeKalb County",
        revenue: 45.25,
      },
      {
        id: "leg-1b",
        type: "appointment",
        label: "Appointment Time",
        time: "2:16 PM",
        address: "33 Golden Eagle Pkwy, Braselton, GA 30517",
        county: "Jackson County",
        revenue: 25.00,
      },
    ],
    status: "request",
    pills: [{ label: "Expires in 185 days", variant: "neutral" }],
    incentiveTypes: ["weekend-warrior"],
    clientEnrolledInIncentives: true,
  },
  {
    id: "REQ-WW-002",
    date: "Thu, Sep 24, 2026",
    rider: "Jamie L.",
    client: "MTM",
    passengerCount: 2,
    distance: "12.5 mi away",
    totalRevenue: 45.00,
    notes: "",
    legs: [
      {
        id: "leg-1",
        type: "wait-for-call",
        label: "Est Pick-up Time - Wait For Call",
        time: "11:00 AM",
        address: "567 Oak Street, Decatur, GA 30030",
        county: "DeKalb County",
        revenue: 45.00,
      },
    ],
    status: "request",
    pills: [
      { label: "Wait For Call", variant: "attention" },
      { label: "Expires in 2 days", variant: "neutral" },
    ],
    incentiveTypes: ["weekend-warrior"],
    clientEnrolledInIncentives: true,
  },
  {
    id: "REQ-WW-003",
    date: "Thu, Sep 24, 2026",
    rider: "Taylor R.",
    client: "Verida",
    passengerCount: 1,
    distance: "5.8 mi away",
    totalRevenue: 28.00,
    notes: "Please text upon arrival",
    legs: [
      {
        id: "leg-1",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "10:00 AM",
        address: "890 Pine Ave, Marietta, GA 30060",
        county: "Cobb County",
        revenue: 28.00,
      },
      {
        id: "leg-1b",
        type: "appointment",
        label: "Appointment Time",
        time: "10:45 AM",
        address: "Wellstar Kennestone, 677 Church St, Marietta, GA 30060",
        county: "Cobb County",
        revenue: 0,
      },
    ],
    status: "request",
    pills: [{ label: "Expires in 3 days", variant: "neutral" }],
    incentiveTypes: ["weekend-warrior"],
    clientEnrolledInIncentives: true,
  },

  // ===== EARLY BIRD (3 trips, pre-9am pickups) =====
  {
    id: "REQ-EB-001",
    date: "Thu, Sep 24, 2026",
    rider: "Casey P.",
    client: "Verida",
    passengerCount: 1,
    distance: "9.1 mi away",
    totalRevenue: 38.00,
    notes: "Early morning dialysis appointment",
    legs: [
      {
        id: "leg-1",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "6:45 AM",
        address: "456 Morning Glory Ln, Smyrna, GA 30080",
        county: "Cobb County",
        revenue: 38.00,
      },
      {
        id: "leg-1b",
        type: "appointment",
        label: "Appointment Time",
        time: "7:30 AM",
        address: "DaVita Dialysis, 2100 W Paces Ferry Rd, Atlanta, GA 30327",
        county: "Fulton County",
        revenue: 0,
      },
    ],
    status: "request",
    pills: [{ label: "Expires in 12 hours", variant: "neutral" }],
    incentiveTypes: ["early-bird"],
    clientEnrolledInIncentives: true,
  },
  {
    id: "REQ-EB-002",
    date: "Thu, Sep 24, 2026",
    rider: "Robin H.",
    client: "Verida",
    passengerCount: 1,
    distance: "6.3 mi away",
    totalRevenue: 32.50,
    notes: "",
    legs: [
      {
        id: "leg-1",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "7:15 AM",
        address: "812 Sunrise Blvd, Atlanta, GA 30309",
        county: "Fulton County",
        revenue: 32.50,
      },
    ],
    status: "request",
    pills: [
      { label: "Single Legs Allowed", variant: "success" },
      { label: "Expires in 1 day", variant: "neutral" },
    ],
    incentiveTypes: ["early-bird"],
    clientEnrolledInIncentives: true,
  },
  {
    id: "REQ-EB-003",
    date: "Thu, Sep 24, 2026",
    rider: "Sam K.",
    client: "MTM",
    passengerCount: 1,
    distance: "10.4 mi away",
    totalRevenue: 41.00,
    notes: "Wheelchair accessible vehicle required",
    legs: [
      {
        id: "leg-1",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "8:30 AM",
        address: "1100 Briarwood Rd, Decatur, GA 30033",
        county: "DeKalb County",
        revenue: 41.00,
      },
    ],
    status: "request",
    pills: [{ label: "Expires in 2 days", variant: "neutral" }],
    incentiveTypes: ["early-bird"],
    clientEnrolledInIncentives: true,
  },

  // ===== PEAK PERFORMER (3 trips, 5-9am or 4-8pm) =====
  {
    id: "REQ-PH-001",
    date: "Thu, Sep 24, 2026",
    rider: "Jordan S.",
    client: "Verida",
    passengerCount: 1,
    distance: "7.2 mi away",
    totalRevenue: 35.00,
    notes: "",
    legs: [
      {
        id: "leg-1",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "5:30 PM",
        address: "789 Corporate Blvd, Sandy Springs, GA 30328",
        county: "Fulton County",
        revenue: 35.00,
      },
    ],
    status: "request",
    pills: [{ label: "Expires in 4 hours", variant: "warning" }],
    incentiveTypes: ["peak-hours"],
    clientEnrolledInIncentives: true,
  },
  {
    id: "REQ-PH-002",
    date: "Thu, Sep 24, 2026",
    rider: "Riley T.",
    client: "Verida",
    passengerCount: 1,
    distance: "8.1 mi away",
    totalRevenue: 38.00,
    notes: "Standing morning appointment",
    legs: [
      {
        id: "leg-1",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "6:30 AM",
        address: "Emory Rehab, 1441 Clifton Rd, Atlanta, GA 30322",
        county: "DeKalb County",
        revenue: 38.00,
      },
    ],
    status: "request",
    pills: [{ label: "Expires in 1 day", variant: "neutral" }],
    incentiveTypes: ["peak-hours"],
    clientEnrolledInIncentives: true,
  },
  {
    id: "REQ-PH-003",
    date: "Thu, Sep 24, 2026",
    rider: "Drew C.",
    client: "MTM",
    passengerCount: 1,
    distance: "11.0 mi away",
    totalRevenue: 47.50,
    notes: "Return trip from therapy",
    legs: [
      {
        id: "leg-1",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "7:30 PM",
        address: "1500 Peachtree Industrial, Norcross, GA 30093",
        county: "Gwinnett County",
        revenue: 47.50,
      },
    ],
    status: "request",
    pills: [{ label: "Expires in 3 days", variant: "neutral" }],
    incentiveTypes: ["peak-hours"],
    clientEnrolledInIncentives: true,
  },

  // ===== LOYALTY STREAK (2 trips) =====
  {
    id: "REQ-LS-001",
    date: "Thu, Sep 24, 2026",
    rider: "Pat L.",
    client: "Verida",
    passengerCount: 1,
    distance: "6.0 mi away",
    totalRevenue: 30.00,
    notes: "",
    legs: [
      {
        id: "leg-1",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "10:00 AM",
        address: "245 Spring St, Atlanta, GA 30308",
        county: "Fulton County",
        revenue: 30.00,
      },
    ],
    status: "request",
    pills: [{ label: "Expires in 1 day", variant: "neutral" }],
    incentiveTypes: ["loyalty-streak"],
    clientEnrolledInIncentives: true,
  },
  {
    id: "REQ-LS-002",
    date: "Thu, Sep 24, 2026",
    rider: "Quinn N.",
    client: "Verida",
    passengerCount: 1,
    distance: "7.4 mi away",
    totalRevenue: 33.50,
    notes: "",
    legs: [
      {
        id: "leg-1",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "11:00 AM",
        address: "1800 Clairmont Rd, Decatur, GA 30033",
        county: "DeKalb County",
        revenue: 33.50,
      },
    ],
    status: "request",
    pills: [{ label: "Expires in 2 days", variant: "neutral" }],
    incentiveTypes: ["loyalty-streak"],
    clientEnrolledInIncentives: true,
  },

  // ===== WHITE GLOVE (3 trips, door-to-door) =====
  {
    id: "REQ-WG-001",
    date: "Thu, Sep 24, 2026",
    rider: "Skyler V.",
    client: "Verida",
    passengerCount: 1,
    distance: "5.5 mi away",
    totalRevenue: 42.50,
    notes: "Door-to-door assistance required — wheelchair",
    legs: [
      {
        id: "leg-1",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "11:00 AM",
        address: "234 Cobb Pkwy NW, Marietta, GA 30062",
        county: "Cobb County",
        revenue: 42.50,
      },
    ],
    status: "request",
    pills: [{ label: "Expires in 1 day", variant: "neutral" }],
    incentiveTypes: ["white-glove"],
    clientEnrolledInIncentives: true,
  },
  {
    id: "REQ-WG-002",
    date: "Thu, Sep 24, 2026",
    rider: "Charlie B.",
    client: "Verida",
    passengerCount: 1,
    distance: "8.0 mi away",
    totalRevenue: 48.00,
    notes: "Door-to-door — escort to appointment",
    legs: [
      {
        id: "leg-1",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "2:00 PM",
        address: "1500 Peachtree St NE, Atlanta, GA 30309",
        county: "Fulton County",
        revenue: 48.00,
      },
    ],
    status: "request",
    pills: [{ label: "Expires in 2 days", variant: "neutral" }],
    incentiveTypes: ["white-glove"],
    clientEnrolledInIncentives: true,
  },
  {
    id: "REQ-WG-003",
    date: "Thu, Sep 24, 2026",
    rider: "Avery M.",
    client: "MTM",
    passengerCount: 1,
    distance: "9.2 mi away",
    totalRevenue: 52.50,
    notes: "Door-to-door — mobility aid required",
    legs: [
      {
        id: "leg-1",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "3:00 PM",
        address: "2200 Roswell Rd, Marietta, GA 30062",
        county: "Cobb County",
        revenue: 52.50,
      },
    ],
    status: "request",
    pills: [{ label: "Expires in 4 days", variant: "neutral" }],
    incentiveTypes: ["white-glove"],
    clientEnrolledInIncentives: true,
  },

  // ===== QUICK WINS (2 trips, short distance) =====
  {
    id: "REQ-QW-001",
    date: "Thu, Sep 24, 2026",
    rider: "Reese O.",
    client: "Verida",
    passengerCount: 1,
    distance: "2.1 mi away",
    totalRevenue: 14.50,
    notes: "Short hop to clinic",
    legs: [
      {
        id: "leg-1",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "12:00 PM",
        address: "300 N Highland Ave NE, Atlanta, GA 30307",
        county: "Fulton County",
        revenue: 14.50,
      },
    ],
    status: "request",
    pills: [
      { label: "Single Legs Allowed", variant: "success" },
      { label: "Expires in 1 day", variant: "neutral" },
    ],
    incentiveTypes: ["quick-wins"],
    clientEnrolledInIncentives: true,
  },
  {
    id: "REQ-QW-002",
    date: "Thu, Sep 24, 2026",
    rider: "Quincy E.",
    client: "Verida",
    passengerCount: 1,
    distance: "1.8 mi away",
    totalRevenue: 12.75,
    notes: "Quick local trip",
    legs: [
      {
        id: "leg-1",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "1:00 PM",
        address: "670 Ponce de Leon Ave, Decatur, GA 30030",
        county: "DeKalb County",
        revenue: 12.75,
      },
    ],
    status: "request",
    pills: [{ label: "Expires in 2 days", variant: "neutral" }],
    incentiveTypes: ["quick-wins"],
    clientEnrolledInIncentives: true,
  },

  // ===== HOMETOWN HERO (2 trips, same county pickup+dropoff) =====
  {
    id: "REQ-HH-001",
    date: "Fri, Sep 25, 2026",
    rider: "Frankie P.",
    client: "Verida",
    passengerCount: 1,
    distance: "4.5 mi away",
    totalRevenue: 26.00,
    notes: "Local Fulton trip",
    legs: [
      {
        id: "leg-1",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "9:30 AM",
        address: "1200 W Peachtree St NW, Atlanta, GA 30309",
        county: "Fulton County",
        revenue: 26.00,
      },
      {
        id: "leg-1b",
        type: "appointment",
        label: "Appointment Time",
        time: "10:15 AM",
        address: "Piedmont Hospital, 1968 Peachtree Rd, Atlanta, GA 30309",
        county: "Fulton County",
        revenue: 0,
      },
    ],
    status: "request",
    pills: [{ label: "Expires in 4 days", variant: "neutral" }],
    incentiveTypes: ["hometown-hero"],
    clientEnrolledInIncentives: true,
  },
  {
    id: "REQ-HH-002",
    date: "Fri, Sep 25, 2026",
    rider: "Bailey H.",
    client: "MTM",
    passengerCount: 1,
    distance: "5.0 mi away",
    totalRevenue: 28.50,
    notes: "Cobb-internal trip",
    legs: [
      {
        id: "leg-1",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "10:30 AM",
        address: "100 N Marietta Pkwy, Marietta, GA 30060",
        county: "Cobb County",
        revenue: 28.50,
      },
      {
        id: "leg-1b",
        type: "appointment",
        label: "Appointment Time",
        time: "11:00 AM",
        address: "Wellstar Kennestone, 677 Church St, Marietta, GA 30060",
        county: "Cobb County",
        revenue: 0,
      },
    ],
    status: "request",
    pills: [{ label: "Expires in 6 days", variant: "neutral" }],
    incentiveTypes: ["hometown-hero"],
    clientEnrolledInIncentives: true,
  },

  // ===== SQUAD GOALS (2 trips, multi-rider) =====
  {
    id: "REQ-SG-001",
    date: "Fri, Sep 25, 2026",
    rider: "Group: 3 riders",
    client: "Verida",
    passengerCount: 3,
    distance: "11.5 mi away",
    totalRevenue: 68.00,
    notes: "Multi-load — 3 passengers",
    legs: [
      {
        id: "leg-1",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "12:00 PM",
        address: "789 Boulevard NE, Atlanta, GA 30308",
        county: "Fulton County",
        revenue: 68.00,
      },
    ],
    status: "request",
    pills: [{ label: "Expires in 7 days", variant: "neutral" }],
    incentiveTypes: ["squad-goals"],
    clientEnrolledInIncentives: true,
  },
  {
    id: "REQ-SG-002",
    date: "Fri, Sep 25, 2026",
    rider: "Group: 4 riders",
    client: "MTM",
    passengerCount: 4,
    distance: "13.2 mi away",
    totalRevenue: 82.00,
    notes: "Multi-load — 4 passengers, group transport",
    legs: [
      {
        id: "leg-1",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "1:00 PM",
        address: "555 N Druid Hills Rd NE, Atlanta, GA 30329",
        county: "DeKalb County",
        revenue: 82.00,
      },
    ],
    status: "request",
    pills: [{ label: "Expires in 8 days", variant: "neutral" }],
    incentiveTypes: ["squad-goals"],
    clientEnrolledInIncentives: true,
  },

  // ===== NON-INCENTIVIZED (3 trips — no chip) =====
  {
    id: "REQ-NONE-001",
    date: "Sat, Sep 26, 2026",
    rider: "Morgan K.",
    client: "CareSource",
    passengerCount: 1,
    distance: "15.2 mi away",
    totalRevenue: 52.00,
    notes: "",
    legs: [
      {
        id: "leg-1",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "11:30 AM",
        address: "234 Elm Drive, Alpharetta, GA 30009",
        county: "Fulton County",
        revenue: 52.00,
      },
    ],
    status: "request",
    pills: [
      { label: "Single Legs Allowed", variant: "success" },
      { label: "Expires in 6 hours", variant: "warning" },
    ],
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },
  {
    id: "REQ-NONE-002",
    date: "Sat, Sep 26, 2026",
    rider: "Andrew Test",
    client: "Verida",
    passengerCount: 1,
    distance: "10.4 mi away",
    totalRevenue: 13.30,
    notes: "Postman generated ride for manual t...",
    legs: [
      {
        id: "leg-1",
        type: "wait-for-call",
        label: "Est Pick-up Time - Wait For Call",
        time: "9:20 AM",
        address: "123 Main St, Atlanta, GA",
        county: "Fulton County",
        revenue: 13.30,
      },
    ],
    status: "request",
    pills: [
      { label: "Single Legs Allowed", variant: "success" },
      { label: "Expires in 4 hours", variant: "warning" },
    ],
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },
  {
    id: "REQ-NONE-003",
    date: "Sat, Sep 26, 2026",
    rider: "Test Rider",
    client: "CareSource",
    passengerCount: 1,
    distance: "16.8 mi away",
    totalRevenue: 58.00,
    notes: "",
    legs: [
      {
        id: "leg-1",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "2:30 PM",
        address: "5000 Buford Hwy, Atlanta, GA 30341",
        county: "DeKalb County",
        revenue: 58.00,
      },
    ],
    status: "request",
    pills: [{ label: "Expires in 3 days", variant: "neutral" }],
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },

  // ===== 10a / 10b / 10c — the member filter has something to find =====
  //
  // Catalogue row 10: "Request Feed filter by member, so the driver can find
  // that member's trips themselves."
  //
  // ⛔⛔ **Without these the feature cannot be demonstrated at all.** Before this
  // slice every one of the 23 seeded requests carried a DIFFERENT rider name, so
  // filtering by any member returned exactly one trip — a control that is
  // indistinguishable from a broken one. AMARA OKONKWO is the member who already
  // appears twice in `mockCompletedTrips`, which is what makes her the one the
  // driver "already drives": the form's member picker reads that history and the
  // feed filter reads these, and they are two halves of one scenario.
  //
  // Three trips across all three seeded days on purpose — a filter that returned
  // only today's would look identical to one that was silently day-scoped.
  //
  // ⚠️ Alivi / Fort Myers, matching HER completed rides rather than the feed's
  // Atlanta majority. The relationship is the thing being demonstrated, and a
  // member whose history is in Florida does not start appearing in Georgia.
  {
    id: "REQ-AO-001",
    date: "Thu, Sep 24, 2026",
    rider: "AMARA OKONKWO",
    client: "Alivi",
    market: "FL",
    passengerCount: 4,
    distance: "4.1 mi away",
    totalRevenue: 26.29,
    notes: "Dialysis — same chair time every week",
    legs: [
      {
        id: "leg-1",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "9:40 AM",
        address: "3820 Palm Beach Blvd, Fort Myers, FL 33916",
        county: "Lee County",
        revenue: 26.29,
      },
      {
        id: "leg-1b",
        type: "appointment",
        label: "Appointment Time",
        time: "10:25 AM",
        address: "16271 Bass Rd, Fort Myers, FL 33908",
        county: "Lee County",
        revenue: 0,
      },
    ],
    status: "request",
    pills: [{ label: "Expires in 5 days", variant: "neutral" }],
    scenario: {
      code: "10a",
      label: "Her trips, posted to the feed",
      solutions: ["request-feed-member-filter", "auto-assign-request"],
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },
  {
    id: "REQ-AO-002",
    date: "Fri, Sep 25, 2026",
    rider: "AMARA OKONKWO",
    client: "Alivi",
    market: "FL",
    passengerCount: 4,
    distance: "4.1 mi away",
    totalRevenue: 26.29,
    notes: "Dialysis — same chair time every week",
    legs: [
      {
        id: "leg-1",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "9:40 AM",
        address: "3820 Palm Beach Blvd, Fort Myers, FL 33916",
        county: "Lee County",
        revenue: 26.29,
      },
      {
        id: "leg-1b",
        type: "appointment",
        label: "Appointment Time",
        time: "10:25 AM",
        address: "16271 Bass Rd, Fort Myers, FL 33908",
        county: "Lee County",
        revenue: 0,
      },
    ],
    status: "request",
    pills: [{ label: "Expires in 6 days", variant: "neutral" }],
    scenario: {
      code: "10b",
      label: "Her trips, posted to the feed",
      solutions: ["request-feed-member-filter", "auto-assign-request"],
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },
  {
    id: "REQ-AO-003",
    date: "Sat, Sep 26, 2026",
    rider: "AMARA OKONKWO",
    client: "Alivi",
    market: "FL",
    passengerCount: 4,
    distance: "4.1 mi away",
    totalRevenue: 31.40,
    notes: "Follow-up at the vascular clinic",
    legs: [
      {
        id: "leg-1",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "1:15 PM",
        address: "3820 Palm Beach Blvd, Fort Myers, FL 33916",
        county: "Lee County",
        revenue: 31.40,
      },
    ],
    status: "request",
    pills: [{ label: "Expires in 7 days", variant: "neutral" }],
    scenario: {
      code: "10c",
      label: "Her trips, posted to the feed",
      solutions: ["request-feed-member-filter", "auto-assign-request"],
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },

];

// Mock upcoming trips (accepted but not started)
// `UP-CURRENT-*` are within the current pay period (Apr 28–May 4, 2026).
// `UP-FUTURE-*` are within the upcoming pay period (May 5–11, 2026).
export const mockUpcomingTrips: Trip[] = [
  {
    id: "UP-CURRENT-001",
    date: "Wed, Apr 29, 2026",
    rider: "Jordan S.",
    client: "Verida",
    passengerCount: 1,
    distance: "",
    totalRevenue: 35.00,
    notes: "",
    legs: [
      {
        id: "leg-1",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "5:00 PM",
        address: "789 Corporate Blvd, Sandy Springs, GA 30328",
        county: "Fulton County",
        revenue: 35.00,
      },
    ],
    status: "upcoming",
    pills: [],
    incentiveTypes: ["peak-hours"],
    clientEnrolledInIncentives: true,
  },
  {
    id: "UP-CURRENT-002",
    date: "Fri, May 1, 2026",
    rider: "Morgan K.",
    client: "TCI",
    passengerCount: 1,
    distance: "15.2 mi away",
    totalRevenue: 52.00,
    notes: "",
    legs: [
      {
        id: "leg-1",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "11:30 AM",
        address: "234 Elm Drive, Alpharetta, GA 30009",
        county: "Fulton County",
        revenue: 52.00,
      },
    ],
    status: "upcoming",
    pills: [
      { label: "Single Legs Allowed", variant: "success" },
    ],
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },
  {
    id: "UP-FUTURE-001",
    date: "Thu, May 7, 2026",
    rider: "Riley T.",
    client: "Verida",
    passengerCount: 1,
    distance: "9.1 mi away",
    totalRevenue: 38.00,
    notes: "Early morning standing appointment",
    legs: [
      {
        id: "leg-1",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "6:45 AM",
        address: "456 Morning Glory Ln, Smyrna, GA 30080",
        county: "Cobb County",
        revenue: 38.00,
      },
    ],
    status: "upcoming",
    pills: [],
    incentiveTypes: ["peak-hours"],
    clientEnrolledInIncentives: true,
  },
  {
    id: "UP-001",
    /**
     * ⚠️ **Re-dated 2026-10-15, from `Wed, Feb 25, 2026`.** Once Upcoming
     * sorts by date, a ride five months in the past is the first thing the
     * plain mirror shows. This one is free to move — a Postman test ride that
     * nothing references.
     *
     * ⛔ The other three are NOT free: `lib/data/payout.ts` pins
     * `UP-CURRENT-001`/`-002` to the Apr 28 – May 4 pay period and
     * `UP-FUTURE-001` to May 5 – 11, and re-dating them would make the payout
     * model disagree with the rides it is projecting from. They stay stale, and
     * the focused demo filters all three out — only the plain mirror shows the
     * seam.
     */
    date: "Thu, Aug 7, 2026",
    rider: "Test Rider",
    client: "Verida",
    passengerCount: 1,
    distance: "5896.7 mi away",
    totalRevenue: 10.80,
    notes: "Postman generated ride for manual t...",
    legs: [
      {
        id: "leg-1",
        type: "wait-for-call",
        label: "Est Pick-up Time - Wait For Call",
        time: "9:03 AM",
        address: "100 Test St, Atlanta, GA",
        county: "Fulton County",
        revenue: 10.80,
      },
    ],
    status: "upcoming",
    pills: [],
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },

  // ===== 18a-18m — catalogue row 19, cancelled rides in the manifest =====
  //
  // Thirteen rides over four dates: **ten still on and three cancelled by
  // Wingz**, the cancellations spread across three of the four days so that
  // "in the right date position, mixed in with the rest" is visible rather
  // than asserted.
  //
  // ⛔⛔ **All thirteen carry a `scenario`, including the ten that are fine.**
  // `ridesForSolution` filters to scenario rides whenever anything is focused,
  // and it runs first — tag only the three cancellations and focusing row 19
  // gives a three-ride Upcoming list with a filter bar that has nothing to
  // filter. The demo collapses into its own punchline.
  //
  // ⛔ **No `progress` on any leg.** `leg-options.ts` offers only legs that
  // carry one, so these stay out of every support form's leg picker. One
  // `progress` block added to make a detail screen look richer would silently
  // add thirteen legs to every form in the app.
  //
  // ⛔ No `tripGroup` either, so `LIVE_POOLS` and `groupMembers` are untouched.
  //
  // ⚠️ The weekday labels follow THIS SEED's calendar, not the real one — it
  // calls 2026-07-31 a Thursday where the actual date is a Friday. Internally
  // consistent and cosmetic: the date parser strips the weekday before
  // parsing, so nothing sorts on it.
  {
    id: "1049800410",
    date: "Fri, Aug 1, 2026",
    rider: "ROSALIND ACHTERBERG",
    client: "Verida",
    market: "GA",
    passengerCount: 1,
    distance: "",
    totalRevenue: 29.40,
    notes: "",
    contacts: {
      riderPhone: "(404) 555-0150",
    },
    legs: [
      {
        id: "1049800410",
        legCode: "A",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "7:20 AM",
        address: "1812 Cascade Rd SW, Atlanta, GA 30311",
        county: "Fulton County",
        revenue: 29.40,
      },
      {
        id: "1049800410-b",
        type: "appointment",
        label: "Appointment Time",
        time: "8:05 AM",
        address: "3215 Hospital Way, East Point, GA 30344",
        county: "Fulton County",
        revenue: 0,
      },
    ],
    status: "upcoming",
    pills: [],
    scenario: {
      code: "18a",
      label: "Still on",
      solutions: ["my-rides-cancelled"],
      silent: true,
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },
  {
    id: "1049800411",
    date: "Fri, Aug 1, 2026",
    rider: "DEMETRIUS OYELARAN",
    client: "TCI",
    market: "GA",
    passengerCount: 1,
    distance: "",
    totalRevenue: 33.15,
    notes: "",
    contacts: {
      riderPhone: "(404) 555-0151",
    },
    legs: [
      {
        id: "1049800411",
        legCode: "A",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "9:15 AM",
        address: "664 Candler Rd, Decatur, GA 30032",
        county: "DeKalb County",
        revenue: 33.15,
      },
      {
        id: "1049800411-b",
        type: "appointment",
        label: "Appointment Time",
        time: "10:00 AM",
        address: "2701 N Decatur Rd, Decatur, GA 30033",
        county: "DeKalb County",
        revenue: 0,
      },
    ],
    status: "upcoming",
    pills: [],
    scenario: {
      code: "18b",
      label: "Still on",
      solutions: ["my-rides-cancelled"],
      silent: true,
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },
  {
    id: "1049800412",
    date: "Fri, Aug 1, 2026",
    rider: "BEATRIX NDIAYE",
    client: "Verida",
    market: "GA",
    passengerCount: 1,
    distance: "",
    totalRevenue: 27.80,
    notes: "",
    clientCancelNoticeAt: "Thu, Jul 31, 2026 · 4:12 PM",
    contacts: {
      riderPhone: "(404) 555-0152",
    },
    legs: [
      {
        id: "1049800412",
        legCode: "A",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "11:40 AM",
        address: "4490 Buford Hwy NE, Chamblee, GA 30341",
        county: "DeKalb County",
        revenue: 27.80,
      },
      {
        id: "1049800412-b",
        type: "appointment",
        label: "Appointment Time",
        time: "12:25 PM",
        address: "5665 Peachtree Dunwoody Rd, Atlanta, GA 30342",
        county: "Fulton County",
        revenue: 0,
      },
    ],
    status: "upcoming",
    pills: [],
    scenario: {
      code: "18c",
      label: "Cancelled by Wingz",
      solutions: ["my-rides-cancelled"],
      silent: true,
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },
  {
    id: "1049800413",
    date: "Fri, Aug 1, 2026",
    rider: "CLEMENT FAIRWEATHER",
    client: "TCI",
    market: "FL",
    passengerCount: 1,
    distance: "",
    totalRevenue: 31.05,
    notes: "",
    contacts: {
      riderPhone: "(404) 555-0153",
    },
    legs: [
      {
        id: "1049800413",
        legCode: "A",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "2:10 PM",
        address: "3860 Colonial Blvd, Fort Myers, FL 33966",
        county: "Lee County",
        revenue: 31.05,
      },
      {
        id: "1049800413-b",
        type: "appointment",
        label: "Appointment Time",
        time: "2:55 PM",
        address: "13685 Doctors Way, Fort Myers, FL 33912",
        county: "Lee County",
        revenue: 0,
      },
    ],
    status: "upcoming",
    pills: [],
    scenario: {
      code: "18d",
      label: "Still on",
      solutions: ["my-rides-cancelled"],
      silent: true,
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },
  {
    id: "1049800414",
    date: "Mon, Aug 4, 2026",
    rider: "IMOGEN STRACHAN",
    client: "Verida",
    market: "GA",
    passengerCount: 1,
    distance: "",
    totalRevenue: 24.60,
    notes: "",
    contacts: {
      riderPhone: "(404) 555-0154",
    },
    legs: [
      {
        id: "1049800414",
        legCode: "A",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "6:45 AM",
        address: "925 Ralph David Abernathy Blvd SW, Atlanta, GA 30310",
        county: "Fulton County",
        revenue: 24.60,
      },
      {
        id: "1049800414-b",
        type: "appointment",
        label: "Appointment Time",
        time: "7:30 AM",
        address: "80 Jesse Hill Jr Dr SE, Atlanta, GA 30303",
        county: "Fulton County",
        revenue: 0,
      },
    ],
    status: "upcoming",
    pills: [],
    scenario: {
      code: "18e",
      label: "Still on",
      solutions: ["my-rides-cancelled"],
      silent: true,
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },
  {
    id: "1049800415",
    date: "Mon, Aug 4, 2026",
    rider: "OSVALDO QUINTANILLA",
    client: "TCI",
    market: "GA",
    passengerCount: 1,
    distance: "",
    totalRevenue: 30.70,
    notes: "",
    clientCancelNoticeAt: "Sun, Aug 2, 2026 · 7:48 PM",
    contacts: {
      riderPhone: "(404) 555-0155",
    },
    legs: [
      {
        id: "1049800415",
        legCode: "A",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "8:50 AM",
        address: "2135 Flat Shoals Rd, Decatur, GA 30032",
        county: "DeKalb County",
        revenue: 30.70,
      },
      {
        id: "1049800415-b",
        type: "appointment",
        label: "Appointment Time",
        time: "9:35 AM",
        address: "1821 Clifton Rd NE, Atlanta, GA 30329",
        county: "DeKalb County",
        revenue: 0,
      },
    ],
    status: "upcoming",
    pills: [],
    scenario: {
      code: "18f",
      label: "Cancelled by Wingz",
      solutions: ["my-rides-cancelled"],
      silent: true,
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },
  {
    id: "1049800416",
    date: "Mon, Aug 4, 2026",
    rider: "PRISCILLA WOLDEMARIAM",
    client: "Verida",
    market: "GA",
    passengerCount: 1,
    distance: "",
    totalRevenue: 26.95,
    notes: "",
    contacts: {
      riderPhone: "(404) 555-0156",
    },
    legs: [
      {
        id: "1049800416",
        legCode: "A",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "1:05 PM",
        address: "1260 Collier Rd NW, Atlanta, GA 30318",
        county: "Fulton County",
        revenue: 26.95,
      },
      {
        id: "1049800416-b",
        type: "appointment",
        label: "Appointment Time",
        time: "1:50 PM",
        address: "550 Peachtree St NE, Atlanta, GA 30308",
        county: "Fulton County",
        revenue: 0,
      },
    ],
    status: "upcoming",
    pills: [],
    scenario: {
      code: "18g",
      label: "Still on",
      solutions: ["my-rides-cancelled"],
      silent: true,
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },
  {
    id: "1049800417",
    date: "Mon, Aug 4, 2026",
    rider: "BARNABY TEWKSBURY",
    client: "TCI",
    market: "GA",
    passengerCount: 1,
    distance: "",
    totalRevenue: 35.20,
    notes: "",
    contacts: {
      riderPhone: "(404) 555-0157",
    },
    legs: [
      {
        id: "1049800417",
        legCode: "A",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "3:30 PM",
        address: "3379 Panthersville Rd, Decatur, GA 30034",
        county: "DeKalb County",
        revenue: 35.20,
      },
      {
        id: "1049800417-b",
        type: "appointment",
        label: "Appointment Time",
        time: "4:15 PM",
        address: "1968 Peachtree Rd NW, Atlanta, GA 30309",
        county: "Fulton County",
        revenue: 0,
      },
    ],
    status: "upcoming",
    pills: [],
    scenario: {
      code: "18h",
      label: "Still on",
      solutions: ["my-rides-cancelled"],
      silent: true,
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },
  {
    id: "1049800418",
    date: "Tue, Aug 5, 2026",
    rider: "LUCINDA ABERNATHY",
    client: "Verida",
    market: "GA",
    passengerCount: 1,
    distance: "",
    totalRevenue: 28.35,
    notes: "",
    contacts: {
      riderPhone: "(404) 555-0158",
    },
    legs: [
      {
        id: "1049800418",
        legCode: "A",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "7:55 AM",
        address: "2370 Bolton Rd NW, Atlanta, GA 30318",
        county: "Fulton County",
        revenue: 28.35,
      },
      {
        id: "1049800418-b",
        type: "appointment",
        label: "Appointment Time",
        time: "8:40 AM",
        address: "1405 Clifton Rd NE, Atlanta, GA 30322",
        county: "DeKalb County",
        revenue: 0,
      },
    ],
    status: "upcoming",
    pills: [],
    scenario: {
      code: "18i",
      label: "Still on",
      solutions: ["my-rides-cancelled"],
      silent: true,
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },
  {
    id: "1049800419",
    date: "Tue, Aug 5, 2026",
    rider: "RAFAEL ESPINOZA-LARA",
    client: "TCI",
    market: "FL",
    passengerCount: 1,
    distance: "",
    totalRevenue: 32.40,
    notes: "",
    clientCancelNoticeAt: "Mon, Aug 3, 2026 · 11:26 AM",
    contacts: {
      riderPhone: "(404) 555-0159",
    },
    legs: [
      {
        id: "1049800419",
        legCode: "A",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "10:20 AM",
        address: "4120 Winkler Ave, Fort Myers, FL 33916",
        county: "Lee County",
        revenue: 32.40,
      },
      {
        id: "1049800419-b",
        type: "appointment",
        label: "Appointment Time",
        time: "11:05 AM",
        address: "9981 S HealthPark Dr, Fort Myers, FL 33908",
        county: "Lee County",
        revenue: 0,
      },
    ],
    status: "upcoming",
    pills: [],
    scenario: {
      code: "18j",
      label: "Cancelled by Wingz",
      solutions: ["my-rides-cancelled"],
      silent: true,
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },
  {
    id: "1049800420",
    date: "Tue, Aug 5, 2026",
    rider: "HENRIETTA VOSKUIJLEN",
    client: "Verida",
    market: "GA",
    passengerCount: 1,
    distance: "",
    totalRevenue: 25.50,
    notes: "",
    contacts: {
      riderPhone: "(404) 555-0160",
    },
    legs: [
      {
        id: "1049800420",
        legCode: "A",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "4:00 PM",
        address: "1570 Howell Mill Rd NW, Atlanta, GA 30318",
        county: "Fulton County",
        revenue: 25.50,
      },
      {
        id: "1049800420-b",
        type: "appointment",
        label: "Appointment Time",
        time: "4:45 PM",
        address: "35 Collier Rd NW, Atlanta, GA 30309",
        county: "Fulton County",
        revenue: 0,
      },
    ],
    status: "upcoming",
    pills: [],
    scenario: {
      code: "18k",
      label: "Still on",
      solutions: ["my-rides-cancelled"],
      silent: true,
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },
  {
    id: "1049800421",
    date: "Wed, Aug 6, 2026",
    rider: "SOLOMON BRIGHTWATER",
    client: "TCI",
    market: "GA",
    passengerCount: 1,
    distance: "",
    totalRevenue: 29.85,
    notes: "",
    contacts: {
      riderPhone: "(404) 555-0161",
    },
    legs: [
      {
        id: "1049800421",
        legCode: "A",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "9:05 AM",
        address: "3120 Memorial Dr SE, Atlanta, GA 30317",
        county: "DeKalb County",
        revenue: 29.85,
      },
      {
        id: "1049800421-b",
        type: "appointment",
        label: "Appointment Time",
        time: "9:50 AM",
        address: "2665 N Decatur Rd, Decatur, GA 30033",
        county: "DeKalb County",
        revenue: 0,
      },
    ],
    status: "upcoming",
    pills: [],
    scenario: {
      code: "18l",
      label: "Still on",
      solutions: ["my-rides-cancelled"],
      silent: true,
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },
  {
    id: "1049800422",
    date: "Wed, Aug 6, 2026",
    rider: "ADELAIDE PENHALIGON",
    client: "Verida",
    market: "GA",
    passengerCount: 1,
    distance: "",
    totalRevenue: 27.25,
    notes: "",
    contacts: {
      riderPhone: "(404) 555-0162",
    },
    legs: [
      {
        id: "1049800422",
        legCode: "A",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "12:30 PM",
        address: "755 Commerce Dr, Decatur, GA 30030",
        county: "DeKalb County",
        revenue: 27.25,
      },
      {
        id: "1049800422-b",
        type: "appointment",
        label: "Appointment Time",
        time: "1:15 PM",
        address: "1364 Clifton Rd NE, Atlanta, GA 30322",
        county: "DeKalb County",
        revenue: 0,
      },
    ],
    status: "upcoming",
    pills: [],
    scenario: {
      code: "18m",
      label: "Still on",
      solutions: ["my-rides-cancelled"],
      silent: true,
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },
];

// Mock needs action trips
// Mock needs-action trips — ONE ride, unconfirmed.
//
// A single ride on purpose: it is the subject of the "I Reached Out to Confirm"
// flow, and having one keeps the state transitions unambiguous while
// prototyping. Data shape follows reference captures s-04a/b/c — Alivi client,
// multi-passenger, two legs whose ids are cited verbatim in the support-chat
// template message.
//
// The first leg carries an all-null `progress` so that once the ride is
// confirmed it renders as an accepted ride awaiting its first swipe
// ("SWIPE TO START") rather than falling through to "All legs complete".
export const mockNeedsActionTrips: Trip[] = [
  {
    id: "260731-780322",
    date: "Thu, Jul 31, 2026",
    rider: "AMARA OKONKWO",
    client: "Alivi",
    market: "FL",
    passengerCount: 4,
    distance: "",
    totalRevenue: 26.29,
    notes: "Rider has not answered two confirmation calls",
    legs: [
      {
        id: "1931025",
        legCode: "A",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "9:40 AM",
        address: "3820 Palm Beach Blvd, Fort Myers, FL 33916",
        county: "Lee County",
        revenue: 26.29,
        revenueNote: "Accepted by you",
        progress: {
          startedAt: null,
          pickedUpAt: null,
          droppedOffAt: null,
        },
      },
      {
        id: "1931026",
        type: "appointment",
        label: "Appointment Time",
        time: "10:25 AM",
        address: "16271 Bass Rd, Fort Myers, FL 33908",
        county: "Lee County",
        revenue: 0,
      },
    ],
    status: "needs-action",
    pills: [
      { label: "Not Confirmed", variant: "danger" },
      // ⚠️ Scenario pill removed 2026-09-09 — it labelled a comparison-matrix row
      // that no longer exists. The ride stays as ordinary Needs Action content so
      // the tab is not empty; it is simply no longer presented as a demo scenario.
      // Its finding still stands: the confirmation gate is CLIENT-SIDE — production's
      // status list is [ACCEPTED, CHECKED, EN_ROUTE] and an unconfirmed trip may well
      // sit at ACCEPTED, in which case the server would allow the no-show.
    ],
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },

  // ===== 04a — can't reach the member, STANDARD confirmation modal =====
  //
  // Catalogue rows 04 and 05, which are one build reached from two places. This
  // ride is an advance trip, so `I REACHED OUT TO CONFIRM` opens the STANDARD
  // Reach Rider modal — the variant whose third option closes and changes
  // nothing, which is the behaviour the proposal exists to improve on.
  //
  // Three member numbers, which is the most a trip carries.
  {
    id: "1049800391",
    date: "Thu, Jul 31, 2026",
    rider: "TERRENCE HALLOWAY",
    client: "Verida",
    market: "GA",
    passengerCount: 1,
    distance: "6.4 mi",
    totalRevenue: 38.75,
    notes: "Dialysis center — ask for the transport desk",
    contacts: {
      riderPhone: "(470) 555-0132",
      pickupPhone: "(470) 555-0118",
      dropoffPhone: "(678) 555-0176",
    },
    legs: [
      {
        id: "1049800391",
        legCode: "A",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "8:30 AM",
        address: "2140 Sylvan Rd SW, Atlanta, GA 30310",
        county: "Fulton County",
        revenue: 38.75,
        revenueNote: "Accepted by you",
        progress: {
          startedAt: null,
          pickedUpAt: null,
          droppedOffAt: null,
        },
      },
      {
        id: "1049800391-b",
        type: "appointment",
        label: "Appointment Time",
        time: "9:15 AM",
        address: "1550 Peachtree St NE, Atlanta, GA 30309",
        county: "Fulton County",
        revenue: 0,
      },
    ],
    status: "needs-action",
    pills: [{ label: "Not Confirmed", variant: "danger" }],
    scenario: {
      code: "04a",
      label: "Can't reach — standard confirmation",
      solutions: ["tag-number-invalid", "cannot-reach-member"],
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },

  // ===== 04b — can't reach the member, SAME-DAY confirmation modal =====
  //
  // ⚠️ The second variant, and it is NOT cosmetic. Here the third option reads
  // "No, but I will go to the pickup as scheduled" and ADVANCES the trip — a
  // driver who cannot reach the member today can already drive out unconfirmed.
  // That is the alternative the proposed option is competing with, so a demo
  // that only showed the standard modal would be arguing against the weaker case.
  //
  // ⛔ TWO numbers, not three. The stage map records them as client-provided and
  // varying per trip, and this is the ride that proves the form offers what the
  // trip actually has rather than a fixed list.
  {
    id: "1049800392",
    date: "Thu, Jul 31, 2026",
    rider: "ROSALIND VEGA",
    client: "Verida",
    market: "GA",
    passengerCount: 1,
    distance: "4.1 mi",
    totalRevenue: 29.40,
    notes: "Will-call return — rider calls when discharged",
    sameDay: true,
    contacts: {
      riderPhone: "(404) 555-0109",
      pickupPhone: "(404) 555-0155",
    },
    legs: [
      {
        id: "1049800392",
        legCode: "B",
        type: "wait-for-call",
        label: "Wait For Call",
        time: "Will-Call",
        address: "550 Peachtree St NE, Atlanta, GA 30308",
        county: "Fulton County",
        revenue: 29.40,
        revenueNote: "Accepted by you",
        progress: {
          startedAt: null,
          pickedUpAt: null,
          droppedOffAt: null,
        },
      },
      {
        id: "1049800392-b",
        type: "scheduled",
        label: "Scheduled Drop-off",
        time: "2:40 PM",
        address: "1823 Glenwood Ave SE, Atlanta, GA 30316",
        county: "DeKalb County",
        revenue: 0,
      },
    ],
    status: "needs-action",
    pills: [{ label: "Not Confirmed", variant: "danger" }],
    scenario: {
      code: "04b",
      label: "Can't reach — same-day risk path",
      solutions: ["tag-number-invalid", "cannot-reach-member"],
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },

  // ===== 16a / 16b — the member declined, and it is a ROUND TRIP =====
  //
  // Catalogue row 17. TWO rides sharing one `tripGroup`, because that is what
  // the case is about: `CAP-225`'s decline template lists TWO leg ids, and a
  // member who is not going has usually dropped the return as well. A one-way
  // seed would have demonstrated a checklist with one box on it.
  //
  // ⛔ Both are needs-action and unconfirmed, because the decline is learnt
  // during member confirmation — that is the entry point the user named.
  //
  // ⚠️ The driver's alternative here is the expensive one: sending back a
  // same-day trip is charged 100% of the time. Verida GA, so the $25 TCI TN
  // figure is not the one that applies — the point is that a figure applies at
  // all, and none applies to a member cancellation.
  {
    id: "1049800398",
    date: "Thu, Jul 31, 2026",
    rider: "ODESSA BRANNIGAN",
    client: "Verida",
    market: "GA",
    passengerCount: 1,
    distance: "5.2 mi",
    totalRevenue: 31.80,
    notes: "Daughter usually answers the home number",
    tripGroup: "rt-1049800398",
    contacts: {
      riderPhone: "(404) 555-0147",
      pickupPhone: "(404) 555-0163",
    },
    legs: [
      {
        id: "1049800398",
        legCode: "A",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "11:05 AM",
        address: "1480 Donald Lee Hollowell Pkwy NW, Atlanta, GA 30318",
        county: "Fulton County",
        revenue: 31.80,
        revenueNote: "Accepted by you",
        progress: {
          startedAt: null,
          pickedUpAt: null,
          droppedOffAt: null,
        },
      },
      {
        id: "1049800398-b",
        type: "appointment",
        label: "Appointment Time",
        time: "11:50 AM",
        address: "3193 Howell Mill Rd NW, Atlanta, GA 30327",
        county: "Fulton County",
        revenue: 0,
      },
    ],
    status: "needs-action",
    pills: [{ label: "Not Confirmed", variant: "danger" }],
    scenario: {
      code: "16a",
      label: "Member declined — the outbound leg",
      solutions: ["rider-initiated-cancellation"],
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },

  // ===== 16b — the return, same member, same day =====
  //
  // ⚠️ Seeded as its own ride because that is how this app models legs: a round
  // trip is two `Trip` objects carrying `legCode` A and B. `tripGroup` is what
  // ties them — EXPLICIT, never inferred from rider name and date, or a
  // stranger's leg could end up on a cancellation request.
  //
  // ⭐ Filing from HERE is the second state worth demoing: the outbound is
  // offered too, and unticking it is how a driver says "the family drove her
  // there, she still needs the ride home".
  {
    id: "1049800399",
    date: "Thu, Jul 31, 2026",
    rider: "ODESSA BRANNIGAN",
    client: "Verida",
    market: "GA",
    passengerCount: 1,
    distance: "5.2 mi",
    totalRevenue: 31.80,
    notes: "Return leg — same member as the 11:05 AM pick-up",
    tripGroup: "rt-1049800398",
    contacts: {
      riderPhone: "(404) 555-0147",
      dropoffPhone: "(404) 555-0163",
    },
    legs: [
      {
        id: "1049800399",
        legCode: "B",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "2:30 PM",
        address: "3193 Howell Mill Rd NW, Atlanta, GA 30327",
        county: "Fulton County",
        revenue: 31.80,
        revenueNote: "Accepted by you",
        progress: {
          startedAt: null,
          pickedUpAt: null,
          droppedOffAt: null,
        },
      },
      {
        id: "1049800399-b",
        type: "scheduled",
        label: "Scheduled Drop-off",
        time: "3:15 PM",
        address: "1480 Donald Lee Hollowell Pkwy NW, Atlanta, GA 30318",
        county: "Fulton County",
        revenue: 0,
      },
    ],
    status: "needs-action",
    pills: [{ label: "Not Confirmed", variant: "danger" }],
    scenario: {
      code: "16b",
      label: "Member declined — filed from the return",
      solutions: ["rider-initiated-cancellation"],
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },

  // ===== 20a — Update Trip Details, the clean case =====
  //
  // Catalogue row **20**, `Trip / Ride Modification`, 364 calls. Accepted but not
  // yet begun, so BOTH anchors are editable — the form opens with four fields,
  // which is exactly the shape user direction described.
  //
  // ⚠️ The member is invented. Every rider name in the captures is a real
  // member's; the shape is copied, the name is not.
  {
    id: "1049800400",
    date: "Thu, Jul 31, 2026",
    rider: "TEODORA VANCLEAVE",
    client: "Verida",
    market: "GA",
    passengerCount: 1,
    distance: "6.8 mi",
    totalRevenue: 34.40,
    notes: "Member asked to be collected at the rear entrance, not the main doors",
    contacts: {
      riderPhone: "(404) 555-0182",
      pickupPhone: "(404) 555-0194",
    },
    legs: [
      {
        id: "1049800400",
        legCode: "A",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "1:20 PM",
        address: "2201 Glenwood Ave SE, Atlanta, GA 30316",
        county: "DeKalb County",
        revenue: 34.40,
        revenueNote: "Accepted by you",
        progress: {
          startedAt: null,
          pickedUpAt: null,
          droppedOffAt: null,
        },
      },
      {
        id: "1049800400-b",
        type: "appointment",
        label: "Appointment Time",
        time: "2:15 PM",
        address: "1821 Clifton Rd NE, Atlanta, GA 30329",
        county: "DeKalb County",
        revenue: 0,
      },
    ],
    status: "needs-action",
    pills: [{ label: "Not Confirmed", variant: "danger" }],
    scenario: {
      code: "20a",
      label: "Both ends still editable — the four-field form",
      solutions: ["change-pickup-dropoff"],
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },

  // ===== 19a (leg B) — Add Leg to Trip, the group's live half =====
  //
  // Catalogue row **19**. The other half of this group, `1049800402`, is
  // COMPLETED and lives in `mockCompletedTrips` — which is the whole point:
  // `groupMembers(trip, ALL_POOLS)` finds it, and row 17's `legsInGroup` on
  // `LIVE_POOLS` deliberately does not.
  //
  // ⭐ 3:00 PM is chosen, not arbitrary. The estimate off this group's own legs
  // is 50 minutes, so a new leg at 1:00 PM ends at 1:50 and leaves this one
  // alone — SLACK — while one at 2:30 PM ends at 3:20 and pushes it to 3:35.
  // One group, both cascade outcomes, decided by what the driver types.
  {
    id: "1049800403",
    date: "Thu, Jul 31, 2026",
    rider: "MARGUERITE PELLERIN",
    client: "Verida",
    market: "GA",
    passengerCount: 1,
    distance: "7.1 mi",
    totalRevenue: 36.90,
    notes: "Return leg — same member as the 9:40 AM pick-up",
    tripGroup: "rt-1049800402",
    contacts: {
      riderPhone: "(404) 555-0119",
      pickupPhone: "(404) 555-0127",
    },
    legs: [
      {
        id: "1049800403",
        legCode: "B",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "3:00 PM",
        address: "1405 Clifton Rd NE, Atlanta, GA 30322",
        county: "DeKalb County",
        revenue: 36.90,
        revenueNote: "Accepted by you",
        progress: {
          startedAt: null,
          pickedUpAt: null,
          droppedOffAt: null,
        },
      },
      {
        id: "1049800403-b",
        type: "appointment",
        label: "Appointment Time",
        time: "3:50 PM",
        address: "870 Ponce de Leon Ave NE, Atlanta, GA 30306",
        county: "Fulton County",
        revenue: 0,
      },
    ],
    status: "needs-action",
    pills: [{ label: "Not Confirmed", variant: "danger" }],
    scenario: {
      code: "19b",
      label: "Add a leg from the LIVE half of the group",
      solutions: ["add-leg-request"],
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },

  // ===== 19d (legs B and C) — the three-leg group's live half =====
  //
  // ⛔ Both PENDING, and both tight against the leg before them: B's pick-up is
  // 25 minutes after A's drop-off, C's is 35 after B's. `LEG_TURNAROUND_MINUTES`
  // is 15, so an insertion at slot 1 of any realistic length pushes B, and B's
  // push carries into C — the two-leg group can only ever push one.
  {
    id: "1049800406",
    date: "Thu, Jul 31, 2026",
    rider: "CORDELIA VANTERPOOL",
    client: "Verida",
    market: "GA",
    passengerCount: 1,
    distance: "4.2 mi",
    totalRevenue: 24.80,
    notes: "Second leg — dialysis to the pharmacy",
    tripGroup: "rt-1049800405",
    contacts: {
      riderPhone: "(404) 555-0133",
      pickupPhone: "(404) 555-0141",
    },
    legs: [
      {
        id: "1049800406",
        legCode: "B",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "9:28 AM",
        address: "1968 Peachtree Rd NW, Atlanta, GA 30309",
        county: "Fulton County",
        revenue: 24.80,
        revenueNote: "Accepted by you",
        progress: {
          startedAt: null,
          pickedUpAt: null,
          droppedOffAt: null,
        },
      },
      {
        id: "1049800406-b",
        type: "appointment",
        label: "Appointment Time",
        time: "10:03 AM",
        address: "2625 Piedmont Rd NE, Atlanta, GA 30324",
        county: "Fulton County",
        revenue: 0,
      },
    ],
    status: "needs-action",
    pills: [{ label: "Not Confirmed", variant: "danger" }],
    scenario: {
      code: "19e",
      label: "The three-leg group's middle leg",
      solutions: ["add-leg-request"],
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },

  {
    id: "1049800407",
    date: "Thu, Jul 31, 2026",
    rider: "CORDELIA VANTERPOOL",
    client: "Verida",
    market: "GA",
    passengerCount: 1,
    distance: "9.8 mi",
    totalRevenue: 29.40,
    notes: "Last leg — the pharmacy home",
    tripGroup: "rt-1049800405",
    contacts: {
      riderPhone: "(404) 555-0133",
      pickupPhone: "(404) 555-0141",
    },
    legs: [
      {
        id: "1049800407",
        legCode: "C",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "10:38 AM",
        address: "2625 Piedmont Rd NE, Atlanta, GA 30324",
        county: "Fulton County",
        revenue: 29.40,
        revenueNote: "Accepted by you",
        progress: {
          startedAt: null,
          pickedUpAt: null,
          droppedOffAt: null,
        },
      },
      {
        id: "1049800407-b",
        type: "appointment",
        label: "Appointment Time",
        time: "11:18 AM",
        address: "1150 Lakewood Ave SE, Atlanta, GA 30315",
        county: "Fulton County",
        revenue: 0,
      },
    ],
    status: "needs-action",
    pills: [{ label: "Not Confirmed", variant: "danger" }],
    scenario: {
      code: "19f",
      label: "The three-leg group's last leg — where the home tick box lands",
      solutions: ["add-leg-request"],
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },

];

// ⚠️ SCENARIO_PILL_NOTE — every ride here carries a PROTOTYPE-ONLY pill naming
// which case it demos. Demo scaffolding, NOT app data: the real app shows no such
// pill, and they must be stripped before any capture that stands in for
// production. They exist because the location-record stream is invisible on the
// ride list, and it is the entire scenario.
//
// SIX SCENARIOS, named against the production `canNoshow` check. Choosing a ride
// is how you pick one — the demo mechanic.
//
// ⚠️ 3.2 and 4.2 were SCRAPPED once it was confirmed the production lookback
// runs only on Submit — before that the app has checked nothing, so it cannot
// honestly refuse or show a countdown from the More tile.
//
//   1   not started or en-route          → refused, dead end
//   2   meets every criterion            → files
//   3   no 10 consecutive min at pickup  → timer
//   4   location now > 0.5 mi            → form
//   5   no location points in 20 min     → form
//   WT  WellTrans IN, not yet pickup+15  → timer
//
// Plus two extras: scenario 3 seeded a hair from the boundary, so the countdown
// runs out while you watch and the button unlocks; and the pre-existing
// unconfirmed ride in `mockNeedsActionTrips`, which is a client-side gate rather
// than one of the six.
export const mockInProgressTrips: Trip[] = [
  // One ride per swipe stage, so every Ride Details phase is reachable in one tap.
  // The stage is carried entirely by which marks `progress` holds — nothing else
  // selects the phase, which is why the seed is the thing that has to be complete:
  //
  //   nothing swiped  -> "Accepted Ride"  + SWIPE TO START    (s-01a)
  //   startedAt       -> "Active Ride"    + PICK UP MEMBER    (s-01b)
  //   pickedUpAt      -> "Ride"           + DROP OFF MEMBER   (s-01c)
  //   droppedOffAt    -> "Completed Ride" + all legs complete
  //
  // ⚠️ `scripts/verify-base.ts` asserts all four stages appear here, with counts.
  // A stage that drops out of the seed silently removes a phase from the app.

  // ===== not-started — accepted, not yet begun =====
  {
    id: "1049800371",
    date: "Thu, Jul 31, 2026",
    rider: "Marcus Ellery",
    client: "Verida",
    passengerCount: 1,
    distance: "8.2 mi",
    totalRevenue: 47.20,
    notes: "Gate code 4412 at the Oak Ridge entrance",
    legs: [
      {
        id: "1049800371",
        legCode: "A",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "9:15 AM",
        address: "88 Oak Ridge Dr, Douglasville, GA 30134",
        county: "Douglas County",
        revenue: 47.20,
        revenueNote: "Accepted by you",
        progress: {
          startedAt: null,
          pickedUpAt: null,
          droppedOffAt: null,
        },
        // Inside the radius continuously for fourteen minutes, so the walk
        // succeeds and the no-show FILES. Untagged on purpose: it is ordinary
        // behaviour, not a demo row.
        locationRecords: [
          { ageMinutes: 0, distanceMiles: 0.2 },
          { ageMinutes: 3, distanceMiles: 0.2 },
          { ageMinutes: 7, distanceMiles: 0.3 },
          { ageMinutes: 11, distanceMiles: 0.2 },
          { ageMinutes: 14, distanceMiles: 0.3 },
        ],
      },
      {
        id: "1049800371-appt",
        type: "appointment",
        label: "Appointment Time",
        time: "10:00 AM",
        address: "1275 Highland Pkwy, Douglasville, GA 30134",
        county: "Douglas County",
        revenue: 0,
      },
    ],
    status: "in-progress",
    pills: [{ label: "Single Legs Allowed", variant: "success" }],
    incentiveTypes: [],
    clientEnrolledInIncentives: true,
  },

  // ===== started — en route to the pick-up =====
  {
    id: "1049800373",
    date: "Thu, Jul 31, 2026",
    rider: "Desmond Okafor",
    client: "Verida",
    market: "GA",
    passengerCount: 1,
    distance: "6.4 mi",
    totalRevenue: 53.40,
    notes: "Apartment gate on the Cedar St side",
    legs: [
      {
        id: "1049800373",
        legCode: "A",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "10:20 AM",
        address: "512 Cedar St, Carrollton, GA 30117",
        county: "Carroll County",
        revenue: 53.40,
        revenueNote: "Accepted by you",
        progress: {
          startedAt: "10:06 AM",
          pickedUpAt: null,
          droppedOffAt: null,
        },
        locationRecords: [
            { ageMinutes: 0, distanceMiles: 0.2 },
            { ageMinutes: 1, distanceMiles: 0.2 },
            { ageMinutes: 2, distanceMiles: 0.2 },
            { ageMinutes: 4, distanceMiles: 1.9 },
            { ageMinutes: 6, distanceMiles: 2.4 },
            { ageMinutes: 9, distanceMiles: 0.3 },
            { ageMinutes: 14, distanceMiles: 0.3 },
            { ageMinutes: 18, distanceMiles: 0.4 },
        ],
      },
      {
        id: "1049800373-appt",
        type: "appointment",
        label: "Appointment Time",
        time: "11:00 AM",
        address: "45 Tanner Medical Way, Carrollton, GA 30117",
        county: "Carroll County",
        revenue: 0,
      },
    ],
    status: "in-progress",
    noShowDemo: "3.1",
    // ⚠️ No production pills on a scenario ride, on purpose. The card renders
    // the scenario identifier instead, and inventing a "Wait For Call" beside it
    // would be seed data nothing reads and nobody checked.
    pills: [],
    scenario: {
      code: "02a",
      label: "At the pick-up, under 10 min",
      solutions: ["cancel-at-door", "rider-no-show"],
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: true,
  },

  // ===== started — a facility bigger than the no-show radius =====
  //
  // ⚠️ Demo row 4.1. The driver has not moved in seventeen minutes and is 0.6
  // miles out the whole time: a hospital campus where the pick-up pin is one
  // tower and the driver is at another. Waiting can never clear this, because
  // the app will never place them inside 0.5 miles. So it is a form — and the
  // callout names the distance, which is what makes it legible to Support.
  {
    id: "1049800377",
    date: "Thu, Jul 31, 2026",
    rider: "Nadine Oyelaran",
    client: "Alivi",
    market: "FL",
    passengerCount: 1,
    distance: "9.4 mi",
    totalRevenue: 52.40,
    notes: "Pick-up is the east tower entrance",
    legs: [
      {
        id: "1049800377",
        legCode: "A",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "1:50 PM",
        address: "6900 Medical Center Pkwy, Fort Myers, FL 33912",
        county: "Lee County",
        revenue: 52.40,
        revenueNote: "Accepted by you",
        progress: {
          startedAt: "1:38 PM",
          pickedUpAt: null,
          droppedOffAt: null,
        },
        locationRecords: [
          { ageMinutes: 0, distanceMiles: 0.61 },
          { ageMinutes: 3, distanceMiles: 0.6 },
          { ageMinutes: 7, distanceMiles: 0.62 },
          { ageMinutes: 12, distanceMiles: 0.59 },
          { ageMinutes: 17, distanceMiles: 0.63 },
        ],
      },
      {
        id: "1049800377-appt",
        type: "appointment",
        label: "Appointment Time",
        time: "2:30 PM",
        address: "4211 Cleveland Ave, Fort Myers, FL 33901",
        county: "Lee County",
        revenue: 0,
      },
    ],
    status: "in-progress",
    noShowDemo: "4.1",
    pills: [],
    scenario: {
      code: "01a",
      label: "Away from the pick-up",
      solutions: ["rider-no-show"],
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: true,
  },

  // ===== picked-up — member on board, heading to drop-off =====
  {
    id: "1049800376",
    date: "Thu, Jul 31, 2026",
    rider: "Constance Whitlow",
    client: "Alivi",
    passengerCount: 1,
    distance: "11.9 mi",
    totalRevenue: 39.75,
    notes: "Pick-up is the west tower lobby, not the main entrance",
    legs: [
      {
        id: "1049800376",
        legCode: "A",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "2:10 PM",
        address: "6900 Medical Center Pkwy, Fort Myers, FL 33912",
        county: "Lee County",
        revenue: 39.75,
        revenueNote: "Accepted by you",
        progress: {
          startedAt: "1:52 PM",
          pickedUpAt: "2:14 PM",
          droppedOffAt: null,
        },
      },
      {
        id: "1049800376-appt",
        type: "appointment",
        label: "Appointment Time",
        time: "2:55 PM",
        address: "3400 Colonial Blvd, Fort Myers, FL 33966",
        county: "Lee County",
        revenue: 0,
      },
    ],
    status: "in-progress",
    pills: [{ label: "Wait For Call", variant: "attention" }],
    incentiveTypes: [],
    clientEnrolledInIncentives: true,
  },

  // ===== completed — every mark set; the footer reads "All legs complete" =====
  {
    id: "1049800379",
    date: "Thu, Jul 31, 2026",
    rider: "Priya Raghavan",
    client: "MTM",
    passengerCount: 2,
    distance: "14.3 mi",
    totalRevenue: 61.85,
    notes: "Return leg collected on a call",
    legs: [
      {
        id: "1049800379",
        legCode: "A",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "7:40 AM",
        address: "210 Maple Grove Rd, Marietta, GA 30060",
        county: "Cobb County",
        revenue: 61.85,
        revenueNote: "Accepted by you",
        progress: {
          startedAt: "7:28 AM",
          pickedUpAt: "7:44 AM",
          droppedOffAt: "8:19 AM",
        },
      },
      {
        id: "1049800379-appt",
        type: "appointment",
        label: "Appointment Time",
        time: "8:30 AM",
        address: "677 Church St, Marietta, GA 30060",
        county: "Cobb County",
        revenue: 0,
      },
    ],
    status: "in-progress",
    pills: [{ label: "Single Legs Allowed", variant: "success" }],
    incentiveTypes: [],
    clientEnrolledInIncentives: true,
  },

  // ===== Missed Swipe (slice 03) ==========================================
  //
  // Three rides, one per state the production data actually produces. Each is a
  // different shape of `locationRecords`, not a different declared verdict —
  // `matchAnchor` walks the records, so the ride genuinely exercises the rule.
  //
  // ⚠️ `dropoffDistanceMiles` and `at` appear only on these three. Every earlier
  // ride predates there being a second anchor, and times its records against the
  // live clock because a no-show is about the last twenty minutes.
  //
  // ⚠️ Ages are tens of minutes, well outside the no-show rule's 20-minute
  // lookback. That is correct: these are legs being reconstructed after the
  // fact, not waits being timed.

  // --- the member is still in the car: the postpone path -------------------
  {
    id: "1049800381",
    date: "Thu, Jul 31, 2026",
    rider: "Lorraine Petrakis",
    client: "Verida",
    passengerCount: 1,
    distance: "8.4 mi",
    totalRevenue: 31.20,
    notes: "Member uses a walker — allow extra time at the kerb",
    legs: [
      {
        id: "1049800381",
        legCode: "A",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "11:20 AM",
        address: "415 Rosewood Ave, Smyrna, GA 30080",
        county: "Cobb County",
        revenue: 31.20,
        revenueNote: "Accepted by you",
        // Swiped to start, never swiped the pick-up — and so cannot swipe the
        // drop-off either. This is the state 2,521 legs a month end in.
        progress: {
          startedAt: "11:08 AM",
          pickedUpAt: null,
          droppedOffAt: null,
          // Never captured, because the swipes that capture them never happened.
          pickedUpOdometer: null,
          droppedOffOdometer: null,
        },
        // The trail puts the driver at the pick-up and then on the move. Once
        // the drop-off is swiped, the postponed pick-up form opens with this
        // arrival already filled in.
        locationRecords: [
          { ageMinutes: 34, distanceMiles: 0.08, dropoffDistanceMiles: 7.9, at: "11:20 AM" },
          { ageMinutes: 31, distanceMiles: 0.06, dropoffDistanceMiles: 7.8, at: "11:23 AM" },
          { ageMinutes: 24, distanceMiles: 1.4, dropoffDistanceMiles: 6.1, at: "11:30 AM" },
          { ageMinutes: 12, distanceMiles: 5.2, dropoffDistanceMiles: 2.4, at: "11:42 AM" },
          { ageMinutes: 3, distanceMiles: 7.6, dropoffDistanceMiles: 0.9, at: "11:51 AM" },
        ],
      },
      {
        id: "1049800381-appt",
        type: "appointment",
        label: "Appointment Time",
        time: "12:05 PM",
        address: "1800 Howell Mill Rd, Atlanta, GA 30318",
        county: "Fulton County",
        revenue: 0,
      },
    ],
    status: "in-progress",
    pills: [],
    scenario: {
      code: "03a",
      label: "Missed pick-up — member aboard, or gone",
      solutions: ["missed-swipe"],
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: true,
  },

  // --- the ride is over and the trail confirms both ends --------------------
  {
    id: "1049800382",
    date: "Thu, Jul 31, 2026",
    rider: "Emmett Caldwell",
    client: "MTM",
    passengerCount: 1,
    distance: "6.1 mi",
    totalRevenue: 27.45,
    notes: "",
    legs: [
      {
        id: "1049800382",
        legCode: "A",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "9:15 AM",
        address: "72 Cedar Hollow Dr, Austell, GA 30106",
        county: "Cobb County",
        revenue: 27.45,
        revenueNote: "Accepted by you",
        // ⚠️ The pick-up was swiped PROPERLY — mark and odometer both captured.
        // That is what makes this a different case from ride 03a rather than a
        // second copy of it: there is exactly one unknown end, and the rider
        // signature that the drop-off swipe would have taken was never taken.
        progress: {
          startedAt: "9:02 AM",
          pickedUpAt: "9:15 AM",
          pickedUpOdometer: 48213,
          droppedOffAt: null,
          droppedOffOdometer: null,
        },
        // The trail reaches the drop-off and then moves on, so the drop-off TIME
        // can be proposed — and the odometer still cannot, which is the pairing
        // this ride exists to show.
        locationRecords: [
          { ageMinutes: 96, distanceMiles: 4.4, dropoffDistanceMiles: 9.8, at: "9:04 AM" },
          { ageMinutes: 88, distanceMiles: 0.21, dropoffDistanceMiles: 5.9, at: "9:12 AM" },
          { ageMinutes: 85, distanceMiles: 0.07, dropoffDistanceMiles: 5.8, at: "9:15 AM" },
          { ageMinutes: 70, distanceMiles: 3.3, dropoffDistanceMiles: 2.6, at: "9:30 AM" },
          { ageMinutes: 58, distanceMiles: 5.7, dropoffDistanceMiles: 0.19, at: "9:42 AM" },
          { ageMinutes: 54, distanceMiles: 5.8, dropoffDistanceMiles: 0.05, at: "9:46 AM" },
          { ageMinutes: 40, distanceMiles: 9.1, dropoffDistanceMiles: 3.4, at: "10:00 AM" },
        ],
      },
      {
        id: "1049800382-appt",
        type: "appointment",
        label: "Appointment Time",
        time: "9:50 AM",
        address: "3215 Barrett Pkwy, Kennesaw, GA 30144",
        county: "Cobb County",
        revenue: 0,
      },
    ],
    status: "in-progress",
    pills: [],
    scenario: {
      code: "03b",
      label: "Missed drop-off — signature never taken",
      solutions: ["missed-swipe"],
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: true,
  },

  // ===== 09a — the member asks to be assigned to you =====
  //
  // Catalogue row 09. AMARA OKONKWO is ONBOARD — `pickedUpAt` is set, so Ride
  // Details reads "Ride" with DROP OFF MEMBER — because that is the moment the
  // 610 calls describe: the member is in the car and asks the driver to be
  // their regular, and the driver rings Support from the kerb.
  //
  // ⚠️ A SEPARATE ride from `260731-780322`, which is also hers. That one was
  // deliberately stripped of its scenario on 2026-09-09 and left as ordinary
  // Needs Action content so the tab is not empty; giving it a scenario pill
  // again would quietly reverse that decision to save seeding one ride.
  //
  // ⭐ Her two COMPLETED rides (Jul 18, Jul 6) are what make this work: the
  // form's locked member picker reads `member-options` and prints "2 trips in
  // the last 30 days" beside her name, which is the only checkable evidence the
  // request carries.
  {
    id: "1049800393",
    date: "Thu, Jul 31, 2026",
    rider: "AMARA OKONKWO",
    client: "Alivi",
    market: "FL",
    passengerCount: 4,
    distance: "5.2 mi",
    totalRevenue: 26.29,
    notes: "Dialysis — same chair time every week",
    legs: [
      {
        id: "1049800393",
        legCode: "A",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "9:40 AM",
        address: "3820 Palm Beach Blvd, Fort Myers, FL 33916",
        county: "Lee County",
        revenue: 26.29,
        revenueNote: "Accepted by you",
        progress: {
          startedAt: "9:28 AM",
          pickedUpAt: "9:44 AM",
          droppedOffAt: null,
          pickedUpOdometer: 71204,
        },
      },
      {
        id: "1049800393-appt",
        type: "appointment",
        label: "Appointment Time",
        time: "10:25 AM",
        address: "16271 Bass Rd, Fort Myers, FL 33908",
        county: "Lee County",
        revenue: 0,
      },
    ],
    status: "in-progress",
    pills: [],
    scenario: {
      code: "09a",
      label: "Member asks to be assigned to you",
      solutions: ["auto-assign-request", "request-feed-member-filter"],
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },

  // ===== 13a — a SHORT-NOTICE send-back, which attracts the penalty =====
  //
  // Catalogue row 14. `sameDay: true` is what makes production's step 2 penalty
  // popup appear at all — per the story's AC, "The popup appears only for
  // short-notice trip send backs."
  //
  // ⚠️ Accepted but not started: no swipe marks. A driver sends a trip back
  // because they cannot do it, which is a decision made BEFORE they set off.
  {
    id: "1049800394",
    date: "Thu, Jul 31, 2026",
    rider: "DESMOND ARCHULETA",
    client: "Verida",
    market: "GA",
    sameDay: true,
    passengerCount: 1,
    distance: "22.6 mi",
    totalRevenue: 41.80,
    notes: "Will-call return from the infusion centre",
    legs: [
      {
        id: "1049800394",
        legCode: "A",
        type: "wait-for-call",
        label: "Est Pick-up Time - Wait For Call",
        time: "3:10 PM",
        address: "1968 Peachtree Rd NW, Atlanta, GA 30309",
        county: "Fulton County",
        revenue: 41.80,
        revenueNote: "Accepted by you",
        progress: {
          startedAt: null,
          pickedUpAt: null,
          droppedOffAt: null,
        },
      },
      {
        id: "1049800394-appt",
        type: "appointment",
        label: "Appointment Time",
        time: "4:05 PM",
        address: "3240 Henderson Mill Rd, Atlanta, GA 30341",
        county: "DeKalb County",
        revenue: 0,
      },
    ],
    status: "in-progress",
    pills: [],
    scenario: {
      code: "13a",
      label: "Send-back, short notice — penalty applies",
      solutions: ["send-back-reason-form"],
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },

  // ===== 13b — an ADVANCE send-back, which does NOT =====
  //
  // ⛔ The negative control, and the slice needs it: a reason form that can only
  // ever be seen on the way to a penalty warning is indistinguishable from one
  // that is PART of the penalty warning. Here the reason is collected and the
  // trip goes back with no second popup at all.
  {
    id: "1049800395",
    date: "Thu, Jul 31, 2026",
    rider: "PRISCILLA VANTERPOOL",
    client: "MTM",
    market: "GA",
    passengerCount: 2,
    distance: "9.3 mi",
    totalRevenue: 33.15,
    notes: "Standing Tuesday physiotherapy",
    legs: [
      {
        id: "1049800395",
        legCode: "A",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "11:20 AM",
        address: "740 Cascade Ave SW, Atlanta, GA 30310",
        county: "Fulton County",
        revenue: 33.15,
        revenueNote: "Accepted by you",
        progress: {
          startedAt: null,
          pickedUpAt: null,
          droppedOffAt: null,
        },
      },
      {
        id: "1049800395-appt",
        type: "appointment",
        label: "Appointment Time",
        time: "12:00 PM",
        address: "1821 Metropolitan Pkwy SW, Atlanta, GA 30315",
        county: "Fulton County",
        revenue: 0,
      },
    ],
    status: "in-progress",
    pills: [],
    scenario: {
      code: "13b",
      label: "Send-back, advance — no penalty",
      solutions: ["send-back-reason-form"],
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },

  // ===== 13c — sending back a STANDING ORDER =====
  //
  // ⛔⛔ The trip a driver least wants to lose and least understands the cost
  // of. A standing order is a recurring booking the client relies on, so
  // sending back ONE of its trips can cost the driver every future one — and
  // repeated send-backs on an SO put the account itself at risk. Nothing in
  // the app says so today.
  //
  // ⚠️ Deliberately NOT short-notice. The standing-order warning and
  // production's penalty warning are different consequences, and a ride that
  // raised both would let a reviewer read them as one screen. The RULE handles
  // every combination — see `sendBackSteps` and its truth table — but the seed
  // demonstrates this one on its own.
  //
  // ⚠️ `standingOrderId` is a Verida-shaped id; Alivi has none and is matched
  // by member. Carrying the id rather than a flag keeps that difference
  // expressible.
  {
    id: "1049800396",
    date: "Thu, Jul 31, 2026",
    rider: "CORNELIUS BRAITHWAITE",
    client: "Verida",
    market: "GA",
    standingOrderId: "SO-4471",
    passengerCount: 1,
    distance: "7.8 mi",
    totalRevenue: 36.40,
    notes: "Standing order — dialysis Mon/Wed/Fri",
    legs: [
      {
        id: "1049800396",
        legCode: "A",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "7:05 AM",
        address: "1515 Fairburn Rd SW, Atlanta, GA 30331",
        county: "Fulton County",
        revenue: 36.40,
        revenueNote: "Accepted by you",
        progress: {
          startedAt: null,
          pickedUpAt: null,
          droppedOffAt: null,
        },
      },
      {
        id: "1049800396-appt",
        type: "appointment",
        label: "Appointment Time",
        time: "7:45 AM",
        address: "3193 Howell Mill Rd NW, Atlanta, GA 30327",
        county: "Fulton County",
        revenue: 0,
      },
    ],
    status: "in-progress",
    pills: [],
    scenario: {
      code: "13c",
      label: "Send-back of a STANDING ORDER",
      solutions: ["send-back-reason-form"],
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },

  // ===== 20b — Update Trip Details, with the pick-up already behind them =====
  //
  // ⭐ The ONLY demo of the passed-anchor rule. `pickedUpAt` is set, so the
  // pick-up end has happened: its two fields render locked with what was
  // recorded, its pencil is not drawn, and only the drop-off can be asked
  // about. Moving a pick-up that already took place is a correction, which is
  // catalogue row 03's case and not this one.
  {
    id: "1049800401",
    date: "Thu, Jul 31, 2026",
    rider: "TEODORA VANCLEAVE",
    client: "Verida",
    market: "GA",
    passengerCount: 1,
    distance: "6.8 mi",
    totalRevenue: 34.40,
    notes: "Member says the clinic moved her to the Peachtree building",
    contacts: {
      riderPhone: "(404) 555-0182",
      pickupPhone: "(404) 555-0194",
    },
    legs: [
      {
        id: "1049800401",
        legCode: "A",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "1:20 PM",
        address: "2201 Glenwood Ave SE, Atlanta, GA 30316",
        county: "DeKalb County",
        revenue: 34.40,
        revenueNote: "Accepted by you",
        progress: {
          startedAt: "1:04 PM",
          pickedUpAt: "1:22 PM",
          droppedOffAt: null,
        },
      },
      {
        id: "1049800401-b",
        type: "appointment",
        label: "Appointment Time",
        time: "2:15 PM",
        address: "1821 Clifton Rd NE, Atlanta, GA 30329",
        county: "DeKalb County",
        revenue: 0,
      },
    ],
    status: "in-progress",
    pills: [],
    scenario: {
      code: "20b",
      label: "Pick-up already made — only the drop-off can change",
      solutions: ["change-pickup-dropoff"],
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },

];

export const mockCompletedTrips: Trip[] = [
  // ===== 19a (leg A) — Add Leg to Trip, the FINISHED half =====
  //
  // Catalogue row **19**, and the ride the whole slice turns on. It is done, so
  // nothing may be inserted ahead of it — and it is also the only state in this
  // app that offers a support action at all, because user direction 1.1 asked
  // for one: *"for a completed leg we still need to give the option
  // somewhere."* A driver who has just swiped drop-off is exactly who hears
  // "actually, I also need the pharmacy".
  //
  // ⛔⛔ Seeded in the COMPLETED pool with a `tripGroup`, which `legsInGroup`
  // (row 17, `LIVE_POOLS`) cannot see and `groupLegs` (row 21, `ALL_POOLS`)
  // must. Two cases, two pools, one matcher — see `trip-groups.ts`.
  {
    id: "1049800402",
    date: "Thu, Jul 31, 2026",
    rider: "MARGUERITE PELLERIN",
    client: "Verida",
    market: "GA",
    passengerCount: 1,
    distance: "7.1 mi",
    totalRevenue: 36.90,
    notes: "Member mentioned a pharmacy stop on the way home",
    tripGroup: "rt-1049800402",
    contacts: {
      riderPhone: "(404) 555-0119",
      pickupPhone: "(404) 555-0127",
    },
    legs: [
      {
        id: "1049800402",
        legCode: "A",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "9:40 AM",
        address: "870 Ponce de Leon Ave NE, Atlanta, GA 30306",
        county: "Fulton County",
        revenue: 36.90,
        progress: {
          startedAt: "9:26 AM",
          pickedUpAt: "9:42 AM",
          droppedOffAt: "10:28 AM",
        },
      },
      {
        id: "1049800402-b",
        type: "appointment",
        label: "Appointment Time",
        time: "10:25 AM",
        address: "1405 Clifton Rd NE, Atlanta, GA 30322",
        county: "DeKalb County",
        revenue: 0,
      },
    ],
    status: "completed",
    pills: [],
    scenario: {
      code: "19a",
      label: "Add a leg from a FINISHED leg — the entry point",
      solutions: ["add-leg-request"],
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },

  // ===== 19d — a THREE-leg trip, the group's completed first leg =====
  //
  // ⭐ The third shape of the same case (user direction, 2026-10-14: *"give me
  // a scenario for adding to a 1 leg trip, a 2 leg trip and a 3 leg trip"*).
  // One-leg is `1049800404`, two-leg is the `rt-1049800402` group; this is the
  // one where an insertion can land in the MIDDLE and push more than one leg.
  //
  // ⛔ Deliberately tight: B starts 25 minutes after A finishes and C 35 after
  // B, so a new leg of any length dropped at slot 1 pushes BOTH — which is the
  // only seeded way to see two blocks of four questions at once. A looser
  // schedule would make the three-leg case demonstrate nothing the two-leg one
  // does not.
  //
  // ⚠️ The rider's name is invented, like every other seeded name. Production
  // captures carry real members' — copy the shape, never the name.
  {
    id: "1049800405",
    date: "Thu, Jul 31, 2026",
    rider: "CORDELIA VANTERPOOL",
    client: "Verida",
    market: "GA",
    passengerCount: 1,
    distance: "11.4 mi",
    totalRevenue: 31.50,
    notes: "Dialysis, then the pharmacy, then home",
    tripGroup: "rt-1049800405",
    contacts: {
      riderPhone: "(404) 555-0133",
      pickupPhone: "(404) 555-0141",
    },
    legs: [
      {
        id: "1049800405",
        legCode: "A",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "8:15 AM",
        address: "1150 Lakewood Ave SE, Atlanta, GA 30315",
        county: "Fulton County",
        revenue: 31.50,
        progress: {
          startedAt: "8:02 AM",
          pickedUpAt: "8:17 AM",
          droppedOffAt: "9:03 AM",
        },
      },
      {
        id: "1049800405-b",
        type: "appointment",
        label: "Appointment Time",
        time: "9:00 AM",
        address: "1968 Peachtree Rd NW, Atlanta, GA 30309",
        county: "Fulton County",
        revenue: 0,
      },
    ],
    status: "completed",
    pills: [],
    scenario: {
      code: "19d",
      label: "Add a leg to a THREE-leg trip — the finished first leg",
      solutions: ["add-leg-request"],
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },

  // ===== 19b — one finished leg, no group =====
  //
  // ⭐ The commonest real case, and a different code path: with no sibling and
  // only one anchor there is no span to average, so `estimateFromGroup` returns
  // `null` and the form falls back to `NEW_LEG_DEFAULT_MINUTES` — saying so in
  // different words, because "estimated from this trip's other legs" would be a
  // lie about a trip that has none. The new leg becomes **B**.
  {
    id: "1049800404",
    date: "Thu, Jul 31, 2026",
    rider: "AUGUSTINE DELACROIX",
    client: "Alivi",
    market: "FL",
    passengerCount: 1,
    distance: "",
    totalRevenue: 28.60,
    notes: "",
    contacts: {
      riderPhone: "(239) 555-0171",
    },
    legs: [
      {
        id: "1049800404",
        legCode: "A",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "11:10 AM",
        address: "2745 Cleveland Ave, Fort Myers, FL 33901",
        county: "Lee County",
        revenue: 28.60,
        progress: {
          startedAt: "10:58 AM",
          pickedUpAt: "11:12 AM",
          droppedOffAt: "11:46 AM",
        },
      },
    ],
    status: "completed",
    pills: [],
    scenario: {
      code: "19c",
      label: "One finished leg, no group — the fallback estimate",
      solutions: ["add-leg-request"],
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },

  // === RECENT (July 2026) — the member history the Trip Request case reads ===
  //
  // A Trip Request is for rides a member told the driver about that aren't in the
  // app yet, so its member selector offers members the driver has actually driven
  // in the last 30 days. `RECENT-COMP-005` sits deliberately OUTSIDE that window
  // (Jun 25, more than 30 days before MOCK_TODAY) so the cutoff excludes something
  // visible rather than being decorative. AMARA OKONKWO appears twice on purpose,
  // to exercise the per-member trip count.
  {
    id: "RECENT-COMP-001",
    date: "Mon, Jul 27, 2026",
    rider: "THEODORE ASHBY",
    client: "Verida",
    passengerCount: 1,
    distance: "",
    totalRevenue: 68.40,
    notes: "",
    legs: [
      {
        id: "1928814",
        legCode: "A",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "7:45 AM",
        address: "118 Bradley St, Carrollton, GA 30117",
        county: "Carroll County",
        revenue: 34.20,
      },
      {
        id: "1928815",
        legCode: "B",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "1:15 PM",
        address: "Tanner Medical Center, 705 Dixie St, Carrollton, GA 30117",
        county: "Carroll County",
        revenue: 34.20,
      },
    ],
    status: "completed",
    pills: [],
    incentiveTypes: [],
    clientEnrolledInIncentives: true,
  },
  {
    id: "RECENT-COMP-002",
    signatureCaptured: false,
    date: "Fri, Jul 24, 2026",
    rider: "LORETTA BRANSCOMBE",
    client: "Alivi",
    passengerCount: 2,
    distance: "",
    totalRevenue: 52.16,
    notes: "Member uses a walker",
    legs: [
      {
        id: "1930447",
        legCode: "A",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "10:30 AM",
        address: "2411 Ortiz Ave, Fort Myers, FL 33905",
        county: "Lee County",
        revenue: 26.08,
      },
      {
        id: "1930448",
        legCode: "B",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "2:00 PM",
        address: "Lee Health Coconut Point, 23450 Via Coconut Point, Estero, FL 33928",
        county: "Lee County",
        revenue: 26.08,
      },
    ],
    status: "completed",
    pills: [],
    incentiveTypes: [],
    clientEnrolledInIncentives: true,
  },
  {
    id: "RECENT-COMP-003",
    wasLate: true,
    date: "Sat, Jul 18, 2026",
    rider: "AMARA OKONKWO",
    client: "Alivi",
    passengerCount: 4,
    distance: "",
    totalRevenue: 26.29,
    notes: "",
    legs: [
      {
        id: "1929902",
        legCode: "A",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "9:40 AM",
        address: "3702 Broadway Ave, Fort Myers, FL 33901",
        county: "Lee County",
        revenue: 26.29,
      },
    ],
    status: "completed",
    pills: [],
    incentiveTypes: [],
    clientEnrolledInIncentives: true,
  },
  {
    id: "RECENT-COMP-004",
    date: "Mon, Jul 6, 2026",
    rider: "AMARA OKONKWO",
    client: "Alivi",
    passengerCount: 4,
    distance: "",
    totalRevenue: 26.29,
    notes: "",
    legs: [
      {
        id: "1927331",
        legCode: "A",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "9:40 AM",
        address: "3702 Broadway Ave, Fort Myers, FL 33901",
        county: "Lee County",
        revenue: 26.29,
      },
    ],
    status: "completed",
    pills: [],
    incentiveTypes: [],
    clientEnrolledInIncentives: true,
  },
  {
    id: "RECENT-COMP-005",
    signatureCaptured: false,
    wasLate: true,
    date: "Thu, Jun 25, 2026",
    rider: "EDWIN CASTELLANOS",
    client: "MTM",
    passengerCount: 1,
    distance: "",
    totalRevenue: 41.75,
    notes: "",
    legs: [
      {
        id: "1921180",
        legCode: "A",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "11:00 AM",
        address: "980 Powder Springs St, Smyrna, GA 30080",
        county: "Cobb County",
        revenue: 41.75,
      },
    ],
    status: "completed",
    pills: [],
    incentiveTypes: [],
    clientEnrolledInIncentives: true,
  },

  // === CURRENT PERIOD (Apr 28–May 4, 2026): 3 trips totaling $342.50 ===
  {
    id: "CURRENT-COMP-001",
    wasLate: true,
    date: "Tue, Apr 28, 2026",
    rider: "Casey P.",
    client: "Verida",
    passengerCount: 1,
    distance: "22.4 mi",
    totalRevenue: 124.50,
    notes: "Standing weekly transport",
    legs: [
      {
        id: "leg-1",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "8:00 AM",
        address: "456 Morning Glory Ln, Smyrna, GA 30080",
        county: "Cobb County",
        revenue: 62.25,
      },
      {
        id: "leg-2",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "2:30 PM",
        address: "DaVita Dialysis, 2100 W Paces Ferry Rd, Atlanta, GA 30327",
        county: "Fulton County",
        revenue: 62.25,
      },
    ],
    status: "completed",
    pills: [],
    incentiveTypes: ["peak-hours"],
    clientEnrolledInIncentives: true,
  },
  {
    id: "CURRENT-COMP-002",
    date: "Wed, Apr 29, 2026",
    rider: "Jordan S.",
    client: "Verida",
    passengerCount: 1,
    distance: "17.1 mi",
    totalRevenue: 97.50,
    notes: "",
    legs: [
      {
        id: "leg-1",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "9:15 AM",
        address: "789 Corporate Blvd, Sandy Springs, GA 30328",
        county: "Fulton County",
        revenue: 47.50,
      },
      {
        id: "leg-2",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "4:30 PM",
        address: "Return: 789 Corporate Blvd, Sandy Springs, GA 30328",
        county: "Fulton County",
        revenue: 47.50,
      },
    ],
    status: "completed",
    pills: [],
    incentiveTypes: ["peak-hours"],
    clientEnrolledInIncentives: true,
  },
  {
    id: "CURRENT-COMP-003",
    signatureCaptured: false,
    date: "Sat, May 2, 2026",
    rider: "Jamie L.",
    client: "MTM",
    passengerCount: 2,
    distance: "21.6 mi",
    totalRevenue: 123.00,
    notes: "Weekend appointment",
    legs: [
      {
        id: "leg-1",
        type: "wait-for-call",
        label: "Est Pick-up Time - Wait For Call",
        time: "10:00 AM",
        address: "567 Oak Street, Decatur, GA 30030",
        county: "DeKalb County",
        revenue: 61.50,
      },
      {
        id: "leg-2",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "1:30 PM",
        address: "Return: 567 Oak Street, Decatur, GA 30030",
        county: "DeKalb County",
        revenue: 61.50,
      },
    ],
    status: "completed",
    pills: [],
    incentiveTypes: ["weekend-warrior"],
    clientEnrolledInIncentives: true,
  },
  // === HISTORICAL (Dec 2023) — referenced from past pay periods ===
  {
    id: "COMP-001",
    date: "Fri, Dec 29, 2023",
    rider: "Hollis Danvers",
    client: "Verida",
    passengerCount: 1,
    distance: "",
    totalRevenue: 134.80,
    notes: "Pick Up: driver Keegan Hooker - Dro...",
    legs: [
      {
        id: "leg-1",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "8:27 PM",
        address: "123 History Ln, Charlotte, NC",
        county: "Mecklenburg County",
        revenue: 54.84,
      },
      {
        id: "leg-2",
        type: "appointment",
        label: "Appointment Time",
        time: "9:30 PM",
        address: "456 Past Ave, Roanoke Rapids, NC",
        county: "Halifax County",
        revenue: 0,
      },
      {
        id: "leg-3",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "4:30 AM",
        address: "789 Return Rd, Roanoke Rapids, NC",
        county: "Halifax County",
        revenue: 54.96,
      },
    ],
    status: "completed",
    pills: [],
    // Single (gold) — peak-hours still active
    incentiveTypes: ["peak-hours"],
    clientEnrolledInIncentives: true,
  },
  {
    id: "COMP-002",
    wasLate: true,
    date: "Thu, Dec 28, 2023",
    rider: "Hollis Danvers",
    client: "Verida",
    passengerCount: 1,
    distance: "",
    totalRevenue: 109.80,
    notes: "Pick Up: driver Keegan Hooker - Dro...",
    legs: [
      {
        id: "leg-1",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "8:27 PM",
        address: "123 History Ln, Charlotte, NC",
        county: "Mecklenburg County",
        revenue: 54.84,
      },
      {
        id: "leg-2",
        type: "appointment",
        label: "Appointment Time",
        time: "9:30 PM",
        address: "456 Past Ave, Roanoke Rapids, NC",
        county: "Halifax County",
        revenue: 0,
      },
      {
        id: "leg-3",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "4:30 AM",
        address: "789 Return Rd, Roanoke Rapids, NC",
        county: "Halifax County",
        revenue: 54.96,
      },
    ],
    status: "completed",
    pills: [],
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },
  {
    id: "COMP-003",
    date: "Thu, Dec 28, 2023",
    rider: "BEATRIX HALLORAN",
    client: "Verida",
    passengerCount: 2,
    distance: "",
    totalRevenue: 158.42,
    notes: "Regular weekly appointment",
    legs: [
      {
        id: "leg-1",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "7:00 AM",
        address: "100 Morning St, Charlotte, NC",
        county: "Mecklenburg County",
        revenue: 79.21,
      },
      {
        id: "leg-2",
        type: "appointment",
        label: "Appointment Time",
        time: "8:30 AM",
        address: "200 Clinic Dr, Raleigh, NC",
        county: "Wake County",
        revenue: 0,
      },
      {
        id: "leg-3",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "2:00 PM",
        address: "200 Clinic Dr, Raleigh, NC",
        county: "Wake County",
        revenue: 79.21,
      },
    ],
    status: "completed",
    pills: [],
    // Was: ["early-bird", "loyalty-streak"] — both completed → suppress (data-driven)
    incentiveTypes: [],
    clientEnrolledInIncentives: true,
  },
];

// Dashboard earnings data
export interface EarningsData {
  period: "this-month" | "last-month";
  label: string;
  earnings: number;
  trips: number;
  onTimePerformance: string;
  sendBacks: number;
}

export const mockEarningsThisMonth: EarningsData = {
  period: "this-month",
  label: "This Month",
  earnings: 907.02,
  trips: 5,
  onTimePerformance: "N/A",
  sendBacks: 0,
};

export const mockEarningsLastMonth: EarningsData = {
  period: "last-month",
  label: "Last Month",
  earnings: 725.62,
  trips: 4,
  onTimePerformance: "N/A",
  sendBacks: 0,
};
