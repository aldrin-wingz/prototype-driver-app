// -----------------------------------------------------------------------------
// WALLET + PAYOUT TRANSACTIONS DATA LAYER  (v2 prototype — all mock)
//
// Powers the Wingz Wallet (dashboard + payout-portal strip), the Instant Payout
// flow, and the payout portal's three transaction logs (Trip Revenue /
// Incentives / Penalties).
//
// Design decisions (locked 2026-06-17):
//   - The wallet balance is a SEPARATE accumulating available-to-cash-out
//     number (not tied to one pay period). Instant Payout draws it down.
//   - The portal's per-period "Earned" total = revenue + incentives − penalties,
//     computed from the transaction lines below so the hero always matches the
//     sum of what's displayed.
// -----------------------------------------------------------------------------

import {
  mockRequestTrips,
  mockUpcomingTrips,
  mockNeedsActionTrips,
  mockInProgressTrips,
  mockCompletedTrips,
  type Trip,
} from "@/lib/driver-data/mock-trips";
import { PAY_PERIODS, PAYOUT_PERIOD_SUMMARIES } from "@/lib/data/payout";
import { getMultipleIncentiveProgressInfo } from "@/lib/data/incentive-utils";

// -----------------------------------------------------------------------------
// WALLET BALANCE + BANK ACCOUNTS
// -----------------------------------------------------------------------------

/** Mock available-to-cash-out balance. The UI keeps a local copy it can draw
 *  down during the Instant Payout flow (prototype — not persisted). */
export const WALLET_BALANCE = 1240.5;

export interface BankAccount {
  id: string;
  bankName: string;
  last4: string;
  isDefault: boolean;
}

export const BANK_ACCOUNTS: BankAccount[] = [
  { id: "ba-chase", bankName: "Chase", last4: "4821", isDefault: true },
  { id: "ba-wells", bankName: "Wells Fargo", last4: "3390", isDefault: false },
];

// -----------------------------------------------------------------------------
// PENALTIES (sent-back trips)
// -----------------------------------------------------------------------------

/** A penalty applied for sending a trip back within 24h of pickup.
 *  `tripId` references a real trip in mock-trips so the row can deep-link to
 *  the ride detail (which shows the sent-back banner). */
export interface PenaltyRecord {
  id: string;
  tripId: string;
  amount: number; // positive magnitude; rendered as a negative on the line
  reason: string;
  appliedDate: string;
  periodId: string;
}

export const PENALTY_RECORDS: PenaltyRecord[] = [
  {
    id: "pen-001",
    tripId: "REQ-WW-001",
    amount: 25,
    reason: "Sent back < 24 hrs before pickup",
    appliedDate: "Wed, Apr 30, 2026",
    periodId: "period-2026-04-28",
  },
  {
    id: "pen-002",
    tripId: "REQ-EB-001",
    amount: 10,
    reason: "Sent back < 24 hrs before pickup",
    appliedDate: "Thu, May 1, 2026",
    periodId: "period-2026-04-28",
  },
];

export function getPenaltyForTrip(tripId: string): PenaltyRecord | undefined {
  return PENALTY_RECORDS.find((p) => p.tripId === tripId);
}

// -----------------------------------------------------------------------------
// UNIFIED PAYOUT TRANSACTION LINES
// -----------------------------------------------------------------------------

export type PayoutTxnType = "revenue" | "incentive" | "penalty";

export interface PayoutTxn {
  id: string;
  type: PayoutTxnType;
  date: string;
  label: string; // rider name / incentive title / sent-back rider
  sublabel?: string; // client / "Incentive earned" / penalty reason
  /** Signed amount: positive for revenue + incentives, negative for penalties.
   *  Revenue is the trip's flat total (any trip bonus is already baked in). */
  amount: number;
  linkTargetType: "trip" | "incentive";
  linkTargetId: string; // trip id (revenue/penalty) or incentive id (incentive)
  /** Incentives only: whether the program has actually been earned (vs projected). */
  earned?: boolean;
}

export interface PayoutTransactions {
  revenue: PayoutTxn[];
  incentives: PayoutTxn[];
  penalties: PayoutTxn[];
  revenueTotal: number;
  incentivesTotal: number;
  penaltiesTotal: number; // positive magnitude
  /** Net "Earned" total shown in the portal hero. */
  earnedTotal: number;
}

const ALL_TRIPS: Trip[] = [
  ...mockRequestTrips,
  ...mockUpcomingTrips,
  ...mockNeedsActionTrips,
  ...mockInProgressTrips,
  ...mockCompletedTrips,
];

