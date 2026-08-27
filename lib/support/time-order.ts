import { SWIPE_SEQUENCE } from "@/lib/driver-data/mock-trips";
import { TIME_FIELD_FOR_SWIPE } from "@/lib/support-data/case-registry";
import type { SupportField } from "@/types/support";

/**
 * Time-order warnings for the swipe times a driver types.
 *
 * The three marks happened in one order — en-route, then pick-up, then drop-off —
 * so a drop-off before the pick-up describes a trip that cannot have happened.
 * Worth saying so at the point of entry, because the driver is reconstructing
 * times from memory and a transposed AM/PM is easy to make and invisible later.
 *
 * ⚠️ **It warns; it never blocks.** `canSubmitCase` does not read this. A driver
 * whose times genuinely look wrong to us may still be right — they were there and
 * we were not — and a prototype that refuses the submit would be asserting a
 * confidence nobody has agreed to. Support sees every value either way, so the
 * cost of a wrong-looking submission is a question, not a bad correction.
 *
 * ⚠️ **Single-day only.** Values are wall-clock with no date, so a leg running
 * past midnight (23:50 pick-up, 00:20 drop-off) reads as backwards and warns
 * wrongly. Not solved here: the form collects no date per mark, so there is
 * nothing to compare, and inventing one would be guessing. Documented instead —
 * and harmless, because the warning does not gate anything.
 */

/** Convert the `<input type="time">` value "14:05" back to "2:05 PM". */
function toClockLabel(value: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  // Anything we cannot read is echoed verbatim rather than dropped — a message
  // naming a value the driver can't see in their own field is worse than a rough
  // one.
  if (!match) return value;

  const [, rawHour, minute] = match;
  const hour = Number(rawHour);
  const meridiem = hour < 12 ? "AM" : "PM";
  const shown = hour % 12 === 0 ? 12 : hour % 12;
  return `${shown}:${minute} ${meridiem}`;
}

/**
 * The swipe time fields in the order they must have happened.
 *
 * Resolved from the case's own fields rather than a list of ids, so each warning
 * names a mark using the exact label rendered above it. Sequence comes from
 * `SWIPE_SEQUENCE`, the one place the swipe order is declared.
 */
function orderedTimeFields(fields: SupportField[]): SupportField[] {
  return SWIPE_SEQUENCE.map((mark) =>
    fields.find((field) => field.id === TIME_FIELD_FOR_SWIPE[mark])
  ).filter((field): field is SupportField => Boolean(field));
}

/**
 * Field id → warning copy, for every swipe time that precedes one before it.
 *
 * A mark must not be earlier than **any** mark ahead of it in the sequence, which
 * is the same as saying it must not be earlier than the latest of them. So one
 * comparison per field against the largest preceding value settles it — and the
 * mark holding that value is also the tightest bound the driver crossed, which
 * makes it the one worth naming.
 *
 * `"HH:MM"` 24-hour strings compare lexicographically = chronologically, so there
 * is no parsing and no clock involved. Fields with no value are skipped: a blank
 * mark is one the driver has not answered yet, not one that conflicts.
 */
export function getTimeOrderWarnings(
  fields: SupportField[],
  values: Record<string, string>
): Record<string, string> {
  const warnings: Record<string, string> = {};
  const sequence = orderedTimeFields(fields);

  let latestBefore: { field: SupportField; value: string } | undefined;

  for (const field of sequence) {
    const value = (values[field.id] ?? "").trim();

    if (value && latestBefore && value < latestBefore.value) {
      warnings[field.id] =
        `${toClockLabel(value)} is earlier than ${latestBefore.field.label} ` +
        `(${toClockLabel(latestBefore.value)}). Double-check before you send — ` +
        `this won't stop you.`;
    }

    // Carry the latest mark so far, conflicting or not. A drop-off has to clear
    // the en-route time even when the pick-up between them is blank or wrong.
    if (value && (!latestBefore || value > latestBefore.value)) {
      latestBefore = { field, value };
    }
  }

  return warnings;
}
