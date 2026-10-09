"use client";

import { createContext, useContext, useMemo, useRef, useState } from "react";
import { getIssueLabel } from "./issue-types";
import { findPendingForTrip } from "@/lib/support/request-visibility";
import { swipeClockFor, type SwipeMark } from "@/lib/driver-data/missed-swipe-rules";
import type { Trip, TripLeg } from "@/lib/driver-data/mock-trips";
import {
  applySessionSwipes as applyOverlay,
  markMemberSignatureMissing as markMissing,
  recordSessionSwipe,
  tripMemberSignatureMissing,
} from "@/lib/driver-data/session-swipes";

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

  // ---- Missed Swipe ----------------------------------------------------
  /**
   * The trip with any swipes the driver made THIS SESSION laid over the seed.
   *
   * ⚠️ An overlay, not an edit. `mock-trips` is the seeded ground truth every
   * demo restarts from, and the Missed Swipe slice is the first thing here that
   * needs a mark to appear while the app is running — the postponed pick-up form
   * is defined as "after the drop-off swipe", so without a drop-off that can
   * actually land there is no after. Writing into the seed instead would make
   * the demo unrepeatable and would quietly change what every other slice sees.
   */
  applySessionSwipes: (trip: Trip) => Trip;
  /**
   * Record a swipe the driver just made.
   *
   * ⚠️ Takes the LEG, not just its id, because the clock to stamp comes from the
   * leg's own trail — see `swipeClockFor`. A device clock here puts the new mark
   * in a different frame from every mark beside it.
   */
  recordSwipe: (
    leg: TripLeg,
    mark: SwipeMark,
    odometer?: number,
    /**
     * The clock face to stamp, when the DRIVER supplied it.
     *
     * ⚠️ Omitted for a swipe made now, which takes the leg's own trail clock.
     * Passed for a confirmed answer, because the driver's correction is the
     * whole point — stamping "now" over it would discard it.
     */
    at?: string
  ) => void;
  /**
   * The driver said the member is still in the car, so the pick-up is deferred.
   *
   * Held per leg because it is a claim about THIS leg's missing mark, and it is
   * what makes the drop-off swipe available on a leg production would have
   * blocked.
   */
  isPickupPostponed: (legId: string) => boolean;
  postponePickup: (legId: string) => void;
  clearPostponedPickup: (legId: string) => void;
  /**
   * Whether the app has already raised its missed-swipe notice for this mark.
   *
   * ⚠️ The notice OPENS ITSELF, so without this it reopens on every visit to the
   * ride and becomes a modal the driver cannot get past. Seen once, it stays on
   * the screen as a banner instead — which is the difference between the app
   * telling you something and the app nagging you.
   */
  /** Record that a leg ended with no MEMBER signature, and read it back. */
  markMemberSignatureMissing: (legId: string) => void;
  isTripMemberSignatureMissing: (trip: Trip) => boolean;

  // ---- Member Confirmation (Stage 01) ----------------------------------
  /**
   * Whether the driver has confirmed this trip with the member.
   *
   * ⚠️ Session state, not a seed field. The confirmation gate is what separates
   * Ride Details' `needs-action` phase from `in-progress`, and before this the
   * orange `I REACHED OUT TO CONFIRM` button was a toast saying it was not wired
   * — so the app could reach `needs-action` and never leave it. Held per trip
   * because the gate is per trip, and resets on reload like every other
   * in-session fact here.
   *
   * ⛔ Filing "I can't reach the member" does NOT set this. That form reports a
   * failure to reach someone; confirming says the opposite.
   */
  isTripConfirmed: (tripId: string) => boolean;
  confirmTrip: (tripId: string) => void;
}

/** A wall clock in the seed's own format, e.g. "2:14 PM". */
function nowClock(): string {
  const now = new Date();
  const hour = now.getHours();
  const shown = hour % 12 === 0 ? 12 : hour % 12;
  return `${shown}:${String(now.getMinutes()).padStart(2, "0")} ${hour < 12 ? "AM" : "PM"}`;
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
  // ⚠️ A revision counter, not the swipes themselves. The overlay lives in
  // `session-swipes` so the leg-options registry sees it too; this is only how
  // React is told to look again.
  const [swipeRevision, setSwipeRevision] = useState(0);
  const [postponed, setPostponed] = useState<string[]>([]);
  // Trip ids the driver confirmed with the member this session.
  const [confirmed, setConfirmed] = useState<string[]>([]);
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

      applySessionSwipes: (trip) => applyOverlay(trip),
      recordSwipe: (leg, mark, odometer, at) => {
        recordSessionSwipe(
          leg.id,
          mark,
          at ?? swipeClockFor(leg) ?? nowClock(),
          odometer
        );
        setSwipeRevision((previous) => previous + 1);
      },
      isPickupPostponed: (legId) => postponed.includes(legId),
      postponePickup: (legId) =>
        setPostponed((previous) =>
          previous.includes(legId) ? previous : [...previous, legId]
        ),
      clearPostponedPickup: (legId) =>
        setPostponed((previous) => previous.filter((id) => id !== legId)),
      markMemberSignatureMissing: (legId) => {
        markMissing(legId);
        setSwipeRevision((previous) => previous + 1);
      },
      isTripMemberSignatureMissing: (trip) => tripMemberSignatureMissing(trip),

      isTripConfirmed: (tripId) => confirmed.includes(tripId),
      confirmTrip: (tripId) =>
        setConfirmed((previous) =>
          previous.includes(tripId) ? previous : [...previous, tripId]
        ),
    }),
    [records, swipeRevision, postponed, confirmed]
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
