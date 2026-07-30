import type { TripLeg } from "@/lib/driver-data/mock-trips";
import type { SupportCallout } from "@/types/support";

/** Parse a mock-data clock string ("3:19 PM") into minutes since midnight. */
export function parseClock(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(value.trim());
  if (!match) return null;

  const [, rawHour, rawMinute, meridiem] = match;
  let hour = Number(rawHour) % 12;
  if (meridiem.toUpperCase() === "PM") hour += 12;
  return hour * 60 + Number(rawMinute);
}

/**
 * The context block at the top of a support form — what the app already knows,
 * echoed back so the driver can confirm they are filing against the right thing.
 *
 * Derived from trip data rather than hardcoded, so the callout stays honest: a
 * ride that is not late does not claim to be. Mirrors reference capture `s-02a`,
 * where the block reads "Scheduled time: 3:19 PM / 63 mins late".
 */
export function buildCalloutForCase(
  caseId: string,
  leg: TripLeg | undefined,
  prefilledCount?: number
): SupportCallout | undefined {
  if (caseId === "missed-pickup") {
    // States the value proposition on the screen the driver is looking at: the
    // web form makes them retype all of this.
    return {
      tone: "info",
      title: `${prefilledCount ?? 0} fields filled from this ride`,
      detail: "Add why the swipe was missed, then submit.",
    };
  }

  if (caseId !== "late-pickup-reason" || !leg) return undefined;

  const scheduled = parseClock(leg.time);
  const pickedUp = leg.progress?.pickedUpAt
    ? parseClock(leg.progress.pickedUpAt)
    : null;
  const minutesLate =
    scheduled !== null && pickedUp !== null ? pickedUp - scheduled : null;

  if (minutesLate !== null && minutesLate > 0) {
    return {
      tone: "danger",
      title: `Scheduled time: ${leg.time}`,
      detail: `${minutesLate} min${minutesLate === 1 ? "" : "s"} late`,
    };
  }

  return {
    tone: "info",
    title: `Scheduled time: ${leg.time}`,
    detail: pickedUp === null ? "Pickup not recorded yet" : "Picked up on time",
  };
}
