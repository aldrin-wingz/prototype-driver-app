/**
 * Rider No-Show guardrail checks.
 *
 * ⚠️ This branch has no test framework, so `bun run typecheck` was the only
 * automated gate — and a guardrail is exactly the thing a typechecker cannot
 * verify. Run with `bun scripts/verify-no-show.ts`.
 *
 * Every check that loops over a filtered set asserts its DENOMINATOR first. A
 * check that agrees with nothing is not a passing check.
 */
import { readFileSync } from "node:fs";
import {
  NO_SHOW_PICKUP_TIME_MINUTES,
  NO_SHOW_POST_PICKUP_MINUTES,
  NO_SHOW_RADIUS_MILES,
  NO_SHOW_TREATMENTS,
  NO_SHOW_TYPES,
  NO_SHOW_WAIT_MINUTES,
  postPickupAvailableAt,
  postPickupRefusalCopy,
  postPickupThresholdMinutes,
  answerEarnsWaiver,
  CONTACT_RELATION_OPTIONS,
  noShowFormFor,
  resolveNoShow,
  SPOKE_WITH_CONTACT,
  SPOKE_WITH_MEMBER,
  SPOKE_WITH_NOBODY,
  SPOKE_WITH_OPTIONS,
  treatmentFor,
  waivesPresenceWait,
  walkLocationRecords,
  type NoShowDemoRow,
} from "../lib/driver-data/no-show-rules";
import { mockInProgressTrips } from "../lib/driver-data/mock-trips";
import { buildSupportFormCase } from "../lib/support-data/case-registry";
import { ISSUE_CANCEL_AT_DOOR, ISSUE_RIDER_NO_SHOW } from "../lib/support-data/issue-types";
import { canSubmitCase } from "../lib/support/field-rules";
import {
  findAnyForTrip,
  findPendingForTrip,
  showsPendingState,
} from "../lib/support/request-visibility";

let passed = 0;
const failures: string[] = [];
function check(label: string, condition: boolean, detail = "") {
  if (condition) passed += 1;
  else failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
}

const activeLeg = (trip: (typeof mockInProgressTrips)[number]) =>
  trip.legs.find((leg) => leg.type === "est-pickup");
const tagged = mockInProgressTrips.filter((trip) => trip.noShowDemo);

// ── The seed is EXACTLY the two demo scenarios ─────────────────────────
// ⚠️ Narrowed 2026-09-09. This used to assert that EVERY declared treatment row
// had a ride — the nine-row comparison matrix. The demo is now two rides, one per
// user story, so the assertion is INVERTED: the expected set is declared here as a
// literal, and the seed must match it exactly. Declaring it rather than deriving it
// from the seed is the point — a set derived from the thing it checks cannot fail.
const EXPECTED_ROWS = ["3.1", "4.1"] as const;
const seededRows = new Set(tagged.map((t) => t.noShowDemo as NoShowDemoRow));
check("the seed carries exactly the expected rows",
  seededRows.size === EXPECTED_ROWS.length &&
    EXPECTED_ROWS.every((r) => seededRows.has(r as NoShowDemoRow)),
  [...seededRows].sort().join(",") || "none");
for (const row of seededRows) {
  check(`seeded row ${row} is a declared treatment`,
    Object.prototype.hasOwnProperty.call(NO_SHOW_TREATMENTS, row));
}
check("there are rows to check", seededRows.size > 0, `${seededRows.size}`);

// ── As-is rows: none are seeded now, and that is DECLARED ────────────────
// The rule still applies if one ever returns: an as-is row reproduces production,
// so it must not offer the form or use revised copy. ⚠️ Row 5 was always exempt from
// BOTH — production's "no location points" message is unreachable, so there is no
// as-is behaviour to reproduce. Exempting it from the copy check but not the form
// check is what this script caught on its very first run; the pairing is kept.
const AS_IS_EXEMPT = new Set(["5"]);
const asIs = tagged.filter((t) => !String(t.noShowDemo).includes("."));
check("the demo seeds no as-is rows", asIs.length === 0,
  asIs.map((t) => t.noShowDemo).join(","));