function findTrip(id: string): Trip | undefined {
  return ALL_TRIPS.find((t) => t.id === id);
}

/**
 * Assemble the three transaction logs for a pay period from existing data:
 *   - revenue:    completed trips (PAYOUT_PERIOD_SUMMARIES.completedTripIds) → totalRevenue
 *   - incentives: contributing programs (programIdsContributing) → bonusAmount
 *   - penalties:  PenaltyRecord[] for this period → −amount
 */
export function getPayoutTransactions(periodId: string): PayoutTransactions {
  const summary = PAYOUT_PERIOD_SUMMARIES.find((s) => s.periodId === periodId);
  const period = PAY_PERIODS.find((p) => p.id === periodId);
  const incentiveDate = period?.endDate ?? "";

  const revenue: PayoutTxn[] = (summary?.completedTripIds ?? [])
    .map((id) => findTrip(id))
    .filter((t): t is Trip => Boolean(t))
    .map((t) => ({
      id: `rev-${t.id}`,
      type: "revenue" as const,
      date: t.date,
      label: t.rider,
      sublabel: t.client,
      amount: t.totalRevenue,
      linkTargetType: "trip" as const,
      linkTargetId: t.id,
    }));

  // A closed week (in-balance / paid) means its incentives are earned — only an
  // open ("earning") week can still hold a projected incentive.
  const periodClosed = (period?.lifecycle ?? "earning") !== "earning";
  const incentives: PayoutTxn[] = getMultipleIncentiveProgressInfo(
    summary?.programIdsContributing ?? []
  ).map((p) => {
    const earned = periodClosed || p.isComplete;
    return {
      id: `inc-${p.incentiveId}`,
      type: "incentive" as const,
      date: incentiveDate,
      label: p.name,
      sublabel: earned ? "Incentive earned" : "Incentive (projected)",
      amount: p.bonusAmount,
      linkTargetType: "incentive" as const,
      linkTargetId: p.incentiveId,
      earned,
    };
  });

  const penalties: PayoutTxn[] = PENALTY_RECORDS.filter(
    (p) => p.periodId === periodId
  ).map((p) => {
    const t = findTrip(p.tripId);
    return {
      id: p.id,
      type: "penalty" as const,
      date: p.appliedDate,
      label: t?.rider ?? "Sent-back trip",
      sublabel: p.reason,
      amount: -Math.abs(p.amount),
      linkTargetType: "trip" as const,
      linkTargetId: p.tripId,
    };
  });

  const revenueTotal = revenue.reduce((s, t) => s + t.amount, 0);
  const incentivesTotal = incentives.reduce((s, t) => s + t.amount, 0);
  const penaltiesTotal = penalties.reduce((s, t) => s + Math.abs(t.amount), 0);

  return {
    revenue,
    incentives,
    penalties,
    revenueTotal,
    incentivesTotal,
    penaltiesTotal,
    earnedTotal: revenueTotal + incentivesTotal - penaltiesTotal,
  };
}

// -----------------------------------------------------------------------------
// BALANCE SUMMARY (for the dashboard + portal Balance surfaces)
// -----------------------------------------------------------------------------

export interface BalanceSummary {
  /** Amount currently in the driver's Balance, scheduled for the next payout. */
  balance: number;
  /** The Monday the balance deposits, e.g. 'Mon, Jun 29'. */
  nextPayoutDate: string;
  /** The work week that earned this balance, e.g. 'Jun 15 – Jun 21'. */
  earnedWeekLabel: string;
  periodId: string;
}

/** Today's running tally (mock) — for the Uber-style summary's "Today" card. */
export const TODAY_SUMMARY = { earnings: 84.5, trips: 2 };

// -----------------------------------------------------------------------------
// PAYOUT ACTIVITY (for the Wallet screen — recent weeks + their status)
// -----------------------------------------------------------------------------

export type PayoutActivityStatus = "Paid" | "Scheduled" | "This week";

export interface PayoutActivityItem {
  periodId: string;
  weekLabel: string; // 'Jun 15 – Jun 21'
  amount: number; // earned total for the week
  status: PayoutActivityStatus;
  /** Sub-line, e.g. 'Paid Mon, Jun 15' / 'Pays Mon, Jun 29' / 'In progress'. */
  detail: string;
  /** The Monday the payout is/was deposited, e.g. 'Mon, Jun 29'. */
  payoutDate: string;
}

