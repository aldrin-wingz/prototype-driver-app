/**
 * Regenerate `references/captures/INDEX.md` from the vault's capture sources.
 *
 * ⭐ THE INDEX IS THE ARTIFACT; THE IMAGE FILES STAY WHERE THEY ARE. Copying
 * ~127 MB of binaries into a branch that every future prototype clones — and
 * re-copying on every shoot — is the duplication this index exists to end. Rows
 * carry a SHA-256 and a vault-relative path, so a capture is addressable and a
 * moved or edited file is detectable.
 *
 * Run: bun run build:capture-index    (then: bun run verify:captures)
 */

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname, extname, basename, relative } from "node:path";
import { fileURLToPath } from "node:url";

const REPO = dirname(dirname(fileURLToPath(import.meta.url)));
const VAULT = dirname(dirname(REPO));
const OUT = join(REPO, "references/captures/INDEX.md");
const EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);

const SOURCES = [
  // ⭐ The drop folder for NEW shoots. Section subfolder, then a DATED shoot
  // folder: `Captures/05 Options/2026-10-02/...`. The date becomes the build
  // stamp, so an undated shoot is refused rather than silently unstamped.
  "Project - Driver App Base/Captures",
  "Project - Map Request View",
  "Project - In-App Balance Dashboard/Internal Guide/Screenshots",
  "Project - In-App Balance Dashboard/Slack Attachments - Copy Updates",
  "Other/NEMT Driver App/Flow Reference",
  "Project - In-App Chat/prototype-driver-app-chat/references/screenshots/canonical",
  "Project - In-App Support Requests/prototype-driver-app-support/references/screenshots/canonical",
];

const SECTIONS = ["01 Home", "02 Requests", "03 Planner", "04 My Rides", "05 Options",
  "06 Chat", "07 Onboarding and Auth", "_annotated", "_out-of-scope", "_out-of-app", "_unregistered"];

const MRV_SECTION: Record<string, string> = {
  "01": "07 Onboarding and Auth", "02": "07 Onboarding and Auth", "03": "02 Requests",
  "04": "02 Requests", "05": "02 Requests", "06": "02 Requests", "07": "02 Requests",
  "08": "04 My Rides", "09": "_out-of-app", "10": "02 Requests",
  "11": "07 Onboarding and Auth", "12": "06 Chat", "13": "07 Onboarding and Auth",
};

/**
 * ⚠️ Every project rule is ANCHORED to its project path. Map Request View and
 * the Balance Dashboard both use `Internal Guide/Screenshots/NN - Name/`, so an
 * unanchored rule files Balance's Wallet folder as Map Request View's Login
 * folder — silently, and with a plausible-looking total.
 */