for (const trip of asIs) {
  if (AS_IS_EXEMPT.has(String(trip.noShowDemo))) continue;
  const t = treatmentFor(trip);
  check(`${trip.noShowDemo} never offers the form`, !t.offerForm);
  check(`${trip.noShowDemo} uses production copy`, t.copy === "production");
}

// ── No refusing ride may be untagged ─────────────────────────────
let refusing = 0;
for (const trip of mockInProgressTrips) {
  const leg = activeLeg(trip);
  if (!leg) continue;
  const outcome = resolveNoShow(trip, leg, 0);
  if (outcome.kind === "timer" || outcome.kind === "form") {
    refusing += 1;
    check(`refusing ride ${trip.id} is tagged`, Boolean(trip.noShowDemo),
      `${outcome.kind} with no noShowDemo`);
  }
}
check("some ride actually refuses", refusing > 0, `${refusing}`);

// ── The two stories, one ride each ──────────────────────────────
// These replace the matrix checks. They assert the branch each ride demonstrates,
// which is exactly what `PRD - Rider No-Show.md` specifies — timer if the driver IS
// at the pick-up, form if they are NOT. ⚠️ Both must FAIL the presence walk, or they
// would file and neither story would be reachable.
const timerRide = tagged.find((t) => t.noShowDemo === "3.1");
const formRide = tagged.find((t) => t.noShowDemo === "4.1");
check("the timer ride (3.1) is seeded", Boolean(timerRide));
check("the form ride (4.1) is seeded", Boolean(formRide));

if (timerRide) {
  const leg = activeLeg(timerRide)!;
  const walk = walkLocationRecords(leg.locationRecords ?? []);
  check("3.1 does not pass the presence walk", !walk.ok);
  check("3.1 is still near the pick-up now", walk.ok === false && walk.nearRunOldestAge !== null,
    `nearRunOldestAge=${walk.ok === false ? walk.nearRunOldestAge : "n/a"}`);
  const out = resolveNoShow(timerRide, leg, 0);
  check("3.1 refuses with a timer", out.kind === "timer", out.kind);
  check("3.1 refuses on presence, not the pick-up time",
    out.kind === "timer" && out.reason === "presence",
    out.kind === "timer" ? out.reason : out.kind);
  check("3.1 shows a countdown", treatmentFor(timerRide).showTimer);
  // ⚠️ The invariant that matters most: a form here would be a way to skip the wait.
  check("3.1 offers NO form", !treatmentFor(timerRide).offerForm);
}

if (formRide) {
  const leg = activeLeg(formRide)!;
  const walk = walkLocationRecords(leg.locationRecords ?? []);
  check("4.1 does not pass the presence walk", !walk.ok);
  check("4.1 has no near run — the driver has left",
    walk.ok === false && walk.nearRunOldestAge === null,
    `nearRunOldestAge=${walk.ok === false ? walk.nearRunOldestAge : "n/a"}`);
  const out = resolveNoShow(formRide, leg, 0);
  check("4.1 opens the form", out.kind === "form", out.kind);
  check("4.1 opens it because the driver is not at the pick-up",
    out.kind === "form" && out.gap === "not_at_pickup",
    out.kind === "form" ? out.gap : out.kind);
  check("4.1 actually offers the form", treatmentFor(formRide).offerForm);
}

// ⚠️ The two rides must genuinely DIVERGE, or the pair proves nothing.
if (timerRide && formRide) {
  const a = resolveNoShow(timerRide, activeLeg(timerRide)!, 0);
  const b = resolveNoShow(formRide, activeLeg(formRide)!, 0);
  check("the two demo rides reach different outcomes", a.kind !== b.kind,
    `${a.kind} vs ${b.kind}`);
}

