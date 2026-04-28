# Prototype Build Tracker — Driver Incentives — NEMT Driver App

> **IMPORTANT:** This file tracks build progress. v0 MUST update this file after each approved step. If your context compacts, RE-READ this file + `PROTOTYPE-BIBLE.md` to know where you left off.

---

## Current Step: I-5 — Pending
## Last Completed: I-4 (RideDetailIncentiveCallout with 3 variants)

---

## Prototype Mode

This prototype is a **variant-comparison overlay** on the existing Wingz NEMT Driver App. The existing surfaces are replicated faithfully and then augmented with an incentive layer. A global Variant Toggle (built in I-1) lets stakeholders compare named UI variants per surface.

**Bonus model: PROGRAM-LEVEL.** A trip "counts toward" one or more incentive programs. The driver earns a program's bonus only when they hit `IncentiveDefinition.targetCount` (e.g., complete 5 short-notice trips → earn $8). The `Trip` data type carries `incentiveTypes: IncentiveType[]` only — never a per-trip bonus dollar amount. Bonus values appear ONLY at the program level (I-2 contribution popover/tooltip layered on the pill/badge/banner, I-3 dashboard cards once per program, I-3 Upcoming Payout widget for completed programs, I-8 Achievement Unlock Dialog).

**Two required navigation paths for stakeholder testing:**

1. **Requests → Ride Details (before-taken state)** — driver browses Requests, taps a trip, sees Ride Details for a trip not yet started.
2. **My Rides Needs Action → Ride Details (needs-action / in-progress state)** — driver browses My Rides Needs Action tab, taps an accepted trip, sees Ride Details for that state.

**No acceptance / decline / start-trip / end-trip flows.** Detail screens are read-only. Sticky footers (pink/green swipe on Before-Taken; red "I REACHED OUT TO CONFIRM" on Needs Action) render visually but DO NOT trigger any flow.

---

## Build Queue

| #     | Screen                                                        | Status    | Key Deliverable                                                                                                                                                                                                                                                                                  |
| ----- | ------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0     | Setup                                                         | ✅ Done    | Bible + Tracker + screenshots tree uploaded; v0 confirms understanding                                                                                                                                                                                                                           |
| I-0a  | Shell Replication — Scaffold + List Surfaces                  | ✅ Done    | App layout, Header, BottomNav (5 tabs), routing. Replicate Dashboard, Requests, My Rides, Ride History. Build shared RideCard once, reuse across all 4 list surfaces.                                                                                                                            |
| I-0b  | Shell Replication — Ride Details (both states merged)         | ✅ Done    | Shared trip-detail body (map + metadata + leg cards). Two state variants swap the bottom region: Before Taken (swipe footer) + Needs Action / In Progress (amber alert + action toolbar + sticky red CTA). Two nav paths working: Requests→Detail (Before Taken), MyRides→Detail (Needs Action). |
| I-0.5 | Schema + Seed Data                                            | ✅ Done    | `lib/data/incentives.ts` + `lib/variants.ts`. Trip carries `incentiveTypes` only. `IncentiveDefinition` holds `bonusAmount` + `targetCount`.                                                                                                                                                     |
| I-1   | Variant Toggle Infrastructure                                 | ✅ Done    | Floating Variants pill + Sheet picker + URL/localStorage persistence + default variants for 3 surfaces (pill / dashboard / detail).                                                                                                                                                              |
| I-2   | Pill / Badge / Banner on Ride Card + Trip Contribution        | ✅ Done    | 3 fun variants: `pill-named-bottom` (named pill in bottom row + small Wingz mark), `badge-corner-flag` (green Wingz on black square at top-right corner with tooltip), `banner-wingz-hero` (full black + green Wingz banner at top of card). NO dollar amount on any variant. **Plus** the single-design `ProgramContributionIndicator` (Tooltip + Popover) layered on all 3 variants — taps surface program progress + program-level bonus. |
| I-3   | Dashboard Incentive Surfacing — Variant Set + Upcoming Payout | ✅ Done    | 3 dashboard surfacing variants (`dashboard-banner`, `dashboard-card-section`, `dashboard-widget-integrated`) + deep-link to Requests filter + Upcoming Payout widget (read-only weekly projection summing completed-program bonuses).                                                             |
| I-4   | Ride Details Incentive Callout — Variant Set                  | ✅ Done    | 3 callout variants (`detail-inline-badge`, `detail-section-pill`, `detail-map-banner`) on Ride Details (before-taken + needs-action states). Inline badge next to revenue, section pill between metadata and legs, map banner on map bottom edge with expandable Sheet. All 3 handle multi-incentive trips independently + ineligible-client state.|
| I-5   | Filter Trips by Incentive                                     | ⬜ Planned | Single-design filter chip + sub-filter in Requests; extends existing modal pattern; supports `?incentive=` URL param init.                                                                                                                                                                       |
| I-6   | Tier System + Tier-Based Bonus Boost                          | ⬜ Planned | Tier visualization (Bronze/Silver/Gold/Platinum), finalized `TierBadge`, multiplier display, path-to-next-tier; multiplier wires into dashboard projected bonus.                                                                                                                                 |
| I-7   | Leaderboard                                                   | ⬜ Planned | Single-design leaderboard ranked by bonuses earned with anonymized handles + period selector. Consumes finalized `TierBadge` from I-6.                                                                                                                                                           |
| I-8   | Polish + Edge States + Achievement Unlock Dialog              | ⬜ Planned | Empty / period-ended / payout-pending / ineligible states + Achievement Unlock Dialog ("Bonus Earned!" → scrolls to Upcoming Payout) + Tier Unlock Dialog.                                                                                                                                       |

