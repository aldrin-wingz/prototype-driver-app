/**
 * What the app may tell the driver about a request it has already submitted.
 *
 * ⚠️ This lives in `lib/` rather than inside `RideFlowProvider` on purpose: a
 * rule buried in a provider is a rule no check can reach, and three surfaces
 * read this one (Ride Details' banner and pills, My Rides' Pending tab, and the
 * More Options duplicate guard). They must not be able to disagree about it.
 *
 * The distinction it encodes — and the reason it is not just a boolean on a
 * component — is that **submitting is not the same as being able to see what
 * happened**. A request filed to Zendesk leaves the app: there is no status to
 * read back, so a Pending state would be the app claiming knowledge it does not
 * have. A request that reaches the Support Forms portal can be tracked.
 */

export interface TrackableRequest {
  tripId?: string;
  /** See `SupportFormRecord.appTracksStatus`. */
  appTracksStatus: boolean;
}

/** Whether this request has a state the app can honestly show the driver. */
export function showsPendingState(record: TrackableRequest): boolean {
  return record.appTracksStatus;
}

/**
 * The request driving a ride's Pending surfaces, if any.
 *
 * ⚠️ Deliberately NOT "the newest request for this trip". An untracked request
 * is invisible here even though it exists in the store, because the driver's
 * screen has nothing true to say about it.
 */
export function findPendingForTrip<T extends TrackableRequest>(
  records: T[],
  tripId: string,
): T | undefined {
  return records.find(
    (record) => record.tripId === tripId && showsPendingState(record),
  );
}

/**
 * Every request for a ride, tracked or not.
 *
 * This is what a duplicate-filing guard should read: whether the driver already
 * filed is something the app DOES know.
 */
export function findAnyForTrip<T extends TrackableRequest>(
  records: T[],
  tripId: string,
): T | undefined {
  return records.find((record) => record.tripId === tripId);
}