function classify(rel: string): { section: string; build: string } {
  const b = basename(rel);

  // New shoots: Captures/<NN Section>/<YYYY-MM-DD>/<file>
  const drop = rel.match(/^Project - Driver App Base\/Captures\/([^/]+)\/(\d{4}-\d\d-\d\d)\//);
  if (drop) {
    const section = SECTIONS.includes(drop[1]) ? drop[1] : "_unregistered";
    return { section, build: `DAB-${drop[2]}` };
  }
  // ⚠️ In the drop folder but NOT in a dated shoot folder. Refused to
  // `_unregistered` rather than guessed at: an unstamped capture is one nobody
  // can later tell apart from a current one.
  if (rel.startsWith("Project - Driver App Base/Captures/")) {
    return { section: "_unregistered", build: "unknown (undated shoot folder)" };
  }
  // ⚠️ Build tags are NAMESPACED BY PROJECT. Map Request View and the Balance
  // Dashboard each ran their own shoots and each label them "B2" in-file, but
  // they are different batches on different dates. A bare "B2" would claim two
  // unrelated shoots are the same one — and the whole point of a build stamp is
  // that an artifact must never mix shoots.
  const tag = b.includes(" - B2 ") ? "B2" : b.includes(" - B3 ") ? "B3" : "B1";

  let m = rel.match(/^Project - Map Request View\/Internal Guide\/Screenshots\/(\d\d) - /);
  if (m) return { section: MRV_SECTION[m[1]], build: `MRV-${tag}` };

  m = rel.match(/^Project - In-App Balance Dashboard\/Internal Guide\/Screenshots\/(\d\d) - /);
  if (m) return { section: "01 Home", build: `BAL-${tag}` };

  // an undated inbox file still knows when it was taken, if its name says so
  const dated = b.match(/Screenshot (\d{4}-\d\d-\d\d)/);
  const unknown = dated ? `unknown (${dated[1]})` : "unknown";

  if (rel.includes("/Screenshots/_annotated/")) return { section: "_annotated", build: "derived" };
  if (rel.includes("/Screenshots/_inbox/")) return { section: "_unregistered", build: unknown };
  if (rel.startsWith("Project - Map Request View/References/")) return { section: "_unregistered", build: "MRV-B1-raw" };
  if (rel.startsWith("Project - Map Request View/Release Info")) return { section: "_unregistered", build: "slack" };
  if (rel.includes("Slack Attachments - Copy Updates")) return { section: "01 Home", build: "slack" };
  if (rel.includes("Flow Reference/"))
    return b.includes("Stage ") ? { section: "04 My Rides", build: "Apr-2026" } : { section: "_unregistered", build: unknown };

  if (rel.includes("/references/screenshots/canonical/")) {
    if (b.startsWith("c-0")) return { section: "06 Chat", build: "Sep-2026" };
    if (/^s-(01|03|06d|06e)/.test(b)) return { section: "04 My Rides", build: "Apr-2026" };
    if (b.startsWith("s-")) return { section: "_out-of-scope", build: "Apr-2026" };
    if (/Requests|Filter Requests/.test(b)) return { section: "02 Requests", build: "Apr-2026" };
    if (/My Rides|Ride Details|Ride History/.test(b)) return { section: "04 My Rides", build: "Apr-2026" };
    if (b.includes("Dashboard")) return { section: "01 Home", build: "Apr-2026" };
  }
  return { section: "_unregistered", build: unknown };
}

// ---- harvest the literal on-screen strings from the one registry that has them
function harvestShows(): Map<string, string> {
  const out = new Map<string, string>();
  const reg = join(VAULT, "Project - Map Request View/Internal Guide/Screenshots/Screenshot Registry.md");
  if (!existsSync(reg)) return out;
  for (const line of readFileSync(reg, "utf8").split("\n")) {
    if (!line.startsWith("| SCR-")) continue;
    const cells = line.split(" | ").map((c) => c.trim());
    if (cells.length < 5) continue;
    const text = cells[cells.length - 1].replace(/\|$/, "").trim();
    if (text && text !== "Shows") out.set(cells[1].replace(/`/g, ""), text);
  }
  return out;
}

// ---- scan + dedupe --------------------------------------------------------
interface Row { sha: string; rel: string; name: string; section: string; build: string; dupes: string[]; bytes: number; shows: string }
const byHash = new Map<string, string[]>();
let scanned = 0;
for (const src of SOURCES) {
  const root = join(VAULT, src);
  if (!existsSync(root)) { console.warn(`  ⚠ missing source: ${src}`); continue; }
  (function walk(dir: string) {
    for (const e of readdirSync(dir)) {
      if (e === ".git" || e === "node_modules") continue;
      const full = join(dir, e);
      if (statSync(full).isDirectory()) walk(full);
      else if (EXT.has(extname(e).toLowerCase())) {
        scanned++;
        const sha = createHash("sha256").update(readFileSync(full)).digest("hex").slice(0, 16);
        (byHash.get(sha) ?? byHash.set(sha, []).get(sha)!).push(relative(VAULT, full));
      }
    }
  })(root);
}

const shows = harvestShows();
const rows: Row[] = [...byHash].map(([sha, locs]) => {
  const rel = locs[0];
  const { section, build } = classify(rel);
  const name = basename(rel);
  return { sha, rel, name, section, build, dupes: locs.slice(1),
    bytes: statSync(join(VAULT, rel)).size,
    shows: shows.get(name.replace(extname(name), "")) ?? "" };
});
rows.sort((a, b) => a.name.localeCompare(b.name));

const NOTE: Record<string, string> = {
  "01 Home": "Weekly view, wallet, payouts, payout detail, help sheet. ⛔ **Home INCENTIVES has zero captures** — the incentive screenshots in the vault are the CS Tool manager, not the driver app.",
  "02 Requests": "Map View, list view, filters, drop-off filter, empty state, Special Offers. The richest section, and the only one with a prose contract: `Project - Map Request View/Help Articles/The Requests Map.md`.",
  "03 Planner": "Planner dashboard, timeblocks and their states. The vault's only Planner captures are in `Project - Standing Order Offers/Phase 2/References/` (Mar 2026), out of scope by decision — open that folder before shooting.",
  "04 My Rides": "My Rides list, Ride Details across states, the swipe sequence (`s-01a/b/c`), the More Options grid, ride history, and the six-stage Trip Completion flow. 🕐 **Stale build** — nothing here is from B1/B2/B3.",
  "05 Options": "The Options menu and every Settings sub-screen. Settings cannot be replicated until this section has captures — the shot list is in the Working Plan.",
  "06 Chat": "Two distinct SHIPPED surfaces: the Zendesk support bubble, and Onboarding Support messaging inside the sign-up application (`12 - In-App Messages`, B2). ⛔ Neither is Wingz Dispatch, which has not shipped.",
  "07 Onboarding and Auth": "Login/OTP, intro screens, sign-up application, migration. **Shipped, captured, and deliberately NOT built into the base** — indexed so the boundary stays visible.",
  "_annotated": "Numbered-callout derivatives rendered for help articles (`DG-`, `LG-`, `MG-`, `SU-`, `GA-`). Outputs, not captures. ⚠️ Badge coordinates never transfer between builds — B2 is aspect 0.60 vs B1's 0.44, so a re-shoot is a re-render, never a re-crop.",
  "_out-of-scope": "Rider no-show and support-form captures — real production captures of a feature the base deliberately excludes.",
  "_out-of-app": "The web Onboarding Portal (CS-side), not the driver app.",
  "_unregistered": "Raw camera rolls, unprocessed `_inbox` dumps and Slack release crops. No canonical name, no description, content unverified. Triage before citing any of these.",
};
/**
 * A short standing caveat per section — things a count cannot tell you.
 * ⚠️ These must NOT assert counts. Anything countable is derived below, because
 * a hardcoded "zero captures" keeps saying zero after the first upload.
 */
const CAVEAT: Record<string, string> = {
  "01 Home": "⛔ nothing for incentives",
  "02 Requests": "richest section; has a prose contract",
  "03 Planner": "ships in the base unverified",
  "04 My Rides": "",
  "05 Options": "blocks the Settings build",
  "06 Chat": "shipped surfaces only",
  "07 Onboarding and Auth": "captured, not built (by decision)",
  "_annotated": "derivatives, not captures",
  "_out-of-scope": "excluded feature",
  "_out-of-app": "not the driver app",
  "_unregistered": "untriaged — triage before citing",
};

/** Shoots that count as current. A new dated drop (DAB-*) always does. */
const CURRENT = new Set(["MRV-B2", "MRV-B3", "BAL-B2"]);
const isCurrent = (b: string) => CURRENT.has(b) || b.startsWith("DAB-");

/** Derived from the rows, so the table cannot contradict its own counts. */
function verdict(section: string, rs: Row[]): string {
  const caveat = CAVEAT[section] ? CAVEAT[section] : "";
  // `_` buckets are holding pens, not sections to cover — an empty one is fine.
  if (section.startsWith("_")) return rs.length ? `— ${caveat}` : `— none`;
  if (rs.length === 0) return `🔴 **zero captures**${caveat ? ` — ${caveat}` : ""}`;
  const cur = rs.filter((r) => isCurrent(r.build)).length;
  const tail = caveat ? ` — ${caveat}` : "";
  if (cur === 0) return `🕐 **stale build** — 0 of ${rs.length} from a current shoot${tail}`;
  if (cur * 2 < rs.length) return `🕐 mostly stale — ${cur} of ${rs.length} current${tail}`;
  return `✅ ${cur} of ${rs.length} from a current shoot${tail}`;
}

const L: string[] = [];
const w = (s = "") => L.push(s);
const mb = (n: number) => (n / 1e6).toFixed(1);

w("# Capture Index — NEMT Driver App");
w("");
w("<!-- GENERATED by scripts/build-capture-index.ts. Do not hand-edit: run");
w("     `bun run build:capture-index`, then `bun run verify:captures`. -->");
w("");
w("Every production capture of the driver app held in this vault, deduplicated and indexed.");
w("");
w("**Captures are ground truth; this repo's code is derived from them.** A section with no");
w("capture is not one we have verified — it is one we have guessed at, and it carries a");
w("`🕐 No capture` stamp in the Working Plan for exactly that reason.");
w("");
w("## How this index works");
w("");
w("⭐ **The index is the artifact; the image files stay where they are.** Each row carries the");
w("capture's SHA-256 and its vault-relative path, so a capture is addressable without copying");
w(`~${mb(rows.reduce((s, r) => s + r.bytes, 0))} MB of binaries into a branch that every future prototype clones — and`);
w("without that cost growing with every shoot. Paths are relative to the vault root.");
w("");
w("| Field | Meaning |");
w("| --- | --- |");
w("| `CAP-###` | stable id within this index |");
w("| `Build` | **which shoot it came from** — the fidelity stamp. Never mix builds in one artifact |");
w("| `SHA-256` | first 16 hex of the file's hash; the identity of the bytes |");
w("| `Shows` | literal on-screen content, harvested from the Map Request View registry where one exists |");
w("| `Dup` | byte-identical copies elsewhere in the vault |");
w("");
w("## Builds");
w("");
w("| Build | What it is | Look |");
w("| --- | --- | --- |");
w("| **MRV-B2** | 2026-09-24 · macOS simulator · 974×1614 | **Authoritative for layout and content.** Dark teal/navy map |");
w("| MRV-B1 | 2026-09-05 · Android device · 1080×2460 | Light pale-green map |");
w("| MRV-B3 | 2026-09-29 · real devices, Android 1080×2460 / iOS 942×2046 | Mostly device and store surfaces |");
w("| BAL-B2 | Balance Dashboard, later batch (tagged `B2` in-file) | — |");
w("| BAL-B1 | Balance Dashboard, earlier batch (untagged in-file) | ⚠️ No registry exists for this project, so the date is unrecorded |");
w("| Apr-2026 | undated shoot; predates every MRV batch | The only real evidence for My Rides / Ride Details |");
w("| Sep-2026 | prototype-repo canonical sets | Mixed provenance |");
w("| unknown | untriaged inbox file; any date shown is read off the filename | — |");
w("");
w("⚠️ **Build tags are namespaced by project.** Map Request View and the Balance Dashboard each");
w("ran their own shoots and each label one of them `B2` in the filename, but they are different");
w("batches on different dates. `MRV-B2` and `BAL-B2` are not the same shoot, and an artifact must");
w("never mix shoots.");
w("");
w("⛔ **The light-vs-dark map difference is PLATFORM, not product.** It tracks the capture");
w("environment exactly — Android renders Google Maps, the macOS simulator renders Apple MapKit,");
w("real devices render light again. Match the chrome; let the tiles be tiles.");
w("");
w("⛔ The greyed-out Home control in every B2 capture is a simulator without location permission.");
w("");
w("⛔ `Project - Map Request View/References/Request Map Demo 2.mov` **does not exist on disk**,");
w("and predates the build in any case. It is not a source.");
w("");
w("## Coverage");
w("");
w("| Section | Captures | MB | Build mix | Verdict |");
w("| --- | ---: | ---: | --- | --- |");
for (const s of SECTIONS) {
  const rs = rows.filter((r) => r.section === s);
  // The MIX, not a single "newest" — a section with 24 stale captures and one
  // current one is a stale section, and "newest: B2" would hide exactly that.
  const mix = [...rs.reduce((m2, r) => m2.set(r.build, (m2.get(r.build) ?? 0) + 1), new Map<string, number>())]
    .sort((a, b2) => b2[1] - a[1]).map(([b2, n]) => `${b2}×${n}`).join(", ") || "—";
  w(`| **${s}** | ${rs.length} | ${mb(rs.reduce((a, r) => a + r.bytes, 0))} | ${mix} | ${verdict(s, rs)} |`);
}
w(`| **TOTAL** | **${rows.length}** | **${mb(rows.reduce((a, r) => a + r.bytes, 0))}** | | ${scanned} files on disk, ${rows.length} unique |`);
w("");
w("---");
w("");
let i = 0;
for (const s of SECTIONS) {
  w(`## ${s}`); w(""); w(NOTE[s]); w("");
  const rs = rows.filter((r) => r.section === s);
  if (!rs.length) { w("🔴 **No captures.** Nothing here has been photographed."); w(""); continue; }
  w("| CAP | Name | Build | SHA-256 | Dup | Shows |");
  w("| --- | --- | --- | --- | ---: | --- |");
  for (const r of rs) {
    i++; (r as Row & { cap: string }).cap = `CAP-${String(i).padStart(3, "0")}`;
    let sh = r.shows.replace(/\|/g, "\\|");
    if (sh.length > 200) sh = sh.slice(0, 197) + "…";
    w(`| CAP-${String(i).padStart(3, "0")} | \`${r.name}\` | ${r.build} | \`${r.sha}\` | ${r.dupes.length} | ${sh} |`);
  }
  w("");
  w("<details><summary>Source paths</summary>"); w("");
  for (const r of rs) w(`- \`${(r as Row & { cap: string }).cap}\` — \`${r.rel}\``);
  w(""); w("</details>"); w("");
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, L.join("\n"));
console.log(`INDEX.md written — ${scanned} files scanned, ${rows.length} unique, ${mb(rows.reduce((a, r) => a + r.bytes, 0))} MB indexed`);
