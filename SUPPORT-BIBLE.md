# SUPPORT-BIBLE.md — In-App Support Requests

The durable rules for the in-app support layer on this branch. Read this before changing anything under `lib/support*`, `components/support/`, or the support entry point on a ride.

**Branch:** `luis/support/missed-swipe-v1`
**Scope:** one support case — **Missed Swipe**
**Last updated:** 2026-08-01

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
- **No second entry point.** The Missed Swipe tile on a ride's More Options screen is the only way into a form. `/forms` and the header clipboard icon existed and were removed on purpose.
- **No speculative field types.** The runtime has 15; do not add a 16th until a specified case needs it.
- **No case beyond the seven** in the Catalog until it has been specified.

## 4. Architecture

```
components/driver/more-options-screen.tsx   the entry point — builds the case, owns the sheet
        │
        ├── lib/support-data/issue-types.ts     the issue registry (one entry: missed-swipe)
        ├── lib/support-data/case-registry.ts   buildSupportFormCase() — fields as data
        ├── lib/support/prefill.ts              what the app already knows
        │
        ▼
components/support/support-form-sheet.tsx   the sheet — one component, any case
        ├── support-field-renderer.tsx          15 field types
        ├── trip-summary-banner.tsx             the selected leg, recapped
        └── lib/support/field-rules.ts          visibility + the submit gate
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

**Browser-tool gotchas:** synthetic clicks need a full pointer sequence (`pointerdown`/`mousedown`/`pointerup`/`mouseup`/`click`) dispatched via `javascript_tool`; React-controlled inputs need the native value setter plus an `input` event; two *dependent* clicks in one call fail because React has not re-rendered — split them; `navigate` needs `force: true` and sometimes lands on `/` anyway (use `location.href`); a Radix `Select` needs a genuine click at screenshot coordinates because the page can be transform-scaled. **`document.body.innerText` applies CSS `text-transform`** — it reads an uppercased pill as uppercase, so a check for "Pending Support Review" fails against it. `textContent` does not.

**The layout mounts the Radix `Toaster`**, so `toast` must come from `@/hooks/use-toast`. Importing from `sonner` typechecks and silently renders nothing.

## 7. Provisional — authored, not captured

Flagged so it cannot be mistaken for an agreed requirement:

| Thing | Status |
|---|---|
| ~~The odometer fields~~ | ✅ **Removed 2026-08-01.** Authored, never captured, and nobody asked for them. |
| Time **validation** | None exists. A pick-up time before the recorded en-route time is currently accepted. |
| **SLA** shown to the driver | Nothing is promised, because nothing is known. |
| The `Submitted → In Review → Needs Info → Resolved / Rejected` ladder | Defined in the vault glossary, **not built**. v1 has one state: waiting on Support. |
| **Completed rides** | ✅ **Answered: out of scope.** A completed leg swiped everything, so it has nothing to correct. Not a gap — the model says so. |
| **Multi-leg trips** | The locked leg picker assumes one swipeable leg per trip. True of every seeded ride; not true in general. |

## 8. Running it

```bash
bun run dev   # port 3018, or use the `support-preview` launch config
bun run typecheck
```

`bun run lint` is broken — `next lint` was removed in Next 16. Pre-existing, not worth fixing here.

**The demo path:** My Rides → In Progress → a ride → **More** → **Missed Swipe**.

**Exactly three in-progress rides, one per swipe CTA:**

| Ride | CTA on the ride | Form asks for |
|---|---|---|
| `1049800370` | SWIPE TO START | all three, nothing locked |
| `1049800371` | PICK UP MEMBER | Pick-up + Drop-off; En-route locked at 12:58 |
| `1049800372` | DROP OFF MEMBER | Drop-off only; En-route + Pick-up locked |
| `260731-780322` (Needs Action) | — | The tile refuses: *"Available once this ride is under way."* |

A reload resets submitted requests. The seeded trips are never mutated.

**One known console warning:** Radix `Missing 'Description' or 'aria-describedby'` on `DialogContent`. Pre-existing, from the drawer primitive.
