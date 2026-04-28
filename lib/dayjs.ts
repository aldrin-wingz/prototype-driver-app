import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

/**
 * Convert IANA timezone name to abbreviated format
 * e.g., "America/New_York" -> "EST" or "EDT" (depending on DST)
 */
export function getTimezoneAbbreviation(ianaTimezone: string): string {
  if (!ianaTimezone) return "";

  try {
    const date = new Date();
    const tzPart = new Intl.DateTimeFormat("en-US", {
      timeZone: ianaTimezone,
      timeZoneName: "short",
    })
      .formatToParts(date)
      .find((part) => part.type === "timeZoneName");

    return tzPart?.value || ianaTimezone;
  } catch (error) {
    console.error(`Error converting timezone ${ianaTimezone}:`, error);
    return ianaTimezone;
  }
}

export default dayjs;
