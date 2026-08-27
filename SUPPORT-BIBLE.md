# SUPPORT-BIBLE.md — In-App Support Requests

The durable rules for the in-app support layer on this branch. Read this before changing anything under `lib/support*`, `components/support/`, or the support entry point on a ride.

**Branch:** `luis/support-form`
**Scope:** one support case — **Missed Swipe**
**Last updated:** 2026-08-28

Vault companions: `Project - In-App Support Requests/Working Plan - In-App Support Requests.md` (live state, decisions log), `General Plan.md` (§5 delivery model), `References/Support Case Catalog.md` (per-case specs, including the six not in this branch).

---

## 1. What this is

The NEMT Driver App sends drivers to Zendesk when something goes wrong operationally. This layer moves that in-app: a support case becomes a **schema-driven form** rather than a bespoke screen, so covering more cases costs a data edit rather than a build.

v1 proves that with one case. A driver who drove a leg but whose swipe never registered can correct the time from the ride itself, and the request lands in a pending-review state the driver can see.

## 2. The one rule that governs this branch

> **A case is in the prototype only once it has been agreed.**

Six other cases were built here (General, Payment Related, Trip Request, Rider No-Show, and both Trip Confirmation cases) and then **deleted**, because none had been agreed with the support lead. They are not hidden behind a flag — flags on a whole case do not hold. A prototype is the most persuasive artifact in a project; anything in it reads as decided.

- Their code is preserved on `luis/support/in-app-support-requests` (tip `05897c8`).
- Their specs are preserved in `References/Support Case Catalog.md`, marked ⏸️ deferred.
- Adding one back means specifying it first, then building it.

**Do not re-add a case by cherry-picking it from the parent branch.** The point is the specification step, not the code.

## 3. What NOT to build

- **No agent- or Support-side screens.** What the agent sees when a request lands is out of scope; it belongs in the CS Tool, where the real one lives.
- **No real backend, no Zendesk integration, no auth.** Mock data only.
- **No redesign of existing driver-app surfaces.** Support capability is layered onto them. The More Options grid, the ride detail, the header and the bottom nav stay as captured.
- **No new bottom-nav tab.** Support is reached from a ride, not promoted to top-level navigation.
- **No entry point that isn't a ride.** Four exist, every one of them on a ride: the Missed Swipe tile behind `More`, the detection prompt, a **refused swipe**, and a **stale trip**. All go through `MissedSwipeForm` so they cannot drift. `/forms` and the header clipboard icon existed and were removed on purpose — a support form belongs to a trip.
- **No speculative field types.** The runtime has 15; do not add a 16th until a specified case needs it.
- **No case beyond the seven** in the Catalog until it has been specified.

## 4. Architecture

```
FOUR entry points, all on a ride:
  components/driver/more-options-screen.tsx    the Missed Swipe tile behind `More`
  components/driver/ride-detail-layout.tsx     the detection prompt
                                               a refused swipe   (tap the CTA)
                                               a stale trip      (tap the CTA)
        │
        ▼
components/support/missed-swipe-form.tsx    ONE shared mount, so required fields,
        │                                   locks and the store write cannot drift
        ├── lib/support-data/issue-types.ts     the issue registry (one entry: missed-swipe)
        ├── lib/support-data/case-registry.ts   buildSupportFormCase() — fields as data
        ├── lib/support/prefill.ts              what the app already knows
        │
        ▼
components/support/support-form-sheet.tsx   the sheet — one component, any case
        ├── support-field-renderer.tsx          15 field types
        ├── trip-summary-banner.tsx             the selected leg, recapped
        ├── lib/support/field-rules.ts          visibility + the submit gate
        └── lib/support/time-order.ts           per-field warnings — advisory, NOT a gate
        │
        ▼
lib/support-data/ride-flow-context.tsx      in-session store: submitForm, getPendingRequest
        │
        ▼
ride detail banner + pill  ·  My Rides → Pending
```

**A case is data, not code.** `SupportCaseDefinition.fields` is a `SupportField[]`; the sheet renders whatever is in it. Nothing about Missed Swipe is hardcoded in a component.

## 5. Conventions that are load-bearing

**Data-driven, not logic-driven.** `MOCK_TODAY` is a constant. Swipe state is *seeded* in `mock-trips.ts`, never computed from a clock. **Choosing a ride is how you pick a scenario** — that is the whole demo mechanic, and it is why the scenario pills exist.

