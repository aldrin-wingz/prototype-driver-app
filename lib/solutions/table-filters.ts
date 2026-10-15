import {
  CLASS_LABEL,
  SOLUTIONS,
  buildStateLabel,
  type Solution,
  type SolutionClass,
} from "./catalogue";

/**
 * Filters over the feature table — **a filter FEATURE, not two filters.**
 *
 * ⭐ The same shape `lib/driver-data/ride-filters.ts` took for My Rides, and
 * for the same reason the user gave then: *"the solution is not just one filter
 * but building a filter feature that we can then add more options"*. A new
 * filter is one object literal in `TABLE_FILTERS`; the control renders the
 * registry and names no key.
 *
 * ⛔⛔ **A separate registry from the rides one, deliberately.** That one is
 * keyed to `Trip` and to ride vocabulary — rider, client, pick-up day. This one
 * filters catalogue rows in the dev selector. One registry serving both would
 * have to be generic over two unrelated entity types to save two literals.
 *
 * ⚠️ Prototyping tooling, not a driver-facing surface. (User direction
 * 2026-10-15: *"For the sake of prototyping and focus"*.)
 */

// ---------------------------------------------------------------------------
// Two control shapes, because the two questions are different shapes
// ---------------------------------------------------------------------------
/**
 * ⭐⭐ **`klass` is MULTI-SELECT, and that is the whole point of the second
 * ask.** It was three independent on/off/all predicates for one commit, which
 * could not express *"see both app surface and in-app form at the same time"*
 * — two `Only` filters over one attribute AND together to nothing, always.
 * Ticking the kinds you want says it directly, and it still expresses every
 * state the tri-state could: *only forms* is the other two unticked, *hide
 * forms* is forms unticked, *all* is all three. Nothing was lost by changing
 * it. (User direction 2026-10-15.)
 *
 * ⛔ `buildState` stays a TRI-STATE, because it is a genuine yes/no property of
 * a row rather than a set of values to pick from. Making it a two-chip
 * multi-select would dress one question up as two.
 */
export type TableFilterControl = "multi" | "tri";

export const FILTER_ALL = "all";
export const FILTER_ONLY = "only";
export const FILTER_HIDE = "hide";

export type TableFilterState =
  | typeof FILTER_ALL
  | typeof FILTER_ONLY
  | typeof FILTER_HIDE;

/**
 * ⛔ Declared as a list, in render order, so the segmented control draws the
 * registry rather than three hard-coded buttons. `FILTER_ALL` is first because
 * it is the default, and a control whose default sits in the middle reads as a
 * middle setting rather than as "off".
 */
export const FILTER_STATES: ReadonlyArray<{ value: TableFilterState; label: string }> = [
  { value: FILTER_ALL, label: "All" },
  { value: FILTER_ONLY, label: "Only" },
  { value: FILTER_HIDE, label: "Hide" },
];

export const DEFAULT_FILTER_STATE: TableFilterState = FILTER_ALL;

export type TableFilterKey = "klass" | "inPrototype";

/**
 * One string per filter, exactly like the rides registry.
 *
 * ⚠️ A `multi` filter stores the values that are ON, comma-joined in the
 * registry's own order. ⛔ Not the ones that are OFF: a filter nobody has
 * touched then stores the empty string, which is indistinguishable from
 * "everything unticked" — the one state that empties the table.
 */
export type TableFilterValues = Readonly<Partial<Record<TableFilterKey, string>>>;

export const NO_TABLE_FILTERS: TableFilterValues = {};

interface MultiFilter {
  key: TableFilterKey;
  label: string;
  control: "multi";
  /** Every value, in render order. ⛔ Labels are the catalogue's own. */
  values: ReadonlyArray<{ value: string; label: string }>;
  valueOf(row: Solution): string;
}

