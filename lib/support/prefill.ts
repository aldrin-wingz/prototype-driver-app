import type { Trip, TripLeg } from "@/lib/driver-data/mock-trips";
import type {
  SupportCaseDefinition,
  SupportField,
  SupportPrefillSource,
} from "@/types/support";

/** Stand-in for the signed-in driver. Real app would read this from the session. */
export const DRIVER_EMAIL = "driver@wingz.com";

/** Convert "9:40 AM" to the `<input type="time">` value "09:40". */
function toTimeInputValue(clock: string | null | undefined): string {
  if (!clock) return "";
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(clock.trim());
  if (!match) return "";

  const [, rawHour, minute, meridiem] = match;
  let hour = Number(rawHour) % 12;
  if (meridiem.toUpperCase() === "PM") hour += 12;
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

/** Convert "Thu, Jul 31, 2026" to the `<input type="date">` value "2026-07-31". */
function toDateInputValue(rideDate: string): string {
  const parsed = new Date(rideDate.replace(/^\w{3},\s*/, ""));
  if (Number.isNaN(parsed.getTime())) return "";
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${parsed.getFullYear()}-${month}-${day}`;
}

/**
 * Resolve one prefill source against the ride.
 *
 * Returns an empty string when the app genuinely does not know the value — which
 * is the interesting case. A missing pick-up swipe leaves `pickupTime` blank, so
 * the one field the driver must actually supply is the one that is empty.
 */
function resolve(
  source: SupportPrefillSource,
  trip: Trip,
  leg: TripLeg | undefined,
  supportCase: SupportCaseDefinition
): string {
  switch (source) {
    case "issueType":
      return supportCase.issueType ?? supportCase.title;
    case "driverEmail":
      return DRIVER_EMAIL;
    case "pickupDate":
      return toDateInputValue(trip.date);
    case "legPositionLetter":
      return leg?.legCode ?? "";
    case "legId":
      return leg?.id ?? "";
    case "enRouteTime":
      return toTimeInputValue(leg?.progress?.startedAt);
    case "pickupTime":
      return toTimeInputValue(leg?.progress?.pickedUpAt);
    case "dropOffTime":
      return toTimeInputValue(leg?.progress?.droppedOffAt);
  }
}

/** Initial form values for a case, with everything the app knows filled in. */
export function buildPrefilledValues(
  supportCase: SupportCaseDefinition,
  trip: Trip,
  leg: TripLeg | undefined
): Record<string, string> {
  return Object.fromEntries(
    supportCase.fields.map((field) => [
      field.id,
      field.prefillFrom ? resolve(field.prefillFrom, trip, leg, supportCase) : "",
    ])
  );
}

/** Fields the driver still has to fill — the honest measure of remaining effort. */
export function countFieldsLeft(
  fields: SupportField[],
  values: Record<string, string>
): number {
  return fields.filter(
    (field) => field.required && (values[field.id] ?? "").trim().length === 0
  ).length;
}
