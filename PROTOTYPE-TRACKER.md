# Prototype Build Tracker — Driver Incentives — NEMT Driver App

> **IMPORTANT:** This file tracks build progress. v0 MUST update this file after each approved step. If your context compacts, RE-READ this file + `PROTOTYPE-BIBLE.md` to know where you left off.

---

## Current Step: I-0a
## Last Completed: —

---

## Prototype Mode

This prototype is a **variant-comparison overlay** on the existing Wingz NEMT Driver App. The existing surfaces are replicated faithfully and then augmented with an incentive layer. A global Variant Toggle (built in I-1) lets stakeholders compare named UI variants per surface.

**Bonus model: PROGRAM-LEVEL, single-program-per-trip (post I-4.2).** A trip "counts toward" ONE incentive program (`Trip.incentiveType: IncentiveType | null`). Driver earns the program's bonus when they hit `IncentiveDefinition.targetCount`. Trip never carries per-trip bonus dollars. Bonus values appear ONLY at the program level (I-2 contribution popover/tooltip; I-3 dashboard cards; `/payout` page summary + Completed Incentives tab; I-8 Achievement Unlock Dialog).

**Points model (post I-4.2).** Each `IncentiveDefinition` has a `tierLevel: 'gold' | 'silver' | 'bronze'`. Constant `INCENTIVE_TIER_POINTS = { gold: 3, silver: 2, bronze: 1 }`. When a program completes the driver earns BOTH (a) the program's `bonusAmount` ($) and (b) the program's tier points. Points are STATUS-ONLY — non-monetary. Drive: leaderboard ranking + driver's tier (Bronze/Silver/Gold/Platinum). `TierConfig.threshold` is points-based.

**No-flow / data-driven only.** This prototype renders STATES from seed. NO completion events, NO tier-up events, NO payout-fire events, NO points-accumulation events. All states seeded directly. Achievement Unlock + Tier Unlock dialogs (I-8) are mock-triggered via [DEV] buttons.

**Two required navigation paths for stakeholder testing:**

1. **Requests → Ride Details (before-taken state)** — driver browses Requests, taps a trip, sees Ride Details for a trip not yet started.
2. **My Rides Needs Action → Ride Details (needs-action / in-progress state)** — driver browses My Rides Needs Action tab, taps an accepted trip, sees Ride Details for that state.

**No acceptance / decline / start-trip / end-trip flows.** Detail screens are read-only. Sticky footers (pink/green swipe on Before-Taken; red "I REACHED OUT TO CONFIRM" on Needs Action) render visually but DO NOT trigger any flow.

---

## Build Queue

| #     | Screen                                                        | Status    | Key Deliverable                                                                                                                                                                                                                                                                                  |
| ----- | ------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0     | Setup                                                         | ⬜ Planned | Bible + Tracker + screenshots tree uploaded; v0 confirms understanding                                                                                                                                                                                                                           |
| I-0a  | Shell Replication — Scaffold + List Surfaces                  | ⬜ Planned | App layout, Header, BottomNav (5 tabs), routing. Replicate Dashboard, Requests, My Rides, Ride History. Build shared RideCard once, reuse across all 4 list surfaces.                                                                                                                            |
| I-0b  | Shell Replication — Ride Details (both states merged)         | ⬜ Planned | Shared trip-detail body (map + metadata + leg cards). Two state variants swap the bottom region: Before Taken (swipe footer) + Needs Action / In Progress (amber alert + action toolbar + sticky red CTA). Two nav paths working: Requests→Detail (Before Taken), MyRides→Detail (Needs Action). |
| I-0.5 | Schema + Seed Data                                            | ⬜ Planned | `lib/data/incentives.ts` + `lib/variants.ts`. Trip carries `incentiveTypes` only (refactored to singular `incentiveType` in I-4.2). `IncentiveDefinition` holds `bonusAmount` + `targetCount` (gains `tierLevel` in I-4.2). |
| I-1   | Variant Toggle Infrastructure                                 | ⬜ Planned | Floating Variants pill + Sheet picker + URL/localStorage persistence + default variants for 3 surfaces (pill / dashboard / detail).                                                                                                                                                              |
| I-2   | Pill / Badge / Banner on Ride Card + Trip Contribution        | ⬜ Planned | 3 fun variants: `pill-named-bottom` (named pill in bottom row + small Wingz mark), `badge-corner-flag` (green Wingz on black square at top-right corner with tooltip), `banner-wingz-hero` (full black + green Wingz banner at top of card). NO dollar amount on any variant. **Plus** the single-design `ProgramContributionIndicator` (Tooltip + Popover) layered on all 3 variants — taps surface program progress + program-level bonus. |
| I-3   | Dashboard Incentive Surfacing — Variant Set + Upcoming Payout | ⬜ Planned | 2–3 dashboard surfacing variants + deep-link to Requests filter + Upcoming Payout widget (read-only weekly projection summing completed-program bonuses).                                                                                                                                        |
| I-4   | Ride Details Incentive Surfacing — Single Design + Regression Fixes | ⬜ Planned | Extend the active I-2 surface (pill / badge / banner) to Ride Details (both states) with placement adapted per variant — NO separate variant set. **Plus** fix inherited regressions: white header bg, white nav bg, trip metadata card layout (below map, contains Leg field). |
| I-4.1 | Driver Incentives Hub Page (`/incentives`) + Dashboard Carousel Rework | ⬜ Planned | New stack-pushed `/incentives` page with 3 tabs: **Incentives** (default, full stacked card list reusing `IncentiveCard`), **Leaderboard** (placeholder until I-7), **Tier Progress** (placeholder until I-6). Rework `dashboard-card-section` variant from 4 stacked cards → swipe carousel. Add "View All" link to all dashboard variants. **`UpcomingPayoutWidget` STAYS on dashboard** (does NOT move). |
| I-4.2 | Component Unification + Single-Incentive Schema + Achievement Banner Variant + Points System | ⬜ Planned | **Schema:** `Trip.incentiveType: IncentiveType \| null` (singular, was array); add `IncentiveDefinition.tierLevel` + `INCENTIVE_TIER_POINTS`; add `LeaderboardEntry.pointsEarnedThisPeriod`; `CurrentDriver.incentivesAccomplishedThisPeriod` → `pointsAccumulatedThisPeriod`; `TierConfig.threshold` shifts to points-based (Bronze 0 / Silver 5 / Gold 12 / Platinum 24). **Variant set:** drop `badge-corner-flag`, add `achievement-banner`. Hero Banner refined (black + Wingz mark backdrop tinted by tierLevel). **`IncentiveCard` themed by active variant** (Dashboard carousel, `/incentives` Incentives tab, `/payout` Completed Incentives tab). Drop multi-program rendering everywhere. **Seed updates:** assign tierLevels to programs; trips become single-program; trips for completed programs get `incentiveType: null` (data-driven suppression — NO runtime filter). |
| I-4.3 | Upcoming Payout Page (`/payout`) + Retire Sheet Popup         | ⬜ Planned | (Renumbered from I-4.2 on 2026-05-01.) New stack-pushed `/payout` page with summary header + 2 tabs: **Rides Completed** (completed-rides filter using existing `RideCard` from Ride History, scoped to current pay period) and **Completed Incentives** (reuses unified `IncentiveCard` filtered to completed-this-period). Remove Sheet popup from `UpcomingPayoutWidget` on dashboard; tap → `router.push('/payout')`. |
| I-5   | Filter Trips by Incentive                                     | ⬜ Planned | Single-design filter chip + sub-filter in Requests; extends existing modal pattern; supports `?incentive=` URL param init.                                                                                                                                                                       |
| I-6   | Tier Progress (tab content on `/incentives`)                  | ⬜ Planned | Build `TierBadge` composite + horizontal row of 4 tiers (Bronze/Silver/Gold/Platinum) + threshold copy ("Earn N points to reach <Tier>") + path-to-next-tier progress. **Points-based** — driver's tier from `pointsAccumulatedThisPeriod`. NO multiplier wiring into Dashboard projected bonus. |
| I-7   | Leaderboard (tab content on `/incentives`)                    | ⬜ Planned | Anonymized handles, period selector, current driver highlighted, consumes finalized `TierBadge` from I-6. **Ranked by `pointsEarnedThisPeriod`**; `bonusesEarned` shown per row as a secondary $ figure. |
| I-8   | Polish + Edge States + Achievement Unlock Dialog              | ⬜ Planned | Empty / period-ended / payout-pending / ineligible states + Achievement Unlock Dialog with **3 CTAs** ("View Earnings" → `/payout`, "View Achievements" → `/incentives`, "Dismiss") + Tier Unlock Dialog. Mock-triggered via [DEV] buttons (no real events).                                                                                        |

---

## Approval Log

| Step | Decision | Date | Delta Notes |
|------|----------|------|-------------|
| | | | |

---

## Component Inventory

| Component | Import Path | Used In |
|-----------|-------------|---------|
| Tabs | `@/components/ui/tabs` | I-0a (My Rides 3-tab row: In Progress / Needs Action / Upcoming), I-4.1 (`/incentives` 3-tab interface: Incentives / Leaderboard / Tier Progress), I-4.2 (`/payout` 2-tab interface: Rides Completed / Completed Incentives) |
| Card | `@/components/ui/card` | I-0a, I-0b, I-3, I-4, I-6, I-7 |
| Button | `@/components/ui/button` | All steps |
| Avatar | `@/components/ui/avatar` | I-0a, I-6, I-7 |
| Badge | `@/components/ui/badge` | I-2 (IncentiveBadgeRenderer), I-3, I-4, I-5, I-6, I-7 |
| Progress | `@/components/ui/progress` | I-3 (ProgressMeter), I-6 (tier progress) |
| ToggleGroup | `@/components/ui/toggle-group` | I-3 (period selector if used), I-5 (filter), I-7 |
| Select | `@/components/ui/select` | I-5 (sub-filter by incentive type) |
| Sheet | `@/components/ui/sheet` | I-1 (Variant Toggle picker), I-3 (UpcomingPayoutWidget breakdown — Sheet REMOVED in I-4.2; widget tap navigates to `/payout` instead) |
| Carousel / ScrollArea (snap) | `@/components/ui/carousel` if available, else `@/components/ui/scroll-area` with snap-x | I-4.1 (IncentiveCarousel — the reworked `dashboard-card-section` variant) |
| RadioGroup | `@/components/ui/radio-group` | I-1 (variant pickers) |
| Tooltip | `@/components/ui/tooltip` | I-2 (`badge-corner-flag` reveal + ProgramContributionIndicator on hover/tap), I-6 |
| Popover | `@/components/ui/popover` | I-2 (ProgramContributionIndicator on tap for `pill-named-bottom` / `banner-wingz-hero`) |
| Dialog | `@/components/ui/dialog` | I-8 (Achievement Unlock + Tier Unlock) |
| Alert | `@/components/ui/alert` | I-0b (amber confirmation banner on Needs Action), I-8 (period-ended, payout-pending, ineligible) |
| Table | `@/components/ui/table` | I-7 (leaderboard rows on tablet) |
| ScrollArea | `@/components/ui/scroll-area` | I-2 (multi-pill row), I-5 (filter chip row), I-7 |

**Composite components built across steps:**

