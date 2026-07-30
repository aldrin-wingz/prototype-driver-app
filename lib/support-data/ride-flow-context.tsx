"use client";

import { createContext, useContext, useMemo, useRef, useState } from "react";
import { getIssueLabel } from "./issue-types";

/** Where a ride sits in the "reach out to confirm" flow. */
export type RideConfirmation =
  /** Default — the ride is still unconfirmed and shows the confirm prompt. */
  | "unconfirmed"
  /** Driver reached the rider. The ride becomes an accepted ride awaiting its first swipe. */
  | "confirmed"
  /** Rider declined. Awaiting Support removing it from the manifest. */
  | "declined"
  /** Driver could not reach the rider but is going to the pickup anyway. */
  | "going-anyway"
  /**
   * The number on file could not be reached at all. Awaiting Support reaching
   * the member or fixing the number.
   *
   * Deliberately not the same as `going-anyway`: both describe a call that
   * failed, but this one escalates and that one proceeds without help.
   */
  | "cant-reach";

/** Whether a form is still the driver's, or now Support's. */
export type SupportFormState = "draft" | "pending";

/**
 * One support form the driver has started.
 *
 * Keyed by its own id rather than by trip, because most issues aren't about a
 * trip at all — a payment question or a general one has no leg to hang off. A
 * form that DOES name a trip carries `tripId`, and only those surface on the
 * ride itself and in My Rides → Pending.
 */
export interface SupportFormRecord {
  id: string;
  caseId: string;
  /** Issue type value, e.g. `general`. */
  issue: string;
  /** Plain label for lists — never carries the not-in-prototype flag suffix. */
  issueLabel: string;
  tripId?: string;
  legId?: string;
  values: Record<string, string>;
  state: SupportFormState;
  /** Fixed label rather than a real clock, so screenshots stay stable. */
  updatedAt: string;
}

/** What a caller supplies; the store fills in id, label, state and timestamp. */
export interface SupportFormInput {
  /** Pass an existing id to update that record — a draft becoming pending. */
  id?: string;
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
  getConfirmation: (tripId: string) => RideConfirmation;
  setConfirmation: (tripId: string, value: RideConfirmation) => void;
  /**
   * Templates the app has already sent into a ride's support chat, in order.
   *
   * A list rather than one slot per trip, because more than one flow writes here
   * now — a declined trip and a no-show can both happen on the same ride, and the
   * second must not overwrite the first.
   */
  getSupportMessages: (tripId: string) => string[];
  /**
   * Send a template into a ride's support chat.
   *
   * Ignores a message already present for that trip, so re-entering a flow (or a
   * component remounting) cannot post it twice.
   */
  appendSupportMessage: (tripId: string, message: string) => void;

  /** Every form the driver has started, newest first. */
  formRecords: SupportFormRecord[];
  drafts: SupportFormRecord[];
  pendingForms: SupportFormRecord[];
  /**
   * Save an in-progress form. Returns the record id so the caller can keep
   * editing the same draft rather than creating a second one.
   */
  saveDraft: (input: SupportFormInput) => string;
  /** Send a form to Support. Upserts, so a draft converts rather than duplicates. */
  submitForm: (input: SupportFormInput) => string;
  deleteForm: (id: string) => void;
  /** The pending request for a ride, if it has one — drives the ride surfaces. */
  getPendingRequest: (tripId: string) => PendingSupportRequest | undefined;
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
  const [supportMessages, setSupportMessages] = useState<
    Record<string, string[]>
  >({});
  const [records, setRecords] = useState<SupportFormRecord[]>([]);
  // A counter, not a clock or a random source: ids stay predictable across a demo.
  const nextId = useRef(1);

  const value = useMemo<RideFlowValue>(() => {
    function upsert(input: SupportFormInput, state: SupportFormState): string {
      const id = input.id ?? `form-${nextId.current++}`;
      const record: SupportFormRecord = {
        id,
        caseId: input.caseId,
        issue: input.issue,
        issueLabel: getIssueLabel(input.issue),
        tripId: input.tripId,
        legId: input.legId,
        values: input.values,
        state,
        updatedAt: "Just now",
      };

      setRecords((previous) => {
        const index = previous.findIndex((candidate) => candidate.id === id);
        if (index === -1) return [record, ...previous];
        const next = [...previous];
        next[index] = record;
        return next;
      });

      return id;
    }

    const pendingForms = records.filter((record) => record.state === "pending");

    return {
      getConfirmation: (tripId) => confirmations[tripId] ?? "unconfirmed",
      setConfirmation: (tripId, next) =>
        setConfirmations((previous) => ({ ...previous, [tripId]: next })),
      getSupportMessages: (tripId) => supportMessages[tripId] ?? [],
      appendSupportMessage: (tripId, message) =>
        setSupportMessages((previous) => {
          const existing = previous[tripId] ?? [];
          if (existing.includes(message)) return previous;
          return { ...previous, [tripId]: [...existing, message] };
        }),

      formRecords: records,
      drafts: records.filter((record) => record.state === "draft"),
      pendingForms,
      saveDraft: (input) => upsert(input, "draft"),
      submitForm: (input) => upsert(input, "pending"),
      deleteForm: (id) =>
        setRecords((previous) => previous.filter((record) => record.id !== id)),
      getPendingRequest: (tripId) => {
        const match = pendingForms.find((record) => record.tripId === tripId);
        if (!match) return undefined;
        return {
          tripId,
          caseId: match.caseId,
          caseTitle: match.issueLabel,
          values: match.values,
          submittedAt: match.updatedAt,
        };
      },
    };
  }, [confirmations, supportMessages, records]);

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
