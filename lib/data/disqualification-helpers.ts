// App-I-6 (Resume Wave, 2026-05-12) — Helpers + persistence hook for the
// Disqualification + Appeal subsystem. Mirrors Manager-side P-12 read
// patterns; the App writes appeals in App-I-7 via the same hook.
//
// State model: lightweight client-side hook (`useDisqualificationsState`)
// rather than a full React context, since only the per-incentive history
// view + (future) dispute sheet consume these collections. If usage
// surfaces broaden, promote to context in App-I-7.

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  APPEALS_STORAGE_KEY,
  DISQUALIFICATIONS_STORAGE_KEY,
  seedAppeals,
  seedDisqualifications,
  seedTriggeringTripSnapshots,
  type Appeal,
  type Disqualification,
  type DriverTargetingType,
  type TriggeringTripSnapshot,
} from "./disqualifications";
import { currentDriver, seedTrips, type Trip } from "./incentives";

// -----------------------------------------------------------------------------
// PURE HELPERS  (no React deps — usable in components + tests)
// -----------------------------------------------------------------------------

/** Filter the disqualifications collection by `(driverId, incentiveId)`. */
export function getDisqualificationsFor(
  disqualifications: Disqualification[],
  driverId: string,
  incentiveId: string,
): Disqualification[] {
  return disqualifications.filter(
    (d) => d.driverId === driverId && d.incentiveId === incentiveId,
  );
}

/** Find the appeal (if any) associated with a disqualification id. */
export function getAppealForDisqualification(
  appeals: Appeal[],
  disqualificationId: string,
): Appeal | undefined {
  return appeals.find((a) => a.disqualificationId === disqualificationId);
}

/**
 * Render the reason copy shown on a Missed Out card from a
 * disqualification's `failedRule` + `computedValues`. Branches on the
 * 3 reason types covered by v1 seed (OTP, Sendbacks, Days Since Last
 * Activity); falls back to a generic copy for any of the other
 * targeting types if they ever surface.
 */
export function formatDisqualificationReason(d: Disqualification): string {
  const { failedRule, computedValues } = d;
  const obs = computedValues.observed;
  const thr = computedValues.threshold;

  switch (failedRule.type) {
    case "otpPercent": {
      return `OTP dropped to ${obs}% — required ${thr}%.`;
    }
    case "inAppSendbacksInWindow": {
      const windowDays =
        typeof failedRule.params.windowDays === "number"
          ? (failedRule.params.windowDays as number)
          : 30;
      return `Sendbacks hit ${obs} in ${windowDays} days — cap was ${thr}.`;
    }
    case "daysSinceLastActivity": {
      return `${obs} days since last activity — required ≤ ${thr} days.`;
    }
    case "tripsCompletedInWindow": {
      const windowDays =
        typeof failedRule.params.windowDays === "number"
          ? (failedRule.params.windowDays as number)
          : 30;
      return `Only ${obs} trips in the last ${windowDays} days — needed ${thr}.`;
    }
    case "addressCounty": {
      return `Driver address no longer matches the eligible county set.`;
    }
    case "tenureDays": {
      return `Tenure ${obs} days — required ${thr} days.`;
    }
  }
}

/**
 * Short label for the reason chip (alongside the "Disqualified" badge
 * on the Missed Out card). Lighter than `formatDisqualificationReason`.
 */
export function formatDisqualificationLabel(type: DriverTargetingType): string {
  switch (type) {
    case "otpPercent":
      return "OTP";
    case "inAppSendbacksInWindow":
      return "Sendbacks";
    case "daysSinceLastActivity":
      return "Inactivity";
    case "tripsCompletedInWindow":
      return "Trip count";
    case "addressCounty":
      return "Address";
    case "tenureDays":
      return "Tenure";
  }
}

/**
 * Resolve the triggering-trip context for a disqualification. Real seed
 * trips win first (App's `CURRENT-COMP-*` IDs); synthetic IDs fall back
 * to `seedTriggeringTripSnapshots`. Returns `null` if neither source has
 * a match — callers should render a minimal fallback row in that case.
 */
