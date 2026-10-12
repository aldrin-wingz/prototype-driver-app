import type { SupportField } from "@/types/support";

/** Whether a field should render, given the form's current values. */
export function isFieldVisible(
  field: SupportField,
  values: Record<string, string>
): boolean {
  if (!field.showIf) return true;
  return field.showIf.equals.includes(values[field.showIf.field] ?? "");
}

/**
 * Whether every visible required field has a value.
 *
 * Drives the primary button's disabled state. Per reference screenshot `s-02a`,
 * "Save Reason" is a muted green while the required Reason field is empty — the
 * form does not let you submit an incomplete request.
 */
export function areRequiredFieldsFilled(
  fields: SupportField[],
  values: Record<string, string>
): boolean {
  return fields
    .filter(
      (field) =>
        field.required &&
        // Required in the real flow, but the prototype must not hold a demo
        // hostage to a file nobody has to hand.
        !field.requiredNotEnforced &&
        isFieldVisible(field, values)
    )
    .every((field) => (values[field.id] ?? "").trim().length > 0);
}

/**
 * Whether the form can be sent at all.
 *
 * A visible `notice` blocks it outright: a notice stands in for a field set that
 * does not exist, so there is nothing to submit. Without this the driver could
 * send an empty request for an issue nobody has specified, which reads as a
 * working flow and isn't one.
 */
export function canSubmitCase(
  fields: SupportField[],
  values: Record<string, string>
): boolean {
  const blocked = fields.some(
    (field) => field.type === "notice" && isFieldVisible(field, values)
  );
  return !blocked && areRequiredFieldsFilled(fields, values);
}

/**
 * Whether at least one of the named fields differs from what the form opened
 * with.
 *
 * ⛔⛔ **The only submit rule in this file that reads a BASELINE**, and it exists
 * because one case inverts the usual shape. Every other form asks for values the
 * app does not have, so "can this be sent" means "is it filled in". Update Trip
 * Details opens with every answer already filled in — the ride's own times and
 * addresses — and what it sends is the DIFF. Gated on filledness alone it would
 * be submittable from the first render, and the request would be to change the
 * ride to exactly what it already is.
 *
 * ⚠️ An empty or absent list means NO diff is required, not "nothing can be
 * submitted". Every case but one passes `undefined`, and a rule that defaulted
 * the other way would silently disable every Submit button in the app.
 *
 * ⚠️ Compares raw strings, not trimmed ones, for the same reason the time fields
 * compare `<input type="time">` values: whatever the renderer wrote is what the
 * driver sees, and normalising here would call a changed field unchanged. The
 * caller trims when it builds the request, where a stray space is a cosmetic
 * difference rather than a gate.
 */
export function hasRequiredChange(
  ids: readonly string[] | undefined,
  values: Record<string, string>,
  initialValues: Record<string, string>
): boolean {
  if (!ids || ids.length === 0) return true;
  return ids.some((id) => (values[id] ?? "") !== (initialValues[id] ?? ""));
}

/**
 * ⚠️ **`requireOneOf` was removed with the `Cancel At Door` variant.**
 *
 * It expressed "either the signature or the photo, not both and not neither" —
 * the only either/or rule any case here ever had. With that variant out of scope
 * nothing uses it, and it is deleted rather than parked because it carries a real
 * landmine: `areRequiredFieldsFilled` runs BEFORE any group check, so a field
 * that is both `required` and in a group can never be satisfied by its partner.
 * That bug shipped for one commit and needed `conflictingOneOfFields` to guard
 * it. Leaving the machinery in place, unexercised, is leaving that trap for
 * whoever adds case two.
 *
 * Restoring it is one revert: `areOneOfGroupsSatisfied`, `conflictingOneOfFields`,
 * the `requireOneOf` field on `SupportCaseDefinition`, and the third argument to
 * `canSubmitCase`.
 */


/** Blank starting values for a case, so inputs stay controlled from mount. */
export function emptyValues(fields: SupportField[]): Record<string, string> {
  return Object.fromEntries(
    fields.map((field) => [field.id, field.defaultValue ?? ""])
  );
}
