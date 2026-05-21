// =============================================================================
// INCENTIVE DATA SCHEMA + SEED DATA  (v1 — post App-I-4 v6 catch-up)
// =============================================================================
// schemaVersion: 2026-05-12-v6
//
// Tier system, leaderboard, and pay-period summaries removed in I-0. Schema
// migration to add admin-editable fields landed in I-1
// (`color`/`sortOrder`/`marketScope`/`clientScope`/`trigger`/etc.).
//
// **App-I-4 (2026-05-12) v3 → v6 catch-up** — Driver App reads-subset caught
// up to the canonical Manager schema (`v1/Incentives V1 CS Tool` ✅ landed
// P-11 + P-11.1 2026-05-12). Three coordinated changes on the App side:
//
//   1. `goal: number` → `goal: Goal` discriminated union covering total +
//      rolling-window modes. Mirrors Manager's `Goal` type 1:1; sliding-window
//      progress logic lives in `incentive-utils.ts::computeCurrentWindowProgress`.
//
//   2. Schedule model: drop legacy `timeframe` + `enabled` fields. Add
//      `startDate` + `endDate` (ISO datetime strings — App keeps strings rather
//      than `Date` objects for JSON round-trip safety; Manager uses `Date`
//      objects which is fine because the Manager owns the canonical schema).
//      Incentives become one-off campaigns active iff today ∈ window — App
//      reads this passively for the `formatRollingWindow` helper to compute
//      the slide-pointer + clamps.
//
//   3. Add `formatRollingWindow` + `computeCurrentWindowProgress` helpers
//      (incentive-utils.ts) — sliding-window logic; explicit dynamic
//      "Window: May 6 – May 12" chip on `<IncentiveCard>` per user direction
//      2026-05-12 (more prominent than Manager preview's muted caption).
//
// Skipped on the App side (v4 was a Manager-only change — App doesn't model
// `triggerConfigs[]` arrays; it carries a single human-readable `trigger`
// string for App-UX display only). v5 catalog adds (Driver Targeting) are
// Manager-only — driver-targeting is admin metadata, never surfaced on the
// App. App-MVP-2 (2026-05-14): the driverTargeting field was removed from
// `IncentiveDefinition` entirely; this parallels how marketScope/clientScope
// stay admin-only (App reads them passively per App-I-3 audit).
//
// **App-only fields preserved as documented subset extensions:**
//   - `qualifyingCriteria: string` — human-readable description used in the
//     driver-facing UX (Manager has structured `tripTargeting` arrays).
//   - `trigger: string` — eng-managed string kept for downstream display
//     (e.g., trip-feed tagging).
//   - `iconName?: string` — App-side icon hint.

// -----------------------------------------------------------------------------
// ENUMS & UNION TYPES
// -----------------------------------------------------------------------------

/** Types of incentive programs available */
export type IncentiveType =
  | 'weekend-warrior'      // Complete X trips on Sat/Sun
  | 'early-bird'           // Complete X trips before 9am
  | 'peak-hours'           // Complete X trips during peak hours (5-9am, 4-8pm)
  | 'loyalty-streak'       // Complete trips X consecutive days
  | 'new-rider-bonus'      // Complete X trips with first-time riders
  | 'long-haul'            // Complete X trips over 20 miles
  | 'perfect-rating'       // Maintain 5-star rating for X trips
  | 'white-glove'          // Complete door-to-door trips
  | 'quick-wins'           // Complete short-distance trips
  | 'hometown-hero'        // Complete trips within your home county
  | 'squad-goals';         // Complete multi-loading (multi-rider) trips

/** Trip status in the driver app */
export type TripStatus =
  | 'request'              // Available to claim
  | 'upcoming'             // Accepted, not yet started
  | 'needs-action'         // Requires driver confirmation
  | 'in-progress'          // Currently active
  | 'completed';           // Finished

/** Incentive period (monthly) */
export type Period = {
  id: string;
  label: string;           // e.g., "April 2026"
  startDate: string;       // ISO date
  endDate: string;         // ISO date
  status: PeriodStatus;
};

export type PeriodStatus = 'active' | 'upcoming' | 'completed';

/**
 * App-I-4 (v6, 2026-05-12): discriminated Goal shape mirrors Manager v6.
 *   - Total mode: existing "X trips during the campaign" semantic preserved.
 *   - Rolling-window mode: "X trips in any contiguous Y-day window during the
 *     campaign." App computes "best window so far" via the sliding-window
 *     helper in `incentive-utils.ts`.
 */
