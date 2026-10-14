import { type DemoFocus } from "@/lib/solutions/demo-mode";
import {
  applicableRidesFilter,
  applyRidesFilter,
  showsCancelledRides,
  ridesFilterLabel,
  DEFAULT_RIDES_FILTER,
  MY_RIDES_FILTERS,
  type RidesFilter,
} from "./client-cancellation";
import type { Trip } from "./mock-trips";
import { clockMinutes, parseRideDate } from "./ride-date";

/**
 * The My Rides filter — a FEATURE, not a filter.
 *
 * ⭐⭐ **The point of this module is that adding the eighth filter is one
 * object literal and nothing else.** Catalogue row 18 shipped a single
 * `All | Active | Cancelled` control, and the next question was immediately
 * "can it also filter by rider, by client, by day…". Answering that one
 * control at a time gives seven pieces of state on the page, seven places the
 * chip row has to learn about, and seven chances for the list and the chips to
 * disagree. One registry, and the page knows only `RideFilterValues`.
 *
 * ⚠️ **Production's My Rides has no filter at all** — `CAP-341` photographs it,
 * and it is tabs then rides. So all of this is row 18's proposal and all of it
 * is gated; see `applicableRideFilters`. What is replicated is the SHAPE, from
 * the Requests screen, which does have one.
 *
 * ## What the Requests filter establishes
 *
 * `Project - Map Request View/Help Articles/The Requests Map.md` Part 5, with
 * `CAP-051` (the sheet), `CAP-052` (an option sub-sheet), `CAP-053` (the time
 * range) and `CAP-054` (the chip row and its badge):
 *
 *   · a chip row under the tabs, where **pickup day and pickup time are always
 *     shown** and *"as soon as you set anything else it appears here too"*;
 *   · a filter icon in the header whose badge *"counts the filters you have
 *     added beyond day and time"*;
 *   · `Clear Filters` top right of the sheet, and a full-width `Update`;
 *   · **filters narrow each other** — *"options such as pickup day and pickup
 *     county only offer what is still possible under the filters you have
 *     already applied"*, and a value with nothing behind it *"does not appear
 *     in the list at all"*, rather than appearing greyed;
 *   · the pin icon marks where a trip starts, the flag icon where it ends.
 *
 * ⚠️ **One divergence, on the user's instruction.** Requests always shows day
 * and time; My Rides always shows **status**, and everything else appears only
 * once set. Status is the one that answers "is this ride still on", which is
 * the question the whole row exists for — a driver should never have to open a
 * sheet to find out that they are looking at a filtered manifest.
 *
 * ## ⛔ Two things production does that this does not
 *
 *   · **Multi-select.** The contract says a driver may *"select several
 *     counties at once"*. A value here is one string. Named rather than
 *     silently diverged: widening it later is a change to `RideFilterValues`
 *     and to every `matches`, which is a decision, not a detail.
 *   · **Persistence.** *"Your filters are stored on your phone."* These are
 *     React state and reset on reload, like every other flag in this
 *     prototype.
 */

// ---------------------------------------------------------------------------
// The shape of a filter
// ---------------------------------------------------------------------------

export type RideFilterKey =
  | "status"
  | "rider"
  | "client"
  | "pickupDay"
  | "pickupTime"
  | "pickupLocation"
  | "dropoffLocation";

/**
 * What the driver has set, by key.
 *
 * ⛔ A filter at its DEFAULT is absent from this object rather than present
 * with a default value. Two spellings of "not set" is one too many, and the
 * chip row, the badge and the sheet would each have to know both.
 */
export type RideFilterValues = Readonly<Partial<Record<RideFilterKey, string>>>;

export const NO_RIDE_FILTERS: RideFilterValues = {};

/**
 * Which glyph the chip and the sheet row carry.
 *
 * ⚠️ A NAME, not a component. `lib/` must not import from `lucide-react` — a
 * rule that reaches for an icon is a rule that can only be read by rendering
 * it. The renderer maps these; a check asserts the map is total.
 */
export type RideFilterIcon =
  | "status"
  | "rider"
  | "client"
  | "day"
  | "time"
  | "pickup"
  | "dropoff";

