# SUPPORT-BIBLE.md — Rider No-Show

The durable rules for the in-app support layer on this branch. Read this before changing anything under `lib/support*`, `components/support/`, or the support entry point on a ride.

**Branch:** `luis/rider-no-show`
**Scope:** one support case — **Rider No-Show**
**Last updated:** 2026-09-03

Sibling branch: `luis/support-form` carries **Missed Swipe** and nothing else. The two are deliberately separate prototypes over one runtime — see §2.

Vault companions: `Project - In-App Support Requests/Working Plan - In-App Support Requests.md`, `General Plan.md` (§5 delivery model), `References/Support Case Catalog.md` (per-case specs).

---

## 1. What this is

The NEMT Driver App sends drivers to Zendesk when something goes wrong operationally. This layer moves that in-app: a support case becomes a **schema-driven form** rather than a bespoke screen, so covering more cases costs a data edit rather than a build.

**The problem Rider No-Show solves is not "collect no-show details". It is that the current flow refuses submissions it shouldn't.** Today a driver waits at the pick-up, gives up, drives off, and only then taps Member No-Show — at which point the app hard-refuses and the only way forward is Zendesk. That is precisely the traffic this project exists to absorb.

So the interesting design here is not the form. It is **when a form is needed at all.**

## 2. The one rule that governs this branch

> **A case is in the prototype only once it has been agreed.**

This branch carries Rider No-Show and **no trace of anything else** — the sweep for `missed swipe` / `swipeBlock` / `staleSince` returns zero hits. A prototype is the most persuasive artifact in a project; anything in it reads as decided.

The parked branch `luis/support/in-app-support-requests` (tip `05897c8`) also has a Rider No-Show. **It was not cherry-picked, and must not be.** That version asked **seven** questions and had **five** outcome branches including two hard refusals plus a `Verida`+`TN` on-site rule. This one asks three and replaces the refusals with the form. Building the old one would have shipped decisions nobody made. Two constants were independently arrived at and match — `NO_SHOW_WAIT_MINUTES = 10`, and the en-route gate — which is confirmation, not a licence to copy the rest.

## 3. What NOT to build

- **No agent- or Support-side screens.** What the agent sees when a request lands belongs in the CS Tool.
- **No real backend, no Zendesk integration, no auth.** Mock data only.
- **No redesign of existing driver-app surfaces.** The More Options grid, the ride detail, the header and the bottom nav stay as captured.
- **No new tile.** `Member No-Show` already existed and **IS** this case's front door. There is no separate Member No-Show case.
- **No new bottom-nav tab**, and no entry point that isn't a ride.
- **No speculative field types.** The runtime has 15; do not add a 16th until a specified case needs it.

## 4. Architecture