---

## Approval Log

| Step | Decision | Date | Delta Notes |
|------|----------|------|-------------|
| | | | |

---

## Component Inventory

| Component | Import Path | Used In |
|-----------|-------------|---------|
| Tabs | `@/components/ui/tabs` | I-0a (My Rides 3-tab row: In Progress / Needs Action / Upcoming) |
| Card | `@/components/ui/card` | I-0a, I-0b, I-3, I-4, I-6, I-7 |
| Button | `@/components/ui/button` | All steps |
| Avatar | `@/components/ui/avatar` | I-0a, I-6, I-7 |
| Badge | `@/components/ui/badge` | I-2 (IncentiveBadgeRenderer), I-3, I-4, I-5, I-6, I-7 |
| Progress | `@/components/ui/progress` | I-3 (ProgressMeter), I-6 (tier progress) |
| ToggleGroup | `@/components/ui/toggle-group` | I-3 (period selector if used), I-5 (filter), I-7 |
| Select | `@/components/ui/select` | I-5 (sub-filter by incentive type) |
| Sheet | `@/components/ui/sheet` | I-1 (Variant Toggle picker), I-3 (UpcomingPayoutWidget breakdown), I-4 (`detail-map-banner` expand) |
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
| RideDetailLayout | I-0b | I-0b detail routes, plus I-4 (incentive callout layered on top) |
| VariantToggle | I-1 | All variant-set steps (I-2, I-3, I-4) |
| IncentiveBadgeRenderer | I-2 | I-3 (dashboard cards), I-4 (callout), I-5 (filter chips). Switches between `pill-named-bottom` / `badge-corner-flag` / `banner-wingz-hero` based on `useVariants().pill`. |
| ProgramContributionIndicator | I-2 | I-4 (ride detail) — Tooltip + Popover wrapper around the `IncentiveBadgeRenderer` output. Single design (no toggle). |
| DashboardIncentiveSection | I-3 | (Dashboard only) |
| UpcomingPayoutWidget | I-3 | (Dashboard only — anchor `#upcoming-payout`) |
| ProgressMeter | I-3 | I-4, I-6 |
| RideDetailIncentiveCallout | I-4 | (Ride Details only) |
| TierBadge | I-6 | I-7 (leaderboard rows), I-3 (dashboard tier badge) |
| AchievementUnlockDialog | I-8 | (Dashboard) |

---

## Step Specs

