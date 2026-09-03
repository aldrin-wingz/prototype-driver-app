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
| Entry point | `components/driver/more-options-screen.tsx` | the existing **Member No-Show** tile, always shown; guardrail 1 refuses here |
| Production screen | `components/driver/member-no-show-screen.tsx` · `app/my-rides/[id]/no-show/` | type + signature + Submit; guardrail 2 refuses here |
| Form mount | `components/support/rider-no-show-form.tsx` | `buildRiderNoShow` + the gap callout |
| Store | `lib/support-data/ride-flow-context.tsx` | `submitForm`, `pendingForms`, `getPendingRequest` |

**Field types: 15 available, 5 in use** — `select`, `text`, `leg-picker`, `time`, `file`. (`signature` is no longer a form field; it lives on the Member No-Show screen.) Unused but kept as runtime: `text`, `textarea`, `date`, `datetime`, `number`, `stepper`, `member-picker`, `leg-repeater`, `notice`. Do not delete them and do not add a 16th speculatively.

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

### Production flow, replicated · 2026-09-03

Reference captures of the real Member No-Show arrived, and they changed the shape: production is a **pushed screen**, not a sheet, and its guardrail fires at **Submit**.

| Change | Why |
|---|---|
| New `/my-rides/[id]/no-show` screen | `No-Show Type:` select, tall full-bleed `Driver Signature`, centred blue Clear, pinned teal Submit — as captured |
| Guardrail 2 moved to Submit | Production's order. ⚠️ Means a driver about to be refused has already signed; familiarity was chosen over the saved keystrokes |
| Two refusal dialogs, both production copy | Guardrail 1 on the grid, guardrail 2 on the screen. `wait_too_short` is production's exact wording |
| The refusal is no longer a dead end | Same dialog, plus **Submit support form** → the form. That one button is the whole project in miniature |
| Signature moved out of the form | The screen collects it before the gate, so asking again would be a second signature for one claim |
| `No-Show Type` carried into the form, locked | Support needs to know which kind was claimed; the driver should not retype it |
| All three captured types | Member Not Home · Cancel At Door · Member Not Ready |
| Tile is ALWAYS shown | Production behaviour. The grid never reshapes — seven tiles, `Send Back Trip` full-width |

**⚠️ A modelling error the user caught, and it is the one worth remembering.** Guardrail 1 read swipe state alone, so an **unconfirmed** trip — whose CTA is the orange I REACHED OUT TO CONFIRM — computed `next = "start"` and was **allowed**. An unconfirmed trip and a confirmed-but-unstarted one have identical swipe marks; the difference lives on the trip, not the leg. Now `canFileNoShow(trip, leg)`, and the break test is the point: on that ride the two conditions genuinely disagree, so the check is load-bearing rather than decorative.

**Two more the browser found that the diff hid:**

1. **The No-Show Type arrived BLANK in the form.** The sheet seeds values in a `useState` initialiser, which runs once at mount — and it mounts closed, before the driver has picked anything. Fixed by re-keying on the type. Verified with the *second* option, not the first, since a re-key that only worked for one value would pass a first-option test.
2. **A titleless `AlertDialog` logs an accessibility error on every open.** The capture has no visible heading, so omitting the title matched it visually and broke screen readers. Now present and `sr-only`.

**⚠️ `Cancel At Door` is not a no-show.** A member who came to the door and cancelled did show up. Production files it here anyway; modelled as captured rather than corrected, and now an open question — including whether it earns the no-show fee.

**Verified in the browser:** all three types render in order; `260731-780322` (unconfirmed) and `371` (on board) both show the tile and refuse with production's sentence; `370` and `372` pass to a success toast naming the minutes recorded; `373`/`374`/`375` refuse and lead to the form with the type carried and locked, the gap named in the callout, prefilled times editable, and no second signature. Submit is gated by the signature and NOT by the attachment. Console clean.

### The real logic, ported · 2026-09-04

The production `canNoshow` source arrived, and it corrected the model twice over. What I had built — a 1-mile radius, a dwell total, and a general "after the pickup time" rule — was wrong on all three counts.

**What the code actually enforces:** the walk goes newest→oldest, rejects the moment a record is further than **0.5 mi**, and **stops at the first record ten minutes old**. Which is: *within 0.5 miles, continuously, for the last ten minutes.* `walkLocationRecords` mirrors it line for line so it stays auditable.

