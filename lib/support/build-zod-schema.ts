import { z } from "zod";
import type { SupportField } from "@/types/support";

/**
 * Build a zod schema from a case's field list.
 *
 * This is what makes a support case data rather than code: the field array is
 * the single source of truth for both rendering and validation, so the two can
 * never drift apart.
 */
export function buildZodSchema(fields: SupportField[]) {
  const shape: Record<string, z.ZodTypeAny> = {};

  for (const field of fields) {
    let rule = z.string();

    if (field.maxLength) {
      rule = rule.max(
        field.maxLength,
        `Keep this under ${field.maxLength} characters.`
      );
    }

    // A conditional field can't be unconditionally required — it may not be on
    // screen at all. `isFieldVisible` gates it, and the submit guard below
    // re-checks required-ness against what is actually visible.
    shape[field.id] =
      field.required && !field.showIf
        ? rule.min(1, "This field is required.")
        : rule.optional().or(z.literal(""));
  }

  return z.object(shape);
}

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
    .filter((field) => field.required && isFieldVisible(field, values))
    .every((field) => (values[field.id] ?? "").trim().length > 0);
}

/** Blank starting values for a case, so inputs stay controlled from mount. */
export function emptyValues(fields: SupportField[]): Record<string, string> {
  return Object.fromEntries(fields.map((field) => [field.id, ""]));
}
