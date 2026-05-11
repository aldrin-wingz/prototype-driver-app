// schemaVersion: 2026-05-12-v6
//
// App-I-6 (Resume Wave, 2026-05-12) — App-side mirror of the
// Disqualification + Appeal subsystem defined Manager-side in P-12.
//
// The Driver App reads (and via App-I-7, writes) the same shapes the
// Manager owns. Storage keys are pinned to `:v6` to parallel the
// canonical Manager keys, though App localStorage is its own browser
// origin and doesn't physically share data with the Manager prototype.
//
// Seed data is App-specific: ALL 10 demo disqualifications are pinned
// to `currentDriver.id` ('driver-7821') so the per-incentive history
// view surfaces non-empty content under the App's logged-in-driver
// model (vs Manager's many-driver fleet view). Incentive IDs and trip
// IDs are remapped to the App's seed (`inc-pp-001`, etc.) — the App
// and Manager don't share the same ID space, just the same type
// shapes (Schema Sync Note: "documented subset").
//
// Trigger source LOCKED: 'driverTargeting' only for v1. Trip Targeting
// retroactive reclassification deferred.

import type { IncentiveType } from "./incentives";

// -----------------------------------------------------------------------------
// TYPES  (mirrors Manager P-12 shapes 1:1; documented subset rule)
// -----------------------------------------------------------------------------

/**
 * The driver-targeting rule type discriminator. Manager-side this is
 * exported from `lib/data/driver-targeting.tsx`; App-side it lives here
 * as a string-literal union, kept aligned by the Schema Sync Note.
 *
 * App's `formatDisqualificationReason` only branches on the 3 reason
 * types the v1 seed covers (otpPercent, inAppSendbacksInWindow,
 * daysSinceLastActivity) — the other 3 are listed for type parity but
 * fall through to a generic copy builder if they ever surface.
 */
export type DriverTargetingType =
  | "tripsCompletedInWindow"
  | "daysSinceLastActivity"
  | "otpPercent"
  | "inAppSendbacksInWindow"
  | "addressCounty"
  | "tenureDays";

export interface Disqualification {
  id: string;
  driverId: string;
  incentiveId: string;
  /** App's seed trip IDs (`CURRENT-COMP-001`, `COMP-2023-001`) OR a
   *  synthetic `trip-dq-XXX` for disqualifications without a real
   *  matching seed trip (see `seedTriggeringTripSnapshots` below). */
  triggeringTripId: string;
  failedRule: {
    type: DriverTargetingType;
    params: Record<string, unknown>;
  };
  computedValues: {
    observed: number;
    threshold: number;
    unit?: string;
  };
  /** ISO datetime string. App stores as string (matches `IncentiveDefinition.startDate`
   *  pattern); the Manager-side counterpart stores `Date`. App's
   *  `migrateDisqualification` (in the hook) keeps both forms readable. */
  createdAt: string;
  resolved?: boolean;
  triggerSource?: "driverTargeting";
}

export interface Appeal {
  id: string;
  driverId: string;
  incentiveId: string;
  disqualificationId: string;
  driverText: string;
  status: "pending" | "approved" | "denied";
  managerReason?: string;
  createdAt: string;
  resolvedAt?: string;
}

// -----------------------------------------------------------------------------
// STORAGE KEYS  (parallel to Manager P-12)
// -----------------------------------------------------------------------------

export const DISQUALIFICATIONS_STORAGE_KEY =
  "wingz-incentives:disqualifications:v6";
export const APPEALS_STORAGE_KEY = "wingz-incentives:appeals:v6";
/**
 * App-I-7 (future) — `wingz-incentives:appeal-acks:v1` will store the
 * set of `appealId`s the driver has acknowledged (so the result dialog
 * doesn't re-show). Declared here for visibility; not used in App-I-6.
 */
export const APPEAL_ACKS_STORAGE_KEY = "wingz-incentives:appeal-acks:v1";

// -----------------------------------------------------------------------------
// TRIGGERING TRIP SNAPSHOTS  (App-side display enrichment)
// -----------------------------------------------------------------------------

/**
 * Denormalized trip context for the Missed Out tab card. Keeps the
 * `Disqualification` type identical to Manager's shape while still
 * letting the App render rich row content without a separate join.
 *
 * Keyed by `Disqualification.triggeringTripId`. Real seed trip IDs
 * (`CURRENT-COMP-001` etc.) are looked up via `seedTrips` in
 * `getTriggeringTripSnapshot()`; synthetic IDs land here directly.
 */