export function getTriggeringTripSnapshot(
  triggeringTripId: string,
): TriggeringTripSnapshot | null {
  const real = seedTrips.find((t: Trip) => t.id === triggeringTripId);
  if (real) {
    const pickupLeg = real.legs[0];
    const dropoffLeg = real.legs[real.legs.length - 1];
    const pickup = pickupLeg
      ? `${pickupLeg.county} — ${pickupLeg.address}`
      : "—";
    const dropoff = dropoffLeg
      ? `${dropoffLeg.county} — ${dropoffLeg.address}`
      : "—";
    return {
      date: real.date,
      pickup,
      dropoff,
      pickupTime: real.pickupTime,
    };
  }
  return seedTriggeringTripSnapshots[triggeringTripId] ?? null;
}

// -----------------------------------------------------------------------------
// PERSISTENCE HOOK
// -----------------------------------------------------------------------------
//
// Hydrate-from-localStorage on mount with seed fallback when keys absent.
// Persist on every mutation. Mirrors Manager P-12's pattern but lighter:
// pure client-side hook, no context provider, no SSR/CSR mismatch flag
// (the consuming view component handles "loading" by showing a brief
// fallback before hydration resolves).

interface UseDisqualificationsStateValue {
  /** True once the localStorage value has been loaded. */
  isHydrated: boolean;
  disqualifications: Disqualification[];
  appeals: Appeal[];

  /**
   * Create a new pending appeal. App-I-7 wires this from the dispute
   * sheet's Submit handler. App-I-6 doesn't call it directly but
   * exports it for the App-I-7 hookup.
   */
  createAppeal: (input: {
    driverId: string;
    incentiveId: string;
    disqualificationId: string;
    driverText: string;
  }) => Appeal;

  /**
   * Resolve an appeal (App-I-7 won't directly call — Manager side handles
   * this via P-13b). Exported here for parity + dev testing.
   */
  setAppealStatus: (
    appealId: string,
    status: "approved" | "denied",
    managerReason?: string,
  ) => void;

  /** Mark a disqualification as resolved (paired with approve from Manager). */
  resolveDisqualification: (disqualificationId: string) => void;

  /** Dev-only — wipe both collections. */
  clearAllAppeals: () => void;
}

/** Validate a JSON-deserialized Disqualification row; reject malformed. */
function migrateDisqualification(raw: unknown): Disqualification | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.id !== "string") return null;
  if (typeof obj.driverId !== "string") return null;
  if (typeof obj.incentiveId !== "string") return null;
  if (typeof obj.triggeringTripId !== "string") return null;
  if (!obj.failedRule || typeof obj.failedRule !== "object") return null;
  if (!obj.computedValues || typeof obj.computedValues !== "object")
    return null;
  if (typeof obj.createdAt !== "string") return null;
  return obj as unknown as Disqualification;
}

/** Validate a JSON-deserialized Appeal row; reject malformed. */
function migrateAppeal(raw: unknown): Appeal | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.id !== "string") return null;
  if (typeof obj.driverId !== "string") return null;
  if (typeof obj.incentiveId !== "string") return null;
  if (typeof obj.disqualificationId !== "string") return null;
  if (typeof obj.driverText !== "string") return null;
  if (
    obj.status !== "pending" &&
    obj.status !== "approved" &&
    obj.status !== "denied"
  )
    return null;
  if (typeof obj.createdAt !== "string") return null;
  return obj as unknown as Appeal;
}