/**
 * The driver's current Balance = the week that's been credited (on its
 * Thursday) and is scheduled to deposit on the following Monday.
 */
export function getBalanceSummary(): BalanceSummary {
  const period =
    PAY_PERIODS.find((p) => p.lifecycle === "in-balance") ?? PAY_PERIODS[0];
  const { earnedTotal } = getPayoutTransactions(period.id);
  return {
    balance: earnedTotal,
    nextPayoutDate: period.payoutDate,
    earnedWeekLabel: `${period.startDate} – ${period.endDate}`,
    periodId: period.id,
  };
}

/**
 * Per-day trip-revenue for a week (Mon–Sun), derived from the period's
 * completed-trip dates — for the weekly bar chart.
 */
export function getDailyEarnings(periodId: string): { day: string; amount: number }[] {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const totals: Record<string, number> = Object.fromEntries(days.map((d) => [d, 0]));
  for (const t of getPayoutTransactions(periodId).revenue) {
    const weekday = t.date.slice(0, 3); // e.g. "Tue, Apr 28, 2026" → "Tue"
    if (weekday in totals) totals[weekday] += t.amount;
  }
  return days.map((d) => ({ day: d, amount: totals[d] }));
}

// -----------------------------------------------------------------------------
// EARNINGS ACTIVITY (Uber-style transaction feed for a week, grouped by day)
//
// Each earning event (a completed trip, an incentive, a sent-back penalty) is a
// rich row in a day-grouped feed. Wingz NEMT adaptations vs. a rideshare feed:
// no surge/"increased" badge, no tips, no online-time — just Trip Revenue (+),
// Incentives (+), and Penalties (−).
// -----------------------------------------------------------------------------

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface EarningsActivityItem {
  id: string;
  type: PayoutTxnType;
  /** Signed amount (positive revenue/incentive, negative penalty). */
  amount: number;
  /** Rider name (trip/penalty) or incentive title. */
  title: string;
  /** Secondary line: "Verida · 2 passengers" / "Incentive earned" / penalty reason. */
  meta: string;
  /** Pickup time, shown on the right (trips/penalties only). */
  timeLabel?: string;
  /** Route endpoints (trips/penalties only). */
  pickup?: string;
  dropoff?: string;
  /** Pre-computed deep-link target. */
  href: string;
}

export interface EarningsActivityDay {
  /** e.g. "Sat, Jun 20". */
  dateLabel: string;
  /** Day number, for newest-first ordering. */
  daySort: number;
  /** Net of the day's items (for an optional day total). */
  total: number;
  items: EarningsActivityItem[];
}

/**
 * Place an event on a real calendar day WITHIN the selected work week, derived
 * from its weekday — so the feed reads "Tue, Jun 16 / Sat, Jun 20" instead of
 * the underlying mock-trip dates. Matches the weekly bar chart's bucketing
 * (week start = Monday; no month rollover since a week stays within one month
 * for the June cadence).
 */
function inWeekDay(
  period: { startDate: string },
  weekdayPrefix: string
): { label: string; sort: number } {
  const startNum = parseInt(period.startDate.replace(/\D/g, ""), 10) || 1;
  const month = period.startDate.replace(/[\d\s]/g, "") || "";
  let idx = WEEKDAYS.indexOf(weekdayPrefix);
  if (idx < 0) idx = 6; // unknown weekday → end of week
  const dayNum = startNum + idx;
  return { label: `${WEEKDAYS[idx]}, ${month} ${dayNum}`, sort: dayNum };
}

/**
 * Day-grouped earnings activity for a week (newest day first). Revenue +
 * penalties carry route addresses + a pickup time; incentives are compact and
 * land on the last day of the week.
 */
