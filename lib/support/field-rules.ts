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
  values: Record<string, string>,
  /** Groups where at least one member must be answered — see `requireOneOf`. */
  requireOneOf?: string[][]
): boolean {
  const blocked = fields.some(
    (field) => field.type === "notice" && isFieldVisible(field, values)
  );
  if (blocked || !areRequiredFieldsFilled(fields, values)) return false;
  return areOneOfGroupsSatisfied(fields, values, requireOneOf);
}

/**
 * ⚠️ A field in an either/or group must NOT also be individually `required`.
 *
 * `areRequiredFieldsFilled` runs first, so a required member can never be
 * satisfied by its partner — the group becomes dead code and the driver is held
 * to both answers while the copy promises either. This exact bug shipped for one
 * commit; the check exists so it cannot come back silently.
 *
 * Returns the offending ids rather than throwing, so a caller can assert in a
 * test and the runtime stays quiet in production.
 */
export function conflictingOneOfFields(
  fields: SupportField[],
  requireOneOf?: string[][]
): string[] {
  if (!requireOneOf?.length) return [];
  const grouped = new Set(requireOneOf.flat());
  return fields
    .filter((field) => grouped.has(field.id) && field.required)
    .map((field) => field.id);
}

/**
 * Whether every either/or group has an answer.
 *
 * A group is satisfied by any one visible member holding a value. Fields that
 * are not currently visible are ignored, so a group whose members are all hidden
 * cannot block the submit — the same rule `areRequiredFieldsFilled` follows.
 */
export function areOneOfGroupsSatisfied(
  fields: SupportField[],
  values: Record<string, string>,
  requireOneOf?: string[][]
): boolean {
  if (!requireOneOf?.length) return true;
  return requireOneOf.every((group) => {
    const visible = group
      .map((id) => fields.find((field) => field.id === id))
      .filter(
        (field): field is SupportField =>
          Boolean(field) && isFieldVisible(field!, values)
      );
    if (visible.length === 0) return true;
    return visible.some((field) => (values[field.id] ?? "").trim().length > 0);
  });
}

/** Blank starting values for a case, so inputs stay controlled from mount. */
export function emptyValues(fields: SupportField[]): Record<string, string> {
  return Object.fromEntries(
    fields.map((field) => [field.id, field.defaultValue ?? ""])
  );
}
