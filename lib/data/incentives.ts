// =============================================================================
// INCENTIVE DATA SCHEMA + SEED DATA
// =============================================================================
// This file defines all TypeScript types for the Driver Incentives feature
// and provides seed data for the prototype. All data is mock/synthetic.
// =============================================================================

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

/** Driver tier levels */
export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum';

/** Program difficulty / value tier (used for points + visual theming) */
export type IncentiveTierLevel = 'gold' | 'silver' | 'bronze';

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

// -----------------------------------------------------------------------------
// BONUS PER TIER (in dollars)
// Gold programs are worth $50, Silver $30, Bronze $10
// This replaces the points abstraction with direct dollar values.
export const INCENTIVE_TIER_BONUSES = {
  gold: 50,
  silver: 30,
  bronze: 10,
} as const;

// -----------------------------------------------------------------------------
// CORE TYPES
// -----------------------------------------------------------------------------

/**
 * Definition of an incentive program.
 * Bonus is paid ONLY when driver completes targetCount qualifying trips.
 * This is program-level, NOT per-trip.
 */
export interface IncentiveDefinition {
  id: string;
  type: IncentiveType;
  name: string;                    // Human-readable name
  description: string;             // Short description
  bonusAmount: number;             // Dollars paid when target is hit (INTEGER)
  targetCount: number;             // Number of qualifying trips needed
  periodId: string;                // Which period this belongs to
  qualifyingCriteria: string;      // Human-readable criteria
  iconName?: string;               // Optional icon identifier
  tierLevel: IncentiveTierLevel;   // Program difficulty / value tier
}

/**
 * A driver's progress toward an incentive program.
 */
export interface DriverIncentiveProgress {
  incentiveId: string;             // References IncentiveDefinition.id
  currentCount: number;            // Trips completed toward this incentive
  scheduledCount: number;          // Trips scheduled/accepted that will count when completed
  targetCount: number;             // Copied from definition for convenience
  isComplete: boolean;             // Has the driver hit the target?
  bonusEarned: number;             // 0 if not complete, bonusAmount if complete
  lastQualifyingTripId?: string;   // Most recent qualifying trip
}

/**
 * A trip/ride in the system.
 * NOTE: NO per-trip bonus dollars. `incentiveType` indicates which SINGLE program
 * this trip qualifies for (or null when no active program applies). Bonus is paid
 * at program completion. Suppression of completed-program banners is data-driven
 * via `incentiveType: null` on affected trips — there is no runtime filter.
 */
export interface Trip {
  id: string;
  date: string;                    // Display date (e.g., "Thu, Apr 30, 2026")
  pickupTime: string;              // ISO datetime string
  rider: string;                   // Anonymized rider name
  client: string;                  // Client/payer name (e.g., "Verida", "MTM")
  passengerCount: number;
  distance: string;                // e.g., "12.5 mi away" or ""
  revenue: number;                 // TOTAL trip revenue in dollars (base + sum of revenueAddons)
  revenueAddons?: { label: string; amount: number }[];  // Display-only ad-hoc bonuses (sent-back, D2D, etc.)
  notes: string;
  status: TripStatus;
  
  // Incentive-related fields
  incentiveType: IncentiveType | null;   // Which SINGLE program this trip qualifies for (null = no active program)
  clientEnrolledInIncentives: boolean;   // Is this client/market enrolled in incentive programs?
  
