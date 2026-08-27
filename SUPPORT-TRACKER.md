# SUPPORT-TRACKER.md — In-App Support Requests

Build state for the in-app support layer. Read `SUPPORT-BIBLE.md` first for the rules; this file is what has been done and what is next.

**Branch:** `luis/support-form` · tip `203fcd5`
**Parent (parked):** `luis/support/in-app-support-requests` · tip `05897c8` · **local only**, 23 unpushed commits
**Typecheck:** 0 errors. **Tests:** none exist — see the Bible §6.
**Last updated:** 2026-08-28

---

## Where this stands

**v1 is complete: one case, Missed Swipe, verified end to end in a browser.**

The route there was not direct, and the shape of it matters. Slices 1–5 built **seven** issue types on the parent branch, each specified conversationally and built immediately. That was productive exploration — but only one of the seven had been agreed with the support lead, and a prototype makes everything in it look decided. So this branch cut back to the one case that was real, deleting the rest rather than hiding them. The exploration is intact on the parent branch; every case's spec is intact in the vault Catalog.

## Inventory — what exists on this branch

| Area | Files | State |
|---|---|---|
| Issue registry | `lib/support-data/issue-types.ts` | 1 issue: `missed-swipe`, `visibility: "hidden"` |
| Case definition | `lib/support-data/case-registry.ts` | `buildSupportFormCase({ includeIssues, requireFields })` — 7 fields |
| Prefill | `lib/support/prefill.ts` | 7 sources: issueType, driverEmail, riderName, pickupDate, legPositionLetter, legId, enRoute/pickup/dropOff times |
| Field rules | `lib/support/field-rules.ts` | `isFieldVisible`, `areRequiredFieldsFilled`, `canSubmitCase`, `emptyValues` |
| Trip context | `lib/support/trip-context.ts` | resolves `{tripId, legId}` from the visible leg picker |
| Leg / member options | `lib/support-data/{leg-options,member-options}.ts` | both generic runtime; `member-picker` currently unused by any field |
| Sheet | `components/support/support-form-sheet.tsx` | one sheet, any case. Titles itself with the locked issue |
| Field renderer | `components/support/support-field-renderer.tsx` | **15 types**, 5 used by Missed Swipe |
| Leg recap | `components/support/trip-summary-banner.tsx` | renders under any leg picker |
| Field warnings | `lib/support/time-order.ts` | `getTimeOrderWarnings` — advisory only, **not** wired to the submit gate |
| Entry points | `components/driver/more-options-screen.tsx` (tile behind `More`) · `components/driver/ride-detail-layout.tsx` (⚠️ provisional: detection prompt · refused swipe · stale trip, the last two on the swipe CTA) | all four mount the shared `components/support/missed-swipe-form.tsx` |
| Store | `lib/support-data/ride-flow-context.tsx` | `submitForm`, `pendingForms`, `getPendingRequest` |
| Swipe model | `lib/driver-data/mock-trips.ts` | `LegSwipeProgress`, `SWIPE_SEQUENCE`, `getLegStage`, `getUnrecordedSwipes`, `SwipeMark`, ⚠️ `MissedSwipeSignal` / `getMissedSwipeSignal`, ⚠️ `SwipeBlock` / `getSwipeBlock`, ⚠️ `StaleTrip` / `isStale` |
| Ride list filing | `app/my-rides/page.tsx` | stale trips MOVE to Needs Action with a "Stale Trips" pill — an overlay, not a status |

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

### Detection use case · 2026-08-01 · `66844f4`

⚠️ **Provisional — the detection rule is an assumption, not an agreed behaviour.**

A fourth use case, and the first the app can raise on its own. `TripLeg` gains a seeded `missedSwipeSignal` (arrival, departure, dwell at a waypoint), and a ride carrying one shows a **"Missed Swipe?"** prompt above the action row that goes straight into the form — no More screen. New ride `1049800373` has the *same swipe state* as `371`, so the signal is provably the only difference.

The prompt does not replace the swipe CTA, because the inference can be wrong and a false positive must not strand a driver who is genuinely still en route. `getMissedSwipeSignal` also gates on the implied swipe still being outstanding, so it disappears the moment the driver swipes.

`MissedSwipeForm` extracted at the same time — with two entry points, the required fields, the locks and the store write must not be able to differ.

### Entry points at the moment of failure · 2026-08-28 · `6c26188` → `203fcd5`