function generateAppealId(): string {
  return `ap-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

export function useDisqualificationsState(): UseDisqualificationsStateValue {
  const [disqualifications, setDisqualifications] = useState<Disqualification[]>(
    seedDisqualifications,
  );
  const [appeals, setAppeals] = useState<Appeal[]>(seedAppeals);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage on mount. Key absent → keep seed; key
  // present (including the legitimate empty `[]` state from
  // `clearAllAppeals`) → trust stored payload. Corrupted payloads
  // silently fall back to seed.
  useEffect(() => {
    try {
      const rawDq = window.localStorage.getItem(DISQUALIFICATIONS_STORAGE_KEY);
      if (rawDq) {
        const parsed = JSON.parse(rawDq) as unknown[];
        if (Array.isArray(parsed)) {
          const migrated = parsed
            .map(migrateDisqualification)
            .filter((d): d is Disqualification => d !== null);
          setDisqualifications(migrated);
        }
      }
    } catch {
      // Corrupted disqualifications payload — fall back to seed.
    }

    try {
      const rawAp = window.localStorage.getItem(APPEALS_STORAGE_KEY);
      if (rawAp) {
        const parsed = JSON.parse(rawAp) as unknown[];
        if (Array.isArray(parsed)) {
          const migrated = parsed
            .map(migrateAppeal)
            .filter((a): a is Appeal => a !== null);
          setAppeals(migrated);
        }
      }
    } catch {
      // Corrupted appeals payload — fall back to seed.
    }

    setIsHydrated(true);
  }, []);

  // Persist on every change after hydration.
  useEffect(() => {
    if (!isHydrated) return;
    try {
      window.localStorage.setItem(
        DISQUALIFICATIONS_STORAGE_KEY,
        JSON.stringify(disqualifications),
      );
    } catch {
      // localStorage unavailable / quota — silently drop.
    }
  }, [disqualifications, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    try {
      window.localStorage.setItem(APPEALS_STORAGE_KEY, JSON.stringify(appeals));
    } catch {
      // localStorage unavailable / quota — silently drop.
    }
  }, [appeals, isHydrated]);

  const createAppeal = useCallback<
    UseDisqualificationsStateValue["createAppeal"]
  >((input) => {
    const created: Appeal = {
      id: generateAppealId(),
      driverId: input.driverId,
      incentiveId: input.incentiveId,
      disqualificationId: input.disqualificationId,
      driverText: input.driverText,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    setAppeals((prev) => [...prev, created]);
    return created;
  }, []);

  const setAppealStatus = useCallback<
    UseDisqualificationsStateValue["setAppealStatus"]
  >((appealId, status, managerReason) => {
    setAppeals((prev) =>
      prev.map((a) => {
        if (a.id !== appealId) return a;
        const next: Appeal = {
          ...a,
          status,
          resolvedAt: new Date().toISOString(),
        };
        if (status === "denied" && managerReason != null) {
          next.managerReason = managerReason;
        } else if (status === "approved") {
          delete next.managerReason;
        }
        return next;
      }),
    );
  }, []);

  const resolveDisqualification = useCallback<
    UseDisqualificationsStateValue["resolveDisqualification"]
  >((disqualificationId) => {
    setDisqualifications((prev) =>
      prev.map((d) =>
        d.id === disqualificationId ? { ...d, resolved: true } : d,
      ),
    );
  }, []);

  const clearAllAppeals = useCallback<
    UseDisqualificationsStateValue["clearAllAppeals"]
  >(() => {
    setDisqualifications([]);
    setAppeals([]);
  }, []);

  return useMemo(
    () => ({
      isHydrated,
      disqualifications,
      appeals,
      createAppeal,
      setAppealStatus,
      resolveDisqualification,
      clearAllAppeals,
    }),
    [
      isHydrated,
      disqualifications,
      appeals,
      createAppeal,
      setAppealStatus,
      resolveDisqualification,
      clearAllAppeals,
    ],
  );
}

// -----------------------------------------------------------------------------
// VIEW-MODEL HELPERS
// -----------------------------------------------------------------------------

/**
 * Build the Counted-tab list for a given incentive. Combines (a)
 * completed seed trips matching the incentive's type + (b) the
 * triggering trips of any APPROVED appeals (those rides get restored
 * after a Manager approval per Phase B sign-off "Approved appeals
 * trip moves to Counted tab automatically"). De-dupes by trip id.
 */
export interface CountedTripRow {
  tripId: string;
  date: string;
  pickup: string;
  dropoff: string;
  pickupTime?: string;
  bonusContribution: number;
  restoredFromAppeal?: boolean;
}

export function buildCountedTripRows(opts: {
  incentiveType: string;
  incentiveId: string;
  driverId: string;
  bonusAmount: number;
  goalCount: number;
  disqualifications: Disqualification[];
  appeals: Appeal[];
}): CountedTripRow[] {
  const {
    incentiveType,
    incentiveId,
    driverId,
    bonusAmount,
    goalCount,
    disqualifications,
    appeals,
  } = opts;

  // Per-trip bonus contribution = bonus / goalCount (binary completion in v1,
  // but the row needs a "what this trip is worth toward the goal" number
  // for the simple-list pattern).
  const perTripContribution =
    goalCount > 0 ? Number((bonusAmount / goalCount).toFixed(2)) : bonusAmount;

  // (a) seed-trip path
  const seedMatches = seedTrips
    .filter(
      (t) =>
        t.status === "completed" &&
        t.incentiveTypes.includes(incentiveType as never),
    )
    .map<CountedTripRow>((t) => {
      const pickupLeg = t.legs[0];
      const dropoffLeg = t.legs[t.legs.length - 1];
      return {
        tripId: t.id,
        date: t.date,
        pickup: pickupLeg
          ? `${pickupLeg.county} — ${pickupLeg.address}`
          : "—",
        dropoff: dropoffLeg
          ? `${dropoffLeg.county} — ${dropoffLeg.address}`
          : "—",
        pickupTime: t.pickupTime,
        bonusContribution: perTripContribution,
      };
    });

  // (b) approved-appeal trips — pull their triggeringTripId + render from
  // the snapshot table (or seedTrips if real).
  const approvedAppeals = appeals.filter(
    (a) =>
      a.driverId === driverId &&
      a.incentiveId === incentiveId &&
      a.status === "approved",
  );
  const restored: CountedTripRow[] = approvedAppeals
    .map((a) => {
      const dq = disqualifications.find((d) => d.id === a.disqualificationId);
      if (!dq) return null;
      const snap = getTriggeringTripSnapshot(dq.triggeringTripId);
      if (!snap) return null;
      const row: CountedTripRow = {
        tripId: dq.triggeringTripId,
        date: snap.date,
        pickup: snap.pickup,
        dropoff: snap.dropoff,
        pickupTime: snap.pickupTime,
        bonusContribution: perTripContribution,
        restoredFromAppeal: true,
      };
      return row;
    })
    .filter((r): r is CountedTripRow => r !== null);

  // De-dupe (seed may overlap with restored — restored wins so the badge surfaces).
  const merged = new Map<string, CountedTripRow>();
  for (const row of seedMatches) merged.set(row.tripId, row);
  for (const row of restored) merged.set(row.tripId, row); // overwrite if both
  return Array.from(merged.values());
}

/**
 * Build the Missed Out list. Excludes disqualifications whose appeal
 * has been approved (those rides move to Counted). Sorts by createdAt
 * desc so newest disqualifications surface first.
 */
export interface MissedOutTripRow {
  disqualificationId: string;
  triggeringTripId: string;
  date: string;
  pickup: string;
  dropoff: string;
  pickupTime?: string;
  reason: string;
  reasonLabel: string;
  appealState: "no-appeal" | "pending" | "denied";
  managerReason?: string;
  driverText?: string;
}

export function buildMissedOutRows(opts: {
  driverId: string;
  incentiveId: string;
  disqualifications: Disqualification[];
  appeals: Appeal[];
}): MissedOutTripRow[] {
  const { driverId, incentiveId, disqualifications, appeals } = opts;
  const rows: MissedOutTripRow[] = [];

  for (const d of getDisqualificationsFor(
    disqualifications,
    driverId,
    incentiveId,
  )) {
    const appeal = getAppealForDisqualification(appeals, d.id);
    if (appeal?.status === "approved") continue; // moved to Counted

    const snap = getTriggeringTripSnapshot(d.triggeringTripId);
    rows.push({
      disqualificationId: d.id,
      triggeringTripId: d.triggeringTripId,
      date: snap?.date ?? "—",
      pickup: snap?.pickup ?? "Trip context unavailable",
      dropoff: snap?.dropoff ?? "—",
      pickupTime: snap?.pickupTime,
      reason: formatDisqualificationReason(d),
      reasonLabel: formatDisqualificationLabel(d.failedRule.type),
      appealState: appeal == null ? "no-appeal" : appeal.status === "pending" ? "pending" : "denied",
      managerReason: appeal?.managerReason,
      driverText: appeal?.driverText,
    });
  }

  return rows.sort((a, b) => {
    const aT =
      disqualifications.find((d) => d.id === a.disqualificationId)?.createdAt ??
      "";
    const bT =
      disqualifications.find((d) => d.id === b.disqualificationId)?.createdAt ??
      "";
    return bT.localeCompare(aT);
  });
}

/** Convenience re-export for view components. */
export const CURRENT_DRIVER_ID = currentDriver.id;
