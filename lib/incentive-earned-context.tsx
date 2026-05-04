"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import type { IncentiveType } from "@/lib/data/incentives";

interface IncentiveEarnedContextValue {
  /** The incentive currently being celebrated, or null if popup is closed. */
  activeIncentive: IncentiveType | null;
  /** Open the Incentive Earned popup for a given incentive. */
  showEarned: (type: IncentiveType) => void;
  /** Dismiss the popup. */
  dismiss: () => void;
}

const IncentiveEarnedContext = createContext<IncentiveEarnedContextValue | null>(null);

export function IncentiveEarnedProvider({ children }: { children: React.ReactNode }) {
  const [activeIncentive, setActiveIncentive] = useState<IncentiveType | null>(null);

  const showEarned = useCallback((type: IncentiveType) => {
    setActiveIncentive(type);
  }, []);

  const dismiss = useCallback(() => {
    setActiveIncentive(null);
  }, []);

  return (
    <IncentiveEarnedContext.Provider value={{ activeIncentive, showEarned, dismiss }}>
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