// ── The pick-up-time rule ───────────────────────────────────
// ⚠️ The PROPOSAL to standardize Indiana's +15 across every market was WITHDRAWN
// 2026-09-09, and scenarios 6 / 6.1 / WV1 / WV1.1 went with it. But WellTrans
// Indiana's +15 is LIVE PRODUCTION and this code still implements it, so the
// coverage stays — driven from a synthetic trip rather than a seeded ride, since no
// demo ride exercises it any more. Built by spreading a real trip so every required
// property is real; a hand-built `as Trip` fixture would silence missing fields.
const anyTrip = mockInProgressTrips[0];
check("there is a trip to build fixtures from", Boolean(anyTrip));
if (anyTrip) {
  const indiana = { ...anyTrip, client: "WellTrans", market: "IN" as const, noShowDemo: undefined };
  const elsewhere = { ...anyTrip, client: "Verida", market: "GA" as const, noShowDemo: undefined };
  check("WellTrans Indiana still waits 15 minutes",
    postPickupThresholdMinutes(indiana) === NO_SHOW_POST_PICKUP_MINUTES,
    `${postPickupThresholdMinutes(indiana)}`);
  // ⚠️⚠️ A DECLARED DIVERGENCE, not an assertion of intent.
  // `PRD - Rider No-Show.md` withdrew the universal pick-up-time gate on 2026-09-09:
  // only WellTrans Indiana has a wait, and no other market gains one. The CODE has not
  // caught up — `treatmentFor`'s default carries `pickupTimeGate: true`, so an untagged
  // ride outside Indiana still resolves to a 0-minute gate rather than no gate at all.
  //
  // It is unobservable in this demo (both seeded rides are tagged, and neither seeds
  // `minutesSinceScheduledPickup`, so `0 < 0` is false and no timer fires), which is
  // exactly why it needs a check rather than a comment. This asserts what the code DOES
  // so the divergence cannot be forgotten: when the default is flipped to `false`, this
  // fails, and whoever flips it will read this note and know the PRD already expects it.
  check("⚠️ untagged non-Indiana still carries the WITHDRAWN universal gate",
    postPickupThresholdMinutes(elsewhere) === NO_SHOW_PICKUP_TIME_MINUTES,
    `${postPickupThresholdMinutes(elsewhere)} — PRD says this should be null`);

  const anyLeg = activeLeg(anyTrip);
  check("the fixture trip has a leg", Boolean(anyLeg));
  if (anyLeg) {
    const zeroAt = postPickupAvailableAt(anyLeg, NO_SHOW_PICKUP_TIME_MINUTES);
    const zero = postPickupRefusalCopy({
      copy: "revised",
      remainingMinutes: 4,
      availableAt: zeroAt,
      thresholdMinutes: NO_SHOW_PICKUP_TIME_MINUTES,
    });
    // ⚠️ The bug this guards: reusing Indiana's string at threshold 0 produces
    // "wait at least 0 minutes after the scheduled pickup time".
    check("pick-up-time copy never says 0 minutes", !/\b0 minutes\b/.test(zero), zero);
    check("pick-up-time copy names the unlock time",
      Boolean(zeroAt) && zero.includes(String(zeroAt)), zero);
    check("pick-up-time copy states the location rule",
      zero.includes(String(NO_SHOW_RADIUS_MILES)) &&
        zero.includes(String(NO_SHOW_WAIT_MINUTES)), zero);

    const fifteen = postPickupRefusalCopy({
      copy: "production",
      remainingMinutes: 9,
      availableAt: null,
      thresholdMinutes: NO_SHOW_POST_PICKUP_MINUTES,
    });
    check("Indiana copy keeps production's wording",
      fifteen.includes(`at least ${NO_SHOW_POST_PICKUP_MINUTES} minutes`) &&
        fifteen.includes("minute(s) remaining"), fifteen);
    check("the two thresholds get different sentences", zero !== fifteen);
  }
}

// ── The no-show type IS a branch — the captured contract ───────────────────
/**
 * ⛔ **This section replaces its own opposite, and the replacement is forced by
 * evidence.** Until 2026-10-09 it asserted that the type was a label and never a
 * branch: nine checks that grepped four source files for `=== "Cancel At Door"`
 * and asserted `resolveNoShow.length === 2`.
 *
 * ⚠️ **Eight of those nine did not fire** when the branch was deliberately and
 * completely restored. They were written to catch a literal comparison, and the
 * branch came back as a keyed record lookup — invisible to every one of them.
 * Only the per-type-constant name check tripped, and only by accident of naming.
 * A shape check guards the shape it imagined, not the behaviour it was named
 * for. Everything below asserts BEHAVIOUR, and counts its denominator.
 */
check("all three production types are offered", NO_SHOW_TYPES.length === 3,
  NO_SHOW_TYPES.join("/"));