### Step 0: Setup

**Goal:** v0 reads `PROTOTYPE-BIBLE.md` and this file, confirms understanding of scope, build plan, component inventory, data schema, the variant-toggle pattern, and the program-level bonus model.

**Test Flows After This Step:**
- [x] v0 returns a confirmation summarizing scope, plan, components, schema, variant pattern, and the program-level bonus rule
- [x] v0 confirms it has read `references/screenshots/README.md` and knows the by-step folder convention
- [x] No code generated yet

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
- `Header` composite (sticky top, dark slate `~#1F2937` bg, white centered title, top-left red Wingz "W" tile, top-right icons per surface — see BIBLE Header section).
- `BottomNav` composite (sticky bottom, 5 tabs in order: `Home` / `Requests` / `Planner` / `My Rides` / `Options`. Active tab = teal-filled icon + green label; inactive = dark gray icon, no label color shift).
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
- [x] Header + BottomNav present on Home / Requests / My Rides; absent on Ride History
- [x] Bottom nav tabs in correct order (Home / Requests / Planner / My Rides / Options)
- [x] Active tab visually distinct (teal icon + label)
- [x] Home renders Earnings card (with chevron toggle), prompt, New Requests, Next Accepted Ride sections
- [x] Earnings chevrons toggle between This Month / Last Month
- [x] Requests list renders ride cards with mixed pill colors (green Single Legs, yellow Wait For Call, orange/gray expiration pills)
- [x] My Rides has 3-tab row with Needs Action default; cards show red `Not Confirmed` pill on that tab
- [x] Ride History renders with **blue** revenue color and no bottom pills
- [x] Mobile portrait 375×812 viewport, no horizontal overflow
- [x] No incentive UI, no action buttons, no detail screens

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
- Header: `<` back chevron + bold ride ID + state subtitle (`Will-Call Ride` for Before Taken; `- Accepted Ride` for Needs Action).
- Optional alert region (only renders when `state="needs-action"`): amber soft-fill card with ⚠️ icon, "Confirmation required" title, body "This ride has not been confirmed yet. Please call the ride client first." Use observed amber tokens from BIBLE.
- Map preview region (~30% screen height; OSM iframe or static placeholder image — NO live map SDK).
- Trip metadata card: When / Rider / Client / Leg.
- Leg cards (one per leg, stacked): time anchor circle (per BIBLE palette), bold time, per-leg revenue, addresses, county/city line.
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
- [x] Tapping a Requests card → Ride Details with Before Taken state (swipe footer rendered)
- [x] Tapping a My Rides Needs Action card → Ride Details with Needs Action state (amber alert + action toolbar + sticky red CTA)
- [x] Both states share the trip-detail body (map + metadata card + leg cards)
- [x] Bottom nav HIDDEN on both detail states; sticky footers overlay
- [x] Back chevron returns to the originating list (Requests vs My Rides)
- [x] Time anchors render with correct color circles (yellow / blue / green / black per BIBLE)
- [x] Notes line + expiration pill / Not Confirmed pill render per state
- [x] No incentive UI, no functional accept/decline/start/end actions
- [x] Swipe footer and red CTA are visually rendered but DO NOT trigger any flow

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
export type DetailVariant = 'detail-inline-badge' | 'detail-section-pill' | 'detail-map-banner';

export interface VariantSelection {
  pill: PillVariant;
  dashboard: DashboardVariant;
  detail: DetailVariant;
}

