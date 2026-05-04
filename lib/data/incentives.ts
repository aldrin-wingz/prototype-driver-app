// =============================================================================
// INCENTIVE DATA SCHEMA + SEED DATA  (v1 — post I-0 strip)
// =============================================================================
// Tier system, leaderboard, and pay-period summaries removed in I-0. Schema
// migration to add admin-editable fields (color, timeframe, enabled, sortOrder,
// marketScope, clientScope, trigger) and the multi-incentive `incentiveTypes[]`
// array on Trip is the job of I-1 — DO NOT add those here.
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
 * Per-incentive `bonusAmount` is the sole source of truth in v1.
 *
 * NOTE: Admin-editable fields (color, timeframe, enabled, sortOrder, marketScope,
 * clientScope, trigger) plus the rename of `name`→`title`, `targetCount`→`goal`,
 * and removal of `periodId` are part of I-1, not I-0.
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
  scheduledCount: number;          // Trips scheduled/accepted that will count when completed
  targetCount: number;             // Copied from definition for convenience
  isComplete: boolean;             // Has the driver hit the target?
  bonusEarned: number;             // 0 if not complete, bonusAmount if complete
  lastQualifyingTripId?: string;
}

/**
 * A trip/ride in the system.
 *
 * v1 still uses the singular `incentiveType: IncentiveType | null` field. The
 * migration to `incentiveTypes: IncentiveType[]` (multi-incentive) is part of I-1.
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

  // Incentive-related fields
  incentiveType: IncentiveType | null;
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
    id: 'early-bird',
    type: 'early-bird',
    name: 'Early Bird',
    description: 'Complete 8 qualifying trips before 9am',
    bonusAmount: 30,
    targetCount: 8,
    periodId: 'may-2026',
    qualifyingCriteria: '8 trips before 9am',
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
  },
];

// -----------------------------------------------------------------------------
// DRIVER INCENTIVE PROGRESS
// -----------------------------------------------------------------------------

export const driverIncentiveProgress: DriverIncentiveProgress[] = [
  {
    incentiveId: 'inc-weekend-warrior-apr26',
    currentCount: 5,
    scheduledCount: 2,
    targetCount: 8,
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
    currentCount: 9,
    scheduledCount: 3,
    targetCount: 15,
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
// TRIPS
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
    incentiveType: 'weekend-warrior',
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
    incentiveType: 'weekend-warrior',
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
    incentiveType: null,
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
    incentiveType: 'peak-hours',
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
    incentiveType: 'peak-hours',
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
    incentiveType: null,
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
    incentiveType: null,
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
  return seedTrips.filter(t => t.incentiveType === type);
}

/** Check if a trip has an active incentive program */
export function tripHasIncentives(trip: Trip): boolean {
  return trip.incentiveType !== null && trip.clientEnrolledInIncentives;
}