check("Cancel At Door is one of them",
  NO_SHOW_TYPES.some((t) => /cancel at door/i.test(t)), NO_SHOW_TYPES.join("/"));

/**
 * The contract, read off `CAP-232`/`CAP-233`/`CAP-234` and DECLARED here as
 * literals. Never derived from `NO_SHOW_TYPE_FORMS` — an expectation computed
 * from the thing it checks cannot fail.
 */
const EXPECTED_FORMS: Record<string, {
  extra: string | null; helper: boolean; signature: string; waives: boolean;
}> = {
  "Member Not Home":  { extra: null,         helper: false, signature: "Driver Signature", waives: false },
  "Cancel At Door":   { extra: "Spoke with", helper: false, signature: "Member Signature", waives: true  },
  "Member Not Ready": { extra: null,         helper: true,  signature: "Driver Signature", waives: false },
};
check("the expectation covers every offered type",
  Object.keys(EXPECTED_FORMS).length === NO_SHOW_TYPES.length &&
    NO_SHOW_TYPES.every((t) => t in EXPECTED_FORMS),
  `${Object.keys(EXPECTED_FORMS).length} expected vs ${NO_SHOW_TYPES.length} offered`);

for (const type of NO_SHOW_TYPES) {
  const want = EXPECTED_FORMS[type];
  const got = noShowFormFor(type);
  check(`${type} — extra field matches the capture`,
    (got.extraField?.label ?? null) === want.extra,
    `${got.extraField?.label ?? "none"} vs ${want.extra ?? "none"}`);
  check(`${type} — helper line matches the capture`,
    Boolean(got.helper) === want.helper, got.helper ?? "none");
  check(`${type} — signature label matches the capture`,
    got.signatureLabel === want.signature, got.signatureLabel);
  check(`${type} — waiver matches the proposal`,
    waivesPresenceWait(type) === want.waives, `${waivesPresenceWait(type)}`);
}

/**
 * ⚠️ The per-type checks above all pass if the record says the SAME thing three
 * times and the expectation agrees. These counts are what make it a branch: each
 * trait must belong to exactly one of the three.
 */
const withExtra = NO_SHOW_TYPES.filter((t) => noShowFormFor(t).extraField);
const withHelper = NO_SHOW_TYPES.filter((t) => noShowFormFor(t).helper);
const memberSigned = NO_SHOW_TYPES.filter(
  (t) => noShowFormFor(t).signatureLabel === "Member Signature");
const waiving = NO_SHOW_TYPES.filter((t) => waivesPresenceWait(t));
check("exactly one type adds a field", withExtra.length === 1,
  `${withExtra.length} of ${NO_SHOW_TYPES.length}: ${withExtra.join(",") || "none"}`);
check("exactly one type carries a helper line", withHelper.length === 1,
  `${withHelper.length} of ${NO_SHOW_TYPES.length}: ${withHelper.join(",") || "none"}`);
check("exactly one type takes the MEMBER's signature", memberSigned.length === 1,
  `${memberSigned.length} of ${NO_SHOW_TYPES.length}: ${memberSigned.join(",") || "none"}`);
check("exactly one type waives the presence wait", waiving.length === 1,
  `${waiving.length} of ${NO_SHOW_TYPES.length}: ${waiving.join(",") || "none"}`);
check("and the one that waives is the one that asks who they spoke with",
  waiving.length === 1 && waiving[0] === withExtra[0], `${waiving[0]} vs ${withExtra[0]}`);

// `CAP-229`: before any type is picked, the pad already reads "Driver Signature".
check("the pre-selection default is the captured empty state",
  noShowFormFor("").signatureLabel === "Driver Signature" &&
    noShowFormFor("").extraField === null && noShowFormFor("").helper === null,
  noShowFormFor("").signatureLabel);
// ⚠️ The waiver must not be reachable by an unknown string.
check("an unrecognised type waives nothing", !waivesPresenceWait("Cancelled At Door"));
check("and neither does an empty one", !waivesPresenceWait(""));

