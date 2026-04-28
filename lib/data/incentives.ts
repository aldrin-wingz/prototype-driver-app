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
  | 'perfect-rating';      // Maintain 5-star rating for X trips

/** Driver tier levels */
export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum';

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
}

/**
 * A driver's progress toward an incentive program.
 */
export interface DriverIncentiveProgress {
  incentiveId: string;             // References IncentiveDefinition.id
  currentCount: number;            // Trips completed toward this incentive
  targetCount: number;             // Copied from definition for convenience
  isComplete: boolean;             // Has the driver hit the target?
  bonusEarned: number;             // 0 if not complete, bonusAmount if complete
  lastQualifyingTripId?: string;   // Most recent qualifying trip
}

/**
 * A trip/ride in the system.
 * NOTE: NO per-trip bonus dollars. `incentiveTypes` indicates which programs
 * this trip qualifies for. Bonus is paid at program completion.
 */
export interface Trip {
  id: string;
  date: string;                    // Display date (e.g., "Thu, Apr 30, 2026")
  pickupTime: string;              // ISO datetime string
  rider: string;                   // Anonymized rider name
  client: string;                  // Client/payer name (e.g., "Verida", "MTM")
  passengerCount: number;
  distance: string;                // e.g., "12.5 mi away" or ""
  revenue: number;                 // Base trip revenue in dollars (INTEGER)
  notes: string;
  status: TripStatus;
  
  // Incentive-related fields
  incentiveTypes: IncentiveType[]; // Which programs this trip qualifies for (can be empty)
  clientEnrolledInIncentives: boolean; // Is this client/market enrolled in incentive programs?
  
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
 */
export interface LeaderboardEntry {
  rank: number;
  driverHandle: string;            // Anonymized (e.g., "Driver-7821")
  tripsCompleted: number;
  bonusEarned: number;             // Total bonus earned this period
  tier: Tier;
  isCurrentDriver: boolean;        // Highlight if this is the logged-in driver
}

/**
 * Configuration for a tier level.
 */
export interface TierConfig {
  tier: Tier;
  name: string;                    // Display name
  minTrips: number;                // Minimum trips to reach this tier
  maxTrips: number | null;         // Upper bound (null for top tier)
  multiplier: number;              // Bonus multiplier (1.0 = no bonus)
  perks: string[];                 // List of tier perks
  color: string;                   // Tailwind color class
  badgeColor: string;              // Badge background color
}

/**
 * Current logged-in driver info.
 */
export interface CurrentDriver {
  id: string;
  handle: string;                  // Anonymized handle
  firstName: string;
  lastName: string;
  tier: Tier;
  tripsThisPeriod: number;
  tripsToNextTier: number;
  totalBonusEarned: number;        // This period
  lifetimeBonusEarned: number;
  incentivesAccomplished: number;  // Count of completed incentive programs this period
  avatarInitials: string;
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
// INCENTIVE DEFINITIONS (4 programs)
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
  },
  {
    id: 'inc-early-bird-apr26',
    type: 'early-bird',
    name: 'Early Bird',
    description: 'Complete 10 trips before 9am',
    bonusAmount: 75,
    targetCount: 10,
    periodId: 'period-2026-04',
    qualifyingCriteria: 'Trips with pickup time before 9:00 AM',
    iconName: 'sunrise',
  },
  {
    id: 'inc-peak-hours-apr26',
    type: 'peak-hours',
    name: 'Peak Performer',
    description: 'Complete 15 trips during peak hours',
    bonusAmount: 100,
    targetCount: 15,
    periodId: 'period-2026-04',
    qualifyingCriteria: 'Trips during 5-9am or 4-8pm',
    iconName: 'clock-peak',
  },
  {
    id: 'inc-loyalty-streak-apr26',
    type: 'loyalty-streak',
    name: 'Loyalty Streak',
    description: 'Complete trips 5 consecutive days',
    bonusAmount: 85,
    targetCount: 5,
    periodId: 'period-2026-04',
    qualifyingCriteria: 'At least 1 trip per day for 5 days in a row',
    iconName: 'flame',
  },
];

// -----------------------------------------------------------------------------
// DRIVER INCENTIVE PROGRESS (4 entries, mixed states)
// -----------------------------------------------------------------------------

export const driverIncentiveProgress: DriverIncentiveProgress[] = [
  {
    incentiveId: 'inc-weekend-warrior-apr26',
    currentCount: 6,
    targetCount: 8,
    isComplete: false,
    bonusEarned: 0,
    lastQualifyingTripId: 'trip-req-003',
  },
  {
    incentiveId: 'inc-early-bird-apr26',
    currentCount: 10,
    targetCount: 10,
    isComplete: true,
    bonusEarned: 75,
    lastQualifyingTripId: 'trip-hist-002',
  },
  {
    incentiveId: 'inc-peak-hours-apr26',
    currentCount: 12,
    targetCount: 15,
    isComplete: false,
    bonusEarned: 0,
    lastQualifyingTripId: 'trip-upcoming-002',
  },
  {
    incentiveId: 'inc-loyalty-streak-apr26',
    currentCount: 5,
    targetCount: 5,
    isComplete: true,
    bonusEarned: 85,
    lastQualifyingTripId: 'trip-hist-003',
  },
];

