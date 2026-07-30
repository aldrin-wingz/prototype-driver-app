import type { IncentiveType } from "@/lib/data/incentives";

export type TripStatus = "request" | "upcoming" | "needs-action" | "in-progress" | "completed";
export type TimeAnchorType = "est-pickup" | "wait-for-call" | "appointment" | "scheduled";

/**
 * The three swipes a driver makes to move a leg forward.
 *
 * Each value is the time the driver swiped, or `null` when that swipe never
 * happened. A `null` mark IS the "forgot to swipe" condition — the Trip Update
 * support case exists to correct it. Following the repo convention, the gap is
 * SEEDED in mock data rather than derived from clocks or logic.
 */
export interface LegSwipeProgress {
  /** Swiped "I've arrived" at the pickup location. */
  arrivedAt: string | null;
  /** Swiped "rider picked up" — starts the leg. */
  pickedUpAt: string | null;
  /** Swiped "rider dropped off" — completes the leg. */
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
   * Swipe state for this leg. Optional — only legs on in-progress rides carry
   * it, so the existing seeded trips are unaffected.
   */
  progress?: LegSwipeProgress;
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
  | "arrived"
  | "picked-up"
  | "blocked"
  | "completed";

/** Which swipe a driver is expected to make next on a leg. */
export type NextSwipe = "arrive" | "pick-up" | "drop-off" | null;

/** Derive a leg's stage from its swipe marks. */
export function getLegStage(leg: TripLeg): LegSwipeStage {
  const p = leg.progress;
  if (!p) return "not-started";
  // A gap in the sequence blocks the leg regardless of how far it looks.
  if (getMissingSwipes(leg).length > 0) return "blocked";
  if (p.droppedOffAt) return "completed";
  if (p.pickedUpAt) return "picked-up";
  if (p.arrivedAt) return "arrived";
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
  if (!p.arrivedAt && (p.pickedUpAt || p.droppedOffAt)) missing.push("arrivedAt");
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
      return "arrive";
    case "arrived":
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

export interface Trip {
  id: string;
  date: string;
  rider: string;
  client: string;
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
export const mockNeedsActionTrips: Trip[] = [
  {
    id: "1000883298451",
    date: "Sun, Mar 15, 2026",
    rider: "WINDY PRECISE",
    client: "Verida",
    passengerCount: 1,
    distance: "",
    totalRevenue: 45.25,
    notes: "FOR TESTING PURPOSES ONLY",
    legs: [
      {
        id: "1000883298451",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "10:00 PM",
        address: "Braselton Return, 33 Golden Eagle Pkwy, Braselton, GA 30517",
        county: "Jackson County",
        revenue: 45.25,
      },
      {
        id: "1000883298451-b",
        type: "appointment",
        label: "Appointment Time",
        time: "10:46 PM",
        address: "1920 Briarcliff Rd NE, Atlanta, GA 30329",
        county: "DeKalb County",
        revenue: 0,
      },
    ],
    status: "needs-action",
    pills: [
      { label: "Not Confirmed", variant: "danger" },
    ],
    // Was: ["weekend-warrior", "early-bird"] — early-bird is completed; weekend-warrior is gold
    incentiveTypes: ["weekend-warrior"],
    clientEnrolledInIncentives: true,
  },
  {
    id: "NA-002",
    date: "Wed, Feb 25, 2026",
    rider: "Chichi Cormy MTM",
    client: "MTM",
    passengerCount: 1,
    distance: "",
    totalRevenue: 47.90,
    notes: "Pick Up: 1254652260 Z1BRV8QHQO...",
    legs: [
      {
        id: "leg-1",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "10:00 PM",
        address: "777 MTM Blvd, Alexandria, VA",
        county: "Alexandria city County",
        revenue: 23.95,
      },
      {
        id: "leg-2",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "9:00 PM",
        address: "666 Return St, Alexandria, VA",
        county: "Alexandria city County",
        revenue: 23.95,
      },
    ],
    status: "needs-action",
    pills: [],
    incentiveTypes: [],
    clientEnrolledInIncentives: false,
  },
];

// Mock in-progress trips — rides the driver is actively working.
//
// Seeded for the In-App Support Requests prototype. Two rides on purpose:
//   IP-001 — swipes in order, nothing missing. The control case.
//   IP-002 — B-leg was dropped off but NEVER picked up. This is the
//            "forgot to swipe" gap the Trip Update support case corrects.
//
// Per repo convention the gap is DATA-DRIVEN: IP-002 simply omits `pickedUpAt`.
// No component computes it from clocks.
export const mockInProgressTrips: Trip[] = [
  {
    id: "1000891447203",
    date: "Thu, Apr 30, 2026",
    rider: "MARCUS T.",
    client: "Verida",
    passengerCount: 1,
    distance: "",
    totalRevenue: 68.40,
    notes: "Rider uses a walker — allow extra loading time",
    legs: [
      {
        id: "1000891447203",
        type: "est-pickup",
        label: "Est Pick-up Time",
        time: "9:15 AM",
        address: "412 Sycamore Dr, Marietta, GA 30060",
        county: "Cobb County",
        revenue: 34.20,
        progress: {
          arrivedAt: "9:11 AM",
          pickedUpAt: "9:18 AM",
          droppedOffAt: "9:52 AM",
        },
      },
      {
        id: "1000891447203-b",
        type: "appointment",
        label: "Appointment Time",
        time: "1:30 PM",
        address: "Emory Dialysis at Candler, 1266 Clifton Rd NE, Atlanta, GA 30322",
        county: "DeKalb County",
        revenue: 34.20,
        progress: {
          arrivedAt: "1:24 PM",
          pickedUpAt: null,
          droppedOffAt: null,
        },
      },
    ],
    status: "in-progress",
    pills: [],
    incentiveTypes: [],
    clientEnrolledInIncentives: true,
  },
  {
    id: "1000891502876",
    date: "Thu, Apr 30, 2026",
    rider: "DELORES H.",
    client: "Verida",
    passengerCount: 1,
    distance: "",
    totalRevenue: 52.00,
    notes: "Gate code 4412 at the pickup address",
    legs: [
      {
        id: "1000891502876",
        type: "scheduled",
        label: "Scheduled Pick-up Time",
        time: "7:45 AM",
        address: "8 Hollow Creek Way, Lawrenceville, GA 30044",
        county: "Gwinnett County",
        revenue: 26.00,
        progress: {
          arrivedAt: "7:39 AM",
          pickedUpAt: "7:47 AM",
          droppedOffAt: "8:21 AM",
        },
      },
      {
        // ⚠️ Forgot-to-swipe seed: dropped off, but the pickup swipe never
        // registered. `getMissingSwipes` reports `pickedUpAt`.
        id: "1000891502876-b",
        type: "wait-for-call",
        label: "Est Pick-up Time - Wait For Call",
        time: "11:00 AM",
        address: "Gwinnett Medical Center, 1000 Medical Center Blvd, Lawrenceville, GA 30046",
        county: "Gwinnett County",
        revenue: 26.00,
        progress: {
          arrivedAt: "11:06 AM",
          pickedUpAt: null,
          droppedOffAt: "11:48 AM",
        },
      },
    ],
    status: "in-progress",
    pills: [],
    incentiveTypes: [],
    clientEnrolledInIncentives: true,
  },
];

// Mock completed trips (ride history) — `COMP-*` are historical (Dec 2023);
// `CURRENT-COMP-*` are dated within the current pay period (Apr 28–May 4, 2026)
// so the dashboard's EarningsCard can sum the current period's completed trips.
export const mockCompletedTrips: Trip[] = [
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
