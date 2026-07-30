import type { IncentiveType } from "@/lib/data/incentives";

/**
 * The day the prototype pretends it is.
 *
 * Seeded rather than read off the clock, following the repo's data-driven
 * convention: anything that windows on "the last N days" has to give the same
 * answer in a demo next month as it does today. Matches the dates already used by
 * the needs-action ride.
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
export type MarketCode = "GA" | "FL" | "NC" | "TN";

/**
 * What the app can prove about the driver's presence at the pick-up.
 *
 * Seeded, not measured — the real app reads this from telematics. Following the
 * repo's data-driven convention, the interesting cases are seeded rather than
 * computed: a `null` dwell means the app found NO proof of the wait, which is
 * what turns a one-tap no-show into a form the driver has to fill in.
 *
 * Deliberately a sibling of `progress` rather than a fourth swipe mark, because
 * "arrived but nobody came out" is not something the driver swipes.
 */
export interface LegPresenceEvidence {
  /** Is the driver's device at the pick-up right now? */
  atPickup: boolean;
  /** Confirmed minutes spent at the pick-up. `null` = could not be established. */
  dwellMinutes: number | null;
  /** Clock time the app recorded arrival, when it has one. */
  arrivedAt: string | null;
}

/**
 * The three swipes a driver makes to move a leg forward.
 *
 * Sequence per reference screenshots `s-01a/b/c`:
 *   SWIPE TO START  →  PICK UP MEMBER  →  DROP OFF MEMBER
 *
 * Each value is the time the driver swiped, or `null` when that swipe never
 * happened. A `null` mark IS the "forgot to swipe" condition — the Trip Update
 * support case exists to correct it. Following the repo convention, the gap is
 * SEEDED in mock data rather than derived from clocks or logic.
 */
export interface LegSwipeProgress {
  /** Swiped "start" — the driver begins the leg / heads to pickup. */
  startedAt: string | null;
  /** Swiped "pick up member". */
  pickedUpAt: string | null;
  /** Swiped "drop off member" — completes the leg. */
  droppedOffAt: string | null;
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
   * What the app knows about the driver's presence at this leg's pick-up.
   *
   * Only legs that could plausibly file a no-show carry it. Absent means the app
   * knows nothing, which is treated the same as no proof.
   */
  presence?: LegPresenceEvidence;
}

/**
 * How far along a leg is, derived purely from which swipe marks are present.
 *
 * `blocked` is the important one: a leg whose marks are out of order (dropped
 * off, but the pickup swipe never registered). It is NOT complete — the missing
 * swipe is exactly what stops the trip from closing out, which is why the driver
 * needs the Trip Update case.
 */
export type LegSwipeStage =
  | "not-started"
  | "started"
  | "picked-up"
  | "blocked"
  | "completed";

/** Which swipe a driver is expected to make next on a leg. */
export type NextSwipe = "start" | "pick-up" | "drop-off" | null;

/** Derive a leg's stage from its swipe marks. */
export function getLegStage(leg: TripLeg): LegSwipeStage {
  const p = leg.progress;
  if (!p) return "not-started";
  // A gap in the sequence blocks the leg regardless of how far it looks.
  if (getMissingSwipes(leg).length > 0) return "blocked";
  if (p.droppedOffAt) return "completed";
  if (p.pickedUpAt) return "picked-up";
  if (p.startedAt) return "started";
  return "not-started";
}

/**
 * Swipes that were skipped — a mark is missing while a LATER mark is present.
 *
 * This is the signal the Trip Update case acts on. A leg that simply hasn't got
 * there yet returns nothing; only genuinely skipped swipes are reported.
 */
export function getMissingSwipes(leg: TripLeg): Array<keyof LegSwipeProgress> {
  const p = leg.progress;
  if (!p) return [];

  const missing: Array<keyof LegSwipeProgress> = [];
  if (!p.startedAt && (p.pickedUpAt || p.droppedOffAt)) missing.push("startedAt");
  if (!p.pickedUpAt && p.droppedOffAt) missing.push("pickedUpAt");
  return missing;
}