**`lockWhenPrefilled` means "the app supplied this", not "this has a value".** Tracked in an `appSupplied` set and cleared the moment the driver touches the field. The other reading locks a driver out of changing their own answer.

**`requiredNotEnforced`** — required in the real flow, excluded from the submit gate, renders the ⚠️ flag. Not used by Missed Swipe; kept for cases that need it.

**Whether a field is required is a property of the RIDE, not the field.** A driver filing a Missed Swipe is asserting they drove the leg and could not swipe it, so **every mark with no time against it is required, and every recorded mark is locked.** The entry point resolves `getUnrecordedSwipes(leg)` and passes `requireFields` to the builder.

That makes the swipe CTA already on screen the thing that tells the driver what the form will ask for:

| CTA showing | Recorded | Form asks for |
|---|---|---|
| SWIPE TO START | nothing | En-route, Pick-up, Drop-off |
| PICK UP MEMBER | en-route | Pick-up, Drop-off |
| DROP OFF MEMBER | en-route + pick-up | Drop-off |

**⚠️ The swipe itself is an entry point — provisional.** The moment a driver actually notices a missed swipe is when they reach for the swipe and it will not work, so that moment must lead somewhere rather than requiring a tile behind `More`. The CTA is a real button with three outcomes, resolved in order:

| Ride state | Tapping the swipe |
|---|---|
| `staleSince` set | Label reads **MISSED SWIPE?**, opens the form. Regardless of which swipe was next. |
| `swipeBlock` on the next mark | Opens the form, with the refusal reason under the button |
| neither | Toasts *"Not wired in the prototype"* — the convention every unwired action uses |

That third row is the reason the other two are safe. **A late trip keeps its ordinary swipe for as long as starting it is still plausible**, and only diverts once it is not — so Swipe to Start stays a swipe at any lateness up to the staleness boundary.

Two details that are load-bearing:
- **The CTA keeps its stage colour even when the label changes.** A driver reads this button by colour before they read the words, and which swipe is owed has not changed. The amber banner above carries the exception.
- **On a stale ride the swipe's own name moves to the second line, it does not disappear.** The question leads, but the trip is genuinely still open and the driver has to be able to see what they owe.

**⚠️ Staleness is an OVERLAY, never a status.** Tab membership is array membership, but `trip.status` is what the detail screen reads — and a `needs-action` status renders the orange confirmation footer instead of the swipe region, which is the one thing a stale trip actually needs. So a stale trip keeps `status: "in-progress"` and only its filing changes: `app/my-rides/page.tsx` adds it to Needs Action with a "Stale Trips" pill and takes it out of In Progress, exactly as `pendingForms` already does for Pending. It **moves**, it does not appear twice — two copies and the driver cannot tell what still needs them.

The same call applies to a refused swipe, and the vault's own instrumentation ask says so outright: *do not add a "swipe rejected" ride status.* A refusal is a fact about one attempt.

**⚠️ "Lookback" is NOT a driver-app state.** The GPS lookback is an async **backend** correction on completed trips: it searches ±45 min for a position within 1000 ft and, finding none, **accepts** the far swipe. So "lookback can no longer handle it" describes nothing the driver ever sees. What they experience is that the swipe was refused — which is what `SwipeBlock` models, using the reason codes from the vault's own ask (`too_far_from_pickup`, `too_early`, `out_of_sequence`, `odometer_missing`, `odometer_invalid`, `network_or_server_error`) rather than a second vocabulary for the same thing.

**Time order warns and never blocks.** `getTimeOrderWarnings` (`lib/support/time-order.ts`) flags a mark entered earlier than one ahead of it in the sequence. `canSubmitCase` does not read it, deliberately: the driver was on the trip and we were not, so a time that looks impossible to us is a question, not a rejection, and Support sees every value either way. Values are `"HH:MM"` 24-hour strings, so they compare **lexicographically = chronologically** — no parsing, no clock. ⚠️ Single-day only: a leg past midnight reads as backwards and warns wrongly. Not solved, because the form collects no date per mark — and harmless, because the warning gates nothing.

A mark must not precede **any** mark ahead of it, which is the same as saying it must not precede the **latest** of them — so one comparison against the largest preceding value settles it. Comparing against the *nearest* predecessor instead silently misses a drop-off that clears a wrong pick-up but not the en-route time.

**⚠️ One case the app CAN raise itself — provisional.** Everything above is derived from swipe marks, which is why the driver has to initiate it: nothing in `progress` separates "has not got there yet" from "went, did it, could not swipe". **Location does.** A seeded `missedSwipeSignal` on a leg says the driver reached a waypoint, stayed long enough to have done the thing, and has since left with the swipe still owed — and a ride carrying one shows a **"Missed Swipe?"** prompt straight into the form, no More screen.