interface TriFilter {
  key: TableFilterKey;
  /**
   * What the filter is ABOUT, read as the subject of the three states.
   *
   * ⛔⛔ Taken from the catalogue's own label map, never retyped. "In
   * prototype" is project vocabulary locked at scaffold ("In prototype" /
   * "⚠️ Not in prototype yet", never BUILT/NOT-BUILT), and a filter spelling it
   * its own way would be a second vocabulary nobody agreed.
   */
  label: string;
  control: "tri";
  /** True when the row IS the thing `label` names. */
  predicate(row: Solution): boolean;
}

export type TableFilterDefinition = MultiFilter | TriFilter;

/**
 * ⛔ Declared in `SolutionClass` order, and the labels come from `CLASS_LABEL`.
 * Retyping "App surface" here would be a second vocabulary for the column the
 * table already prints.
 */
const KLASS_VALUES: ReadonlyArray<{ value: SolutionClass; label: string }> = [
  { value: "form", label: CLASS_LABEL.form },
  { value: "surface", label: CLASS_LABEL.surface },
  { value: "no-app-surface", label: CLASS_LABEL["no-app-surface"] },
];

export const TABLE_FILTERS: readonly TableFilterDefinition[] = [
  {
    key: "klass",
    label: "Kind",
    control: "multi",
    values: KLASS_VALUES,
    valueOf: (row) => row.klass,
  },
  {
    key: "inPrototype",
    label: buildStateLabel("in-prototype"),
    control: "tri",
    predicate: (row) => row.buildState === "in-prototype",
  },
];

export function tableFilter(key: TableFilterKey): TableFilterDefinition {
  const found = TABLE_FILTERS.find((f) => f.key === key);
  // ⛔ Throws rather than falling back. A filter that silently became a no-op
  // would narrow nothing while the control still showed a state selected.
  if (!found) throw new Error(`Unknown table filter: ${key}`);
  return found;
}

// ---------------------------------------------------------------------------
// Reading a filter's current state
// ---------------------------------------------------------------------------
/** For a `tri` filter. */
export function filterState(key: TableFilterKey, values: TableFilterValues): TableFilterState {
  const raw = values[key];
  return raw === FILTER_ONLY || raw === FILTER_HIDE ? raw : DEFAULT_FILTER_STATE;
}

/**
 * For a `multi` filter — the values currently ticked.
 *
 * ⛔ An ABSENT key means every value, which is the default. An EMPTY string
 * means none, which is a real state a driver of this table can reach by
 * unticking the last chip; the empty-table row is what answers it.
 */
export function multiOn(filter: MultiFilter, values: TableFilterValues): string[] {
  const raw = values[filter.key];
  if (raw === undefined) return filter.values.map((v) => v.value);
  return raw === "" ? [] : raw.split(",");
}

export function isMultiValueOn(
  filter: MultiFilter,
  value: string,
  values: TableFilterValues,
): boolean {
  return multiOn(filter, values).includes(value);
}

// ---------------------------------------------------------------------------
// Writing one
// ---------------------------------------------------------------------------
/**
 * ⛔ A filter back at its default is DELETED, not stored as the default.
 *
 * Otherwise `addedTableFilterCount` has to know which stored values mean "off",
 * and two representations of one state are two things that can disagree.
 */
export function withTableFilter(
  values: TableFilterValues,
  key: TableFilterKey,
  state: TableFilterState,
): TableFilterValues {
  const next = { ...values };
  if (state === DEFAULT_FILTER_STATE) delete next[key];
  else next[key] = state;
  return next;
}

/** Tick or untick one value of a `multi` filter. */
export function toggleMultiValue(
  values: TableFilterValues,
  filter: MultiFilter,
  value: string,
): TableFilterValues {
  const on = multiOn(filter, values);
  const next = on.includes(value) ? on.filter((v) => v !== value) : [...on, value];
  // ⛔ Re-sorted into the REGISTRY's order, never the order they were clicked.
  // The stored string is compared against "every value" to decide whether this
  // filter is narrowing at all, and a click-ordered string would never match.
  const ordered = filter.values.map((v) => v.value).filter((v) => next.includes(v));
  const out = { ...values };
  if (ordered.length === filter.values.length) delete out[filter.key];
  else out[filter.key] = ordered.join(",");
  return out;
}

