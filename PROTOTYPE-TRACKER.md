# Driver Incentives v1 — Driver App — Prototype Tracker

> **IMPORTANT:** This tracker drives the v0 build queue. **v1 is a STRIP-BASED build** — start from a duplicate of the v3-baseline v0 chat and prompt v0 to REMOVE everything that belongs to v2 or v3, then migrate the schema. NOT a from-scratch rebuild.
>
> Re-read this file + `PROTOTYPE-BIBLE.md` if context compacts.

## Build Approach

**Duplicate the v3-baseline v0.dev chat** (use v0's "Duplicate" / fork-branch action on the latest v3 chat — creates a new chat that starts from the same code state). Work on the duplicate. The original v3 chat stays frozen at the v3 baseline.

**Each strip step is forward-only on the duplicate.** Do NOT revert. Do NOT recreate stripped components later. If a feature is removed in I-0, it's gone for v1 — it lives in the original v3 chat + `v3/References/` docs only.

**Re-orientation prompt (Prompt 0)**: re-uploads the v1 BIBLE + this v1 TRACKER (overwriting the v3 versions in the duplicated repo) and confirms v0 understands the v1 scope before stripping begins.

**Why 3 steps instead of 5:** The existing UI is already CEO-approved; we're scoping down, not rebuilding. I-0 is one big strip pass (Variant Toggle + Tier + Leaderboard + `/payout` page + UpcomingPayoutWidget removed entirely + Earned popup downgrade). I-1 is the only ADD step (per-incentive admin schema). I-2 is polish + grep sweep. Minimizes prompt rounds while keeping each prompt focused on a single intent.

## Current Step
**App-I-3** (Empty Scope read-side confirmation — pairs with Manager P-10). **Resume Wave Phase B ✅ approved 2026-05-09; standalone I-2 Polish formally absorbed into Resume Wave App-I-3..App-I-7 stream.** App-I-3 paste happens AFTER Manager I-5 ✅ + P-10 ✅ in cross-prototype lockstep.

> **Resume Wave context:** Phase B sequenced plan locked 2026-05-09 at `Project - Driver Incentives/v1/References/Resume Wave - Sequenced Plan.md`. **5 new App prompts queued (paired with Manager prompts):** App-I-3 (empty=All sync, pairs with P-10) → App-I-4 (v6 schema sync — sliding-window goal progress + new param reads, pairs with P-11) → App-I-5 (Dynamic Ends-in indicator, independent) → App-I-6 (Per-incentive history Counted⏐Missed Out + Disqualified-trip UI, pairs with Manager P-12) → App-I-7 (Dispute form + Appeal feedback, pairs with Manager P-13b). **Schema bump:** App reads v6 (single coordinated cycle from Manager P-11 + P-12). Driver Targeting catalog drops to 6 entries (Trips Completed, Days Since Last Activity, On-Time Pickup with window, Driver Address County, Tenure, Sendbacks with penalty/range/window). **Cross-prototype lockstep:** schema-touching pairs ship Manager-then-App with paired plan-sync-enforcer.

## Last Completed
✅ I-1 Schema migration (approved 2026-05-05). Standalone I-2 Polish formally absorbed into Resume Wave (no longer ships as a discrete step; polish concerns redistributed across App-I-3..App-I-7 + final wave-induced flags into Manager I-7).

## v1 End-State Reference
The v1 BIBLE describes the END STATE. After I-0 through I-2 complete, the prototype should match the BIBLE.

## Build Queue

| # | Goal | Status | Description |
|---|---|---|---|
| 0 | Re-orientation | ✅ Approved | On the duplicated v0 chat: upload v1 BIBLE + TRACKER (overwriting v3 versions in repo). v0 confirms v1 scope. No code changes. |
| I-0 | Mega Strip — Variant Toggle + Tier + Leaderboard + `/payout` page + UpcomingPayoutWidget DELETED + Earned popup downgrade | ✅ Approved 2026-05-04 | One pass. DELETE: variant toggle infra, unused ride-card + dashboard variants, tier system, leaderboard, `/payout` page, **UpcomingPayoutWidget (component file + dashboard mount; revised 2026-05-04 from "downgrade" to full delete since all payout surfaces defer to v2)**, `Trip.revenueAddons`. STRIP: tier-coupled fields from schema (`tierLevel`, `INCENTIVE_TIER_BONUSES`, `Tier`, `TierConfig`, `LeaderboardEntry`). DOWNGRADE: Earned popup → single "Dismiss" CTA. STRIP: `/incentives` Tabs. |
| I-1 | Schema migration — per-incentive admin fields + multi-incentive Trip + binary progress + re-seed | ✅ Approved 2026-05-05 | ADD: `color`, `timeframe`, `enabled`, `sortOrder`, `marketScope`, `clientScope`, `trigger` to `IncentiveDefinition`. RENAME: `targetCount` → `goal`, `name` → `title`, `Trip.incentiveType` → `Trip.incentiveTypes` (array). DROP: `scheduledCount`, `periodId`. `bonusAmount` is sole $ source. Re-seeded 8 incentives + ~15 trips with multi-incentive examples. Pill bg uses `color`. Sort by `sortOrder` ASC. Binary progress UI ("X done · Y to go"). |
| I-2 | ~~Polish + edge states + final QA grep sweep~~ | 🟡 ABSORBED into Resume Wave 2026-05-09 | Standalone I-2 retired. Polish concerns redistributed: empty states + disabled-incentive filtering + [DEV] triggers fold into App-I-3/App-I-5 polish; final grep sweep folds into Manager I-7 cross-prototype final pass. |
| **App-I-3** | **Resume Wave: Empty Market/Client Scope Read-Side Confirmation** | ⬜ Planned (Resume Wave 2026-05-09; pairs with Manager P-10) | App-side half of W1-4 (intake item: empty Market/Client array → "All"). Confirms App's eligibility filter reads empty `marketScope` / `clientScope` arrays as "all markets / all clients" rather than "none." Likely already works that way (empty `[].some(matches)` is `false` so empty-as-none would fail; if eligibility uses `array.length === 0 \|\| array.includes(driver.market)`, empty-as-all already works). Audit + spec confirm; no behavior change expected unless audit surfaces a bug. Touches: any helper that filters incentives by driver's market/client (e.g., dashboard incentive section, requests filter). Auto model. |
| **App-I-4** | **Resume Wave: v6 Schema Sync — Goal Modes + Targeting Param Extensions** | ⬜ Planned (Resume Wave 2026-05-09; **reads v6 schema**; pairs with Manager P-11) | App-side companion to Manager P-11. **Reads:** `incentive.goal` as discriminated union — render correctly for both `{type:"total"}` and `{type:"rolling-window"}` modes. **Sliding-window progress logic (gnarliest part):** for rolling-window mode, the App must track completed-trip timestamps per incentive and compute "best Y-day window so far" — find the contiguous Y-day window in [startDate, today] containing the most qualifying trips. Caption: `"<best> done in best <Y>-day window · <X> needed"` (or similar). For total mode, current `currentCount/goal` rendering preserved. **Catalog reads:** Driver Targeting reduced to 6 entries (per P-11 trim); App's predicate reads/filters tolerate the smaller catalog (drop any reads of removed types). OnTimePickup + Sendbacks param extensions reflected in App's predicate matching against driver state. **Plan B if sliding-window logic too complex:** ship "total" mode only; gate rolling-window behind a feature flag and defer to v2. Phase D builder picks. Higher-thinking model. |
| **App-I-5** | **Resume Wave: Dynamic Ends-in Indicator on Incentive Card** | ⬜ Planned (Resume Wave 2026-05-09; W2-1; independent) | Add an end-of-campaign indicator to the dashboard `<IncentiveCard>` (the carousel tile). **Dynamic copy + color:** when `daysUntilEnd <= 7`, render "Ends in <N> day(s)" with amber treatment (e.g., `bg-amber-100 text-amber-800` chip or text); when `daysUntilEnd > 7`, render "Ends Mar 20" (or similar absolute format) with neutral treatment (`text-muted-foreground`). Slot: top-right of the card or below the bonus pill — Phase D builder picks based on existing layout. New helper `formatEndsIn(endDate, today): { copy: string; tone: 'urgent' \| 'neutral' }`. No schema change — `endDate` already wired post-P-6 (v5). Touches: `<IncentiveCard>` (or dashboard incentive section component), date helper. Auto model. |
| **App-I-6** | **Resume Wave: Per-Incentive History (Counted ⏐ Missed Out tabs) + Disqualified-Trip UI** | ⬜ Planned (Resume Wave 2026-05-09; **reads v6 disqualifications**; pairs with Manager P-12) | **Merged feature** combining intake W2-2 (tap incentive → see completed qualifying rides) + W3-A1 (disqualified-trips view) + W3-A2 (disqualified-trip unique UI). New tap target on dashboard `<IncentiveCard>` opens a per-incentive history view: tab strip "Counted ⏐ Missed Out (N)" where N = count of disqualifications for this driver+incentive. Counted tab = simple list (NOT full RideCard chrome — lighter format per user direction; reuses v3 simple-list pattern when user provides reference code) of trips that qualified. Missed Out tab = list of trips that triggered disqualification, each rendered with **disqualified-trip unique UI** (W3-A2): desaturated card + amber/red "Disqualified" badge + brief reason line ("OTP dropped to 92% — required 95%"). Tap on a Missed Out trip → opens dispute form (App-I-7). New routes: `app/incentives/[id]/history/page.tsx` OR inline-expand below the dashboard card — Phase D builder picks based on v3 reference code shape. **Disambiguation:** new tap target on card needs to coexist with existing "tap to filter Requests" behavior; chevron/affordance for history view, pill or progress-bar tap remains "filter Requests." Phase D locks affordance. Higher-thinking model. |
| **App-I-7** | **Resume Wave: Dispute Form + Appeal Feedback (Approved / Denied + Re-entry Pop-up)** | ⬜ Planned (Resume Wave 2026-05-09; **reads v6 + writes appeals**; pairs with Manager P-13b) | Bundles W3-A3 (dispute form) + W3-A4 (appeal status feedback). **Dispute form (`<DisputeAppealSheet>`):** bottom sheet pattern (mirrors Late Reasons pickup-reason sheet shape). Header: trip ID + "Disputed Ride" subtitle. **Pre-filled context banner** (red-tinted, mirrors user's reference screenshot): the SPECIFIC disqualification reason + values (e.g., "Pickup at 1:17 PM · 17 mins late" or "OTP dropped to 92% (required: 95%)"). **Reason field:** free-text textarea (V1 locked — preset dropdown deferred). **Comments field:** additional details textarea. Cancel + "Submit Appeal" buttons. On submit: call `createAppeal({ driverId, incentiveId, disqualificationId, driverText })` → status `pending`; replace dispute affordance on the disqualified trip with "Appeal under review" badge + read-only summary. **Appeal status feedback:** for each appeal in `appeals` collection with status `'approved'` or `'denied'` that the driver hasn't acknowledged: on entry to incentives Dashboard or per-incentive history view, render an **`<AppealResultDialog>`** pop-up. Approved: "Your appeal was approved — [Incentive Name] is back on track." (green check icon). Denied: "Appeal denied: [managerReason]" (amber warning icon). Dismiss button writes `appealId` to `wingz-incentives:appeal-acks:v1` localStorage; pop-up no longer shows for that appeal. **Pending state:** trip shows "Appeal under review" badge; dispute form replaced by read-only summary. **Re-disqualification post-approval:** if a previously-approved trip is later overwritten by another disqualification event, allow re-appeal (separate `Appeal` record). Touches: `<DisputeAppealSheet>` new component, `<AppealResultDialog>` new component, modifications to disqualified-trip render (states: pending / approved / denied / re-disqualified), ack-state localStorage helper. Higher-thinking model. |

## Approval Log

- **2026-05-09 — RESUME WAVE PLANNED ✅ Phase B sign-off (strategy-impacting — App stream pairs with Manager prompts; v6 schema reads).** Driver App's standalone I-2 Polish formally absorbed into Resume Wave App-I-3..App-I-7. **5 new App prompts queued:** App-I-3 (empty-scope read-side confirm; pairs with Manager P-10) · App-I-4 (v6 schema sync — sliding-window goal progress + new param reads; pairs with Manager P-11) · App-I-5 (Dynamic Ends-in indicator; independent) · App-I-6 (Per-incentive history Counted⏐Missed Out + Disqualified-trip UI; pairs with Manager P-12 disqualification schema) · App-I-7 (Dispute form + Appeal feedback dialogs + re-entry pop-up; pairs with Manager P-13b). **Reads v6 schema:** new goal discriminated union (`{type:"total"|"rolling-window"}`); new OnTimePickup window param; new Sendbacks penalty/range/window param; trimmed catalog (Driver Targeting now 6 entries: Trips Completed · Days Since Last Activity · On-Time Pickup · Driver Address County · Tenure · Sendbacks); new Disqualification + Appeal entities with storage keys `wingz-incentives:appeals:v6` + `wingz-incentives:disqualifications:v6`. **Cross-prototype lockstep:** schema-touching pairs ship Manager-then-App; App verifies on :3001 in lockstep with Manager :3000; paired plan-sync-enforcer per pair. Phase B plan locked at `Project - Driver Incentives/v1/References/Resume Wave - Sequenced Plan.md`. Phase A intake at `Project - Driver Incentives/v1/References/Update Intake - 2026-05-09.md`.
- **2026-05-04 — Prompt 0 (Re-orientation) ✅ Approved.** v0 confirmed v1 scope and surfaced 3 ambiguity questions (mock-trips.ts handling, registry/showcase shell, non-driver component trees). All resolved before I-0 paste.
- **2026-05-04 — I-0 Mega Strip ✅ Approved.** Initial pass deleted variant toggle infra, tier system, leaderboard, `/payout` page, `Trip.revenueAddons`, and downgraded the Earned popup to single-CTA Dismiss. UpcomingPayoutWidget initially downgraded to display-only per original spec.
- **2026-05-04 (later) — I-0 patch (UpcomingPayoutWidget full delete) ✅ Approved.** User revised scope: the entire payout surface (widget + page) defers to v2. Patch deleted the component file and removed the dashboard mount. Dashboard top-of-page is now the "This Month" earnings card. User confirmed: "the prototype looks good."
- **2026-05-05 — I-1 Schema migration ✅ Approved.** All three coupled changes landed: (a) per-incentive admin fields added to `IncentiveDefinition` (color/timeframe/enabled/sortOrder/marketScope/clientScope/trigger; `bonusAmount` promoted to sole $ source); (b) `Trip.incentiveType: IncentiveType | null` → `Trip.incentiveTypes: IncentiveType[]` (multi-incentive trips with stacked pills on the Pill Row Bottom variant); (c) binary progress UI (drop `scheduledCount` / "+N taken" — show only `currentCount` done vs to-go). Re-seeded 8 incentives + ~15 trips with ≥4 multi-incentive examples. `targetCount` → `goal` and `name` → `title` renames complete. `periodId` dropped. Schema version comment `// schemaVersion: 2026-05-04-v2` in place.

## Component Inventory — Post-v1 Strip (target state)

After I-0 → I-2 complete, the v0 repo should contain only these driver-incentive components:

**KEEP (post-strip):**
- `components/driver/header.tsx`
- `components/driver/bottom-nav.tsx`
- `components/driver/ride-card.tsx`
- `components/driver/ride-detail-layout.tsx`
- `components/driver/incentive-pill-renderer.tsx` (formerly `incentive-badge-renderer.tsx`; renamed during I-0 — only `pill-named-bottom` path remains)
- `components/driver/program-contribution-indicator.tsx`
- `components/driver/dashboard-incentive-section.tsx` (only `dashboard-card-section` carousel render path)
- ~~`components/driver/upcoming-payout-widget.tsx` (display-only)~~ — DELETED (revised 2026-05-04 later; entire payout surface defers to v2)
- `components/driver/filter-requests-modal.tsx` (with `incentiveType` field)
- `components/driver/incentive-earned-popup.tsx` (single-CTA Dismiss)
- `components/driver/revenue-display.tsx` (kept; `revenueAddons` stripped from data)

**DELETE (during I-0 strip):**
- `components/driver/variant-toggle.tsx`
- `components/driver/variants-wrapper.tsx`
- `components/driver/tier-badge.tsx`
- `components/driver/tier-progress-section.tsx`
- `components/driver/leaderboard-tab.tsx`
- `components/driver/upcoming-payout-widget.tsx` (revised 2026-05-04 later — full delete, not display-only)
- `components/driver/tier-up-popup.tsx`
- `lib/variants.ts`
- `lib/variants-context.tsx`
- `lib/incentive-sort.ts` (gold-first tier-based sort; replaced by `sortOrder` ASC in I-1)
- `app/payout/page.tsx` + the entire `app/payout/` directory
- Any `/payout`-only helper components (PayoutSummary, PeriodSelector wrapper)

## Step Specs

### Step 0: Re-orientation

**Goal:** Re-orient v0 onto v1 scope. No code changes.

**Inputs:**
- Updated `PROTOTYPE-BIBLE.md` (v1 — describes the END STATE)
- This `PROTOTYPE-TRACKER.md` (v1 — strip-based build queue)
- Reference: `v1 Scope Lock.md` + `CEO Feedback - 2026-05-02 - v1 v2 v3 split.md`

**Acceptance:**
- [ ] v0 confirms it has read both files and understands the v1 scope (variants locked, tier/leaderboard/payout out, per-incentive `bonusAmount`)
- [ ] v0 lists the components/files it expects to delete in I-0 and what's preserved
- [ ] No code changes generated in this step

### Step I-0: Mega Strip

**Goal:** One forward-only deletion pass that removes every v2/v3 surface in a single coherent change. After this step, the prototype is structurally v1 — only schema migration (I-1) and polish (I-2) remain.

**Files to delete:**
- `lib/variants.ts`
- `lib/variants-context.tsx`
- `components/driver/variant-toggle.tsx`
- `components/driver/variants-wrapper.tsx`
- `components/driver/tier-badge.tsx`
- `components/driver/tier-progress-section.tsx`
- `components/driver/leaderboard-tab.tsx`
- `components/driver/tier-up-popup.tsx`
- `lib/incentive-sort.ts` (gold-first tier-based sort — replaced by `sortOrder` ASC in I-1; keep helpers + sort callsites in IncentivesPage / DashboardIncentiveSection but stub the sort with a placeholder ASC-by-id sort that I-1 finalizes)
- `app/payout/page.tsx` + the entire `app/payout/` directory
- Any helper components that exclusively serve `/payout`

**Variant strip:**
- Remove every `useVariants()` import + call. Hardcode the locked variant value at each callsite.
- Remove the floating "Variants" pill button from layout (`app/layout.tsx` or wherever).
- In `IncentiveBadgeRenderer`: keep ONLY the `pill-named-bottom` render path. Delete the `banner-wingz-hero` and `achievement-banner` paths. Rename file/component to `incentive-pill-renderer.tsx` / `IncentivePillRenderer`.
- In `DashboardIncentiveSection`: keep ONLY the `dashboard-card-section` carousel path. Delete `dashboard-banner` and `dashboard-widget-integrated` paths.
- Strip URL query param parsing for variant overrides (`v_pill`, `v_dash`, `payoutSummary`, `tierProgress`, `leaderboard`).
- Strip every `localStorage.getItem('driver-incentives-variants')` and corresponding setItem.
- In `IncentiveCard`: strip the variant-driven theming switch (white/black/tier-color). Card body is always white. Per-incentive color theming will reattach in I-1 via `incentive.color`.

**Tier + Leaderboard strip — schema (`lib/data/incentives.ts`):**
- Delete `Tier` type (`'bronze' | 'silver' | 'gold' | 'platinum'`)
- Delete `IncentiveTierLevel` type
- Delete `TierConfig` type + `tierConfigs[]` seed array
- Delete `LeaderboardEntry` type + `leaderboardEntries[]` seed array
- Delete `INCENTIVE_TIER_BONUSES` constant
- Strip `tierLevel` from `IncentiveDefinition` (other fields will be migrated in I-1)
- Strip `currentTier`, `totalBonusesEarnedThisMonth`, `currentRank`, `totalDrivers`, `county` from `CurrentDriver` (KEEP `id`, `displayName`, `initials`, `username`)

**Tier + Leaderboard strip — `/incentives` page (`app/incentives/page.tsx`):**
- Remove the `Tabs` / `TabsList` / `TabsTrigger` / `TabsContent` wrapper. v1 has NO tabs.
- Delete the Leaderboard tab content + Leaderboard tab header + sticky `YourPlacementCard` + sticky Top 3 region
- Delete the sticky `TierProgressSection` from the top of the (former) Incentives tab
- Page becomes: header (back chevron + "Driver Incentives") + scrollable list of `IncentiveCard`s.

**Earned popup downgrade (`incentive-earned-popup.tsx`):**
- Drop the "View Earnings" CTA (would route to `/payout` — being deleted)
- Drop the "View Achievements" CTA (Leaderboard tab is gone)
- Single CTA: "Dismiss"
- Auto-dismiss after 6s remains.

**Earned popup context (`incentive-earned-context.tsx`):**
- Remove the `showTierUp` function and `TierUpTier` type
- Keep only `showEarned(type: IncentiveType)` and `EarnedPopup` mount

**`/payout` strip — schema (`lib/data/incentives.ts`):**
- Delete `PayPeriod` type + `PAY_PERIODS[]` seed array
- Delete `PayoutPeriodSummary` type + `PAYOUT_PERIOD_SUMMARIES[]` seed array
- Delete `revenueAddons?: { label: string; amount: number }[]` from `Trip` type
- Strip `revenueAddons` arrays from any seeded trips

**`/payout` strip — components:**
- DELETE `components/driver/upcoming-payout-widget.tsx` entirely (revised 2026-05-04 later; previously was a display-only downgrade — user revised because the entire payout surface defers to v2).
- Remove the UpcomingPayoutWidget import + mount from the dashboard (`app/page.tsx` or wherever it's rendered). Dashboard top-of-page becomes: Header → "This Month" earnings card with dot pagination → Confirm Trip prompt → Driver Incentives section → New Requests preview → Next Accepted Ride.
- `components/driver/revenue-display.tsx`: strip the `+$<addons>` rendering and tap-popover. Revenue cell renders `$<base>` only.

**Acceptance:**
- [ ] No `useVariants()` references in code; no `lib/variants.ts`
- [ ] No "Compare Variants" floating pill on screen
- [ ] Ride cards show only `pill-named-bottom`; dashboard incentive section is the carousel only
- [ ] No `Tier` / `TierConfig` / `LeaderboardEntry` / `TierBadge` types
- [ ] No tier-related components in `components/driver/`
- [ ] `/incentives` page has no Tabs — single Incentives view
- [ ] Earned popup has only "Dismiss" CTA
- [ ] No `app/payout/` directory; no `PayPeriod` / `PayoutPeriodSummary` types; no `revenueAddons` in code
- [ ] No `components/driver/upcoming-payout-widget.tsx` file; no UpcomingPayoutWidget mount on dashboard; revenue cells show base $ only
- [ ] grep `UpcomingPayoutWidget` / `upcoming-payout-widget` returns 0 code hits
- [ ] grep "useVariants" / "banner-wingz-hero" / "achievement-banner" / "dashboard-banner" / "dashboard-widget-integrated" / "tier-linear" / "tier-stack" / "leaderboard-list" / "leaderboard-podium" / "boxed-tabs" / "edge-to-edge-tabs" / "tier" (case-insensitive) / "leaderboard" (case-insensitive) / "Bronze|Silver|Gold|Platinum" / "INCENTIVE_TIER_BONUSES" / "podium" / "YourPlacement" / "/payout" / "PAYOUT_PERIOD" / "revenueAddons" → all return 0 code hits (matches in comments noting "v2 only" / "v3 only" are OK)

### Step I-1: Schema migration — per-incentive admin fields + re-seed

**Goal:** The only ADD step. Migrate the schema to fully admin-editable per-incentive fields. `bonusAmount` becomes the sole source of truth for incentive $. Two refinements landed alongside (2026-05-04): **multi-incentive trips** (one trip can count toward multiple programs) and **simplified binary progress UI** (done vs to go — drop the "+N taken" middle state).

**Final `IncentiveDefinition` shape (`lib/data/incentives.ts`):**

```ts
export interface IncentiveDefinition {
  id: string;
  type: IncentiveType;
  title: string;                              // RENAME from existing `name`
  description: string;                        // KEEP
  goal: number;                               // RENAME from existing `targetCount`
  bonusAmount: number;                        // KEEP (already exists; sole $ source post-I-0)
  timeframe: 'daily' | 'weekly' | 'monthly' | 'all-time';   // ADD; replaces `periodId: 'may-2026'`
  color: string;                              // ADD; hex, drives pill bg
  enabled: boolean;                           // ADD
  sortOrder: number;                          // ADD; ASC; lower = higher in list
  marketScope: string[];                      // ADD
  clientScope: string[];                      // ADD
  trigger: string;                            // ADD; read-only enum value (eng-managed)
  qualifyingCriteria: string;                 // KEEP
  iconName?: string;                          // KEEP
  // DROP from current schema: `periodId` (replaced by `timeframe`); `tierLevel` (already stripped in I-0)
}
```

**Sibling type — `DriverIncentiveProgress` (Driver App's progress tracker, same file):**

```ts
export interface DriverIncentiveProgress {
  incentiveId: string;                        // KEEP
  currentCount: number;                       // KEEP — DO NOT rename; this is the "done" count consumed by the binary progress bar
  goal: number;                               // RENAME from existing `targetCount`
  isComplete: boolean;                        // KEEP
  bonusEarned: number;                        // KEEP, but compute changes: `bonusEarned = isComplete ? definition.bonusAmount : 0` (was tier-locked via INCENTIVE_TIER_BONUSES)
  lastQualifyingTripId?: string;              // KEEP
  // DROP: `scheduledCount` (the "+N taken" field — UI no longer reads it)
}
```

**Trip schema change — single → multi-incentive:**

```ts
// BEFORE (v3 baseline + v1 pre-refinement):
//   incentiveType: string | null;            // single program per trip

// AFTER (v1 post-2026-05-04):
incentiveTypes: string[];                     // 0..N programs this trip counts toward; [] if none
```

- Pill Row Bottom variant already supports stacked pills — render one pill per `incentiveType` entry, in `IncentiveDefinition.sortOrder` ASC.
- Empty array → no pills (replaces null suppression).
- ProgramContributionIndicator (popover/tooltip) now lists ALL programs the trip contributes to, one row per program with progress + bonus amount.
- Filter modal: "Filter by Incentive" matches if `trip.incentiveTypes.includes(filterValue)`.
- All `Trip.incentiveType` reads → `Trip.incentiveTypes`. Helper `getTripsForIncentiveType` (existing name in code) refactored from `===` to `.includes()`. `tripHasIncentives` migrates from `trip.incentiveType !== null` to `trip.incentiveTypes.length > 0`.

**Progress simplification — binary done-vs-to-go:**

The current v3 baseline UI shows a 3-state progress: solid green (`X done`) + hatched green (`+Y taken`) + gray (`Z to go`). v1 simplifies to **2-state binary**: solid green (`X done`) + gray (rest of bar). Drop the "taken" intermediate state entirely.

- Progress data: only `currentCount: number` is consumed by the bar/text. If a `takenCount` / in-flight field exists in seed data, leave it but stop reading it from the UI (or drop entirely — it's display-only, not load-bearing).
- Bar: `currentCount / goal` solid fill, rest gray. No hatched section.
- Caption text: `"5 done · 3 to go"` (computed: `goal - currentCount` = to go). NO `+N taken` segment.
- Applies to: `IncentiveCard` on Dashboard carousel + `/incentives` page.
- "Earned this month" sticky aggregate (the green dollar above the tier bar in v3) — kept, but the tier bar itself is GONE in v1 (stripped in I-0).

**Re-seed all 8 incentives:**

| title | bonusAmount | goal | timeframe | color | sortOrder | trigger |
|---|---|---|---|---|---|---|
| Weekend Warrior | 50 | 8 | monthly | `#10B981` | 10 | weekend-trip |
| Peak Performer | 50 | 10 | monthly | `#EAB308` | 20 | peak-hours |
| Early Bird | 30 | 8 | monthly | `#06B6D4` | 30 | before-9am |
| White Glove | 50 | 6 | monthly | `#8B5CF6` | 40 | door-to-door |
| Hometown Hero | 30 | 8 | monthly | `#94A3B8` | 50 | in-county |
| Squad Goals | 50 | 6 | monthly | `#EC4899` | 60 | multi-rider |
| Quick Wins | 10 | 10 | monthly | `#3B82F6` | 70 | short-distance |
| Loyalty Streak | 10 | 5 | monthly | `#F59E0B` | 80 | consecutive-days |

All `enabled: true`, all `marketScope: ['Atlanta']`, all `clientScope: ['Verida', 'MTM']` (vary 1–2 to demonstrate scoping; e.g., White Glove → `['Verida']`, Squad Goals → `['MTM']`).

**Trip seed — multi-incentive examples (REQUIRED):**

Re-seed ~15 trips total. At LEAST 4 must be multi-incentive to demonstrate stacking. Suggested combos (driver story + which programs apply):

| Trip | incentiveTypes | Pills rendered (in sortOrder) |
|---|---|---|
| Saturday short door-to-door pickup, before 9am | `['weekend-warrior', 'early-bird', 'white-glove', 'quick-wins']` | 4 pills: Weekend Warrior + Early Bird + White Glove + Quick Wins |
| Tuesday 7am door-to-door, in-county | `['early-bird', 'white-glove', 'hometown-hero']` | 3 pills |
| Friday 6pm peak hour multi-rider | `['peak-performer', 'squad-goals']` | 2 pills |
| Sunday in-county short distance | `['weekend-warrior', 'hometown-hero', 'quick-wins']` | 3 pills |
| Plain weekday midday single trip | `[]` | No pills |
| Plus ~10 more single-incentive trips spread across all 8 programs | various 1-element arrays | 1 pill each |

Each multi-incentive trip should still complete to a single trip record — the trip "counts toward" each listed program (increments `currentCount` for each). Stacking pills must NOT overflow the ride card; if 4+ pills don't fit, allow horizontal scroll within the bottom pill row OR truncate to first 3 + "+N more" chip (whichever the existing layout already supports cleanest — defer to v0's judgment but note both options).

**Renames across codebase:**
- `IncentiveDefinition.name` → `title`
- `IncentiveDefinition.targetCount` → `goal`
- `DriverIncentiveProgress.targetCount` → `goal` (this field is duplicated from definition; rename in both places)
- `IncentiveDefinition.periodId` → REMOVE (replaced by `timeframe`)
- `Trip.incentiveType: IncentiveType | null` → `Trip.incentiveTypes: IncentiveType[]` (singular nullable → array; use `IncentiveType[]` not raw `string[]`)
- `DriverIncentiveProgress.scheduledCount` → REMOVE (no longer consumed by UI)
- Helpers `getIncentiveByType`, `getIncentiveById`, `getProgressForIncentive` keep working (no key changes)
- Helper `getTripsForIncentiveType(type)` migrate from `t.incentiveType === type` to `t.incentiveTypes.includes(type)`
- Helper `tripHasIncentives(trip)` migrate from `trip.incentiveType !== null && trip.clientEnrolledInIncentives` to `trip.incentiveTypes.length > 0 && trip.clientEnrolledInIncentives`
- `Trip.clientEnrolledInIncentives` field stays unchanged

**Component updates:**
- `IncentivePillRenderer` (renamed from IncentiveBadgeRenderer in I-0): pill bg = `incentive.color`. Pill text = `<incentive.title> Trip`. Text color for contrast (white on dark bg, dark on light bg).
- `RideCard` bottom pill row (`components/driver/ride-card.tsx`): maps `trip.incentiveTypes` → renders one pill per entry, sortOrder ASC. The existing `incentiveType={trip.incentiveType!}` props at lines ~119 and ~200 must change to map over `trip.incentiveTypes`.
- Dashboard `IncentiveCarouselCard` (in `components/driver/dashboard-incentive-section.tsx`): title, description, **binary progress bar (`currentCount/goal` solid green, gray for the rest — NO scheduledCount, NO `+N taken`, NO hatched fill)**, caption `"{currentCount} done · {goal - currentCount} to go"`, "Earn $`bonusAmount`". Color used as left-border accent (3–4px) or small color dot.
- In-card progress block in `components/driver/incentive-badge-renderer.tsx` (the sub-renderer around lines ~103–127): same binary simplification — strip the `progress.scheduledCount` reads, the hatched bar segment, and the `+{progress.scheduledCount} taken` span.
- `ProgramContributionIndicator` (`components/driver/program-contribution-indicator.tsx`, currently formats `progress.currentCount / progress.targetCount` for a single program): rebuild to accept `trip` and render ALL programs in `trip.incentiveTypes` — one row per program with `<title> · X done · Y to go · Earn $<bonusAmount>`.
- `FilterRequestsModal` (`components/driver/filter-requests-modal.tsx`): UI stays singular (driver picks ONE incentive to filter by). Match logic in `app/requests/page.tsx` switches from `t.incentiveType === appliedFilters.incentiveType` to `t.incentiveTypes.includes(appliedFilters.incentiveType)`.
- `DashboardIncentiveSection` carousel: sort by `sortOrder` ASC (replaces the I-0 placeholder sort).
- `IncentivesPage` (`app/incentives/page.tsx`, already had Tabs stripped in I-0): sort by `sortOrder` ASC.

**Acceptance:**
- [ ] `IncentiveDefinition` matches the v1 shape above (no `name`, no `targetCount`, no `periodId`, no `tierLevel`)
- [ ] `DriverIncentiveProgress` has `goal` (not `targetCount`), keeps `currentCount`, has NO `scheduledCount`
- [ ] `Trip.incentiveTypes: IncentiveType[]` everywhere (no `Trip.incentiveType` singular nullable)
- [ ] `tripHasIncentives` and `getTripsForIncentiveType` migrated to use the array form
- [ ] No `tierLevel` / `INCENTIVE_TIER_BONUSES` / `targetCount` / `name` / `periodId` / `scheduledCount` references remain in schema or seed
- [ ] All 8 seeded incentives have all v1 fields populated
- [ ] At least 4 seeded trips have ≥2 entries in `incentiveTypes` and render multiple stacked pills
- [ ] Trips with `incentiveTypes: []` render no pills (replaces null suppression)
- [ ] IncentiveCard progress UI shows ONLY `"{currentCount} done · {goal - currentCount} to go"` (binary bar, no `+N taken`, no hatched fill, no `scheduledCount` reads)
- [ ] Pill bg colors visibly vary across incentives in screenshots; multi-pill stacking visible on ≥4 ride cards
- [ ] Programs sorted by `sortOrder` ASC on dashboard + `/incentives`
- [ ] Filtering by an incentive returns trips where that incentive is in `incentiveTypes` (not just trips where it's the sole `incentiveType`)
- [ ] grep `Trip\.incentiveType[^s]` returns 0 hits (singular nullable form fully migrated)
- [ ] grep `scheduledCount` returns 0 hits
- [ ] grep `targetCount` returns 0 hits (replaced by `goal`)
- [ ] grep `taken` (case-insensitive) in driver components returns 0 hits

### Step I-2: Polish + edge states + final QA grep sweep

**Goal:** Land v1. No new features — just edge states + sweep.

**Edge states:**
- Dashboard incentive section, no active incentives in scope: empty card "No active incentives this period. Check back soon."
- `/incentives` page, no active incentives: same message.
- Requests page filtered by an incentive that has no eligible trips: "No incentive-eligible trips right now."
- Disabled incentives (`enabled: false`) MUST NOT render anywhere — filter at the data-helper layer.

**Earned popup:**
- Add a small floating [DEV] button at bottom-right (prototype only) that opens a list of the 8 incentives. Tap any to fire the Earned popup (mock-trigger; no real flow events).
- Auto-dismiss after 6s confirmed.
- Single CTA "Dismiss" (verified from I-0).

**Final QA grep sweep — these MUST return 0 code hits (matches in comments noting "v2 only"/"v3 only" are OK):**
- `tier` (case-insensitive)
- `leaderboard` (case-insensitive)
- `Bronze` / `Silver` / `Gold` / `Platinum`
- `INCENTIVE_TIER_BONUSES`
- `useVariants`
- `banner-wingz-hero` / `achievement-banner`
- `dashboard-banner` / `dashboard-widget-integrated`
- `/payout` (in routes)
- `revenueAddons`
- `targetCount`
- `pointsEarned` / `pointsAccumulated`
- `TierConfig` / `LeaderboardEntry` / `TierBadge`

**Screenshot pass:**
- Dashboard (top → bottom): "This Month" earnings card with dot pagination → Confirm Trip prompt → Driver Incentives carousel → New Requests preview → Next Accepted Ride. NO UpcomingPayoutWidget — it was deleted in I-0 (full payout surface defers to v2).
- `/incentives` (single view, no tabs)
- Requests with `?incentive=weekend-warrior` filter
- Ride card with pill (each of 8 incentives produces a different colored pill)
- Ride detail with pill below trip metadata card
- Earned popup ([DEV] triggered) for at least 3 different incentives
- Filter modal with `Incentive` dropdown row

**Acceptance:**
- [ ] All 4 edge states render correctly
- [ ] [DEV] Earned popup trigger works for each of 8 incentives
- [ ] Disabled incentives don't render
- [ ] All grep checks return 0 hits
- [ ] Visual sweep against v1 BIBLE — nothing tier/leaderboard/payout/variant-toggle visible
- [ ] If everything passes, mark v1 Driver App ✅ Approved in this TRACKER

> **Note (post-Resume Wave Phase B 2026-05-09):** Standalone I-2 Polish absorbed into Resume Wave App-I-3..App-I-7 (no longer ships as a discrete prompt). Edge state polish + grep sweep concerns redistributed into App-I-3 (empty-scope confirm), App-I-5 (ends-in indicator polish), App-I-6 (history view polish), App-I-7 (appeal flows polish), and Manager I-7 (final cross-prototype sweep). Spec retained above for historical reference + grep targets that remain valid.

---

### Step App-I-3: Resume Wave Empty Market/Client Scope Read-Side Confirmation

**Goal:** App-side half of W1-4 (intake item: empty Market/Client array → "All"). Pairs with Manager P-10. Confirms App's eligibility filter reads empty `marketScope` / `clientScope` arrays as "all markets / all clients" rather than "none."

**Tasks:**

1. **Audit current eligibility filter logic.**
   - Find the helper(s) that decide whether an incentive shows for the logged-in driver. Likely in `lib/data/incentives.ts` or a sibling utility.
   - Common pattern: `incentive.marketScope.length === 0 || incentive.marketScope.includes(driver.market)`. If this pattern is present, empty-as-all already works → confirm via test, no code change.
   - Anti-pattern: `incentive.marketScope.includes(driver.market)` (without length check). If this pattern is present, empty arrays incorrectly filter the incentive out → fix by adding length-zero shortcut.

2. **Same audit for `clientScope`** (and if Driver Targeting Market/Client variants from P-7a still exist post-P-11 catalog trim — they're being dropped in P-11, so this is a temporary check).

3. **Update copy in App** (if any) that references "no markets" / "no clients" for empty arrays. Likely none in App side (UI text tends to live in Manager); but spot-check incentive detail / popovers.

**Acceptance:**
- [ ] Eligibility filter handles empty `marketScope` as "all markets eligible."
- [ ] Eligibility filter handles empty `clientScope` as "all clients eligible."
- [ ] Manual test: create a Manager incentive with empty Market + Client → driver in any market sees the incentive on dashboard.
- [ ] No regressions on existing incentives with non-empty scopes.

**Pairs with:** Manager P-10. Auto model. Ships immediately after P-10 in cross-prototype lockstep.

---

### Step App-I-4: Resume Wave v6 Schema Sync — Goal Modes + Targeting Param Extensions

**Goal:** App-side companion to Manager P-11 (the v6 schema bump). Reads new `goal` discriminated union + handles sliding-window progress logic + reads extended OnTimePickup / Sendbacks param shapes + trimmed catalog.

**Tasks:**

1. **Goal discriminated union read (W1-2).**
   - `incentive.goal` shape: `{ type: "total"; count: number } | { type: "rolling-window"; count: number; days: number }`.
   - For `type === "total"`: existing `currentCount / count` rendering preserved. Caption: "X done · Y to go."
   - For `type === "rolling-window"`: NEW sliding-window logic. Track `qualifyingTrips: Array<{date: Date}>` per driver+incentive. Compute "best window so far" by scanning all valid Y-day windows in `[startDate, today]` and finding the max trip count.
     - Mock implementation: precompute a list of trip dates from seed data; iterate over each trip date as a window start; count trips in `[start, start+Y days]`; return max.
     - Caption: "Best <Y>-day window: <best> done · <count - best> needed" or similar.
     - Helper: `computeRollingWindowProgress(trips, count, days, startDate, today): { best: number; remaining: number }`.

2. **OnTimePickup param read extension (W1-3).**
   - New shape: `{ thresholdPct: number; windowDays: number }`.
   - App's predicate matching against driver state: `driver.otpPercentLast<windowDays>Days >= thresholdPct`.
   - If `driver` doesn't carry pre-computed window-specific OTP, compute from `driver.otpHistoryLast30Days` or fall back to existing `driver.otpPercent` field.

3. **Sendbacks param read extension (W1-3).**
   - New shape: `{ penalty: 'penalty' | 'no-penalty' | 'both'; countRange: { min?, max? }; windowDays: number }`.
   - App's predicate filters driver's sendbacks by `penalty` filter, counts within `windowDays`, checks against `countRange`.

4. **Catalog trim handling (W1-3).**
   - Trip Targeting catalog locked to 6 entries; Driver Targeting catalog locked to 6 entries (per Manager P-11).
   - App's predicate evaluators (if any — most predicate logic stays Manager-side; App reads results) tolerate the smaller catalog. Drop any reads of removed types.

5. **Plan B (if sliding-window logic too complex):** ship "total" mode only; gate rolling-window behind a feature flag. Phase D builder picks based on time pressure.

**Acceptance:**
- [ ] Total-mode incentives render correctly.
- [ ] Rolling-window mode incentives render correctly with sliding-window caption.
- [ ] OnTimePickup eligibility check handles new threshold + window params.
- [ ] Sendbacks eligibility check handles new penalty + range + window params.
- [ ] No reads of removed catalog types crash.
- [ ] Schema version reads cleanly as `2026-05-XX-v6`.

**Pairs with:** Manager P-11. Higher-thinking model. Ships immediately after P-11 in cross-prototype lockstep.

---

### Step App-I-5: Resume Wave Dynamic Ends-in Indicator on Incentive Card

**Goal:** Add an end-of-campaign indicator to the dashboard `<IncentiveCard>` (the carousel tile). From W2-1.

**Tasks:**

1. **New helper `formatEndsIn(endDate, today): { copy: string; tone: 'urgent' | 'neutral' }`.**
   - `daysUntilEnd = Math.ceil((endDate - today) / day)`.
   - If `daysUntilEnd <= 0`: copy = "Ended" (gray, end-of-campaign state — incentive shouldn't show but defensive).
   - Else if `daysUntilEnd <= 7`: copy = `"Ends in <N> day${N!==1?'s':''}"`, tone = `'urgent'`.
   - Else: copy = `"Ends <Mon DD>"` (e.g., "Ends Mar 20"), tone = `'neutral'`.

2. **Rendering on `<IncentiveCard>`.**
   - Slot: top-right of the card OR small chip below the bonus pill — Phase D builder picks based on layout.
   - Tone styling:
     - `urgent`: amber (e.g., `bg-amber-100 text-amber-800` or `text-amber-700` text-only).
     - `neutral`: muted (`text-muted-foreground` text-only or subtle gray chip).
   - Reads `incentive.endDate` (already wired post-P-6 v5; no schema change).

3. **Application:** dashboard incentive carousel tile + `/incentives` page tile (same component). NOT on ride card pills.

**Acceptance:**
- [ ] All active incentive cards on dashboard show ends-in indicator.
- [ ] When `daysUntilEnd <= 7`: amber + relative copy ("Ends in 3 days").
- [ ] When `daysUntilEnd > 7`: neutral + absolute copy ("Ends Mar 20").
- [ ] Existing card layout doesn't regress.
- [ ] Helper is unit-testable in isolation.

**Independent — no Manager pair.** Auto model. Can ship anytime after App-I-4 (uses v6 schema reads but doesn't need new fields beyond `endDate`).

---

### Step App-I-6: Resume Wave Per-Incentive History (Counted ⏐ Missed Out tabs) + Disqualified-Trip UI

**Goal:** Merged feature combining W2-2 (tap incentive → see completed qualifying rides) + W3-A1 (disqualified-trips view) + W3-A2 (disqualified-trip unique UI). Reads new Disqualification + Appeal collections from Manager P-12.

**Tasks:**

1. **Tap target on dashboard `<IncentiveCard>`.**
   - New chevron / expand affordance opens a per-incentive history view.
   - Disambiguation: existing tap-to-filter Requests behavior preserved on the card body / pill / progress bar. New tap target is dedicated chevron OR "View history" link OR sub-section of card. Phase D locks based on layout.

2. **Per-incentive history view component / route.**
   - Option A: new route `app/incentives/[id]/history/page.tsx`.
   - Option B: inline-expand below the dashboard card.
   - Phase D builder picks based on user's v3 reference code shape (user will paste v3 code at App-I-6 paste time per intake note).
   - Header: incentive title + bonus + status (Active / Ended).

3. **Tab strip "Counted ⏐ Missed Out (N)" where N = pending+resolved disqualifications for this driver+incentive.**

4. **Counted tab.**
   - Simple list (NOT full RideCard chrome — lighter format per user direction).
   - Each row: Trip date · Pickup → Dropoff (city or county) · Bonus contribution.
   - Reuses v3 simple-list pattern (user will paste v3 reference code at App-I-6 paste time).

5. **Missed Out tab.**
   - List of trips that triggered disqualification (read from `disqualifications` collection filtered by driverId + incentiveId).
   - Each row rendered with **disqualified-trip unique UI:**
     - Desaturated card (lighter contrast, gray-ish bg).
     - Amber/red "Disqualified" badge (color: amber to leave red for true errors).
     - Brief reason line: "OTP dropped to 92% — required 95%" or "Sendback hit max (3) in 30 days."
     - Tap action: opens dispute form (App-I-7) IF status === 'pending' or no appeal exists yet; shows "Appeal under review" badge + read-only summary if appeal pending; shows resolved state if appeal approved/denied.

6. **Helpers needed:**
   - `getDisqualificationsFor(driverId, incentiveId)` — filter from collection.
   - `getAppealForDisqualification(disqualificationId)` — find appeal if exists.
   - `formatDisqualificationReason(disqualification)` — render reason copy from `failedRule + computedValues`.

**Acceptance:**
- [ ] Tap target on incentive card opens history view.
- [ ] Tab strip switches between Counted / Missed Out cleanly.
- [ ] Counted tab shows simple list of qualifying trips.
- [ ] Missed Out tab shows disqualified trips with desaturated UI + amber badge + reason.
- [ ] Pending appeals show "Appeal under review" state.
- [ ] Approved/denied appeals show resolved state.
- [ ] Existing tap-to-filter-Requests behavior on incentive card still works.

**Pairs with:** Manager P-12 (App reads disqualifications + appeals seeded by P-12). Higher-thinking model.

---

### Step App-I-7: Resume Wave Dispute Form + Appeal Feedback (Approved / Denied + Re-entry Pop-up)

**Goal:** Bundles W3-A3 (dispute form bottom sheet) + W3-A4 (appeal status feedback dialogs + re-entry pop-up). Reads v6 schema; writes appeals via `createAppeal(...)`; reads appeal status updates from Manager P-13b.

**Tasks:**

1. **`<DisputeAppealSheet>` bottom sheet component.**
   - Pattern mirrors Late Reasons pickup-reason sheet (user-referenced screenshot).
   - Header: trip ID + "Disputed Ride" subtitle + close button (×).
   - **Pre-filled context banner** (red-tinted): the SPECIFIC disqualification reason + values from the `Disqualification` record (e.g., "Pickup at 1:17 PM · 17 mins late" or "OTP dropped to 92% (required: 95%)"). Banner uses red-50 bg + red-900 text + Clock icon.
   - **Reason field:** `<Textarea>` with placeholder "Explain why this trip should still count..." Required, non-empty validation.
   - **Comments field:** optional `<Textarea>` for additional details.
   - Cancel + "Submit Appeal" buttons (sticky bottom).
   - On submit: call `createAppeal({ driverId: currentDriver.id, incentiveId, disqualificationId, driverText: <reason + comments concatenated> })`. New appeal status = `'pending'`. Sheet closes.

2. **Disqualified-trip render mode updates** (extends App-I-6 surface):
   - **No appeal yet:** dispute affordance (CTA "Dispute this trip" or similar).
   - **Pending appeal:** read-only "Appeal under review" badge + driver's appeal text summary.
   - **Approved appeal:** trip re-renders as Counted (moves from Missed Out → Counted on tab switch). Dispute affordance hidden.
   - **Denied appeal:** stays in Missed Out; manager's reason text visible inline; Dispute affordance hidden.

3. **`<AppealResultDialog>` re-entry pop-up.**
   - Triggered on entry to dashboard OR per-incentive history view when there's an unacknowledged resolved appeal.
   - Detection: scan `appeals` collection for current driver where `status !== 'pending'` AND `id NOT IN wingz-incentives:appeal-acks:v1` localStorage.
   - If approved: green check icon + headline "Your appeal was approved" + body "[Incentive Name] is back on track."
   - If denied: amber warning icon + headline "Appeal denied" + body shows `managerReason` text.
   - Single CTA: "Dismiss" (writes `appealId` to ack-state localStorage `wingz-incentives:appeal-acks:v1` array; closes dialog; doesn't re-show for that appeal).
   - If multiple unacknowledged appeals: queue them, show one at a time.

4. **Re-disqualification post-approval** (edge case):
   - If a driver was previously approved on Appeal A, but later disqualified again (different `Disqualification` record), allow new appeal (separate `Appeal` record). UI treats this as a fresh dispute flow.

5. **Touches:**
   - New `<DisputeAppealSheet>` component.
   - New `<AppealResultDialog>` component.
   - Modifications to `<DisqualifiedTripCard>` (or whichever component App-I-6 ships) to handle pending/approved/denied/re-disqualified states.
   - New helper `getUnacknowledgedAppeals(driverId): Appeal[]` reading from collection + localStorage ack-state.
   - New helper for ack-state localStorage read/write.

**Acceptance:**
- [ ] Tap on disqualified trip opens `<DisputeAppealSheet>`.
- [ ] Pre-filled context banner shows disqualification reason + values.
- [ ] Reason validation enforces non-empty.
- [ ] Submit creates new Appeal record with status `pending`.
- [ ] Trip render mode updates correctly across no-appeal / pending / approved / denied states.
- [ ] `<AppealResultDialog>` shows on dashboard entry when there's an unacknowledged resolved appeal.
- [ ] Approved dialog: green check + "back on track" copy.
- [ ] Denied dialog: amber warning + manager reason text visible.
- [ ] Dismiss writes ack to localStorage; dialog doesn't re-show.
- [ ] Re-disqualification path allows fresh appeal.

**Pairs with:** Manager P-13b (App reads appeal mutations performed in Manager). Higher-thinking model.

## Compaction Guard

If you (the v0 agent) lose context:

1. Re-read this file + `PROTOTYPE-BIBLE.md` from top to bottom.
2. Check `## Current Step` and `## Last Completed`.
3. Resume at the next ⬜ Planned step.
4. **Do NOT recreate stripped components.** If a step says "delete `components/driver/tier-badge.tsx`", that file must stay deleted across all later steps.
