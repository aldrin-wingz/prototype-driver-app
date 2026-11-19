/**
 * FEATURE verify — In-App Compliance for Verida Fully Credentialled (prototype/verida-ga-onboarding).
 *
 *   bun scripts/verify-verida-ga-compliance.ts
 *
 * Every check prints its denominator, so "passed" and "matched nothing" cannot look alike.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { BGC_SLUG, INSPECTION_SLUG, MVR_SLUG, NEVER_DUE, VERIDA_CATALOG, WITH_INSPECTION, hasGuides, instructionsFor, providerFor } from "../lib/verida-ga-compliance/catalog";
import {
  addDays,
  approvable,
  approve,
  epassportNeeded,
  expiryResponse,
  giveEpassport,
  horizon,
  renewalLocks,
  reviewQueue,
  scenarioState,
  submitRenewal,
  type DriverState,
} from "../lib/verida-ga-compliance/scenario";
import { buildComplianceViewModel, renewKindFor } from "../lib/verida-ga-compliance/view-model";
import { asBuildResponse, proposedKindFor } from "../lib/verida-ga-compliance/proposed-methods";

let failed = 0;
function check(name: string, detail: string, ok: boolean) {
  console.log(`${ok ? "✅" : "❌"} ${name} — ${detail}`);
  if (!ok) failed++;
}

const GA = { Georgia: true, Tennessee: false } as const;
const today = "2026-11-19";

// 1. The view model is the PR's, byte for byte apart from moment → dayjs.
const REAL = join(process.cwd(), "..", "..", "Project - Driver App Base", "real-code", "driver-app");
if (existsSync(REAL)) {
  const real = execFileSync("git", ["-C", REAL, "show", "d690c4af:App/Data/compliance/complianceViewModel.ts"], { encoding: "utf8" });
  const port = readFileSync(join(process.cwd(), "lib", "verida-ga-compliance", "view-model.ts"), "utf8");
  const norm = (s: string) =>
    s
      .replace(/^\/\*\*\n \* PORT[\s\S]*?\*\/\n/, "")
      .replace(/import dayjs[^\n]*\nimport customParseFormat[^\n]*\n/, "import moment from \"moment\";\n")
      .replace(/\ndayjs\.extend\(customParseFormat\);\n/, "")
      .replace(/dayjs\(/g, "moment(");
  const a = norm(port).split("\n");
  const b = real.split("\n");
  const diff = a.filter((l, i) => l !== b[i]).length + Math.abs(a.length - b.length);
  check("view-model.ts is the PR's complianceViewModel.ts", `${diff} differing lines of ${b.length}`, diff === 0);
} else {
  check("view-model.ts is the PR's complianceViewModel.ts", `real-code clone not found at ${REAL}`, false);
}

// 2. S1: no Verida requirement ever opens Yardstik — including after a send-back.
const kinds = VERIDA_CATALOG.map((c) => renewKindFor({ item_slug: c.slug, renewal_methods: c.renewal_methods, upload: null }));
const sentBack = VERIDA_CATALOG.map((c) =>
  renewKindFor({ item_slug: c.slug, renewal_methods: c.renewal_methods, upload: { status: "change_requested" } }),
);
check(
  "S1 never Yardstik",
  `${[...kinds, ...sentBack].filter((k) => k === "yardstik").length} Yardstik of ${kinds.length + sentBack.length} (item × fresh/sent back)`,
  VERIDA_CATALOG.length === 15 && ![...kinds, ...sentBack].includes("yardstik"),
);
const byKind = (k: string) => VERIDA_CATALOG.filter((_, i) => kinds[i] === k).map((c) => c.slug);
check("S1 provider requirements open the provider page", byKind("attest").join(", "), byKind("attest").join() === "hipaa,gentech-pass-basic,gentech-defensive-driving,gentech-first-aid");
// ⚠️ PROPOSED (Luis, 2026-11-20): Drug Screening takes a date; the background check and MVR are a signed consent form.
const proposed = VERIDA_CATALOG.map((c) => `${c.slug}:${proposedKindFor({ item_slug: c.slug, renewal_methods: c.renewal_methods, upload: null })}`).filter((x) => /:(date|esign)$/.test(x));
check(
  "Proposed methods: provider + date for the inspection and drug screening, consent form for BGC + MVR",
  proposed.join(", "),
  proposed.join() === "vehicle-inspection:date,background-check:esign,mvr:esign,drug-screening:date",
);
// Luis 2026-11-20: only trainings can be supplied by the driver instead of the provider.
const selfSupply = VERIDA_CATALOG.filter((c) => c.renewal_methods.includes("upload") && c.renewal_methods.length > 1).map((c) => c.slug);
check("Only trainings offer the driver's own upload instead of the provider", selfSupply.join(", "), selfSupply.join() === "hipaa,gentech-pass-basic,gentech-defensive-driving,gentech-first-aid");
const listed = expiryResponse(scenarioState("every-due", "Georgia", GA, today)).items.map((i) => i.item_slug);
check("Every requirement due: all listed, never the MVR", `${listed.length} listed, MVR ${listed.includes("mvr") ? "listed" : "not listed"}`, listed.length === 14 && !listed.includes("mvr") && listed.every((sl) => sl !== "mvr"));
const noFee = expiryResponse(scenarioState("every-due", "Georgia", GA, today, { epassport: true, fee: false })).items.map((i) => i.item_slug);
check("Fee assumption off: no fee listed", `${noFee.length} listed`, noFee.length === 13 && !noFee.includes("background-check-fee"));
// The D.Lawson round, in order: fee → consent → EPassport → drug screening date.
let o: DriverState = scenarioState("dlawson-drug", "Georgia", GA, today);
const steps: string[] = [];
const snap = (label: string) => steps.push(`${label}: ${Object.entries(renewalLocks(o)).map(([k, v]) => `${k}=${v.split(" ")[0]}`).join(" ") || "none"}`);
snap("start");
const lockedAtStart = renewalLocks(o);
o = submitRenewal(o, "background-check-fee", "upload");
snap("fee sent");
const afterFee = renewalLocks(o);
o = submitRenewal(o, "background-check", "esign");
snap("consent signed");
const afterConsent = renewalLocks(o);
const needed = epassportNeeded(o);
o = giveEpassport(o);
snap("EPassport given");
const afterEpassport = renewalLocks(o);
const bgcInReview = o.records["background-check"].upload?.status === "in_review" && o.records.mvr.upload?.status === "in_review";
const drugNotYet = !o.records["drug-screening"].upload;
o = submitRenewal(o, "drug-screening", "date", addDays(today, 10));
check(
  "D.Lawson round in order: fee → consent → EPassport → drug date; BGC + MVR in review on consent, drug on its date",
  steps.join(" | "),
  !!lockedAtStart["background-check"] && !!lockedAtStart["drug-screening"] && !afterFee["background-check"] && /consent/.test(afterFee["drug-screening"] ?? "") &&
    /EPassport/.test(afterConsent["drug-screening"] ?? "") && needed && Object.keys(afterEpassport).length === 0 && bgcInReview && drugNotYet &&
    o.records["drug-screening"].upload?.status === "in_review" && o.records["drug-screening"].upload?.givenDate === addDays(today, 10),
);
const noPassport: DriverState = submitRenewal(scenarioState("dlawson-drug", "Georgia", GA, today, { epassport: false, fee: false }), "background-check", "esign");
check("Assumptions off: drug screening opens once the consent is signed", JSON.stringify(renewalLocks(noPassport)), Object.keys(renewalLocks(noPassport)).length === 0);
const asBuild = asBuildResponse(expiryResponse(scenarioState("dlawson-drug", "Georgia", GA, today)));
check("The build's view model only ever sees its own three methods", `${asBuild.items.flatMap((i) => i.renewal_methods ?? []).filter((m) => !["upload", "attest", "yardstik"].includes(m)).length} unknown`, asBuild.items.flatMap((i) => i.renewal_methods ?? []).every((m) => ["upload", "attest", "yardstik"].includes(m)));

// 3. S1 TC-009: Social Security and BTT never listed.
const all = expiryResponse(scenarioState("all-clear", "Georgia", GA, today));
const titles = all.items.map((i) => i.item_title);
check("S1 never-due not listed", `${NEVER_DUE.filter((n) => titles.includes(n.title)).length} of ${NEVER_DUE.length} listed, ${all.items.length} items sent`, all.items.length === 14 && NEVER_DUE.every((n) => !titles.includes(n.title)));

// 4. S2 TC-001: the inspection and its three photo requirements come due together, each its own item.
let s: DriverState = scenarioState("inspection-round", "Georgia", GA, today);
const due = expiryResponse(s).items.filter((i) => i.milestone);
check("S2 four due together", `${due.length} due: ${due.map((i) => i.item_slug).join(", ")}`, due.length === 4 && new Set(due.map((i) => i.expiration_date)).size === 1);
const vm = buildComplianceViewModel(expiryResponse(s));
check("S2 each has its own to-do", `${vm.page.due.filter((r) => r.canUpload).length} of 4 rows with their own button`, vm.page.due.filter((r) => r.canUpload).length === 4);

// 5. S2 TC-010/011: reviewed together; approving the inspection approves nothing else.
for (const slug of [INSPECTION_SLUG, ...WITH_INSPECTION]) s = submitRenewal(s, slug, slug === INSPECTION_SLUG ? "attest" : "upload");
const q = reviewQueue(s);
check("S2 one vehicle renewal in review", `${q.filter((e) => e.group === "Vehicle renewal").length} of ${q.length} queued in the group`, q.length === 4 && q.every((e) => e.group === "Vehicle renewal"));
const oldDate = s.records["trade-dress"].expires;
const tdFirst = approve(s, "trade-dress", today);
check("S2 TC-005 photos approved first keep the old date", `${tdFirst.records["trade-dress"].expires} vs ${oldDate}`, tdFirst.records["trade-dress"].expires === oldDate);
const both = approve(tdFirst, INSPECTION_SLUG, "2026-11-20");
check("S2 TC-006 last approval wins", `trade dress ${both.records["trade-dress"].expires}, inspection ${both.records[INSPECTION_SLUG].expires}`, both.records["trade-dress"].expires === "2027-05-20" && both.records[INSPECTION_SLUG].expires === "2027-05-20");
const stillReview = WITH_INSPECTION.filter((sl) => sl !== "trade-dress" && both.records[sl].upload?.status === "in_review");
check("S2 TC-011 inspection approves nothing else", `${stillReview.length} of 2 untouched still in review`, stillReview.length === 2);
check("S2 TC-007 horizon waits for the last one", `horizon ${horizon(both)} (old ${oldDate})`, horizon(both) === oldDate);
const after = approve(both, "safety-rules-signage", today);
check("S2 photos approved after the inspection follow it", `${after.records["safety-rules-signage"].expires}`, after.records["safety-rules-signage"].expires === "2027-05-20");

// 6. S1 TC-007: one D.Lawson confirmation and one approval cover the MVR.
let d = scenarioState("dlawson-drug", "Georgia", GA, today);
d = submitRenewal(d, BGC_SLUG, "attest");
check("S1 one confirmation", `MVR ${d.records[MVR_SLUG].upload?.status}, queue ${reviewQueue(d).map((e) => e.slug).join(", ")}`, d.records[MVR_SLUG].upload?.status === "in_review" && reviewQueue(d).length === 1);
d = approve(d, BGC_SLUG, "2026-11-18");
check("S1 one approval, both dates", `BGC ${d.records[BGC_SLUG].expires}, MVR ${d.records[MVR_SLUG].expires}`, d.records[BGC_SLUG].expires === "2027-11-18" && d.records[MVR_SLUG].expires === "2027-11-18");

// 7. S1 TC-011: Approve needs a later date than the one on file.
const ins = scenarioState("insurance-expired", "Georgia", GA, today);
check("S1 approve needs a later date", `earlier ${approvable(ins, "insurance", "2026-11-01")}, later ${approvable(ins, "insurance", "2027-11-01")}`, !approvable(ins, "insurance", "2026-11-01") && approvable(ins, "insurance", "2027-11-01"));

// 8. Provider pages come from the Verida Fully Credentialled step for the market.
const ga = providerFor(INSPECTION_SLUG, "Georgia", { tennesseeInspectionLinkSet: false });
const gaLink = ga?.blocks.find((b) => b.kind === "link")?.url ?? "";
check("S1 TC-005 Georgia inspection link", `${ga?.title} · ${gaLink}`, gaLink.includes("brightinspect.com/verida"));
const tnUnset = providerFor(INSPECTION_SLUG, "Tennessee", { tennesseeInspectionLinkSet: false });
const tnSet = providerFor(INSPECTION_SLUG, "Tennessee", { tennesseeInspectionLinkSet: true });
check("S1 TC-015 no link → contact support", `unset ${tnUnset === null ? "null" : "page"}, set ${tnSet ? "page" : "null"}`, tnUnset === null && tnSet !== null);
const drug = providerFor("drug-screening", "Georgia", { tennesseeInspectionLinkSet: false });
check("S1 TC-003 drug screening booking link", `${drug?.title} · ${drug?.blocks.filter((b) => b.kind === "link").length} link`, drug?.title === "Schedule Drug Screening" && !!drug.blocks.some((b) => b.kind === "link"));
const tnBgc = providerFor(BGC_SLUG, "Tennessee", { tennesseeInspectionLinkSet: false });
check("S1 TC-006 / TN TC-006 D.Lawson for a TN driver", `${tnBgc?.title ?? "null"}`, tnBgc?.title === "Background Check by D.Lawson");

// 9. GA / TN release: excluded = nothing in the app; released = banner and paused Requests.
const tnExcluded = buildComplianceViewModel(expiryResponse(scenarioState("insurance-expired", "Tennessee", GA, today)));
check("TN excluded", `inRelease ${tnExcluded.inRelease}, banner ${tnExcluded.showBanner}, paused ${tnExcluded.requestsPaused}`, !tnExcluded.inRelease && !tnExcluded.showBanner && !tnExcluded.requestsPaused);
const gaExpired = buildComplianceViewModel(expiryResponse(ins));
check("GA released, expired → paused", `inRelease ${gaExpired.inRelease}, paused ${gaExpired.requestsPaused}, CTA "${gaExpired.pausedCta}"`, gaExpired.inRelease && gaExpired.requestsPaused);

// 10. Upload asks for what onboarding asked for.
const counts = VERIDA_CATALOG.filter((c) => c.renewal_methods.includes("upload")).map((c) => `${c.slug}:${c.uploadFields.length}`);
check("Upload fields from the onboarding steps", counts.join(" "), VERIDA_CATALOG.filter((c) => c.renewal_methods.includes("upload")).every((c) => c.uploadFields.length > 0));

// 11. V14 (proposed): every equipment, trade dress and signage photo shows onboarding's guide image, and the file is served.
const guided = ["safety-equipment", "trade-dress", "safety-rules-signage"].flatMap((slug) => VERIDA_CATALOG.find((c) => c.slug === slug)?.uploadFields ?? []);
const unguided = guided.filter((f) => !f.exampleImage || !existsSync(join(__dirname, "..", "public", f.exampleImage)));
check("V14 guide image on every equipment / trade dress / signage photo", `${guided.length - unguided.length} of ${guided.length}${unguided.length ? ` — missing: ${unguided.map((f) => f.slug).join(", ")}` : ""}`, guided.length === 11 && unguided.length === 0);
const layoutItems = VERIDA_CATALOG.filter((c) => hasGuides(c.uploadFields)).map((c) => c.slug);
check("V14 page selector / checklist apply to exactly the guided items", layoutItems.join(", "), layoutItems.join() === "safety-equipment,trade-dress,safety-rules-signage");
const withSteps = VERIDA_CATALOG.map((c) => ({ slug: c.slug, ins: instructionsFor(c.slug, "Georgia") })).filter((x) => x.ins);
const downloads = withSteps.map((x) => x.ins!.blocks.filter((b) => b.kind === "link" && b.download && b.url && existsSync(join("public", b.url))).length);
check(
  "Fee shows its pay link; Trade Dress + Signage show onboarding's instructions with a working download",
  withSteps.map((x, n) => `${x.slug}: ${x.ins!.blocks.length} blocks, ${downloads[n]} download`).join("; "),
  withSteps.map((x) => x.slug).join() === "background-check-fee,trade-dress,safety-rules-signage" &&
    downloads.join() === "0,1,1" &&
    withSteps[0].ins!.blocks.some((b) => b.kind === "link" && /stripe\.com/.test(b.url ?? "")) &&
    withSteps.every((x) => x.ins!.blocks.length >= 3),
);

console.log(failed ? `\n${failed} failed` : "\nAll passed");
process.exit(failed ? 1 : 0);
