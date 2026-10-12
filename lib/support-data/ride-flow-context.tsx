"use client";

import { createContext, useContext, useMemo, useRef, useState } from "react";
import type { TripChange } from "@/lib/driver-data/trip-change-request";
import type { AddLegRequest } from "@/lib/driver-data/add-leg-request";
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

  /**
   * Members who have opted out of the preferred-driver question.
   *
   * ⛔⛔ **Keyed by MEMBER, not by trip or leg.** The relationship this asks
   * about is a standing one — the member rides most weeks — so a per-trip flag
   * would put the same question about the same person in front of the same
   * driver every single week. That is how a prompt stops being read.
   *
   * ⚠️ Exposed as the raw list rather than a predicate, because the rule that
   * reads it lives in `lib/driver-data/member-assignment.ts` with the other two
   * conditions. A predicate here would be a third place the rule could differ.
   */
  preferredDriverOptOuts: string[];
  optOutOfPreferredDriverAsk: (member: string) => void;

  /**
   * Trips the driver has sent back this session.
   *
   * ⛔⛔ **A send-back REMOVES the trip from the driver**, which makes this the
   * first thing in this provider that takes a ride away rather than annotating
   * one. My Rides filters on it, so a sent-back trip is gone from every tab —
   * which is the whole point: the driver has to be able to see that it worked.
   *
   * ⚠️ Session state, so a reload restores the seeded ride. That is the right
   * behaviour for a demo and the wrong one to mistake for persistence.
   */
  sentBackTrips: string[];
  sendBackTrip: (tripId: string) => void;
  isTripSentBack: (tripId: string) => boolean;

  // ---- Rider Declined (catalogue row 16) -------------------------------
  /**
   * Rides the driver has reported as declined by the member this session.
   *
   * ⛔⛔ **This is NOT a cancellation and must never become one.** The client
   * owns the cancellation; production's own popup says so in capitals. So this
   * list does not remove a ride from My Rides the way `sentBackTrips` does — it
   * annotates it. A ride here still appears everywhere it did before, carrying
   * `Cancellation requested` instead of `Confirmation required`.
   *
   * ⚠️ Takes SEVERAL ids at once, because one decline covers one round trip —
   * `CAP-225`'s template lists two leg ids. Calling it once per leg would make
   * the two halves of one report arrive as two.
   */
  cancellationRequests: string[];
  requestCancellation: (tripIds: string[]) => void;
  isCancellationRequested: (tripId: string) => boolean;

  // ---- Update Trip Details (catalogue row 20) ---------------------------
  /**
   * The change the driver has asked Support for, per ride.
   *
   * ⛔⛔ **Keyed by ride and holding ONE request, deliberately.** A second,
   * contradicting request would arrive at Support as two tickets that disagree
   * about the same ride, and nothing in the app could say which is current. So
   * the entry points refuse while one stands.
   *
   * ⚠️ The cost is real and named in the spec: there is no way to WITHDRAW or
   * amend from inside the app. That is **catalogue row 17**, the requests tray,
   * 509 calls, specified nowhere — and this is the fifth build leaning on it.
   *
   * ⚠️ Holds the CHANGES, not just a flag, because the ride has to print them:
   * the trip goes on showing its old times and addresses, so "Change requested"
   * on its own would read as the submit having done nothing.
   */
  tripChangeRequests: Record<string, TripChange[]>;
  requestTripChange: (tripId: string, changes: TripChange[]) => void;
  tripChangeRequest: (tripId: string) => TripChange[] | undefined;

  // ---- Add Leg to Trip (catalogue row 19) -------------------------------
  /**
   * The leg the driver has asked Support to add, per **trip group**.
   *
   * ⛔⛔ **Keyed by GROUP, not by ride** — the one difference from row 20's
   * record, and it is load-bearing. A new leg is a claim about the whole
   * sequence, so every leg of the group has to show it, including the one the
   * driver was not looking at when they filed. Keying by ride would show the
   * request on the leg they happened to open and leave its sibling silent about
   * a change to its own pick-up time.
   *
   * ⛔ One open request per group. A second would reach Support as two tickets
   * disagreeing about the same running order. ⚠️ Nothing can withdraw or amend
   * it from inside the app — **row 17**, and this is the sixth build leaning on
   * it.
   */
  addLegRequests: Record<string, AddLegRequest>;
  requestAddLeg: (groupKey: string, request: AddLegRequest) => void;
  addLegRequest: (groupKey: string) => AddLegRequest | undefined;
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
  // Members who ticked "Don't ask again for this member".
  const [preferredOptOuts, setPreferredOptOuts] = useState<string[]>([]);
  // Trips sent back this session — removed from My Rides.
  const [sentBack, setSentBack] = useState<string[]>([]);
  // Trips the member declined — annotated in My Rides, never removed.
  const [cancelRequested, setCancelRequested] = useState<string[]>([]);
  const [tripChanges, setTripChanges] = useState<Record<string, TripChange[]>>(
    {}
  );
  const [addLegs, setAddLegs] = useState<Record<string, AddLegRequest>>({});
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

      preferredDriverOptOuts: preferredOptOuts,
      optOutOfPreferredDriverAsk: (member) =>
        setPreferredOptOuts((previous) =>
          previous.includes(member) ? previous : [...previous, member]
        ),

      sentBackTrips: sentBack,
      sendBackTrip: (tripId) =>
        setSentBack((previous) =>
          previous.includes(tripId) ? previous : [...previous, tripId]
        ),
      isTripSentBack: (tripId) => sentBack.includes(tripId),

      cancellationRequests: cancelRequested,
      requestCancellation: (tripIds) =>
        setCancelRequested((previous) => [
          ...previous,
          // ⚠️ Filtered, not blindly appended. Refiling the same decline would
          // otherwise put the same ride in the list twice, and the count is what
          // a check reads.
          ...tripIds.filter((id) => !previous.includes(id)),
        ]),
      isCancellationRequested: (tripId) => cancelRequested.includes(tripId),

      tripChangeRequests: tripChanges,
      requestTripChange: (tripId, changes) =>
        setTripChanges((previous) => ({ ...previous, [tripId]: changes })),
      // ⚠️ Returns the CHANGES, and `undefined` when there is no request —
      // distinct from an empty array, which the diff gate makes impossible but
      // which a caller reading `.length` could not tell apart from "no request".
      tripChangeRequest: (tripId) => tripChanges[tripId],

      addLegRequests: addLegs,
      requestAddLeg: (key, request) =>
        setAddLegs((previous) => ({ ...previous, [key]: request })),
      addLegRequest: (key) => addLegs[key],
    }),
    [
      records,
      swipeRevision,
      postponed,
      confirmed,
      preferredOptOuts,
      sentBack,
      cancelRequested,
      tripChanges,
      addLegs,
    ]
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