/** True when any swipe on any leg of this trip was skipped. */
export function hasMissingSwipes(trip: Trip): boolean {
  return trip.legs.some((leg) => getMissingSwipes(leg).length > 0);
}

/**
 * The swipe the driver is expected to make next.
 *
 * Returns null when the leg is finished OR blocked — a driver cannot swipe past
 * a gap in the sequence, they have to get the missing time corrected first.
 */
export function getNextSwipe(leg: TripLeg): NextSwipe {
  switch (getLegStage(leg)) {
    case "not-started":
      return "start";
    case "started":
      return "pick-up";
    case "picked-up":
      return "drop-off";
    case "blocked":
    case "completed":
      return null;
  }
}

/** The leg a driver is currently working, i.e. the first not yet completed. */
export function getActiveLeg(trip: Trip): TripLeg | undefined {
  return trip.legs.find((leg) => getLegStage(leg) !== "completed");
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
    case "blocked":
      return "Missing swipe";
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
  // ===== WEEKEND WARRIOR (3 trips) =====
  {
    id: "REQ-WW-001",
    date: "Sun, Nov 1, 2026",
    rider: "WINDY PRECISE",
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
    date: "Sat, May 2, 2026",
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
    date: "Sun, May 3, 2026",
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
    date: "Mon, May 4, 2026",
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
    date: "Tue, May 5, 2026",
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
    date: "Wed, May 6, 2026",
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
    date: "Thu, May 7, 2026",
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
    date: "Fri, May 8, 2026",
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
    date: "Mon, May 11, 2026",
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
    date: "Tue, May 12, 2026",
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
    date: "Wed, May 13, 2026",
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
    date: "Thu, May 14, 2026",
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
    date: "Fri, May 15, 2026",
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
    date: "Mon, May 18, 2026",
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
    date: "Tue, May 19, 2026",
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
    date: "Wed, May 20, 2026",
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
    date: "Sat, May 23, 2026",
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
    date: "Mon, May 25, 2026",
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
    date: "Wed, May 27, 2026",
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
    date: "Thu, May 28, 2026",
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
    date: "Mon, May 4, 2026",
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
    date: "Thu, Apr 30, 2026",
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
    date: "Fri, May 22, 2026",
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
    rider: "KALLIYAH TYSON",
    client: "Alivi",
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
    pills: [{ label: "Not Confirmed", variant: "danger" }],
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },
];

