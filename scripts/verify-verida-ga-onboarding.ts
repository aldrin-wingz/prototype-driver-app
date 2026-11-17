/**
 * FEATURE verify — Verida GA onboarding (prototype/verida-ga-onboarding).
 *
 *   bun scripts/verify-verida-ga-onboarding.ts
 *
 * Every check prints its denominator, so "passed" and "matched nothing" cannot look alike.
 * Each was broken on purpose once and seen to fail (see the Working Plan change log).
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  PRE_MARKET_STAGE_TITLES,
  driverFields,
  marketIdFor,
  marketKeyFor,
  marketOptions,
  resolveFieldLink,
  stagesVisibleTo,
  templateFor,
} from "../lib/verida-ga-onboarding/market-flow";

let failed = 0;
function check(name: string, detail: string, ok: boolean) {
  console.log(`${ok ? "✅" : "❌"} ${name} — ${detail}`);
  if (!ok) failed++;
}

const DIR = join(process.cwd(), "lib", "verida-ga-onboarding");
const titles = (list: { title: string }[]) => list.map((s) => s.title);

const GA_ONLY = [
  "Background Check Fee",
  "Initial Training",
  "Pre-Verida Training Check",
  "Verida Training",
  "Pre-activation Training",
];
const REMOVED_IN_GA = ["CTAA PASS Training", "Drug Screening", "Training"];

// 1. The shared file is the one the portal exported.
const bytes = readFileSync(join(DIR, "payloads.json"));
const expected = readFileSync(join(DIR, "payloads.json.sha256"), "utf8").trim();
const actual = createHash("sha256").update(bytes).digest("hex");
check("payloads.json matches its exported sha256", `${actual.slice(0, 12)} vs ${expected.slice(0, 12)} (${bytes.length} bytes)`, actual === expected);

// 2. Before a market: the pre-market stages and nothing else.
const pre = titles(stagesVisibleTo(null));
check(
  "no market ⇒ only the pre-market stages",
  `${pre.length} listed: ${pre.join(" · ")}`,
  pre.length === 2 && pre.join("|") === PRE_MARKET_STAGE_TITLES.join("|"),
);

// 3. Georgia: 16, every GA-only stage present, every removed stage absent.
const ga = titles(stagesVisibleTo("verida-ga"));
const gaMissing = GA_ONLY.filter((t) => !ga.includes(t));
const gaLeaked = REMOVED_IN_GA.filter((t) => ga.includes(t));
check("Georgia lists 16 stages", `${ga.length}`, ga.length === 16);
check("Georgia carries all 5 GA-only stages", gaMissing.length ? `missing ${gaMissing.join(", ")}` : `5 of 5`, gaMissing.length === 0);
check("Georgia carries none of the 3 removed stages", gaLeaked.length ? `leaked ${gaLeaked.join(", ")}` : `0 of 3`, gaLeaked.length === 0);

// 4. Every other market: no GA-only stage; the removed ones still there.
const other = titles(stagesVisibleTo("non-ga"));
const otherLeaked = GA_ONLY.filter((t) => other.includes(t));
const otherMissing = REMOVED_IN_GA.filter((t) => !other.includes(t));
check("other markets carry no GA-only stage", otherLeaked.length ? `leaked ${otherLeaked.join(", ")}` : `0 of ${GA_ONLY.length}`, otherLeaked.length === 0);
check("other markets keep CTAA, Drug Screening, Training", otherMissing.length ? `missing ${otherMissing.join(", ")}` : `3 of 3`, otherMissing.length === 0);

// 5. Both flows begin with the same pre-market stages, so revealing never reorders what was shown.
check(
  "both flows start with the pre-market stages",
  `${ga.slice(0, 2).join(" · ")} | ${other.slice(0, 2).join(" · ")}`,
  ga.slice(0, 2).join("|") === pre.join("|") && other.slice(0, 2).join("|") === pre.join("|"),
);

// 6. The market rule.
const cases: [string | null, string | null][] = [
  [null, null],
  ["", null],
  ["Georgia", "verida-ga"],
  [" georgia ", "verida-ga"],
  ["Florida", "non-ga"],
  ["Tennessee", "non-ga"],
];
const wrong = cases.filter(([input, out]) => marketKeyFor(input) !== out);
check("marketKeyFor", wrong.length ? `wrong for ${wrong.map(([i]) => JSON.stringify(i)).join(", ")}` : `${cases.length} of ${cases.length} cases`, wrong.length === 0);

// 7. The market answer list comes from the template, and offers both demo markets.
const opts = marketOptions();
check("market options read from the template", `${opts.length} options`, opts.length > 10 && opts.includes("Georgia") && opts.includes("Florida"));

// 8. The driver never sees an internal field.
const allSteps = [...templateFor("verida-ga"), ...templateFor("non-ga")].flatMap((s) => s.steps);
const internal = allSteps.flatMap((st) => st.field_definitions).filter((f) => f.visibility === "internal").length;
const leakedInternal = allSteps.flatMap(driverFields).filter((f) => f.visibility === "internal").length;
check("internal fields filtered from the driver view", `${leakedInternal} shown of ${internal} internal`, internal > 0 && leakedInternal === 0);

// 9. Nothing personal shipped in the shared file.
const text = bytes.toString("utf8");
// Capture the value and compare it: a `(?!null)` lookahead after `\s*` backtracks past the space
// and matches `" null"` — it reported 311 staff names in a file with none.
const updatedByValues = [...text.matchAll(/"updated_by":\s*([^\s,}][^,}\n]*)/g)].map((m) => m[1].trim());
const updatedBy = updatedByValues.filter((v) => v !== "null").length;
const stampedVideo = (text.match(/"video_url":\s*"[^"]*[?&](email|first_name|last_name)=/g) ?? []).length;
check("no staff names in updated_by", `${updatedBy} non-null of ${updatedByValues.length}`, updatedByValues.length > 0 && updatedBy === 0);
check("no per-driver stamped video URLs", `${stampedVideo} found`, stampedVideo === 0);

// Images and links (the September prototype's assets, now rendered in the app).
const payloadText = readFileSync(join(DIR, "payloads.json"), "utf8");
const assetRefs = [...new Set([...payloadText.matchAll(/"(\/dev\/[^"]+)"/g)].map((m) => m[1]))];
const missingAssets = assetRefs.filter((r) => !existsSync(join(process.cwd(), "public", r)));
check("every image / file the stages reference is in public/", `${assetRefs.length - missingAssets.length} of ${assetRefs.length}${missingAssets.length ? ` — missing ${missingAssets.join(", ")}` : ""}`, assetRefs.length > 0 && missingAssets.length === 0);

const bookButton = (market: "verida-ga" | "non-ga") => {
  for (const st of stagesVisibleTo(market)) for (const step of st.steps) for (const f of step.field_definitions) if (f.slug === "book_vehicle_inspection_button") return f;
  return null;
};
const LINK_CASES: [string, "verida-ga" | "non-ga", string, RegExp][] = [
  ["Georgia → Bright Inspect", "verida-ga", "Georgia", /book\.brightinspect\.com\/verida/],
  ["Florida → Rideshare Mechanic (with category)", "non-ga", "Florida", /book\.ridesharemechanic\.com\/Home\?categoryId=/],
  ["Tennessee → RMI", "non-ga", "Tennessee", /rmi-inspections\.com/],
  ["Louisiana → Rideshare Mechanic (no market entry)", "non-ga", "Louisiana", /book\.ridesharemechanic\.com/],
];
const linkMisses = LINK_CASES.filter(([, m, state, re]) => {
  const f = bookButton(m);
  return !f || !re.test(resolveFieldLink(f, marketIdFor(state)) ?? "");
}).map(([n]) => n);
check("inspection link resolves per market", `${LINK_CASES.length - linkMisses.length} of ${LINK_CASES.length}${linkMisses.length ? ` — wrong: ${linkMisses.join(", ")}` : ""}`, linkMisses.length === 0);

const linkless: string[] = [];
let buttonCount = 0;
for (const st of stagesVisibleTo("verida-ga")) for (const step of st.steps) for (const f of driverFields(step)) {
  if (f.field_type !== "button" && f.field_type !== "video") continue;
  if ((f.metadata as { hide_on_mobile?: boolean } | null | undefined)?.hide_on_mobile) continue;
  buttonCount++;
  if (!resolveFieldLink(f, marketIdFor("Georgia"))) linkless.push(`${step.title} › ${f.slug}`);
}
check("every Georgia button / video opens something", `${buttonCount - linkless.length} of ${buttonCount}${linkless.length ? ` — no link: ${linkless.join(", ")}` : ""}`, buttonCount > 0 && linkless.length === 0);

console.log(failed ? `\n❌ ${failed} check(s) failed` : "\n✅ verida-ga-onboarding: all checks passed");
process.exit(failed ? 1 : 0);