// -----------------------------------------------------------------------------
// TRIPS (12 total: 5 Requests, 4 My Rides, 3 History)
// Mix of single/multi/no incentive types
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
    incentiveTypes: ['early-bird', 'peak-hours'], // Multi-incentive
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
    incentiveTypes: ['weekend-warrior'], // Single incentive
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
    incentiveTypes: ['weekend-warrior'], // Single incentive
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
    incentiveTypes: [], // No incentives (client not enrolled)
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
    incentiveTypes: ['early-bird', 'peak-hours'], // Multi-incentive
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
    incentiveTypes: ['peak-hours'], // Single incentive
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
    incentiveTypes: ['peak-hours'], // Single incentive
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
    incentiveTypes: [], // No incentives
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
    incentiveTypes: ['weekend-warrior', 'early-bird'], // Multi-incentive
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
    incentiveTypes: [], // No incentives (client not enrolled)
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
    incentiveTypes: ['early-bird', 'peak-hours'], // Multi-incentive
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
    incentiveTypes: ['loyalty-streak'], // Single incentive
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
// LEADERBOARD (10 entries, current driver at #4)
// -----------------------------------------------------------------------------

export const leaderboardEntries: LeaderboardEntry[] = [
  { rank: 1, driverHandle: 'Driver-9142', tripsCompleted: 47, bonusEarned: 285, tier: 'platinum', isCurrentDriver: false },
  { rank: 2, driverHandle: 'Driver-3856', tripsCompleted: 42, bonusEarned: 245, tier: 'gold', isCurrentDriver: false },
  { rank: 3, driverHandle: 'Driver-6204', tripsCompleted: 38, bonusEarned: 220, tier: 'gold', isCurrentDriver: false },
  { rank: 4, driverHandle: 'Driver-7821', tripsCompleted: 34, bonusEarned: 160, tier: 'silver', isCurrentDriver: true },
  { rank: 5, driverHandle: 'Driver-1093', tripsCompleted: 31, bonusEarned: 150, tier: 'silver', isCurrentDriver: false },
  { rank: 6, driverHandle: 'Driver-4527', tripsCompleted: 28, bonusEarned: 125, tier: 'silver', isCurrentDriver: false },
  { rank: 7, driverHandle: 'Driver-8361', tripsCompleted: 24, bonusEarned: 100, tier: 'bronze', isCurrentDriver: false },
  { rank: 8, driverHandle: 'Driver-2749', tripsCompleted: 21, bonusEarned: 85, tier: 'bronze', isCurrentDriver: false },
  { rank: 9, driverHandle: 'Driver-5918', tripsCompleted: 18, bonusEarned: 75, tier: 'bronze', isCurrentDriver: false },
  { rank: 10, driverHandle: 'Driver-7034', tripsCompleted: 15, bonusEarned: 50, tier: 'bronze', isCurrentDriver: false },
];

// -----------------------------------------------------------------------------
// TIER CONFIGURATIONS (4 tiers)
// -----------------------------------------------------------------------------

export const tierConfigs: TierConfig[] = [
  {
    tier: 'bronze',
    name: 'Bronze',
    minTrips: 0,
    maxTrips: 19,
    multiplier: 1.0,
    perks: ['Access to all standard incentives', 'Monthly bonus eligibility'],
    color: 'amber-700',
    badgeColor: '#CD7F32',
  },
  {
    tier: 'silver',
    name: 'Silver',
    minTrips: 20,
    maxTrips: 34,
    multiplier: 1.1,
    perks: ['10% bonus multiplier', 'Priority ride matching', 'Early access to new programs'],
    color: 'gray-400',
    badgeColor: '#C0C0C0',
  },
  {
    tier: 'gold',
    name: 'Gold',
    minTrips: 35,
    maxTrips: 49,
    multiplier: 1.25,
    perks: ['25% bonus multiplier', 'Dedicated support line', 'Exclusive high-value rides'],
    color: 'yellow-500',
    badgeColor: '#FFD700',
  },
  {
    tier: 'platinum',
    name: 'Platinum',
    minTrips: 50,
    maxTrips: null,
    multiplier: 1.5,
    perks: ['50% bonus multiplier', 'First access to all requests', 'VIP driver status', 'Quarterly bonus pool'],
    color: 'slate-300',
    badgeColor: '#E5E4E2',
  },
];

// -----------------------------------------------------------------------------
// CURRENT DRIVER
// -----------------------------------------------------------------------------

export const currentDriver: CurrentDriver = {
  id: 'driver-7821',
  handle: 'Driver-7821',
  firstName: 'Alex',
  lastName: 'B.',
  tier: 'silver',
  tripsThisPeriod: 34,
  tripsToNextTier: 1, // 35 - 34 = 1 trip to Gold
  totalBonusEarned: 160, // 75 (early-bird) + 85 (loyalty-streak)
  lifetimeBonusEarned: 1250,
  incentivesAccomplished: 2, // early-bird and loyalty-streak completed
  avatarInitials: 'AB',
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
  return seedTrips.filter(t => t.incentiveTypes.includes(type));
}

/** Check if a trip qualifies for any incentives */
export function tripHasIncentives(trip: Trip): boolean {
  return trip.incentiveTypes.length > 0 && trip.clientEnrolledInIncentives;
}