```
components/driver/more-options-screen.tsx   the Member No-Show tile — the only entry point
        │
        ├── lib/driver-data/no-show-rules.ts    the two guardrails
        ├── lib/support-data/issue-types.ts     the issue registry (one entry: rider-no-show)
        ├── lib/support-data/case-registry.ts   buildSupportFormCase() — fields as data
        ├── lib/support/prefill.ts              what the app already knows
        │
        ▼
components/support/rider-no-show-form.tsx   ONE mount: required fields, locks, store write
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

**A case is data, not code.** `SupportCaseDefinition.fields` is a `SupportField[]`; the sheet renders whatever is in it. Nothing about Rider No-Show is hardcoded in a component.

## 5. The two guardrails

### Guardrail 1 — the trip has to be en-route

`canFileNoShow(leg)` is `getLegStage(leg) === "started"`. You cannot no-show a ride you never started, and you cannot no-show a member already in the car.

**It hides the tile rather than disabling it.** A control that appears and then refuses is how the production flow earned its reputation; a control that is simply absent asks nothing of the driver. Removing it leaves an odd tile count, so `Send Back Trip` goes full-width — the rule already there for the pending state.

### Guardrail 2 — the wait has to be provable

At least **ten minutes**, within **one mile**, counted from the **scheduled pick-up time** onward.

**⚠️ Failing it is NOT an error.** What the app actually knows is that it *cannot confirm* the wait — which is not the same as knowing the driver did not wait. So we ask them instead. Passing it behaves as production does; only failing it opens a form.

**⚠️ Seed the EVIDENCE, derive the VERDICT.** `NoShowWaitEvidence` carries what the app observed (`closestMiles`, `arrivedAt`, `leftAt`) and `resolveNoShowGate` derives the answer. This is a deliberate departure from seeding outcomes directly: the rule *is* the spec, so seeding the verdict would make `10` and `1` decorative and leave the three failing rides differing only by a label. Derived, each seeded ride genuinely exercises the rule.

Qualifying wait = the overlap of `[arrivedAt, leftAt]` with `[scheduled pick-up, ∞)`. That is what makes "after the pick-up time" a real condition rather than a phrase.

**Three gaps, because the rule has three parts.** A driver told only "we couldn't confirm it" has no idea what to write:

| Gap | What the app saw |
|---|---|
| `never_near_pickup` | Never located within the radius — or never located at all |
| `wait_too_short` | Within the radius, but under the required minutes |
| `wait_before_pickup_time` | A long enough wait, but it ended before the scheduled pick-up |

An absent `waitEvidence` and a `null` `closestMiles` mean **no proof found** — deliberately not the same as "did not wait". That distinction is the entire reason this opens a form instead of a refusal.

## 6. The form

| Field | Type | Required | Notes |
|---|---|---|---|
| Issue type | select | ✅ locked | The seam. `lockedBadge: null` |
| Which trip? | leg-picker | ✅ locked | "From this ride", `legScope: "in-progress"` |
| What time did you start waiting? | time | ✅ | Prefilled from `arrivedAt` where we have it |
| What time did you leave? | time | ✅ | Prefilled from `leftAt` where we have it |
| Attach proof you tried to reach the member | file | ⚠️ | `requiredNotEnforced` — asterisk plus the flag line |
| Sign to confirm | signature | ✅ | **Last, always** |

**⚠️ The two time fields must NOT set `lockWhenPrefilled` — the exact inverse of a recorded swipe mark.** A swipe mark is fact, so it locks. What prefills here is *the evidence the gate has just judged insufficient*, so locking it would stop the driver correcting the one thing we are unsure about.

**The signature is last, always.** The driver is attesting to the answers above, so a field after it would be signed for before it was written. And it is present at all because **proving the wait is not proving the member was absent**: the app can know how long a driver sat there and still have no idea who failed to appear. That gap is what the signature covers.

**The sheet's callout names the gap.** A form that opens without saying which check failed reads as the app being difficult — and "we only saw 4 minutes" and "we never placed you there" call for different answers.

**Adding case two:**
1. Register an issue in `issue-types.ts`.
2. Add a field block gated on `showIf: ONLY_<CASE>` in `case-registry.ts`.
3. Add a tile (or reuse one) that passes that issue via `includeIssues` + `initialValues.issue`.

No runtime change. This is why `showIf` is kept even though it is now always true.

## 7. Traps, all of them paid for

**⚠️ `getTimeOrderWarnings` warns and never blocks.** `canSubmitCase` does not read it, deliberately: the driver was on the trip and we were not, so a time that looks impossible to us is a question, not a rejection. The sequence is passed in — which fields are ordered is a property of the CASE, not the checker.

**⚠️ A driver-facing label is often a question.** "What time did you leave?" reads fine above a control and badly quoted mid-sentence. `shortLabel` exists for prose; anything naming a field inside a sentence uses it.

**⚠️ vaul fires `onOpenChange(false)` BEFORE the handler that caused it.** In a multi-sheet flow a hand-off and a dismissal are indistinguishable at that instant. Defer by a tick. **Instrument, don't theorise.**

**⚠️ `legScope: "in-progress"` silently blanks a prefilled leg** whose ride is not in `mockInProgressTrips` — `withinScope` in `prefill.ts` drops it, and a locked "From this ride" card degrades into an open search box. **Test the invariant, not a proxy for it.**

**⚠️ `lockedBadge` has THREE states.** Omitting it falls through to `"Already recorded"`, so removing a badge by deleting the property silently swaps it for a worse one. `null` is the opt-out.

**⚠️ `getMemberOptions()` spans only completed rides in the last 30 days**, so an in-progress rider cannot resolve in a `member-picker`. Use a locked `text` field.

**⚠️ Verification is browser-only. There is no test framework** — `bun run typecheck` is the only automated check and must stay at 0. `bun run lint` is broken (`next lint` removed in Next 16).

**⚠️ A full page load resets the in-session store.** Checking that a filed ride moved to Pending must use client-side navigation (the back chevron is `router.push`); a `location.href` destroys the state you are trying to read. This cost a re-run.

**⚠️ The browser pane's tab is `visibilityState: "hidden"`, so CSS transitions are FROZEN.** `getComputedStyle` returns pre-transition values and fabricates bugs. Inject `* { transition: none !important }` before measuring.

**Browser-tool gotchas:** synthetic clicks need a full pointer sequence; React-controlled inputs need the native value setter plus an `input` event; the signature pad needs `pointerdown` → several `pointermove` → `pointerup` on its `canvas`; two *dependent* clicks in one call fail because React has not re-rendered; **`document.body.innerText` applies CSS `text-transform`** — use `textContent`. Console errors persist across reloads in the MCP buffer, so open a fresh tab before concluding anything is broken.

**The layout mounts the Radix `Toaster`**, so `toast` must come from `@/hooks/use-toast`. Importing from `sonner` typechecks and renders nothing.

## 8. Provisional — authored, not captured

| Thing | Status |
|---|---|
| The whole wait rule | ⚠️ **10 minutes / 1 mile / after the pick-up time** is the spec as given. Unvalidated against ops, and uniformity across clients and markets is unconfirmed. |
| `NoShowWaitEvidence` | ⚠️ **Seeded.** The app has no geofence, dwell timer or coordinates. Stands in for telematics. |
| The **on-site** rule | The parked branch required `Verida`+`TN` drivers to file *from* the pick-up. This branch drops it. Confirm that is intended. |
| The **no-show fee** | `Driver Pay - No Show Fees paid to the driver` is market-dependent. The prototype touches pay nowhere. **Biggest unanswered question, and the one with money attached.** |
| Whether filing **ends the ride** | The prototype deliberately does not touch seeded trip status. |
| Whether the signature is **stored** | Strokes are captured and reported as "signed"; no image is kept, because nothing downstream reads one. |

## 9. Running it

```bash
git clone git@github.com:aldrin-wingz/prototype-driver-app.git
cd prototype-driver-app
git checkout luis/rider-no-show
bun install
bun run dev          # http://localhost:3018
bun run typecheck    # must stay at 0 — the only automated check that exists
```

⚠️ **This is a prototype on mock data.** No backend, no auth, no Zendesk. A page reload resets every submitted request. Nothing here is deployed — Vercel builds `main`.

**The demo path:** My Rides → In Progress → a ride → **More** → **Member No-Show**.

**Six rides, one per outcome. Choosing a ride IS how you pick a scenario:**

| Ride | Stage | Seeded evidence | What you see |
|---|---|---|---|
| `1049800370` | not started | — | **No tile** — can't no-show a ride never started |
| `1049800371` | picked up | — | **No tile** — member already in the car |
| `1049800372` | en-route | 12 min @ 0.3 mi, after pick-up | **Passes** → toast, no form |
| `1049800373` | en-route | 4 min @ 0.2 mi | `wait_too_short` → form |
| `1049800374` | en-route | never located | `never_near_pickup` → form |
| `1049800375` | en-route | 18 min, all before pick-up | `wait_before_pickup_time` → form |

`375` waits **18 minutes** — over the ten-minute bar — and still fails. That is on purpose: it is the only ride that can prove the "after the pick-up time" clause does its own work rather than riding along with the duration check.

**One known console warning:** Radix `Missing 'Description' or 'aria-describedby'` on `DialogContent`. Pre-existing, from the drawer primitive.
