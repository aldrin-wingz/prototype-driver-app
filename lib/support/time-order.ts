import type { SupportField } from "@/types/support";

/**
 * Time-order warnings for any set of times that happened in a known order.
 *
 * A driver reconstructing times from memory transposes an AM/PM easily, and the
 * mistake is invisible once filed. Whichever times a case collects, if they
 * happened in a fixed order then one entered out of it describes something that
 * cannot have happened — worth saying so at the point of entry.
 *
 * The sequence is passed in rather than known here: which fields form a sequence
 * is a property of the CASE. Rider No-Show declares `WAIT_TIME_SEQUENCE`
 * (started waiting, then left); a case collecting swipe marks would declare its
 * own, and this checker would not change.
 *
 * ⚠️ **It warns; it never blocks.** `canSubmitCase` does not read this. A driver
 * whose times genuinely look wrong to us may still be right — they were there and
 * we were not — and a prototype that refuses the submit would be asserting a
 * confidence nobody has agreed to. Support sees every value either way, so the
 * cost of a wrong-looking submission is a question, not a bad correction.
 *
 * ⚠️ **Single-day only.** Values are wall-clock with no date, so a wait running
 * past midnight (23:50 arrival, 00:20 departure) reads as backwards and warns
 * wrongly. Not solved here: the form collects no date per time, so there is
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
 * The named fields, in the given order, skipping any the case does not render.
 *
 * Resolved to the FIELD rather than kept as ids, so a warning names a time using
 * the field's own copy and the two cannot drift apart.
 */
function orderedTimeFields(
  fields: SupportField[],
  sequence: readonly string[]
): SupportField[] {
  return sequence
    .map((id) => fields.find((field) => field.id === id))
    .filter((field): field is SupportField => Boolean(field));
}

/**
 * Field id → warning copy, for every time that precedes one before it.
 *
 * A time must not be earlier than **any** time ahead of it in the sequence, which
 * is the same as saying it must not be earlier than the latest of them. So one
 * comparison per field against the largest preceding value settles it — and the
 * field holding that value is also the tightest bound the driver crossed, which
 * makes it the one worth naming.
 *
 * `"HH:MM"` 24-hour strings compare lexicographically = chronologically, so there
 * is no parsing and no clock involved. Fields with no value are skipped: a blank
 * mark is one the driver has not answered yet, not one that conflicts.
 */
export function getTimeOrderWarnings(
  fields: SupportField[],
  values: Record<string, string>,
  /** Field ids in the order they must have happened. */
  order: readonly string[]
): Record<string, string> {
  const warnings: Record<string, string> = {};
  const sequence = orderedTimeFields(fields, order);

  let latestBefore: { field: SupportField; value: string } | undefined;

  for (const field of sequence) {
    const value = (values[field.id] ?? "").trim();

    if (value && latestBefore && value < latestBefore.value) {
      warnings[field.id] =
        `${toClockLabel(value)} is earlier than the ` +
        `${latestBefore.field.shortLabel ?? latestBefore.field.label} ` +
        `(${toClockLabel(latestBefore.value)}). Double-check before you send — ` +
        `this won't stop you.`;
    }

    // Carry the latest time so far, conflicting or not. A third time would have
    // to clear the FIRST even when the one between them is blank or wrong.
    if (value && (!latestBefore || value > latestBefore.value)) {
      latestBefore = { field, value };
    }
  }

  return warnings;
}