export interface TriggeringTripSnapshot {
  date: string; // human-readable, e.g. "May 8, 2026"
  pickup: string; // city/county summary, e.g. "Fulton — 401 W Peachtree St"
  dropoff: string; // city/county summary, e.g. "DeKalb — Decatur Sq Mall"
  pickupTime?: string; // optional, e.g. "8:42 AM"
}

/**
 * Snapshots for synthetic triggering trips referenced in `seedDisqualifications`.
 * Real seed trip IDs (`CURRENT-COMP-*`, `COMP-2023-*`) are resolved
 * against `seedTrips` at lookup time instead.
 */
export const seedTriggeringTripSnapshots: Record<string, TriggeringTripSnapshot> =
  {
    "trip-dq-001": {
      date: "May 10, 2026",
      pickup: "Fulton — 2800 Peachtree St NW",
      dropoff: "Fulton — 1180 W Peachtree St",
      pickupTime: "8:42 AM",
    },
    "trip-dq-002": {
      date: "May 8, 2026",
      pickup: "DeKalb — 2954 Clairmont Ave",
      dropoff: "Fulton — 401 W Peachtree St",
      pickupTime: "4:17 PM",
    },
    "trip-dq-003": {
      date: "May 6, 2026",
      pickup: "Fulton — Hartsfield-Jackson Terminal C",
      dropoff: "Fulton — 3900 Peachtree Rd",
      pickupTime: "9:55 AM",
    },
    "trip-dq-004": {
      date: "May 4, 2026",
      pickup: "Fulton — 100 Peachtree St NE",
      dropoff: "Fulton — 2954 Clairmont Ave",
      pickupTime: "10:31 AM",
    },
    "trip-dq-005": {
      date: "May 9, 2026",
      pickup: "Fulton — 1180 Peachtree St NE",
      dropoff: "Fulton — 1050 Peachtree St NE",
      pickupTime: "2:14 PM",
    },
    "trip-dq-006": {
      date: "May 7, 2026",
      pickup: "DeKalb — 2000 W Peachtree St",
      dropoff: "Fulton — 100 Peachtree St NE",
      pickupTime: "11:22 AM",
    },
    "trip-dq-007": {
      date: "May 5, 2026",
      pickup: "Fulton — 3355 Lenox Rd NE",
      dropoff: "Fulton — 225 Peachtree St NE",
      pickupTime: "1:48 PM",
    },
    "trip-dq-008": {
      date: "May 2, 2026",
      pickup: "Fulton — 401 W Peachtree St",
      dropoff: "Cobb — Cumberland Mall",
      pickupTime: "3:05 PM",
    },
    "trip-dq-009": {
      date: "Apr 30, 2026",
      pickup: "Fulton — 2800 Peachtree St NW",
      dropoff: "Fulton — Buckhead Plaza",
      pickupTime: "7:21 AM",
    },
    "trip-dq-010": {
      date: "Apr 28, 2026",
      pickup: "Fulton — Midtown Station",
      dropoff: "DeKalb — Emory Hospital",
      pickupTime: "5:50 PM",
    },
  };

// -----------------------------------------------------------------------------
// SEED DATA  (10 disqualifications + 6 appeals, all for currentDriver)
// -----------------------------------------------------------------------------
//
// Distribution mirrors Manager P-12 reason mix (4 OTP + 4 Sendbacks +
// 2 Days Since Last Activity), remapped to:
//   - driverId: 'driver-7821' (App's currentDriver)
//   - incentiveId: App's id space (`inc-pp-001`, `inc-wg-001`, etc.)
//   - triggeringTripId: mix of real seed trips + synthetic trip-dq-XXX
//     IDs whose context lives in `seedTriggeringTripSnapshots` above.
//
// Appeal status mix mirrors Manager P-12: 2 pending + 1 approved (silent
// — no managerReason) + 2 denied (with realistic managerReason) + 1
// pending OTP demo case.

const CURRENT_DRIVER_ID = "driver-7821";

