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
import { ESIGN_SIGNATURE_SLUG, PROTOTYPE_SIGNATURE_ID, choiceOptions, continueLabel, isFieldVisible, isScrollAck, missingAsyncValues, toggleChoice } from "../lib/verida-ga-onboarding/field-logic";

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

// Field behaviour (Luis, 2026-11-18).
{
const gaSteps = stagesVisibleTo("verida-ga").flatMap((st) => st.steps.map((step) => ({ stage: st.title, step })));
const stepNamed = (title: string) => gaSteps.find((x) => x.step.title === title)?.step;
const field = (stepTitle: string, slug: string) => stepNamed(stepTitle)?.field_definitions.find((f) => f.slug === slug);

const SCROLL_ACKS = ["ack_tos", "ack_intro_aggreement", "ack_bgc_information", "ack_accident_policy", "ack_inspection_requirements"];
const scrollAcks = gaSteps.flatMap((x) => x.step.field_definitions).filter(isScrollAck).map((f) => f.slug);
check("scroll-to-read Yes/No on T&C, Welcome, Standards, Accident, Inspection", `${SCROLL_ACKS.filter((x) => scrollAcks.includes(x)).length} of ${SCROLL_ACKS.length} (${scrollAcks.length} scroll acks in the flow)`,
  SCROLL_ACKS.every((x) => scrollAcks.includes(x)));

const choice = field("Pre-Gentech Training Check", "gentech_trainings_completed");
const opts = choice ? choiceOptions(choice) : [];
const preCheck = stepNamed("Pre-Gentech Training Check");
const shown = (values: Record<string, unknown>) =>
  (preCheck?.field_definitions ?? []).filter((f) => f.field_type === "file" && isFieldVisible(f, values)).map((f) => f.slug);
const CASES: [string, string[], string[]][] = [
  ["nothing ticked", [], []],
  ["PASS Basic", ["pass_basic"], ["gentech_pass_basic_certificate"]],
  ["PASS Basic + First Aid", ["pass_basic", "first_aid"], ["gentech_pass_basic_certificate", "gentech_first_aid_certificate"]],
  ["all three", ["pass_basic", "defensive_driving", "first_aid"], ["gentech_pass_basic_certificate", "gentech_defensive_driving_certificate", "gentech_first_aid_certificate"]],
  ["none of the above", ["none"], []],
];
const preWrong = CASES.filter(([, ticked, want]) => shown({ gentech_trainings_completed: ticked }).join() !== want.join()).map(([n]) => n);
check("Pre-Gentech: a checkbox list; each ticked training asks for its certificate", `type ${choice?.field_type}; ${CASES.length - preWrong.length} of ${CASES.length} cases${preWrong.length ? ` — wrong: ${preWrong.join(", ")}` : ""}`,
  choice?.field_type === "checkboxes" && preWrong.length === 0);
const none = opts.find((o) => o.value === "none");
const pass = opts.find((o) => o.value === "pass_basic");
const exclusiveOk = Boolean(none && pass) && toggleChoice(["pass_basic", "first_aid"], none!, opts).join() === "none" && toggleChoice(["none"], pass!, opts).join() === "pass_basic";
check("\"I have not completed any\" clears the others, and vice versa", String(exclusiveOk), exclusiveOk);

const preSlugs = new Set((preCheck?.field_definitions ?? []).filter((f) => f.field_type === "file").map((f) => f.slug));
const gentechSlugs = (stepNamed("GenTech Training")?.field_definitions ?? []).filter((f) => f.field_type === "file").map((f) => f.slug);
const carried = gentechSlugs.filter((x) => preSlugs.has(x));
check("certificates uploaded early show on Gentech Training (same slugs)", `${carried.length} of ${gentechSlugs.length}`, gentechSlugs.length === 3 && carried.length === 3);

const book = field("Vehicle Inspection", "book_vehicle_inspection_button");
const gate = book ? [isFieldVisible(book, {}), isFieldVisible(book, { ack_inspection_requirements: false }), isFieldVisible(book, { ack_inspection_requirements: true })] : [];
check("inspection: booking hidden until the requirements are read and answered Yes", `no answer ${gate[0]}, No ${gate[1]}, Yes ${gate[2]}`, gate.join() === "false,false,true");

const drug = stepNamed("Schedule Drug Screening");
const drugSlugs = (drug?.field_definitions ?? []).map((f) => f.slug);
const voucherLatch = (field("EPassport (Voucher)", "drug_screen_epassport_voucher") as unknown as { validation_rules?: Record<string, unknown> } | undefined)?.validation_rules?.unpin_driver_navigation_when_stage_field_has_value;
check("drug screening asks for the date only; the voucher unlocks on the date", `checkbox ${drugSlugs.includes("ack_drug_screen_scheduled") ? "present" : "gone"}, date ${drugSlugs.includes("drug_screen_date") ? "present" : "missing"}, latch → ${voucherLatch}`,
  !drugSlugs.includes("ack_drug_screen_scheduled") && drugSlugs.includes("drug_screen_date") && voucherLatch === "drug_screen_date");
}

