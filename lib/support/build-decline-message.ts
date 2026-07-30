import type { Trip } from "@/lib/driver-data/mock-trips";

/**
 * The template message sent into the support chat when a rider declines a trip.
 *
 * Copy and field order replicated from reference capture `s-04c`. The point of
 * the template is that the driver types nothing — member name, trip date, trip
 * id and every leg id are filled from the ride, which is exactly the structured
 * intake the support cases are meant to produce.
 */
const MONTH_NAMES: Record<string, string> = {
  Jan: "January",
  Feb: "February",
  Mar: "March",
  Apr: "April",
  May: "May",
  Jun: "June",
  Jul: "July",
  Aug: "August",
  Sep: "September",
  Oct: "October",
  Nov: "November",
  Dec: "December",
};

export function buildDeclineMessage(trip: Trip): string {
  const legIds = trip.legs.map((leg) => leg.id).join(", ");
  // The capture shows a bare, FULL month + day ("July 31") — not the
  // weekday-prefixed, abbreviated form the ride cards use ("Thu, Jul 31, 2026").
  const tripDate = trip.date
    .replace(/^\w{3},\s*/, "")
    .replace(/,\s*\d{4}$/, "")
    .replace(/^(\w{3})\b/, (_, month: string) => MONTH_NAMES[month] ?? month);

  return [
    "My member no longer needs transportation. I need help in removing the following rides from my manifest.",
    `Member Name: ${trip.rider}`,
    `Trip Date: ${tripDate}`,
    `Trip ID: ${trip.id}`,
    `Leg IDs: ${legIds}`,
  ].join("\n");
}