export const DEFAULT_VARIANTS: VariantSelection = {
  pill: 'pill-named-bottom',
  dashboard: 'dashboard-card-section',
  detail: 'detail-section-pill',
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
  detail: {
    'detail-inline-badge': 'Inline badge (small marker near revenue)',
    'detail-section-pill': 'Dedicated section with pill + progress',
    'detail-map-banner': 'Banner overlay on the map',
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
- [ ] `lib/variants.ts` exports variant types + DEFAULT_VARIANTS + VARIANT_LABELS
- [ ] Trip type does NOT carry per-trip bonus fields (no `incentiveBonus`, no `bonusReason`)
- [ ] Zero TypeScript errors

---

### Step I-1: Variant Toggle Infrastructure

**Goal:** Build the global Variant Toggle that lets stakeholders switch between named UI variants per surface during review.

**What to build:**
- Floating "Variants" pill button fixed top-right of every screen, primary `#10B981` background, white text, small.
- Tap → `Sheet` (right slide-in on tablet, bottom sheet on mobile) titled "Compare Variants".
- Sheet contents: 3 sections (Pill / Badge / Banner, Dashboard, Ride Detail Callout) — each with a `RadioGroup` of variants from `VARIANT_LABELS`.
- Selection persists to:
  - `localStorage` (key `driver-incentives-variants`)
  - URL query params (e.g., `?pill=banner-wingz-hero&dashboard=banner&detail=detail-section-pill`)
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

**Test Flows After This Step:**
- [ ] Variants pill is visible on every screen
- [ ] Tap → Sheet opens with 3 variant sections (Pill/Badge/Banner, Dashboard, Ride Detail Callout)
- [ ] Selecting a variant updates URL and localStorage
- [ ] Reload preserves selection
- [ ] Pasting a URL with `?pill=banner-wingz-hero` initializes with that variant
- [ ] Reset to Defaults clears persisted state

---

### Step I-2: Pill / Badge / Banner on Ride Card — Variant Set + Trip Contribution Popover

**Goal:** Add 3 named, fun, eye-catching variants for surfacing incentive eligibility on ride cards in Requests + My Rides + Ride History (variant set), AND a single-design `ProgramContributionIndicator` (Tooltip + Popover) layered on all 3 variants so a driver tapping the surface sees program progress + program-level bonus. Stakeholders compare visual variants AND their interaction in one review. **NO dollar amount on any pill/badge/banner surface itself** — bonuses are program-level (see BIBLE → "What NOT to Build" #3); the bonus dollar value appears ONLY inside the popover/tooltip.

**Reference screenshots:** `references/screenshots/by-step/i-2/` (02a, 02b, 03a — capture the existing pill family that the new surfaces extend AND the top-right corner of the card where the badge variant goes).

**Wingz logo asset:** `/WINGZLOGO2.png` at the repo root. The green Wingz mark on a black background is the brand identity for the badge + banner variants.

**What to build:**

#### Part 1 — `IncentiveBadgeRenderer` (variant-set, 3 variants)

Renders ONE of three variants per the active `pill` variant selection:

- **`pill-named-bottom`** — pill in the existing **bottom pill row** alongside `Single Legs Allowed` / `Expires in N`. Label = `<Incentive Name> Trip` (e.g., `Short Notice Trip`, `Door to Door Trip`). Inside the pill, a small **black-and-green Wingz mark** (~14×14px) sits LEFT of the label. Background tint = soft incentive color (`[EXTENDED: incentive-pill-*]`); text = dark for contrast.

- **`badge-corner-flag`** — top-right corner of the ride card. Square (~28×28px) with **black background (`#1F2937`) + green Wingz logo (~`#10B981`)**. Icon-only, no label. Tap/hover triggers the contribution Tooltip (see Part 2). Designed as a "flag" — high contrast against the white card. Position carefully so it does NOT obscure the existing top-right ↗ expand arrow.

- **`banner-wingz-hero`** — full-width banner at the **top of the card**. **Black background + green Wingz logo (LEFT) + "<Incentive Name> Trip" in white** (≈14px). Most prominent variant — celebratory, NOT a warning. Compact (~32–40px tall) so it doesn't push the date row off-screen. Tap reveals the contribution Popover (see Part 2). Optional inline progress micro-text (e.g., "3/5") on the right side of the banner if it doesn't crowd the layout.

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
- **For `banner-wingz-hero`**: tap reveals the same Popover, OR the inline "3/5" micro-text inside the banner — pick the option that doesn't crowd the banner.

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
- **NO dollar amount on the pill/badge/banner surface itself.** Bonuses are program-level — surfacing "$X" on a per-trip surface is misleading and forbidden. Dollar values appear ONLY inside the popover/tooltip.
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
- [ ] `banner-wingz-hero`: black + green banner top of card with white "<Incentive Name> Trip" label; doesn't push date row off-screen; shows progress (inline "3/5" OR Popover on tap)
- [ ] Single-incentive trips show 1 surface in each variant
- [ ] Multi-incentive trips: multiple pills (named-bottom), numeric overlay (corner-flag), name-list separator (banner-hero); popover lists each program independently
- [ ] No-incentive trips show no surface in any variant
- [ ] Completed-program line reads "✓ <Name> — Completed · $X added to next payout"
- [ ] Ineligible-client trips don't render the contribution indicator
- [ ] NO dollar amount visible on any pill/badge/banner surface itself (only inside popover/tooltip)
- [ ] Existing trip status pills (Single Legs Allowed, Expires in N, Wait For Call, Not Confirmed) unchanged
- [ ] Surfaces persist correctly across Requests, My Rides, Ride History (muted on completed)

---

### Step I-3: Dashboard Incentive Surfacing — Variant Set + Deep-Link + Upcoming Payout Widget

**Goal:** Add (a) 2–3 named dashboard surfacing variants that show driver incentive progress on the existing Dashboard, with deep-link tap → Requests with filter pre-applied, AND (b) a single-design **Upcoming Payout widget** that displays projected weekly payout including completed-program bonuses.

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
  - [x] All 3 dashboard surfacing variants render correctly via the toggle
  - [x] Tapping an incentive card/chip navigates to `/requests?incentive=<type>`
  - [x] Each variant clearly shows program progress + program-level bonus amount (one bonus number per program, NOT per trip)
  - [ ] No-incentive states (none active) show "No active incentives this period." — Deferred (seed data always has programs)
  - [x] Existing dashboard widgets unchanged in `dashboard-banner` and `dashboard-card-section`
  - [x] In `dashboard-widget-integrated`, the existing earnings widget shows the integration cleanly
  - [x] `UpcomingPayoutWidget` renders below the earnings card with bold $ amount + base/bonus breakdown; anchor id `#upcoming-payout` set
  - [x] Tapping `UpcomingPayoutWidget` opens the per-PROGRAM breakdown sheet (only completed programs contribute to total)
  - [x] Empty state (no completed programs) shows the placeholder copy
  - [x] No payout-action buttons present on the widget

---

### Step I-4: Ride Details Incentive Callout — Variant Set

**Goal:** Add 3 named callout variants on Ride Details screens (both Before Taken and Needs Action / In Progress states) that surface applicable incentives + program progress.

**Reference screenshots:** `references/screenshots/by-step/i-4/` (04a, 04b, 05a, 05b — both detail states with their distinct footers).

**What to build:**

The `RideDetailIncentiveCallout` composite renders ONE of three variants per the active `detail` variant selection:

- **`detail-inline-badge`** — small badge inline near per-leg revenue, e.g., a "Short Notice" chip placed adjacent to revenue text. Subtle.
- **`detail-section-pill`** — dedicated section card titled "Driver Incentives" sitting between the trip metadata card and the leg list. Contains one `IncentiveBadgeRenderer` pill per applicable program + ProgressMeter "<completed>/<target>" + program-level bonus shown ONCE per program (e.g., "Earn $8 when complete"). Highest information density.
- **`detail-map-banner`** — banner overlay on the bottom edge of the map preview region (above trip metadata card). Compact strip: incentive icon + "<Incentive Name> Trip" + tap target to expand into a Sheet with full breakdown. Highest visual prominence with minimum vertical space cost.

Apply to both:
- Ride Details — Before Taken (reachable from Requests, slot 04a/04b — sticky pink/green swipe footer must remain visible)
- Ride Details — Needs Action / In Progress (reachable from My Rides, slot 05a/05b — canonical "after-taken" state; sticky red "I REACHED OUT TO CONFIRM" CTA must remain visible)

For multi-incentive trips, the callout lists each applicable program independently (no combined number — same rule as I-2).

For trips where `clientEnrolledInIncentives === false`, all variants show "This client is not enrolled in driver incentives." instead of the incentive blocks (this state is fully built in I-8 polish).

**Constraints:**
- Do NOT add accept/decline/start/end-trip buttons. Detail screens are read-only.
- The existing sticky bottom CTA (pink/green swipe on Before-Taken; red "I REACHED OUT TO CONFIRM" on Needs Action) MUST remain visible. Variants must NOT push it off-screen.
- For `detail-map-banner`: the banner overlays the map area, NOT the trip metadata card. Map preview retains visibility above the banner.
- Do NOT modify the existing detail screen layout — the callout is ADDED, not replacing existing sections.
- Read variant from `useVariants().detail`.
- Reuse `ProgressMeter` from I-3.
- NO per-trip bonus dollar amounts. Bonus shown ONCE per program in the callout.

**Test Flows After This Step:**
- [ ] All 3 variants render correctly via the toggle on both detail states
- [ ] Sticky bottom CTAs remain visible across all variants (pink/green swipe; red "I REACHED OUT TO CONFIRM")
- [ ] Single-incentive trip shows 1 callout block per variant
- [ ] Multi-incentive trip shows multiple blocks (one per program) — NOT combined
- [ ] No-incentive trip shows no callout (or "Not eligible" if `clientEnrolledInIncentives === false`)
- [ ] Detail screen still shows existing trip info unchanged
- [ ] NO per-trip "+$Y" bonus surface anywhere on the detail screen

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

### Step I-6: Tier System + Tier-Based Bonus Boost (Single Design)

**Goal:** Build the Tiers section + finalize the `TierBadge` composite. Wire the multiplier into Dashboard projected bonus. Single design. **Built BEFORE Leaderboard so I-7 consumes the finalized `TierBadge` directly — no stub-then-refine cycle.**

(No reference screenshots for this step — Tier System is a net-new section.)

**What to build:**
- New "Tiers" section reachable from the dashboard (small CTA "View Tier Progress" or tap on the tier badge area).
- Tiers section:
  - Horizontal row of all 4 tiers (Bronze/Silver/Gold/Platinum) as `TierBadge` composites.
  - Current tier highlighted with primary border + "Current" caption.
  - Each tier: threshold (e.g., "10 incentives accomplished"), multiplier (e.g., "×1.25").
  - `Progress` bar showing path to next tier.
  - Top tier reached message if applicable.
- Finalize `TierBadge` composite — used here, in I-7 leaderboard, and in I-3 dashboard.
- Wire multiplier into Dashboard:
  - Projected bonus = `bonusAmount × min(assignedCount, targetCount) × tierMultiplier`
  - Show "×1.10 tier boost applied" caption near the projected total OR per incentive (per active dashboard variant).
- Note: I-3 dashboard surfacing was built with a `tierMultiplier` value of 1.0 in seed; this step makes the multiplier visually meaningful and adds the "boost applied" caption.

**Constraints:**
- Multiplier values come from `TierConfig.multiplier` — never hardcode.
- Path uses `CurrentDriver.incentivesAccomplishedThisPeriod` against `TierConfig.threshold`.
- Tier transitions do NOT animate or celebrate in this step — that's I-8.
- Multiplier is uniform across incentives (per-incentive multiplier override out of scope).
- No variants — single design only.

**Test Flows After This Step:**
- [ ] Tiers section shows all 4 tiers in correct order
- [ ] Current tier highlighted
- [ ] Path-to-next-tier shows correct progress (Silver=5, Gold=10, current=7 → "3 more toward Gold")
- [ ] Dashboard projected bonus reflects ×1.10 multiplier
- [ ] "×1.10 tier boost applied" caption visible
- [ ] `TierBadge` composite is finalized (no stub state)

---

### Step I-7: Leaderboard (Single Design)

**Goal:** Build the Leaderboard ranked by bonuses earned with anonymized handles + period selector. Single design — no variant toggle. **Consumes the finalized `TierBadge` from I-6 directly.**

(No reference screenshots for this step — Leaderboard is a net-new screen. Follow PROTOTYPE-BIBLE.md design system + observed-styling rules already absorbed from earlier steps.)

**What to build:**
- New "Leaderboard" route reachable from somewhere in the dashboard (e.g., a small CTA "See Leaderboard" near the incentive surfacing variants in I-3).
- Top section: PeriodSelector (`This Week` / `Last Week`) — static toggle that swaps the label only (no real period switching for prototype).
- Ranked list of 10 drivers from `LeaderboardEntry` seed data.
- Each row: rank, anonymized handle, `TierBadge` (finalized — from I-6), bonuses earned ("$XXX").
- Top 3 ranks visually distinct (e.g., medal accent or larger text).
- Current driver row (`Driver-7821`) highlighted with primary border + background tint.
- Sticky "Your rank: #4" pill at the bottom of the screen for quick reference.
- Anonymity footer: "Names are anonymized for privacy."

**Constraints:**
- All names anonymized (`Driver-XXXX` handles only).
- No real driver names or rider data anywhere.
- Period selector is visual only — no real data switching.
- Use the finalized `TierBadge` from I-6 — do NOT build a stub.

**Test Flows After This Step:**
- [ ] All 10 drivers in rank order
- [ ] Current driver Driver-7821 at #4 highlighted
- [ ] Top 3 visually distinct from ranks 4–10
- [ ] Each row shows rank + handle + finalized `TierBadge` + bonuses
- [ ] PeriodSelector toggles label without breaking
- [ ] Sticky "Your rank: #4" pill visible
- [ ] Anonymity footer present
- [ ] NO real driver names or rider data anywhere

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
- **Achievement Unlock Dialog (program completion — primary celebration):**
  - Fires automatically when an incentive transitions from "in progress" to "completed" (mock-triggerable via a [DEV] button on Dashboard since the prototype is read-only and has no real start/end-trip flow).
  - Dialog content:
    - 🎉 emoji header
    - Bold title: "Bonus Earned!"
    - Body: "You completed [Incentive Name] — $XX added to your next payout."
    - Primary CTA: "View Earnings" → closes dialog AND scrolls Dashboard to the `UpcomingPayoutWidget` anchor (`#upcoming-payout` from I-3).
    - Secondary CTA: "Dismiss" → closes dialog.
  - Auto-dismiss after 6 seconds if no interaction.
- **Tier Unlock Dialog (secondary celebration):**
  - Profile tab "[DEV] Trigger tier unlock" button (or anywhere in Dashboard if Profile is just a placeholder).
  - Tap → Dialog with "You've reached Gold tier! Your bonus multiplier is now ×1.25." + 🎉 emoji.
  - Auto-dismisses after 4 seconds or on tap.

**Constraints:**
- All edge states use template `Alert` / `Dialog` / `Card` styling — no custom celebration components.
- Confetti is emoji-based (🎉) only — no animation library.
- Achievement Unlock Dialog and Tier Unlock Dialog are local-only — no notification mechanism, no push.
- Achievement Unlock "View Earnings" CTA scrolls to the `UpcomingPayoutWidget` element id (`#upcoming-payout`) — no route change.
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
- [ ] [DEV] Achievement Unlock Dialog (program completion) appears with "Bonus Earned!" + 🎉 + body + "View Earnings" + "Dismiss" CTAs
- [ ] Achievement Unlock "View Earnings" closes dialog AND scrolls Dashboard to UpcomingPayoutWidget anchor
- [ ] Achievement Unlock auto-dismisses after 6s
- [ ] [DEV] Tier Unlock Dialog appears and dismisses correctly
- [ ] NO custom celebration component (template Dialog only)
- [ ] NO new business logic anywhere

---

## Compaction Guard

If your context compacts or you lose track of progress: **RE-READ this file (`PROTOTYPE-TRACKER.md`) and `PROTOTYPE-BIBLE.md`** before generating any new code. The Approval Log and Build Queue tables are the source of truth for what's been done. Do not re-do approved steps without explicit instruction.