// Field order: production sorts by display_order, so a link never sits above its own instructions.
{
  const LINKS = new Set(["button", "esign_action", "stripe_onboarding_action", "video"]);
  const TEXT = new Set(["info", "info_list", "heading"]);
  const textAfterLink = (fields: { slug: string; field_type: string }[]) => {
    const at = fields.findIndex((f) => LINKS.has(f.field_type));
    return at < 0 ? [] : fields.slice(at + 1).filter((f) => TEXT.has(f.field_type) && !f.slug.endsWith("_support")).map((f) => f.slug);
  };
  const stepsWithLink = stagesVisibleTo("verida-ga").flatMap((st) => st.steps.map((step) => ({ step }))).filter(({ step }) => step.field_definitions.some((f) => LINKS.has(f.field_type)));
  const bad = stepsWithLink.flatMap(({ step }) => textAfterLink(driverFields(step)).map((s) => `${step.title}: ${s}`));
  check("link after its instructions in every Georgia step (only Need help? below it)", bad.length ? bad.join("; ") : `${stepsWithLink.length} of ${stepsWithLink.length} steps`, stepsWithLink.length >= 10 && bad.length === 0);
  // Break test: the stored (array) order is what used to render — it must fail the same rule.
  const stored = stepsWithLink.filter(({ step }) => textAfterLink(step.field_definitions.filter((f) => f.visibility !== "internal")).length > 0).length;
  check("…and the check can fail: stored order puts links first", `${stored} steps would fail without the sort`, stored >= 5);
}

// D.Lawson consent: signing does not submit; Submit waits for the signature id (production).
{
  const lawson = stagesVisibleTo("verida-ga").flatMap((st) => st.steps).find((s) => s.field_definitions.some((f) => f.field_type === "esign_action"));
  const fields = lawson ? driverFields(lawson) : [];
  const before = missingAsyncValues(fields, {});
  const after = missingAsyncValues(fields, { [ESIGN_SIGNATURE_SLUG]: PROTOTYPE_SIGNATURE_ID });
  check("D.Lawson: Submit blocked until the signature id arrives, then free", `before ${before.join(",") || "none"}, after ${after.join(",") || "none"}`, before.join() === ESIGN_SIGNATURE_SLUG && after.length === 0);
}

// Step button labels: production's rule, not the template's action_button_text.
{
  const wizardSrc = readFileSync(join(process.cwd(), "components", "verida-ga-onboarding", "onboarding-wizard.tsx"), "utf8");
  const labels = new Set<string>();
  const flow = stagesVisibleTo("verida-ga");
  flow.forEach((st, si) => st.steps.forEach((_, ti) => labels.add(continueLabel(si === flow.length - 1 && ti === st.steps.length - 1))));
  check("button says Continue, and Submit Application only at the end", `${[...labels].join(" / ")}; template text ${wizardSrc.includes("action_button_text") ? "used" : "not used"}`,
    labels.size === 2 && labels.has("Continue") && labels.has("Submit Application") && !wizardSrc.includes("action_button_text"));
}

console.log(failed ? `\n❌ ${failed} check(s) failed` : "\n✅ verida-ga-onboarding: all checks passed");
process.exit(failed ? 1 : 0);
