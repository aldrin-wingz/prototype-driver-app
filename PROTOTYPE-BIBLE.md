# Driver Incentives v1 — Driver App — Prototype Bible

> **IMPORTANT:** This file lives in the v0 repo. If your context compacts or you lose track of what was built, RE-READ this file and `PROTOTYPE-TRACKER.md` before continuing.
>
> **This is v1.** Forked from v3 baseline on 2026-05-02 after CEO review locked variants and split the project into v1/v2/v3. Tier system, leaderboard, variant comparison overlay, and payout page redesign are NOT in v1 scope.

---

## What We're Building

A mobile-first prototype that overlays a Driver Incentives layer on top of the existing **Wingz NEMT Driver App** shell. The existing Dashboard, Requests, My Rides, Ride Details (before-taken + needs-action), and Ride History are replicated faithfully and then augmented with:

- **Pill on ride cards** signaling that a trip "counts toward" one or more driver incentive programs. Single locked variant: **Pill Row (Bottom)** — `pill-named-bottom`. Each pill tap reveals a program-contribution popover listing every program the trip contributes to (with progress + program-level bonus per row). **Multi-incentive trips supported** — `Trip.incentiveTypes: string[]` (revised 2026-05-04, was singular `incentiveType: string | null`). The Pill Row Bottom layout was always built for stacking; we now seed it.
- **Dashboard incentive surfacing** — single locked variant: **Card Section** — `dashboard-card-section`. Swipe carousel (one card at a time, page dots, "View All" link top-right that opens the Driver Incentives page).
- **Dedicated `/incentives` page (Driver Incentives Hub)** — stack-pushed, no bottom nav. **Single tab** — Incentives only (no Leaderboard, no Tier Progress in v1). Sticky header + scrollable list of `IncentiveCard`s sorted by `sortOrder`.
- **Ride details incentive surfacing** — extends the same pill to Ride Details (placement adapts per surface; visual treatment shared with the ride card).
- **Filter trips by incentive** in Requests.
- **Per-incentive `bonusAmount`** — every `IncentiveDefinition` carries its own admin-editable bonus dollar value. There is NO tier-based $ system in v1; tier and leaderboard live in v3 only.
- **Earned popup** — celebration overlay fires when a driver completes a program threshold ("Bonus Earned!" — single CTA "Dismiss" or auto-dismiss after 6s).

**This is an OVERLAY on the existing app, not a rebuild.** Do not redesign the dashboard or trip lists from scratch. Replicate the existing surfaces faithfully (per Reference Screenshots), then layer the incentive pieces on top.

**Bonus model is PROGRAM-LEVEL, not per-trip.** A trip "counts toward" zero or more incentive programs (`Trip.incentiveTypes: string[]` — revised 2026-05-04, was singular). Each entry in the array means the trip increments that program's `completedCount` on completion. The driver earns a bonus per program only when that program hits its `goal` (e.g., complete 5 short-notice trips → earn $25). Trips never carry a per-trip bonus dollar amount. Bonus dollar values appear ONLY at the program level: in the contribution popover (one row per program in `incentiveTypes`), on Dashboard incentive cards (once per program), on the `/incentives` page, and in the Earned popup when a program completes.

**Per-incentive $ model.** Each `IncentiveDefinition` has its own `bonusAmount` (any positive integer), `goal` (target trip count), and `timeframe` (`'daily' | 'weekly' | 'monthly' | 'all-time'`). The Incentives Manager admin tool (separate v1 prototype) is the source of truth for these values. In this Driver App prototype, seed mock incentives directly in `lib/data/incentives.ts`. There is NO tier-locked $ formula.

