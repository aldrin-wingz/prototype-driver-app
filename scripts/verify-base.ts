/**
 * Gate 2 for `prototype/driver-app-base`.
 *
 * This repo has no test framework, so this script is the assertion gate. It
 * guards the two things the base exists to guarantee:
 *
 *   1. the base carries only SHIPPED behaviour — no feature namespace leaks in
 *   2. every Ride Details phase is reachable from the seed
 *
 * ⚠️ EVERY CHECK REPORTS A DENOMINATOR. A matcher that matches nothing and a
 * matcher that is merely rarely satisfied look identical from a pass/fail bit,
 * so a check that cannot say how many things it looked at is not evidence. Each
 * `check` below prints its own count, and a count of zero where one is expected
 * is itself a failure.
 *
 * Run: bun run verify
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import {
  getLegStage,
  getNextSwipe,
  mockRequestTrips,
  mockNeedsActionTrips,
  mockUpcomingTrips,
  mockInProgressTrips,
  mockCompletedTrips,
  type Trip,
  type LegSwipeStage,
} from "../lib/driver-data/mock-trips";

// ⚠️ fileURLToPath, not URL.pathname — the vault path contains spaces, which
// pathname percent-encodes into a directory that does not exist.
const SELF = fileURLToPath(import.meta.url);
const ROOT = dirname(dirname(SELF));
let failures = 0;

function check(label: string, detail: string, ok: boolean) {
  console.log(`${ok ? "  ok  " : "  FAIL"} ${label} — ${detail}`);
  if (!ok) failures++;
}

function sourceFiles(): string[] {
  const out: string[] = [];
  const skip = new Set(["node_modules", ".next", ".git", "references", "public"]);
  (function walk(dir: string) {
    for (const entry of readdirSync(dir)) {
      if (skip.has(entry)) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      // The verifier names every forbidden pattern, so scanning it finds itself.
      else if (/\.tsx?$/.test(entry) && full !== SELF) out.push(full);
    }
  })(ROOT);
  return out;
}

// ---------------------------------------------------------------------------
console.log("\n1. Feature-namespace boundary");
// ---------------------------------------------------------------------------
// The failure this base exists to prevent: an unagreed feature arriving through
// a shared file. Anything importing these namespaces is not shipped behaviour.
const FORBIDDEN = [
  "@/lib/support",
  "@/lib/support-data",
  "@/components/support",
  "@/components/dev",
  "@/lib/messages-data",
  "@/components/chat",
  "no-show-rules",
  "use-no-show-clock",
];
const files = sourceFiles();
check("source files scanned", `${files.length} .ts/.tsx files`, files.length > 50);

const offenders: string[] = [];
for (const f of files) {
  const text = readFileSync(f, "utf8");
  for (const ns of FORBIDDEN) {
    if (text.includes(ns)) offenders.push(`${relative(ROOT, f)} -> ${ns}`);
  }
}
check(
  "no forbidden imports",
  offenders.length ? offenders.join("; ") : `0 hits across ${FORBIDDEN.length} namespaces`,
  offenders.length === 0,
);

const ORPHANS = [
  "lib/support", "lib/support-data", "components/support", "components/dev",
  "lib/messages-data", "components/chat", "lib/driver-data/no-show-rules.ts",
  "types/support.ts", "hooks/use-no-show-clock.ts", "app/my-rides/[id]/no-show",
];
const present = ORPHANS.filter((p) => existsSync(join(ROOT, p)));
check(
  "no feature directories on disk",
  present.length ? present.join(", ") : `0 of ${ORPHANS.length} present`,
  present.length === 0,
);

// ---------------------------------------------------------------------------
console.log("\n2. Seed integrity");
// ---------------------------------------------------------------------------
const pools: Array<[string, Trip[]]> = [
  ["requests", mockRequestTrips],
  ["needs-action", mockNeedsActionTrips],
  ["upcoming", mockUpcomingTrips],
  ["in-progress", mockInProgressTrips],
  ["completed", mockCompletedTrips],
];
const all = pools.flatMap(([, t]) => t);
check(
  "trip pools populated",
  pools.map(([n, t]) => `${n}=${t.length}`).join(" "),
  pools.every(([, t]) => t.length > 0),
);

const ids = all.map((t) => t.id);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
check("trip ids unique", dupes.length ? `dupes: ${[...new Set(dupes)].join(", ")}` : `${ids.length} ids, 0 duplicates`, dupes.length === 0);

const noLegs = all.filter((t) => t.legs.length === 0).map((t) => t.id);
check("every trip has legs", noLegs.length ? noLegs.join(", ") : `${all.length} trips, all with legs`, noLegs.length === 0);

// ---------------------------------------------------------------------------
console.log("\n3. Ride Details phases are reachable");
// ---------------------------------------------------------------------------
// The swipe stage is derived ENTIRELY from which marks a leg carries, so the
// seed is the only thing that makes a phase reachable. A stage missing here
// silently removes a screen from the app.
const STAGES: LegSwipeStage[] = ["not-started", "started", "picked-up", "completed"];
const swipeLegs = all.flatMap((t) => t.legs.filter((l) => l.progress));
check("legs carrying swipe progress", `${swipeLegs.length} legs`, swipeLegs.length > 0);

for (const stage of STAGES) {
  const n = swipeLegs.filter((l) => getLegStage(l) === stage).length;
  check(`stage "${stage}" seeded`, `${n} of ${swipeLegs.length} legs`, n > 0);
}

const missingNext = swipeLegs.filter(
  (l) => getLegStage(l) !== "completed" && getNextSwipe(l) === null,
);
check(
  "every unfinished leg has a next swipe",
  missingNext.length ? `${missingNext.length} without one` : `${swipeLegs.filter((l) => getLegStage(l) !== "completed").length} unfinished legs, all resolved`,
  missingNext.length === 0,
);

// marks must fill left to right — a leg cannot be picked up before it started
const outOfOrder = swipeLegs.filter((l) => {
  const p = l.progress!;
  return (p.pickedUpAt && !p.startedAt) || (p.droppedOffAt && !p.pickedUpAt);
});
check(
  "swipe marks fill in order",
  outOfOrder.length ? `${outOfOrder.length} out of order` : `${swipeLegs.length} legs, none out of order`,
  outOfOrder.length === 0,
);

// all four detail states must be produced by real seed data
const detailStates = new Set<string>();
for (const t of all) {
  if (t.status === "completed") detailStates.add("completed");
  else if (t.status === "upcoming") detailStates.add("before-taken");
  else if (t.status === "in-progress") detailStates.add("in-progress");
  else detailStates.add("needs-action");
}
for (const s of ["before-taken", "in-progress", "needs-action", "completed"]) {
  const n = all.filter((t) =>
    s === "completed" ? t.status === "completed"
    : s === "before-taken" ? t.status === "upcoming"
    : s === "in-progress" ? t.status === "in-progress"
    : !["completed", "upcoming", "in-progress"].includes(t.status),
  ).length;
  check(`detail state "${s}" reachable`, `${n} of ${all.length} trips`, n > 0);
}

// ---------------------------------------------------------------------------
console.log("\n4. Colour tokens are literal strings");
// ---------------------------------------------------------------------------
// A Tailwind colour utility built by interpolation compiles to nothing, with no
// build error. Tokens must be used as values (style/inline), never spliced into
// a class name.
const colorsSrc = readFileSync(join(ROOT, "constants/driver-app-colors.ts"), "utf8");
const tokens = [...colorsSrc.matchAll(/export const (\w+) = "(#[0-9A-Fa-f]{3,8})"/g)];
check("colour tokens declared", `${tokens.length} tokens`, tokens.length > 0);

const interpolated: string[] = [];
for (const f of files) {
  const text = readFileSync(f, "utf8");
  for (const [, name] of tokens) {
    // e.g. `bg-[${DRIVER_TEAL}]` — a class name built at runtime
    if (new RegExp(`(bg|text|border|ring|fill|stroke)-\\[\\$\\{${name}\\}\\]`).test(text)) {
      interpolated.push(`${relative(ROOT, f)}: ${name}`);
    }
  }
}
check(
  "no token interpolated into a class name",
  interpolated.length ? interpolated.join("; ") : `0 hits across ${tokens.length} tokens x ${files.length} files`,
  interpolated.length === 0,
);

// ---------------------------------------------------------------------------
console.log("\n5. Seeded rider names are invented");
// ---------------------------------------------------------------------------
// Names in the production captures belong to real members and must never reach
// the seed. This list is the set observed in captures; it is a floor, not a
// guarantee, and is why the seed header states the rule.
const CAPTURE_NAMES = [
  "KALLIYAH TYSON", "WINDY PRECISE", "STEPHANIE FIELDS", "MARCUS WHITFIELD",
  "HAROLD NIXON", "DENISE ALVARADO", "DOROTHY MASON", "Jackie Giese",
];
const seed = readFileSync(join(ROOT, "lib/driver-data/mock-trips.ts"), "utf8");
const leaked = CAPTURE_NAMES.filter((n) => seed.includes(n));
check(
  "no capture-derived rider names",
  leaked.length ? leaked.join(", ") : `0 of ${CAPTURE_NAMES.length} known names present`,
  leaked.length === 0,
);

// ---------------------------------------------------------------------------
console.log(
  failures === 0
    ? "\n✅ verify-base: all checks passed\n"
    : `\n❌ verify-base: ${failures} check(s) failed\n`,
);
process.exit(failures === 0 ? 0 : 1);
