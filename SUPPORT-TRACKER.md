# SUPPORT-TRACKER.md — In-App Support Requests

Build state for the in-app support layer. Read `SUPPORT-BIBLE.md` first for the rules; this file is what has been done and what is next.

**Branch:** `luis/support/missed-swipe-v1` · tip `901b1e5` · **nothing pushed**
**Parent (parked):** `luis/support/in-app-support-requests` · tip `05897c8` · 23 unpushed commits
**Typecheck:** 0 errors. **Tests:** none exist — see the Bible §6.
**Last updated:** 2026-08-01

---

## Where this stands

**v1 is complete: one case, Missed Swipe, verified end to end in a browser.**

The route there was not direct, and the shape of it matters. Slices 1–5 built **seven** issue types on the parent branch, each specified conversationally and built immediately. That was productive exploration — but only one of the seven had been agreed with the support lead, and a prototype makes everything in it look decided. So this branch cut back to the one case that was real, deleting the rest rather than hiding them. The exploration is intact on the parent branch; every case's spec is intact in the vault Catalog.

## Inventory — what exists on this branch

| Area | Files | State |
|---|---|---|
| Issue registry | `lib/support-data/issue-types.ts` | 1 issue: `missed-swipe`, `visibility: "hidden"` |
| Case definition | `lib/support-data/case-registry.ts` | `buildSupportFormCase({ includeIssues, requireFields })` — 9 fields |
| Prefill | `lib/support/prefill.ts` | 7 sources: issueType, driverEmail, riderName, pickupDate, legPositionLetter, legId, enRoute/pickup/dropOff times |
| Field rules | `lib/support/field-rules.ts` | `isFieldVisible`, `areRequiredFieldsFilled`, `canSubmitCase`, `emptyValues` |
| Trip context | `lib/support/trip-context.ts` | resolves `{tripId, legId}` from the visible leg picker |
| Leg / member options | `lib/support-data/{leg-options,member-options}.ts` | both generic runtime; `member-picker` currently unused by any field |
| Sheet | `components/support/support-form-sheet.tsx` | one sheet, any case. Titles itself with the locked issue |
| Field renderer | `components/support/support-field-renderer.tsx` | **15 types**, 5 used by Missed Swipe |
| Leg recap | `components/support/trip-summary-banner.tsx` | renders under any leg picker |
| Entry point | `components/driver/more-options-screen.tsx` | the Missed Swipe tile + the only `SupportFormSheet` mount |
| Store | `lib/support-data/ride-flow-context.tsx` | `submitForm`, `pendingForms`, `getPendingRequest` |
| Swipe model | `lib/driver-data/mock-trips.ts` | `LegSwipeProgress`, `getLegStage`, `getUnrecordedSwipes`, `SwipeMark` |

**Field types: 15 available, 5 in use.** In use: `select`, `leg-picker`, `time`, `number`, `textarea`, `file` (6, counting the file attachment). Unused but kept as runtime: `text`, `date`, `datetime`, `stepper`, `signature`, `member-picker`, `leg-repeater`, `notice`. Do not delete them and do not add a 16th speculatively.

## Log

### v1 — Missed Swipe alone · 2026-08-01 · ✅ complete

Eight layered commits off `05897c8`, each typechecking on its own.

| Commit | What |
|---|---|
| `542d84c` | Support Requests hub removed — `/forms`, the inbox screen, the header clipboard icon |
| `c12e65c` | The Missed Swipe tile replaces "Submit Support Form"; the Rider No-Show flow and the prototype-only case list deleted; Member No-Show demoted to a toasting production tile |
| `4bafd3e` | Trip Confirmation flows, the support chat and the message builders deleted; pre-existing dead code removed; the "Trip Update" naming drift settled |
| `0373254` | Registry cut to one issue and one field set; the leg picker locked to its ride; `buildZodSchema` dropped and the module renamed `field-rules` |
| `076e1e7` | Store reduced to submit-only; drafts and the `closing` latch removed with the hub that displayed them |
| `0d3a334` | Two rides seeded with a genuine missing swipe; presence evidence and `riderPhone` removed; scenario pills relabelled |
| `e5da4d6` | Three gaps closed that only browser verification found |
| `500f817` | This file and `SUPPORT-BIBLE.md` — the item open since slice 1 |

**14 files deleted, 10 modified.**

**Three gaps browser verification found — all real, none visible in a diff:**

