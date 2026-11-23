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

import { FC_ONLY_SLUGS, TNC_ONLY_SLUGS } from "../lib/verida-ga-compliance/catalog";
import { BGC_SLUG, INSPECTION_SLUG, MVR_SLUG, NEVER_DUE, agreementFor, VERIDA_CATALOG, WITH_INSPECTION, hasGuides, inspectionBringPages, instructionsFor, providerFor } from "../lib/verida-ga-compliance/catalog";
import {
  addDays,
  approvable,
  approve,
  awaitingReceipt,
  GA_ALIGNED_ASSUMPTIONS,
  epassportNeeded,
  expiryResponse,
  feeDue,
  sendBack,
  CONSENT_LOCK,
  giveEpassport,
  horizon,
  horizonsByClient,
  listedInApp,
  renewalLocks,
  reviewQueue,
  scenarioState,
  submitRenewal,
  type DriverState,
} from "../lib/verida-ga-compliance/scenario";
import { buildComplianceViewModel, renewKindFor } from "../lib/verida-ga-compliance/view-model";
import { asBuildResponse, proposedKindFor } from "../lib/verida-ga-compliance/proposed-methods";
import { OCR_READS, renewalOcrDate } from "../lib/verida-ga-compliance/ocr";

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
const noFee = expiryResponse(scenarioState("every-due", "Georgia", GA, today, { epassport: true, fee: false, photosWithInspection: true })).items.map((i) => i.item_slug);
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
const bgcSigned = o.records["background-check"].upload?.status === "in_review" && o.records.mvr.upload?.status === "in_review";
const afterConsent = renewalLocks(o);
const notYet = epassportNeeded(o); // signed, not approved: no request yet
o = approve(o, "background-check", today);
snap("consent approved");
const needed = epassportNeeded(o) && !notYet && /EPassport/.test(renewalLocks(o)["drug-screening"] ?? "");
const versionsBefore = o.epassports.length;
o = giveEpassport(o);
const newVersion = o.epassports.length === versionsBefore + 1;
snap("EPassport given");
const afterEpassport = renewalLocks(o);
const bgcInReview = true; // checked below on the signed state
const drugNotYet = !o.records["drug-screening"].upload;
o = submitRenewal(o, "drug-screening", "date", addDays(today, 10));
// D32: the date books it (pending, waiting for the receipt); the receipt sends it to Compliance.
const booked = o.records["drug-screening"].upload?.status === "pending" && awaitingReceipt(o) && !reviewQueue(o).some((e) => e.slug === "drug-screening");
const bookedKind = proposedKindFor({ item_slug: "drug-screening", renewal_methods: ["date"], upload: { status: "pending" } });
o = submitRenewal(o, "drug-screening", "upload");
check(
  "D32 drug screening: date → booked (pending, not in Compliance's queue, the app asks for the receipt) → receipt → in review",
  `booked ${booked}, next ${bookedKind}, after receipt ${o.records["drug-screening"].upload?.status}`,
  booked && bookedKind === "upload" && o.records["drug-screening"].upload?.status === "in_review" && reviewQueue(o).some((e) => e.slug === "drug-screening"),
);
check(
  "D.Lawson round in order: fee → consent (BGC + MVR in review) → consent approved flags the EPassport → new version uploaded → drug date → receipt (in review)",
  steps.join(" | "),
  !!lockedAtStart["background-check"] && !!lockedAtStart["drug-screening"] && !afterFee["background-check"] && /consent/.test(afterFee["drug-screening"] ?? "") &&
    /EPassport/.test(afterConsent["drug-screening"] ?? "") && needed && newVersion && Object.keys(afterEpassport).length === 0 && bgcInReview && bgcSigned && drugNotYet &&
    o.records["drug-screening"].upload?.status === "in_review" && o.records["drug-screening"].upload?.givenDate === addDays(today, 10),
);
// 2026-11-23 — aligned with the onboarding round (the side-by-side uses GA_ALIGNED_ASSUMPTIONS).
{
  const a = scenarioState("every-due", "Georgia", GA, today, GA_ALIGNED_ASSUMPTIONS);
  const listedA = expiryResponse(a).items.map((i) => i.item_slug);
  const hidden = WITH_INSPECTION.filter((sl) => listedA.includes(sl));
  check("11-20: safety equipment, trade dress and signage are not listed; nor the fee until Compliance requests it; the MVR is listed (11-24 #8)", `${listedA.length} listed; hidden still listed: ${hidden.join(", ") || "none"}`, hidden.length === 0 && !listedA.includes("background-check-fee") && listedA.includes(MVR_SLUG));
  let b = submitRenewal(a, INSPECTION_SLUG, "date", addDays(today, 3));
  b = approve(b, INSPECTION_SLUG, addDays(today, 3));
  const follow = WITH_INSPECTION.every((sl) => b.records[sl].expires === b.records[INSPECTION_SLUG].expires);
  check("11-20: approving the inspection moves the three photo requirements to its new date (no upload)", `${b.records[INSPECTION_SLUG].expires}`, follow);
  const ag = agreementFor(INSPECTION_SLUG);
  check("D15 at renewal: the inspection asks the onboarding step's read-first requirements first", `${ag?.length ?? 0} chars`, !!ag && ag.length > 40);
}
// ⚠️ PROPOSED (Luis, 2026-11-20): program switches in Tennessee.
{
  let w: DriverState = scenarioState("switch-to-fc", "Georgia", GA, today);
  const resp = expiryResponse(w);
  const requested = resp.items.filter((i) => i.program_switch_request === "fc").map((i) => i.item_slug);
  const tncStillListed = resp.items.some((i) => i.item_slug === "ctaa-pass");
  const during = horizonsByClient(w);
  for (const slug of FC_ONLY_SLUGS) if (w.records[slug].requested) w = approve(w, slug, today);
  const after = horizonsByClient(w);
  const listedAfter = listedInApp(w).map((c) => c.slug);
  check(
    "TNC+ → FC: FC items requested; Verida TN held, TCI on the TNC+ documents; once approved the TNC+ items are hidden",
    `${w.market} · ${requested.length} requested · CTAA listed during: ${tncStillListed} · during Verida ${during.verida ?? "held"}, TCI ${during.tci} · after Verida ${after.verida}, CTAA listed: ${listedAfter.includes("ctaa-pass")}`,
    w.market === "Tennessee" && requested.length === FC_ONLY_SLUGS.length - 1 && tncStillListed && during.verida === null && !!during.tci && !w.switching && !!after.verida && !listedAfter.includes("ctaa-pass"),
  );
}
{
  let w: DriverState = scenarioState("switch-to-tnc", "Georgia", GA, today);
  const during = horizonsByClient(w);
  const fcHorizon = horizon({ ...w, switching: undefined, program: "fc" });
  for (const slug of TNC_ONLY_SLUGS) w = approve(w, slug, today);
  const after = horizonsByClient(w);
  const listedAfter = listedInApp(w).map((c) => c.slug);
  check(
    "FC → TNC+: every trip on the FC documents until the TNC+ items are verified; then Verida trips stop and FC items are hidden",
    `during Verida ${during.verida}, TCI ${during.tci} (FC horizon ${fcHorizon}) · after Verida ${after.verida ?? "not offered"}, TCI ${after.tci}, D.Lawson listed: ${listedAfter.includes("background-check")}`,
    during.verida === fcHorizon && during.tci === fcHorizon && !w.switching && after.verida === null && !!after.tci && !listedAfter.includes("background-check"),
  );
}
const noPassport: DriverState = submitRenewal(scenarioState("dlawson-drug", "Georgia", GA, today, { epassport: false, fee: false, photosWithInspection: true }), "background-check", "esign");
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