**Suppression on ride card pills is DATA-DRIVEN, not LOGIC-DRIVEN.** Trips whose programs are all completed (or that don't qualify for any program this period) are seeded with `incentiveTypes: []` so the bottom pill row naturally renders nothing. To suppress a specific program from a trip's pill row (e.g., that program already hit goal), omit it from `incentiveTypes`. No conditional filtering in components. Completed programs still appear on `/incentives` — that's the right context. Only ride card pills are suppressed.

**Progress UI is BINARY (revised 2026-05-04).** IncentiveCard progress shows ONLY done vs to-go: solid green fill from 0 to (`completedCount` / `goal`), gray for the rest. Caption is `"X done · Y to go"` where Y = `goal - completedCount`. The v3 baseline 3-state progress (solid green / hatched green "+N taken" / gray) is REMOVED from v1. Drivers see a clean black-and-white "did or didn't" view per program.

**Per-incentive color drives pill theming.** Each `IncentiveDefinition` carries a `color: string` (hex). The pill background uses this color for its bg tint; the label color is high-contrast against it. Color is admin-editable in the Incentives Manager.

**No flow / no events.** This is a display prototype. There are NO completion events, NO payout-fire events, NO points-accumulation events. All states are seeded directly in `lib/data/incentives.ts`. v0 just renders what the seed says. The Earned popup is mock-triggered via a [DEV] button (added in v1 I-2 polish; the v3 baseline used Variant Toggle Sheet trigger buttons which are stripped in I-0), not by real events.

**Locked variants — no Variant Toggle Sheet in v1.** The v3 baseline had a global Variant Toggle that switched between named variants per surface. In v1, CEO has locked the choices: Ride Card = `pill-named-bottom`, Dashboard = `dashboard-card-section`. Do not build a variant comparison overlay. Single render path per surface.

---

## Template

`v0/chwang-3595-b67e8ee3` — All base UI components exist at `components/ui/`. ALWAYS import from `@/components/ui/[component]` — NEVER recreate base components.

---

## Branding

- **Product name:** Wingz NEMT Driver App
- **Wingz logo asset:** `/WINGZLOGO2.png` at the v0 repo root. Used by:
  - The `pill-named-bottom` variant: small black/green Wingz mark inside the pill, left of the label.
  - Existing-app header (top-left red "W" tile per the reference screenshots — replicate the existing styling).
- **Header:** Per reference screenshot 01a — **WHITE background**, **dark text title** centered, top-left red Wingz mark on a circular tile, top-right icons per surface.
- **Bottom Nav:** Match the existing-app order — `Home` / `Requests` / `Planner` / `My Rides` / `Options`. **WHITE background** with a faint top hairline border. Active tab uses teal/green icon + green label; inactive tabs use dark gray icons. Do NOT introduce new top-level tabs. Do NOT render the nav with a dark/navy background — that's a known v0 regression. The `/incentives` page is **stack-pushed** (reached via the dashboard "View All" link), not a bottom-nav tab.
- **Section Headings (project-specific copy):**
  - "Driver Incentives" (section header on the dashboard surfacing variant AND the page title for `/incentives`)
  - "View All" (link/CTA on dashboard incentive section that opens `/incentives`)
- **Pill labels:**
  - Pill: `<Incentive Title> Trip` — e.g., `Short Notice Trip`, `Door to Door Trip`, `Weekend Warrior Trip`, `Hometown Hero Trip`. The label uses the incentive's `title` field; `Trip` is appended.
  - Pill background uses the incentive's `color` field (admin-editable).
- **Trip Contribution copy (popover/tooltip layered on the pill):**
  - In-progress program: "Counts toward <Title> — <completed>/<goal> trips · Earn $<bonusAmount> when complete"
  - Completed program: "✓ <Title> — Completed · $<bonusAmount> added to next payout"
- **Empty state messages:**
  - Dashboard incentive section (no incentives): "No active incentives this period. Check back soon."
  - Requests filter (zero results): "No incentive-eligible trips right now."
  - `/incentives` page (no incentives): "No active incentives this period."
- **Earned popup (v1 single-CTA — fires on program completion):**
  - Title: "Bonus Earned!"
  - Body: "You completed <Title> — $<bonusAmount> added to your next payout."
  - **CTA: "Dismiss"** — closes the popup.
  - Auto-dismiss after 6 seconds.

---

## Design System

**Wingz template colors (HEX values are the source of truth):**

- Primary (teal/emerald): `#10B981`
- Primary dark: `#059669`
- Secondary (charcoal): `#1F2937`
- Destructive (red): `#EF4444`
- Surface / Card background: `#FFFFFF`
- Page background: `#F9FAFB`
- Border: `#E5E7EB`
- Muted text: `#6B7280`

**Per-incentive pill colors (admin-driven, not template-fixed):**

In v1, the pill background color comes from the `IncentiveDefinition.color` field — set per-incentive by an admin in the Incentives Manager. Sample seed values for prototype:

- Short Notice — `#F59E0B` (amber)
- Short Distance — `#3B82F6` (blue)
- Door to Door — `#8B5CF6` (violet)
- Weekend Warrior — `#10B981` (Wingz primary green)
- Early Bird — `#06B6D4` (cyan)
- Peak Performer — `#EAB308` (yellow)
- Loyalty Streak — `#EC4899` (pink)
- Hometown Hero — `#94A3B8` (slate)

These are mock seed values. Real admin values come from the Incentives Manager.

**Observed pill family (from existing-app reference screenshots — these tokens take precedence over template defaults on replicated surfaces):**

| Color | Token | Use |
|-------|-------|-----|
| 🟢 Green soft | `pill-success-bg ~#D1FAE5 / text ~#065F46` | `Single Legs Allowed` (permission-class) |
| 🟠 Orange soft | `pill-warn-bg ~#FED7AA / text ~#9A3412` | `Expires in N hours` (short countdown) |
| 🟡 Yellow soft | `pill-attn-bg ~#FEF3C7 / text ~#92400E` | `Wait For Call` (Will-Call indicator) |
| ⚪ Gray soft | `pill-neutral-bg ~#F3F4F6 / text ~#374151` | `Expires in N days` (long countdown) |
| 🔴 Red soft | `pill-danger-bg ~#FEE2E2 / text ~#991B1B` | `Not Confirmed` |

**Observed time-anchor circles (leg-anchor system on ride cards + ride details):**

- ⚫ Black filled circle — `Est Pick-up Time` (default)
- 🟡 Yellow filled circle — `Est Pick-up Time - Wait For Call` (Will-Call)
- 🔵 Blue filled circle — `Appointment Time` (drop-off / scheduled return)
- 🟢 Green filled circle — `Scheduled Pick-up Time` (firm scheduled pickup)

**Other observed colors:**

- Revenue green (upcoming/active trips): `~#10B981`
- Revenue blue (Ride History completed trips): `~#1D4ED8` to `~#2563EB`
- Confirmation alert (Ride Details Needs Action): `alert-warn-bg ~#FEF3C7` / border `~#F59E0B` / text `~#92400E`
- Swipe-to-Reject (Before Taken footer): pink/coral soft fill
- Swipe-to-Accept (Before Taken footer): green `~#10B981`
- "I REACHED OUT TO CONFIRM" CTA (Needs Action footer): red/coral fill, white text + phone icon

**Typography / Radius:** Template defaults. **Mobile-first — portrait 375×812 viewport baseline.**

**Design System Directive:** Follow the Wingz template styling exactly, with one override: for surfaces being replicated from the existing app (Dashboard, Requests, My Rides, Ride Details, Ride History), the observed colors/styling above take precedence over template defaults where they conflict. For NEW surfaces (`/incentives` page, Earned popup, edge states), the Wingz template governs. Per-incentive `color` field drives pill backgrounds only.

---

## Locked Variants

**No Variant Toggle Sheet in v1.** CEO locked the variants on 2026-05-02:

| Surface | Locked variant | v3 alternatives (preserved in v3 baseline) |
|---|---|---|
| Ride Card Indicator | `pill-named-bottom` | `banner-wingz-hero`, `achievement-banner` |
| Dashboard Incentives | `dashboard-card-section` | `dashboard-banner`, `dashboard-widget-integrated` |

Single render path per surface. Do not build a `<VariantToggle>` component, `useVariants()` context, `lib/variants.ts`, URL query param parsing for variant overrides, or a Sheet picker. Do not add any "Compare Variants" floating button.

If a future need arises to compare variants, the v3 baseline (`Project - Driver Incentives/v3/`) preserves the full variant comparison setup.

---

## Reference Screenshot Inventory

**v0 reads reference screenshots directly from this repo at `references/screenshots/`.** Two organizations exist side-by-side:

- **`references/screenshots/canonical/`** — single source of truth: every reference screenshot in one flat folder.
- **`references/screenshots/by-step/<step-id>/`** — same screenshots pre-grouped per build step. Each step prompt cites the matching folder.

A `README.md` at `references/screenshots/README.md` describes the structure and per-step contents.

**Canonical authoring location** (outside the v0 repo): `Project - Driver Incentives/References/Screenshots/Reference - Existing App/` in the agent's vault.

v0 should treat these screenshots as own-brand captures of the existing production app — replicate styling, layout, and patterns closely while applying the Wingz template design system per the rules above.

**Surface map** (slot → step folders that contain this file):

| Slot | Filename | Used in | Step folders | What v0 uses it for |
|------|----------|---------|--------------|----------------------|
| 01a | `01a - Dashboard - This Month.png` | I-0, I-3 | `i-0/`, `i-3/` | Home default — earnings card "This Month" with chevron toggle, 3-stat row, upcoming-trip prompt, "New Requests" preview |
| 01b | `01b - Dashboard - Last Month.png` | I-0 | `i-0/` | "Last Month" earnings state — confirms left/right chevrons toggle period |
| 01c | `01c - Dashboard - Scrolled.png` | I-0, I-3 | `i-0/`, `i-3/` | Scrolled view — "Next Accepted Ride" section appears below New Requests preview |
| 02a | `02a - Requests - Single Legs Allowed Pill.png` | I-0, I-2, I-5 | `i-0/`, `i-2/`, `i-5/` | Requests list with green "Single Legs Allowed" pill + orange "Expires in 4 hours" pill |
| 02b | `02b - Requests - Will-Call Pill.png` | I-0, I-2, I-5 | `i-0/`, `i-2/`, `i-5/` | Requests list with yellow "Wait For Call" pill + blue Appointment Time anchor + gray expiration pill |
| 03a | `03a - My Rides - Needs Action Tab.png` | I-0, I-2 | `i-0/`, `i-2/` | My Rides 3-tab row; cards on Needs Action carry red `Not Confirmed` pill |
| 04a | `04a - Ride Details - Before Taken - Top.png` | I-0, I-4 | `i-0/`, `i-4/` | Top of detail screen — header, map preview, leg list begins; pink/green swipe footer |
| 04b | `04b - Ride Details - Before Taken - Scrolled.png` | I-0, I-4 | `i-0/`, `i-4/` | Scrolled — full leg cards, Notes line, gray expiration pill |
| 05a | `05a - Ride Details - Needs Action - Top.png` | I-0, I-4 | `i-0/`, `i-4/` | Canonical "after-taken" state — "Accepted Ride" subtitle, amber alert, red CTA |
| 05b | `05b - Ride Details - Needs Action - Scrolled.png` | I-0, I-4 | `i-0/`, `i-4/` | Same trip scrolled |
| 07 | `07 - Ride History.png` | I-0 | `i-0/` | Completed-trips list — separate stack-pushed screen, blue revenue, no bottom pill |
| 11 | `11 - Filter Requests Modal.png` | I-5 | `i-5/` | Existing filter modal — extended with `Incentive` field |

**Note:** Tier/Leaderboard screenshots from v3 are NOT in v1's screenshot set. v1 has no tier or leaderboard surfaces.

---

## Observed Styling From Reference Screenshots

These details inform v0 directly when replicating the existing surfaces (I-0) and when layering incentive UI on top of them later.

### Header (all screens)

- Single line, **WHITE background** (`#FFFFFF`), **dark text title** (`~#1F2937`) centered.
- Title text per screen: `Home`, `Requests`, `My Rides`, `Ride Details`, `Ride History`. Ride Details has no centered title; instead a `<` back chevron + ride ID + state subtitle.
- Top-left: small red Wingz "W" mark on a circular white tile.
- Top-right (varies):
  - Home → single circular refresh icon (dark gray)
  - Requests → filter (funnel) icon + refresh icon (dark gray)
  - My Rides → none
  - Ride Details → none
  - Ride History → filter (funnel) icon + refresh icon (dark gray)
- Header height: standard ~56px. Faint hairline divider (`~#E5E7EB`) below header before content.
- **Do NOT render header with dark/navy background — that's a known v0 regression. Header is white-on-white-bg with dark icons.**

### Bottom Nav

- 5 tabs left-to-right: `Home` / `Requests` / `Planner` / `My Rides` / `Options`.
- Outline icons; active tab = teal/green fill + green label; inactive = dark gray icon, no label color shift.
- Icon set: home (house outline), requests (clipboard with star), planner (small calendar), my rides (clipboard with checkmark), options (hamburger).
- **WHITE background** (`#FFFFFF`), faint top hairline border (`~#E5E7EB`). Always visible (sticky bottom) EXCEPT on Ride Details (sticky footer overlays nav) and Ride History + `/incentives` (stack-pushed screens).
- **Do NOT render nav with dark/navy background — known v0 regression.**

### Dashboard / Home Stack (slots 01a / 01b / 01c)

Stacked vertical sections on a light gray page background (`~#F9FAFB`). Order:

1. **UpcomingPayoutWidget** (top — display-only in v1, no Sheet popup, tap is a no-op or simple toast in v1; full payout page is v2)
2. **Driver Incentives surfacing** — `dashboard-card-section` (locked variant). Swipe carousel with one `IncentiveCard` visible at a time + page dots + "View All" link top-right that opens `/incentives`. Programs sorted by `sortOrder`.
3. **Earnings card** — period label (`This Month` / `Last Month`) toggled by `<` `>` chevrons; large bold black `$X.XX`; `EARNINGS` sub-label; 3-column stat row (`Trips` / `On-Time Performance` / `Send Backs`).
4. **"Confirm Your Upcoming Trip" prompt** (green-tinted card).
5. **"New Requests" section header + `View All` link** + ride card preview using the shared `RideCard` component.
6. (slot 01c) **"Next Accepted Ride" section header** + ride card.

Incentive surfacing layers at position 2 in the section stack (carried from v3 baseline). Do not push other existing sections off-screen.

### Ride Card Anatomy (Requests + My Rides + Ride History + Dashboard previews)

Single white rounded card (~12px radius, ~16px padding, subtle 1px shadow). Vertical sections:

1. **Date line** — bold black: `When: Thu, Apr 30, 2026`.
2. **Rider line** — labels in muted gray, values in black: `Rider: Andrew Test`.
3. **Client line** — `Client: Verida` (right-side teal expand `↗` icon aligned with revenue).
4. **Time anchor block** — small filled icon + bold label + time + city/county on the right.
5. **Address lines** under each anchor.
6. **Revenue** — top-right corner of card, bold; **green** for upcoming/active trips, **blue** for completed (Ride History).
7. **Notes line** — italic light gray.
8. **Pill row** (bottom) — horizontal pills, fully-rounded (~999px), ~12px font, sentence case. Multi-pill cards wrap to a second row.

The bottom pill row is where `pill-named-bottom` (I-2) slots in alongside existing pills.

### My Rides Tabs (slot 03a)

- 3-tab row directly under the header: `In Progress` / `Needs Action` (default active) / `Upcoming`.
- Active tab = bold black with thin black underline below the label. Inactive = lighter gray, no underline.
- Cards on Needs Action carry the red `Not Confirmed` pill at the bottom.

### Ride Details — Before Taken (slots 04a / 04b)

- Header: `<` back + bold ride ID + subtitle "Will-Call Ride" or similar. Header background is WHITE.
- **Map preview** ~30% screen height, OSM-style.
- **Trip metadata card** — a single white rounded card sitting **CLEANLY BELOW** the map (vertical gap; no overlap). Card contents stacked vertically:
  - `When: <full date>`
  - `Rider: <NAME>`
  - `Client: <Client>`
  - `Leg: <leg-id>` (the leg ID lives INSIDE this metadata card)
  - Top-right of card: passenger count + revenue dollar amount in green + small `(i)` info icon
- Leg cards (one per leg, stacked below the metadata card): yellow Wait For Call clock (or blue Appointment / green Scheduled / black Est), bold time, per-leg revenue (green), addresses, county/city.
- Notes paragraph + gray "Expires in N days" pill at the bottom of the last leg card.
- **Sticky footer (overlays bottom nav):** pink/coral "Swipe to Reject" ↔ green "Swipe to Accept", visually rendered, NOT functional.

### Ride Details — Needs Action (slots 05a / 05b)

- Header: `<` back + bold ride ID + subtitle "- Accepted Ride".
- **Amber "Confirmation required" alert banner** between header and trip metadata card.
- Map preview region (same).
- Trip metadata card + leg cards (same anatomy).
- Notes line + red `Not Confirmed` pill.
- **Bottom action row** — 4 small green-outline circular icon buttons: Reply / Phone / SMS / More.
- **Sticky red CTA** at the very bottom: full-width pill button, red/coral fill, white text "I REACHED OUT TO CONFIRM" with sub-label "A Leg" and white phone icon. Persists on scroll.

### Ride History (slot 07)

- Header: `<` back + `Ride History` title + filter+refresh icons.
- **No bottom nav visible** (stack-pushed screen).
- Cards use the shared anatomy with these completed-trip differences:
  - **Revenue rendered in BLUE** (`~#1D4ED8` / `~#2563EB`)
  - Multiple legs as a continuous timeline within one card
  - County tags in **blue text**
  - **No bottom pill** on completed cards

### Filter Modal (slot 11)

- Bottom-anchored modal sheet.
- Trigger: funnel icon top-right of Requests header.
- White sheet, top-left `X`, centered bold title `Filter Requests`.
- Body fields (vertical stack of dropdowns): Pickup Location, Day, Client, Sort by, Mode.
- Footer: `Clear Filters` text-link (left), green pill `Update` button (right).

The v1 incentive filter EXTENDS this modal — the `Incentive:` dropdown row is already present (carried from v3 baseline; the `incentiveType` field was built ahead of plan and survives v1 strip).

---

## Key Shared Components

These patterns are reused across multiple steps:

- **IncentivePill** — composed from `Badge` (+ Wingz logo asset). Single-design: `pill-named-bottom`. Background uses the incentive's `color` field. Label = `<title> Trip`. **Extends Wingz Ride Card Pill management system — do NOT introduce a parallel pill model.**
- **ProgramContributionIndicator** — composed from `Tooltip` + `Popover`. Wraps the `IncentivePill` so it surfaces a SINGLE program's progress + program-level bonus on tap/hover. NEVER shows a per-trip bonus.
- **DashboardIncentiveSection** — composed from `Card` + `Progress` + `Button` (deep-link). Single locked variant: `dashboard-card-section` (carousel). Each card deep-links to Requests with `?incentive=<type>`. "View All" link top-right opens `/incentives`.
- **IncentiveCarousel** — composed from `ScrollArea` (or `Carousel` from `@/components/ui/carousel`) with snap behavior + a row of page-indicator dots. One full-size `IncentiveCard` visible at a time.
- **IncentiveCard** — the unified card visual used on Dashboard carousel + `/incentives` page. White card body with the incentive's `color` as a small accent (left border or pill). Shows: Title, Description, Progress (`completed/goal`), Earn $`bonusAmount`. Tap → deep-link to `/requests?incentive=<type>`.
- **IncentivesPage** — carried from v3 baseline as the dedicated `/incentives` route. Stack-pushed (no bottom nav). Composed from a top header (back chevron + "Driver Incentives" title) + a scrollable list of `IncentiveCard`s sorted by `sortOrder` (post-I-1; pre-I-1 it was sorted gold-first by tier). **v1 I-0 strip removes the Tabs wrapper + Leaderboard tab + sticky Tier Progress section.** No Leaderboard. No Tier Progress section in v1. Each card tap deep-links to filtered Requests.
- **Ride Detail extension** — carried from v3 baseline. The same `IncentivePill` + `ProgramContributionIndicator` render on the detail screen. Placement: small named pill below the trip metadata card (mirrors the bottom pill row on ride cards). Sticky bottom CTAs (pink/green swipe on Before-Taken; red "I REACHED OUT TO CONFIRM" on Needs Action) MUST remain visible.
- **EarnedPopup** — composed from `Dialog` + 🎉 emoji + "Dismiss" CTA. Already built in v3 baseline (per 2026-05-01 spot-check) with 3 CTAs (Dismiss / View Earnings / View Achievements); v1 I-0 strip downgrades to single "Dismiss" CTA since `/payout` is gone and `/incentives` Leaderboard tab is gone. v1 I-2 adds the [DEV] floating trigger.
- **UpcomingPayoutWidget** — display-only in v1. Composed from `Card` + bold `$amount` + breakdown row. Does NOT navigate anywhere in v1 (no `/payout` page in v1; full redesign is v2). Tap shows a brief toast or is a no-op. Sums program-level bonuses for programs the driver completed this period.

---

## Navigation & Deep-Link Patterns

There are two navigation patterns layered on top of the incentive surfaces in v1.

### 1. Incentive card → Requests (filter pre-applied)

When a driver taps an individual incentive card — on the Dashboard carousel OR on the `/incentives` page — the app navigates to Requests with the filter pre-applied:

- URL: `/requests?incentive=<type>` (e.g., `?incentive=short-notice`)
- Requests page reads the query param on mount and initializes the filter to "Incentive-Eligible + <type>"
- A small chip near the filter row shows "Filtered from Dashboard: <Title>" with an `X` to clear (clearing returns to "All Trips" + clears query param)
- Clearing the filter does NOT navigate back — driver stays on Requests with all trips visible.

Wired in v3 baseline (deep-link source on dashboard cards + on `/incentives` cards + filter target with URL param init); carried over post-strip.

### 2. Dashboard → `/incentives` page

When a driver taps the "View All" link on the Dashboard incentive surfacing section, the app navigates to the dedicated `/incentives` page:

- URL: `/incentives` (no query params)
- `/incentives` is stack-pushed (no bottom nav), reachable via the back chevron in its header (returns to Dashboard).
- The "View All" link sits top-right of the Dashboard incentive section title.

Wired in v3 baseline (page exists at `/incentives`; "View All" link from dashboard's incentive carousel); carried over post-strip.

**v3 baseline had two additional patterns** (UpcomingPayoutWidget → `/payout` page, and Achievement Unlock Dialog → `/payout` or `/incentives`). Both are out of scope in v1 — `/payout` is a v2 redesign, and `/incentives` has no tabs to land on.

---

## Data Schema

All sample data lives in `lib/data/incentives.ts`. Every page and component imports from this file. **NEVER create ad-hoc sample data inline.** See `PROTOTYPE-TRACKER.md` → Step I-0.5 for the full type and seed data spec.

**Schema canonical source:** the `IncentiveDefinition` type is canonically defined in the **Incentives Manager** prototype's BIBLE (the admin tool is the system of record). This Driver App reads a documented subset. Any change to the schema in either prototype's BIBLE must bump a `schemaVersion: <date>` comment in BOTH BIBLEs. See [Schema Sync Note](../../../../References/Schema%20Sync%20Note.md) at project root for the sync rule.

**Key v1 schema rules:**

- `Trip.incentiveTypes: string[]` — the array of programs this trip counts toward (revised 2026-05-04, was singular `incentiveType: string | null`). `[]` = no active programs. Multi-element arrays render multiple stacked pills in the Pill Row Bottom. NO per-trip bonus dollar fields.
- `IncentiveDefinition` carries `bonusAmount`, `goal`, `timeframe`, `color`, `enabled`, `sortOrder`, `marketScope`, `clientScope`, `trigger`, `title`, `description`. The bonus is paid only when the driver hits `goal`. **No `tierLevel` field in v1** (v3 only).
- `DriverIncentiveProgress` tracks `completedCount` / `scheduledCount` / `goal` per program per driver.

**Driver App reads (subset of canonical schema):**

| Field | Used for |
|---|---|
| `id` | Identifier |
| `title` | Pill label, card heading |
| `description` | Card body |
| `goal` | Progress display (`completed/goal`) |
| `timeframe` | Period label ("This week", "This month") |
| `bonusAmount` | $ display |
| `color` | Pill background |
| `enabled` | Filter out disabled programs |
| `sortOrder` | Display order |
| `trigger` | Display only (e.g., "Short distance trips") |

Driver App does NOT need: market/client scope (filtered server-side; admin-only), schema version metadata.

---

## What NOT to Build (v1)

1. **Tier system / Tier badges / Tier progress section.** No `Tier` enum. No `TierConfig`. No `TierBadge`. No "Bronze/Silver/Gold/Platinum" anywhere in the UI. v3 only.
2. **Leaderboard.** No leaderboard tab on `/incentives`. No `LeaderboardEntry` type. No "Your Placement Card". v3 only.
3. **`/payout` page.** v1 has no dedicated payout page. `UpcomingPayoutWidget` is display-only on the dashboard. Full payout redesign is v2.
4. **Variant Toggle Sheet.** Variants are CEO-locked. No floating "Compare Variants" button, no Sheet picker, no `lib/variants.ts`, no `useVariants()` context, no URL query param parsing for variants.
5. **`achievement-banner` and `banner-wingz-hero` ride card variants.** Only `pill-named-bottom` in v1. The v3 baseline preserves the alternatives.
6. **`dashboard-banner` and `dashboard-widget-integrated` dashboard variants.** Only `dashboard-card-section` in v1.
7. **Achievement Unlock 3-CTA dialog.** v1 has the simpler single-CTA Earned popup (Dismiss only). The 3-CTA version (View Earnings → `/payout`, View Achievements → `/incentives`) requires v2's `/payout` and v3's `/incentives` Leaderboard tab.
8. **Tier-locked $ formula.** No `INCENTIVE_TIER_BONUSES = { gold: 50, silver: 30, bronze: 10 }`. Each incentive has its own `bonusAmount`.
9. **Payment / payout processing flow** — no "Cash out", "Withdraw", "Bank account" buttons.
10. **Wallet / Instant Pay / bank card management.** v2 only.
11. **Per-trip bonus dollar amounts on ride cards or trip detail surfaces.** Bonuses are program-level (driver completes N trips → earns one bonus). The `pill-named-bottom` label is `<Title> Trip` only — no $.
12. **3-state progress bars** with hatched "+N taken" intermediate fill. v1 IncentiveCard progress is BINARY: solid green done vs gray to-go. Caption is `"X done · Y to go"`. (Revised 2026-05-04 — v3 baseline used 3-state; v1 simplifies to binary.) ~~Multi-program banners on a single trip~~ — REMOVED 2026-05-04: trips can now stack multiple pills via `Trip.incentiveTypes: string[]`.
13. **Accounting integration** — no QuickBooks, Stripe Connect, or payroll export UI.
14. **Multi-period historical analytics** — no charts comparing this week vs last week. Current period only.
15. **Admin-side incentive configuration UI.** That's the separate v1 Incentives Manager prototype — NOT part of the Driver App.
16. **Rider-facing surfacing** — no rider app screens.
17. **Real authentication / onboarding flows** — assume the driver is already logged in.
18. **Real backend wiring** — all data comes from `lib/data/incentives.ts`. No fetch calls.
19. **No flow / no events.** This prototype renders STATES from seed data — it does NOT simulate flow. Earned popup is mock-triggered via [DEV] button (added in v1 I-2 polish).
20. **Trip booking / dispatch flow** — drivers see trips already assigned. No accept/reject business logic.
21. **GPS, mapping, or live tracking** — out of scope.
22. **Driver chat / messaging** — no inbox, no thread UI.
23. **Settings/profile editing** — Profile is a placeholder shell only.
24. **Document upload / DMV / compliance UI** — separate project (Driver Onboarding).
25. **Redesigning existing surfaces** — Dashboard, Requests, My Rides, Ride Details, Ride History are REPLICATED, not redesigned. Augment only.
26. **New top-level nav items** — match existing app's bottom nav. The `/incentives` page is stack-pushed.

---

## Step-by-Step Build Plan (HIGH-LEVEL ONLY)

**v1 is strip-based on a duplicate of the v3-baseline v0 chat.** Build one step at a time. Detailed specs are in `PROTOTYPE-TRACKER.md`.

| # | Goal |
|---|------|
| 0 | Re-orientation — upload v1 BIBLE + TRACKER (overwriting v3 versions), v0 confirms scope. No code generated. |
| I-0 | **Mega Strip** — one forward-only deletion pass. DELETE: Variant Toggle infra + 2-of-3 ride card variants + 2-of-3 dashboard variants + Tier system + Leaderboard + `/payout` page + `Trip.revenueAddons`. DOWNGRADE: UpcomingPayoutWidget → display-only; Earned popup → single "Dismiss" CTA. STRIP: tier-coupled fields from `IncentiveDefinition` (`tierLevel`, `INCENTIVE_TIER_BONUSES`, `Tier`, `TierConfig`, `LeaderboardEntry`). STRIP: `/incentives` Tabs wrapper. After this step, the prototype is structurally v1. |
| I-1 | **Schema migration + re-seed** — only ADD step. Add per-incentive admin fields (`color`, `timeframe`, `enabled`, `sortOrder`, `marketScope`, `clientScope`, `trigger`). Rename `targetCount` → `goal`, `name` → `title`. `bonusAmount` is sole $ source. Re-seed 8 incentives. Pill bg = `incentive.color`. Sort by `sortOrder` ASC. |
| I-2 | **Polish + edge states + final QA grep sweep** — empty states, disabled-incentive filtering, [DEV] Earned popup trigger, full grep sweep returning zero hits on stripped tokens. |

---

## Source of Truth

This prototype has **no PRD** — design is being learned through ideation. The source of truth for scope, reuse, and constraints is:

- `Project - Driver Incentives/v1/v1 Scope Lock.md` — CEO-locked v1 scope (drives this BIBLE)
- `Project - Driver Incentives/General Plan.md` — strategy baseline (§5 Delivery Phases)
- `Project - Driver Incentives/Working Plan - Driver Incentives.md` — open questions, decisions log, scope snapshot
- `Project - Driver Incentives/References/Schema Sync Note.md` — canonical schema location (Incentives Manager BIBLE wins)
- `Project - Driver Incentives/References/Trip Type Definitions.md` — working defs for incentive trip types
- `Project - Driver Incentives/References/CEO Feedback - 2026-05-02 - v1 v2 v3 split.md` — verbatim CEO directives
- `Project - Driver Incentives/References/Screenshots/Reference - Existing App/` — existing-app reference screenshots

Each step prompt includes a relevant excerpt from these files. **If a behavior is not in the excerpt, do not invent it.** Mark unclear states as `TODO` in the Tracker rather than guessing.

`schemaVersion: 2026-05-04-v2` (bumps when canonical schema in Incentives Manager BIBLE changes)