export function getEarningsActivity(periodId: string): EarningsActivityDay[] {
  const period = PAY_PERIODS.find((p) => p.id === periodId) ?? PAY_PERIODS[0];
  const txns = getPayoutTransactions(periodId);

  type Internal = EarningsActivityItem & { _sort: number; _dateLabel: string };
  const items: Internal[] = [];

  for (const r of txns.revenue) {
    const t = findTrip(r.linkTargetId);
    const day = inWeekDay(period, (t?.date ?? "").slice(0, 3));
    const miles = (t?.distance ?? "").replace(/\s*away\s*$/i, "").trim();
    items.push({
      id: r.id,
      type: "revenue",
      amount: r.amount,
      title: r.label,
      meta: miles ? `${r.sublabel ?? "Trip"} · ${miles}` : (r.sublabel ?? "Trip"),
      timeLabel: t?.legs[0]?.time,
      pickup: t?.legs[0]?.address,
      dropoff: t?.legs[t.legs.length - 1]?.address,
      href: `/my-rides/${r.linkTargetId}`,
      _sort: day.sort,
      _dateLabel: day.label,
    });
  }

  for (const p of txns.penalties) {
    const t = findTrip(p.linkTargetId);
    const day = inWeekDay(period, (t?.date ?? "").slice(0, 3));
    items.push({
      id: p.id,
      type: "penalty",
      amount: p.amount,
      title: p.label,
      meta: p.sublabel ?? "Sent back late",
      timeLabel: t?.legs[0]?.time,
      pickup: t?.legs[0]?.address,
      dropoff: t?.legs[t.legs.length - 1]?.address,
      href: `/my-rides/${p.linkTargetId}?sentback=1`,
      _sort: day.sort,
      _dateLabel: day.label,
    });
  }

  for (const inc of txns.incentives) {
    if (!inc.earned) continue; // activity = accomplished incentives only (no projected)
    const day = inWeekDay(period, "Sun"); // credited at week close
    items.push({
      id: inc.id,
      type: "incentive",
      amount: inc.amount,
      title: inc.label,
      meta: inc.sublabel ?? "Incentive earned",
      href: `/incentives/${inc.linkTargetId}/rides`,
      _sort: day.sort,
      _dateLabel: day.label,
    });
  }

  const byDay = new Map<string, EarningsActivityDay>();
  for (const it of items) {
    const { _sort, _dateLabel, ...rest } = it;
    if (!byDay.has(_dateLabel)) {
      byDay.set(_dateLabel, { dateLabel: _dateLabel, daySort: _sort, total: 0, items: [] });
    }
    const bucket = byDay.get(_dateLabel)!;
    bucket.items.push(rest);
    bucket.total += rest.amount;
  }

  return [...byDay.values()].sort((a, b) => b.daySort - a.daySort);
}

/**
 * Per-day NET trip cash for a week (Mon–Sun): trip revenue minus penalties,
 * each bucketed by the underlying trip's weekday (matching the activity feed).
 * Can go negative on a day with a penalty and little/no revenue. Incentives are
 * deliberately excluded — they're a weekly bonus, not a single-day event — so
 * the weekly header = sum(daily net) + incentives.
 */
export function getDailyNet(periodId: string): { day: string; amount: number }[] {
  const totals: Record<string, number> = Object.fromEntries(WEEKDAYS.map((d) => [d, 0]));
  const txns = getPayoutTransactions(periodId);
  for (const r of txns.revenue) {
    const wk = r.date.slice(0, 3);
    if (wk in totals) totals[wk] += r.amount;
  }
  for (const p of txns.penalties) {
    const wk = (findTrip(p.linkTargetId)?.date ?? "").slice(0, 3); // penalty → trip's weekday
    if (wk in totals) totals[wk] += p.amount; // p.amount is already negative
  }
  return WEEKDAYS.map((d) => ({ day: d, amount: totals[d] }));
}

/** Recent weeks + their payout status, newest first (for the Wallet screen). */
export function getPayoutActivity(): PayoutActivityItem[] {
  return PAY_PERIODS.map((p) => {
    const { earnedTotal } = getPayoutTransactions(p.id);
    const status: PayoutActivityStatus =
      p.lifecycle === "paid"
        ? "Paid"
        : p.lifecycle === "in-balance"
          ? "Scheduled"
          : "This week";
    const detail =
      p.lifecycle === "paid"
        ? `Paid ${p.payoutDate}`
        : p.lifecycle === "in-balance"
          ? `Pays ${p.payoutDate}`
          : "In progress";
    return {
      periodId: p.id,
      weekLabel: `${p.startDate} – ${p.endDate}`,
      amount: earnedTotal,
      status,
      detail,
      payoutDate: p.payoutDate,
    };
  }).reverse();
}

/**
 * Bank payouts — money sent (or scheduled to be sent) to the driver's bank,
 * newest first. Excludes the in-progress "earning" week, which has no payout
 * yet (these are the actual deposits, not balance-add events).
 */
export function getBankTransactions(): PayoutActivityItem[] {
  return getPayoutActivity().filter((a) => a.status !== "This week");
}

/** A single bank payout by period id — for the Transaction Details page. */
export function getPayoutActivityItem(periodId: string): PayoutActivityItem | undefined {
  return getPayoutActivity().find((a) => a.periodId === periodId);
}
