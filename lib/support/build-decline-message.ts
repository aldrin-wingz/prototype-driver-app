import type { Trip } from "@/lib/driver-data/mock-trips";
import { tripDetailLines } from "./trip-detail-lines";

/**
 * The template message sent into the support chat when a rider declines a trip.
 *
 * Copy and field order replicated from reference capture `s-04c`. The point of
 * the template is that the driver types nothing — member name, trip date, trip
 * id and every leg id are filled from the ride, which is exactly the structured
 * intake the support cases are meant to produce.
 */
export function buildDeclineMessage(trip: Trip): string {
  return [
    "My member no longer needs transportation. I need help in removing the following rides from my manifest.",
    ...tripDetailLines(trip),
  ].join("\n");
}