export type Goal =
  | { type: 'total'; count: number }
  | { type: 'rolling-window'; count: number; days: number };

// -----------------------------------------------------------------------------
// CORE TYPES
// -----------------------------------------------------------------------------

/**
 * Definition of an incentive program (v1 — App-I-4 v6 catch-up).
 * `bonusAmount` is the sole $ source of truth (INCENTIVE_TIER_BONUSES deleted in I-0).
 * Per-incentive `color` drives pill rendering; `sortOrder` controls list order (ASC).
 *
 * App-I-4 (v6): `goal` is now a discriminated union; `timeframe`/`enabled` dropped
 * in favor of `startDate`/`endDate` window (ISO datetime strings). The App reads
 * this subset of the canonical Manager schema.
 */
export interface IncentiveDefinition {
  id: string;
  type: IncentiveType;
  title: string;                   // RENAMED from `name` (I-1)
  description: string;             // Short description
  /** App-I-4 (v6): discriminated Goal. Read `goal.count` for the count target;
   *  read `goal.type === 'rolling-window'` to drive sliding-window UI + chip. */
  goal: Goal;
  bonusAmount: number;             // Dollars paid when goal is hit ($ source of truth)
  /** App-I-4 (v6): campaign start (ISO datetime, inclusive). Replaces legacy `timeframe`. */
  startDate: string;
  /** App-I-4 (v6): campaign end (ISO datetime, inclusive). Must be > startDate. */
  endDate: string;
  color: string;                   // Hex — pill bg color
  sortOrder: number;               // ASC; lower = higher in list
  marketScope: string[];           // Admin-editable markets (e.g. ['Atlanta'])
                                   // Empty array = ALL markets eligible (matches Manager P-10).
                                   // App does NOT filter on this field today (see App-I-3 audit).
                                   // PRD flag: admin-side analytics, NOT driver-side gating in v1.
  clientScope: string[];           // Admin-editable clients (e.g. ['Verida', 'MTM'])
                                   // Empty array = ALL clients eligible. Same passthrough note.
  /**
   * 2026-05-15 polish: pause flag mirroring the Manager schema. When
   * `enabled === false` the incentive is filtered out of the App's
   * dashboard carousel + `/incentives` list — drivers see it as if it
   * never existed. Optional + defaults to true on legacy records.
   */
  enabled?: boolean;
  /** App-only convenience field: human-readable summary of trip criteria.
   *  Manager v6 has structured `tripTargeting` arrays — App keeps the string. */
  qualifyingCriteria: string;
  iconName?: string;               // Optional icon identifier
  /** App-only convenience field: eng-managed trigger identifier for tagging. */
  trigger: string;
}

/**
 * A driver's progress toward an incentive program (v1).
 * `scheduledCount` stripped (no "+N taken" in v1 UI). Binary progress: currentCount vs goal.
 *
 * App-I-4 note: `goal: number` here is the denormalized count target from
 * `IncentiveDefinition.goal.count` (mode-agnostic). For rolling-window incentives
 * `currentCount` represents the "best window so far" tally (computed at read time
 * via `computeCurrentWindowProgress`). The seeded value below is a hand-tuned
 * fallback used when the live computation surfaces 0 due to sparse seed trips.
 */
export interface DriverIncentiveProgress {
  incentiveId: string;             // References IncentiveDefinition.id
  currentCount: number;            // Trips completed (total mode) OR best-window count (rolling-window mode)
  goal: number;                    // = definition.goal.count; denormalized for display
  isComplete: boolean;             // Has the driver hit the goal?
  bonusEarned: number;             // 0 if not complete, bonusAmount if complete
  lastQualifyingTripId?: string;   // Last qualifying trip ID
}

/**
 * A trip/ride in the system (v1 — multi-incentive support).
 * `incentiveTypes: IncentiveType[]` replaces singular nullable `incentiveType`.
 * Empty array = no incentives; 1+ entries = stacked pills on ride card.
 */
export interface Trip {
  id: string;
  date: string;
  pickupTime: string;
  rider: string;
  client: string;
  passengerCount: number;
  distance: string;
  revenue: number;
  notes: string;
  status: TripStatus;