/**
 * How the sheet renders the choice.
 *
 * `chips` is inline on the sheet — production's own treatment for a short,
 * fixed set (`All day · Before noon · Morning · Afternoon · Evening`).
 * `list` is a row showing the current value with `Edit ›`, opening the
 * option sub-sheet `CAP-052` shows, because the options are seeded data and
 * there can be any number of them.
 */
export type RideFilterControl = "chips" | "list";

export interface RideFilterOption {
  value: string;
  label: string;
}

/** An option with how many rides it would leave, under the OTHER filters. */
export interface RideFilterChoice extends RideFilterOption {
  count: number;
}

export interface RideFilterDefinition {
  key: RideFilterKey;
  /** The sheet's section heading. The renderer upper-cases it. */
  label: string;
  /** The sub-sheet's title, and what an unset chip would say. */
  title: string;
  icon: RideFilterIcon;
  control: RideFilterControl;
  /**
   * ⛔ On the chip row whether set or not. Exactly one filter has this, and a
   * check counts them — two always-shown chips is a different design, and
   * three is production's Requests screen rather than this one.
   */
  alwaysOnChipRow: boolean;
  /** The value that narrows nothing. Never stored in `RideFilterValues`. */
  defaultValue: string;
  /** Every value the pool offers, in display order. */
  options(trips: readonly Trip[]): RideFilterOption[];
  /** Whether one ride survives this filter at this value. */
  matches(trip: Trip, value: string): boolean;
  /** What the chip reads once set. */
  chipLabel(value: string): string;
}

// ---------------------------------------------------------------------------
// Reading a ride
// ---------------------------------------------------------------------------

/**
 * ⛔ The FIRST leg is the pick-up and the LAST is the drop-off, for a trip of
 * any length. A two-leg round trip ends where it started, which is correct and
 * is why the two filters can offer the same county.
 */
function pickupCounty(trip: Trip): string {
  return trip.legs[0]?.county ?? "";
}

function dropoffCounty(trip: Trip): string {
  return trip.legs[trip.legs.length - 1]?.county ?? "";
}

/** Distinct values a pool offers, blanks dropped, in the given order. */
function distinct(
  trips: readonly Trip[],
  read: (trip: Trip) => string,
  compare: (a: string, b: string) => number,
): RideFilterOption[] {
  const seen = [...new Set(trips.map(read).filter(Boolean))];
  return seen.sort(compare).map((value) => ({ value, label: value }));
}

const alphabetical = (a: string, b: string) => a.localeCompare(b);

/**
 * ⚠️ By DATE, not by the string. `"Fri, Aug 1, 2026"` sorts before
 * `"Mon, Aug 4, 2026"` alphabetically by luck, and `"Thu, Aug 7"` does not.
 */
const byDate = (a: string, b: string) => parseRideDate(a) - parseRideDate(b);

// ---------------------------------------------------------------------------
// Pick-up time bands
// ---------------------------------------------------------------------------

/**
 * ⛔⛔ **Production shows five chips and never says what they mean**
 * (`CAP-053`), so the boundaries are DECLARED here rather than guessed at
 * silently somewhere in a renderer.
 *
 * ⚠️ `Before noon` and `Morning` deliberately overlap — that is production's
 * own list, and the difference is the small hours: a 3 AM pick-up is before
 * noon and is not morning. Replicating the list means replicating the overlap.
 */
export const PICKUP_TIME_BANDS: ReadonlyArray<{
  value: string;
  label: string;
  /** Inclusive minutes past midnight. */
  from: number;
  to: number;
}> = [
  // ⛔ No band may start before midnight — see `matchesBand`. A negative floor
  // would quietly admit every ride whose pick-up clock cannot be read.
  { value: "all-day", label: "All day", from: 0, to: 1439 },
  { value: "before-noon", label: "Before noon", from: 0, to: 719 },
  { value: "morning", label: "Morning", from: 300, to: 719 },
  { value: "afternoon", label: "Afternoon", from: 720, to: 1019 },
  { value: "evening", label: "Evening", from: 1020, to: 1439 },
];

export const DEFAULT_PICKUP_TIME = "all-day";