1. **The form could be submitted without the time it exists to collect.** No time field was required. Fixed by resolving requiredness per-ride — via `getMissingSwipes` at the time, ⚠️ replaced by `getUnrecordedSwipes` in the correction below. The finding stands; the rule behind it was wrong.
2. **The sheet contradicted the button that opened it** — tap "Missed Swipe", land on "Submit Support Form". The sheet now takes the locked issue's name.
3. **The tile opened the form on a ride it cannot apply to.** On the needs-action ride the leg picker rendered **unlocked**, because `legScope: "in-progress"` drops a ride that has not started, so the locked "From this ride" card degraded into an open search box. The tile now checks its own prefill survived.

⚠️ **The first diagnosis of #3 was wrong** and is worth remembering: it looked like "this ride has no swipe marks", so the gate tested `activeLeg`. It didn't fire — the needs-action ride *does* carry a `progress` object, all nulls. The real cause was `withinScope`. Test the invariant, not a proxy for it.

⚠️ **And a wrong conclusion drawn from it.** A note in the seed said no ride had a missing swipe, and I read that as a fixture gap and seeded two out-of-order rides. It was in fact describing a state that cannot happen — see the correction below.

**Verified:** all four ride shapes (en-route gap, pick-up gap, no gap, ordinary started ride), the needs-action refusal, the submit gate in both directions, the pending banner and pill, the My Rides Pending move, the tile disappearing while a request is in flight, and both removed routes returning 404. Console clean apart from the pre-existing Radix warning.

### Slices 1–5 — the parked exploration · 2026-07-30 → 2026-07-31

On `luis/support/in-app-support-requests`, tip `05897c8`. All seven issue types In prototype. Kept as reference; **not** the branch to build on.

- **Slice 1** (`82c41b3`) — in-progress ride detail, the real More Options screen, the form runtime, Missed Swipe end to end into a My Rides "Pending" tab.
- **Slice 2** (`6d52143`) — the Support Requests hub, the request store re-keyed by request id, drafts, seven issue types as data, General + Payment field sets.
- **Slice 3** (`c1dd27b`) — per-issue purpose lines, Trip Request, and three new field types (`member-picker`, `stepper`, `leg-repeater`).
- **Slice 4** (`e35dd1c`) — Rider No-Show: a five-way evidence branch off seeded presence data, a draw-to-sign canvas, `Trip.market`.
- **Slice 5** (`eb8e5e9`→`05897c8`) — both Trip Confirmation cases, a fourth reach-out answer, `Trip.riderPhone`, forms in front of both escalation paths.

Seven bugs were found across those slices by driving a browser, most of them pre-existing — including one Cancel filing two drafts on *every* form in the app, and a decline template that appeared in every ride's chat. The Bible §6 traps are the durable residue.

### Model correction · 2026-08-01 · `901b1e5`

**User direction, and it replaced a model I had wrong.** I had built a "gap" model — a missed swipe as a mark absent while a LATER mark is present — with a `blocked` stage, a "Missing swipe" chip and an amber SWIPE MISSING bar to detect it. A driver cannot swipe out of order, so that state never occurs.

The real model is the complement of the ride's progress: **recorded marks lock, unrecorded marks are required.** Which means the swipe CTA already on screen tells the driver what the form will ask for. Three in-progress rides now, one per CTA.

It also answers an open question in the negative and for free: a **completed** leg has every mark recorded, so `getUnrecordedSwipes` returns nothing and it cannot file. Not a gap in v1 — a consequence of the model.

Removed: `getMissingSwipes`, `hasMissingSwipes`, `MissableSwipe`, the `blocked` stage, `isBlockedBySwipe`, the SWIPE MISSING bar, the "Missing swipe" chip, the leg-card missing footer, and four in-progress rides. **348 deletions, 82 insertions.**

## Next

1. **Get Missed Swipe's real spec from the support lead.** Priority order: (a) monthly volume, since the v1 business case rests on one case; (b) are the odometer fields real; (c) the real wording of the issue in the web form. ~~Completed rides~~ — answered, out of scope.
2. **Decide case two**, and specify it before building it. The Catalog holds five candidates with worked specs.
3. **Multi-leg trips** — the locked leg picker assumes one swipeable leg per trip. Needs a scoped-but-editable picker.
4. **Time validation** — none exists.
5. **Stories → PRD.** Not started. `reverse-engineer-prototype` before `prd-finalizer`; it is a much smaller job now than it would have been with seven cases.
6. **Push.** Nothing is pushed on either branch. Upstream is deliberately unset so a bare `git push` cannot target main.
