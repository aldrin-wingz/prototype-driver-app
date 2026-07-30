import type { Trip, TripLeg } from "@/lib/driver-data/mock-trips";
import { getLegOptions } from "@/lib/support-data/leg-options";
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
    case "riderName":
      return trip.rider;
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
    case "arrivedAt":
      // Blank when the app never established an arrival, which is exactly the
      // case that makes the driver's own answer worth asking for.
      return toTimeInputValue(leg?.presence?.arrivedAt);
  }
}

/**
 * Drop a prefilled leg the field's own picker wouldn't offer.
 *
 * Opening the form from a ride prefills that ride's leg, but a scoped picker only
 * offers legs the issue actually applies to — a missed swipe needs a trip that is
 * under way. Prefilling an ineligible leg would let the driver file against a ride
 * that hasn't started, which the picker itself forbids.
 */
function withinScope(field: SupportField, value: string): string {
  if (field.type !== "leg-picker" || !field.legScope || !value) return value;
  const eligible = getLegOptions(field.legScope).some(
    (option) => option.legId === value
  );
  return eligible ? value : "";
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
      field.prefillFrom
        ? withinScope(field, resolve(field.prefillFrom, trip, leg, supportCase))
        : // Fall back to the field's own default rather than blank — otherwise
          // opening the form from a ride wipes defaults like "one ride row", and
          // the stepper and the rows below it disagree.
          (field.defaultValue ?? ""),
    ])
  );
}

/**
 * Values derived from a newly selected leg.
 *
 * Only fields that actually resolve to something are returned, so choosing a
 * different leg overwrites the timestamps we now know while leaving the driver's
 * own typing (the reason, odometer readings) alone.
 */
export function deriveFromLeg(
  supportCase: SupportCaseDefinition,
  trip: Trip,
  leg: TripLeg
): Record<string, string> {
  const derived: Record<string, string> = {};
  for (const field of supportCase.fields) {
    if (!field.prefillFrom) continue;
    derived[field.id] = resolve(field.prefillFrom, trip, leg, supportCase);
  }
  return derived;
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