  // Leg information (simplified for seed data)
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
 * Entry in the leaderboard.
 * Uses anonymized handles for privacy.
 * Primary ranking metric is `bonusesEarnedThisMonth` (total bonus $ earned).
 */
export interface LeaderboardEntry {
  rank: number;
  handle: string;                    // Anonymized (e.g., "Driver-7821")
  bonusesEarnedThisMonth: number;    // Total bonus $ earned this month (PRIMARY ranking metric)
  isCurrentDriver: boolean;          // Unused in I-6.1 seed (current driver at rank #47, outside top 20). Kept for future flexibility.
  tier: Tier;
  county: string;                    // Driver's home county (e.g., "Fulton County")
}

/**
 * Configuration for a tier level.
 * Tier is reached when driver's totalBonusesEarnedThisMonth >= threshold (in dollars).
 */
export interface TierConfig {
  tier: Tier;
  label: string;          // Display name
  threshold: number;      // MONTHLY DOLLARS required to reach this tier
  multiplier: number;     // Parking-lot field (NOT visualized — no UI surface)
  badgeColor: string;     // Badge background color
}

/**
 * Current logged-in driver info.
 * Tier is backend-derived from totalBonusesEarnedThisMonth against TierConfig.threshold.
 */
export interface CurrentDriver {
  id: string;
  displayName: string;
  initials: string;
  currentTier: Tier;
  totalBonusesEarnedThisMonth: number;   // Monthly scope: total bonus $ accumulated
  currentRank: number;                   // Driver's rank against the global driver pool (e.g., 47)
  totalDrivers: number;                  // Total drivers in the pool (e.g., 200)
  county: string;                        // Driver's home county (e.g., "Fulton County")
  username: string;                      // Editable display name (e.g., "alex_b")
}

/**
 * A pay period (Mon–Sun). Drivers are paid weekly.
 * id is also used as the denormalized period key on trips.
 */
export interface PayPeriod {
  id: string;                 // 'period-2026-04-28'
  startDate: string;          // 'Apr 28'
  endDate: string;            // 'May 4'
  payoutDate: string;         // 'Mon, May 4'
  status: 'closed' | 'current' | 'upcoming';
}

/**
 * Pre-computed payout summary per (driver, period).
 * Frontend reads this to render `/payout`.
 *
 * `Projected` (current/upcoming) or `Final` (closed) total =
 *   earnedFromCompletedRides + upcomingFromAcceptedRides + incentivesTotal
 */
export interface PayoutPeriodSummary {
  periodId: string;
  // Mini-card 1: completed rides this period
  earnedFromCompletedRides: number;
  completedRidesCount: number;
  // Mini-card 2: accepted/upcoming rides this period
  upcomingFromAcceptedRides: number;
  upcomingRidesCount: number;
  // Mini-card 3: incentive bonuses (earned + projected)
  incentivesTotal: number;            // sum of earned + projected
  incentivesEarnedCount: number;      // programs already triggered
  incentivesTotalCount: number;       // earned + in-progress contributing
  // The trip lists for each tab — by reference
  completedTripIds: string[];
  upcomingTripIds: string[];
  programIdsContributing: IncentiveType[];   // earned + in-progress
}

/**
 * Dashboard summary data.
 */
export interface DashboardData {
  currentPeriod: Period;
  upcomingPayout: number;          // Estimated next payout
  payoutDate: string;              // ISO date of next payout
  tripsThisMonth: number;
  tripsLastMonth: number;
  earningsThisMonth: number;       // Base earnings (not including bonuses)
  earningsLastMonth: number;
  bonusEarnedThisMonth: number;
  incentivesInProgress: number;    // Count of active incentive programs
  incentivesCompleted: number;     // Count of completed this period
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
// INCENTIVE DEFINITIONS (4 programs, each tagged with tierLevel)
// -----------------------------------------------------------------------------

export const incentiveDefinitions: IncentiveDefinition[] = [
  {
    id: 'inc-weekend-warrior-apr26',
    type: 'weekend-warrior',
    name: 'Weekend Warrior',
    description: 'Complete 8 trips on weekends this month',
    bonusAmount: 50,
    targetCount: 8,
    periodId: 'period-2026-04',
    qualifyingCriteria: 'Trips completed on Saturday or Sunday',
    iconName: 'calendar-weekend',
    tierLevel: 'gold',
  },
  {
    id: 'early-bird',
    type: 'early-bird',
    name: 'Early Bird',
    description: 'Complete 8 qualifying trips before 9am',
    bonusAmount: 30,
    targetCount: 8,
    periodId: 'may-2026',
    qualifyingCriteria: '8 trips before 9am',
    tierLevel: 'silver',
  },
  {
    id: 'peak-performer',
    type: 'peak-hours',
    name: 'Peak Performer',
    description: 'Complete qualifying trips during peak hours (5-9am, 4-8pm)',
    bonusAmount: 50,
    targetCount: 10,
    periodId: 'may-2026',
    qualifyingCriteria: '10 trips between 5-9am or 4-8pm',
    tierLevel: 'gold',
  },
  {
    id: 'loyalty-streak',
    type: 'loyalty-streak',
    name: 'Loyalty Streak',
    description: 'Complete rides for 5 consecutive calendar days',
    bonusAmount: 10,
    targetCount: 5,
    periodId: 'may-2026',
    qualifyingCriteria: 'Rides on 5 consecutive days',
    tierLevel: 'bronze',
  },
  {
    id: 'white-glove',
    type: 'white-glove',
    name: 'White Glove',
    description: 'Complete 6 door-to-door trips this month',
    bonusAmount: 50,
    targetCount: 6,
    periodId: 'may-2026',
    qualifyingCriteria: 'Trips with door-to-door service',
    tierLevel: 'gold',
  },
  {
    id: 'quick-wins',
    type: 'quick-wins',
    name: 'Quick Wins',
    description: 'Complete 10 short-distance trips this month',
    bonusAmount: 10,
    targetCount: 10,
    periodId: 'may-2026',
    qualifyingCriteria: 'Trips under 5 miles',
    tierLevel: 'bronze',
  },
  {
    id: 'hometown-hero',
    type: 'hometown-hero',
    name: 'Hometown Hero',
    description: 'Complete 8 trips within your home county',
    bonusAmount: 30,
    targetCount: 8,
    periodId: 'may-2026',
    qualifyingCriteria: 'Pickup and dropoff in same county',
    tierLevel: 'silver',
  },
  {
    id: 'squad-goals',
    type: 'squad-goals',
    name: 'Squad Goals',
    description: 'Complete 6 multi-rider trips this month',
    bonusAmount: 50,
    targetCount: 6,
    periodId: 'may-2026',
    qualifyingCriteria: 'Trips with 2+ passengers',
    tierLevel: 'gold',
  },
];

// -----------------------------------------------------------------------------
// DRIVER INCENTIVE PROGRESS (4 entries, mixed states)
// Note: early-bird and loyalty-streak are COMPLETED — trips that previously
// qualified for these are reseeded with incentiveType: null.
// -----------------------------------------------------------------------------

export const driverIncentiveProgress: DriverIncentiveProgress[] = [
  {
    incentiveId: 'inc-weekend-warrior-apr26',
    currentCount: 5,              // 5 trips completed
    scheduledCount: 2,            // 2 trips already scheduled/taken
    targetCount: 8,               // Need 8 total, so 1 more to take
    isComplete: false,
    bonusEarned: 0,
    lastQualifyingTripId: 'trip-req-003',
  },
  {
    incentiveId: 'inc-early-bird-apr26',
    currentCount: 10,
    scheduledCount: 0,
    targetCount: 10,
    isComplete: true,
    bonusEarned: 75,
    lastQualifyingTripId: 'trip-hist-002',
  },
  {
    incentiveId: 'inc-peak-hours-apr26',
    currentCount: 9,              // 9 completed
    scheduledCount: 3,            // 3 scheduled
    targetCount: 15,              // Need 15, so 3 more to take
    isComplete: false,
    bonusEarned: 0,
    lastQualifyingTripId: 'trip-upcoming-002',
  },
  {
    incentiveId: 'inc-loyalty-streak-apr26',
    currentCount: 5,
    scheduledCount: 0,
    targetCount: 5,
    isComplete: true,
    bonusEarned: 85,
    lastQualifyingTripId: 'trip-hist-003',
  },
  {
    incentiveId: 'white-glove',
    currentCount: 2,
    scheduledCount: 1,
    targetCount: 6,
    isComplete: false,
    bonusEarned: 0,
  },
  {
    incentiveId: 'quick-wins',
    currentCount: 4,
    scheduledCount: 1,
    targetCount: 10,
    isComplete: false,
    bonusEarned: 0,
  },
  {
    incentiveId: 'hometown-hero',
    currentCount: 3,
    scheduledCount: 2,
    targetCount: 8,
    isComplete: false,
    bonusEarned: 0,
  },
  {
    incentiveId: 'squad-goals',
    currentCount: 1,
    scheduledCount: 1,
    targetCount: 6,
    isComplete: false,
    bonusEarned: 0,
  },
];

// -----------------------------------------------------------------------------
// TRIPS (12 total: 5 Requests, 4 My Rides, 3 History)
// SINGLE program per trip. Trips that previously qualified for COMPLETED programs
// (early-bird, loyalty-streak) get incentiveType: null. Multi-program trips were
// reduced to the higher-tier program.
// -----------------------------------------------------------------------------

export const seedTrips: Trip[] = [
  // === REQUESTS (5) ===
  {
    id: 'trip-req-001',
    date: 'Thu, Apr 30, 2026',
    pickupTime: '2026-04-30T07:30:00Z',
    rider: 'Alex M.',
    client: 'Verida',
    passengerCount: 1,
    distance: '8.2 mi away',
    revenue: 32,
    notes: 'Wheelchair accessible vehicle required',
    status: 'request',
    // Was: ['early-bird', 'peak-hours'] — early-bird is completed, so use peak-hours (gold)
    incentiveType: 'peak-hours',
    clientEnrolledInIncentives: true,
    legs: [
      {
        id: 'trip-req-001-a',
        type: 'est-pickup',
        label: 'Est Pick-up Time',
        time: '7:30 AM',
        address: '1234 Sunrise Blvd, Atlanta, GA 30301',
        county: 'Fulton County',
        revenue: 32,
      },
      {
        id: 'trip-req-001-b',
        type: 'appointment',
        label: 'Appointment Time',
        time: '8:15 AM',
        address: 'Piedmont Hospital, 1968 Peachtree Rd, Atlanta, GA 30309',
        county: 'Fulton County',
        revenue: 0,
      },
    ],
    pills: [
      { label: 'Single Legs Allowed', variant: 'success' },
      { label: 'Expires in 4 hours', variant: 'warning' },
    ],
  },
  {
    id: 'trip-req-002',
    date: 'Sat, May 2, 2026',
    pickupTime: '2026-05-02T14:00:00Z',
    rider: 'Jamie L.',
    client: 'MTM',
    passengerCount: 2,
    distance: '12.5 mi away',
    revenue: 45,
    notes: '',
    status: 'request',
    incentiveType: 'weekend-warrior', // Single (gold)
    clientEnrolledInIncentives: true,
    legs: [
      {
        id: 'trip-req-002-a',
        type: 'wait-for-call',
        label: 'Est Pick-up Time - Wait For Call',
        time: '2:00 PM',
        address: '567 Oak Street, Decatur, GA 30030',
        county: 'DeKalb County',
        revenue: 45,
      },
    ],
    pills: [
      { label: 'Wait For Call', variant: 'attention' },
      { label: 'Expires in 2 days', variant: 'neutral' },
    ],
  },
  {
    id: 'trip-req-003',
    date: 'Sun, May 3, 2026',
    pickupTime: '2026-05-03T10:00:00Z',
    rider: 'Taylor R.',
    client: 'Verida',
    passengerCount: 1,
    distance: '5.8 mi away',
    revenue: 28,
    notes: 'Please text upon arrival',
    status: 'request',
    incentiveType: 'weekend-warrior', // Single (gold)
    clientEnrolledInIncentives: true,
    legs: [
      {
        id: 'trip-req-003-a',
        type: 'est-pickup',
        label: 'Est Pick-up Time',
        time: '10:00 AM',
        address: '890 Pine Ave, Marietta, GA 30060',
        county: 'Cobb County',
        revenue: 28,
      },
      {
        id: 'trip-req-003-b',
        type: 'appointment',
        label: 'Appointment Time',
        time: '10:45 AM',
        address: 'Wellstar Kennestone, 677 Church St, Marietta, GA 30060',
        county: 'Cobb County',
        revenue: 0,
      },
    ],
    pills: [
      { label: 'Expires in 3 days', variant: 'neutral' },
    ],
  },
  {
    id: 'trip-req-004',
    date: 'Mon, May 4, 2026',
    pickupTime: '2026-05-04T11:30:00Z',
    rider: 'Morgan K.',
    client: 'CareSource',
    passengerCount: 1,
    distance: '15.2 mi away',
    revenue: 52,
    notes: '',
    status: 'request',
    incentiveType: null, // Client not enrolled
    clientEnrolledInIncentives: false,
    legs: [
      {
        id: 'trip-req-004-a',
        type: 'scheduled',
        label: 'Scheduled Pick-up Time',
        time: '11:30 AM',
        address: '234 Elm Drive, Alpharetta, GA 30009',
        county: 'Fulton County',
        revenue: 52,
      },
    ],
    pills: [
      { label: 'Single Legs Allowed', variant: 'success' },
      { label: 'Expires in 6 hours', variant: 'warning' },
    ],
  },
  {
    id: 'trip-req-005',
    date: 'Tue, May 5, 2026',
    pickupTime: '2026-05-05T06:45:00Z',
    rider: 'Casey P.',
    client: 'Verida',
    passengerCount: 1,
    distance: '9.1 mi away',
    revenue: 38,
    notes: 'Early morning dialysis appointment',
    status: 'request',
    // Was: ['early-bird', 'peak-hours'] — early-bird is completed, so use peak-hours (gold)
    incentiveType: 'peak-hours',
    clientEnrolledInIncentives: true,
    legs: [
      {
        id: 'trip-req-005-a',
        type: 'est-pickup',
        label: 'Est Pick-up Time',
        time: '6:45 AM',
        address: '456 Morning Glory Ln, Smyrna, GA 30080',
        county: 'Cobb County',
        revenue: 38,
      },
      {
        id: 'trip-req-005-b',
        type: 'appointment',
        label: 'Appointment Time',
        time: '7:30 AM',
        address: 'DaVita Dialysis, 2100 W Paces Ferry Rd, Atlanta, GA 30327',
        county: 'Fulton County',
        revenue: 0,
      },
    ],
    pills: [
      { label: 'Expires in 12 hours', variant: 'neutral' },
    ],
  },

  // === MY RIDES - UPCOMING (2) ===
  {
    id: 'trip-upcoming-001',
    date: 'Wed, Apr 29, 2026',
    pickupTime: '2026-04-29T17:00:00Z',
    rider: 'Jordan S.',
    client: 'Verida',
    passengerCount: 1,
    distance: '',
    revenue: 35,
    notes: '',
    status: 'upcoming',
    incentiveType: 'peak-hours', // Single (gold)
    clientEnrolledInIncentives: true,
    legs: [
      {
        id: 'trip-upcoming-001-a',
        type: 'scheduled',
        label: 'Scheduled Pick-up Time',
        time: '5:00 PM',
        address: '789 Corporate Blvd, Sandy Springs, GA 30328',
        county: 'Fulton County',
        revenue: 35,
      },
      {
        id: 'trip-upcoming-001-b',
        type: 'appointment',
        label: 'Drop-off',
        time: '5:45 PM',
        address: '123 Residential Way, Dunwoody, GA 30338',
        county: 'DeKalb County',
        revenue: 0,
      },
    ],
    pills: [],
  },
  {
    id: 'trip-upcoming-002',
    date: 'Thu, Apr 30, 2026',
    pickupTime: '2026-04-30T18:30:00Z',
    rider: 'Riley W.',
    client: 'MTM',
    passengerCount: 1,
    distance: '',
    revenue: 42,
    notes: 'Return trip from therapy',
    status: 'upcoming',
    incentiveType: 'peak-hours', // Single (gold)
    clientEnrolledInIncentives: true,
    legs: [
      {
        id: 'trip-upcoming-002-a',
        type: 'scheduled',
        label: 'Scheduled Pick-up Time',
        time: '6:30 PM',
        address: 'Emory Rehab, 1441 Clifton Rd, Atlanta, GA 30322',
        county: 'DeKalb County',
        revenue: 42,
      },
    ],
    pills: [],
  },

  // === MY RIDES - NEEDS ACTION (2) ===
  {
    id: 'trip-needs-001',
    date: 'Fri, May 1, 2026',
    pickupTime: '2026-05-01T09:00:00Z',
    rider: 'Avery T.',
    client: 'Verida',
    passengerCount: 1,
    distance: '',
    revenue: 30,
    notes: 'Confirm 24 hours before',
    status: 'needs-action',
    incentiveType: null, // No incentives
    clientEnrolledInIncentives: true,
    legs: [
      {
        id: 'trip-needs-001-a',
        type: 'est-pickup',
        label: 'Est Pick-up Time',
        time: '9:00 AM',
        address: '567 Confirmation St, Roswell, GA 30076',
        county: 'Fulton County',
        revenue: 30,
      },
      {
        id: 'trip-needs-001-b',
        type: 'appointment',
        label: 'Appointment Time',
        time: '9:45 AM',
        address: 'North Fulton Medical, 3000 Hospital Blvd, Roswell, GA 30076',
        county: 'Fulton County',
        revenue: 0,
      },
    ],
    pills: [
      { label: 'Not Confirmed', variant: 'danger' },
    ],
  },
  {
    id: 'trip-needs-002',
    date: 'Sat, May 2, 2026',
    pickupTime: '2026-05-02T08:00:00Z',
    rider: 'Quinn B.',
    client: 'Verida',
    passengerCount: 2,
    distance: '',
    revenue: 48,
    notes: 'Two passengers, one in wheelchair',
    status: 'needs-action',
    // Was: ['weekend-warrior', 'early-bird'] — early-bird is completed, weekend-warrior is gold
    incentiveType: 'weekend-warrior',
    clientEnrolledInIncentives: true,
    legs: [
      {
        id: 'trip-needs-002-a',
        type: 'est-pickup',
        label: 'Est Pick-up Time',
        time: '8:00 AM',
        address: '890 Weekend Way, Tucker, GA 30084',
        county: 'DeKalb County',
        revenue: 48,
      },
    ],
    pills: [
      { label: 'Not Confirmed', variant: 'danger' },
    ],
  },

  // === RIDE HISTORY (3) ===
  {
    id: 'trip-hist-001',
    date: 'Mon, Apr 27, 2026',
    pickupTime: '2026-04-27T14:00:00Z',
    rider: 'Sam D.',
    client: 'CareSource',
    passengerCount: 1,
    distance: '',
    revenue: 36,
    notes: '',
    status: 'completed',
    incentiveType: null, // Client not enrolled
    clientEnrolledInIncentives: false,
    legs: [
      {
        id: 'trip-hist-001-a',
        type: 'scheduled',
        label: 'Completed Pick-up',
        time: '2:00 PM',
        address: '123 History Lane, Lawrenceville, GA 30046',
        county: 'Gwinnett County',
        revenue: 36,
      },
    ],
    pills: [],
  },
  {
    id: 'trip-hist-002',
    date: 'Tue, Apr 28, 2026',
    pickupTime: '2026-04-28T07:00:00Z',
    rider: 'Drew H.',
    client: 'Verida',
    passengerCount: 1,
    distance: '',
    revenue: 29,
    notes: 'Early bird trip',
    status: 'completed',
    // Was: ['early-bird', 'peak-hours'] — early-bird is completed, so use peak-hours (gold)
    incentiveType: 'peak-hours',
    clientEnrolledInIncentives: true,
    legs: [
      {
        id: 'trip-hist-002-a',
        type: 'scheduled',
        label: 'Completed Pick-up',
        time: '7:00 AM',
        address: '456 Dawn Dr, Brookhaven, GA 30319',
        county: 'DeKalb County',
        revenue: 29,
      },
      {
        id: 'trip-hist-002-b',
        type: 'appointment',
        label: 'Completed Drop-off',
        time: '7:45 AM',
        address: 'Emory Clinic, 1365 Clifton Rd, Atlanta, GA 30322',
        county: 'DeKalb County',
        revenue: 0,
      },
    ],
    pills: [],
  },
  {
    id: 'trip-hist-003',
    date: 'Wed, Apr 29, 2026',
    pickupTime: '2026-04-29T10:30:00Z',
    rider: 'Blake N.',
    client: 'MTM',
    passengerCount: 1,
    distance: '',
    revenue: 41,
    notes: 'Streak completed!',
    status: 'completed',
    // Was: ['loyalty-streak'] — loyalty-streak is completed → null (data-driven suppression)
    incentiveType: null,
    clientEnrolledInIncentives: true,
    legs: [
      {
        id: 'trip-hist-003-a',
        type: 'scheduled',
        label: 'Completed Pick-up',
        time: '10:30 AM',
        address: '789 Streak St, Chamblee, GA 30341',
        county: 'DeKalb County',
        revenue: 41,
      },
    ],
    pills: [],
  },
];

// -----------------------------------------------------------------------------
// LEADERBOARD (20 entries — current driver NOT in top 20; lives in YourPlacementCard at #47/200)
// Sorted by bonusesEarnedThisMonth DESC ($ earned).
// Month = May 2026.
// Ranks 1-20, all anonymized realistic usernames, all isCurrentDriver: false.
// All entries have $ > 80 (current driver is outside top 20 at rank 47 with $80).
// Atlanta-metro counties: Fulton, DeKalb, Cobb, Gwinnett, Henry, Clayton.
// Thresholds: Bronze 0 / Silver 50 / Gold 150 / Platinum 300.
// -------

export const leaderboardEntries: LeaderboardEntry[] = [
  { rank: 1,  handle: 'mike_atl',    bonusesEarnedThisMonth: 230, tier: 'gold',   county: 'Fulton County',   isCurrentDriver: false },
  { rank: 2,  handle: 'j_williams',  bonusesEarnedThisMonth: 180, tier: 'gold',   county: 'DeKalb County',   isCurrentDriver: false },
  { rank: 3,  handle: 'sarah_d',     bonusesEarnedThisMonth: 130, tier: 'silver', county: 'Cobb County',     isCurrentDriver: false },
  { rank: 4,  handle: 'raj_patel',   bonusesEarnedThisMonth: 125, tier: 'silver', county: 'Fulton County',   isCurrentDriver: false },
  { rank: 5,  handle: 'tasha_b',     bonusesEarnedThisMonth: 120, tier: 'silver', county: 'Gwinnett County', isCurrentDriver: false },
  { rank: 6,  handle: 'carlos_r',    bonusesEarnedThisMonth: 115, tier: 'silver', county: 'Henry County',    isCurrentDriver: false },
  { rank: 7,  handle: 'leah_w',      bonusesEarnedThisMonth: 110, tier: 'silver', county: 'Clayton County',  isCurrentDriver: false },
  { rank: 8,  handle: 'devon_k',     bonusesEarnedThisMonth: 105, tier: 'silver', county: 'DeKalb County',   isCurrentDriver: false },
  { rank: 9,  handle: 'maria_l',     bonusesEarnedThisMonth: 102, tier: 'silver', county: 'Fulton County',   isCurrentDriver: false },
  { rank: 10, handle: 'jamal_h',     bonusesEarnedThisMonth: 100, tier: 'silver', county: 'Cobb County',     isCurrentDriver: false },
  { rank: 11, handle: 'kim_n',       bonusesEarnedThisMonth: 97,  tier: 'silver', county: 'Henry County',    isCurrentDriver: false },
  { rank: 12, handle: 'tyler_p',     bonusesEarnedThisMonth: 95,  tier: 'silver', county: 'Fulton County',   isCurrentDriver: false },
  { rank: 13, handle: 'nina_g',      bonusesEarnedThisMonth: 93,  tier: 'silver', county: 'Gwinnett County', isCurrentDriver: false },
  { rank: 14, handle: 'omar_s',      bonusesEarnedThisMonth: 91,  tier: 'silver', county: 'Clayton County',  isCurrentDriver: false },
  { rank: 15, handle: 'ruby_t',      bonusesEarnedThisMonth: 90,  tier: 'silver', county: 'DeKalb County',   isCurrentDriver: false },
  { rank: 16, handle: 'alex_v',      bonusesEarnedThisMonth: 89,  tier: 'silver', county: 'Cobb County',     isCurrentDriver: false },
  { rank: 17, handle: 'jenna_m',     bonusesEarnedThisMonth: 88,  tier: 'silver', county: 'Fulton County',   isCurrentDriver: false },
  { rank: 18, handle: 'pete_o',      bonusesEarnedThisMonth: 87,  tier: 'silver', county: 'Henry County',    isCurrentDriver: false },
  { rank: 19, handle: 'angie_c',     bonusesEarnedThisMonth: 86,  tier: 'silver', county: 'Gwinnett County', isCurrentDriver: false },
  { rank: 20, handle: 'derek_y',     bonusesEarnedThisMonth: 85,  tier: 'silver', county: 'Clayton County',  isCurrentDriver: false },
];

// -----------------------------------------------------------------------------
// Tier thresholds are now MONTHLY DOLLARS (not points).
// Bronze: 0 / Silver: 50 / Gold: 150 / Platinum: 300
// -------

export const tierConfigs: TierConfig[] = [
  {
    tier: 'bronze',
    label: 'Bronze',
    threshold: 0,
    multiplier: 1.0,
    badgeColor: '#CD7F32',
  },
  {
    tier: 'silver',
    label: 'Silver',
    threshold: 50,
    multiplier: 1.1,
    badgeColor: '#C0C0C0',
  },
  {
    tier: 'gold',
    label: 'Gold',
    threshold: 150,
    multiplier: 1.25,
    badgeColor: '#FFD700',
  },
  {
    tier: 'platinum',
    label: 'Platinum',
    threshold: 300,
    multiplier: 1.5,
    badgeColor: '#E5E4E2',
  },
];

// -----------------------------------------------------------------------------
// CURRENT DRIVER
// $80 earned this month = Silver tier (>= $50, < $150)
// Rank #47 of 200 — outside the top-20 leaderboard, lives in YourPlacementCard.
// -------

export const currentDriver: CurrentDriver = {
  id: 'driver-7821',
  displayName: 'Alex B.',
  initials: 'AB',
  currentTier: 'silver',
  totalBonusesEarnedThisMonth: 80,
  currentRank: 47,
  totalDrivers: 200,
  county: 'Fulton County',
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
  incentivesInProgress: 2, // weekend-warrior, peak-hours
  incentivesCompleted: 2,  // early-bird, loyalty-streak
};

// -----------------------------------------------------------------------------
// PAY PERIODS (4 entries: 2 closed, 1 current, 1 upcoming)
// -----------------------------------------------------------------------------

export const PAY_PERIODS: PayPeriod[] = [
  {
    id: 'period-2026-04-14',
    startDate: 'Apr 14',
    endDate: 'Apr 20',
    payoutDate: 'Mon, Apr 20',
    status: 'closed',
  },
  {
    id: 'period-2026-04-21',
    startDate: 'Apr 21',
    endDate: 'Apr 27',
    payoutDate: 'Mon, Apr 27',
    status: 'closed',
  },
  {
    id: 'period-2026-04-28',
    startDate: 'Apr 28',
    endDate: 'May 4',
    payoutDate: 'Mon, May 4',
    status: 'current',
  },
  {
    id: 'period-2026-05-05',
    startDate: 'May 5',
    endDate: 'May 11',
    payoutDate: 'Mon, May 11',
    status: 'upcoming',
  },
];

// -----------------------------------------------------------------------------
// PAYOUT PERIOD SUMMARIES (one record per period)
// Sum check (per period): earnedFromCompletedRides + upcomingFromAcceptedRides
//   + incentivesTotal === Projected/Final hero shown
// -----------------------------------------------------------------------------

export const PAYOUT_PERIOD_SUMMARIES: PayoutPeriodSummary[] = [
  // CLOSED — Apr 14–20: 1 completed ride + early-bird program triggered
  // Final = 109.80 + 0 + 75 = 184.80
  {
    periodId: 'period-2026-04-14',
    earnedFromCompletedRides: 109.80,
    completedRidesCount: 1,
    upcomingFromAcceptedRides: 0,
    upcomingRidesCount: 0,
    incentivesTotal: 75,
    incentivesEarnedCount: 1,
    incentivesTotalCount: 1,
    completedTripIds: ['COMP-002'],
    upcomingTripIds: [],
    programIdsContributing: ['early-bird'],
  },
  // CLOSED — Apr 21–27: 2 completed rides + loyalty-streak triggered
  // Final = 268.22 + 0 + 85 = 353.22
  {
    periodId: 'period-2026-04-21',
    earnedFromCompletedRides: 268.22,
    completedRidesCount: 2,
    upcomingFromAcceptedRides: 0,
    upcomingRidesCount: 0,
    incentivesTotal: 85,
    incentivesEarnedCount: 1,
    incentivesTotalCount: 1,
    completedTripIds: ['COMP-001', 'COMP-003'],
    upcomingTripIds: [],
    programIdsContributing: ['loyalty-streak'],
  },
  // CURRENT — Apr 28–May 4: 3 completed + 2 upcoming + 2 in-progress programs
  // Projected = 342.50 + 87 + 150 = 579.50
  {
    periodId: 'period-2026-04-28',
    earnedFromCompletedRides: 342.50,
    completedRidesCount: 3,
    upcomingFromAcceptedRides: 87,
    upcomingRidesCount: 2,
    incentivesTotal: 150,            // weekend-warrior $50 + peak-hours $100 (both projected)
    incentivesEarnedCount: 0,
    incentivesTotalCount: 2,
    completedTripIds: ['CURRENT-COMP-001', 'CURRENT-COMP-002', 'CURRENT-COMP-003'],
    upcomingTripIds: ['UP-CURRENT-001', 'UP-CURRENT-002'],
    programIdsContributing: ['weekend-warrior', 'peak-hours'],
  },
  // UPCOMING — May 5–11: 1 accepted ride scheduled, no programs yet
  // Projected = 0 + 38 + 0 = 38
  {
    periodId: 'period-2026-05-05',
    earnedFromCompletedRides: 0,
    completedRidesCount: 0,
    upcomingFromAcceptedRides: 38,
    upcomingRidesCount: 1,
    incentivesTotal: 0,
    incentivesEarnedCount: 0,
    incentivesTotalCount: 0,
    completedTripIds: [],
    upcomingTripIds: ['UP-FUTURE-001'],
    programIdsContributing: [],
  },
];

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

/** Get tier config by tier */
export function getTierConfig(tier: Tier): TierConfig | undefined {
  return tierConfigs.find(t => t.tier === tier);
}

/** Get trips by status */
export function getTripsByStatus(status: TripStatus): Trip[] {
  return seedTrips.filter(t => t.status === status);
}

/** Get trips that qualify for a specific incentive type */
export function getTripsForIncentiveType(type: IncentiveType): Trip[] {
  return seedTrips.filter(t => t.incentiveType === type);
}

/** Check if a trip has an active incentive program */
export function tripHasIncentives(trip: Trip): boolean {
  return trip.incentiveType !== null && trip.clientEnrolledInIncentives;
}