// 12. Luis 2026-11-24: no manual dates — a dated document's date is read on upload (OCR), never typed.
{
  const lic = submitRenewal(scenarioState("every-due", "Georgia", GA, today, GA_ALIGNED_ASSUMPTIONS), "drivers-license", "upload");
  const read = lic.records["drivers-license"].upload?.ocrDate;
  const entry = reviewQueue(lic).find((e) => e.slug === "drivers-license");
  check(
    "OCR: a licence photo renewal carries the date read from it; Compliance approves with that read",
    `read ${read}, review ${entry?.defaultDate} (${entry?.dateLabel})`,
    !!read && read === renewalOcrDate("drivers-license", today) && entry?.defaultDate === read && /OCR/.test(entry?.dateLabel ?? ""),
  );
  const attest = submitRenewal(scenarioState("every-due", "Georgia", GA, today, GA_ALIGNED_ASSUMPTIONS), "hipaa", "attest");
  check("OCR: an attest (provider) renewal carries no read date — Compliance attaches the certificate", String(attest.records.hipaa.upload?.ocrDate), attest.records.hipaa.upload?.ocrDate === undefined);
  const T0 = "2026-11-23";
  const bad = OCR_READS.filter((r) => (r.kind === "expiry" ? !(r.sample > T0 && r.renewal(T0) > T0) : !(r.sample <= T0 && r.renewal(T0) <= T0)));
  check("OCR: every sample file reads a plausible date (expiry after today, completion on or before)", bad.map((r) => r.doc).join(", ") || `${OCR_READS.length} reads`, bad.length === 0);
}

