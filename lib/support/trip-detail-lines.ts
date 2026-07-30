import type { Trip } from "@/lib/driver-data/mock-trips";

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

/**
 * "July 31" — the bare, full month + day the chat templates use.
 *
 * Per reference capture `s-04c`, deliberately NOT the weekday-prefixed
 * abbreviated form the ride cards show ("Thu, Jul 31, 2026").
 */
export function formatTripDateForChat(rideDate: string): string {
  return rideDate
    .replace(/^\w{3},\s*/, "")
    .replace(/,\s*\d{4}$/, "")
    .replace(/^(\w{3})\b/, (_, month: string) => MONTH_NAMES[month] ?? month);
}

/**
 * The identifying block every support-chat template carries.
 *
 * Shared rather than duplicated per template: Support reads these messages by
 * scanning for the same four lines in the same order, so two templates drifting
 * apart in shape would cost more than the abstraction does. The driver types none
 * of it — that structured intake is the whole point of moving these in-app.
 *
 * Note `Leg IDs` covers EVERY leg on the trip, including an appointment-anchor
 * leg the driver never swipes, because Support is being asked to act on the whole
 * ride and not one leg of it.
 */
export function tripDetailLines(trip: Trip): string[] {
  return [
    `Member Name: ${trip.rider}`,
    `Trip Date: ${formatTripDateForChat(trip.date)}`,
    `Trip ID: ${trip.id}`,
    `Leg IDs: ${trip.legs.map((leg) => leg.id).join(", ")}`,
  ];
}
