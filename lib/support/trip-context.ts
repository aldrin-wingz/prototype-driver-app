import { findLegOption } from "@/lib/support-data/leg-options";
import { isFieldVisible } from "./build-zod-schema";
import type { SupportCaseDefinition } from "@/types/support";

/** The trip a submission is about, when it is about one at all. */
export interface FormTripContext {
  tripId?: string;
  legId?: string;
}

/**
 * Resolve which trip a set of form values names.
 *
 * Gated on the leg picker being VISIBLE for the chosen issue, not merely on a leg
 * id being present. Opening the form from a ride prefills the leg, but a General
 * or Payment question is not about that ride — attaching it anyway would drag an
 * unrelated ride into My Rides → Pending and hide it from the driver.
 */
export function resolveTripContext(
  supportCase: SupportCaseDefinition,
  values: Record<string, string>
): FormTripContext {
  const picker = supportCase.fields.find((field) => field.type === "leg-picker");
  if (!picker || !isFieldVisible(picker, values)) return {};

  const legId = values[picker.id];
  const option = legId ? findLegOption(legId) : undefined;
  return { tripId: option?.trip.id, legId: option?.legId };
}
