import type { Trip, TripLeg } from "@/lib/driver-data/mock-trips";
import { getLegOptions } from "@/lib/support-data/leg-options";
import { inferNearWindow } from "@/lib/driver-data/no-show-rules";
import { matchAnchor, type SwipeAnchor } from "@/lib/driver-data/missed-swipe-rules";
import type {
  SupportCaseDefinition,
  SupportField,
  SupportPrefillSource,
} from "@/types/support";

/** Stand-in for the signed-in driver. Real app would read this from the session. */
export const DRIVER_EMAIL = "driver@wingz.com";

/**
 * Convert "9:40 AM" to the `<input type="time">` value "09:40".
 *
 * ⚠️ Exported since row 20, which seeds a ride's own scheduled times into a form
 * directly rather than through a `prefillFrom` source. A second copy of this
 * conversion would be a second place for an AM/PM to be read wrongly.
 */
export function toTimeInputValue(clock: string | null | undefined): string {
  if (!clock) return "";
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(clock.trim());
  if (!match) return "";

  const [, rawHour, minute, meridiem] = match;
  let hour = Number(rawHour) % 12;
  if (meridiem.toUpperCase() === "PM") hour += 12;
  return `${String(hour).padStart(2, "0")}:${minute}`;
}

/**
 * A record age in minutes as the `<input type="time">` value it happened at.
 *
 * Uses the real clock, because a record age is only meaningful relative to now —
 * and the driver is being asked about the last twenty minutes, so "10:19" has to
 * mean ten past ten on their phone, not on `MOCK_TODAY`.
 */
function clockFromMinutesAgo(minutesAgo: number | undefined): string {
  if (minutesAgo === undefined) return "";
  const at = new Date(Date.now() - minutesAgo * 60000);
  return `${String(at.getHours()).padStart(2, "0")}:${String(at.getMinutes()).padStart(2, "0")}`;
}

/**
 * Convert the `<input type="time">` value "11:20" back to "11:20 AM".
 *
 * ⚠️ The inverse of `toTimeInputValue`, and it exists because a CONFIRMED answer
 * becomes a swipe mark. The seed stores clock faces, so a value that went into
 * the form as "11:20" has to come back out in the shape every other mark on the
 * leg is written in — or the leg ends up with two time formats and the ordering
 * checks start comparing strings that are not comparable.
 */
export function fromTimeInputValue(value: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return value;
  const hour = Number(match[1]);
  const shown = hour % 12 === 0 ? 12 : hour % 12;
  return `${shown}:${match[2]} ${hour < 12 ? "AM" : "PM"}`;
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
 * is the interesting case. A ride the app never located leaves both wait times
 * blank, so the fields the driver must actually supply are the empty ones.
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
    // ⚠️ These prefill from the record stream the gate has just judged
    // INSUFFICIENT, which is why neither field locks. On the commonest failure —
    // waited, then drove off — the app saw the whole wait and can offer it back;
    // where it saw nothing, both stay blank, which is the honest answer and the
    // interesting case.
    case "waitArrivedAt":
      return clockFromMinutesAgo(
        leg ? inferNearWindow(leg)?.arrivedAgoMinutes : undefined
      );
    case "waitLeftAt":
      return clockFromMinutesAgo(
        leg ? inferNearWindow(leg)?.lastSeenAgoMinutes : undefined
      );
    // ---- Missed Swipe ------------------------------------------------
    // A recorded mark is already a clock face ("2:14 PM"), so it converts; a
    // mark the driver never made is empty, which is the whole case.
    case "enRouteTime":
      return toTimeInputValue(leg?.progress?.startedAt);
    case "recordedPickupAt":
      return toTimeInputValue(leg?.progress?.pickedUpAt);
    case "recordedDropoffAt":
      return toTimeInputValue(leg?.progress?.droppedOffAt);
    case "recordedPickupOdometer":
      return odometer(leg?.progress?.pickedUpOdometer);
    case "recordedDropoffOdometer":
      return odometer(leg?.progress?.droppedOffOdometer);
    case "pickupSeenAt":
      return seenAt(leg, "pickup");
    case "dropoffSeenAt":
      return seenAt(leg, "dropoff");
  }
}

/**
 * When the location trail first places the driver at one end of the leg.
 *
 * ⚠️ Empty unless the trail actually matched. Both other answers — a trail that
 * never came near, and no trail at all — resolve to "" here on purpose: the
 * field must open blank so the driver fills it. WHICH of the two it was is not
 * thrown away; the form reads it from `matchAnchor` directly and says so, because
 * "you were never there" and "we have no record of you" are different claims and
 * an empty box tells the driver neither.
 */
/** A captured odometer reading, or "" when the swipe never took one. */
function odometer(reading: number | null | undefined): string {
  return reading === null || reading === undefined ? "" : String(reading);
}

function seenAt(leg: TripLeg | undefined, anchor: SwipeAnchor): string {
  if (!leg) return "";
  const evidence = matchAnchor(leg, anchor);
  if (evidence.kind !== "matched") return "";
  // ⚠️ The fix's own clock when it has one, because a missed swipe is
  // reconstructed against the leg's OTHER marks and has to sit in their frame.
  // Falling back to the live clock only for a record seeded without one, which
  // is every pre-Missed-Swipe ride and none that reaches this form.
  return evidence.arrivedAt
    ? toTimeInputValue(evidence.arrivedAt)
    : clockFromMinutesAgo(evidence.arrivedAgoMinutes);
}

/**
 * Drop a prefilled leg the field's own picker wouldn't offer.
 *
 * Opening the form from a ride prefills that ride's leg, but a scoped picker only
 * offers legs the issue actually applies to — a no-show needs a trip that is
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