| Composite | Built In | Reused In |
|-----------|----------|-----------|
| Header | I-0a | All screens |
| BottomNav | I-0a | All screens with bottom nav (Home / Requests / My Rides) |
| RideCard | I-0a | I-0a list surfaces, plus I-2 (incentive surfaces layered on top), I-3 (dashboard previews), I-5 (filtered list) |
| RideDetailLayout | I-0b | I-0b detail routes, plus I-4 (incentive surface placement on the detail layout) |
| VariantToggle | I-1 | All variant-set steps (I-2, I-3). Sheet has 2 sections: pill, dashboard. |
| IncentiveBadgeRenderer | I-2 (built) → I-4.2 (refined) | I-3 (dashboard cards), I-4 (Ride Details placement), I-5 (filter chips). Switches between `pill-named-bottom` / `banner-wingz-hero` / `achievement-banner` based on `useVariants().pill` (post I-4.2; `badge-corner-flag` retired in I-4.2). Renders ONE program per surface (multi-program rendering dropped in I-4.2). |
| ProgramContributionIndicator | I-2 (built) → I-4.2 (refined) | I-4 (ride detail surfaces inherit the same wrapper). Tooltip + Popover wrapper around `IncentiveBadgeRenderer`. Single design (no toggle). Single-program rendering only (multi-program dropped in I-4.2). |
| IncentiveCard | I-3 (built as white card) → I-4.2 (themed by active variant) | Dashboard `dashboard-card-section` carousel (I-4.1), `/incentives` Incentives tab (I-4.1), `/payout` Completed Incentives tab (I-4.3). Reads `useVariants().pill`: `pill-named-bottom` = white card; `banner-wingz-hero` = black with tier-tinted Wingz mark backdrop; `achievement-banner` = full `tierLevel` color. |
| DashboardIncentiveSection | I-3 | Dashboard. `dashboard-card-section` variant reworked into IncentiveCarousel in I-4.1. Every variant gains a "View All" link in I-4.1 that opens `/incentives`. |
| IncentiveCarousel | I-4.1 | Dashboard `dashboard-card-section` variant — replaces the 4-stacked-cards layout. One card at a time, swipe left/right, page dots. |
| IncentivesPage | I-4.1 | New `/incentives` route — Driver Incentives Hub. Composed from header (back chevron + "Driver Incentives" title + Variants pill) + Tabs (Incentives default / Leaderboard / Tier Progress). Tabs are placeholder shells in I-4.1; Leaderboard tab filled in I-7, Tier Progress tab filled in I-6. |
| PayoutPage | I-4.3 (renumbered from I-4.2 on 2026-05-01) | New `/payout` route — Upcoming Payout breakdown. Composed from header (back chevron + "Upcoming Payout" title + Variants pill) + summary section (total payout / payout date / base + bonus split) + Tabs (Rides Completed default / Completed Incentives). Reuses existing `RideCard` (Rides Completed tab) and the unified `IncentiveCard` (Completed Incentives tab — themed by active variant per I-4.2). |
| UpcomingPayoutWidget | I-3 (built on dashboard with Sheet) → I-4.2 (Sheet retired, tap navigates to `/payout`) | Stays on dashboard for at-a-glance context. Originally tapped to open a Sheet for breakdown — Sheet REMOVED in I-4.2 because the new `/payout` page is the richer review surface. Tap target swaps to `router.push('/payout')`. |
| ProgressMeter | I-3 | I-4 (banner-wingz-hero on detail when applicable), I-6 |
| TierBadge | I-6 | I-7 (leaderboard rows), I-3 (dashboard tier badge) |
| AchievementUnlockDialog | I-8 | (Dashboard) |

---

## Step Specs

### Step 0: Setup

**Goal:** v0 reads `PROTOTYPE-BIBLE.md` and this file, confirms understanding of scope, build plan, component inventory, data schema, the variant-toggle pattern, and the program-level bonus model.

**Test Flows After This Step:**
- [ ] v0 returns a confirmation summarizing scope, plan, components, schema, variant pattern, and the program-level bonus rule
- [ ] v0 confirms it has read `references/screenshots/README.md` and knows the by-step folder convention
- [ ] No code generated yet

---

### Step I-0a: Shell Replication — Scaffold + List Surfaces

**Goal:** Stand up the app layout (Header + BottomNav + routing) AND replicate the four list/dashboard surfaces (Dashboard, Requests, My Rides, Ride History). Build the shared `RideCard` component once and reuse it across all four. NO incentive UI yet, NO ride detail screens yet (those come in I-0b).

**Reference screenshots:** `references/screenshots/by-step/i-0a/`
- `01a - Dashboard - This Month.png`
- `01b - Dashboard - Last Month.png`
- `01c - Dashboard - Scrolled.png`
- `02a - Requests - Single Legs Allowed Pill.png`
- `02b - Requests - Will-Call Pill.png`
- `03a - My Rides - Needs Action Tab.png`
- `07 - Ride History.png`

**What to build:**

