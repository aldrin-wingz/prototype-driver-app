"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import type { IncentiveType } from "@/lib/data/incentives";

/** Tiers eligible for a "Tier Up" celebration. Bronze is excluded — drivers
 *  start at Bronze, so there's no level-up moment for it. */
export type TierUpTier = "silver" | "gold" | "platinum";

interface IncentiveEarnedContextValue {
  // ---- Incentive Earned popup ----
  /** The incentive currently being celebrated, or null if popup is closed. */
  activeIncentive: IncentiveType | null;
  /** Open the Incentive Earned popup for a given incentive. */
  showEarned: (type: IncentiveType) => void;

  // ---- Tier Up popup (sibling) ----
  /** The tier currently being celebrated as a "tier up" moment, or null. */
  activeTierUp: TierUpTier | null;
  /** Open the Tier Up popup for a given tier (silver | gold | platinum). */
  showTierUp: (tier: TierUpTier) => void;

  // ---- Shared ----
  /** Dismiss whichever popup is currently open. */
  dismiss: () => void;
}

const IncentiveEarnedContext = createContext<IncentiveEarnedContextValue | null>(null);

export function IncentiveEarnedProvider({ children }: { children: React.ReactNode }) {
  const [activeIncentive, setActiveIncentive] = useState<IncentiveType | null>(null);
  const [activeTierUp, setActiveTierUp] = useState<TierUpTier | null>(null);

  const showEarned = useCallback((type: IncentiveType) => {
    setActiveTierUp(null); // ensure the two popups are never both open
    setActiveIncentive(type);
  }, []);

  const showTierUp = useCallback((tier: TierUpTier) => {
    setActiveIncentive(null);
    setActiveTierUp(tier);
  }, []);

  const dismiss = useCallback(() => {
    setActiveIncentive(null);
    setActiveTierUp(null);
  }, []);

  return (
    <IncentiveEarnedContext.Provider
      value={{ activeIncentive, showEarned, activeTierUp, showTierUp, dismiss }}
    >
      {children}
    </IncentiveEarnedContext.Provider>
  );
}

export function useIncentiveEarned(): IncentiveEarnedContextValue {
  const ctx = useContext(IncentiveEarnedContext);
  if (!ctx) {
    throw new Error("useIncentiveEarned must be used within an IncentiveEarnedProvider");
  }
  return ctx;
}
