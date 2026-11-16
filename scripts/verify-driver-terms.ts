/**
 * Gate for the FEATURE branch `prototype/driver-terms-acceptance` (not the base).
 * Run: bun run verify:driver-terms
 *
 * Every check prints a denominator, the base verifier's rule: a matcher that matches
 * nothing and one that is merely rarely satisfied look the same as a pass/fail bit.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildAcceptanceRecord, canAcceptTerms, gateBlocks, needsDriverTermsAcceptance, reachedEnd,
  scrollAckChoices, termsForVersion,
} from "../lib/driver-terms/acceptance";
import { OPTIONS_ROWS } from "../lib/driver-data/options-menu";

const SELF = fileURLToPath(import.meta.url);
const ROOT = join(dirname(SELF), "..");
let failures = 0;
function check(label: string, detail: string, ok: boolean) {
  console.log(`${ok ? "  ok  " : "  FAIL"} ${label} — ${detail}`);
  if (!ok) failures++;
}
function table<T>(label: string, cases: Array<[T, boolean]>, fn: (input: T) => boolean) {
  const wrong = cases.filter(([input, want]) => fn(input) !== want);
  check(label, `${cases.length - wrong.length} of ${cases.length} cases${wrong.length ? `; wrong: ${JSON.stringify(wrong.map(([i]) => i))}` : ""}`, wrong.length === 0 && cases.length > 0);
}
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

console.log("\n1. Who is blocked");
table<[number | null, number | null]>("needs acceptance: never accepted or older version", [
  [[1, null], true], [[2, 1], true], [[2, 2], false], [[null, null], false],
], ([c, a]) => needsDriverTermsAcceptance(c, a));

table<[number | null, number | null, number]>("gate blocks only at login/resume, releases on accept", [
  [[null, null, 1], false], // logged out / not checked yet
  [[1, null, 1], true],     // first login, never accepted
  [[1, 1, 1], false],       // accepted current
  [[1, 1, 2], false],       // v2 published while the app is open → nobody blocked yet
  [[2, 1, 2], true],        // next resume after publish → blocked
  [[1, 2, 2], false],       // accepted v2 on the screen → released at once
], ([checked, accepted, current]) => gateBlocks(checked, accepted, current));

console.log("\n2. The screen");
const onboarding = scrollAckChoices("ack_tos");
const screen = scrollAckChoices("ack_tos", { hideDisagree: true });
check("onboarding keeps Agree and Disagree", `${onboarding.length} choices: ${onboarding.map((c) => c.label).join(" / ")}`, onboarding.length === 2 && onboarding.some((c) => c.value === false));
check("acceptance screen offers Agree only", `${screen.length} choice: ${screen.map((c) => c.label).join(" / ")}`, screen.length === 1 && screen[0].value === true && screen[0].label === "Yes, I have read and agree");
table<[boolean, boolean | undefined]>("Agree and continue needs read-to-end AND agree", [
  [[false, undefined], false], [[false, true], false], [[true, undefined], false], [[true, true], true],
], ([s, a]) => canAcceptTerms(s, a));
table<[number, number, number]>("read-to-end within 8px of the bottom", [
  [[0, 300, 5000], false], [[4692, 300, 5000], true], [[4700, 300, 5000], true], [[0, 300, 300], true],
], ([top, h, sh]) => reachedEnd(top, h, sh));

const screenSrc = read("components/driver-terms/terms-acceptance-screen.tsx");
check("screen passes hideDisagree to the onboarding field", `${(screenSrc.match(/hideDisagree/g) ?? []).length} occurrence(s)`, /<ScrollAckPollField[\s\S]*?hideDisagree[\s\S]*?\/>/.test(screenSrc));
check("screen cannot be dismissed with Escape", `Escape handler ${screenSrc.includes('e.key === "Escape") e.preventDefault()') ? "present" : "missing"}`, screenSrc.includes('e.key === "Escape") e.preventDefault()'));

console.log("\n3. The acceptance record");
const t1 = termsForVersion(1);
const rec = buildAcceptanceRecord({ driverId: "d1", terms: t1, agreed: true, appVersion: "v6.0.537", now: new Date("2026-11-16T10:00:00Z") });
const keys = rec ? Object.keys(rec).sort().join(",") : "none";
check("record carries driver, version, hash, time, surface, app version", keys, keys === "acceptedAt,appVersion,contentSha256,driverId,surface,version" && rec?.surface === "driver_app");
const none = [false, undefined, "agree"].filter((a) => buildAcceptanceRecord({ driverId: "d1", terms: t1, agreed: a, appVersion: "x" }) === null).length;
check("no record unless the driver agreed", `${none} of 3 non-agree inputs rejected`, none === 3);

console.log("\n4. The T&C text");
const hash = createHash("sha256").update(t1.content, "utf8").digest("hex");
check("full onboarding text, hash matches", `${t1.content.length} chars; sha ${hash.slice(0, 12)} vs ${t1.contentSha256.slice(0, 12)}`, t1.content.length > 60000 && t1.content.startsWith("Last modified: 5/6/2025") && hash === t1.contentSha256);

console.log("\n5. Wiring and boundary");
const termsRow = OPTIONS_ROWS.find((r) => r.id === "driver-terms");
const optionsSrc = read("app/options/page.tsx");
const routed = optionsSrc.includes('if (row.id === "driver-terms") { router.push("/driver-terms"); return; }');
check("Options → Driver Terms opens the versioned page", `row ${termsRow ? "present" : "missing"} of ${OPTIONS_ROWS.length}; routed from the page: ${routed}`, !!termsRow && OPTIONS_ROWS.length === 11 && routed);
check("base Options data left as captured (no href on driver-terms)", `href ${termsRow?.href ?? "none"}`, termsRow?.href === undefined);
check("layout mounts the gate", read("app/layout.tsx").includes("<TermsGate />") ? "mounted" : "missing", read("app/layout.tsx").includes("<TermsGate />"));

// Shared (base) files may reach into the feature only where this branch says so.
const ALLOWED_SHARED = new Set(["app/layout.tsx", "app/options/page.tsx"]);
const FEATURE_DIRS = ["lib/driver-terms/", "components/driver-terms/", "app/login/", "app/driver-terms/", "scripts/verify-driver-terms.ts"];
const files: string[] = [];
(function walk(dir: string) {
  for (const e of readdirSync(dir)) {
    if (["node_modules", ".next", ".git", "references", "public"].includes(e)) continue;
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.tsx?$/.test(e)) files.push(relative(ROOT, full));
  }
})(ROOT);
const importers = files.filter((f) => !FEATURE_DIRS.some((d) => f.startsWith(d)) && /@\/(lib|components)\/driver-terms/.test(readFileSync(join(ROOT, f), "utf8")));
const stray = importers.filter((f) => !ALLOWED_SHARED.has(f));
check("only the allowed shared files import the feature", `${files.length} files scanned; importers: ${importers.join(", ") || "none"}`, stray.length === 0 && importers.length === ALLOWED_SHARED.size);

console.log(failures ? `\n❌ verify-driver-terms: ${failures} check(s) failed\n` : "\n✅ verify-driver-terms: all checks passed\n");
process.exit(failures ? 1 : 0);