⚠️ **All of it provisional.** The threshold, the refusal reasons and every word of copy are assumptions or placeholders.

The gap this closed: the prototype had no representation of the moments a missed swipe is actually *noticed*. A driver reaching for the swipe and finding it will not work is the natural trigger, and it led nowhere — the CTA was a decorative `<div>` with no handler, no `role` and no focus.

| Commit | What |
|---|---|
| `6c26188` | Time-order warning. `SWIPE_SEQUENCE` now declared once and read by both `getUnrecordedSwipes` and the new check |
| `0bf8ecd` | `SwipeBlock` and `StaleTrip` seeded; rides `1049800374` (refused at 1.4 mi) and `1049800375` (3 h past appointment, nothing swiped) |
| `203fcd5` | The CTA becomes a real button with three outcomes; the stale banner; staleness filed into Needs Action as an overlay |

**Four judgment calls worth keeping:**

1. **The third branch is what makes the other two safe.** An ordinary ride toasts. That is what lets Swipe to Start stay an ordinary swipe at any lateness and only divert once the trip is stale — the user's rule, and it falls out of ordering the branches rather than needing a second rule.
2. **A mark must not precede the LATEST mark ahead of it, not the nearest.** Comparing against the nearest predecessor silently misses a drop-off that clears a wrong pick-up but not the en-route time. The unit sweep included that exact case precisely because it is the one that separates the two implementations.
3. **Staleness is an overlay, not a status** — and the vault's own instrumentation ask independently makes the same call for refused swipes (*"please do not add a 'swipe rejected' ride status"*). `trip.status` drives the detail screen, so a `needs-action` status would take the swipe region away at the moment the driver needs it.
4. **"Lookback ran out" is not a driver-app state.** The vault is unambiguous: the GPS lookback is an async backend correction on *completed* trips that **accepts** a far swipe when it finds nothing nearby. The driver-facing state is that the swipe was refused, so that is what got modelled — using the vault's own reason codes rather than a second vocabulary.

**A trap this cost:** an **enabled** Submit button measured back as the *disabled* colour. The pane tab is `visibilityState: "hidden"`, so CSS transitions are frozen and `getComputedStyle` returns pre-transition values. Would have been reported as a bug; injecting `transition: none !important` showed the correct colour. Now in the Bible §6.

**Verified in the browser**, all six rides: the three unchanged CTAs toast, `373`'s prompt is untouched, `374` opens the form with en-route locked at 8:47, `375` shows the banner and `MISSED SWIPE?` over "Swipe to Start · A Leg" and asks for all three marks. Tab counts In Progress 5 / Needs Action 2. Submitting from `375` moved it to Pending and suppressed the banner. The warning fired with **Submit enabled** — and the gate held while drop-off was blank and released when it was filled, so it is answering requiredness rather than the warning. Console clean.

## Next

1. **Get Missed Swipe's real spec from the support lead.** Priority order: (a) monthly volume, since the v1 business case rests on one case; (b) the real wording of the issue in the web form. ~~Completed rides~~ and ~~odometers~~ — both answered.
2. **Decide case two**, and specify it before building it. The Catalog holds five candidates with worked specs.
3. **Multi-leg trips** — the locked leg picker assumes one swipeable leg per trip. Needs a scoped-but-editable picker.
4. ~~**Time validation**~~ — ✅ a non-blocking order warning ships. Still open: whether Support wants the discrepancy **recorded** on the request rather than only shown at entry. `getTimeOrderWarnings` already computes it, so storing a boolean is a one-liner.
5. **Get the owed copy from Jeff** — the Stale Trips banner and the `MISSED SWIPE?` label are placeholders. Both carry `TODO(jeff)`.
6. **Confirm the staleness rule with ops** — is it 2 hours, and is it after the **appointment** or after **pickup**? The vault's only comparable rule keys off pickup.
7. **The Support side.** A submitted form has nowhere to land: the driver is told Support will handle it in the CS Tool, and no such surface exists. Next up on branch `luis/support-forms-portal` in the CS Tool repo.
8. **Stories → PRD.** Not started. `reverse-engineer-prototype` before `prd-finalizer`; it is a much smaller job now than it would have been with seven cases.
9. ~~**Push.**~~ ✅ `luis/support-form` tracks `origin/luis/support-form` (first pushed 2026-08-01, last at `3b0da41`). A bare `git push` targets that branch, never main. The parked parent is still local only.