function matchesBand(trip: Trip, value: string): boolean {
  if (value === DEFAULT_PICKUP_TIME) return true;
  const band = PICKUP_TIME_BANDS.find((b) => b.value === value);
  if (!band) return true;
  const minutes = clockMinutes(trip.legs[0]?.time);
  /*
    ⛔⛔ **Both ends are compared, and the lower one is what excludes a ride
    with no clock.** `clockMinutes` returns `-1` for a will-call leg, which is
    smaller than midnight — so a band test written as `minutes <= band.to`
    alone files every will-call ride under `Before noon`. Nothing here needs a
    sentinel check of its own: every declared band starts at or after midnight,
    and a check asserts that, because it is the only reason this line is
    enough. (A guard added here first was redundant for exactly that reason and
    a break test proved it: removing it changed no answer.)
  */
  return minutes >= band.from && minutes <= band.to;
}

function bandLabel(value: string): string {
  return PICKUP_TIME_BANDS.find((b) => b.value === value)?.label ?? value;
}

// ---------------------------------------------------------------------------
// The registry
// ---------------------------------------------------------------------------

/**
 * ⛔⛔ **Order is the order the sheet and the chip row read in**, and it is the
 * order the user gave: who the ride is for, then who is paying, then when,
 * then where. Status leads because it is the always-shown one and a chip row
 * whose fixed member moved about as others came and went would be unreadable.
 */
export const RIDE_FILTERS: readonly RideFilterDefinition[] = [
  {
    key: "status",
    label: "Show",
    title: "Status",
    icon: "status",
    control: "chips",
    alwaysOnChipRow: true,
    defaultValue: DEFAULT_RIDES_FILTER,
    options: () => MY_RIDES_FILTERS.map((f) => ({ value: f.key, label: f.label })),
    /**
     * ⛔⛔ **Delegated, never restated.** `applyRidesFilter` is row 18's own
     * rule and `verify-solutions` §31e drives it directly; a second copy of
     * `!isClientCancelled(trip)` here would be a rule that agrees until one of
     * the two is edited. Running it over a one-ride array is the cheapest way
     * to ask it a per-ride question without giving it a second entry point.
     */
    matches: (trip, value) =>
      applyRidesFilter([trip], value as RidesFilter).length === 1,
    chipLabel: (value) => ridesFilterLabel(value as RidesFilter),
  },
  {
    key: "rider",
    label: "Rider",
    title: "Rider",
    icon: "rider",
    control: "list",
    alwaysOnChipRow: false,
    defaultValue: "",
    options: (trips) => distinct(trips, (t) => t.rider, alphabetical),
    matches: (trip, value) => trip.rider === value,
    chipLabel: (value) => value,
  },
  {
    key: "client",
    label: "Client",
    title: "Client",
    icon: "client",
    control: "list",
    alwaysOnChipRow: false,
    defaultValue: "",
    options: (trips) => distinct(trips, (t) => t.client, alphabetical),
    matches: (trip, value) => trip.client === value,
    chipLabel: (value) => value,
  },
  {
    key: "pickupDay",
    label: "Pickup day",
    title: "Pickup Day",
    icon: "day",
    control: "list",
    alwaysOnChipRow: false,
    defaultValue: "",
    options: (trips) => distinct(trips, (t) => t.date, byDate),
    matches: (trip, value) => trip.date === value,
    /**
     * ⚠️ The seed's own string, trimmed of its year — `"Fri, Aug 1, 2026"` →
     * `"Fri, Aug 1"`, which is the form the Requests count line uses.
     *
     * ⛔ The weekday is NOT recomputed. The seed's weekdays are its own fiction
     * (it calls 2026-08-01 a Friday; the real date is a Saturday), so deriving
     * one here would print a different day on the chip than on the card.
     */
    chipLabel: (value) => value.split(",").slice(0, 2).join(",").trim(),
  },
  {
    key: "pickupTime",
    label: "Pickup time range",
    title: "Pickup Time",
    icon: "time",
    control: "chips",
    alwaysOnChipRow: false,
    defaultValue: DEFAULT_PICKUP_TIME,
    options: () => PICKUP_TIME_BANDS.map((b) => ({ value: b.value, label: b.label })),
    matches: matchesBand,
    chipLabel: bandLabel,
  },
  {
    key: "pickupLocation",
    label: "Pickup location",
    title: "Pickup Location",
    icon: "pickup",
    control: "list",
    alwaysOnChipRow: false,
    defaultValue: "",
    options: (trips) => distinct(trips, pickupCounty, alphabetical),
    matches: (trip, value) => pickupCounty(trip) === value,
    chipLabel: (value) => value,
  },
  {
    key: "dropoffLocation",
    label: "Dropoff location",
    title: "Dropoff Location",
    icon: "dropoff",
    control: "list",
    alwaysOnChipRow: false,
    defaultValue: "",
    options: (trips) => distinct(trips, dropoffCounty, alphabetical),
    matches: (trip, value) => dropoffCounty(trip) === value,
    chipLabel: (value) => value,
  },
];

