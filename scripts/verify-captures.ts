/**
 * Capture-index integrity check.
 *
 * ⚠️ VERIFIES BOTH DIRECTIONS. Checking only that every row resolves to a file
 * lets the index quietly fall behind the vault; checking only that every file
 * has a row lets a stale row survive a rename. A registry drifts through
 * whichever direction you forgot to check, so both are asserted here.
 *
 * Paths in INDEX.md are vault-relative. The vault root is four levels up from
 * this repo (…/Obsidian Vault/Project - Driver App Base/prototype-driver-app-base).
 *
 * Run: bun run verify:captures
 */

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const SELF = fileURLToPath(import.meta.url);
const REPO = dirname(dirname(SELF));
const VAULT = dirname(dirname(REPO));
const INDEX = join(REPO, "references/captures/INDEX.md");

// The sources the index claims to cover. Adding a source here without
// regenerating the index is meant to fail check 2.
const SOURCES = [
  "Project - Driver App Base/Captures",
  "Project - Map Request View",
  "Project - In-App Balance Dashboard/Internal Guide/Screenshots",
  "Project - In-App Balance Dashboard/Slack Attachments - Copy Updates",
  "Other/NEMT Driver App/Flow Reference",
  "Project - In-App Chat/prototype-driver-app-chat/references/screenshots/canonical",
  "Project - In-App Support Requests/prototype-driver-app-support/references/screenshots/canonical",
];
const EXT = new Set([".png", ".jpg", ".jpeg", ".webp"]);

let failures = 0;
const check = (label: string, detail: string, ok: boolean) => {
  console.log(`${ok ? "  ok  " : "  FAIL"} ${label} — ${detail}`);
  if (!ok) failures++;
};

// ---- parse the index ------------------------------------------------------
const md = readFileSync(INDEX, "utf8");
const rows = [...md.matchAll(/^\| (CAP-\d{3}) \| `([^`]+)` \| ([^|]+) \| `([0-9a-f]{16})` \|/gm)]
  .map((m) => ({ cap: m[1], name: m[2], build: m[3].trim(), sha: m[4] }));
const paths = new Map(
  [...md.matchAll(/^- `(CAP-\d{3})` — `([^`]+)`$/gm)].map((m) => [m[1], m[2]]),
);
check("index parsed", `${rows.length} rows, ${paths.size} source paths`, rows.length > 0 && rows.length === paths.size);

// ---- direction 1: every row resolves to a real file with the right bytes ---
const missing: string[] = [];
const wrongHash: string[] = [];
for (const r of rows) {
  const rel = paths.get(r.cap)!;
  const abs = join(VAULT, rel);
  if (!existsSync(abs)) { missing.push(`${r.cap} ${rel}`); continue; }
  const sha = createHash("sha256").update(readFileSync(abs)).digest("hex").slice(0, 16);
  if (sha !== r.sha) wrongHash.push(`${r.cap} ${r.name} (index ${r.sha}, disk ${sha})`);
}
check("every row resolves to a file", missing.length ? missing.slice(0, 5).join("; ") : `${rows.length} of ${rows.length} found`, missing.length === 0);
check("every row's bytes still match", wrongHash.length ? wrongHash.slice(0, 5).join("; ") : `${rows.length - missing.length} hashes verified`, wrongHash.length === 0);

// ---- direction 2: every unique source file has a row ----------------------
const onDisk = new Map<string, string>(); // sha16 -> first path
let scanned = 0;
for (const src of SOURCES) {
  const root = join(VAULT, src);
  if (!existsSync(root)) { check(`source present: ${src}`, "MISSING", false); continue; }
  (function walk(dir: string) {
    for (const e of readdirSync(dir)) {
      if (e === ".git" || e === "node_modules") continue;
      const full = join(dir, e);
      if (statSync(full).isDirectory()) walk(full);
      else if (EXT.has(extname(e).toLowerCase())) {
        scanned++;
        const sha = createHash("sha256").update(readFileSync(full)).digest("hex").slice(0, 16);
        if (!onDisk.has(sha)) onDisk.set(sha, full);
      }
    }
  })(root);
}
check("sources scanned", `${scanned} files, ${onDisk.size} unique`, scanned > 0);

const indexed = new Set(rows.map((r) => r.sha));
const unindexed = [...onDisk].filter(([sha]) => !indexed.has(sha));
check(
  "every unique capture is indexed",
  unindexed.length
    ? `${unindexed.length} unindexed, e.g. ${unindexed.slice(0, 3).map(([, p]) => p.replace(VAULT + "/", "")).join("; ")}`
    : `${onDisk.size} of ${onDisk.size} present in the index`,
  unindexed.length === 0,
);

// ---- every row carries a build stamp --------------------------------------
const unstamped = rows.filter((r) => !r.build || r.build === "?");
check("every row has a build stamp", unstamped.length ? `${unstamped.length} unstamped` : `${rows.length} stamped`, unstamped.length === 0);

console.log(
  failures === 0
    ? `\n✅ verify-captures: index and vault agree (${rows.length} captures)\n`
    : `\n❌ verify-captures: ${failures} check(s) failed\n`,
);
process.exit(failures === 0 ? 0 : 1);
