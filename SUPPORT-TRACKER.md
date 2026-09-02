# SUPPORT-TRACKER.md — Rider No-Show

Build state for this branch. Read `SUPPORT-BIBLE.md` first for the rules; this file is what has been done and what is next.

**Branch:** `luis/rider-no-show` · off `luis/support-form` at `19622fd`
**Siblings:** `luis/support-form` (Missed Swipe, pushed) · `luis/support/in-app-support-requests` (7 cases, parked, local only)
**Typecheck:** 0 errors. **Tests:** none exist — see the Bible §7.
**Last updated:** 2026-09-03

---

## Where this stands

**Complete: one case, Rider No-Show, verified end to end in a browser.**

The branch exists because the case had to be **specified before it was built**. A Rider No-Show already existed on the parked branch, and the Bible forbids cherry-picking one back — the point is the specification step, not the code. That turned out to matter: the spec that came back asks **three** things where the old one asked seven, and **replaces two hard refusals with the form**. Building the old one would have shipped decisions nobody made.

## Inventory

| Area | Files | State |
|---|---|---|
| Guardrails | `lib/driver-data/no-show-rules.ts` | `canFileNoShow`, `resolveNoShowGate`, `qualifyingWaitMinutes`, `toMinutesOfDay`, `NO_SHOW_WAIT_MINUTES`, `NO_SHOW_RADIUS_MILES` |
| Seeded evidence | `lib/driver-data/mock-trips.ts` | `NoShowWaitEvidence` on `TripLeg`; six in-progress rides, one per outcome |
| Issue registry | `lib/support-data/issue-types.ts` | 1 issue: `rider-no-show`, `visibility: "hidden"` |
| Case definition | `lib/support-data/case-registry.ts` | `buildSupportFormCase({ includeIssues })` — 6 fields; `WAIT_TIME_SEQUENCE` |
| Prefill | `lib/support/prefill.ts` | `waitArrivedAt` / `waitLeftAt` from the seeded evidence |
| Field warnings | `lib/support/time-order.ts` | `getTimeOrderWarnings(fields, values, order)` — generic, advisory only |
| Sheet | `components/support/support-form-sheet.tsx` | one sheet, any case; titles itself with the locked issue |
| Field renderer | `components/support/support-field-renderer.tsx` | **15 types**, 5 used here |
| Entry point | `components/driver/more-options-screen.tsx` | the existing **Member No-Show** tile |
| Form mount | `components/support/rider-no-show-form.tsx` | `buildRiderNoShow` + the gap callout |
| Store | `lib/support-data/ride-flow-context.tsx` | `submitForm`, `pendingForms`, `getPendingRequest` |

**Field types: 15 available, 5 in use** — `select`, `leg-picker`, `time`, `file`, `signature`. Unused but kept as runtime: `text`, `textarea`, `date`, `datetime`, `number`, `stepper`, `member-picker`, `leg-repeater`, `notice`. Do not delete them and do not add a 16th speculatively.

## Log

### Rider No-Show · 2026-09-03 · off `19622fd`

**The cut was clean.** The runtime has no structural dependency on any case — only 7 files carried Missed Swipe, and four more mentioned it in comments only. The sweep for `missed swipe` / `swipeBlock` / `staleSince` / `isStale` / `getUnrecordedSwipes` now returns **zero hits**.

Kept, under *delete what serves a deleted case, keep what serves any case*: the whole form runtime, the store, and **the swipe progress model** — guardrail 1 is `getLegStage(leg) === "started"`, so the model stays even though the case went.

**Five judgment calls worth keeping:**

1. **Seed the evidence, derive the verdict.** A departure from how `missedSwipeSignal` and `swipeBlock` worked, and correct here: the rule *is* the spec, so seeding the verdict would leave `10` and `1` decorative and the three failing rides differing only by a label.
2. **`375` waits 18 minutes and still fails.** Seeded above the ten-minute bar deliberately — it is the only ride that can prove the "after the pick-up time" clause does its own work rather than riding along with the duration check. A seed under the bar would have passed for the wrong reason.
3. **Hide the tile, don't disable it.** A control that appears and then refuses is exactly what this case exists to fix.
4. **The prefilled times must not lock** — the inverse of a swipe mark. What prefills is the evidence just judged insufficient; locking it would stop the driver correcting the one thing we are unsure about.
5. **`time-order.ts` was generalised rather than deleted.** It hardcoded the swipe sequence, which had to go anyway; taking the order as a parameter made it apply unchanged to *waited-from → left-at*. The best thing on the old branch survived the cut for free.

**Verified in the browser**, all six rides: `370`/`371` show no tile and the grid reflows (`Send Back Trip` spans 2); `372` toasts and opens nothing; `373`/`374`/`375` each open the form with a callout naming **that ride's** gap; prefilled times are present where evidence exists, blank where it does not, and **editable in every case**. The submit gate held while the signature was missing and released once signed **with the attachment still empty** — so it is answering the signature, not the file, and `requiredNotEnforced` renders its flag line. The time warning fires with Submit still enabled and clears when the order is fixed. Submitting moved the ride to Pending: In Progress 6 → 5, Pending 1, and the ride is in one place, not both.

**A trap this cost:** checking the Pending move with `location.href` **reset the in-session store** and destroyed the state being read. Client-side navigation only — the back chevron is `router.push`. Now in the Bible §7.

**A copy fix browser verification found:** the warning read *"earlier than What time did you start waiting? (10:19 AM)"* — a question quoted mid-sentence. Added `shortLabel` for prose; it now reads *"earlier than the time you started waiting"*.

## Next

1. **Confirm the wait rule with ops** — is it 10 minutes and 1 mile, is it uniform across clients and markets, and is "after the pick-up time" right?
2. **The no-show fee.** Does a form-path no-show earn it, and should an unenforced-proof form be able to trigger a payment at all? The prototype touches pay nowhere.
3. **The on-site rule** — the parked branch required `Verida`+`TN` drivers to file from the pick-up. This branch drops it. Intended?
4. **What counts as proof in production**, and its false-negative rate — that rate *is* the volume of this form.
5. **Should filing end the ride** or change its status?
6. **Stories → PRD.** Not started. `reverse-engineer-prototype` before `prd-finalizer`.
7. **Push.** Not yet pushed; no upstream is set, deliberately, so a bare `git push` cannot target main.