  // Incentive-related fields (v1: multi-incentive)
  incentiveTypes: IncentiveType[];          // MIGRATED: singular → plural array
  clientEnrolledInIncentives: boolean;

  // Leg information
  legs: TripLeg[];

  // UI display pills (for list views)
  pills: TripPill[];
}

export interface TripLeg {
  id: string;
  type: 'est-pickup' | 'wait-for-call' | 'appointment' | 'scheduled';
  label: string;
  time: string;
  address: string;
  county: string;
  revenue: number;
}

export interface TripPill {
  label: string;
  variant: 'success' | 'warning' | 'attention' | 'neutral' | 'danger';
}

/**
 * Current logged-in driver info.
 * Slimmed in I-0 — tier / rank / county / monthly-bonus fields removed alongside
 * the leaderboard and tier system.
 */
export interface CurrentDriver {
  id: string;
  displayName: string;
  initials: string;
  username: string;
}

/**
 * Dashboard summary data.
 */
export interface DashboardData {
  currentPeriod: Period;
  upcomingPayout: number;
  payoutDate: string;
  tripsThisMonth: number;
  tripsLastMonth: number;
  earningsThisMonth: number;
  earningsLastMonth: number;
  bonusEarnedThisMonth: number;
  incentivesInProgress: number;
  incentivesCompleted: number;
}

// =============================================================================
// SEED DATA
// =============================================================================

// -----------------------------------------------------------------------------
// PERIODS
// -----------------------------------------------------------------------------

export const currentPeriod: Period = {
  id: 'period-2026-04',
  label: 'April 2026',
  startDate: '2026-04-01T00:00:00Z',
  endDate: '2026-04-30T23:59:59Z',
  status: 'active',
};

// -----------------------------------------------------------------------------
// INCENTIVE DEFINITIONS
// -----------------------------------------------------------------------------
//
// App-I-4 (v6, 2026-05-12) re-seed:
//   - `goal: number` → `goal: Goal` (discriminated union)
//   - Drop legacy `timeframe: 'monthly'` + `enabled: true` fields
//   - Add `startDate` + `endDate` ISO datetime strings — window spans the
//     anchor month of 2026-05-01 → 2026-05-31 to keep the demo "currently
//     active" without forcing a calendar lookup on render
//   - 2 demo rolling-window incentives (mirroring Manager P-11 demo picks):
//       • inc-pp-001 Peak Performer — { type: "rolling-window", count: 5, days: 7 }
//       • inc-qw-001 Quick Wins     — { type: "rolling-window", count: 5, days: 7 }
//     Other 6 incentives stay in "total" mode.
//
// PRD flag: Market/Client scope is admin-side analytics, NOT driver-side
// gating — driver visibility unaffected by these fields in v1 (App-I-3 audit).

const SEED_WINDOW_START = '2026-05-01T00:00:00Z';
const SEED_WINDOW_END = '2026-05-31T23:59:59Z';
// Peak Performer + Quick Wins demo rolling-window incentives run a wider
// window so the rolling pointer + clamp behavior is visible during the campaign.
const SEED_LONG_WINDOW_START = '2026-04-15T00:00:00Z';
const SEED_LONG_WINDOW_END = '2026-07-31T23:59:59Z';