export function rideFilter(key: RideFilterKey): RideFilterDefinition {
  const found = RIDE_FILTERS.find((f) => f.key === key);
  // ⛔ Throws rather than falling back. A missing definition means the key and
  // the registry have drifted, and a no-op filter would narrow nothing while
  // the chip row still showed the driver a control.
  if (!found) throw new Error(`No ride filter definition for "${key}"`);
  return found;
}

// ---------------------------------------------------------------------------
// Reading and writing the set
// ---------------------------------------------------------------------------

/** Set means "away from its default", which is the only sense that matters. */
export function isFilterSet(key: RideFilterKey, values: RideFilterValues): boolean {
  const value = values[key];
  return value !== undefined && value !== rideFilter(key).defaultValue;
}

/**
 * One filter changed.
 *
 * ⛔ Setting a filter back to its default DELETES the key rather than storing
 * the default — see `RideFilterValues`. Everything that asks "is anything set"
 * would otherwise have to ask "…and is it the default", in seven places.
 */
export function withRideFilter(
  values: RideFilterValues,
  key: RideFilterKey,
  value: string,
): RideFilterValues {
  const next: Partial<Record<RideFilterKey, string>> = { ...values };
  if (value === rideFilter(key).defaultValue || value === "") delete next[key];
  else next[key] = value;
  return next;
}

/** What the driver has actually set, in registry order. */
export function setFilterKeys(values: RideFilterValues): RideFilterKey[] {
  return RIDE_FILTERS.filter((f) => isFilterSet(f.key, values)).map((f) => f.key);
}

/**
 * The chips under the tabs: the always-shown one, plus whatever is set.
 *
 * ⚠️ Registry order, not the order they were set in. A chip row that reordered
 * itself as the driver worked would move the one control they are looking for.
 */
export function chipRowKeys(values: RideFilterValues): RideFilterKey[] {
  return RIDE_FILTERS.filter(
    (f) => f.alwaysOnChipRow || isFilterSet(f.key, values),
  ).map((f) => f.key);
}

/**
 * The number on the header icon.
 *
 * ⛔ Filters **beyond** the always-shown one — production's own rule, which the
 * contract states as *"the filters you have added beyond day and time"*.
 *
 * ⚠️ The consequence, named: a driver who sets Status to `Cancelled` and
 * nothing else sees NO badge. That is correct and it is not a gap — the status
 * chip is on screen saying `Cancelled`, so the badge would be counting
 * something already visible. The badge exists for what the chip row would
 * otherwise have to be opened to discover.
 */
export function addedFilterCount(values: RideFilterValues): number {
  return RIDE_FILTERS.filter(
    (f) => !f.alwaysOnChipRow && isFilterSet(f.key, values),
  ).length;
}

/** What the chip reads. The always-shown one says its value even at default. */
export function chipText(key: RideFilterKey, values: RideFilterValues): string {
  const def = rideFilter(key);
  return def.chipLabel(values[key] ?? def.defaultValue);
}

// ---------------------------------------------------------------------------
// Applying
// ---------------------------------------------------------------------------

/**
 * Every set filter, applied.
 *
 * ⛔⛔ **Only ever handed the UPCOMING list.** The driver said it: filtering
 * Needs Action, In Progress or Pending risks hiding work that is waiting on
 * them, and a task list the driver cannot see is worse than no filter at all.
 * Upcoming is the manifest — a read-only answer to "what does my day hold" —
 * and narrowing a manifest loses nothing. `app/my-rides/page.tsx` applies this
 * in one place, and a check asserts the other three tabs never call it.
 */