// Mock in-progress trips — rides the driver has accepted and is working.
//
// The first three cover one swipe stage each, so every state in the sequence is
// reachable from the In Progress tab:
//
//   1049800370 — nothing swiped yet         → "Accepted Ride", CTA SWIPE TO START
//   1049800371 — started, not picked up     → "Active Ride",   CTA PICK UP MEMBER
//   1049800372 — picked up, not dropped off → "Ride",          CTA DROP OFF MEMBER
//
// Those three replicate reference screenshots s-01a / s-01b / s-01c: same ride
// shape (one A leg = Est Pick-up Time row + Appointment Time row), same
// Carrollton GA geography, differing only in swipe state.
//
// The rides after them (1049800373+) exist for the Rider No-Show branches and
// vary by client, market and seeded presence evidence instead — see the block
// comment where they start.
//
// ⚠️ SCENARIO_PILL_NOTE — every ride in this array carries a PROTOTYPE-ONLY pill
// naming which case it demos ("No-show · left location", "Missed Swipe demo", …).
// These are demo scaffolding, NOT app data: the real app shows no such pill, and
// they must be stripped before any capture that stands in for production. They
// exist because the branch a no-show takes is decided by seeded evidence, so
// without a label the seven rides here are indistinguishable on the list.
//
// NOTE: there is deliberately no ride here with a MISSING swipe, so the
// "Trip Update Needed" path has nothing to demo on right now. The support case
// will need such a seed when the Trip Update form is built — see
// `getMissingSwipes`, which stays in place and is exercised by that path.
export const mockInProgressTrips: Trip[] = [
  // ===== s-01a — Accepted Ride: nothing swiped yet =====
  {
    id: "1049800370",
    date: "Tue, Jul 8, 2026",
    rider: "Adele Ferguson",
    client: "Verida",
    market: "GA",
    passengerCount: 1,
    distance: "",
    totalRevenue: 52.52,
    notes: "",
    legs: [
      {
        id: "1049800370",
        legCode: "A",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "11:00 AM",
        address: "780 Bankhead Hwy, Carrollton, GA 30117",
        county: "Carroll County",
        revenue: 52.52,
        revenueNote: "Accepted by you",
        progress: {
          startedAt: null,
          pickedUpAt: null,
          droppedOffAt: null,
        },
      },
      {
        id: "1049800370-appt",
        type: "appointment",
        label: "Appointment Time",
        time: "11:42 AM",
        address: "160 Clinic Ave, Carrollton, GA 30117",
        county: "Carroll County",
        revenue: 0,
      },
    ],
    status: "in-progress",
    // ⚠️ Prototype-only scenario label — see SCENARIO_PILL_NOTE below.
    pills: [{ label: "No-show n/a · not started", variant: "neutral" }],
    incentiveTypes: [],
    clientEnrolledInIncentives: true,
  },
  // ===== s-01b — Active Ride: started, heading to pickup =====
  {
    id: "1049800371",
    date: "Tue, Jul 8, 2026",
    rider: "Rowan Whitfield",
    client: "Verida",
    market: "GA",
    passengerCount: 1,
    distance: "",
    totalRevenue: 47.80,
    notes: "",
    legs: [
      {
        id: "1049800371",
        legCode: "A",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "1:15 PM",
        address: "1204 Maple St, Carrollton, GA 30117",
        county: "Carroll County",
        revenue: 47.80,
        revenueNote: "Accepted by you",
        progress: {
          startedAt: "12:58 PM",
          pickedUpAt: null,
          droppedOffAt: null,
        },
        // Waited past the 10-minute threshold and the app can prove it, so a
        // no-show here submits without a form.
        presence: {
          atPickup: true,
          dwellMinutes: 14,
          arrivedAt: "1:06 PM",
        },
      },
      {
        id: "1049800371-appt",
        type: "appointment",
        label: "Appointment Time",
        time: "2:00 PM",
        address: "45 Tanner Medical Way, Carrollton, GA 30117",
        county: "Carroll County",
        revenue: 0,
      },
    ],
    status: "in-progress",
    pills: [{ label: "No-show · proven wait", variant: "success" }],
    incentiveTypes: [],
    clientEnrolledInIncentives: true,
  },
  // ===== s-01c — Ride: member on board, heading to drop-off =====
  {
    id: "1049800372",
    date: "Tue, Jul 8, 2026",
    rider: "Marisol Vega",
    client: "Verida",
    market: "GA",
    passengerCount: 1,
    distance: "",
    totalRevenue: 61.15,
    notes: "Rider prefers front passenger seat",
    legs: [
      {
        id: "1049800372",
        legCode: "A",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "3:30 PM",
        address: "88 Lovvorn Rd, Carrollton, GA 30117",
        county: "Carroll County",
        revenue: 61.15,
        revenueNote: "Accepted by you",
        progress: {
          startedAt: "3:19 PM",
          pickedUpAt: "3:34 PM",
          droppedOffAt: null,
        },
      },
      {
        id: "1049800372-appt",
        type: "appointment",
        label: "Appointment Time",
        time: "4:10 PM",
        address: "310 Dialysis Center Dr, Carrollton, GA 30117",
        county: "Carroll County",
        revenue: 0,
      },
    ],
    status: "in-progress",
    // Two swipes recorded, so this is also where Missed Swipe demos its prefill.
    pills: [
      { label: "Missed Swipe demo", variant: "warning" },
      { label: "No-show n/a · on board", variant: "neutral" },
    ],
    incentiveTypes: [],
    clientEnrolledInIncentives: true,
  },

  // ===== Rider No-Show branches — one ride per outcome =====
  //
  // The no-show branch is decided by seeded `presence` evidence plus the client's
  // on-site policy, so CHOOSING A RIDE IS HOW YOU PICK A BRANCH. Every one of these
  // is at stage `started` (en route, not yet picked up), which is the only stage
  // where a no-show makes sense — see `canFileNoShow`.
  //
  //   1049800373 — Alivi FL,   no proof of the wait     → form, no error
  //   1049800374 — Verida TN,  at pick-up, 13 min       → submits normally
  //   1049800375 — Verida TN,  left after 22 min        → error + Submit Form
  //   1049800376 — Verida TN,  at pick-up, only 4 min   → error, NO form
  //
  // The two Verida TN rides exist because Verida Tennessee still requires the
  // no-show to be filed FROM the pick-up; everywhere else only the wait matters.
  {
    id: "1049800373",
    date: "Fri, Jul 31, 2026",
    rider: "Terrance Boudreaux",
    client: "Alivi",
    market: "FL",
    passengerCount: 1,
    distance: "",
    totalRevenue: 44.20,
    notes: "Gate code 4417",
    legs: [
      {
        id: "1049800373",
        legCode: "A",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "10:20 AM",
        address: "2915 Cleveland Ave, Fort Myers, FL 33901",
        county: "Lee County",
        revenue: 44.20,
        revenueNote: "Accepted by you",
        progress: {
          startedAt: "10:04 AM",
          pickedUpAt: null,
          droppedOffAt: null,
        },
        // The whole point of the form path: the driver waited and left, and the
        // app cannot establish any of it. `null` dwell = no proof found.
        presence: {
          atPickup: false,
          dwellMinutes: null,
          arrivedAt: null,
        },
      },
      {
        id: "1049800373-appt",
        type: "appointment",
        label: "Appointment Time",
        time: "11:00 AM",
        address: "13685 Doctors Way, Fort Myers, FL 33912",
        county: "Lee County",
        revenue: 0,
      },
    ],
    status: "in-progress",
    pills: [{ label: "No-show · needs form", variant: "warning" }],
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },
  {
    id: "1049800374",
    date: "Fri, Jul 31, 2026",
    rider: "Lorraine Pickett",
    client: "Verida",
    market: "TN",
    passengerCount: 1,
    distance: "",
    totalRevenue: 38.65,
    notes: "",
    legs: [
      {
        id: "1049800374",
        legCode: "A",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "9:45 AM",
        address: "1808 Buchanan St, Nashville, TN 37208",
        county: "Davidson County",
        revenue: 38.65,
        revenueNote: "Accepted by you",
        progress: {
          startedAt: "9:31 AM",
          pickedUpAt: null,
          droppedOffAt: null,
        },
        // Both on-site conditions satisfied, so even Verida TN submits without
        // a form.
        presence: {
          atPickup: true,
          dwellMinutes: 13,
          arrivedAt: "9:48 AM",
        },
      },
      {
        id: "1049800374-appt",
        type: "appointment",
        label: "Appointment Time",
        time: "10:30 AM",
        address: "1211 Medical Center Dr, Nashville, TN 37232",
        county: "Davidson County",
        revenue: 0,
      },
    ],
    status: "in-progress",
    pills: [{ label: "No-show · proven wait, on-site", variant: "success" }],
    incentiveTypes: [],
    clientEnrolledInIncentives: true,
  },
  {
    id: "1049800375",
    date: "Fri, Jul 31, 2026",
    rider: "Curtis Vandiver",
    client: "Verida",
    market: "TN",
    passengerCount: 1,
    distance: "",
    totalRevenue: 41.90,
    notes: "Call on arrival — member uses a walker",
    legs: [
      {
        id: "1049800375",
        legCode: "A",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "8:30 AM",
        address: "3384 Overton Crossing St, Memphis, TN 38127",
        county: "Shelby County",
        revenue: 41.90,
        revenueNote: "Accepted by you",
        progress: {
          startedAt: "8:12 AM",
          pickedUpAt: null,
          droppedOffAt: null,
        },
        // Waited more than long enough, then drove off — the exact case that has
        // no path forward today. Verida TN blocks it, but now offers the form.
        presence: {
          atPickup: false,
          dwellMinutes: 22,
          arrivedAt: "8:31 AM",
        },
      },
      {
        id: "1049800375-appt",
        type: "appointment",
        label: "Appointment Time",
        time: "9:15 AM",
        address: "1265 Union Ave, Memphis, TN 38104",
        county: "Shelby County",
        revenue: 0,
      },
    ],
    status: "in-progress",
    pills: [{ label: "No-show · left location", variant: "danger" }],
    incentiveTypes: [],
    clientEnrolledInIncentives: true,
  },
  {
    id: "1049800376",
    date: "Fri, Jul 31, 2026",
    rider: "Josephine Hardaway",
    client: "Verida",
    market: "TN",
    passengerCount: 1,
    distance: "",
    totalRevenue: 36.40,
    notes: "",
    legs: [
      {
        id: "1049800376",
        legCode: "A",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "2:50 PM",
        address: "922 Gallatin Pike S, Madison, TN 37115",
        county: "Davidson County",
        revenue: 36.40,
        revenueNote: "Accepted by you",
        progress: {
          startedAt: "2:38 PM",
          pickedUpAt: null,
          droppedOffAt: null,
        },
        // Still standing at the pick-up with the wait unfinished. The honest
        // answer is "wait" — a form here would just be a way to skip it.
        presence: {
          atPickup: true,
          dwellMinutes: 4,
          arrivedAt: "2:57 PM",
        },
      },
      {
        id: "1049800376-appt",
        type: "appointment",
        label: "Appointment Time",
        time: "3:30 PM",
        address: "500 Hospital Dr, Madison, TN 37115",
        county: "Davidson County",
        revenue: 0,
      },
    ],
    status: "in-progress",
    pills: [{ label: "No-show · wait unfinished", variant: "danger" }],
    incentiveTypes: [],
    clientEnrolledInIncentives: true,
  },
];

