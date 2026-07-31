"use client";

import { createContext, useContext, useMemo, useRef, useState } from "react";
import { getIssueLabel } from "./issue-types";

/**
 * One support request the driver has submitted.
 *
 * Keyed by its own id rather than by trip, so a case that isn't about a trip can
 * still be stored here later. Every v1 request names a trip, which is what puts
 * it on the ride and in My Rides → Pending.
 */
export interface SupportFormRecord {
  id: string;
  caseId: string;
  /** Issue type value, e.g. `missed-swipe`. */
  issue: string;
  /** Plain label for lists — never carries the not-in-prototype flag suffix. */
  issueLabel: string;
  tripId?: string;
  legId?: string;
  values: Record<string, string>;
  /** Fixed label rather than a real clock, so screenshots stay stable. */
  updatedAt: string;
}

/** What a caller supplies; the store fills in the id, label and timestamp. */
export interface SupportFormInput {
  caseId: string;
  issue: string;
  tripId?: string;
  legId?: string;
  values: Record<string, string>;
}

/** A support request the driver has submitted and is waiting on. */
export interface PendingSupportRequest {
  tripId: string;
  caseId: string;
  caseTitle: string;
  values: Record<string, string>;
  submittedAt: string;
}

interface RideFlowValue {
  /** Every request the driver has submitted, newest first. */
  pendingForms: SupportFormRecord[];
  submitForm: (input: SupportFormInput) => string;
  /** The pending request for a ride, if it has one — drives the ride surfaces. */
  getPendingRequest: (tripId: string) => PendingSupportRequest | undefined;
}

const RideFlowContext = createContext<RideFlowValue | null>(null);

/**
 * In-session support request state.
 *
 * The prototype has no backend, but a submitted request has to survive
 * navigation: the driver files from the More screen and is sent back to the ride,
 * which must then show that Support has it. Provider-level state does that; a
 * page-local `useState` would not.
 *
 * Resets on reload, which is the right behaviour for a prototype — every demo
 * starts from the seeded state.
 */
export function RideFlowProvider({ children }: { children: React.ReactNode }) {
  const [records, setRecords] = useState<SupportFormRecord[]>([]);
  // A counter, not a clock or a random source: ids stay predictable across a demo.
  const nextId = useRef(1);

  const value = useMemo<RideFlowValue>(
    () => ({
      pendingForms: records,
      submitForm: (input) => {
        const id = `form-${nextId.current++}`;
        setRecords((previous) => [
          {
            id,
            caseId: input.caseId,
            issue: input.issue,
            issueLabel: getIssueLabel(input.issue),
            tripId: input.tripId,
            legId: input.legId,
            values: input.values,
            updatedAt: "Just now",
          },
          ...previous,
        ]);
        return id;
      },
      getPendingRequest: (tripId) => {
        const match = records.find((record) => record.tripId === tripId);
        if (!match) return undefined;
        return {
          tripId,
          caseId: match.caseId,
          caseTitle: match.issueLabel,
          values: match.values,
          submittedAt: match.updatedAt,
        };
      },
    }),
    [records]
  );

  return (
    <RideFlowContext.Provider value={value}>
      {children}
    </RideFlowContext.Provider>
  );
}

export function useRideFlow(): RideFlowValue {
  const context = useContext(RideFlowContext);
  if (!context) {
    throw new Error("useRideFlow must be used within a RideFlowProvider");
  }
  return context;
}