export function applyRideFilters(
  trips: readonly Trip[],
  values: RideFilterValues,
): Trip[] {
  return setFilterKeys(values).reduce<Trip[]>(
    (pool, key) => pool.filter((trip) => rideFilter(key).matches(trip, values[key]!)),
    [...trips],
  );
}

/**
 * The options one filter should offer, and what each would leave.
 *
 * ⛔⛔ **Filters narrow each other** — production's documented behaviour, and
 * the reason the counts are computed against every filter EXCEPT this one. If
 * the pick-up county is Fulton and no Fulton ride ever ends in Lee, Lee is not
 * offered under drop-off, which is how a driver learns that the pair does not
 * exist rather than selecting it and getting an empty list.
 *
 * ⛔ A zero-count option is ABSENT, not greyed — *"a day with no trips does not
 * appear in the list at all"*.
 *
 * ⚠️ Two exceptions, both so the sheet can never disagree with the chip row:
 * the filter's own DEFAULT is always offered (otherwise there is no way back
 * to "all"), and the CURRENTLY SET value is always offered even at zero — it is
 * on a chip the driver can see, and a sheet that omitted it would leave them
 * looking for a control that is not there.
 */
export function narrowedOptions(
  key: RideFilterKey,
  trips: readonly Trip[],
  values: RideFilterValues,
): RideFilterChoice[] {
  const def = rideFilter(key);
  const others: Partial<Record<RideFilterKey, string>> = { ...values };
  delete others[key];
  const pool = applyRideFilters(trips, others);
  const selected = values[key] ?? def.defaultValue;
  return def
    .options(trips)
    .map((option) => ({
      ...option,
      count: pool.filter((trip) => def.matches(trip, option.value)).length,
    }))
    .filter(
      (option) =>
        option.count > 0 ||
        option.value === selected ||
        option.value === def.defaultValue,
    );
}

// ---------------------------------------------------------------------------
// The gate
// ---------------------------------------------------------------------------

/**
 * The filters that actually apply, once the proposal is taken back out.
 *
 * ⛔⛔ **ONE gate for the whole feature, and it is row 18's own.** Production's
 * My Rides has no filter, so in `"now"` there is nothing to show, nothing to
 * count and nothing to undo — and every value has to strip, not just the
 * status one. A second predicate here that happened to agree today is the
 * shape row 10 shipped a hidden filter in; `showsCancelledRides` is imported
 * rather than restated, and a check drives this function and
 * `applicableRidesFilter` over every focus to prove they never diverge.
 *
 * ⭐ It strips rather than refusing, for the same reason `applicableFilters`
 * does on Requests: a selection that survives a mode flip then lands on the
 * full manifest instead of an empty one.
 */
export function applicableRideFilters(
  values: RideFilterValues,
  focus: DemoFocus,
): RideFilterValues {
  return showsCancelledRides(focus) ? values : NO_RIDE_FILTERS;
}

/** Whether the chip row, the header icon and the sheet are offered at all. */
export function showsRidesFilter(focus: DemoFocus): boolean {
  return showsCancelledRides(focus);
}

/**
 * ⚠️ Re-exported so the page has ONE import for the filter feature, and so the
 * status filter's own fallback stays reachable to anything still phrased in
 * `RidesFilter` terms.
 */
export { applicableRidesFilter };

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------

/** `CAP-051`'s own words, with this screen's noun. */
export const FILTER_SHEET_TITLE = "Filter Rides";
export const FILTER_CLEAR_LABEL = "Clear Filters";
export const FILTER_UPDATE_LABEL = "Update";
export const FILTER_EDIT_LABEL = "Edit";
/** What a `list` row reads when its filter is unset. */
export const FILTER_ANY_LABEL = "Any";
export const FILTER_EMPTY_TITLE = "No rides match these filters";
export const FILTER_EMPTY_BODY = "Clear filters to see more rides.";

export const RIDE_FILTER_PROVENANCE = {
  /** The sheet, the chip row and the badge. */
  shape: ["CAP-051", "CAP-052", "CAP-053", "CAP-054"],
  /** The behaviour — narrowing, the badge's rule, absent-not-greyed. */
  contract: "Project - Map Request View/Help Articles/The Requests Map.md, Part 5",
  /** That My Rides has one at all. */
  feature: "ours — catalogue row 18",
} as const;
