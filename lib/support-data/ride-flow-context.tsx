"use client";

import { createContext, useContext, useMemo, useRef, useState } from "react";
import { getIssueLabel } from "./issue-types";
import { findPendingForTrip } from "@/lib/support/request-visibility";

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
  /** Issue type value, e.g. `rider-no-show`. */
  issue: string;
  /** Plain label for lists — never carries the not-in-prototype flag suffix. */
  issueLabel: string;
  tripId?: string;
  legId?: string;
  values: Record<string, string>;
  /** Fixed label rather than a real clock, so screenshots stay stable. */
  updatedAt: string;
  /**
   * Whether the app can learn what happened to this request.
   *
   * ⚠️ This is the difference between "we submitted something" and "we can tell
   * the driver where it got to", and the two are NOT the same. A request filed
   * to Zendesk leaves the app entirely: there is no status to read back, so
   * showing a Pending state would be the app claiming knowledge it does not
   * have. A request that reaches the Support Forms portal can be tracked.
   *
   * Rider No-Show is `false` — the PRD removed its Pending state on 2026-09-08
   * when the destination became Zendesk. Missed Swipe still specifies Pending
   * as its resolution path, so this is deliberately per-case and not a global
   * removal.
   */
  appTracksStatus: boolean;
}

/** What a caller supplies; the store fills in the id, label and timestamp. */
export interface SupportFormInput {
  caseId: string;
  issue: string;
  tripId?: string;
  legId?: string;
  values: Record<string, string>;
  /**
   * Required, with no default on purpose. Every case has to make this call
   * deliberately; a default would let the next one inherit an answer nobody
   * decided. See `SupportFormRecord.appTracksStatus`.
   */
  appTracksStatus: boolean;
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
  /**
   * EVERY request the driver has submitted, newest first — tracked or not.
   *
   * Untracked ones stay here deliberately. The driver did submit them, and the
   * requests tray will have to list them as exactly that: sent, with no status
   * the app can offer. Dropping them would hide the problem the tray exists for.
   */
  submittedForms: SupportFormRecord[];
  submitForm: (input: SupportFormInput) => string;
  /**
   * The pending request for a ride — drives the ride's Pending surfaces.
   *
   * ⚠️ Returns only requests the app can actually TRACK. A submitted but
   * untracked request is not pending as far as the driver's screen is
   * concerned, because the app has nothing true to say about it.
   */
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
      submittedForms: records,
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
            appTracksStatus: input.appTracksStatus,
          },
          ...previous,
        ]);
        return id;
      },
      getPendingRequest: (tripId) => {
        // The rule lives in `lib/support/request-visibility.ts` so a check can
        // reach it and the three reading surfaces cannot drift apart.
        const match = findPendingForTrip(records, tripId);
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
