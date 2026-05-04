# Driver Incentives v1 — Driver App — Prototype Tracker

> **IMPORTANT:** This tracker drives the v0 build queue. **v1 is a STRIP-BASED build** — start from a duplicate of the v3-baseline v0 chat and prompt v0 to REMOVE everything that belongs to v2 or v3, then migrate the schema. NOT a from-scratch rebuild.
>
> Re-read this file + `PROTOTYPE-BIBLE.md` if context compacts.

## Build Approach

**Duplicate the v3-baseline v0.dev chat** (use v0's "Duplicate" / fork-branch action on the latest v3 chat — creates a new chat that starts from the same code state). Work on the duplicate. The original v3 chat stays frozen at the v3 baseline.

**Each strip step is forward-only on the duplicate.** Do NOT revert. Do NOT recreate stripped components later. If a feature is removed in I-0, it's gone for v1 — it lives in the original v3 chat + `v3/References/` docs only.

**Re-orientation prompt (Prompt 0)**: re-uploads the v1 BIBLE + this v1 TRACKER (overwriting the v3 versions in the duplicated repo) and confirms v0 understands the v1 scope before stripping begins.

**Why 3 steps instead of 5:** The existing UI is already CEO-approved; we're scoping down, not rebuilding. I-0 is one big strip pass (Variant Toggle + Tier + Leaderboard + `/payout` + UpcomingPayoutWidget downgrade). I-1 is the only ADD step (per-incentive admin schema). I-2 is polish + grep sweep. Minimizes prompt rounds while keeping each prompt focused on a single intent.

## Current Step
I-0 (Mega Strip — Variant Toggle + Tier + Leaderboard + /payout + Widget Downgrade)

## Last Completed
— (v1 not yet started; v3 baseline frozen 2026-05-02)

## v1 End-State Reference
The v1 BIBLE describes the END STATE. After I-0 through I-2 complete, the prototype should match the BIBLE.

## Build Queue

| # | Goal | Status | Description |
|---|---|---|---|
| 0 | Re-orientation | ⬜ Planned | On the duplicated v0 chat: upload v1 BIBLE + TRACKER (overwriting v3 versions in repo). v0 confirms v1 scope. No code changes. |
| I-0 | Mega Strip — Variant Toggle + Tier + Leaderboard + `/payout` + Widget downgrade | ⬜ Planned | One pass. DELETE: variant toggle infra, unused ride-card + dashboard variants, tier system, leaderboard, `/payout` page, `Trip.revenueAddons`. DOWNGRADE: UpcomingPayoutWidget → display-only. STRIP: tier-coupled fields from schema (`tierLevel`, `INCENTIVE_TIER_BONUSES`, `Tier`, `TierConfig`, `LeaderboardEntry`). DOWNGRADE: Earned popup → single "Dismiss" CTA. STRIP: `/incentives` Tabs. |
| I-1 | Schema migration — per-incentive admin fields + re-seed | ⬜ Planned | ADD: `color`, `timeframe`, `enabled`, `sortOrder`, `marketScope`, `clientScope`, `trigger` to `IncentiveDefinition`. RENAME: `targetCount` → `goal`, `name` → `title`. `bonusAmount` is sole $ source. Re-seed 8 incentives. Pill bg uses `color`. Sort by `sortOrder` ASC. |
| I-2 | Polish + edge states + final QA grep sweep | ⬜ Planned | Empty states, disabled-incentive filtering, [DEV] Earned popup trigger, full grep sweep returning zero hits on stripped tokens. |

## Approval Log

_(populate as steps approve)_

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
- `components/driver/upcoming-payout-widget.tsx` (display-only)
- `components/driver/filter-requests-modal.tsx` (with `incentiveType` field)
- `components/driver/incentive-earned-popup.tsx` (single-CTA Dismiss)
- `components/driver/revenue-display.tsx` (kept; `revenueAddons` stripped from data)

**DELETE (during I-0 strip):**
- `components/driver/variant-toggle.tsx`
- `components/driver/variants-wrapper.tsx`
- `components/driver/tier-badge.tsx`
- `components/driver/tier-progress-section.tsx`
- `components/driver/leaderboard-tab.tsx`
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
- `components/driver/upcoming-payout-widget.tsx`: remove the `router.push('/payout')` handler. Tap → no-op (or simple toast: "Payout page redesign coming in v2"). Widget retains its visual: `$amount` + breakdown row + "Next payout: <date>" caption. Display-only.
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
- [ ] UpcomingPayoutWidget tap doesn't navigate; revenue cells show base $ only
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
- All `Trip.incentiveType` reads → `Trip.incentiveTypes`. Helpers (`getTripsByIncentive`, etc.) refactored to array-includes.

**Progress simplification — binary done-vs-to-go:**

The current v3 baseline UI shows a 3-state progress: solid green (`X done`) + hatched green (`+Y taken`) + gray (`Z to go`). v1 simplifies to **2-state binary**: solid green (`X done`) + gray (rest of bar). Drop the "taken" intermediate state entirely.

- Progress data: only `completedCount: number` is consumed by the bar/text. If a `takenCount` / in-flight field exists in seed data, leave it but stop reading it from the UI (or drop entirely — it's display-only, not load-bearing).
- Bar: `completedCount / goal` solid fill, rest gray. No hatched section.
- Caption text: `"5 done · 3 to go"` (computed: `goal - completedCount` = to go). NO `+N taken` segment.
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

Each multi-incentive trip should still complete to a single trip record — the trip "counts toward" each listed program (increments `completedCount` for each). Stacking pills must NOT overflow the ride card; if 4+ pills don't fit, allow horizontal scroll within the bottom pill row OR truncate to first 3 + "+N more" chip (whichever the existing layout already supports cleanest — defer to v0's judgment but note both options).

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
- Dashboard (top → bottom): UpcomingPayoutWidget → Driver Incentives carousel → Earnings card → Confirm Trip → New Requests preview → Next Accepted Ride
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

## Compaction Guard

If you (the v0 agent) lose context:

1. Re-read this file + `PROTOTYPE-BIBLE.md` from top to bottom.
2. Check `## Current Step` and `## Last Completed`.
3. Resume at the next ⬜ Planned step.
4. **Do NOT recreate stripped components.** If a step says "delete `components/driver/tier-badge.tsx`", that file must stay deleted across all later steps.