// Mock completed trips (ride history) — `COMP-*` are historical (Dec 2023);
// `CURRENT-COMP-*` are dated within the current pay period (Apr 28–May 4, 2026)
// so the dashboard's EarningsCard can sum the current period's completed trips.
export const mockCompletedTrips: Trip[] = [
  // === RECENT (July 2026) — the member history the Trip Request case reads ===
  //
  // A Trip Request is for rides a member told the driver about that aren't in the
  // app yet, so its member selector offers members the driver has actually driven
  // in the last 30 days. `RECENT-COMP-005` sits deliberately OUTSIDE that window
  // (Jun 25, more than 30 days before MOCK_TODAY) so the cutoff excludes something
  // visible rather than being decorative. KALLIYAH TYSON appears twice on purpose,
  // to exercise the per-member trip count.
  {
    id: "RECENT-COMP-001",
    date: "Mon, Jul 27, 2026",
    rider: "MARCUS WHITFIELD",
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
    date: "Fri, Jul 24, 2026",
    rider: "DENISE ALVARADO",
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
    date: "Sat, Jul 18, 2026",
    rider: "KALLIYAH TYSON",
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
    rider: "KALLIYAH TYSON",
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
    date: "Thu, Jun 25, 2026",
    rider: "HAROLD NIXON",
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
    date: "Tue, Apr 28, 2026",
    rider: "Casey P.",
    client: "Verida",
    passengerCount: 1,
    distance: "",
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
    distance: "",
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
    date: "Sat, May 2, 2026",
    rider: "Jamie L.",
    client: "MTM",
    passengerCount: 2,
    distance: "",
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
    rider: "Jackie Giese",
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
    date: "Thu, Dec 28, 2023",
    rider: "Jackie Giese",
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
    rider: "STEPHANIE FIELDS",
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