/** How many filters are actually narrowing — for the "showing N of M" line. */
export function addedTableFilterCount(values: TableFilterValues): number {
  return TABLE_FILTERS.filter((f) => values[f.key] !== undefined).length;
}

// ---------------------------------------------------------------------------
// Applying them
// ---------------------------------------------------------------------------
/**
 * The rows a set of filter states leaves standing.
 *
 * ⛔⛔ **Order is preserved, and that matters more here than on a list of
 * rides.** `tableRows()` reconstructs the spreadsheet's merged cells by walking
 * ADJACENT rows of equal text — so the merges are recomputed over whatever this
 * returns. Reordering would merge rows the spreadsheet never merged; dropping
 * rows is fine and is the point, because two surviving rows of one subject area
 * genuinely do share that area's cell in a narrowed view.
 */
export function applyTableFilters(
  rows: readonly Solution[],
  values: TableFilterValues,
): Solution[] {
  return rows.filter((row) =>
    TABLE_FILTERS.every((filter) => {
      if (filter.control === "multi") {
        return multiOn(filter, values).includes(filter.valueOf(row));
      }
      const state = filterState(filter.key, values);
      if (state === FILTER_ALL) return true;
      return filter.predicate(row) === (state === FILTER_ONLY);
    }),
  );
}

/**
 * The number beside each segment of each filter.
 *
 * ⚠️ Both are computed against the OTHER filters' current states, so neither
 * promises rows the next render does not show.
 *
 * ⛔⛔ **The two shapes count DIFFERENT things, and they have to.** A tri-state
 * segment counts what pressing it would leave — "All 28 / Only 14 / Hide 14"
 * reads exactly that way. A multi CHIP counts the rows carrying its own value,
 * because the chip is usually already on and "what pressing this would leave"
 * is then the count with it REMOVED: walked and found, `In-app form 17` sat
 * beside a ticked chip on a catalogue holding eleven forms. A number on a
 * ticked chip is read as a count OF that chip, so that is what it is.
 */
export function tableFilterCounts(
  values: TableFilterValues,
  rows: readonly Solution[] = SOLUTIONS,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const filter of TABLE_FILTERS) {
    if (filter.control === "multi") {
      for (const { value } of filter.values) {
        // ⛔ This filter narrowed to that ONE value, the others left alone:
        // "how many rows of this kind survive everything else".
        out[`${filter.key}:${value}`] = applyTableFilters(rows, {
          ...values,
          [filter.key]: value,
        }).length;
      }
    } else {
      for (const { value } of FILTER_STATES) {
        out[`${filter.key}:${value}`] = applyTableFilters(
          rows,
          withTableFilter(values, filter.key, value),
        ).length;
      }
    }
  }
  return out;
}

/**
 * Subject areas with at least one visible row.
 *
 * ⛔⛔ **And there is deliberately NO filtered call total beside it.** `calls`
 * is the SUBJECT AREA's figure, shared across that area's rows, so an area
 * whose three rows become one has not lost two thirds of its calls — the calls
 * were never attributable to a row. Printing a narrowed total would be the
 * header inventing an attribution the source file does not make. The fixed
 * denominator sentence stays instead, because it is true at every filter state.
 */
export function visibleSubjectAreas(rows: readonly Solution[]): number {
  return new Set(rows.map((row) => row.subjectArea)).size;
}

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------
export const TABLE_FILTER_EMPTY_TITLE = "No features match these filters";
/**
 * ⛔ Generic, and it has to be. The combinations that empty the table today do
 * so because of facts about the catalogue right now — every `form` row happens
 * to be built, and unticking every kind leaves nothing by construction. Baking
 * either reason into the copy would leave a sentence explaining something that
 * had stopped being the reason, on the one screen with nothing else on it.
 */
export const TABLE_FILTER_EMPTY_BODY =
  "No catalogue row matches every filter you have set.";
export const TABLE_FILTER_CLEAR_LABEL = "Clear filters";