export const seedDisqualifications: Disqualification[] = [
  // --- OTP-related (4) ---
  {
    id: "dq-001",
    driverId: CURRENT_DRIVER_ID,
    incentiveId: "inc-pp-001", // Peak Performer
    triggeringTripId: "trip-dq-001",
    failedRule: {
      type: "otpPercent",
      params: { thresholdPct: 95, windowDays: 30 },
    },
    computedValues: { observed: 92, threshold: 95, unit: "%" },
    createdAt: "2026-05-10T15:07:00.000Z",
    triggerSource: "driverTargeting",
  },
  {
    id: "dq-002",
    driverId: CURRENT_DRIVER_ID,
    incentiveId: "inc-pp-001", // Peak Performer
    triggeringTripId: "trip-dq-002",
    failedRule: {
      type: "otpPercent",
      params: { thresholdPct: 95, windowDays: 30 },
    },
    computedValues: { observed: 89, threshold: 95, unit: "%" },
    createdAt: "2026-05-08T19:20:00.000Z",
    triggerSource: "driverTargeting",
  },
  {
    id: "dq-003",
    driverId: CURRENT_DRIVER_ID,
    incentiveId: "inc-wg-001", // White Glove
    triggeringTripId: "trip-dq-003",
    failedRule: {
      type: "otpPercent",
      params: { thresholdPct: 98, windowDays: 30 },
    },
    computedValues: { observed: 94, threshold: 98, unit: "%" },
    createdAt: "2026-05-06T08:55:00.000Z",
    triggerSource: "driverTargeting",
  },
  {
    id: "dq-004",
    driverId: CURRENT_DRIVER_ID,
    incentiveId: "inc-ww-001", // Weekend Warrior
    triggeringTripId: "trip-dq-004",
    failedRule: {
      type: "otpPercent",
      params: { thresholdPct: 90, windowDays: 30 },
    },
    computedValues: { observed: 87, threshold: 90, unit: "%" },
    createdAt: "2026-05-04T11:13:00.000Z",
    triggerSource: "driverTargeting",
  },

  // --- Sendbacks-related (4) ---
  {
    id: "dq-005",
    driverId: CURRENT_DRIVER_ID,
    incentiveId: "inc-hh-001", // Hometown Hero
    triggeringTripId: "trip-dq-005",
    failedRule: {
      type: "inAppSendbacksInWindow",
      params: { penalty: "both", maxCount: 2, windowDays: 30 },
    },
    computedValues: { observed: 3, threshold: 2, unit: "sendbacks" },
    createdAt: "2026-05-09T07:18:00.000Z",
    triggerSource: "driverTargeting",
  },
  {
    id: "dq-006",
    driverId: CURRENT_DRIVER_ID,
    incentiveId: "inc-hh-001", // Hometown Hero
    triggeringTripId: "trip-dq-006",
    failedRule: {
      type: "inAppSendbacksInWindow",
      params: { penalty: "penalty", maxCount: 1, windowDays: 30 },
    },
    computedValues: { observed: 2, threshold: 1, unit: "sendbacks" },
    createdAt: "2026-05-07T13:42:00.000Z",
    triggerSource: "driverTargeting",
  },
  {
    id: "dq-007",
    driverId: CURRENT_DRIVER_ID,
    incentiveId: "inc-qw-001", // Quick Wins
    triggeringTripId: "trip-dq-007",
    failedRule: {
      type: "inAppSendbacksInWindow",
      params: { penalty: "both", maxCount: 3, windowDays: 30 },
    },
    computedValues: { observed: 4, threshold: 3, unit: "sendbacks" },
    createdAt: "2026-05-05T16:31:00.000Z",
    triggerSource: "driverTargeting",
  },
  {
    id: "dq-008",
    driverId: CURRENT_DRIVER_ID,
    incentiveId: "inc-eb-001", // Early Bird
    triggeringTripId: "trip-dq-008",
    failedRule: {
      type: "inAppSendbacksInWindow",
      params: { penalty: "both", maxCount: 5, windowDays: 30 },
    },
    computedValues: { observed: 6, threshold: 5, unit: "sendbacks" },
    createdAt: "2026-05-02T09:48:00.000Z",
    triggerSource: "driverTargeting",
  },

  // --- Days Since Last Activity-related (2) ---
  {
    id: "dq-009",
    driverId: CURRENT_DRIVER_ID,
    incentiveId: "inc-sg-001", // Squad Goals
    triggeringTripId: "trip-dq-009",
    failedRule: {
      type: "daysSinceLastActivity",
      params: { max: 7 },
    },
    computedValues: { observed: 9, threshold: 7, unit: "days" },
    createdAt: "2026-04-30T18:05:00.000Z",
    triggerSource: "driverTargeting",
  },
  {
    id: "dq-010",
    driverId: CURRENT_DRIVER_ID,
    incentiveId: "inc-ls-001", // Loyalty Streak
    triggeringTripId: "trip-dq-010",
    failedRule: {
      type: "daysSinceLastActivity",
      params: { max: 14 },
    },
    computedValues: { observed: 18, threshold: 14, unit: "days" },
    createdAt: "2026-04-28T14:22:00.000Z",
    triggerSource: "driverTargeting",
  },
];