// ── The waiver: what it DOES ───────────────────────────────────────────────
if (timerRide) {
  const leg = activeLeg(timerRide)!;
  // Positive control: this ride is a timer, which is the whole premise.
  check("3.1 with no type chosen is still a timer",
    resolveNoShow(timerRide, leg, 0, null).kind === "timer",
    resolveNoShow(timerRide, leg, 0, null).kind);

  const byType = NO_SHOW_TYPES.map(
    (t) => ({ t, out: resolveNoShow(timerRide, leg, 0, t) }));
  const files = byType.filter((r) => r.out.kind === "files");
  check("exactly one type gets past the ten-minute wait here",
    files.length === 1,
    byType.map((r) => `${r.t}: ${r.out.kind}`).join(" | "));
  check("and it is Cancel At Door",
    files.length === 1 && files[0].t === "Cancel At Door", files[0]?.t ?? "none");

  const cad = resolveNoShow(timerRide, leg, 0, "Cancel At Door");
  check("the waived filing is FLAGGED as waived",
    cad.kind === "files" && cad.presenceWaitWaived,
    cad.kind === "files" ? `${cad.presenceWaitWaived}` : cad.kind);
  /**
   * ⚠️ It must report what the app actually SAW, not the ten minutes it never
   * observed — otherwise the submit copy claims evidence that does not exist.
   */
  check("it reports the observed time, which is short of the wait",
    cad.kind === "files" && cad.qualifyingMinutes > 0 &&
      cad.qualifyingMinutes < NO_SHOW_WAIT_MINUTES,
    cad.kind === "files" ? `${cad.qualifyingMinutes}` : cad.kind);
}

// ── The waiver: what it must NOT do ────────────────────────────────────────
/**
 * ⚠️ These four are the reason the waiver is safe to ship. It waives the
 * DURATION of the wait and nothing else; a Cancel At Door is not a skeleton key.
 */
if (formRide) {
  const leg = activeLeg(formRide)!;
  const cad = resolveNoShow(formRide, leg, 0, "Cancel At Door");
  check("a driver who has LEFT still cannot file a Cancel At Door",
    cad.kind === "form", cad.kind);
  check("and is told the real reason", cad.kind === "form" && cad.gap === "not_at_pickup",
    cad.kind === "form" ? cad.gap : cad.kind);
}
if (timerRide) {
  const leg = activeLeg(timerRide)!;
  const noFix = resolveNoShow(timerRide, { ...leg, locationRecords: [] }, 0, "Cancel At Door");
  check("a phone with no location still cannot file a Cancel At Door",
    noFix.kind === "form" && noFix.gap === "no_location_data",
    noFix.kind === "form" ? noFix.gap : noFix.kind);

  // The pick-up-time gate is a DIFFERENT rung and the waiver does not reach it.
  const indiana = { ...timerRide, client: "WellTrans", market: "IN" as const, noShowDemo: undefined };
  const notDueYet = { ...leg, minutesSinceScheduledPickup: 0 };
  const gated = resolveNoShow(indiana, notDueYet, 0, "Cancel At Door");
  check("a Cancel At Door on a ride that is not due yet is still refused",
    gated.kind === "timer" && gated.reason === "post-pickup",
    gated.kind === "timer" ? gated.reason : gated.kind);
}

/**
 * The SUPPORT form stays type-agnostic, and that is not a contradiction.
 *
 * ⚠️ Two different artifacts. The production SCREEN branches on the type; the
 * support form is the escape hatch offered after a refusal, and it asks the same
 * "what happened" questions whatever the driver had selected. The 2026-09-07
 * decision conflated the two, which is part of how it went wrong.
 */
const perType = NO_SHOW_TYPES.map((type) => {
  const built = buildSupportFormCase({ includeIssues: [ISSUE_RIDER_NO_SHOW] });
  return { type, ids: built.fields.map((f) => f.id).join(",") };
});
check("the support form has fields to compare", perType.every((p) => p.ids.length > 0),
  perType.map((p) => p.ids.length).join(","));
check("every type builds the same SUPPORT form field set",
  new Set(perType.map((p) => p.ids)).size === 1,
  perType.map((p) => `${p.type}: ${p.ids}`).join(" | "));

