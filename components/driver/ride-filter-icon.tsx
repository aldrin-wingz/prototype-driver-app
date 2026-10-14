import {
  Building2,
  CalendarDays,
  Clock,
  Flag,
  MapPin,
  SlidersHorizontal,
  User,
  type LucideIcon,
} from "lucide-react";
import { RIDE_FILTERS, type RideFilterIcon } from "@/lib/driver-data/ride-filters";

/**
 * The glyph each filter carries, on its chip and in the sheet.
 *
 * ⛔⛔ **A map keyed by the registry's own icon NAMES, not icons stored on the
 * definitions.** `lib/driver-data/ride-filters.ts` must not import from
 * `lucide-react`: a rule that holds a React component is a rule a check can
 * only read by rendering it, and every rule in this prototype lives somewhere a
 * check can reach. The cost is that the map can go out of step with the
 * registry, which is why `RIDE_FILTER_ICONS` is declared `Record<RideFilterIcon,
 * …>` — a new icon name fails to compile until it is mapped — and why
 * `missingFilterIcons()` exists for the gate to assert the other direction.
 *
 * ⭐ `MapPin` for the pick-up and `Flag` for the drop-off are production's own
 * convention, stated in the Requests contract: *"the pin icon marks where a
 * trip starts; the flag icon marks where it ends"* (`CAP-056` labels both).
 */
export const RIDE_FILTER_ICONS: Record<RideFilterIcon, LucideIcon> = {
  status: SlidersHorizontal,
  rider: User,
  client: Building2,
  day: CalendarDays,
  time: Clock,
  pickup: MapPin,
  dropoff: Flag,
};

/** Icon names the registry uses that this map does not cover. Always empty. */
export function missingFilterIcons(): string[] {
  return RIDE_FILTERS.map((f) => f.icon).filter((name) => !(name in RIDE_FILTER_ICONS));
}
