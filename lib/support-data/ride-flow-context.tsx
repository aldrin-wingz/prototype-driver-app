"use client";

import { createContext, useContext, useMemo, useState } from "react";

/** Where a ride sits in the "reach out to confirm" flow. */
export type RideConfirmation =
  /** Default — the ride is still unconfirmed and shows the confirm prompt. */
  | "unconfirmed"
  /** Driver reached the rider. The ride becomes an accepted ride awaiting its first swipe. */
  | "confirmed"
  /** Rider declined. Awaiting Support removing it from the manifest. */
  | "declined"
  /** Driver could not reach the rider but is going to the pickup anyway. */
  | "going-anyway";

/** A support request the driver has submitted and is waiting on. */
export interface PendingSupportRequest {
  tripId: string;
  caseId: string;
  caseTitle: string;
  values: Record<string, string>;
  submittedAt: string;
}

interface RideFlowValue {
  getConfirmation: (tripId: string) => RideConfirmation;
  setConfirmation: (tripId: string, value: RideConfirmation) => void;
  /** Decline messages already sent to Support, keyed by trip id. */
  getDeclineMessage: (tripId: string) => string | undefined;
  setDeclineMessage: (tripId: string, message: string) => void;
  /** The pending support request for a ride, if it has one. */
  getPendingRequest: (tripId: string) => PendingSupportRequest | undefined;
  /** All pending requests — drives the My Rides "Pending" tab. */
  pendingRequests: PendingSupportRequest[];
  submitRequest: (request: Omit<PendingSupportRequest, "submittedAt">) => void;
}

const RideFlowContext = createContext<RideFlowValue | null>(null);

/**
 * In-session ride flow state.
 *
 * The prototype has no backend, but the confirm flow needs state that survives
 * navigation — the driver can detour into the support chat and come back, and
 * the ride must still remember it was declined. Provider-level state does that;
 * a page-local `useState` would not.
 *
 * Resets on reload, which is the right behaviour for a prototype: every demo
 * starts from the seeded state.
 */
export function RideFlowProvider({ children }: { children: React.ReactNode }) {
  const [confirmations, setConfirmations] = useState<
    Record<string, RideConfirmation>
  >({});
  const [declineMessages, setDeclineMessages] = useState<
    Record<string, string>
  >({});
  const [requests, setRequests] = useState<
    Record<string, PendingSupportRequest>
  >({});

  const value = useMemo<RideFlowValue>(
    () => ({
      getConfirmation: (tripId) => confirmations[tripId] ?? "unconfirmed",
      setConfirmation: (tripId, next) =>
        setConfirmations((previous) => ({ ...previous, [tripId]: next })),
      getDeclineMessage: (tripId) => declineMessages[tripId],
      setDeclineMessage: (tripId, message) =>
        setDeclineMessages((previous) => ({ ...previous, [tripId]: message })),
      getPendingRequest: (tripId) => requests[tripId],
      pendingRequests: Object.values(requests),
      submitRequest: (request) =>
        setRequests((previous) => ({
          ...previous,
          [request.tripId]: {
            ...request,
            // No real clock needed for a prototype, and a fixed label keeps
            // screenshots stable.
            submittedAt: "Just now",
          },
        })),
    }),
    [confirmations, declineMessages, requests]
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