// 13. Luis 2026-11-24 (#4′, #8): the BGC Check Fee and the consent are requested by Compliance; BGC and MVR separate.
{
  const base = scenarioState("dlawson-drug", "Georgia", GA, today, GA_ALIGNED_ASSUMPTIONS);
  const at = (daysAgo: number | null): DriverState => ({ ...base, lastTripOn: daysAgo == null ? undefined : addDays(today, -daysAgo) });
  check("Fee rule: required only after more than 60 days without a trip", `30: ${feeDue(at(30))}, 60: ${feeDue(at(60))}, 61: ${feeDue(at(61))}, none: ${feeDue(at(null))}`, !feeDue(at(30)) && !feeDue(at(60)) && feeDue(at(61)) && !feeDue(at(null)));
  const idle = at(61);
  const requested = sendBack(idle, "background-check-fee", "Pay the BGC Check Fee");
  const paid = submitRenewal(requested, "background-check-fee", "upload");
  check(
    "#4′: the fee is listed only once Compliance requests it; the payment image goes to Pending Review",
    `before ${listedInApp(idle).some((c) => c.slug === "background-check-fee")}, after ${listedInApp(requested).some((c) => c.slug === "background-check-fee")}, sent ${paid.records["background-check-fee"].upload?.status}`,
    !listedInApp(idle).some((c) => c.slug === "background-check-fee") && listedInApp(requested).some((c) => c.slug === "background-check-fee") && paid.records["background-check-fee"].upload?.status === "in_review",
  );
  const locks0 = renewalLocks(idle);
  const asked = sendBack(idle, BGC_SLUG, "Sign the new consent form");
  check(
    "#8: Renew on BGC or MVR waits for Compliance's consent request; the request opens the consent (both)",
    `before ${locks0[BGC_SLUG]} / ${locks0[MVR_SLUG]}; after ${renewalLocks(asked)[BGC_SLUG] ?? "open"}`,
    locks0[BGC_SLUG] === CONSENT_LOCK && locks0[MVR_SLUG] === CONSENT_LOCK && !renewalLocks(asked)[BGC_SLUG] && !renewalLocks(asked)[MVR_SLUG] && asked.records[MVR_SLUG].upload?.status === "change_requested",
  );
  const signed = submitRenewal(asked, BGC_SLUG, "esign");
  const bgcOnly = approve(signed, BGC_SLUG, today);
  check(
    "#8: one signature → BGC and MVR Pending Review; each is approved on its own",
    `BGC ${bgcOnly.records[BGC_SLUG].upload?.status}, MVR ${bgcOnly.records[MVR_SLUG].upload?.status}`,
    signed.records[MVR_SLUG].upload?.status === "in_review" && bgcOnly.records[BGC_SLUG].upload?.status === "approved" && bgcOnly.records[MVR_SLUG].upload?.status === "in_review",
  );
  const page = instructionsFor("background-check-fee", "Georgia");
  check("Fee page: $71 copy, a Stripe link, then the payment image upload", page?.blocks.map((b) => b.kind).join(", ") ?? "none", !!page && page.blocks.some((b) => /\$71/.test(b.text ?? "")) && page.blocks.some((b) => b.kind === "link" && /stripe\.com/.test(b.url ?? "")));
}

// 14. Luis 2026-11-24 (#3): the inspection renewal starts with 3 "bring these to your inspection" pages.
{
  const pages = inspectionBringPages("Georgia");
  const printable = pages.filter((p) => p.print && existsSync(join("public", p.print.url)));
  check(
    "#3 three pages before the requirements: Safety Equipment (9 items), Signage, Trade Dress — guide images, print links on the last two, a confirm each",
    pages.map((p) => `${p.key}:${p.items.length}${p.print ? "+print" : ""}`).join(", "),
    pages.map((p) => p.key).join() === "safety-equipment,safety-rules-signage,trade-dress" &&
      pages[0].items.length === 9 && pages.every((p) => p.items.length > 0 && p.items.every((i) => !!i.image) && !!p.confirm) &&
      !pages[0].print && printable.map((p) => p.key).join() === "safety-rules-signage,trade-dress",
  );
}

console.log(failed ? `\n${failed} failed` : "\nAll passed");
process.exit(failed ? 1 : 0);