| Change | Why |
|---|---|
| Radius 1 mi → **0.5 mi** | The code compares `0.5`. ⚠️ Unit unconfirmed — `calculate_distance_two_points` has no conversion near it |
| Dwell total → **the walk** | A gap resets the clock; a total does not. Scenario 3 exists to prove it |
| `wait_before_pickup_time` **deleted** | Not a general rule — WellTrans Indiana only, and +15, not "after" |
| Seeded verdict → **seeded records** | Every scenario is a shape of `leg.locationRecords`, so each ride exercises the rule rather than asserting it |
| Two outcomes → **five** | `files` · `timer` · `form` · `confirm-first` · `dead-end` |
| — | **`useNoShowClock`**: the one real clock, relative to mount, so a countdown genuinely runs down and the gate genuinely opens |

**The discriminator production throws away.** `nearRunOldestAge` — the age of the oldest record in the unbroken near-run from newest. Its *existence* proves the driver is at the pickup right now; its *value* is the countdown target. Without it, "waited then drove off" and "just arrived" are identical on the stated rules, which is why production shows both the same message.

**⚠️ A timer never offers the form.** The driver is at the pickup and simply has not waited long enough; a form there is a way to skip the wait. `refusalOffersForm` is gated on `kind === "form"`.

**Three findings against the production check**, all open:

1. **The "check your location settings" message is unreachable.** The function saves a `Location` row from the incoming lat/lng before it queries, so `if not locations:` can't be satisfied. A driver with location off gets *"wait at least 10 minutes"* — told to wait when the fix is a permissions toggle. `IMPLAUSIBLE_FIX_MILES` is how this branch says the right thing, and it is **ours**.
2. **`order_by('-id_location')` sorts by primary key, not `created_at`.** If the app ever batch-uploads buffered locations, the walk stops moving backwards through time and could `break` on an out-of-order old-but-near record — **passing a driver who left and came back**.
3. **Filtered by `id_user`, not `id_ride`** — a previous trip's drop-off two miles away blocks this one.

**Scenario set,** after two rounds of the user simplifying: six, named against the check. Dropped as data-identical to scenario 4: "waited then drove off" and "never got near" — latest record outside the radius, no near-run, so one ride covers all three and the form is where the driver says which.

**Verified:** all six resolve correctly plus both extras; the timer ticks live (0:28 → 0:04 → **Submit**) and then files, naming the minutes recorded; the timer dialog carries production's exact copy **plus how long is left** and offers **OK only**; scenario 5 shows the message production has and cannot reach. `bun run typecheck` at 0.

**A verification error worth recording:** I read a button as "Submit" and nearly called the timer broken — the browser was still on the previous ride because `curl` had warmed the route without navigating the pane. Warm with curl, then navigate; never read the result of one as the other.

**And a prototype seam:** long waits show a **duration** (`2h 05m`), not a clock time. "Available at 10:15 AM" is better product, but it adds real minutes to the real clock while every ride time here is seeded fiction — a ride whose pickup reads 1:50 PM was offering "2:29 AM". A real build should show the time of day.

## Next

1. **Is `Cancel At Door` really a no-show?** It is the odd one of the three captured types — the member appeared. Does Support want it as its own claim, and does it earn the fee?
2. **Answer the three findings above** with whoever owns `canNoshow` — the unreachable message is the one a driver feels today.
3. **Does `calculate_distance_two_points` return miles?** `0.5` is compared bare. Kilometres would make the real radius 0.31 mi.
4. **What `CHECKED` means**, and whether the confirmation gate exists server-side at all.
5. **Confirm the wait rule with ops** — is it 10 minutes and 1 mile, is it uniform across clients and markets, and is "after the pick-up time" right?
6. **The no-show fee.** Does a form-path no-show earn it, and should an unenforced-proof form be able to trigger a payment at all? The prototype touches pay nowhere.
7. **The on-site rule** — the parked branch required `Verida`+`TN` drivers to file from the pick-up. This branch drops it. Intended?
8. **What counts as proof in production**, and its false-negative rate — that rate *is* the volume of this form.
9. **Should filing end the ride** or change its status?
10. **Stories → PRD.** Not started. `reverse-engineer-prototype` before `prd-finalizer`.
11. **Push.** Not yet pushed; no upstream is set, deliberately, so a bare `git push` cannot target main.