Two rules that keep it honest, and both matter:
- **The prompt sits above the swipe CTA and never replaces it.** The inference can be wrong; a false positive must not strand a driver who really is still en route. It asks, it does not assert.
- **`getMissedSwipeSignal` gates on the implied swipe still being outstanding.** Once the driver swipes, evidence for a swipe we now have is noise.

⚠️ **There is no "gap" to detect, and an earlier version of this branch wrongly modelled one.** It treated a missed swipe as a mark absent while a LATER mark was present, and built a `blocked` stage, a "Missing swipe" chip and an amber SWIPE MISSING bar around detecting it. A driver cannot swipe out of order — marks fill left to right — so that state never occurs. The app cannot tell "not there yet" from "drove it but couldn't swipe"; only the driver can, which is why filing is a deliberate act and the bottom bar is always just the normal swipe CTA.

**Every issue is `hidden`, and the issue field is always locked.** Every entry point knows its case before the form opens. The field stays because it is the seam: `includeIssues` puts the issue in the options so the locked control can render its label, and seeding `issue` in the initial values marks it app-supplied.

**Adding case two:**
1. Register an issue in `issue-types.ts`.
2. Add a field block gated on `showIf: ONLY_<CASE>` in `case-registry.ts`.
3. Add a tile that passes that issue via `includeIssues` + `initialValues.issue`.

No runtime change. This is why `showIf` is kept on the Missed Swipe fields even though it is now always true.

## 6. Traps, all of them paid for

**⚠️ vaul fires `onOpenChange(false)` BEFORE the handler that caused it.** In a multi-sheet flow a hand-off and a dismissal are therefore indistinguishable at that instant — no synchronous comparison works, ref or otherwise. Defer the decision by a tick. v1 has no multi-sheet flow, but the next case may. **Instrument, don't theorise:** this cost several wrong hypotheses and a two-line ordered trace settled it in one run.

**⚠️ `legScope: "in-progress"` silently blanks a prefilled leg** whose ride is not in `mockInProgressTrips` — `withinScope` in `prefill.ts` drops it. The failure is quiet and looks like something else entirely: a locked "From this ride" card degrades into an open search box. **Test the invariant, not a proxy for it** — check the prefill survived, don't check whether the leg exists.

**⚠️ `lockedBadge` has THREE states, not two.** Omitting it falls through to the default `"Already recorded"` — so removing a field's badge by deleting the property silently swaps it for a worse one. `null` is the opt-out. Caught in the browser after "Chosen for you" came back as "Already recorded" on the issue field.

**⚠️ `getMemberOptions()` spans only completed rides in the last 30 days**, so a needs-action or in-progress rider cannot resolve in a `member-picker`. It renders an open search box holding an unresolvable value. Use a locked `text` field instead.

**⚠️ A completed leg cannot file.** Every mark is recorded, so `getUnrecordedSwipes` returns nothing and there is nothing to correct — that is the answer to "should completed rides be correctable", and it falls out of the model rather than needing a rule. A ride awaiting member confirmation is out of scope for this case entirely.

**⚠️ Verification is browser-only. There is no test framework** — no vitest, no jest, no playwright, zero test files. `bun run typecheck` (`tsc --noEmit`) is the only automated check, and it must stay at 0.

**⚠️ The browser pane's tab is `visibilityState: "hidden"`, so CSS transitions are FROZEN.** `getComputedStyle` returns the value from *before* the transition, which fabricates bugs that are not there. Measured here: an **enabled** Submit button read back `rgb(110, 231, 183)` — the `disabled:bg-[#6EE7B7]` colour — while `submit.disabled` was `false`. Waiting does not help and `tabs_select` does not help. Inject `* { transition: none !important }` before measuring; it then read `rgb(16, 185, 129)` as it should.

**Browser-tool gotchas:** synthetic clicks need a full pointer sequence (`pointerdown`/`mousedown`/`pointerup`/`mouseup`/`click`) dispatched via `javascript_tool`; React-controlled inputs need the native value setter plus an `input` event; two *dependent* clicks in one call fail because React has not re-rendered — split them; `navigate` needs `force: true` and sometimes lands on `/` anyway (use `location.href`); a Radix `Select` needs a genuine click at screenshot coordinates because the page can be transform-scaled. **`document.body.innerText` applies CSS `text-transform`** — it reads an uppercased pill as uppercase, so a check for "Pending Support Review" fails against it. `textContent` does not.

