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
**App-I-6** (Per-Incentive History Counted ⏐ Missed Out tabs + Disqualified-Trip UI; pairs with Manager P-12 disqualification schema; Higher-thinking). **App-I-5 ✅ approved 2026-05-12 LOCAL ONLY** — Dynamic ends-in indicator landed: new `formatEndsIn(endDate, today): {copy, tone}` helper in `lib/data/incentive-utils.ts` returns `urgent` (≤7d, amber chip "Ends in N day(s)") / `neutral` (>7d, muted chip "Ends MMM DD") / `ended` (≤0d, gray defensive). `<IncentiveCard>` renders a chip row under the progress bar combining (a) the existing rolling-window date chip (App-I-4, rolling-window mode only) + (b) the new ends-in chip (always renders for any active surfaced incentive). Flex-wrap row keeps layout intact. `Clock` lucide icon leads the chip. No schema change — reads existing `endDate` from v6 schema. 2 files changed. No Manager pair (independent App feature). v0 backfill pending.

> **Resume Wave context:** Phase B sequenced plan locked 2026-05-09 at `Project - Driver Incentives/v1/References/Resume Wave - Sequenced Plan.md`. **5 new App prompts queued (paired with Manager prompts):** App-I-3 (empty=All sync, pairs with P-10) → App-I-4 (v6 schema sync — sliding-window goal progress + new param reads, pairs with P-11) → App-I-5 (Dynamic Ends-in indicator, independent) → App-I-6 (Per-incentive history Counted⏐Missed Out + Disqualified-trip UI, pairs with Manager P-12) → App-I-7 (Dispute form + Appeal feedback, pairs with Manager P-13b). **Schema bump:** App reads v6 (single coordinated cycle from Manager P-11 + P-12). Driver Targeting catalog drops to 6 entries (Trips Completed, Days Since Last Activity, On-Time Pickup with window, Driver Address County, Tenure, Sendbacks with penalty/range/window). **Cross-prototype lockstep:** schema-touching pairs ship Manager-then-App with paired plan-sync-enforcer.

## Last Completed
✅ **App-I-5 — Dynamic Ends-in Indicator on `<IncentiveCard>`** (approved 2026-05-12 LOCAL ONLY; v0 backfill pending). Independent App feature (no Manager pair). **Helper:** new `formatEndsIn(endDate: Date | string, today?: Date): { copy: string; tone: 'urgent' | 'neutral' | 'ended' }` in `lib/data/incentive-utils.ts`. Date math: `Math.ceil((endDate - today) / day)`. Tone buckets: `urgent` when `daysUntilEnd <= 7` (amber chip "Ends in N day(s)"), `neutral` when `> 7` (muted chip "Ends MMM DD"), `ended` when `<= 0` (gray chip "Ended" — defensive; incentive shouldn't surface but render gracefully). Accepts `Date | string` for `endDate` because App stores window dates as ISO strings (per Schema Sync Note). Reuses existing `formatRollingWindowDateShort` helper internally for the "MMM DD" format. **Render:** `<IncentiveCard>` in `components/driver/dashboard-incentive-section.tsx` — chip row under the progress bar combines (a) the existing rolling-window date chip from App-I-4 (rolling-window mode only) + (b) the new ends-in chip (renders for every surfaced incentive). Flex-wrap (`flex flex-wrap items-center gap-1.5`) keeps the row intact on narrow screens. `Clock` lucide icon leads the ends-in chip. Tone styling via `cn()`: urgent `border-amber-300 bg-amber-50 text-amber-700`; neutral `border-gray-200 bg-gray-50 text-gray-600`; ended `border-gray-300 bg-gray-100 text-gray-500`. Used on dashboard carousel + `/incentives` page (same shared `<IncentiveCard>` component). NOT on ride-card pills (those don't show end dates). **Acceptance:** ✅ All 8 active cards show indicator on both surfaces. ✅ `daysUntilEnd <= 7` → amber + relative copy. ✅ `daysUntilEnd > 7` → neutral + absolute copy. ✅ Helper unit-testable in isolation (pure function over `Date | string` input). ✅ Existing card layout intact (CTA pill below, bonus + chevron right column unchanged). **Files changed (2):** `lib/data/incentive-utils.ts` (new helper + docblock), `components/driver/dashboard-incentive-section.tsx` (chip row wrapper + import). No schema change — reads `endDate` already on v6 schema. **Verification:** HTTP 200 on `/` + `/incentives`; TypeScript clean; sanity-checked tone branching via node REPL (1d → "Ends in 1 day" urgent; 7d → urgent; 8d → neutral "Ends MMM DD"; 0d → "Ended"). With today=2026-05-12 + seed endDates 2026-05-31 (most cards) + 2026-07-31 (Loyalty Streak + Long Haul), all current seed cards render neutral. To preview amber treatment, move any `endDate` within 7 days of `today`.

