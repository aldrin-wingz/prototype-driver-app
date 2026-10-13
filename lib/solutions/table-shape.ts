import { SOLUTIONS, type Solution } from "./catalogue";

/**
 * The catalogue rendered back into the shape of the spreadsheet it came from.
 *
 * ⭐ The source file merges cells: one Subject Area spans its Problems, one
 * Problem spans its Use Cases, and the Proposed Feature column never merges.
 * None of that is stored — `catalogue.ts` reconstructs a merged cell by
 * REPEATING its text on every row it covered. So the merges are recoverable
 * exactly, by grouping adjacent rows on string equality, and the table needs no
 * new data to look like its source.
 *
 * ⛔ A run is adjacency-sensitive on purpose. Two rows with the same Problem
 * separated by a third row are two runs, not one — which is what the
 * spreadsheet means and what a `group by` would silently destroy.
 *
 * ⚠️ This lives in `lib/` rather than inside the table component because it is
 * a rule about the data, not a rendering detail. A span computed in JSX is a
 * span no check can reach.
 */

export interface TableRow {
  solution: Solution;
  /**
   * How many rows this cell covers. **0 means "render nothing"** — the row
   * above already covers this one, which is exactly what a merged cell is.
   */
  areaSpan: number;
  problemSpan: number;
  useCaseSpan: number;
  /**
   * The ids this row's Use Case cell covers — itself plus every row merged
   * under it. `[]` when the cell is not rendered here (`useCaseSpan === 0`).
   *
   * ⚠️ Needed because the Use Case cell is a CONTROL as of B6, and a merged
   * one speaks for its whole run: focusing row 10 has to light the cell that
   * row 09 draws, or the selected row has no highlight at all. Computed here
   * rather than in the table, for the same reason the spans are — a rule about
   * the data, reachable by a check.
   */
  useCaseRunIds: readonly string[];
}

/**
 * Span of the run starting at `index`, or 0 when `index` is inside a run that
 * started earlier.
 *
 * ⛔ Keys are TUPLES compared element-wise, never joined into one string. The
 * first version joined on a separator and the separator it used turned into a
 * real NUL byte in the source — invisible in every editor, unmatched by every
 * search, and the reason a break test silently patched nothing and "passed".
 * A tuple needs no separator, so no value in the data can ever collide with one.
 */
function sameKey(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((part, i) => part === b[i]);
}

function runSpan(keys: readonly string[][], index: number): number {
  if (index > 0 && sameKey(keys[index - 1], keys[index])) return 0;
  let span = 1;
  while (index + span < keys.length && sameKey(keys[index + span], keys[index])) span++;
  return span;
}

export function tableRows(): TableRow[] {
  const ordered = [...SOLUTIONS].sort((a, b) => a.order - b.order);

  // ⛔ Each key INCLUDES the keys above it. A Problem repeated under a
  // different Subject Area is a different cell in the spreadsheet, and keying
  // on the problem alone would merge across the area boundary — producing a
  // rowspan that reaches into the next area and a table that cannot be read.
  const areaKeys = ordered.map((s) => [s.subjectArea]);
  const problemKeys = ordered.map((s) => [s.subjectArea, s.problem]);
  const useCaseKeys = ordered.map((s) => [s.subjectArea, s.problem, s.useCase]);

  return ordered.map((solution, i) => {
    const useCaseSpan = runSpan(useCaseKeys, i);
    return {
      solution,
      areaSpan: runSpan(areaKeys, i),
      problemSpan: runSpan(problemKeys, i),
      useCaseSpan,
      // ⛔ Sliced from the SAME span the cell is rendered with, so the two can
      // never disagree about how far the merge reaches. A separately computed
      // run would be a second opinion about the same fact.
      useCaseRunIds: ordered.slice(i, i + useCaseSpan).map((s) => s.id),
    };
  });
}

/** How many merged cells each column carries — i.e. runs longer than one row. */
export function mergedRunCounts(rows: TableRow[] = tableRows()): {
  area: number;
  problem: number;
  useCase: number;
} {
  return {
    area: rows.filter((r) => r.areaSpan > 1).length,
    problem: rows.filter((r) => r.problemSpan > 1).length,
    useCase: rows.filter((r) => r.useCaseSpan > 1).length,
  };
}