**The layout mounts the Radix `Toaster`**, so `toast` must come from `@/hooks/use-toast`. Importing from `sonner` typechecks and silently renders nothing.

## 7. Provisional — authored, not captured

Flagged so it cannot be mistaken for an agreed requirement:

| Thing | Status |
|---|---|
| ~~The odometer fields~~ | ✅ **Removed 2026-08-01.** Authored, never captured, and nobody asked for them. |
| Time **validation** | ✅ **Partly answered 2026-08-28.** A time entered out of order now warns, naming both values. It does **not** block — see §5. What is still open is whether Support wants it recorded as a flag on the request. |
| **Stale Trips** banner copy and the `MISSED SWIPE?` label | ⚠️ **Placeholder — owed by Jeff.** Both carry `TODO(jeff)` in `ride-detail-layout.tsx`. The copy reads as final on purpose so a demo is not littered with markers; this row is the record that it is not. |
| The **2-hour** staleness threshold | ⚠️ The user's number, unvalidated against ops — and nothing in the vault defines a stale trip at all. Also unconfirmed: "2 hrs after **appointment**" vs after **pickup**; the vault's only comparable rule keys off pickup. Seeded on the ride as data rather than written into code as a rule. |
| **Which distance actually refuses a swipe** | ⚠️ The vault contradicts itself — logs enforce 1000 ft, one fixture says 100 ft, the hard block is 1 mile. Ride `1049800374` seeds 1.4 miles, past every candidate, so the demo does not have to pick a side. |
| **SLA** shown to the driver | Nothing is promised, because nothing is known. |
| The `Submitted → In Review → Needs Info → Resolved / Rejected` ladder | Defined in the vault glossary, **not built**. v1 has one state: waiting on Support. |
| **Completed rides** | ✅ **Answered: out of scope.** A completed leg swiped everything, so it has nothing to correct. Not a gap — the model says so. |
| **Multi-leg trips** | The locked leg picker assumes one swipeable leg per trip. True of every seeded ride; not true in general. |

## 8. Running it

**Coming to this cold:**

```bash
git clone git@github.com:aldrin-wingz/prototype-driver-app.git
cd prototype-driver-app
git checkout luis/support-form
bun install
bun run dev          # http://localhost:3018
```

```bash
bun run typecheck    # must stay at 0 — it is the only automated check that exists
```

`bun run lint` is broken — `next lint` was removed in Next 16. Pre-existing, not worth fixing here.

⚠️ **This is a prototype on mock data.** No backend, no auth, no Zendesk. A page reload resets every submitted request to the seeded state, and the seeded trips are never mutated. Nothing here is deployed — Vercel builds `main`, which this branch is not.

**The demo path:** My Rides → In Progress → a ride → **More** → **Missed Swipe**. Or skip `More` entirely: `1049800373` prompts, and on `1049800374` / `1049800375` the swipe button itself opens the form.

**Six seeded rides — one per scenario. Choosing a ride IS how you pick a case.**

| Ride | Where | CTA, and what tapping it does | Form asks for |
|---|---|---|---|
| `1049800370` | In Progress | SWIPE TO START → toasts | all three, nothing locked |
| `1049800371` | In Progress | PICK UP MEMBER → toasts | Pick-up + Drop-off; En-route locked at 12:58 |
| `1049800372` | In Progress | DROP OFF MEMBER → toasts | Drop-off only; En-route + Pick-up locked |
| `1049800373` | In Progress | PICK UP MEMBER → toasts, **but a "Missed Swipe?" prompt above it opens the form** | same as `371` — the swipe state is identical, the seeded signal is the only difference |
| `1049800374` | In Progress | PICK UP MEMBER **→ opens the form**, refusal reason beneath | Pick-up + Drop-off; En-route locked at 8:47 |
| `1049800375` | **Needs Action**, "Stale Trips" pill | **MISSED SWIPE?** / Swipe to Start · A Leg **→ opens the form**, amber banner above | all three, nothing locked |
| `260731-780322` | Needs Action | — | The tile refuses: *"Available once this ride is under way."* |

⚠️ In Progress therefore shows **5**, not 6: `1049800375` moved to Needs Action rather than appearing in both.

A reload resets submitted requests. The seeded trips are never mutated.

**One known console warning:** Radix `Missing 'Description' or 'aria-describedby'` on `DialogContent`. Pre-existing, from the drawer primitive.