**Scaffold:**
- Mobile-first portrait layout (375×812 viewport baseline).
- `Header` composite (sticky top, **WHITE background `#FFFFFF`**, **dark text title** `~#1F2937` centered, top-left red Wingz "W" tile, top-right icons per surface in dark gray — see BIBLE Header section. **Do NOT render the header with a dark/navy background — that's a known v0 regression.**).
- `BottomNav` composite (sticky bottom, **WHITE background `#FFFFFF`** with faint top hairline border `~#E5E7EB`, 5 tabs in order: `Home` / `Requests` / `Planner` / `My Rides` / `Options`. Active tab = teal/green icon + green label; inactive = dark gray icon, no label color shift. **Do NOT render the nav with a dark/navy background — that's a known v0 regression.**).
- Routing (Next.js App Router): `/` (Home) → `/requests` → `/my-rides` → `/planner` (placeholder shell — title only) → `/options` (placeholder shell — title only) → `/ride-history` (stack-pushed; no bottom nav).

**Shared `RideCard` composite (built ONCE, reused 4× across list surfaces):**
- White rounded card (~12px radius, ~16px padding, subtle 1px shadow).
- Vertical sections: date line → rider/client lines → leg time-anchor block (colored circle: black/yellow/blue/green per BIBLE) → addresses → revenue (top-right; **green** for upcoming, **blue** for completed) → notes line → bottom pill row (variable: green/orange/yellow/gray/red per state).
- Props drive variations: `revenueColor` (green/blue), `pills[]` (array of pill configs), `timeAnchor` (color + label), `onTap` → for now, console.log only (detail navigation wires up in I-0b).

**Four list surfaces (replicate per reference screenshots):**

- **Home / Dashboard** (`/`) — replicate slots 01a/01b/01c. Stacked sections: Earnings card (with `<` `>` chevron toggle for This Month / Last Month) → Confirm Your Upcoming Trip prompt (green-tinted) → New Requests preview (using `RideCard`) → Next Accepted Ride section (using `RideCard`).
- **Requests** (`/requests`) — replicate slots 02a/02b. Funnel + refresh icons in header. List of `RideCard` instances. Mix the seed data so both green-pill (Single Legs Allowed) and yellow-pill (Wait For Call) variants render.
- **My Rides** (`/my-rides`) — replicate slot 03a. Tab row directly under header: `In Progress` / `Needs Action` (default active) / `Upcoming` — use `Tabs` from `@/components/ui/tabs`. List of `RideCard` instances with red `Not Confirmed` pill on Needs Action cards.
- **Ride History** (`/ride-history`) — replicate slot 07. Stack-pushed: `<` back chevron + `Ride History` title + filter+refresh icons. NO bottom nav. List of `RideCard` instances with **blue** revenue color, blue county tags, no bottom pill.
- **Other tabs (Planner, Options)** — placeholder shells (title only).

**Filter modal (slot 11) — defer to I-5.** I-0a includes the filter funnel icon in the Requests header but tapping it does nothing yet (or shows a toast "Filter coming in I-5"). Building the modal in I-5 keeps I-0a focused.

**Constraints:**
- Do NOT build any ride detail screens — those are I-0b. Tapping a `RideCard` should console.log only.
- Do NOT add any incentive UI. That comes in I-2 onward.
- Do NOT redesign — replicate from reference screenshots + observed styling in BIBLE.
- Do NOT add accept/decline/start-trip/end-trip buttons.
- Apply observed styling from BIBLE (pill family colors, time-anchor circles, blue-revenue for history, etc.).

**Test Flows After This Step:**
- [ ] Header + BottomNav present on Home / Requests / My Rides; absent on Ride History
- [ ] **Header has WHITE background with dark title** (NOT dark/navy background)
- [ ] **Bottom nav has WHITE background** with faint top border (NOT dark/navy background)
- [ ] Bottom nav tabs in correct order (Home / Requests / Planner / My Rides / Options)
- [ ] Active tab visually distinct (teal/green icon + green label on white bg)
- [ ] Home renders Earnings card (with chevron toggle), prompt, New Requests, Next Accepted Ride sections
- [ ] Earnings chevrons toggle between This Month / Last Month
- [ ] Requests list renders ride cards with mixed pill colors (green Single Legs, yellow Wait For Call, orange/gray expiration pills)
- [ ] My Rides has 3-tab row with Needs Action default; cards show red `Not Confirmed` pill on that tab
- [ ] Ride History renders with **blue** revenue color and no bottom pills
- [ ] Mobile portrait 375×812 viewport, no horizontal overflow
- [ ] No incentive UI, no action buttons, no detail screens

---

### Step I-0b: Shell Replication — Ride Details (both states merged)

**Goal:** Build the Ride Details screen with the shared trip-detail body (map + metadata + leg cards), then swap the bottom region per state — Before Taken (swipe footer) and Needs Action / In Progress (amber alert + action toolbar + sticky red CTA). Wire the two required nav paths.

**Reference screenshots:** `references/screenshots/by-step/i-0b/`
- `04a - Ride Details - Before Taken - Top.png`
- `04b - Ride Details - Before Taken - Scrolled.png`
- `05a - Ride Details - Needs Action - Top.png`
- `05b - Ride Details - Needs Action - Scrolled.png`

**What to build:**

**Shared `RideDetailLayout` composite:**
- Header: WHITE background, `<` back chevron + bold ride ID (dark text) + state subtitle (`Will-Call Ride` for Before Taken; `- Accepted Ride` for Needs Action). Top-right `Variants` pill button per I-1 (added in I-1, not here — but leave header room).
- Optional alert region (only renders when `state="needs-action"`): amber soft-fill card with ⚠️ icon, "Confirmation required" title, body "This ride has not been confirmed yet. Please call the ride client first." Use observed amber tokens from BIBLE.
- Map preview region (~30% screen height; OSM iframe or static placeholder image — NO live map SDK).
- **Trip metadata card** — single white rounded card (~12px radius, ~16px padding) sitting **CLEANLY BELOW** the map with vertical gap. The card MUST NOT overlap the map's bottom edge or float over it. Card contents stacked vertically:
  - `When: <full date>` line (bold value)
  - `Rider: <NAME>` line (bold value)
  - `Client: <Client>` line with the small leaf/branding icon on the right
  - `Leg: <leg-id>` line — **the Leg ID lives INSIDE this metadata card** (NOT extracted out as a heading above the leg cards)
  - Top-right of card: passenger count icon + revenue dollar amount in green + small `(i)` info icon
  - **v0 regression guard:** Earlier output rendered this card as a small floating element overlapping the map bottom and pulled "Leg:" out of the card. Both are wrong. Card sits cleanly below map; Leg ID stays inside.
- Leg cards (one per leg, stacked below the metadata card): time anchor circle (per BIBLE palette), bold time, per-leg revenue, addresses, county/city line.
- Notes line + expiration pill (gray "Expires in N days") OR red `Not Confirmed` pill (only on Needs Action).
- Bottom region (swapped by state):
  - `state="before-taken"`: sticky two-action swipe footer — pink/coral "Swipe to Reject" ↔ green "Swipe to Accept". Visually rendered, NOT functional.
  - `state="needs-action"`: action toolbar (4 small green-outline circular icon buttons: Reply / Phone / SMS / More label on rightmost) + sticky full-width red/coral CTA "I REACHED OUT TO CONFIRM" with "A Leg" sub-label and white phone icon. Visually rendered, NOT functional.

**Routing + nav paths:**
1. Tap any `RideCard` on `/requests` → `/requests/[id]` → `RideDetailLayout` with `state="before-taken"`. Back chevron returns to `/requests`.
2. Tap any `RideCard` on `/my-rides` Needs Action tab → `/my-rides/[id]` → `RideDetailLayout` with `state="needs-action"`. Back chevron returns to `/my-rides`.

Bottom nav is HIDDEN on detail screens (sticky footer overlays).

**Constraints:**
- Do NOT make the swipe footer or red CTA functional. Render visually only.
- Do NOT add an "in-progress / on-route" state — Needs Action IS the canonical after-taken state.
- Do NOT add any incentive UI yet. That comes in I-2 / I-3 / I-4.
- Map preview is a placeholder image OR an OSM iframe — do NOT integrate live map SDK.
- Apply observed styling from BIBLE.

**Test Flows After This Step:**
- [ ] Tapping a Requests card → Ride Details with Before Taken state (swipe footer rendered)
- [ ] Tapping a My Rides Needs Action card → Ride Details with Needs Action state (amber alert + action toolbar + sticky red CTA)
- [ ] Both states share the trip-detail body (map + metadata card + leg cards)
- [ ] **Header on detail screens has WHITE background with dark ride ID + subtitle** (NOT dark/navy)
- [ ] **Trip metadata card sits cleanly BELOW the map with gap (no overlap), and contains all four lines including `Leg:` INSIDE the card** (NOT extracted as a separate heading)
- [ ] Bottom nav HIDDEN on both detail states; sticky footers overlay
- [ ] Back chevron returns to the originating list (Requests vs My Rides)
- [ ] Time anchors render with correct color circles (yellow / blue / green / black per BIBLE)
- [ ] Notes line + expiration pill / Not Confirmed pill render per state
- [ ] No incentive UI, no functional accept/decline/start/end actions
- [ ] Swipe footer and red CTA are visually rendered but DO NOT trigger any flow

---

### Step I-0.5: Schema + Seed Data

**Goal:** Create `lib/data/incentives.ts` and `lib/variants.ts` with all TypeScript types and seed data. Bonus model is **PROGRAM-LEVEL** — Trip carries `incentiveTypes` only; `IncentiveDefinition` holds the bonus + threshold.

**What to build:**

#### `lib/data/incentives.ts`

```ts
export type IncentiveType = 'short-notice' | 'short-distance' | 'door-to-door' | 'standing-order';
export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum';
export type TripStatus = 'available' | 'assigned' | 'in-progress' | 'completed' | 'cancelled';
export type Period = 'weekly' | 'biweekly' | 'monthly';
export type PeriodStatus = 'active' | 'ended' | 'upcoming';

export interface IncentiveDefinition {
  type: IncentiveType;
  label: string;                 // human-readable: "Short Notice", "Door to Door", etc.
  description: string;
  targetCount: number;           // trips needed to earn the bonus
  bonusAmount: number;           // dollars paid when targetCount is reached (PROGRAM-LEVEL)
  window: Period;
  eligibilityHint: string;       // short copy describing eligibility
}

export interface DriverIncentiveProgress {
  type: IncentiveType;
  completedCount: number;
  assignedCount: number;         // trips assigned that count toward this program (not yet completed)
  targetCount: number;
  earnedThisPeriod: boolean;     // true once completedCount >= targetCount; locks the bonus into Upcoming Payout
}

export interface Trip {
  id: string;
  pickupTime: string;            // ISO timestamp
  pickupAddress: string;
  dropoffAddress: string;
  status: TripStatus;
  estimatedMiles: number;
  client: string;
  market: string;
  revenue: number;               // dollars (existing trip revenue — green for upcoming, blue for completed)
  incentiveTypes: IncentiveType[];     // 0 or more — the programs this trip counts toward
  clientEnrolledInIncentives: boolean; // for I-8 ineligible-market state
}
// NOTE: Trip does NOT carry per-trip bonus dollars. Bonuses live on IncentiveDefinition.bonusAmount and pay out only when DriverIncentiveProgress.completedCount reaches targetCount.

export interface LeaderboardEntry {
  rank: number;
  handle: string;                // anonymized, e.g., "Driver-7821"
  bonusesEarned: number;         // sum of program bonuses earned this period
  isCurrentDriver: boolean;
  tier: Tier;
}

export interface TierConfig {
  tier: Tier;
  label: string;
  threshold: number;             // incentives accomplished in period to enter tier
  multiplier: number;            // applied to projected dashboard bonus
  badgeColor: string;            // hex
}

export interface CurrentDriver {
  id: string;
  displayName: string;
  initials: string;
  currentTier: Tier;
  incentivesAccomplishedThisPeriod: number;
  totalBonusesEarnedThisPeriod: number;
}

export interface DashboardData {
  currentPeriodStatus: PeriodStatus;
  currentPeriodLabel: string;    // "Apr 22 – Apr 28"
  baseEarnings: number;          // earnings before bonuses
  bonusesEarned: number;         // sum of bonusAmount for completed programs this period
  nextPayoutDate: string;        // ISO date — Mon following the current week
}
```

**Seed Data Coverage:**

- 4 `IncentiveDefinition` entries with realistic targets/bonuses/windows:
  - Short Notice — `targetCount: 5`, `bonusAmount: 8`
  - Short Distance — `targetCount: 10`, `bonusAmount: 15`
  - Door to Door — `targetCount: 3`, `bonusAmount: 15`
  - Standing Order — `targetCount: 2`, `bonusAmount: 25`
- 4 `DriverIncentiveProgress` entries with mixed states (one complete, one partial, one barely-started, one just-finished).
- 12 `Trip` entries:
  - 5 in Requests feed (status `available`) — 3 with single incentive, 1 with multi-incentive (short-notice + short-distance), 1 with no incentive (control).
  - 4 in My Rides Needs Action / Upcoming (status `assigned` or `in-progress`) — 2 with single incentive, 1 multi-incentive, 1 no-incentive (control).
  - 3 in Ride History (status `completed`) — mix with and without incentives.
- 10 `LeaderboardEntry` entries with current driver `Driver-7821` at rank #4.
- 4 `TierConfig` entries (Bronze threshold 0 mult 1.00, Silver 5 mult 1.10, Gold 10 mult 1.25, Platinum 20 mult 1.50).
- 1 `CurrentDriver` (Alex B., AB, Silver tier, 7 accomplished, $310 earned).
- 1 `DashboardData` (active period, "Apr 22 – Apr 28" label).

#### `lib/variants.ts`

```ts
export type PillVariant = 'pill-named-bottom' | 'badge-corner-flag' | 'banner-wingz-hero';
export type DashboardVariant = 'dashboard-banner' | 'dashboard-card-section' | 'dashboard-widget-integrated';
// NOTE: There is NO DetailVariant. Ride Details inherits the active PillVariant from useVariants().pill —
// the same surface treatment renders on the ride card AND the ride detail screen, with placement adapted per surface.

export interface VariantSelection {
  pill: PillVariant;
  dashboard: DashboardVariant;
}

export const DEFAULT_VARIANTS: VariantSelection = {
  pill: 'pill-named-bottom',
  dashboard: 'dashboard-card-section',
};

export const VARIANT_LABELS = {
  pill: {
    'pill-named-bottom': 'Named pill in bottom row (with small Wingz mark)',
    'badge-corner-flag': 'Corner flag — green Wingz on black square (top-right, tooltip)',
    'banner-wingz-hero': 'Full Wingz banner — black + green at top of card',
  },
  dashboard: {
    'dashboard-banner': 'Hero banner',
    'dashboard-card-section': 'Dedicated card section',
    'dashboard-widget-integrated': 'Integrated into existing earnings widget',
  },
} as const;
```

**Constraints:**
- Use ISO date strings.
- Money fields are integers (dollars).
- No rider PII or real addresses.
- DO NOT inline data anywhere else — all data + variant constants come from these two files.

**Test Flows After This Step:**
- [ ] `lib/data/incentives.ts` exports all types and arrays
- [ ] `lib/variants.ts` exports `PillVariant`, `DashboardVariant`, `VariantSelection` (only `pill` + `dashboard`), `DEFAULT_VARIANTS`, `VARIANT_LABELS`
- [ ] **NO `DetailVariant` type** — Ride Details inherits `useVariants().pill`
- [ ] Trip type does NOT carry per-trip bonus fields (no `incentiveBonus`, no `bonusReason`)
- [ ] Zero TypeScript errors

---

### Step I-1: Variant Toggle Infrastructure

**Goal:** Build the global Variant Toggle that lets stakeholders switch between named UI variants per surface during review.

**What to build:**
- Floating "Variants" pill button fixed top-right of every screen, primary `#10B981` background, white text, small.
- Tap → `Sheet` (right slide-in on tablet, bottom sheet on mobile) titled "Compare Variants".
- Sheet contents: **2 sections** (Pill / Badge / Banner, Dashboard) — each with a `RadioGroup` of variants from `VARIANT_LABELS`. NO Ride Detail Callout section — ride details inherit the active pill variant.
- Selection persists to:
  - `localStorage` (key `driver-incentives-variants`)
  - URL query params (e.g., `?pill=banner-wingz-hero&dashboard=banner`)
- URL params take precedence over localStorage on initial load.
- Default values come from `DEFAULT_VARIANTS`.
- "Reset to Defaults" button clears URL + localStorage.
- Variant state exposed via React Context + `useVariants()` hook so components read without prop-drilling.
- Variant changes update UI immediately, no reload.

**Constraints:**
- Do NOT add other settings to the Sheet (no theme switcher, no language picker). Variants only.
- The toggle is dev-mode-visible (always shown in this prototype). Production wiring is OUT OF SCOPE.
- Variant changes do NOT trigger URL navigation; they only update query params on the current URL.
- The Variants Sheet must NOT break the underlying screen layout — pure overlay.
- The Sheet has exactly TWO sections — do NOT add a third "detail" section.

**Test Flows After This Step:**
- [ ] Variants pill is visible on every screen
- [ ] Tap → Sheet opens with **2 variant sections** (Pill/Badge/Banner, Dashboard) — NO ride detail section
- [ ] Selecting a variant updates URL and localStorage
- [ ] Reload preserves selection
- [ ] Pasting a URL with `?pill=banner-wingz-hero` initializes with that variant
- [ ] Reset to Defaults clears persisted state

---

### Step I-2: Pill / Badge / Banner on Ride Card — Variant Set + Trip Contribution Popover

> **Forward-looking note (added 2026-05-01):** This step ships as approved with `pill-named-bottom` / `badge-corner-flag` / `banner-wingz-hero`. **In I-4.2** several pieces will be revised:
> - `badge-corner-flag` retired; replaced by `achievement-banner` (full banner color = program's `tierLevel`).
> - `banner-wingz-hero` refined: black banner with the Wingz mark backdrop tinted by program's `tierLevel`.
> - Multi-program rendering dropped everywhere — banner shows ONE program's name + ONE Earn $X (no joined `<Name A> · <Name B>` labels, no summed Earn $X).
> - `Trip.incentiveTypes: IncentiveType[]` schema becomes `Trip.incentiveType: IncentiveType | null` (singular).
> - The `ProgramContributionIndicator` popover shows ONE program (no multi-program list).
>
> Build I-2 normally with the existing 3 variants and multi-program logic; I-4.2 handles the rework on top.

**Goal:** Add 3 named, fun, eye-catching variants for surfacing incentive eligibility on ride cards in Requests + My Rides + Ride History (variant set), AND a single-design `ProgramContributionIndicator` (Tooltip + Popover) layered on all 3 variants so a driver tapping the surface sees program progress + program-level bonus. Stakeholders compare visual variants AND their interaction in one review. **NO dollar amount on any pill/badge/banner surface itself** — bonuses are program-level (see BIBLE → "What NOT to Build" #3); the bonus dollar value appears ONLY inside the popover/tooltip.

**Reference screenshots:** `references/screenshots/by-step/i-2/` (02a, 02b, 03a — capture the existing pill family that the new surfaces extend AND the top-right corner of the card where the badge variant goes).

**Wingz logo asset:** `/WINGZLOGO2.png` at the repo root. The green Wingz mark on a black background is the brand identity for the badge + banner variants.

**What to build:**

#### Part 1 — `IncentiveBadgeRenderer` (variant-set, 3 variants)

Renders ONE of three variants per the active `pill` variant selection:

- **`pill-named-bottom`** — pill in the existing **bottom pill row** alongside `Single Legs Allowed` / `Expires in N`. Label = `<Incentive Name> Trip` (e.g., `Short Notice Trip`, `Door to Door Trip`). Inside the pill, a small **black-and-green Wingz mark** (~14×14px) sits LEFT of the label. Background tint = soft incentive color (`[EXTENDED: incentive-pill-*]`); text = dark for contrast.

- **`badge-corner-flag`** — top-right corner of the ride card. Square (~28×28px) with **black background (`#1F2937`) + green Wingz logo (~`#10B981`)**. Icon-only, no label. Tap/hover triggers the contribution Tooltip (see Part 2). Designed as a "flag" — high contrast against the white card. Position carefully so it does NOT obscure the existing top-right ↗ expand arrow.

- **`banner-wingz-hero`** — full-width banner at the **top of the card**. **Black background + green Wingz mark (LEFT) + "<Incentive Name> Trip" in white** (≈14px). Most prominent variant — celebratory, NOT a warning. The banner is taller than the other variants (~64–80px) because it carries:
  - Top row: program name(s) on the LEFT (multi-program: `<Name A> Trip · <Name B> Trip`); right-aligned **program-level total reward** in green (e.g., `Earn $50` for single, `Earn $150` for combined multi-program). This dollar figure is the program-level reward at completion — NOT a per-trip bonus — and is paired with the progress bar below to make the framing unambiguous.
  - Bottom row: a thin progress bar with verbose labels (e.g., `5 done +2 taken · 1 to go`).
  - Color states: black (default / available), amber tint (in-progress), gray-tint (completed/historical on Ride History).
  - Tap reveals the contribution Popover (Part 2) for full per-program breakdown.
  - Must NOT push the date row off-screen on a 375×812 viewport — banner has a hard upper bound (~80px).

Apply the active variant to ride cards in:
- Requests tab
- My Rides (Needs Action and Upcoming sub-tabs)
- Ride History tab (use a **muted/desaturated** version since these trips are completed)

**Multi-incentive trips:**
- `pill-named-bottom`: render multiple pills in the bottom row, one per incentive (wraps to second row if needed)
- `badge-corner-flag`: numeric overlay on the badge ("2") + tooltip lists all programs
- `banner-wingz-hero`: single banner with names separated by `·` (e.g., "Short Notice Trip · Door to Door Trip")

**No-incentive trips** show NO pill/badge/banner in any variant.

Source the trip's `incentiveTypes` from `lib/data/incentives.ts`. Read variant from `useVariants().pill`. Render the Wingz logo via Next.js `<Image>` from the repo-root logo file.

#### Part 2 — `ProgramContributionIndicator` (single-design, layered on all 3 variants)

Wraps `IncentiveBadgeRenderer` so all 3 variants surface program-contribution context on tap/hover. Single design — does NOT participate in the variant toggle.

- **For `pill-named-bottom`**: pill is tappable → opens a `Popover` (Tooltip on hover for tablet) showing program progress + program-level bonus.
- **For `badge-corner-flag`**: the Tooltip shows program progress + bonus value (richer than a basic "Counts toward X" label).
- **For `banner-wingz-hero`**: the verbose progress bar in the banner already shows the high-level state (`5 done +2 taken · 1 to go`); tap reveals the Popover for the full per-program breakdown (one line per applicable program with progress + program-level bonus).

Source progress data from `DriverIncentiveProgress` (matched by `IncentiveType` to the trip's `incentiveTypes`).

**Single-incentive trip popover content:**
```
Counts toward Short Notice — 3/5 trips · Earn $8 when complete
```

**Multi-incentive trip popover** (one line per applicable program):
```
✦ Short Notice — 3/5 trips · Earn $8 when complete
✦ Door to Door — 1/3 trips · Earn $15 when complete
```

**Completed-program line** (driver hit threshold this period):
```
✓ Short Notice — Completed · $8 added to next payout
```

**Ineligible client** (`clientEnrolledInIncentives === false`): NO contribution indicator renders even if the trip has `incentiveTypes`. Full state polished in I-8.

**Constraints:**
- **NO dollar amount on `pill-named-bottom` (the pill itself) or `badge-corner-flag` (the badge itself).** Per-trip dollar framing is misleading and forbidden on those two surfaces — dollar values appear ONLY inside the popover/tooltip for them.
- **`banner-wingz-hero` IS allowed to show a program-level total** (e.g., `Earn $150`) on the banner — but ONLY when paired with the progress bar (`N done +M taken · K to go`) so the framing is unambiguously program-level, not per-trip.
- Do NOT replace the existing bottom pill row (Single Legs Allowed / Expires in N / Wait For Call / Not Confirmed). The new surfaces are ADDED, never replacing existing pills.
- Do NOT redesign the ride card.
- Do NOT introduce a new pill data model. Surfaces derive from `trip.incentiveTypes: IncentiveType[]`.
- For `badge-corner-flag`: must NOT obscure the existing top-right ↗ expand arrow. Either offset the badge or shift the arrow inward.
- For `banner-wingz-hero`: must NOT push the date row off-screen on a 375×812 viewport.
- Each variant must look visually distinct — stakeholders should tell them apart at a glance.
- `ProgramContributionIndicator` is single design — does NOT participate in the variant toggle. Do NOT add a `useVariants().contribution` field.
- Progress numbers come from `DriverIncentiveProgress.completedCount` / `targetCount` — do NOT compute on device.
- If a trip has no matching `DriverIncentiveProgress` entry (edge case), don't crash — render the popover with progress "0/<target>".

**Design tokens:**
- For `pill-named-bottom`: use `[EXTENDED: incentive-pill-*]` tokens for the soft background tint (short-notice `#F59E0B`, short-distance `#3B82F6`, door-to-door `#8B5CF6`, standing-order `#10B981`). Text dark for contrast.
- For `badge-corner-flag` AND `banner-wingz-hero`: use the Wingz **black + green** palette ONLY (`#1F2937` background, `#10B981` Wingz logo, white label text on the banner). Do NOT use per-incentive colors here — keep brand consistency.
- Popover/Tooltip styling = template defaults (white surface, soft shadow, ~8px radius). Inside:
  - Incentive name color: dark text
  - Progress fraction (e.g., "3/5"): bold black
  - Bonus amount: `[EXTENDED: bonus-revenue-accent ~#10B981]`, prefixed with `$`
  - Completed-program checkmark: green `✓` glyph (`#10B981`)
  - ✦ bullet for in-progress programs

**Backend Implications (capture only):**
- Backend computes `DriverIncentiveProgress` per driver per period.
- Driver App reads computed values; never recomputes locally.
- Stacking rules (multi-incentive trip qualifying for multiple programs) — for prototype, treat each program independently.

**Test Flows After This Step:**
- [ ] All 3 variants render correctly via the toggle
- [ ] `pill-named-bottom`: pill sits inline with existing bottom pills; small black/green Wingz mark visible inside; tap opens Popover with progress + program-level bonus
- [ ] `badge-corner-flag`: green Wingz on black square top-right; doesn't obscure existing card content; hover/tap shows Tooltip with progress + bonus value
- [ ] `banner-wingz-hero`: black + green banner top of card with white "<Incentive Name> Trip" label, right-aligned program-level "Earn $X", and progress bar with `N done +M taken · K to go` labels. Doesn't push date row off-screen. Tap opens Popover with per-program breakdown.
- [ ] Single-incentive trips show 1 surface in each variant
- [ ] Multi-incentive trips: multiple pills (named-bottom), numeric overlay (corner-flag), name-list separator (banner-hero); popover lists each program independently
- [ ] No-incentive trips show no surface in any variant
- [ ] Completed-program line reads "✓ <Name> — Completed · $X added to next payout"
- [ ] Ineligible-client trips don't render the contribution indicator
- [ ] NO dollar amount on `pill-named-bottom` pill itself or `badge-corner-flag` badge itself (only inside popover/tooltip for those two)
- [ ] `banner-wingz-hero` IS allowed to show program-level "Earn $X" alongside the progress bar (program-level framing, unambiguous)
- [ ] Existing trip status pills (Single Legs Allowed, Expires in N, Wait For Call, Not Confirmed) unchanged
- [ ] Surfaces persist correctly across Requests, My Rides, Ride History (muted on completed)

---

### Step I-3: Dashboard Incentive Surfacing — Variant Set + Deep-Link + Upcoming Payout Widget

**Goal:** Add (a) 2–3 named dashboard surfacing variants that show driver incentive progress on the existing Dashboard, with deep-link tap → Requests with filter pre-applied, AND (b) a single-design **Upcoming Payout widget** that displays projected weekly payout including completed-program bonuses.

> **Forward-looking note (added 2026-05-01, refined later same day):** This step is approved as-is, but pieces will be reworked in later steps:
> - **In I-4.1**: the `dashboard-card-section` variant's 4-stacked-cards layout becomes a swipe carousel; "View All" link added to all dashboard variants; new `/incentives` tabbed hub page added (Incentives / Leaderboard / Tier Progress).
> - **In I-4.2**: the Sheet popup on `UpcomingPayoutWidget` is REMOVED. Widget stays on dashboard for at-a-glance context but tap target swaps from "open Sheet" to `router.push('/payout')`. New `/payout` page becomes the richer review surface.
> - The widget DOES NOT move to `/incentives` (earlier 2026-05-01 plan reversed). It stays on Dashboard.
> Build I-3 normally; I-4.1 + I-4.2 handle the reworks on top.

**Reference screenshots:** `references/screenshots/by-step/i-3/` (01a, 01c — Home default + scrolled views show where the variants slot into the existing dashboard stack and where UpcomingPayoutWidget sits).

**What to build:**

**Part 1 — `DashboardIncentiveSection` (variant-set):**

Renders ONE of three variants per the active `dashboard` variant selection:

- **`dashboard-banner`** — hero banner card at the TOP of Dashboard (above existing widgets). "Driver Incentives — $X potential bonuses this period" headline + horizontal scroll row of mini-cards (one per active program) with progress bars + program-level bonus amount ("$8 when you complete 5"). Each mini-card is tappable.
- **`dashboard-card-section`** — full-width section in the MIDDLE of Dashboard (below top widgets, above other sections). Section title "Driver Incentives" + 4 stacked `IncentiveCard` rows — each shows incentive title, ProgressMeter (`completed/target`), program-level bonus ("Earn $8 when complete"), current contribution status. Each card is tappable.
- **`dashboard-widget-integrated`** — incentive data integrated into the existing earnings/revenue widget. The widget shows "Earnings: $X (potential +$Y in bonuses)" + small per-program chips below — each chip shows program name + progress (e.g., "Short Notice 3/5"). Tapping a chip deep-links.

**Part 2 — `UpcomingPayoutWidget` (single-design, no variants):**

A new dashboard section, rendered below the existing earnings card and above the New Requests preview. Single design, always visible (no toggle).

- Section title: "Upcoming Payout"
- Sub-label: "Next payout: <Mon, May 4>" (computed from `DashboardData.nextPayoutDate`).
- Anchor id: `#upcoming-payout` (used by Achievement Unlock Dialog "View Earnings" CTA in I-8).
- Headline: large bold dollar amount = `baseEarnings + bonusesEarned` in green.
- Breakdown row: "Base $XXX.XX · Bonuses $YY.YY" with the bonus portion in `[EXTENDED: bonus-revenue-accent ~#10B981]` (bold or "+" prefix).
- Tappable → opens a `Sheet` (or expands inline) showing per-PROGRAM breakdown:
  - "✓ Short Notice — Completed (5/5) · +$8"
  - "✓ Door to Door — Completed (3/3) · +$15"
  - "Standing Order — In progress (1/2) · $0 (earned when complete)"
  - Each line: incentive name + status + program-level bonus.
- Empty state: when no programs are complete, show "No bonuses earned yet this week. Complete an incentive program to earn one."
- READ-ONLY — no "Cash out" or "Withdraw" buttons.

**Deep-Link behavior (CRITICAL):**
- Tapping any incentive card / chip / mini-card in `DashboardIncentiveSection` navigates to `/requests?incentive=<type>`.
- The `<type>` is the IncentiveType the user tapped (`short-notice`, `short-distance`, etc.).
- I-5 (Filter step) reads this query param on mount and applies the filter automatically.
- A small chip near the filter row in Requests shows "Filtered from Dashboard: <Type>" with an X to clear.
- Tapping `UpcomingPayoutWidget` does NOT deep-link to filter — it expands the breakdown sheet (in-place, on dashboard).

**Constraints:**
- Do NOT remove or restyle existing dashboard widgets. The variants ADD a section.
- For `dashboard-widget-integrated`: integrate WITH the existing earnings widget by augmenting it; do NOT replace the widget.
- Read variant from `useVariants().dashboard`.
- Use `IncentiveBadgeRenderer` from I-2 (active pill variant) for incentive type indicators on dashboard cards/chips.
- Do NOT add a separate "Incentives" page or route — dashboard cards are the canonical entry point.
- `UpcomingPayoutWidget` is single-design — does NOT participate in the variant toggle.
- NO per-trip bonus dollar amounts. Bonus is shown ONCE per program.
- Treat `CurrentDriver.currentTier`'s multiplier as 1.0 in this step (Bronze default in seed) — the visible "tier boost applied" caption is added in I-6 once tier UI is built. Projected bonus formula = `bonusAmount × min(assignedCount, targetCount) × tierMultiplier`; with multiplier 1.0, the displayed numbers are unaffected and don't need to be reworked when I-6 ships.

**Backend Implications (capture only):**
- Backend computes weekly payout window (Mon–Sun cutoff assumed; confirm in Working Plan).
- `bonusesEarned` is the sum of `IncentiveDefinition.bonusAmount` for each program the driver has completed (hit `targetCount`) in the current payout window. NOT a per-trip sum.
- Period rollover: at week close, earned resets to 0; "Next payout" date advances; programs reset their progress.
- Driver App reads computed values; never recomputes locally.

**Test Flows After This Step:**
- [ ] All 3 dashboard surfacing variants render correctly via the toggle
- [ ] Tapping an incentive card/chip navigates to `/requests?incentive=<type>`
- [ ] Each variant clearly shows program progress + program-level bonus amount (one bonus number per program, NOT per trip)
- [ ] No-incentive states (none active) show "No active incentives this period."
- [ ] Existing dashboard widgets unchanged in `dashboard-banner` and `dashboard-card-section`
- [ ] In `dashboard-widget-integrated`, the existing earnings widget shows the integration cleanly
- [ ] `UpcomingPayoutWidget` renders below the earnings card with bold $ amount + base/bonus breakdown; anchor id `#upcoming-payout` set
- [ ] Tapping `UpcomingPayoutWidget` opens the per-PROGRAM breakdown sheet (only completed programs contribute to total)
- [ ] Empty state (no completed programs) shows the placeholder copy
- [ ] No payout-action buttons present on the widget

---

### Step I-4: Ride Details Incentive Surfacing — Single-Design Extension of I-2 + Regression Fixes

**Goal:** Extend the active I-2 surface (whichever pill/badge/banner variant is selected via `useVariants().pill`) to the Ride Details screens — Before Taken AND Needs Action / In Progress. **Single design — NO separate variant set, NO `RideDetailIncentiveCallout` composite, NO `useVariants().detail`.** Same visual treatment used on the ride card, with placement adapted per surface.

**Plus: fix three inherited regressions from earlier steps that v0 got wrong on the first pass:** (1) Header background on detail (and all screens) should be WHITE, not dark/navy. (2) Bottom nav background should be WHITE, not dark/navy. (3) Trip metadata card on Ride Details must sit cleanly BELOW the map (no overlap), and contain `When / Rider / Client / Leg` all four lines INSIDE the card.

**Reference screenshots:** `references/screenshots/by-step/i-4/` (04a, 04b, 05a, 05b — both detail states with their distinct footers).

**What to build:**

#### Part 1 — Regression Fixes (do this BEFORE the incentive work)

1. **Header background** on every screen → WHITE (`#FFFFFF`), title text dark (`~#1F2937`). Currently rendered as dark navy on all screens — this is wrong per the canonical references. See BIBLE → Header section.
2. **Bottom nav background** → WHITE (`#FFFFFF`) with faint top hairline border. Currently rendered as dark navy. Active tab uses green icon + green label on white bg. See BIBLE → Bottom Nav section.
3. **Trip metadata card** on Ride Details → must sit cleanly BELOW the map preview with vertical gap (no overlap, no floating). Card contents stacked: `When` / `Rider` / `Client` / `Leg` (Leg ID lives INSIDE the card, NOT extracted as a heading above the leg cards). See BIBLE → Ride Details — Before Taken section.

#### Part 2 — Extend I-2 surfaces to Ride Details

Use the same `IncentiveBadgeRenderer` and `ProgramContributionIndicator` from I-2. Read `useVariants().pill` and render the matching surface on the detail screen with placement adapted per variant:

- **`pill-named-bottom` active** → render the named pill(s) **below the trip metadata card**, in a horizontal row (mirrors how the bottom pill row sits on a ride card). Multi-incentive trips render multiple pills, one per program. Tap → opens the contribution Popover (same component as I-2).

- **`badge-corner-flag` active** → render the badge in the **top-right corner of the trip metadata card** (same anatomy as on the ride card, just on the metadata card instead of the ride card). Multi-incentive trips: numeric overlay on the badge ("2"). Hover/tap → contribution Tooltip with progress + bonus.

- **`banner-wingz-hero` active** → render the full banner **above the trip metadata card** (between the map and the metadata card on Before Taken; between the amber "Confirmation required" alert and the metadata card on Needs Action). Same anatomy as the ride card banner: program name(s) on left + "Earn $X" right-aligned + progress bar with verbose labels below. Tap → contribution Popover.

Apply to BOTH detail states:
- Ride Details — Before Taken (slot 04a/04b — sticky pink/green swipe footer must remain visible)
- Ride Details — Needs Action / In Progress (slot 05a/05b — canonical "after-taken" state; amber alert above + sticky red "I REACHED OUT TO CONFIRM" CTA must remain visible)

For multi-incentive trips, treat each program independently (same rule as I-2).

For trips where `clientEnrolledInIncentives === false`, render NO surface on detail (full polish state in I-8).

**Constraints:**

- **Single design — NO variant set.** Do NOT introduce a `useVariants().detail` field. Do NOT create a new `RideDetailIncentiveCallout` composite. Reuse `IncentiveBadgeRenderer` + `ProgramContributionIndicator` from I-2 with detail-specific placement.
- The Variant Toggle Sheet still has exactly TWO sections (pill, dashboard). Do NOT add a detail section.
- Sticky bottom CTAs MUST remain visible across all 3 placement variants on both detail states. The banner-wingz-hero placement adds vertical content — verify on 375×812 that scrolling still reaches the leg cards and the sticky CTA stays sticky.
- Do NOT modify the existing detail screen layout beyond adding the surface in the right spot (and the regression fixes above).
- Do NOT add accept/decline/start/end-trip buttons. Detail screens remain read-only.
- The amber "Confirmation required" alert on Needs Action sits BETWEEN the header and the banner (when banner-wingz-hero is active) — alert always renders first.
- NO per-trip bonus framing anywhere. Same rules as I-2 apply: `pill-named-bottom` and `badge-corner-flag` show no $ on the surface itself; `banner-wingz-hero` is allowed to show program-level "Earn $X" alongside the progress bar.

**Backend Implications (capture only):**
- Trip detail endpoint must include `applicableIncentives` array with progress contribution per incentive.
- `clientEnrolledInIncentives` filters which incentives apply on this specific trip — backend enforces.
- Stacking math (combined multi-program bonus on the banner) — for prototype, sum program-level bonus amounts across the trip's `incentiveTypes`. Backend formalization out of scope here.

**Test Flows After This Step:**

Regression fixes:
- [ ] Header on all screens (Home, Requests, My Rides, Ride History, Ride Details) has WHITE background with dark title text — NOT dark/navy
- [ ] Bottom nav has WHITE background with faint top border — NOT dark/navy
- [ ] Active bottom-nav tab is green icon + green label on white bg
- [ ] Trip metadata card on Ride Details sits cleanly below the map (no overlap), with vertical gap
- [ ] Trip metadata card contains all four lines: When / Rider / Client / Leg (Leg ID INSIDE the card, NOT a separate heading)

Incentive surface extension:
- [ ] When `pill-named-bottom` is active in the toggle: detail shows named pills below the trip metadata card; tap opens contribution Popover
- [ ] When `badge-corner-flag` is active: detail shows badge at top-right of trip metadata card; multi-incentive trip shows numeric overlay; hover/tap shows Tooltip
- [ ] When `banner-wingz-hero` is active: detail shows full banner above the trip metadata card with program names + "Earn $X" + progress bar; tap opens Popover
- [ ] Variant Toggle Sheet still shows ONLY 2 sections (pill, dashboard) — NO detail section
- [ ] Sticky bottom CTAs (pink/green swipe on Before-Taken; red "I REACHED OUT TO CONFIRM" on Needs Action) remain visible across all 3 placements on both states
- [ ] Multi-incentive trips show all programs (multiple pills, badge with numeric overlay, or banner with `·` separator + summed total)
- [ ] No-incentive trips show no surface on detail
- [ ] Ineligible-client trips show no surface on detail (full polish in I-8)
- [ ] No `useVariants().detail` field exists in code
- [ ] No `RideDetailIncentiveCallout` composite exists in code

---

### Step I-4.1: Driver Incentives Hub Page (`/incentives`) + Dashboard Carousel Rework

**Goal:** Reverse the earlier "no standalone Incentives Catalog" decision and consolidate gamification surfaces into a single tabbed hub. Add the new stack-pushed `/incentives` page with three tabs (Incentives default, Leaderboard, Tier Progress — the latter two are placeholder shells until I-7/I-6 fill them). Rework the `dashboard-card-section` variant from a 4-stacked-cards layout into a swipe carousel. Add a "View All" link to every dashboard incentive surfacing variant. **`UpcomingPayoutWidget` STAYS on dashboard** — it does NOT move to `/incentives` (an earlier 2026-05-01 plan to move it was reversed; the widget belongs with at-a-glance dashboard context, and the richer review surface is `/payout` built in I-4.2).

**Reference screenshots:** No new reference screenshots — this step builds on the I-3 dashboard surfacing output and reuses the existing `IncentiveCard` visual.

**What to build:**

#### Part 1 — New `/incentives` page (`IncentivesPage` composite)

- New route at `/incentives` (Next.js App Router under `app/incentives/page.tsx`).
- **Stack-pushed** — bottom nav is HIDDEN on this screen (same pattern as Ride History and Ride Details).
- Header: WHITE background (per BIBLE Header rule), `<` back chevron + bold "Driver Incentives" title centered + top-right Variants pill button.
- Body — Tabs row directly under header using `@/components/ui/tabs`:
  - **Tab 1: "Incentives"** (default active) — full stacked list of `IncentiveCard` rows, one per program in `incentiveDefinitions` seed (4 programs in current seed). Includes BOTH active and completed programs. Each card uses the EXISTING `IncentiveCard` visual from I-3 `dashboard-card-section` (program name pill, optional "Completed" status, bonus amount, description, ProgressMeter, count line, chevron). Each card tappable → `router.push('/requests?incentive=<type>')`.
  - **Tab 2: "Leaderboard"** — placeholder shell in I-4.1: empty container with copy "Leaderboard coming soon" or similar. Filled in **I-7**.
  - **Tab 3: "Tier Progress"** — placeholder shell in I-4.1: empty container with copy "Tier Progress coming soon" or similar. Filled in **I-6**.
- Page background: light gray (`#F9FAFB`, same as dashboard).
- No sticky footer.

#### Part 2 — Rework `dashboard-card-section` variant into swipe carousel (`IncentiveCarousel`)

The other two dashboard variants (`dashboard-banner` mini-card scroll + `dashboard-widget-integrated` chips) stay structurally as-is. Only `dashboard-card-section` changes.

- Build `IncentiveCarousel` composite using `@/components/ui/carousel` if available, else fall back to `ScrollArea` with `snap-x snap-mandatory` on a horizontal flex container.
- Render ONE full-size `IncentiveCard` at a time inside the viewport. The remaining cards are off-screen left/right.
- Swipe / scroll left-right reveals adjacent cards (snap behavior).
- Below the visible card: a row of page-indicator dots (one per program). Active dot uses primary `#10B981`; inactive dots are `#E5E7EB`.
- Same card visual as before (don't redesign the card — only the surrounding layout changes).
- Tap on a card still deep-links to `/requests?incentive=<type>` (unchanged contract).

#### Part 3 — Add "View All" link to every dashboard variant

Every dashboard incentive surfacing variant (`dashboard-banner`, `dashboard-card-section` (now carousel), `dashboard-widget-integrated`) gains a small "View All" link/CTA top-right of the section title. Tap → navigates to `/incentives` (lands on the Incentives tab by default).

- Style: small text link in primary `#10B981`, with a small `>` chevron icon.
- Position: top-right of the section header row (mirroring the existing "View All" pattern on the dashboard's "New Requests" section).

#### Part 4 — `UpcomingPayoutWidget` stays on Dashboard (no move)

DO NOT move the `UpcomingPayoutWidget` to `/incentives`. The widget remains on Dashboard between the Earnings card and the New Requests preview. The Sheet popup on tap still exists in I-4.1; it gets removed in I-4.2 (which adds `/payout`).

**Constraints:**

- The card visual (program name + bonus + progress + count line) stays the same — DO NOT redesign the card. Reuse the existing `IncentiveCard` from I-3.
- DO NOT add a bottom-nav tab for "Incentives" — `/incentives` is stack-pushed, reachable only via "View All" links on dashboard.
- DO NOT change the deep-link contract (`/requests?incentive=<type>`).
- DO NOT touch `UpcomingPayoutWidget` in this step (no relocation, no Sheet removal — that's I-4.2).
- "View All" link is added to ALL three dashboard variants, not just `dashboard-card-section`.
- The Tabs row on `/incentives` uses 3 tabs exactly (Incentives default / Leaderboard / Tier Progress). Leaderboard and Tier Progress are placeholder shells in this step.
- Tab labels are exactly: "Incentives", "Leaderboard", "Tier Progress" — match this casing/wording.
- Carousel page dots reflect the NUMBER of programs (4 in seed), not a fixed number.
- The carousel must be touch-friendly on the 375×812 viewport — snap behavior is required.

**Backend Implications (capture only):**

- The `/incentives` page reads the same data as the Dashboard surfacing variants — no new endpoint.
- Pagination: prototype shows ALL programs on the Incentives tab. Production may need pagination if the program count grows; out-of-scope here.

**Test Flows After This Step:**

- [ ] New `/incentives` route exists and is reachable from Dashboard via "View All" link
- [ ] `/incentives` is stack-pushed (no bottom nav visible)
- [ ] Header on `/incentives` has WHITE background, back chevron, "Driver Incentives" title, top-right Variants pill
- [ ] Tabs row visible directly under header with 3 tabs: Incentives (active by default) / Leaderboard / Tier Progress
- [ ] Incentives tab shows full stacked list of IncentiveCard rows (4 in seed)
- [ ] Each card on Incentives tab deep-links to `/requests?incentive=<type>` correctly
- [ ] Leaderboard tab shows placeholder shell (filled in I-7)
- [ ] Tier Progress tab shows placeholder shell (filled in I-6)
- [ ] `UpcomingPayoutWidget` STAYS on Dashboard (NOT moved to `/incentives`)
- [ ] Back chevron on `/incentives` returns to Dashboard
- [ ] Dashboard `dashboard-card-section` variant is now a swipe carousel — ONE card at a time, swipe reveals others, page dots below
- [ ] Active page dot uses primary green; inactive dots are gray
- [ ] Cards in the carousel still tap-deep-link to `/requests?incentive=<type>`
- [ ] Other dashboard variants (`dashboard-banner`, `dashboard-widget-integrated`) unchanged structurally but get a "View All" link/CTA top-right
- [ ] "View All" link visible on all 3 dashboard variants and navigates to `/incentives` (lands on Incentives tab)
- [ ] No "Incentives" bottom-nav tab added
- [ ] Card visual itself unchanged from I-3
- [ ] Mobile portrait 375×812 viewport, no horizontal overflow on the carousel snap
- [ ] Zero TypeScript errors

---

### Step I-4.2: Component Unification + Single-Incentive Schema + Achievement Banner Variant + Points System

**Goal:** Major restructure with five intertwined parts: (1) **Schema** simplifies to single-program-per-trip + adds tier/points; (2) **Seed data** reseeded for the new schema + completed programs suppressed via `incentiveType: null` (data-driven, NO runtime filter); (3) **Variant set** drops `badge-corner-flag`, adds `achievement-banner`; refines Hero Banner with tier-colored Wingz mark backdrop; (4) **`IncentiveCard` themed by active variant** — propagates the visual identity across Dashboard carousel, `/incentives` Incentives tab, `/payout` Completed Incentives tab; (5) **Multi-program rendering dropped** everywhere — banner shows ONE program, popover shows ONE program, no joined `<Name A> · <Name B>` labels, no summed Earn $X.

**This is a no-flow restructure.** All states are seeded directly. NO completion events, NO points-accumulation events, NO tier-up events.

(No reference screenshots — schema + component changes only.)

**What to build:**

#### Part 1 — Schema changes (`lib/data/incentives.ts`)

```ts
// CHANGED: Trip now carries SINGLE program (or null), not array
export interface Trip {
  id: string;
  pickupTime: string;
  pickupAddress: string;
  dropoffAddress: string;
  status: TripStatus;
  estimatedMiles: number;
  client: string;
  market: string;
  revenue: number;
  incentiveType: IncentiveType | null;   // ← was incentiveTypes: IncentiveType[]
  clientEnrolledInIncentives: boolean;
}

// CHANGED: IncentiveDefinition gains tierLevel
export interface IncentiveDefinition {
  type: IncentiveType;
  label: string;
  description: string;
  targetCount: number;
  bonusAmount: number;          // dollars at completion (existing)
  tierLevel: 'gold' | 'silver' | 'bronze';   // ← NEW: program difficulty / value
  window: Period;
  eligibilityHint: string;
}

// NEW: constant for points per tier
export const INCENTIVE_TIER_POINTS = {
  gold: 3,
  silver: 2,
  bronze: 1,
} as const;

// CHANGED: LeaderboardEntry adds pointsEarnedThisPeriod
export interface LeaderboardEntry {
  rank: number;
  handle: string;
  bonusesEarned: number;             // existing — secondary $ figure shown per row
  pointsEarnedThisPeriod: number;    // ← NEW: primary ranking metric
  isCurrentDriver: boolean;
  tier: Tier;                        // driver's tier (Bronze/Silver/Gold/Platinum)
}

// CHANGED: TierConfig threshold semantics shift to points-based
export interface TierConfig {
  tier: Tier;
  label: string;
  threshold: number;                 // ← was "incentives accomplished"; now POINTS
  multiplier: number;                // parking-lot field (not visualized — no UI surface)
  badgeColor: string;
}

// CHANGED: CurrentDriver renames + adds points
export interface CurrentDriver {
  id: string;
  displayName: string;
  initials: string;
  currentTier: Tier;
  pointsAccumulatedThisPeriod: number;   // ← was incentivesAccomplishedThisPeriod
  totalBonusesEarnedThisPeriod: number;
}
```

Other types (`IncentiveType`, `Tier`, `TripStatus`, `Period`, `PeriodStatus`, `DriverIncentiveProgress`, `DashboardData`) unchanged.

#### Part 2 — Seed data updates

**Assign tierLevel to each `IncentiveDefinition`** (4 programs in current seed):
- Weekend Warrior — `tierLevel: 'gold'` (high difficulty / value)
- Peak Performer — `tierLevel: 'gold'`
- Early Bird — `tierLevel: 'silver'`
- Loyalty Streak — `tierLevel: 'bronze'`

(Pushback welcome — adjust values to taste. Reasoning: Weekend Warrior + Peak Performer are gold because they're the in-progress / high-effort programs in the existing demo; Early Bird is silver as completed-mid; Loyalty Streak is bronze as completed-low. Visual variety in seed: every tier represented.)

**Reseed `Trips` to single-program.** Any multi-incentive trip in the existing seed gets reduced to a single program (pick the most relevant one — typically the higher-value tier). 12 trips total in seed.

**Suppress completed programs in seed.** For programs where `DriverIncentiveProgress.earnedThisPeriod === true` (Early Bird + Loyalty Streak in current seed), any trip whose `incentiveType` would have pointed to those programs gets `incentiveType: null` instead. The trip becomes a regular trip with no banner. **NO conditional rendering logic** — this is purely a seed-data rule.

**Update `LeaderboardEntries` (10 rows) with `pointsEarnedThisPeriod` values.** Sort the leaderboard by points descending. Current driver Driver-7821 stays at #4. Sample distribution:
- #1: 18 points
- #2: 15 points
- #3: 13 points
- #4 (current): 11 points
- #5–#10: descending values

Each row also keeps `bonusesEarned: number` (existing) — shown as secondary $ figure in the row.

**Update `TierConfig` thresholds (points-based):**
- Bronze: 0 points
- Silver: 5 points
- Gold: 12 points
- Platinum: 24 points

`multiplier` field stays in seed but is NOT visualized.

**Update `CurrentDriver`:** rename `incentivesAccomplishedThisPeriod` → `pointsAccumulatedThisPeriod`. Set value such that driver is in Silver tier with progress toward Gold. Example: 11 points (Silver tier, 1 point shy of Gold which needs 12).

#### Part 3 — Variant set restructure (`lib/variants.ts`)

```ts
// CHANGED: PillVariant union — drop badge-corner-flag, add achievement-banner
export type PillVariant = 'pill-named-bottom' | 'banner-wingz-hero' | 'achievement-banner';

// CHANGED: VARIANT_LABELS — drop badge-corner-flag entry, add achievement-banner entry
export const VARIANT_LABELS = {
  pill: {
    'pill-named-bottom': 'Pill Row (Bottom)',
    'banner-wingz-hero': 'Hero Banner',
    'achievement-banner': 'Achievement Banner',
  },
  dashboard: { /* unchanged */ },
} as const;
```

**Variant Toggle Sheet labels** (locked — match what v0 already shows):
- Section 1 "Ride Card Indicator" with sub-copy "How incentive eligibility appears on ride cards in list views."
- Section 2 "Dashboard Incentives" with sub-copy "How incentive progress is surfaced on the home screen."

#### Part 4 — `IncentiveBadgeRenderer` updates

Drop the `badge-corner-flag` branch entirely. Add the `achievement-banner` branch.

**`banner-wingz-hero` REFINED:**
- Banner background stays BLACK (`#1F2937`)
- The Wingz mark (LEFT side of banner, ~14×14px) sits on a small backdrop pill/square — that backdrop's color = the program's `tierLevel` color (gold `#EAB308` / silver `#94A3B8` / bronze `#B45309`). Tier indicator while the rest of the banner stays neutral black.
- Single program in the banner (NO `<Name A> · <Name B>` joined labels)
- "Earn $<bonusAmount>" right-aligned in green
- Progress bar with verbose labels below

**`achievement-banner` NEW:**
- Banner background = program's `tierLevel` color (gold `#EAB308` / silver `#94A3B8` / bronze `#B45309`)
- Program name LEFT, "Earn $<bonusAmount>" right-aligned (in dark text on the colored bg, or contrast-appropriate)
- Wingz mark on the LEFT (white/dark mark depending on bg contrast — pick what reads cleanly)
- Progress bar with verbose labels below
- Visual prominence is highest of the three variants — celebratory, tier-themed.

#### Part 5 — `IncentiveCard` themed by active variant

The `IncentiveCard` component (used on Dashboard carousel, `/incentives` Incentives tab, `/payout` Completed Incentives tab) reads `useVariants().pill` and switches its visual treatment:

- `pill-named-bottom`: existing white card with program-name pill at top-left, $ at top-right, description, ProgressMeter, count line, chevron.
- `banner-wingz-hero`: card body is BLACK (matching the ride card banner). Layout: program name + tier-tinted Wingz mark backdrop on top-left, "Earn $X" right-aligned in green, description as light/muted subtitle, ProgressMeter inline, count line.
- `achievement-banner`: card body is the program's `tierLevel` color (gold/silver/bronze). Same layout as `banner-wingz-hero` but on the colored background.

Same data, three thematic states. NO new sub-components — the same `IncentiveCard` instance handles all three by branching on the variant.

#### Part 6 — `ProgramContributionIndicator` updates

Drop multi-program rendering. The popover/tooltip now shows the SINGLE program info:
```
Counts toward Short Notice — 3/5 trips · Earn $8 when complete
```
or
```
✓ Short Notice — Completed · $8 added to next payout
```

No joined `· <Name B>` lines. No summed bonus. One program, period.

#### Part 7 — Dashboard `dashboard-card-section` carousel propagation

The carousel built in I-4.1 already renders `IncentiveCard` instances. After this step, those cards automatically pick up the active variant's theme. No additional carousel work — just verify the visual change ripples through.

**Constraints:**

- DO NOT build any flow / event logic. All states come from the seed.
- DO NOT add a runtime filter `if (program.earnedThisPeriod) return null` — the seed handles suppression by setting `incentiveType: null` on the affected trips.
- DO NOT break the existing deep-link contract `/requests?incentive=<type>`.
- DO NOT add a 4th variant — exactly 3 (Pill Row / Hero Banner / Achievement Banner).
- DO NOT redesign the IncentiveCard layout — only the background colors switch per variant.
- DO NOT visualize `TierConfig.multiplier` anywhere — it's a parking-lot field.
- The `CurrentDriver.pointsAccumulatedThisPeriod` value seeded such that the driver is in Silver tier with realistic Gold-tier progress (e.g., 11 points → Silver achieved at 5, Gold needs 12).

**Backend Implications (capture only):**

- Production: backend computes `pointsEarnedThisPeriod` per driver per period (sum of `INCENTIVE_TIER_POINTS[program.tierLevel]` for completed programs).
- Driver's tier is backend-derived: largest tier where `pointsAccumulatedThisPeriod >= TierConfig.threshold`.
- Trip's `incentiveType` may be derived backend-side based on which active program a trip qualifies for (and is null if no active program applies). The "suppress completed" rule belongs to backend trip-tagging logic, not frontend rendering.
- Multi-program-per-trip is dropped from the prototype model. Backend may still compute "this trip is eligible for any of these programs" and pick one to surface — pick rule out of scope here.

**Test Flows After This Step:**

Schema:
- [ ] `Trip.incentiveType: IncentiveType | null` (singular, not array)
- [ ] `IncentiveDefinition.tierLevel` exists per program (gold / silver / bronze)
- [ ] `INCENTIVE_TIER_POINTS = { gold: 3, silver: 2, bronze: 1 }` exported
- [ ] `LeaderboardEntry.pointsEarnedThisPeriod` exists
- [ ] `CurrentDriver.pointsAccumulatedThisPeriod` exists (renamed from incentivesAccomplishedThisPeriod)
- [ ] `TierConfig.threshold` values updated (Bronze 0 / Silver 5 / Gold 12 / Platinum 24)
- [ ] No multi-program trip in seed
- [ ] Trips for completed programs have `incentiveType: null` in seed (no runtime filter)
- [ ] Zero TypeScript errors

Variant set:
- [ ] `PillVariant = 'pill-named-bottom' | 'banner-wingz-hero' | 'achievement-banner'`
- [ ] `badge-corner-flag` fully removed from the codebase (no rendering branch, no label)
- [ ] Variant Toggle Sheet shows 3 variant options under "Ride Card Indicator": Pill Row (Bottom) / Hero Banner / Achievement Banner
- [ ] `achievement-banner` renders with `tierLevel` color (gold/silver/bronze) as the full banner background
- [ ] `banner-wingz-hero` renders with black banner + Wingz mark backdrop tinted by `tierLevel`
- [ ] No multi-program rendering anywhere (no joined `<Name A> · <Name B>` labels, no summed Earn $X)

IncentiveCard theming:
- [ ] When `useVariants().pill === 'pill-named-bottom'`: IncentiveCard renders white card (existing visual)
- [ ] When `useVariants().pill === 'banner-wingz-hero'`: IncentiveCard renders BLACK background with Wingz mark backdrop tinted by program's tier
- [ ] When `useVariants().pill === 'achievement-banner'`: IncentiveCard renders with program's `tierLevel` color as full background (gold/silver/bronze)
- [ ] Theme propagates to Dashboard carousel + `/incentives` Incentives tab cards consistently

Behavior:
- [ ] No runtime filter for completed-program suppression (verify by inspecting components — no `earnedThisPeriod ? null` branches in render)
- [ ] No flow/event handlers added — pure data-driven rendering

---

### Step I-4.3: Upcoming Payout Page (`/payout`) + Retire Sheet Popup

(Renumbered from I-4.2 on 2026-05-01 when the Component Unification step was inserted.)

**Goal:** Add a dedicated stack-pushed `/payout` page that serves as the richer review surface for the upcoming payout — completed trips that contributed to base earnings + completed incentive programs that earned bonuses. Remove the Sheet popup from the dashboard `UpcomingPayoutWidget` (the Sheet is too thin a surface for the full payout context); tap target swaps to `router.push('/payout')`. The widget itself STAYS on dashboard for at-a-glance context.

**Reference screenshots:** No new reference screenshots — reuses existing `RideCard` (Ride History style) and `IncentiveCard` (dashboard `dashboard-card-section` style).

**What to build:**

#### Part 1 — New `/payout` page (`PayoutPage` composite)

- New route at `/payout` (Next.js App Router under `app/payout/page.tsx`).
- **Stack-pushed** — bottom nav is HIDDEN on this screen (same pattern as Ride History, Ride Details, `/incentives`).
- Header: WHITE background, `<` back chevron + bold "Upcoming Payout" title centered + top-right Variants pill button.
- Body sections (top to bottom):

  1. **Summary header section** — sits directly under the header, on a white card with subtle shadow:
     - Sub-label "Next payout: <Mon, May 4>" (computed from `DashboardData.nextPayoutDate`)
     - Large bold green dollar amount = `baseEarnings + bonusesEarned` (matches the same calculation as the dashboard `UpcomingPayoutWidget`)
     - Breakdown row: "Base $XXX.XX · Bonuses +$YY.YY" with the bonus portion in `[EXTENDED: bonus-revenue-accent ~#10B981]`
     - Empty state: when `bonusesEarned === 0`, show "No bonuses earned yet this week" inline below the breakdown row (do NOT hide the section).

  2. **Tabs row** using `@/components/ui/tabs` with TWO tabs:

     **Tab 1: "Rides Completed"** (default active) — completed-trips filter showing trips that contributed to base earnings this pay period.
       - Reuse the EXISTING `RideCard` component from I-0a (the Ride History styling: BLUE revenue color, blue county tags, no bottom pill).
       - Filter to `trip.status === 'completed'` from the `trips` seed array (3 trips in current seed).
       - Render the same vertical list of `RideCard` instances as Ride History.
       - List header: small text "<N> rides this pay period" or similar.
       - Tap on a card: console.log only (no navigation — these are historical receipts, not actionable).
       - Empty state: "No rides completed in this pay period yet."

     **Tab 2: "Completed Incentives"** — programs the driver has completed in this pay period.
       - Reuse the EXISTING `IncentiveCard` visual from I-3 `dashboard-card-section`.
       - Filter to programs where `DriverIncentiveProgress.earnedThisPeriod === true`.
       - Render the same stacked-list layout used on `/incentives` Incentives tab.
       - Tap on a card: deep-link to `/requests?incentive=<type>` (same contract — though this is a historical view, the deep-link still works as a "find more like this" affordance).
       - Empty state: "No incentives completed yet this pay period. Complete an incentive program to see it here."

- Page background: light gray (`#F9FAFB`).
- No sticky footer.

#### Part 2 — Retire the Sheet popup on `UpcomingPayoutWidget`

- The Sheet popup that opens when the `UpcomingPayoutWidget` is tapped (built in I-3) is REMOVED.
- The widget itself STAYS on dashboard between the Earnings card and the New Requests preview — visual unchanged.
- Tap target swaps from "open Sheet" to `router.push('/payout')`.
- Remove the Sheet component import + the per-program breakdown rendering inside the widget. The breakdown is now lived on the `/payout` page (richer + scoped by tab).

#### Part 3 — Anchor handling

- The `#upcoming-payout` anchor is no longer needed for Achievement Unlock CTA navigation — the entire `/payout` page IS the payout view, so navigating to `/payout` is sufficient (no scroll-to-anchor needed).
- Remove the `id="upcoming-payout"` attribute from the dashboard widget if it exists (no longer referenced).
- The Achievement Unlock Dialog "View Earnings" CTA in I-8 will use `router.push('/payout')` (no anchor).

**Constraints:**

- DO NOT redesign `RideCard` or `IncentiveCard` — reuse them from I-0a and I-3 respectively.
- DO NOT add accept/decline/start-trip buttons on Rides Completed tab — these are historical, read-only.
- The `/payout` page is read-only — NO Cash out / Withdraw / Bank account / Transfer buttons.
- The `UpcomingPayoutWidget` itself stays on dashboard with same visual treatment — only the tap behavior changes.
- The Sheet code from I-3 must be fully removed (no dead code branches).
- DO NOT add `/payout` as a bottom-nav tab — it's stack-pushed only.
- Tab labels are exactly: "Rides Completed", "Completed Incentives" — match this casing/wording.

**Backend Implications (capture only):**

- `/payout` page reads `trips` filtered by status + pay period AND `driverIncentiveProgress` filtered by `earnedThisPeriod`. Backend should provide both as scoped lists for the page.
- "Pay period" definition: prototype assumes Mon–Sun cutoff (open question in Working Plan). Production: backend should define and expose the current pay period boundaries.
- The Achievement Unlock event from I-8 doesn't need an anchor — just a route change to `/payout`.

**Test Flows After This Step:**

- [ ] New `/payout` route exists and is reachable from Dashboard by tapping `UpcomingPayoutWidget`
- [ ] `/payout` is stack-pushed (no bottom nav visible)
- [ ] Header on `/payout` has WHITE background, back chevron, "Upcoming Payout" title, top-right Variants pill
- [ ] Summary section at top shows "Next payout: <date>", bold green total, "Base $X · Bonuses +$Y" breakdown row
- [ ] Tabs row visible directly under summary with 2 tabs: Rides Completed (active default) / Completed Incentives
- [ ] Rides Completed tab shows list of `RideCard` instances filtered to completed trips, using Ride History styling (BLUE revenue, blue county tags, no bottom pill)
- [ ] Completed Incentives tab shows list of `IncentiveCard` instances filtered to programs where `earnedThisPeriod === true`
- [ ] Each card on Completed Incentives tab deep-links to `/requests?incentive=<type>`
- [ ] Both tabs show appropriate empty states when their filtered lists are empty
- [ ] `UpcomingPayoutWidget` on Dashboard NO LONGER opens a Sheet on tap
- [ ] `UpcomingPayoutWidget` on Dashboard now navigates to `/payout` on tap (`router.push('/payout')`)
- [ ] The Sheet component code is fully removed from `UpcomingPayoutWidget`
- [ ] `UpcomingPayoutWidget` visual on Dashboard unchanged (same card, same content)
- [ ] Back chevron on `/payout` returns to Dashboard
- [ ] No `/payout` bottom-nav tab added
- [ ] Card visuals (`RideCard` and `IncentiveCard`) unchanged from prior steps — reused as-is
- [ ] Mobile portrait 375×812 viewport, no horizontal overflow
- [ ] Zero TypeScript errors

---

### Step I-5: Filter Trips by Incentive (Single Design)

**Goal:** Add a filter chip + sub-filter to the Requests tab. Single design (no variant toggle). Supports `?incentive=` URL param init for the deep-link from Dashboard. Extends the existing filter modal pattern.

**Reference screenshots:** `references/screenshots/by-step/i-5/` (02a, 02b, 11 — Requests context + existing filter modal).

**What to build:**
- The incentive filter EXTENDS the existing modal (slot 11) — add an `Incentive:` dropdown row to the modal — OR adds a chip row above the request list. Pick the option that fits cleanest with the deep-link UX. Do NOT replace the existing modal.
- Above the Requests trip list (chip-row option) OR inside the modal (modal option), expose: `All Trips` (default) | `Incentive-Eligible`.
- When `Incentive-Eligible` is active, reveal a `Select` labeled "Type" with options: All Incentives | Short Notice | Short Distance | Door-to-Door | Standing Order.
- On Requests page mount, read the URL `?incentive=<type>` query param. If present:
  - Set the filter to `Incentive-Eligible`
  - Set the Type sub-filter to the matching type
  - Render a small chip "Filtered from Dashboard: <Type Label>" with an `X` to clear (clearing returns to `All Trips` + clears query param + clears Type)
- Empty state when filter yields zero trips: "No incentive-eligible trips right now." + "Clear filter" button.

**Constraints:**
- Do NOT add additional filter dimensions (no client/market/distance/date) — those are handled by the existing modal.
- Filter state persists while on Requests; resets when leaving the tab.
- Do NOT break the existing Requests list layout.
- Multi-incentive trips appear under each matching type filter (inclusive match).

**Test Flows After This Step:**
- [ ] `All Trips` default shows all Requests trips
- [ ] `Incentive-Eligible` filters to trips with ≥1 incentive type
- [ ] Type sub-filter narrows further
- [ ] Multi-incentive trip appears under each matching type filter (inclusive)
- [ ] URL `/requests?incentive=short-notice` initializes filter pre-applied
- [ ] "Filtered from Dashboard: <Type>" chip shown when arrived from deep-link
- [ ] Empty state appears for zero-result combos
- [ ] "Clear filter" button resets to `All Trips`
- [ ] NO additional filter dimensions introduced

---

### Step I-6: Tier Progress (tab content on `/incentives`) — Points-Based, Single Design

**Goal:** Fill the **Tier Progress** tab on the `/incentives` page (placeholder shell created in I-4.1). Build the `TierBadge` composite + horizontal row of 4 tiers (Bronze/Silver/Gold/Platinum) + points-threshold copy + path-to-next-tier progress. **Pure status badges based on `pointsAccumulatedThisPeriod` (introduced in I-4.2) — NO multiplier wiring into Dashboard projected bonus.** Built BEFORE Leaderboard (I-7) so the leaderboard consumes the finalized `TierBadge` directly — no stub-then-refine cycle.

(No reference screenshots for this step — Tier Progress is a net-new screen.)

**What to build:**

- Replace the Tier Progress tab placeholder shell on `/incentives` with the actual content.
- Tab content layout:
  - Horizontal row of all 4 tiers (Bronze / Silver / Gold / Platinum) as `TierBadge` composites.
  - Current tier highlighted with primary border + "Current" caption underneath.
  - For each tier: threshold copy in points (e.g., "Earn 5 points to reach Silver", "12 to Gold", "24 to Platinum"). Use the values from `TierConfig.threshold`.
  - `Progress` bar below the tier row showing path to next tier (e.g., "1 more point toward Gold" if `pointsAccumulatedThisPeriod = 11` and Gold threshold = 12).
  - Optional info copy explaining the points system: "Complete bronze incentives to earn 1 point, silver = 2 points, gold = 3 points." (small italic muted text below the tier row)
  - Top tier reached message if applicable: "You've reached the highest tier — Platinum!"
- Finalize `TierBadge` composite (Badge + Avatar accent using `[EXTENDED: tier-*]` color tokens) — used here, in I-7 leaderboard rows, and reusable elsewhere.
- **NO multiplier wiring into Dashboard.** The dashboard projected bonus stays at `bonusAmount × min(assignedCount, targetCount)` (no tier multiplier visualization). Tier is a status badge only — financial multiplier was simplified out of scope on 2026-05-01.

**Constraints:**

- Threshold values come from `TierConfig.threshold` — never hardcode.
- Path-to-next uses `CurrentDriver.pointsAccumulatedThisPeriod` against `TierConfig.threshold`.
- Tier transitions do NOT animate or celebrate here — that's I-8 (Tier Unlock Dialog).
- **DO NOT add a "×1.10 tier boost applied" caption to Dashboard projected bonus** — tier is purely a status badge, not a multiplier on earnings. The `TierConfig.multiplier` field stays in the seed data as a parking-lot field but is NOT visualized.
- No variants — single design only.
- The Tier Progress content lives ONLY inside the `/incentives` Tier Progress tab. Do NOT add a separate route or dashboard CTA for tiers.
- DO NOT build any tier-up event logic — this is data-driven display only.

**Test Flows After This Step:**

- [ ] Tier Progress tab on `/incentives` shows all 4 tiers in correct order (Bronze / Silver / Gold / Platinum)
- [ ] Current tier (Silver in seed) highlighted with primary border + "Current" caption
- [ ] Each tier shows points threshold copy ("Earn N points to reach <Tier>")
- [ ] Path-to-next-tier progress bar shows correct progress against points (e.g., 11/12 points → 1 more to Gold)
- [ ] `TierBadge` composite is finalized (no stub state)
- [ ] Optional points-system explainer text visible
- [ ] **No "tier boost applied" caption on Dashboard** (multiplier visualization out of scope)
- [ ] No separate Tiers route or Dashboard CTA exists — content lives inside `/incentives` tab only

---

### Step I-7: Leaderboard (tab content on `/incentives`) — Points-Ranked, Single Design

**Goal:** Fill the **Leaderboard** tab on the `/incentives` page (placeholder shell created in I-4.1). Build the leaderboard **ranked by `pointsEarnedThisPeriod` (primary)** with `bonusesEarned` shown as a secondary $ figure per row. Anonymized handles + period selector. Single design — no variant toggle. Consumes the finalized `TierBadge` from I-6 directly.

(No reference screenshots for this step — Leaderboard is a net-new screen.)

**What to build:**

- Replace the Leaderboard tab placeholder shell on `/incentives` with the actual content.
- Tab content layout:
  - Top section: PeriodSelector (`This Week` / `Last Week`) — static toggle that swaps the label only (no real period switching for prototype).
  - Ranked list of 10 drivers from `LeaderboardEntry` seed data, **sorted descending by `pointsEarnedThisPeriod`**.
  - Each row: rank, anonymized handle, finalized `TierBadge` (from I-6), **points earned ("N pts" — primary metric, prominent)**, bonuses earned ("$XXX" — secondary metric, smaller / muted).
  - Top 3 ranks visually distinct (subtle elevation or border).
  - Current driver row (`Driver-7821`) highlighted with primary border + low-alpha tint.
  - Sticky "Your rank: #4" pill at the bottom of the tab area for quick reference (sticky within the tab content scroll, not the global page).
  - Anonymity footer: "Names are anonymized for privacy."

**Constraints:**

- All names anonymized (`Driver-XXXX` handles only).
- No real driver names or rider data anywhere.
- Period selector is visual only — no real data switching.
- Use the finalized `TierBadge` from I-6 — do NOT build a stub.
- Leaderboard content lives ONLY inside the `/incentives` Leaderboard tab. Do NOT add a separate route or dashboard CTA.
- **Sort order: `pointsEarnedThisPeriod` descending.** Bonuses are NOT the ranking metric in the post-I-4.2 model.

**Test Flows After This Step:**

- [ ] Leaderboard tab on `/incentives` shows all 10 drivers in rank order **by points (descending)**
- [ ] Current driver Driver-7821 at #4 highlighted with primary border + low-alpha tint
- [ ] Top 3 visually distinct from ranks 4–10
- [ ] Each row shows rank + handle + finalized `TierBadge` + **points (primary, prominent)** + bonuses (secondary, muted $)
- [ ] PeriodSelector toggles label without breaking
- [ ] Sticky "Your rank: #4" pill visible
- [ ] Anonymity footer present
- [ ] NO real driver names or rider data anywhere
- [ ] No separate Leaderboard route or Dashboard CTA exists — content lives inside `/incentives` tab only

---

### Step I-8: Polish + Edge States + Achievement Unlock Dialog

**Goal:** Add edge-state UIs across the prototype, plus the Achievement Unlock Dialog (primary celebration when a driver completes a program threshold) and Tier Unlock Dialog (secondary).

(No reference screenshots for this step — edge states are net-new.)

**What to build:**

- **Empty states:**
  - Dashboard incentive section (no active incentives): "No active incentives this period. Check back soon."
  - Requests filter (zero results): "No incentive-eligible trips right now."
  - Leaderboard (no period yet): "No leaderboard for this period yet."
  - Upcoming Payout (no completed programs): "No bonuses earned yet this week. Complete an incentive program to earn one."
- **Period-ended state:**
  - Dashboard hero shows neutral `Alert` "Period ended — final bonuses being calculated"
  - Toggle via seed `DashboardData.currentPeriodStatus`
- **Payout-pending state:**
  - Earnings tab (or Dashboard if no Earnings tab): `Alert` "Your bonuses are pending payout. Payouts process every 2 weeks." Display only.
- **Ineligible market/client state:**
  - Trip detail callout (I-4): replace incentive blocks with "This client is not enrolled in driver incentives." (uses `Trip.clientEnrolledInIncentives` flag)
- **Achievement Unlock Dialog (program completion — primary celebration) — three CTAs:**
  - Fires automatically when an incentive transitions from "in progress" to "completed" (mock-triggerable via a [DEV] button on Dashboard since the prototype is read-only and has no real start/end-trip flow).
  - Dialog content:
    - 🎉 emoji header
    - Bold title: "Bonus Earned!"
    - Body: "You completed [Incentive Name] — $XX added to your next payout."
    - **Primary CTA: "View Earnings"** → closes dialog AND `router.push('/payout')`. The bonus shows up on the Completed Incentives tab + contributes to the total payout summary on `/payout`.
    - **Secondary CTA: "View Achievements"** → closes dialog AND `router.push('/incentives')`. Lands on the Incentives tab; user can switch to Leaderboard or Tier Progress tabs from there.
    - **Tertiary CTA: "Dismiss"** → closes dialog, no navigation.
  - Auto-dismiss after 6 seconds if no interaction (treats no-action as Dismiss).
- **Tier Unlock Dialog (secondary celebration):**
  - Profile tab "[DEV] Trigger tier unlock" button (or anywhere in Dashboard if Profile is just a placeholder).
  - Tap → Dialog with "You've reached Gold tier! Your bonus multiplier is now ×1.25." + 🎉 emoji.
  - Auto-dismisses after 4 seconds or on tap.

**Constraints:**
- All edge states use template `Alert` / `Dialog` / `Card` styling — no custom celebration components.
- Confetti is emoji-based (🎉) only — no animation library.
- Achievement Unlock Dialog and Tier Unlock Dialog are local-only — no notification mechanism, no push.
- Achievement Unlock "View Earnings" CTA navigates to `/payout` (the Upcoming Payout page added in I-4.2). "View Achievements" navigates to `/incentives` (the Driver Incentives Hub from I-4.1). "Dismiss" closes without navigation.
- Payout-pending Alert is display-only — no buttons.

**Backend Implications (capture only):**
- `currentPeriodStatus` enum on backend period model.
- Payout state machine: pending → scheduled → paid (backend); UI shows pending only.
- Per-client/market enrollment flag on incentive eligibility — backend filter.
- Tier unlock event detection — backend emits event when threshold crossed.
- Incentive completion event detection — backend emits event when a program transitions in-progress → completed; Driver App shows Achievement Unlock Dialog. For prototype, mock-trigger via [DEV] button.

**Test Flows After This Step:**
- [ ] All empty states reachable
- [ ] Period-ended state visible when seed flag toggled
- [ ] Payout-pending Alert visible
- [ ] Ineligible market state visible on flagged trip
- [ ] [DEV] Achievement Unlock Dialog (program completion) appears with "Bonus Earned!" + 🎉 + body + 3 CTAs ("View Earnings" / "View Achievements" / "Dismiss")
- [ ] Achievement Unlock "View Earnings" closes dialog AND navigates to `/payout`
- [ ] Achievement Unlock "View Achievements" closes dialog AND navigates to `/incentives` (lands on Incentives tab)
- [ ] Achievement Unlock "Dismiss" closes dialog without navigation
- [ ] Achievement Unlock auto-dismisses after 6s
- [ ] [DEV] Tier Unlock Dialog appears and dismisses correctly
- [ ] NO custom celebration component (template Dialog only)
- [ ] NO new business logic anywhere

---

## Compaction Guard

If your context compacts or you lose track of progress: **RE-READ this file (`PROTOTYPE-TRACKER.md`) and `PROTOTYPE-BIBLE.md`** before generating any new code. The Approval Log and Build Queue tables are the source of truth for what's been done. Do not re-do approved steps without explicit instruction.
