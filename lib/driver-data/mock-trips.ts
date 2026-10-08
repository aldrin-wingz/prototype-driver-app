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
  /** Short, stable handle shown first on the pill, e.g. "03a". */
  code: string;
  /** What this ride is the case OF, in a few words. */
  label: string;
  /** Catalogue solution ids this ride demonstrates. */
  solutions: string[];
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
    date: "Wed, Feb 25, 2026",
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
      label: "Missed pick-up, member still aboard",
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
        progress: {
          startedAt: "9:02 AM",
          pickedUpAt: null,
          droppedOffAt: null,
        },
        // ⭐ The "all they need to do is click submit" ride: the trail sits
        // inside the radius at BOTH ends, so both times prefill and neither
        // "where were you" field is asked at all.
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
      label: "Missed both, trail confirms each end",
      solutions: ["missed-swipe"],
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: true,
  },

  // --- the drop-off alone is missing, and the trail cannot place it ---------
  {
    id: "1049800383",
    date: "Thu, Jul 31, 2026",
    rider: "Beatrix Ngoma",
    client: "Alivi",
    passengerCount: 1,
    distance: "15.7 mi",
    totalRevenue: 48.90,
    notes: "Drop-off is the rear entrance by the pharmacy",
    legs: [
      {
        id: "1049800383",
        legCode: "A",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "1:30 PM",
        address: "9 Juniper Ct, Lithia Springs, GA 30122",
        county: "Douglas County",
        revenue: 48.90,
        revenueNote: "Accepted by you",
        progress: {
          startedAt: "1:18 PM",
          pickedUpAt: "1:41 PM",
          droppedOffAt: null,
        },
        // ⛔ The common case, and the one a demo must not skip: the trail exists
        // and is good at the pick-up, but never comes within a quarter-mile of
        // the drop-off. Measured at 66.4% of real missed-swipe legs. The form
        // leaves the time blank and asks where they dropped the member instead
        // of pretending to a match.
        locationRecords: [
          { ageMinutes: 74, distanceMiles: 0.11, dropoffDistanceMiles: 14.2, at: "1:30 PM" },
          { ageMinutes: 70, distanceMiles: 0.04, dropoffDistanceMiles: 14.1, at: "1:34 PM" },
          { ageMinutes: 52, distanceMiles: 6.8, dropoffDistanceMiles: 7.4, at: "1:52 PM" },
          { ageMinutes: 38, distanceMiles: 12.9, dropoffDistanceMiles: 1.8, at: "2:06 PM" },
          { ageMinutes: 20, distanceMiles: 16.4, dropoffDistanceMiles: 4.9, at: "2:24 PM" },
        ],
      },
      {
        id: "1049800383-appt",
        type: "appointment",
        label: "Appointment Time",
        time: "2:15 PM",
        address: "1200 Thornton Rd, Lithia Springs, GA 30122",
        county: "Douglas County",
        revenue: 0,
      },
    ],
    status: "in-progress",
    pills: [],
    scenario: {
      code: "03c",
      label: "Missed drop-off, trail can't place it",
      solutions: ["missed-swipe"],
    },
    incentiveTypes: [],
    clientEnrolledInIncentives: true,
  },

];

export const mockCompletedTrips: Trip[] = [
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