export const incentiveDefinitions: IncentiveDefinition[] = [
  {
    id: 'inc-ww-001',
    type: 'weekend-warrior',
    title: 'Weekend Warrior',
    description: 'Complete 8 trips on weekends',
    goal: { type: 'total', count: 8 },
    bonusAmount: 50,
    startDate: SEED_WINDOW_START,
    endDate: SEED_WINDOW_END,
    color: '#8B5CF6',
    sortOrder: 10,
    marketScope: ['Atlanta'],
    clientScope: ['Verida', 'MTM'],
    qualifyingCriteria: 'Trips on Saturday or Sunday',
    trigger: 'weekend-trip',
  },
  {
    id: 'inc-pp-001',
    type: 'peak-hours',
    title: 'Peak Performer',
    description: 'Complete 5 peak-hour trips in any 7-day window',
    // App-I-4 v6 demo: rolling-window mode (mirrors Manager P-11 demo pick).
    goal: { type: 'rolling-window', count: 5, days: 7 },
    bonusAmount: 50,
    startDate: SEED_LONG_WINDOW_START,
    endDate: SEED_LONG_WINDOW_END,
    color: '#8B5CF6',
    sortOrder: 20,
    marketScope: ['Atlanta'],
    clientScope: ['Verida', 'MTM'],
    qualifyingCriteria: 'Trips between 5-9am or 4-8pm',
    trigger: 'peak-hours',
  },
  {
    id: 'inc-eb-001',
    type: 'early-bird',
    title: 'Early Bird',
    description: 'Complete 8 trips before 9am',
    goal: { type: 'total', count: 8 },
    bonusAmount: 30,
    startDate: SEED_WINDOW_START,
    // App-I-6.2 demo (2026-05-12): shortened endDate so this card renders
    // the urgent "Ends in N days" amber chip treatment (today = 2026-05-12;
    // endDate ≤ 7 days out triggers the urgent tone).
    endDate: '2026-05-17T23:59:59Z',
    color: '#8B5CF6',
    sortOrder: 30,
    marketScope: ['Atlanta'],
    clientScope: ['Verida', 'MTM'],
    qualifyingCriteria: '8 trips before 9am',
    trigger: 'before-9am',
  },
  {
    id: 'inc-wg-001',
    type: 'white-glove',
    title: 'White Glove',
    description: 'Complete 6 door-to-door trips',
    goal: { type: 'total', count: 6 },
    bonusAmount: 50,
    startDate: SEED_WINDOW_START,
    endDate: SEED_WINDOW_END,
    color: '#8B5CF6',
    sortOrder: 40,
    marketScope: ['Atlanta'],
    clientScope: ['Verida'],
    qualifyingCriteria: 'Trips with door-to-door service',
    trigger: 'door-to-door',
  },
  {
    id: 'inc-hh-001',
    type: 'hometown-hero',
    title: 'Hometown Hero',
    description: 'Complete 8 trips within your home county',
    goal: { type: 'total', count: 8 },
    bonusAmount: 30,
    startDate: SEED_WINDOW_START,
    endDate: SEED_WINDOW_END,
    color: '#8B5CF6',
    sortOrder: 50,
    marketScope: ['Atlanta'],
    clientScope: ['Verida', 'MTM'],
    qualifyingCriteria: 'Pickup and dropoff in same county',
    trigger: 'in-county',
  },
  {
    id: 'inc-sg-001',
    type: 'squad-goals',
    title: 'Squad Goals',
    description: 'Complete 6 multi-rider trips',
    goal: { type: 'total', count: 6 },
    bonusAmount: 50,
    startDate: SEED_WINDOW_START,
    endDate: SEED_WINDOW_END,
    color: '#8B5CF6',
    sortOrder: 60,
    marketScope: ['Atlanta'],
    clientScope: ['MTM'],
    qualifyingCriteria: 'Trips with 2+ passengers',
    trigger: 'multi-rider',
  },
  {
    id: 'inc-qw-001',
    type: 'quick-wins',
    title: 'Quick Wins',
    description: 'Complete 5 short-distance trips in any 7-day window',
    // App-I-4 v6 demo: rolling-window mode (mirrors Manager P-11 demo pick).
    goal: { type: 'rolling-window', count: 5, days: 7 },
    bonusAmount: 10,
    startDate: SEED_LONG_WINDOW_START,
    endDate: SEED_LONG_WINDOW_END,
    color: '#8B5CF6',
    sortOrder: 70,
    marketScope: ['Atlanta'],
    clientScope: ['Verida', 'MTM'],
    qualifyingCriteria: 'Trips under 5 miles',
    trigger: 'short-distance',
  },
  {
    id: 'inc-ls-001',
    type: 'loyalty-streak',
    title: 'Loyalty Streak',
    description: 'Complete trips for 5 consecutive days',
    goal: { type: 'total', count: 5 },
    bonusAmount: 10,
    startDate: SEED_WINDOW_START,
    endDate: SEED_WINDOW_END,
    color: '#8B5CF6',
    sortOrder: 80,
    marketScope: ['Atlanta'],
    clientScope: ['Verida', 'MTM'],
    qualifyingCriteria: 'Rides on 5 consecutive days',
    trigger: 'consecutive-days',
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // PAST (ENDED) INCENTIVES  (App-I-6.2, 2026-05-12)
  //
  // Campaign windows are in the past relative to today (2026-05-12). The
  // `/incentives` page filters these OUT of the Active tab and renders them
  // on the Past tab via `seedPastOutcomes` (lib/data/past-outcomes.ts).
  // Each carries minimal `driverTargeting` so the frozen rides view at
  // `/incentives/[id]/rides` shows a coherent criteria block.
  // ═══════════════════════════════════════════════════════════════════════════════
  // Earned outcome — older than 30 days (lives on the all-time Earned section).
  {
    id: 'inc-past-001',
    type: 'loyalty-streak',
    title: 'Loyalty Streak — March',
    description: 'Completed 5 consecutive-day trips in March.',
    goal: { type: 'total', count: 5 },
    bonusAmount: 10,
    startDate: '2026-03-01T00:00:00Z',
    endDate: '2026-03-31T23:59:59Z',
    color: '#8B5CF6',
    sortOrder: 1000,
    marketScope: ['Atlanta'],
    clientScope: ['Verida', 'MTM'],
    qualifyingCriteria: 'Rides on 5 consecutive days',
    trigger: 'consecutive-days',
  },
  // Earned outcome — within last 30 days.
  {
    id: 'inc-past-002',
    type: 'early-bird',
    title: 'Early Bird — April',
    description: 'Completed 8 trips before 9am in April.',
    goal: { type: 'total', count: 8 },
    bonusAmount: 30,
    startDate: '2026-04-01T00:00:00Z',
    endDate: '2026-04-30T23:59:59Z',
    color: '#8B5CF6',
    sortOrder: 1010,
    marketScope: ['Atlanta'],
    clientScope: ['Verida', 'MTM'],
    qualifyingCriteria: '8 trips before 9am',
    trigger: 'before-9am',
  },
  // Recently Ended — Missed goal. Ended within last 30 days.
  {
    id: 'inc-past-003',
    type: 'weekend-warrior',
    title: 'Weekend Warrior — Late April',
    description: 'Reached 5 of 8 weekend trips before the campaign ended.',
    goal: { type: 'total', count: 8 },
    bonusAmount: 50,
    startDate: '2026-04-13T00:00:00Z',
    endDate: '2026-04-25T23:59:59Z',
    color: '#8B5CF6',
    sortOrder: 1020,
    marketScope: ['Atlanta'],
    clientScope: ['Verida', 'MTM'],
    qualifyingCriteria: 'Trips on Saturday or Sunday',
    trigger: 'weekend-trip',
  },
];

// -----------------------------------------------------------------------------
// DRIVER INCENTIVE PROGRESS
// -----------------------------------------------------------------------------

export const driverIncentiveProgress: DriverIncentiveProgress[] = [
  {
    incentiveId: 'inc-ww-001',
    currentCount: 5,
    goal: 8,
    isComplete: false,
    bonusEarned: 0,
    lastQualifyingTripId: 'trip-ww-005',
  },
  {
    incentiveId: 'inc-pp-001',
    // App-I-4: rolling-window incentive — currentCount represents the seeded
    // "best 7-day window" baseline. computeCurrentWindowProgress falls back
    // to this when the live computation surfaces 0 (sparse seed trips).
    currentCount: 4,
    goal: 5,
    isComplete: false,
    bonusEarned: 0,
    lastQualifyingTripId: 'trip-pp-009',
  },
  {
    incentiveId: 'inc-eb-001',
    currentCount: 7,
    goal: 8,
    isComplete: false,
    bonusEarned: 0,
    lastQualifyingTripId: 'trip-eb-007',
  },
  {
    // App-I-6.1.1 (2026-05-12): bumped 3 → 6 so White Glove demos the
    // earned (goal-hit) state on the list view.
    incentiveId: 'inc-wg-001',
    currentCount: 6,
    goal: 6,
    isComplete: true,
    bonusEarned: 50,
    lastQualifyingTripId: 'trip-wg-006',
  },
  {
    incentiveId: 'inc-hh-001',
    currentCount: 4,
    goal: 8,
    isComplete: false,
    bonusEarned: 0,
    lastQualifyingTripId: 'trip-hh-004',
  },
  {
    incentiveId: 'inc-sg-001',
    currentCount: 2,
    goal: 6,
    isComplete: false,
    bonusEarned: 0,
    lastQualifyingTripId: 'trip-sg-002',
  },
  {
    incentiveId: 'inc-qw-001',
    // App-I-4: rolling-window incentive — seeded best-window baseline.
    currentCount: 3,
    goal: 5,
    isComplete: false,
    bonusEarned: 0,
    lastQualifyingTripId: 'trip-qw-008',
  },
  {
    incentiveId: 'inc-ls-001',
    currentCount: 5,
    goal: 5,
    isComplete: true,
    bonusEarned: 10,
    lastQualifyingTripId: 'trip-ls-005',
  },
];

// -----------------------------------------------------------------------------
// TRIPS
// -----------------------------------------------------------------------------

export const seedTrips: Trip[] = [
  // ═══════════════════════════════════════════════════════════════════════════════
  // UPCOMING REQUEST TRIPS (next 7 days) — with multi-incentive support (v1)
  // ═══════════════════════════════════════════════════════════════════════════════

  {
    id: "trip-req-001",
    date: "May 4, 2026",
    pickupTime: "7:30 AM",
    rider: "Sarah Chen",
    client: "Verida",
    passengerCount: 1,
    distance: "3.2 miles",
    revenue: 18.50,
    notes: "Buckhead to Midtown office. Early morning departure.",
    status: "upcoming",
    incentiveTypes: ["early-bird", "quick-wins"],
    clientEnrolledInIncentives: true,
    legs: [
      {
        id: "leg-req-001-a",
        label: "Pickup",
        time: "7:30 AM",
        address: "2800 Peachtree St NW, Atlanta, GA",
        county: "Fulton",
        revenue: 0,
        type: "est-pickup",
      },
      {
        id: "leg-req-001-b",
        label: "Dropoff",
        time: "7:52 AM",
        address: "1180 West Peachtree St, Atlanta, GA",
        county: "Fulton",
        revenue: 18.50,
        type: "appointment",
      },
    ],
    pills: [],
  },

  {
    id: "trip-req-002",
    date: "May 5, 2026",
    pickupTime: "4:45 PM",
    rider: "James Rodriguez",
    client: "MTM",
    passengerCount: 2,
    distance: "8.1 miles",
    revenue: 28.00,
    notes: "Airport shuttle during peak hours.",
    status: "upcoming",
    incentiveTypes: ["peak-hours", "squad-goals"],
    clientEnrolledInIncentives: true,
    legs: [
      {
        id: "leg-req-002-a",
        label: "Pickup",
        time: "4:45 PM",
        address: "Hartsfield-Jackson Int'l Airport Terminal A",
        county: "Fulton",
        revenue: 0,
        type: "wait-for-call",
      },
      {
        id: "leg-req-002-b",
        label: "Dropoff",
        time: "5:30 PM",
        address: "450 W Paces Ferry Rd, Atlanta, GA",
        county: "Fulton",
        revenue: 28.00,
        type: "scheduled",
      },
    ],
    pills: [],
  },

  {
    id: "trip-req-003",
    date: "May 5, 2026",
    pickupTime: "6:15 PM",
    rider: "Marcus Davis",
    client: "Verida",
    passengerCount: 1,
    distance: "2.8 miles",
    revenue: 16.75,
    notes: "Local evening ride within county.",
    status: "upcoming",
    incentiveTypes: ["hometown-hero"],
    clientEnrolledInIncentives: true,
    legs: [
      {
        id: "leg-req-003-a",
        label: "Pickup",
        time: "6:15 PM",
        address: "1050 E Marietta St, Atlanta, GA",
        county: "Fulton",
        revenue: 0,
        type: "est-pickup",
      },
      {
        id: "leg-req-003-b",
        label: "Dropoff",
        time: "6:38 PM",
        address: "3455 Peachtree Ridge Dr, Atlanta, GA",
        county: "Fulton",
        revenue: 16.75,
        type: "scheduled",
      },
    ],
    pills: [],
  },

  {
    id: "trip-req-004",
    date: "May 6, 2026",
    pickupTime: "8:00 AM",
    rider: "Jessica Thompson",
    client: "Verida",
    passengerCount: 1,
    distance: "4.5 miles",
    revenue: 22.00,
    notes: "Door-to-door premium service.",
    status: "upcoming",
    incentiveTypes: ["early-bird", "white-glove"],
    clientEnrolledInIncentives: true,
    legs: [
      {
        id: "leg-req-004-a",
        label: "Pickup",
        time: "8:00 AM",
        address: "3040 Peachtree Rd NW, Atlanta, GA",
        county: "Fulton",
        revenue: 0,
        type: "appointment",
      },
      {
        id: "leg-req-004-b",
        label: "Dropoff",
        time: "8:28 AM",
        address: "1801 Atlantic Dr SW, Atlanta, GA",
        county: "Fulton",
        revenue: 22.00,
        type: "appointment",
      },
    ],
    pills: [],
  },

  {
    id: "trip-req-005",
    date: "May 6, 2026",
    pickupTime: "5:00 PM",
    rider: "Michael Park",
    client: "MTM",
    passengerCount: 1,
    distance: "6.2 miles",
    revenue: 24.50,
    notes: "Evening ride during peak demand.",
    status: "upcoming",
    incentiveTypes: ["peak-hours"],
    clientEnrolledInIncentives: true,
    legs: [
      {
        id: "leg-req-005-a",
        label: "Pickup",
        time: "5:00 PM",
        address: "5600 Peachtree Dunwoody Rd, Atlanta, GA",
        county: "DeKalb",
        revenue: 0,
        type: "est-pickup",
      },
      {
        id: "leg-req-005-b",
        label: "Dropoff",
        time: "5:32 PM",
        address: "75 14th St NE, Atlanta, GA",
        county: "Fulton",
        revenue: 24.50,
        type: "scheduled",
      },
    ],
    pills: [],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // COMPLETED TRIPS THIS MONTH (Apr 28 – May 4, 2026) — recent earnings
  // ═══════════════════════════════════════════════════════════════════════════════

  {
    id: "CURRENT-COMP-001",
    date: "May 3, 2026",
    pickupTime: "7:15 AM",
    rider: "Amanda Wells",
    client: "Verida",
    passengerCount: 1,
    distance: "2.5 miles",
    revenue: 14.25,
    notes: "Early morning weekday ride.",
    status: "completed",
    incentiveTypes: ["early-bird", "quick-wins"],
    clientEnrolledInIncentives: true,
    legs: [
      {
        id: "leg-comp-001-a",
        label: "Pickup",
        time: "7:15 AM",
        address: "2954 Clairmont Ave, Atlanta, GA",
        county: "Fulton",
        revenue: 0,
        type: "est-pickup",
      },
      {
        id: "leg-comp-001-b",
        label: "Dropoff",
        time: "7:35 AM",
        address: "401 W Peachtree St, Atlanta, GA",
        county: "Fulton",
        revenue: 14.25,
        type: "scheduled",
      },
    ],
    pills: [
      { label: "Completed", variant: "success" },
    ],
  },

  {
    id: "CURRENT-COMP-002",
    date: "May 4, 2026",
    pickupTime: "4:30 PM",
    rider: "Robert Kim",
    client: "MTM",
    passengerCount: 3,
    distance: "5.8 miles",
    revenue: 32.00,
    notes: "3-passenger ride during peak hours.",
    status: "completed",
    incentiveTypes: ["peak-hours", "squad-goals"],
    clientEnrolledInIncentives: true,
    legs: [
      {
        id: "leg-comp-002-a",
        label: "Pickup",
        time: "4:30 PM",
        address: "Hartsfield-Jackson Int'l Airport Terminal C",
        county: "Fulton",
        revenue: 0,
        type: "wait-for-call",
      },
      {
        id: "leg-comp-002-b",
        label: "Dropoff",
        time: "5:10 PM",
        address: "3900 Peachtree Rd, Atlanta, GA",
        county: "Fulton",
        revenue: 32.00,
        type: "scheduled",
      },
    ],
    pills: [
      { label: "Completed", variant: "success" },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // HISTORICAL TRIPS (Dec 2023) — for ride history view
  // ═══════════════════════════════════════════════════════════════════════════════

  {
    id: "COMP-2023-001",
    date: "Dec 15, 2023",
    pickupTime: "8:00 AM",
    rider: "Elizabeth Johnson",
    client: "Verida",
    passengerCount: 1,
    distance: "3.5 miles",
    revenue: 18.75,
    notes: "Historical December ride.",
    status: "completed",
    incentiveTypes: ["early-bird"],
    clientEnrolledInIncentives: true,
    legs: [
      {
        id: "leg-hist-001-a",
        label: "Pickup",
        time: "8:00 AM",
        address: "2000 West Peachtree St, Atlanta, GA",
        county: "Fulton",
        revenue: 0,
        type: "est-pickup",
      },
      {
        id: "leg-hist-001-b",
        label: "Dropoff",
        time: "8:21 AM",
        address: "100 Peachtree St NE, Atlanta, GA",
        county: "Fulton",
        revenue: 18.75,
        type: "scheduled",
      },
    ],
    pills: [
      { label: "Completed", variant: "success" },
    ],
  },

  {
    id: "COMP-2023-002",
    date: "Dec 20, 2023",
    pickupTime: "6:00 PM",
    rider: "David Martinez",
    client: "MTM",
    passengerCount: 2,
    distance: "7.2 miles",
    revenue: 28.50,
    notes: "Multi-passenger evening trip.",
    status: "completed",
    incentiveTypes: ["squad-goals"],
    clientEnrolledInIncentives: true,
    legs: [
      {
        id: "leg-hist-002-a",
        label: "Pickup",
        time: "6:00 PM",
        address: "3355 Lenox Rd NE, Atlanta, GA",
        county: "Fulton",
        revenue: 0,
        type: "est-pickup",
      },
      {
        id: "leg-hist-002-b",
        label: "Dropoff",
        time: "6:38 PM",
        address: "225 Peachtree St NE, Atlanta, GA",
        county: "Fulton",
        revenue: 28.50,
        type: "scheduled",
      },
    ],
    pills: [
      { label: "Completed", variant: "success" },
    ],
  },

  {
    id: "COMP-2023-003",
    date: "Dec 22, 2023",
    pickupTime: "3:00 PM",
    rider: "Jennifer White",
    client: "Verida",
    passengerCount: 1,
    distance: "1.8 miles",
    revenue: 12.00,
    notes: "Short-distance quick-win ride.",
    status: "completed",
    incentiveTypes: ["quick-wins"],
    clientEnrolledInIncentives: true,
    legs: [
      {
        id: "leg-hist-003-a",
        label: "Pickup",
        time: "3:00 PM",
        address: "1180 Peachtree St NE, Atlanta, GA",
        county: "Fulton",
        revenue: 0,
        type: "est-pickup",
      },
      {
        id: "leg-hist-003-b",
        label: "Dropoff",
        time: "3:10 PM",
        address: "1050 Peachtree St NE, Atlanta, GA",
        county: "Fulton",
        revenue: 12.00,
        type: "scheduled",
      },
    ],
    pills: [
      { label: "Completed", variant: "success" },
    ],
  },
];

// -----------------------------------------------------------------------------
// CURRENT DRIVER  (slim — tier / rank / county fields removed in I-0)
// -----------------------------------------------------------------------------

export const currentDriver: CurrentDriver = {
  id: 'driver-7821',
  displayName: 'Alex B.',
  initials: 'AB',
  username: 'alex_b',
};

// -----------------------------------------------------------------------------
// DASHBOARD DATA
// -----------------------------------------------------------------------------

export const dashboardData: DashboardData = {
  currentPeriod: currentPeriod,
  upcomingPayout: 160,
  payoutDate: '2026-05-05T00:00:00Z',
  tripsThisMonth: 34,
  tripsLastMonth: 28,
  earningsThisMonth: 1247,
  earningsLastMonth: 982,
  bonusEarnedThisMonth: 160,
  incentivesInProgress: 2,
  incentivesCompleted: 2,
};

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------

/** Get incentive definition by ID */
export function getIncentiveById(id: string): IncentiveDefinition | undefined {
  return incentiveDefinitions.find(inc => inc.id === id);
}

/** Get incentive definition by type */
export function getIncentiveByType(type: IncentiveType): IncentiveDefinition | undefined {
  return incentiveDefinitions.find(inc => inc.type === type);
}

/** Get progress for an incentive */
export function getProgressForIncentive(incentiveId: string): DriverIncentiveProgress | undefined {
  return driverIncentiveProgress.find(p => p.incentiveId === incentiveId);
}

/** Get trips by status */
export function getTripsByStatus(status: TripStatus): Trip[] {
  return seedTrips.filter(t => t.status === status);
}

/** Get trips that qualify for a specific incentive type */
export function getTripsForIncentiveType(type: IncentiveType): Trip[] {
  return seedTrips.filter(t => t.incentiveTypes.includes(type));
}

/** Check if a trip has an active incentive program */
export function tripHasIncentives(trip: Trip): boolean {
  return trip.incentiveTypes.length > 0 && trip.clientEnrolledInIncentives;
}