export const seedAppeals: Appeal[] = [
  // dq-001 (OTP, Peak Performer) → pending
  {
    id: "ap-001",
    driverId: CURRENT_DRIVER_ID,
    incentiveId: "inc-pp-001",
    disqualificationId: "dq-001",
    driverText:
      "Two of my late pickups last week were stuck in I-285 traffic from a multi-car accident — well outside my control. The other late pickup was a wheelchair-assist trip that needed extra prep time and the rider signed off on it.",
    status: "pending",
    createdAt: "2026-05-10T15:30:00.000Z",
  },
  // dq-003 (OTP, White Glove) → approved (silent — no managerReason)
  {
    id: "ap-002",
    driverId: CURRENT_DRIVER_ID,
    incentiveId: "inc-wg-001",
    disqualificationId: "dq-003",
    driverText:
      "Two of the late pickups were dispatch reassignments mid-route. The system gave me 4 minutes to reach a pickup 9 minutes away.",
    status: "approved",
    createdAt: "2026-05-06T09:10:00.000Z",
    resolvedAt: "2026-05-08T11:42:00.000Z",
  },
  // dq-005 (Sendbacks, Hometown Hero) → denied (with managerReason)
  {
    id: "ap-003",
    driverId: CURRENT_DRIVER_ID,
    incentiveId: "inc-hh-001",
    disqualificationId: "dq-005",
    driverText:
      "All three sendbacks were rider no-shows after the 5-minute wait. The app marked them as sendbacks but they weren't refusals on my end.",
    status: "denied",
    managerReason:
      "Reviewed the trip logs — two of the three sendbacks pre-date the 5-minute no-show policy you cited. Sendback count stands. Future no-show trips will route through the new policy flow.",
    createdAt: "2026-05-09T07:55:00.000Z",
    resolvedAt: "2026-05-10T13:18:00.000Z",
  },
  // dq-007 (Sendbacks, Quick Wins) → denied (with managerReason)
  {
    id: "ap-004",
    driverId: CURRENT_DRIVER_ID,
    incentiveId: "inc-qw-001",
    disqualificationId: "dq-007",
    driverText:
      "One sendback was an address error in the trip details — the rider was at a different address.",
    status: "denied",
    managerReason:
      "Address error noted — that one was credited back to your sendback count last week. The remaining three sendbacks are within the standard window and exceed the cap. No further adjustment.",
    createdAt: "2026-05-05T17:02:00.000Z",
    resolvedAt: "2026-05-06T10:24:00.000Z",
  },
  // dq-009 (Days Since Last Activity, Squad Goals) → pending
  {
    id: "ap-005",
    driverId: CURRENT_DRIVER_ID,
    incentiveId: "inc-sg-001",
    disqualificationId: "dq-009",
    driverText:
      "I was on approved medical leave 4/22 - 4/29. My HR notice should be in the system. Resuming this week.",
    status: "pending",
    createdAt: "2026-04-30T19:00:00.000Z",
  },
  // dq-002 (OTP, Peak Performer) → pending — popular OTP demo case
  {
    id: "ap-006",
    driverId: CURRENT_DRIVER_ID,
    incentiveId: "inc-pp-001",
    disqualificationId: "dq-002",
    driverText:
      "The Tuesday morning pickups got hit with construction delays on Peachtree — pickup ETAs shifted by 10+ minutes for all trips that morning. I'd like the OTP window recalculated excluding 5/06 if possible.",
    status: "pending",
    createdAt: "2026-05-08T19:55:00.000Z",
  },
];

// -----------------------------------------------------------------------------
// Idempotency key (parallel to Manager P-12 helper, for future App-side
// disqualification creation — App-I-6 doesn't use it directly)
// -----------------------------------------------------------------------------

export function disqualificationDedupeKey(
  driverId: string,
  incentiveId: string,
  failedRuleType: DriverTargetingType,
): string {
  return `${driverId}|${incentiveId}|${failedRuleType}`;
}

/** Convenience: which IncentiveType corresponds to an incentive ID. Used
 *  by the history view to look up trip-side incentive matches for the
 *  Counted tab. Returns `undefined` if the id isn't in the App's seed. */
export function incentiveTypeForId(
  incentiveId: string,
  defs: Array<{ id: string; type: IncentiveType }>,
): IncentiveType | undefined {
  return defs.find((d) => d.id === incentiveId)?.type;
}