// The screen renders from the contract rather than from its own literals.
const SCREEN = readFileSync("components/driver/member-no-show-screen.tsx", "utf8");
const FORM_SRC = readFileSync("components/support/rider-no-show-form.tsx", "utf8");
// Positive controls: a source scan that read an empty string would pass silently.
check("the screen source was read", SCREEN.length > 0, `${SCREEN.length} chars`);
check("the form source was read", FORM_SRC.length > 0, `${FORM_SRC.length} chars`);
check("the screen reads the signature label from the contract",
  SCREEN.includes("typeForm.signatureLabel"), "not found");
check("the screen does not hardcode a signature heading",
  !/>\s*(Driver|Member) Signature\s*</.test(SCREEN), "hardcoded heading");
check("the screen passes the type to the guardrail",
  /resolveNoShow\(trip, activeLeg, elapsed, noShowType\)/.test(SCREEN), "not wired");
// ⚠️ The waiver paths must END in the questions, not in a filing or a dialog.
check("Submit opens the Cancel at Door form on the waiver paths",
  /usingWaiver[\s\S]{0,200}setCancelAtDoorOpen\(true\)/.test(SCREEN), "not wired");
/**
 * ⚠️ Added because a mutation got through: hardcoding `atPickup={false}` left
 * every check green while asking a driver standing at the door to reconstruct
 * times they never needed. The variant is a DECISION and needs its own check.
 */
check("the form variant is computed, not hardcoded",
  /atPickup=\{cancelAtDoorAtPickup\}/.test(SCREEN), "variant hardcoded");
check("and it is computed from whether the app placed the driver there",
  /setCancelAtDoorAtPickup\(outcome\.kind === "files"\)/.test(SCREEN), "not derived");
check("⛔ a refused waiver re-resolves WITHOUT the type",
  /waiver-refused[\s\S]{0,400}resolveNoShow\(trip, activeLeg, elapsed, null\)/.test(SCREEN),
  "would show the waived outcome back to a driver who just lost the waiver");

// ── The form asks four questions and no attachment ─────────────────────────
const form = buildSupportFormCase({ includeIssues: [ISSUE_RIDER_NO_SHOW] });
const ids = form.fields.map((f) => f.id);
check("the form has fields", ids.length > 0, `${ids.length}`);
for (const gone of ["contactProof", "cancelToldBy", "cancelProof"]) {
  check(`the form no longer asks ${gone}`, !ids.includes(gone), ids.join(","));
}
check("no field is a file upload",
  !form.fields.some((f) => f.type === "file"),
  form.fields.filter((f) => f.type === "file").map((f) => f.id).join(","));
for (const kept of ["waitedFrom", "leftAt", "waitedWhere", "knocked"]) {
  check(`the form still asks ${kept}`, ids.includes(kept), ids.join(","));
}
// ⚠️ With the attachment gone, the submit gate must be satisfiable by the four
// answers alone — an unreachable gate is worse than a missing field.
const standalone = buildSupportFormCase({
  includeIssues: [ISSUE_RIDER_NO_SHOW],
  askNoShowType: true,
  askSignature: true,
});
const filled: Record<string, string> = {
  issue: ISSUE_RIDER_NO_SHOW,
  noShowType: NO_SHOW_TYPES[0],
  legId: "1049800386",
  waitedFrom: "10:31",
  leftAt: "10:56",
  waitedWhere: "Bus shelter out front",
  knocked: "no",
  signature: "signed",
};
check("the form can be submitted", canSubmitCase(standalone.fields, filled));
// And is genuinely blocked without one of them, or the gate means nothing.
const { waitedWhere: _omit, ...missing } = filled;
check("the form is blocked when a required answer is missing",
  !canSubmitCase(standalone.fields, missing));

// ── Cancel at Door — the two questions the waiver rests on ─────────────────
/**
 * ⛔⛔ The waiver is a CLAIM that a member came out and refused. These checks
 * hold the line that the claim is actually asked for, and that answering it
 * honestly can take the waiver away again.
 */
check("three ways to answer who was at the door", SPOKE_WITH_OPTIONS.length === 3,
  SPOKE_WITH_OPTIONS.map((o) => o.value).join(","));
check("one of them is nobody", SPOKE_WITH_OPTIONS.some((o) => o.value === SPOKE_WITH_NOBODY),
  SPOKE_WITH_OPTIONS.map((o) => o.value).join(","));