✅ **App-I-4 — v6 Schema Sync + Goal Modes + Targeting Param Extensions + Explicit Rolling-Window Date Display** (approved 2026-05-12 LOCAL ONLY; v0 backfill pending). Cross-prototype lockstep with Manager P-11 + P-11.1 ✅ complete. **App schema caught up v3 → v6 in one prompt** (v4 was Manager-only; v5 schedule model + Driver Targeting catalogue work was deferred via Resume Wave absorption). **Changes:** (1) `Goal` discriminated union ported from Manager — `goal: number` → `goal: { type: "total"; count: number } | { type: "rolling-window"; count: number; days: number }`. (2) Drop legacy `timeframe` + `enabled`; add `startDate` + `endDate` ISO datetime strings. (3) `IncentiveProgressInfo` extended with `goalMode` + `goalDays?` + `startDate` + `endDate` so display layer can render mode-aware captions + the explicit rolling-window date chip. (4) NEW `formatRollingWindow(goal, startDateIso, endDateIso, today)` helper — ported from Manager P-11.1 (signature accepts ISO strings since App stores dates as strings). (5) NEW `computeCurrentWindowProgress(type, count, days, startDateIso, endDateIso, today)` helper — counts qualifying trips in the **current** Y-day window (`[today - (days-1), today]`, clamped to startDate). **Semantic locked per user direction 2026-05-12:** the App shows "Current Y-day window: X done · N needed" — NOT "Best Y-day window so far" (driver-facing metric, not eval question). Window slides forward each day. On completion, existing `progress.isComplete` badge + opacity treatment serves as the lock (future enhancement freezes the chip to the completion-window snapshot — deferred from V1; would require `completedWindowFromIso`/`ToIso` field on `DriverIncentiveProgress`). (6) `<IncentiveCard>` (dashboard carousel + `/incentives` list): mode-aware `<ProgressMeter>` captions + **explicit rolling-window date chip** rendered as a bordered green chip with `CalendarRange` lucide icon directly under the progress bar (`border-[#10B981]/30 bg-[#10B981]/5 text-[#10B981]`). Treatment intentionally more prominent than Manager preview's muted caption per user direction. (7) `<ProgramContributionIndicator>` popover (ride-card pill tap): mode-aware caption + fix pre-existing stale `progress.targetCount` ref (left over from I-1's `targetCount → goal` rename; missed in grep sweep). (8) `<IncentiveEarnedPopup>`: fix pre-existing stale `data.def.name` ref (same I-1 rename pattern; missed grep sweep). **Re-seed:** 8 incentives — 6 total mode + 2 demo rolling-window (Peak Performer 5-in-7d, Quick Wins 5-in-7d) mirroring Manager P-11 demo picks. **Files changed (6):** `lib/data/incentives.ts` (schema bump + re-seed), `lib/data/incentive-utils.ts` (helpers + mode-aware progress), `components/driver/dashboard-incentive-section.tsx` (IncentiveCard rolling-window chip + mode-aware caption), `components/driver/program-contribution-indicator.tsx` (bug fix + mode-aware popover), `components/driver/incentive-earned-popup.tsx` (bug fix), `PROTOTYPE-BIBLE.md` (schemaVersion v3 → v6 + docblock). **V1 simplifications:** OTP `windowDays` + Sendbacks `penalty` informational at predicate layer (Driver schema carries 30-day aggregates only); `computeCurrentWindowProgress` falls back to seeded `currentCount` when live computation returns 0 (sparse seed trips). **Verification:** HTTP 200 across `/`, `/incentives`, `/requests`. schemaVersion reads `2026-05-12-v6`.

