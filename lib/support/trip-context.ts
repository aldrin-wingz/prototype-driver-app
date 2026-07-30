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
  // The first VISIBLE picker, not simply the first one: issues that each own a
  // leg picker would otherwise all resolve against whichever happened to be
  // declared first, and every one of them but that issue would land with no trip.
  const picker = supportCase.fields.find(
    (field) => field.type === "leg-picker" && isFieldVisible(field, values)
  );
  if (!picker) return {};

  const legId = values[picker.id];
  const option = legId ? findLegOption(legId) : undefined;
  return { tripId: option?.trip.id, legId: option?.legId };
}