const earning = SPOKE_WITH_OPTIONS.filter((o) => answerEarnsWaiver(o.value));
check("exactly two of the three answers earn the waiver", earning.length === 2,
  `${earning.length} of ${SPOKE_WITH_OPTIONS.length}: ${earning.map((o) => o.value).join(",")}`);
check("the member earns it", answerEarnsWaiver(SPOKE_WITH_MEMBER));
check("a point of contact earns it", answerEarnsWaiver(SPOKE_WITH_CONTACT));
check("⛔ nobody at the door earns NOTHING", !answerEarnsWaiver(SPOKE_WITH_NOBODY));
check("an unanswered question earns nothing", !answerEarnsWaiver(""));
check("and an unknown answer earns nothing", !answerEarnsWaiver("the dispatcher"));

/**
 * ⚠️ The two rules must be able to DISAGREE, or asking is theatre. The type
 * routes the driver to the questions; the answer decides the outcome.
 */
check("the route and the verdict are independent rules",
  waivesPresenceWait("Cancel At Door") && !answerEarnsWaiver(SPOKE_WITH_NOBODY));

check("the relation options are a real list", CONTACT_RELATION_OPTIONS.length >= 4,
  `${CONTACT_RELATION_OPTIONS.length}`);
check("no relation option is a person's name",
  CONTACT_RELATION_OPTIONS.every((o) => /^[A-Z][a-z]+( or [a-z]+| [a-z]+)*$/.test(o.label)),
  CONTACT_RELATION_OPTIONS.map((o) => o.label).join(" | "));

// ── The two variants ask different things ─────────────────────────────────
const cadAtPickup = buildSupportFormCase({
  includeIssues: [ISSUE_CANCEL_AT_DOOR],
  askWaitTimes: false,
});
const cadAway = buildSupportFormCase({
  includeIssues: [ISSUE_CANCEL_AT_DOOR],
  askWaitTimes: true,
});
const atPickupIds = cadAtPickup.fields.map((f) => f.id);
const awayIds = cadAway.fields.map((f) => f.id);

check("the at-pick-up variant has fields", atPickupIds.length > 0, `${atPickupIds.length}`);
check("both variants ask who was at the door",
  atPickupIds.includes("spokeWithWho") && awayIds.includes("spokeWithWho"),
  `${atPickupIds.join(",")} || ${awayIds.join(",")}`);
check("⚠️ a driver standing at the door is NOT asked to reconstruct times",
  !atPickupIds.includes("waitedFrom") && !atPickupIds.includes("leftAt"),
  atPickupIds.join(","));
check("a driver who has left IS asked when they arrived and left",
  awayIds.includes("waitedFrom") && awayIds.includes("leftAt"),
  awayIds.join(","));
// ⚠️ The pair must genuinely differ, or `askWaitTimes` is doing nothing.
check("the two variants are different forms",
  atPickupIds.join(",") !== awayIds.join(","),
  `${atPickupIds.length} vs ${awayIds.length} fields`);

// Rider No-Show keeps its own shape — the new block must not leak into it.
const plainNoShow = buildSupportFormCase({ includeIssues: [ISSUE_RIDER_NO_SHOW] });
const plainIds = plainNoShow.fields.map((f) => f.id);
check("Rider No-Show still asks its four questions",
  ["waitedFrom", "leftAt", "waitedWhere", "knocked"].every((id) => plainIds.includes(id)),
  plainIds.join(","));
check("and the Cancel at Door block did not leak into it",
  !plainIds.includes("spokeWithWho") || plainNoShow.fields
    .find((f) => f.id === "spokeWithWho")?.showIf?.equals.includes(ISSUE_RIDER_NO_SHOW) === false,
  plainIds.join(","));

const relationField = cadAtPickup.fields.find((f) => f.id === "spokeWithRelation");
check("the relation question exists", Boolean(relationField));
check("and is asked only for a point of contact",
  relationField?.showIf?.field === "spokeWithWho" &&
    relationField?.showIf?.equals.join(",") === SPOKE_WITH_CONTACT,
  `${relationField?.showIf?.field}=${relationField?.showIf?.equals.join(",")}`);