✅ **App-I-3 — Empty Market/Client Scope Read-Side Confirmation** (approved 2026-05-12 LOCAL ONLY). **Audit outcome: PASS — no behavior change required.** App has NO eligibility filter on `marketScope`/`clientScope`: (a) `lib/data/incentive-utils.ts::getAllIncentiveProgress()` maps every enabled incentive regardless of scope; (b) no helper anywhere reads `marketScope` or `clientScope` (codebase grep clean); (c) `CurrentDriver` carries no `market` or `client` field (slimmed in I-0); (d) zero UI references to "no markets" / "no clients" / "All Markets" / "All Clients" in App. Empty arrays already behave correctly — driver-side visibility is unaffected by Market/Client scope in v1 (intentional: scope is admin-side analytics, not driver-side gating; flag this in v1 PRD). **Code change:** added defensive block comments on `IncentiveDefinition.marketScope` + `clientScope` in `lib/data/incentives.ts` documenting (1) empty-as-All semantic from Manager P-10, (2) App's intentional passthrough today, (3) length-zero filter shortcut pattern (`array.length === 0 || array.includes(driver.market)`) for future maintainers. **Cross-prototype lockstep with Manager P-10 ✅ complete.** Manager actively interprets empty-as-All in UI labels + form validation + scope chips; App passively honors it by not filtering — different mechanisms, same observable outcome.

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
| **App-I-3** | **Resume Wave: Empty Market/Client Scope Read-Side Confirmation** | ✅ Approved 2026-05-12 LOCAL ONLY | **Audit-only, comment-only change.** App has NO read-side filter on `marketScope`/`clientScope` (no helper consumes them; `CurrentDriver` has no market field; dashboard renders every enabled incentive regardless of scope). Empty arrays already work correctly because nothing reads them — pure passthrough. **Code:** added defensive block comments on `IncentiveDefinition.marketScope` + `clientScope` in `lib/data/incentives.ts` (empty-as-All from Manager P-10 + passthrough note + length-zero shortcut pattern for future maintainers). Cross-prototype lockstep with Manager P-10 complete. v0 backfill pending. |
| **App-I-4** | **Resume Wave: v6 Schema Sync — Goal Modes + Targeting Param Extensions + Explicit Rolling-Window Date Display** | ✅ Approved 2026-05-12 LOCAL ONLY | **Landed 2026-05-12.** Single coordinated v3 → v6 catch-up on App-side (v4 was Manager-only; v5 schedule model + Driver Targeting deferred via Resume Wave absorption). Goal discriminated union ported from Manager; `timeframe`/`enabled` dropped → `startDate`/`endDate` ISO strings added; `IncentiveProgressInfo` extended with `goalMode` + `goalDays?` + window dates; new `formatRollingWindow` + `computeCurrentWindowProgress` helpers (current window, NOT "best window so far" — corrected mid-prompt per user direction); `<IncentiveCard>` mode-aware progress + EXPLICIT rolling-window date chip (bordered green with calendar icon, more prominent than Manager preview); `<ProgramContributionIndicator>` popover mode-aware + pre-existing `.targetCount` → `.goal` bug fix; `<IncentiveEarnedPopup>` pre-existing `.def.name` → `.def.title` bug fix. **Re-seed:** 8 incentives — 6 total mode + 2 demo rolling-window (Peak Performer + Quick Wins, mirrors Manager P-11 picks). V1 simplifications: OTP `windowDays` + Sendbacks `penalty` informational at predicate layer; live-window count falls back to seeded `currentCount` if compute returns 0. **6 files changed.** Cross-prototype lockstep with Manager P-11 ✅ complete. v0 backfill pending. |
| **App-I-5** | **Resume Wave: Dynamic Ends-in Indicator on Incentive Card** | ✅ Approved 2026-05-12 LOCAL ONLY | **Landed 2026-05-12.** New helper `formatEndsIn(endDate, today): { copy, tone: 'urgent' \| 'neutral' \| 'ended' }` in `lib/data/incentive-utils.ts` — `urgent` (≤7d, amber chip), `neutral` (>7d, muted chip), `ended` (≤0d, gray defensive). Accepts `Date \| string` (App stores ISO strings). Chip rendered on `<IncentiveCard>` in a flex-wrap row under the progress bar; sits beside the rolling-window date chip from App-I-4 when both apply. `Clock` lucide icon leads the chip. Applies on dashboard carousel + `/incentives` page (same component). No schema change — reads existing `endDate`. 2 files changed (helper + IncentiveCard). v0 backfill pending. |
| **App-I-6** | **Resume Wave: Per-Incentive History (Counted ⏐ Missed Out tabs) + Disqualified-Trip UI** | ⬜ Planned (Resume Wave 2026-05-09; **reads v6 disqualifications**; pairs with Manager P-12) | **Merged feature** combining intake W2-2 (tap incentive → see completed qualifying rides) + W3-A1 (disqualified-trips view) + W3-A2 (disqualified-trip unique UI). New tap target on dashboard `<IncentiveCard>` opens a per-incentive history view: tab strip "Counted ⏐ Missed Out (N)" where N = count of disqualifications for this driver+incentive. Counted tab = simple list (NOT full RideCard chrome — lighter format per user direction; reuses v3 simple-list pattern when user provides reference code) of trips that qualified. Missed Out tab = list of trips that triggered disqualification, each rendered with **disqualified-trip unique UI** (W3-A2): desaturated card + amber/red "Disqualified" badge + brief reason line ("OTP dropped to 92% — required 95%"). Tap on a Missed Out trip → opens dispute form (App-I-7). New routes: `app/incentives/[id]/history/page.tsx` OR inline-expand below the dashboard card — Phase D builder picks based on v3 reference code shape. **Disambiguation:** new tap target on card needs to coexist with existing "tap to filter Requests" behavior; chevron/affordance for history view, pill or progress-bar tap remains "filter Requests." Phase D locks affordance. Higher-thinking model. |
| **I-7.5** | **Cross-Prototype Component Unification (Bun workspace; driver-facing only; nice-to-have)** | ⬜ Planned (added 2026-05-12 per user direction post-P-11.1; ships AFTER App-I-7) | **Cross-prototype prompt** — primary work happens at the project root (Bun workspace setup) + on this App's working dir (relocating driver-facing components to `packages/shared-driver-components/`) + on the Manager working dir (swapping preview hand-mocks for shared component consumers). **In scope from this App:** move `<IncentiveCard>` + `<RideCard>` + pill row + `<AppealResultDialog>` (built by App-I-7) + `<DisputeAppealSheet>` (built by App-I-7) + supporting helpers (e.g., the `formatRollingWindow` port from App-I-4) into the shared package. Update App imports to consume from `@wingz-incentives/shared-driver-components`. **Sequence:** ships AFTER App-I-7 so all driver-facing components are at final shape (no re-porting). **Status:** nice-to-have; may defer to v1.1 if PRD work pressures it out. See Manager TRACKER + BIBLE Build Queue for the full I-7.5 spec. Higher-thinking model. |
| **App-I-7** | **Resume Wave: Dispute Form + Appeal Feedback (Approved / Denied + Re-entry Pop-up)** | ⬜ Planned (Resume Wave 2026-05-09; **reads v6 + writes appeals**; pairs with Manager P-13b) | Bundles W3-A3 (dispute form) + W3-A4 (appeal status feedback). **Dispute form (`<DisputeAppealSheet>`):** bottom sheet pattern (mirrors Late Reasons pickup-reason sheet shape). Header: trip ID + "Disputed Ride" subtitle. **Pre-filled context banner** (red-tinted, mirrors user's reference screenshot): the SPECIFIC disqualification reason + values (e.g., "Pickup at 1:17 PM · 17 mins late" or "OTP dropped to 92% (required: 95%)"). **Reason field:** free-text textarea (V1 locked — preset dropdown deferred). **Comments field:** additional details textarea. Cancel + "Submit Appeal" buttons. On submit: call `createAppeal({ driverId, incentiveId, disqualificationId, driverText })` → status `pending`; replace dispute affordance on the disqualified trip with "Appeal under review" badge + read-only summary. **Appeal status feedback:** for each appeal in `appeals` collection with status `'approved'` or `'denied'` that the driver hasn't acknowledged: on entry to incentives Dashboard or per-incentive history view, render an **`<AppealResultDialog>`** pop-up. Approved: "Your appeal was approved — [Incentive Name] is back on track." (green check icon). Denied: "Appeal denied: [managerReason]" (amber warning icon). Dismiss button writes `appealId` to `wingz-incentives:appeal-acks:v1` localStorage; pop-up no longer shows for that appeal. **Pending state:** trip shows "Appeal under review" badge; dispute form replaced by read-only summary. **Re-disqualification post-approval:** if a previously-approved trip is later overwritten by another disqualification event, allow re-appeal (separate `Appeal` record). Touches: `<DisputeAppealSheet>` new component, `<AppealResultDialog>` new component, modifications to disqualified-trip render (states: pending / approved / denied / re-disqualified), ack-state localStorage helper. Higher-thinking model. |

## Approval Log

- **2026-05-12 — App-I-5 (Resume Wave Dynamic Ends-in Indicator on `<IncentiveCard>`) ✅ Approved LOCAL ONLY.** Independent App feature (W2-1; no Manager pair). **2 files changed:** (1) `lib/data/incentive-utils.ts` — new `formatEndsIn(endDate: Date | string, today?: Date): { copy: string; tone: 'urgent' | 'neutral' | 'ended' }` exported helper. Date math: `Math.ceil((endDate - today) / day)`. Tone buckets: `'urgent'` when `daysUntilEnd <= 7` → copy `"Ends in N day(s)"` (singular "day" when N === 1); `'neutral'` when `daysUntilEnd > 7` → copy `"Ends MMM DD"` (e.g., "Ends May 31") using existing internal `formatRollingWindowDateShort` helper; `'ended'` when `daysUntilEnd <= 0` → copy `"Ended"` (defensive — incentive shouldn't surface but render gracefully if it does). Accepts `Date | string` for `endDate` because App stores ISO datetime strings (Schema Sync Note: Manager → `Date`, App → `string`). Bad-input guard (`Number.isNaN(end.getTime())`) returns `ended` rather than crashing. Header docblock extended with App-I-5 addition. (2) `components/driver/dashboard-incentive-section.tsx` — imported `formatEndsIn` + `Clock` lucide icon; computed `endsIn` from `progress.endDate` inside `<IncentiveCard>`; replaced the conditional rolling-window chip with a flex-wrap chip row (`mt-2 flex flex-wrap items-center gap-1.5`) that contains both chips. Rolling-window chip remains gated on `rollingWindow !== null` (rolling-window mode + today >= startDate); ends-in chip always renders for any surfaced incentive. Tone styling via `cn()`: urgent → `border-amber-300 bg-amber-50 text-amber-700`; neutral → `border-gray-200 bg-gray-50 text-gray-600`; ended → `border-gray-300 bg-gray-100 text-gray-500`. ARIA: `aria-label={endsIn.copy}` on the chip span. **Surfaces touched:** dashboard incentive carousel (`<DashboardIncentiveSection>` → `<IncentiveCard>`) + `/incentives` page list (imports same `<IncentiveCard>` from `dashboard-incentive-section.tsx`). NOT on ride-card pills (those don't show end dates — out of scope per task spec). **Acceptance verified:** ✅ All 8 active cards show ends-in chip on both surfaces (`curl http://localhost:3001/` → 16 chip instances; `/incentives` → 8 chip instances). ✅ Tone branching sanity-checked via node REPL (1d → "Ends in 1 day" urgent; 7d → urgent; 8d → neutral; 0d → "Ended"). ✅ Helper is pure + unit-testable in isolation. ✅ Existing card layout intact (badge row, description, progress bar, CTA pill, bonus + chevron right column unchanged). **Seed coverage note:** today=2026-05-12 + seed endDates 2026-05-31 (most cards, 19d out) + 2026-07-31 (Loyalty Streak + Long Haul, 80d out) → all current seed cards render neutral. To preview amber treatment, an `endDate` would need to fall within 7d of today; not in scope to seed since acceptance is about the helper + render path. **Verification:** HTTP 200 on `/`, `/incentives`, `/requests`; TypeScript clean (`npx tsc --noEmit` no diagnostics). **Combined cross-prototype queue: 26 ✅ + 7 remaining** (Manager: P-12, P-13a, P-13b, I-7.5, I-7 = 5; App: App-I-6, App-I-7 = 2). **🔜 NEXT: paste P-12 (Disqualification + Appeal Schema — foundational, no UI; Higher-thinking; pairs with App-I-6) on Manager working dir `v1/Incentives V1 CS Tool/` at :3000.** v0 backfill pending (v0 sandbox still broken — Path C local-first remains the rule).
- **2026-05-12 — App-I-4 (Resume Wave v6 Schema Sync — Goal Modes + Targeting Param Extensions + Explicit Rolling-Window Date Display) ✅ Approved LOCAL ONLY.** Cross-prototype lockstep with Manager P-11 + P-11.1 ✅ complete (Manager landed earlier the same day). **App caught up v3 → v6 in one prompt** (v4 multi-trigger composition was Manager-only; v5 schedule model + Driver Targeting catalogue work was deferred via Resume Wave absorption — App skipped straight to v6). **6 files changed:** (1) `lib/data/incentives.ts` — schema bump: added `Goal` discriminated union (ported from Manager 1:1); `IncentiveDefinition.goal: number` → `goal: Goal`; dropped `timeframe` + `enabled`; added `startDate` + `endDate` ISO datetime strings; re-seeded 8 incentives (6 total mode + 2 demo rolling-window: Peak Performer 5-in-7d, Quick Wins 5-in-7d — mirrors Manager P-11 demo picks); preserved App-only fields (`qualifyingCriteria`, `trigger`, `iconName`) per Schema Sync Note "documented subset" rule. (2) `lib/data/incentive-utils.ts` — extended `IncentiveProgressInfo` with `goalMode` + `goalDays?` + `startDate` + `endDate`; `getIncentiveProgressInfo` unpacks discriminated Goal; NEW `formatRollingWindow(goal, startDateIso, endDateIso, today)` helper ported from Manager P-11.1 (signature accepts ISO strings since App stores dates as strings); NEW `computeCurrentWindowProgress(type, count, days, startDateIso, endDateIso, today)` helper. **Semantic locked per user direction 2026-05-12 (mid-prompt correction):** "Current Y-day window: X done · N needed" — NOT "Best Y-day window so far". Driver-facing metric, not eval question. Window slides forward each day. On completion, existing `progress.isComplete` badge + opacity treatment serves as the lock; future enhancement freezes the chip to the completion-window snapshot (would require `completedWindowFromIso`/`ToIso` field on `DriverIncentiveProgress` — deferred from V1). (3) `components/driver/dashboard-incentive-section.tsx` — `<IncentiveCard>` mode-aware `<ProgressMeter>` + **EXPLICIT rolling-window date chip** rendered as bordered green chip with `CalendarRange` lucide icon directly under the progress bar (`border-[#10B981]/30 bg-[#10B981]/5 text-[#10B981]`). Treatment intentionally MORE prominent than Manager preview's muted caption per user direction. Null cases (total mode + upcoming) → no chip. (4) `components/driver/program-contribution-indicator.tsx` — mode-aware popover caption ("Current Y-day window: X done · N needed" for rolling-window) + **pre-existing stale ref bug fix:** `progress.targetCount` → `progress.goal` (left over from I-1's `targetCount → goal` rename; missed in original grep sweep — would have rendered `undefined`/NaN). (5) `components/driver/incentive-earned-popup.tsx` — **pre-existing stale ref bug fix:** `data.def.name` → `data.def.title` (same I-1 rename pattern, also missed grep sweep — would have rendered blank). (6) `PROTOTYPE-BIBLE.md` — `schemaVersion: 2026-05-05-v3` → `schemaVersion: 2026-05-12-v6` + full catch-up docblock. **V1 simplifications carried from Manager P-11:** OTP `windowDays` informational at predicate layer (Driver schema carries 30-day snapshot only); Sendbacks `penalty` filter informational (driver carries raw count only); `computeCurrentWindowProgress` falls back to seeded `currentCount` when live computation returns 0 (sparse seed trips — TODO flagged for real backend). **Verification:** HTTP 200 across `/`, `/incentives`, `/requests`; `Window: May 6 – May 12` chip renders on Peak Performer + Quick Wins cards (today is 2026-05-12); total-mode cards have NO chip; mode-aware "Current 7-day window" caption replaces "X done · Y to go" for rolling-window mode; window slides daily as device clock advances. **Combined cross-prototype queue: 25 ✅ + 8 remaining** (Manager: P-12, P-13a, P-13b, I-7.5 NEW, I-7 = 5; App: App-I-5, App-I-6, App-I-7 = 3). **🔜 NEXT: paste App-I-5 (Dynamic Ends-in indicator on `<IncentiveCard>`; W2-1; independent — no Manager pair; Auto model).** Pre-paste sandbox cp sync to `Driver App/References/v0-repo-files/` pending in this sync pass.
- **2026-05-12 — Manager P-11 + P-11.1 ✅ Approved LOCAL ONLY — cross-prototype lockstep with App-I-4 ✅ complete (same-day pairing).** Breadcrumb only (Manager TRACKER owns the full entry). Schema bump `2026-05-07-v5 → 2026-05-12-v6` Manager-side. **App-I-4 spec extended** with two additions per user direction: (1) **🆕 Explicit rolling-window date display** — App's `<IncentiveCard>` must render the current applicable rolling-window date range as an EXPLICIT chip (more prominent than Manager preview's muted caption). Port `formatRollingWindow` helper from Manager's `lib/data/incentives.ts` into App's `lib/data/incentive-utils.ts` (or equivalent); render chip when `goal.type === "rolling-window"` AND `today >= startDate`; chip value slides daily as device clock advances; null cases (total mode + upcoming) → no chip. (2) **V1 predicate simplification note** — OnTimePickup `windowDays` may remain informational at the predicate layer if Driver schema only carries 30-day aggregate; Sendbacks `penalty` filter same pattern. **NEW Build Queue entry I-7.5 (Cross-Prototype Component Unification — Bun workspace; driver-facing only; nice-to-have)** queued after App-I-7. Combined cross-prototype queue: **24 ✅ + 9 remaining** (Manager: P-12, P-13a, P-13b, I-7.5, I-7 = 5; App: App-I-4, App-I-5, App-I-6, App-I-7 = 4). **🔜 Next paste: App-I-4 (cross-prototype lockstep paired with P-11) on App working dir `v1/Incentives V1 App/` at :3001 — Higher-thinking model.**
- **2026-05-12 — App-I-3 Empty Market/Client Scope Read-Side Confirmation ✅ Approved LOCAL ONLY.** Cross-prototype lockstep pair for Manager P-10 (which shipped 2026-05-11). **Audit outcome: PASS — no behavior change required.** Codebase grep across `v1/Incentives V1 App/` for `marketScope|clientScope|driver.market|driver.client` returned zero hits outside the seed data file. `lib/data/incentive-utils.ts::getAllIncentiveProgress()` (lines 141–154) maps every enabled `incentiveDefinitions` entry, sorts by `sortOrder` ASC, prioritizes incomplete-first — no scope filter. `CurrentDriver` type (slimmed in I-0) carries `{id, displayName, initials, username}` only; no `market` or `client` field exists to filter against. UI copy grep for "no markets" / "no clients" / "All Markets" / "All Clients" → zero hits (all market/client UI text lives Manager-side). **Code change:** 1 file edited — `lib/data/incentives.ts` lines ~69–78. Added defensive block comments on `IncentiveDefinition.marketScope` + `clientScope`: (1) "Empty array = ALL markets eligible (matches Manager P-10 read semantics, 2026-05-12)"; (2) "App does NOT filter on this field today: `CurrentDriver` carries no `market` field and the dashboard renders every enabled incentive regardless of scope. This is a pure passthrough read"; (3) "If filter logic is ever added (App-I-4 / future), use the length-zero shortcut: `marketScope.length === 0 || marketScope.includes(driver.market)`". Zero behavior change. **Verification:** Manager :3000 → HTTP 307 (root redirect, normal); App :3001 → HTTP 200 (serving cleanly); spot-check App dashboard renders all 8 enabled incentives identically to pre-change. **PRD flag for v1:** Market/Client scope is admin-side analytics, NOT driver-side gating — driver visibility unaffected by these fields in v1. Manager interprets empty=All in UI labels + form validation + scope chips; App passively honors it by not filtering. Different mechanisms, same observable outcome. **Cross-prototype lockstep with Manager P-10 ✅ complete.** Pre-paste sandbox sync N/A (App-I-3 doesn't ship to v0; Path C local-first; v0 backfill pending). Build queue: **23 ✅ + 9 remaining** (Manager: P-11, P-12, P-13a, P-13b, I-7 = 5; App: App-I-4, App-I-5, App-I-6, App-I-7 = 4). Git commits: pending on `v1/Incentives V1 App/` working dir. 🔜 NEXT: paste **Manager P-11** (Schema v6 + goal modes + catalog trim — Higher-thinking model; heaviest prompt of the wave) on Manager working dir `v1/Incentives V1 CS Tool/` at :3000. After P-11 ✅, paste App-I-4 in cross-prototype lockstep.
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
- [x] Eligibility filter handles empty `marketScope` as "all markets eligible." → ✅ Trivially: no filter exists; pure passthrough.
- [x] Eligibility filter handles empty `clientScope` as "all clients eligible." → ✅ Same as above.
- [x] Manual test: create a Manager incentive with empty Market + Client → driver in any market sees the incentive on dashboard. → ✅ Driver sees every enabled incentive regardless of scope today.
- [x] No regressions on existing incentives with non-empty scopes. → ✅ Comment-only change; behavior identical.

**Status:** ✅ Approved 2026-05-12 LOCAL ONLY (audit-only, comment-only change). v0 backfill pending.

**Pairs with:** Manager P-10 ✅ (lockstep complete). Auto model.

---

### Step App-I-4: Resume Wave v6 Schema Sync — Goal Modes + Targeting Param Extensions + Explicit Rolling-Window Date Display

**Goal:** App-side companion to Manager P-11 + P-11.1 (the v6 schema bump). Reads new `goal` discriminated union + handles sliding-window progress logic + reads extended OnTimePickup / Sendbacks param shapes + trimmed catalog. **NEW per user direction 2026-05-12 (P-11.1 hook):** render the current applicable rolling-window date range EXPLICITLY on the App's IncentiveCard — more prominent than the Manager preview's subtle caption.

**Tasks:**

1. **Goal discriminated union read (W1-2).**
   - `incentive.goal` shape: `{ type: "total"; count: number } | { type: "rolling-window"; count: number; days: number }`.
   - For `type === "total"`: existing `currentCount / count` rendering preserved. Caption: "X done · Y to go."
   - For `type === "rolling-window"`: NEW sliding-window logic. Track `qualifyingTrips: Array<{date: Date}>` per driver+incentive. Compute "best window so far" by scanning all valid Y-day windows in `[startDate, today]` and finding the max trip count.
     - Mock implementation: precompute a list of trip dates from seed data; iterate over each trip date as a window start; count trips in `[start, start+Y days]`; return max.
     - Caption: "**Current** <Y>-day window: <done> done · <remaining> needed" (corrected 2026-05-12 per user direction — driver-facing metric is "what's my count in the current window right now?", not "best ever achieved").
     - Helper: `computeCurrentWindowProgress(type, count, days, startDate, endDate, today): { done: number; remaining: number }` — counts trips in `[today - (days-1), today]`, clamped to startDate.
     - Future enhancement (deferred from V1): on completion, freeze the chip to the window where the driver completed (would require a stored `completedWindowFromIso`/`ToIso` field on `DriverIncentiveProgress`). V1 uses the existing "Completed" badge + opacity treatment as the completion indicator.

2. **OnTimePickup param read extension (W1-3).**
   - New shape: `{ thresholdPct: number; windowDays: number }`.
   - App's predicate matching against driver state: `driver.otpPercentLast<windowDays>Days >= thresholdPct`.
   - If `driver` doesn't carry pre-computed window-specific OTP, compute from `driver.otpHistoryLast30Days` or fall back to existing `driver.otpPercent` field.
   - **Note (V1 simplification carried from Manager P-11):** if Driver schema only carries 30-day aggregate, `windowDays` may remain informational; predicate reduces to `driver.otpPercent >= thresholdPct`.

3. **Sendbacks param read extension (W1-3).**
   - New shape: `{ penalty: 'penalty' | 'no-penalty' | 'both'; minCount?: number; maxCount?: number; windowDays: number }` (Manager P-11 final shape — `countRange` denormalized to flat `minCount`/`maxCount` fields).
   - App's predicate filters driver's sendbacks by `penalty` filter, counts within `windowDays`, checks against `{minCount, maxCount}` range.
   - **Note (V1 simplification carried from Manager P-11):** if Driver schema only carries raw `sendbacksLast30Days: number`, `penalty` filter remains informational.

4. **Catalog trim handling (W1-3).**
   - Trip Targeting catalog locked to 6 entries; Driver Targeting catalog locked to 6 entries (per Manager P-11).
   - App's predicate evaluators (if any — most predicate logic stays Manager-side; App reads results) tolerate the smaller catalog. Drop any reads of removed types.

5. **🆕 Explicit rolling-window date display (P-11.1 hook from user direction 2026-05-12).**
   - **Port `formatRollingWindow` helper from Manager** into App's `lib/data/incentive-utils.ts` (or equivalent — keep semantic identical so cross-prototype reads stay locked). Manager source: `v1/Incentives V1 CS Tool/lib/data/incentives.ts::formatRollingWindow(goal, startDate, endDate, today)`. Returns `{fromIso, toIso, fromLabel, toLabel} | null`. Pointer clamps to `endDate`; start clamps to `startDate`.
   - **Render on the App's `<IncentiveCard>` (dashboard carousel tile):** when `goal.type === "rolling-window"` AND `today >= startDate`, render an EXPLICIT chip / prominent row displaying the current window: `[Window: May 6 – May 12]` or `[📅 May 6 – May 12 (this week's window)]`. Style suggestion: small bordered chip with leading calendar icon directly under the progress bar — visually distinct from Manager preview's muted caption. Phase D builder picks final treatment based on existing card real estate.
   - **Slides daily:** caption value driven by `today: Date = new Date()`. As days pass on the device clock the displayed range advances automatically.
   - **Same `null` cases as Manager:** total-mode + upcoming campaigns → no chip rendered.
   - **Coordinates with `<AppealResultDialog>` (App-I-7)** — the helper signature should be portable to the shared package created in I-7.5 without changes.

6. **Plan B (if sliding-window logic too complex):** ship "total" mode only + the explicit rolling-window date display (task 5 — UI-only); gate sliding-window progress computation behind a feature flag. Phase D builder picks based on time pressure.

**Acceptance:**
- [x] Total-mode incentives render correctly. → ✅ existing "X done · Y to go" caption preserved for 6 total-mode incentives.
- [x] Rolling-window mode incentives render correctly with sliding-window progress caption. → ✅ "Current 7-day window: X done · N needed" (NOT "Best window" — corrected per user direction).
- [x] **🆕 Rolling-window incentive cards render an EXPLICIT date-range chip showing the current applicable window (e.g., "Window: May 6 – May 12"). Total-mode cards do NOT render this chip.** → ✅ bordered green chip with `CalendarRange` icon rendered on Peak Performer + Quick Wins; suppressed on total-mode cards.
- [x] **🆕 Window value updates as the device clock advances day-to-day (no stale dates).** → ✅ helper signature accepts `today: Date = new Date()` parameter; read at render time.
- [x] **🆕 Treatment is visually MORE prominent than Manager preview (e.g., bordered chip vs. muted caption per user direction).** → ✅ bordered green chip + leading icon vs Manager's `text-[8px] text-muted-foreground` caption.
- [x] OnTimePickup eligibility check handles new threshold + window params. → ✅ shape extended; V1 simplification at predicate layer doc'd (informational `windowDays`).
- [x] Sendbacks eligibility check handles new penalty + range + window params. → ✅ shape extended; V1 simplification at predicate layer doc'd (informational `penalty`).
- [x] No reads of removed catalog types crash. → ✅ App doesn't model catalogs; `IncentiveDefinition` carries `qualifyingCriteria` string only (App-only subset).
- [x] Schema version reads cleanly as `2026-05-12-v6`. → ✅ comment at top of `lib/data/incentives.ts` + PROTOTYPE-BIBLE schemaVersion line.
- [x] **🆕 Semantic correction landed:** "Best Y-day window" → "Current Y-day window" per user direction (driver-facing metric; window slides forward each day; completion lock via existing `isComplete` badge).
- [x] **🆕 Pre-existing bug fixes:** `progress.targetCount` → `progress.goal` in popover + `data.def.name` → `data.def.title` in Earned popup (both stale refs left over from I-1 grep sweep).

**Status:** ✅ Approved 2026-05-12 LOCAL ONLY. v0 backfill pending. **Pairs with:** Manager P-11 + P-11.1 ✅ (lockstep complete). Higher-thinking model.

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