// ── The submit gate is reachable on both variants ─────────────────────────
// ⚠️ An unreachable gate is worse than a missing field: the form looks complete
// and the Submit button never lights.
const CAD_BASE = { issue: ISSUE_CANCEL_AT_DOOR, noShowType: "Cancel At Door", legId: "1049800373" };
check("the at-pick-up form submits with the member",
  canSubmitCase(cadAtPickup.fields, { ...CAD_BASE, spokeWithWho: SPOKE_WITH_MEMBER }));
check("⚠️ a point of contact cannot submit without saying who they are",
  !canSubmitCase(cadAtPickup.fields, { ...CAD_BASE, spokeWithWho: SPOKE_WITH_CONTACT }));
check("and can once they do",
  canSubmitCase(cadAtPickup.fields, {
    ...CAD_BASE, spokeWithWho: SPOKE_WITH_CONTACT, spokeWithRelation: CONTACT_RELATION_OPTIONS[0].value,
  }));
check("nobody-at-the-door is a submittable answer, not a dead end",
  canSubmitCase(cadAtPickup.fields, { ...CAD_BASE, spokeWithWho: SPOKE_WITH_NOBODY }));
check("the form is blocked with the question unanswered",
  !canSubmitCase(cadAtPickup.fields, CAD_BASE));
check("the away form needs its times too",
  !canSubmitCase(cadAway.fields, { ...CAD_BASE, spokeWithWho: SPOKE_WITH_MEMBER }));
check("and submits once they are given",
  canSubmitCase(cadAway.fields, {
    ...CAD_BASE, spokeWithWho: SPOKE_WITH_MEMBER, waitedFrom: "10:31", leftAt: "10:56",
  }));

// ── A submitted no-show shows the driver NOTHING afterwards ──────────────
/**
 * ⚠️ The PRD removed Rider No-Show's Pending state on 2026-09-08, when the
 * destination became Zendesk. The prototype had built the banner, the
 * PENDING SUPPORT REVIEW pill and the My Rides → Pending tab, and all three are
 * recorded as superseded — "never write it as spec".
 *
 * The invariant is awkward to state and worth stating anyway: the app keeps the
 * record, because the driver DID submit and the requests tray will need it,
 * while showing no status for it. Both halves are asserted — deleting the
 * record would also empty the pending lookup and would sail through a check
 * that only looked for absence.
 */
const NO_SHOW_REQUEST = { tripId: "1049800377", appTracksStatus: false };
const TRACKED_REQUEST = { tripId: "1049800377", appTracksStatus: true };

check("a no-show request shows no pending state", !showsPendingState(NO_SHOW_REQUEST));
check(
  "a no-show request is still RECORDED, not dropped",
  findAnyForTrip([NO_SHOW_REQUEST], "1049800377") !== undefined
);
check(
  "the ride surfaces see nothing for it",
  findPendingForTrip([NO_SHOW_REQUEST], "1049800377") === undefined
);
/** The negative control: the rule must still be able to return something. */
check(
  "a tracked request DOES surface, so the rule is not dead",
  findPendingForTrip([TRACKED_REQUEST], "1049800377") !== undefined
);
/** Mixed store — the untracked one must be SKIPPED, not merely sorted last. */
check(
  "an untracked request is skipped rather than ordered last",
  findPendingForTrip(
    [NO_SHOW_REQUEST, { tripId: "other", appTracksStatus: true }],
    "1049800377"
  ) === undefined
);

/**
 * ⚠️ The checks above prove the RULE is right. This one proves the no-show form
 * actually uses it — without which flipping one literal in the form would
 * restore the superseded Pending state with every check still green.
 */
check(
  "the no-show form declares itself untracked",
  /appTracksStatus:\s*false/.test(FORM_SRC),
  "expected `appTracksStatus: false` in rider-no-show-form.tsx"
);
check(
  "and never claims to be tracked",
  !/appTracksStatus:\s*true/.test(FORM_SRC),
  "rider-no-show-form.tsx sets appTracksStatus true — that restores Pending"
);

console.log(
  failures.length === 0
    ? `✓ ${passed} checks passed`
    : `✗ ${failures.length} failed of ${passed + failures.length}\n` +
      failures.map((f) => `  · ${f}`).join("\n")
);
process.exit(failures.length === 0 ? 0 : 1);
