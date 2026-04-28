# Driver Incentives — NEMT Driver App — Prototype Bible

> **IMPORTANT:** This file lives in the v0 repo. If your context compacts or you lose track of what was built, RE-READ this file and `PROTOTYPE-TRACKER.md` before continuing.

---

## What We're Building

A mobile-first **variant-comparison prototype** that overlays a Driver Incentives layer on top of the existing **Wingz NEMT Driver App** shell. The existing Dashboard, Requests, My Rides, Ride Details (before-taken + needs-action / in-progress), and Ride History are replicated faithfully and then augmented with:

- **Pill / Badge / Banner** on ride cards signaling that a trip "counts toward" a driver incentive program — each variant taps to reveal a program-contribution popover/tooltip showing progress + program-level bonus
- **Dashboard incentive surfacing** (variant set) + a **Upcoming Payout widget** (read-only weekly projection)
- **Ride details incentive callout** (variant set) on the ride detail screens
- **Filter trips by incentive** in Requests
- **Tier system** + **Leaderboard** + **Achievement Unlock dialog** (net-new, single-design)

For surfaces where multiple UI treatments are worth comparing (pill / badge / banner, dashboard surfacing, ride detail callout), the prototype includes a **global Variant Toggle** that switches between named variants with URL + localStorage persistence. Stakeholders review variants side-by-side before committing.

**This is an OVERLAY on the existing app, not a rebuild.** Do not redesign the dashboard or trip lists from scratch. Replicate the existing surfaces faithfully (per Reference Screenshots), then layer the incentive pieces on top.

**Bonus model is PROGRAM-LEVEL, not per-trip.** A trip "counts toward" one or more incentive programs. The driver earns a bonus only when they hit the program's `targetCount` (e.g., complete 5 short-notice trips → earn $8). The `Trip` data type carries `incentiveTypes: IncentiveType[]` only — never a per-trip bonus dollar amount. Bonus dollar values appear ONLY at the program level: in the I-2 contribution popover/tooltip, on Dashboard incentive cards (once per program), in the Upcoming Payout widget (sums completed-program bonuses), and in the Achievement Unlock Dialog when a program completes.

---

## Template

`v0/chwang-3595-b67e8ee3` — All base UI components exist at `components/ui/`. ALWAYS import from `@/components/ui/[component]` — NEVER recreate base components.

---

## Branding

- **Product name:** Wingz NEMT Driver App
- **Wingz logo asset:** `/WINGZLOGO2.png` at the v0 repo root. Used by:
  - I-2 `pill-named-bottom`: small black/green Wingz mark inside the pill, left of the label
  - I-2 `badge-corner-flag`: green Wingz logo on a black square (~28×28px) at the top-right of each ride card
  - I-2 `banner-wingz-hero`: green Wingz logo at the left of a black-background banner at the top of each ride card
  - Existing-app header (top-left red "W" tile per the reference screenshots — replicate the existing styling but accept the user-supplied logo if it differs)
- **Header:** Per reference screenshot 01a — dark slate background, white centered title, top-left Wingz mark on a circular tile, top-right icons per surface.
- **Bottom Nav:** Match the existing-app order — `Home` / `Requests` / `Planner` / `My Rides` / `Options`. Active tab uses teal/green icon + label; inactive tabs are dark gray. Do NOT introduce new top-level tabs. Incentive-related navigation goes through deep-links to Requests, never as a new tab.
- **Section Headings (project-specific copy when adding incentive UI):**
  - "Driver Incentives" (section header on the dashboard surfacing variants)
  - "Upcoming Payout" (the new dashboard widget)
  - "Tier Progress"
  - "Leaderboard"
- **Pill / Badge / Banner labels (I-2):**
  - Pill / Banner: `<Incentive Name> Trip` — e.g., `Short Notice Trip`, `Door to Door Trip`, `Standing Order Trip`, `Short Distance Trip`
  - Badge tooltip (I-2): "Counts toward your <Incentive Name> incentive."
- **Trip Contribution copy (I-2 popover/tooltip — layered on top of all 3 pill/badge/banner variants):**
  - In-progress program: "Counts toward <Incentive Name> — <completed>/<target> trips · Earn $<bonusAmount> when complete"
  - Completed program: "✓ <Incentive Name> — Completed · $<bonusAmount> added to next payout"
- **Empty state messages:**
  - Dashboard incentive section (no incentives): "No active incentives this period. Check back soon."
  - Requests filter (zero results): "No incentive-eligible trips right now."
  - Leaderboard (no period yet): "No leaderboard for this period yet."
  - Upcoming Payout (no completed programs): "No bonuses earned yet this week. Complete an incentive program to earn one."
- **Achievement Unlock dialog (fires on program completion):**
  - Title: "Bonus Earned!"
  - Body: "You completed [Incentive Name] — $XX added to your next payout."
  - Primary CTA: "View Earnings" (closes dialog and scrolls Dashboard to the `#upcoming-payout` anchor)
  - Secondary CTA: "Dismiss"
  - Auto-dismiss after 6 seconds
- **Tier Unlock dialog:**
  - Title: "You've reached <Tier> tier!"
  - Body: "Your bonus multiplier is now ×<multiplier>." + 🎉 emoji
  - Auto-dismiss after 4 seconds or on tap
- **Button labels:**
  - "View Requests" (deep-link CTA from dashboard incentive cards)
  - "See Leaderboard"
  - "Clear Filter"
  - "View Earnings"

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

**Extended colors (project-specific — use only where called out):**

- `[EXTENDED: incentive-pill-short-notice]` — `#F59E0B` (amber)
- `[EXTENDED: incentive-pill-short-distance]` — `#3B82F6` (blue)
- `[EXTENDED: incentive-pill-door-to-door]` — `#8B5CF6` (violet)
- `[EXTENDED: incentive-pill-standing-order]` — `#10B981` (Wingz primary)
- `[EXTENDED: bonus-revenue-accent]` — `#10B981` (used in the Upcoming Payout widget breakdown + Achievement Unlock dialog)
- `[EXTENDED: tier-bronze]` — `#B45309`
- `[EXTENDED: tier-silver]` — `#94A3B8`
- `[EXTENDED: tier-gold]` — `#EAB308`
- `[EXTENDED: tier-platinum]` — `#06B6D4`

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

- Revenue green (upcoming/active trips): `~#10B981` — used on Requests, My Rides, Dashboard previews
- Revenue blue (Ride History completed trips): `~#1D4ED8` to `~#2563EB`
- Confirmation alert (Ride Details Needs Action): `alert-warn-bg ~#FEF3C7` / border `~#F59E0B` / text `~#92400E`
- Swipe-to-Reject (Before Taken footer): pink/coral soft fill
- Swipe-to-Accept (Before Taken footer): green `~#10B981`
- "I REACHED OUT TO CONFIRM" CTA (Needs Action footer): red/coral fill, white text + phone icon

**Typography / Radius:** Template defaults. **Mobile-first — portrait 375×812 viewport baseline.** Tablet landscape is stretch.

**Design System Directive:** Follow the Wingz template styling exactly, with one override: for surfaces being replicated from the existing app (Dashboard, Requests, My Rides, Ride Details, Ride History), the observed colors/styling above take precedence over template defaults where they conflict — specifically the pill family colors, time-anchor circles, blue-revenue-on-history, and the swipe footer / red CTA on Ride Details. For NEW surfaces (Variant Toggle, Leaderboard, Tier section, edge states), the Wingz template governs. Extended incentive colors are valid only for incentive-pill backgrounds (`pill-named-bottom`), bonus accents in the Upcoming Payout widget, and tier badges.

---

## Reference Screenshot Inventory

**v0 reads reference screenshots directly from this repo at `references/screenshots/`.** Two organizations exist side-by-side:

- **`references/screenshots/canonical/`** — single source of truth: every reference screenshot in one flat folder.
- **`references/screenshots/by-step/<step-id>/`** — same screenshots pre-grouped per build step. Each step prompt cites the matching folder.

A `README.md` at `references/screenshots/README.md` describes the structure and per-step contents.

**Canonical authoring location** (outside the v0 repo): `Project - Driver Incentives/References/Screenshots/Reference - Existing App/` in the agent's vault. The `canonical/` and `by-step/` folders here are mirrored from that location and uploaded to v0 alongside this Bible.

v0 should treat these screenshots as own-brand captures of the existing production app — replicate styling, layout, and patterns closely while applying the Wingz template design system per the rules above.

**Surface map** (slot → step folders that contain this file):

| Slot | Filename | Used in | Step folders | What v0 uses it for |
|------|----------|---------|--------------|----------------------|
| 01a | `01a - Dashboard - This Month.png` | I-0a, I-3 | `i-0a/`, `i-3/` | Home default — earnings card "This Month" with chevron toggle, 3-stat row, upcoming-trip prompt, "New Requests" preview |
| 01b | `01b - Dashboard - Last Month.png` | I-0a | `i-0a/` | "Last Month" earnings state — confirms left/right chevrons toggle period |
| 01c | `01c - Dashboard - Scrolled.png` | I-0a, I-3 | `i-0a/`, `i-3/` | Scrolled view — "Next Accepted Ride" section appears below New Requests preview |
| 02a | `02a - Requests - Single Legs Allowed Pill.png` | I-0a, I-2, I-5 | `i-0a/`, `i-2/`, `i-5/` | Requests list with green "Single Legs Allowed" pill + orange "Expires in 4 hours" pill |
| 02b | `02b - Requests - Will-Call Pill.png` | I-0a, I-2, I-5 | `i-0a/`, `i-2/`, `i-5/` | Requests list with yellow "Wait For Call" pill + blue Appointment Time anchor + gray expiration pill |
| 03a | `03a - My Rides - Needs Action Tab.png` | I-0a, I-2 | `i-0a/`, `i-2/` | My Rides 3-tab row (`In Progress` / `Needs Action` / `Upcoming`); cards on Needs Action carry red `Not Confirmed` pill |
| 04a | `04a - Ride Details - Before Taken - Top.png` | I-0b, I-4 | `i-0b/`, `i-4/` | Top of detail screen — header, map preview, leg list begins; pink/green swipe footer |
| 04b | `04b - Ride Details - Before Taken - Scrolled.png` | I-0b, I-4 | `i-0b/`, `i-4/` | Scrolled — full leg cards, Notes line, gray expiration pill, sticky swipe footer |
| 05a | `05a - Ride Details - Needs Action - Top.png` | I-0b, I-4 | `i-0b/`, `i-4/` | Canonical "after-taken" state — "Accepted Ride" subtitle, amber "Confirmation required" alert, action toolbar, sticky red CTA |
| 05b | `05b - Ride Details - Needs Action - Scrolled.png` | I-0b, I-4 | `i-0b/`, `i-4/` | Same trip scrolled, sticky red CTA persists |
| 06 | (covered by 02a + 02b) | I-2 | (in `i-2/` via 02a/02b) | Existing pill family captured inline on Requests cards — incentive surfaces extend this family |
| 07 | `07 - Ride History.png` | I-0a | `i-0a/` | Completed-trips list — separate stack-pushed screen (no bottom nav), revenue rendered in BLUE, county tags blue, no bottom pill |
| 11 | `11 - Filter Requests Modal.png` | I-5 | `i-5/` | Existing filter modal — Pickup Location/Day/Client dropdowns, Sort by, Mode, Clear Filters, teal Update CTA |

---

## Observed Styling From Reference Screenshots

These details inform v0 directly when replicating the existing surfaces (I-0a, I-0b) and when layering incentive UI on top of them later.

### Header (all screens)

- Single line, dark slate background (`~#1F2937`), white centered title.
- Title text per screen: `Home`, `Requests`, `My Rides`, `Ride Details`, `Ride History`. Ride Details has no centered title; instead a `<` back chevron + ride ID + state subtitle ("Will-Call Ride" or "- Accepted Ride").
- Top-left: small red Wingz "W" mark on a circular white tile (existing-app branding).
- Top-right (varies):
  - Home → single circular refresh icon
  - Requests → filter (funnel) icon + refresh icon
  - My Rides → none
  - Ride Details → none
  - Ride History → filter (funnel) icon + refresh icon
- Header height: standard ~56px. White hairline divider below header before content.

### Bottom Nav

- 5 tabs left-to-right: `Home` / `Requests` / `Planner` / `My Rides` / `Options`.
- Outline icons; active tab = teal/green fill on icon + green label; inactive = dark gray icon, no label color shift.
- Icon set: home (house outline), requests (clipboard with star), planner (small calendar), my rides (clipboard with checkmark), options (hamburger).
- White nav background, faint top border. Always visible (sticky bottom) EXCEPT on Ride Details (sticky footer overlays nav) and Ride History (stack-pushed screen).

### Dashboard / Home Stack (slots 01a / 01b / 01c)

Stacked vertical sections on a light gray page background (`~#F9FAFB`):

1. **Earnings card** (top, large) — period label (`This Month` / `Last Month`) toggled by `<` `>` chevrons flanking the amount; large bold black `$X.XX`; sub-label `EARNINGS` (small caps gray); 3-column stat row (`Trips` / `On-Time Performance` / `Send Backs`).
2. **"Confirm Your Upcoming Trip" prompt** (green-tinted card, `~#10B981` light wash) — green checkmark icon + body text.
3. **"New Requests" section header + `View All` link** + ride card preview using the shared `RideCard` component.
4. (slot 01c) **"Next Accepted Ride" section header** + ride card with the same anatomy plus a red `Not Confirmed` pill.

Incentive surfacing variants in I-3 layer ABOVE "New Requests" or augment the existing earnings widget. Do not push these existing sections off-screen.

### Ride Card Anatomy (Requests + My Rides + Ride History + Dashboard previews)

Single white rounded card (~12px radius, ~16px padding, subtle 1px shadow). Vertical sections:

1. **Date line** — bold black: `When: Thu, Apr 30, 2026`.
2. **Rider line** — labels in muted gray, values in black: `Rider: Andrew Test`.
3. **Client line** — `Client: Verida` (right-side teal expand `↗` icon aligned with revenue).
4. **Time anchor block** — small filled icon + bold label + time + city/county on the right (yellow=Wait For Call, blue=Appointment Time, green=Scheduled Pick-up Time, black=Est Pick-up Time).
5. **Address lines** under each anchor.
6. **Revenue** — top-right corner of card, bold; **green** for upcoming/active trips, **blue** for completed (Ride History). Below revenue: distance string (e.g., `8883.5 mi away`).
7. **Notes line** — italic light gray.
8. **Pill row** (bottom) — horizontal pills, fully-rounded (~999px), ~12px font, sentence case. Multi-pill cards wrap to a second row.

The bottom pill row is where `pill-named-bottom` (I-2) slots in alongside existing pills.

### My Rides Tabs (slot 03a)

- 3-tab row directly under the header: `In Progress` / `Needs Action` (default active) / `Upcoming`.
- Active tab = bold black with thin black underline below the label. Inactive = lighter gray, no underline.
- Cards on Needs Action carry the red `Not Confirmed` pill at the bottom.

### Ride Details — Before Taken (slots 04a / 04b)

- Header: `<` back + bold ride ID + subtitle "Will-Call Ride" or similar.
- **Map preview** ~30% screen height, OSM-style (no Wingz overlay).
- Trip metadata card: When / Rider / Client / Leg.
- Leg cards (one per leg): yellow Wait For Call clock icon (or blue Appointment / green Scheduled / black Est), bold time, per-leg revenue (green), addresses, county/city.
- Notes paragraph + gray "Expires in N days" pill at the bottom of the last leg card.
- **Sticky footer (overlays bottom nav):** pink/coral "Swipe to Reject" ↔ green "Swipe to Accept", visually rendered, NOT functional.

### Ride Details — Needs Action (canonical "after-taken" state, slots 05a / 05b)

- Header: `<` back + bold ride ID + subtitle "- Accepted Ride".
- **Amber "Confirmation required" alert banner** between header and trip metadata card. Soft amber/yellow rounded card with ⚠️ icon, bold heading "Confirmation required", body "This ride has not been confirmed yet. Please call the ride client first."
- Map preview region (same).
- Trip metadata card + leg cards (same anatomy).
- Notes line + red `Not Confirmed` pill (slot 05b shows it bottom of the trip card).
- **Bottom action row** — 4 small green-outline circular icon buttons: Reply / Phone / SMS / More.
- **Sticky red CTA** at the very bottom: full-width pill button, red/coral fill, white text "I REACHED OUT TO CONFIRM" with sub-label "A Leg" and white phone icon. Persists on scroll. Visually rendered, NOT functional.

### Ride History (slot 07)

- Header: `<` back + `Ride History` title + filter+refresh icons.
- **No bottom nav visible** (stack-pushed screen, not a bottom-nav tab — confirm entry point during I-0a).
- Cards use the shared anatomy with these completed-trip differences:
  - **Revenue rendered in BLUE** (`~#1D4ED8` / `~#2563EB`)
  - Multiple legs as a continuous timeline within one card (green Pickup + blue Appointment + green Scheduled Pick-up Time for return leg)
  - County tags rendered in **blue text**
  - **No bottom pill** on completed cards

### Filter Modal (slot 11)

- Bottom-anchored modal sheet (NOT a chip/segmented control).
- Trigger: funnel icon top-right of Requests header.
- White sheet, top-left `X`, centered bold title `Filter Requests`.
- Body fields (vertical stack of dropdowns): Pickup Location, Day, Client, Sort by, Mode.
- Footer: `Clear Filters` text-link (left), green pill `Update` button (right) — Wingz primary color.
- Dropdown style: rounded ~8px corners, white bg, gray border, downward chevron.

The I-5 incentive filter EXTENDS this modal (add an `Incentive:` dropdown row inside) OR adds a chip row above the request list — pick the cleanest option for the deep-link UX. Do NOT replace the existing filter modal.

---

## Variant Toggle Pattern

The prototype includes a **global Variant Toggle** that lets stakeholders switch between named UI variants per surface during review.

**Toggle implementation:**

- Floating "Variants" pill button fixed top-right of every screen (above the header on mobile, top-right on tablet). Use primary `#10B981` background, white text.
- Tap → opens a `Sheet` titled "Compare Variants".
- Sheet contents: 3 sections (Pill / Badge / Banner, Dashboard, Ride Detail Callout), each with a `RadioGroup` listing variants from `VARIANT_LABELS`.
- Selections persist to:
  - `localStorage` (key `driver-incentives-variants`)
  - URL query params (e.g., `?pill=banner-wingz-hero&dashboard=banner&detail=detail-section-pill`)
- URL params take precedence over localStorage on initial load.
- Default values come from `DEFAULT_VARIANTS` in `lib/variants.ts`.
- "Reset to Defaults" button clears URL + localStorage.
- Variant state is exposed via a React Context / `useVariants()` hook so components read without prop-drilling.

**Variant-set surfaces:**

| Surface | Step | Variant Count | Variant IDs |
|---------|------|---------------|-------------|
| Pill / Badge / Banner on ride card | I-2 | 3 | `pill-named-bottom`, `badge-corner-flag`, `banner-wingz-hero` |
| Dashboard incentive surfacing | I-3 | 2–3 | `dashboard-banner`, `dashboard-card-section`, `dashboard-widget-integrated` |
| Ride details incentive callout | I-4 | 3 | `detail-inline-badge`, `detail-section-pill`, `detail-map-banner` |

**Single-design surfaces (no toggle entry):** Filter (I-5), Tier System (I-6), Leaderboard (I-7), Polish + Edge States + Achievement Unlock Dialog (I-8). Trip-contribution popover/tooltip is bundled into I-2 alongside the pill/badge/banner variants — single design, layered on top of all 3 surfaces.

**Variant labels in toggle UI:** human-readable. See `lib/variants.ts → VARIANT_LABELS` for the strings.

---

## Key Shared Components

These patterns are reused across multiple steps:

- **VariantToggle** — composed from `Sheet` + `RadioGroup` + `Button`. Built once in I-1, used everywhere after.
- **IncentiveBadgeRenderer** — composed from `Badge` (+ Wingz logo asset for `badge-corner-flag` and `banner-wingz-hero`) using `[EXTENDED: incentive-pill-*]` color tokens for `pill-named-bottom`, and the **Wingz black + green palette** for `badge-corner-flag` / `banner-wingz-hero`. Variant-set in I-2. **Extends Wingz Ride Card Pill management system — do NOT introduce a parallel pill model.**
- **ProgramContributionIndicator** — composed from `Tooltip` + `Popover`. Built INSIDE I-2 alongside the pill/badge/banner variants — wraps `IncentiveBadgeRenderer` so all 3 variants surface program progress + program-level bonus on tap/hover. Single design (does NOT participate in the variant toggle). NEVER shows a per-trip bonus.
- **DashboardIncentiveSection** — composed from `Card` + `Progress` + `Button` (deep-link). Variant-set in I-3. **Each card deep-links to Requests with `?incentive=<type>` query param.**
- **UpcomingPayoutWidget** — composed from `Card` + bold `$amount` + breakdown row + tappable `Sheet` for per-program breakdown. Single-design in I-3. Anchor id `#upcoming-payout`. **Read-only — no payout-action buttons.** Sums program-level bonuses for programs the driver completed this period. Achievement Unlock Dialog "View Earnings" CTA scrolls to this widget.
- **RideDetailIncentiveCallout** — composed from `Card` (`detail-section-pill`) + `Badge` (`detail-inline-badge`) + `Sheet` (`detail-map-banner` expand). Variant-set in I-4.
- **TierBadge** — composed from `Badge` + `Avatar` accent with `[EXTENDED: tier-*]` color tokens. Single-design in I-6 (Tier System), used in I-7 leaderboard rows and I-3 dashboard.
- **ProgressMeter** — composed from `Progress` + caption row (`<completed>/<target>`). Used in I-3, I-4, and I-6.
- **AchievementUnlockDialog** — composed from `Dialog` + 🎉 emoji + "View Earnings" / "Dismiss" CTAs. Built in I-8. Fires when a driver completes a program threshold (mock-triggered via [DEV] button since prototype has no real end-trip flow).

---

## Deep-Link Pattern (Dashboard → Requests)

When a driver taps an incentive card on the Dashboard, the app navigates to **Requests** with the filter pre-applied:

- URL: `/requests?incentive=<type>` (e.g., `?incentive=short-notice`)
- Requests page reads the query param on mount and initializes the filter state to "Incentive-Eligible + <type>"
- A small chip near the filter row shows "Filtered from Dashboard: <Type>" with an `X` to clear (clearing returns to "All Trips" + clears query param + clears Type)
- Clearing the filter does NOT navigate back to Dashboard — driver stays on Requests with all trips visible.

This pattern is wired in I-3 (deep-link source) + I-5 (filter target with URL param init).

---

## Data Schema

All sample data lives in `lib/data/incentives.ts` and `lib/variants.ts`. Every page and component imports from these files. **NEVER create ad-hoc sample data inline.** See `PROTOTYPE-TRACKER.md` → Step I-0.5 for the full type and seed data spec.

**Key schema rule (PROGRAM-LEVEL BONUSES):**

- `Trip` carries `incentiveTypes: IncentiveType[]` — the programs this trip counts toward. NO per-trip bonus dollar fields.
- `IncentiveDefinition` carries `bonusAmount` + `targetCount` — the bonus is paid only when the driver hits the threshold.
- `DriverIncentiveProgress` tracks `completedCount` / `assignedCount` / `targetCount` per program per driver per period.

---

## What NOT to Build

1. **Standalone "Incentives Catalog" page.** Incentives surface inline on Dashboard + ride cards + ride detail. Dashboard cards deep-link to filtered Requests.
2. **Payment / payout processing flow** — no "Cash out", "Withdraw", or "Bank account" buttons. Earnings are display-only. **(Read-only "Upcoming Payout" projection on the dashboard IS allowed — it's display, not processing.)**
3. **Per-trip bonus dollar amounts on ride cards or trip detail surfaces.** Bonuses are program-level (driver completes N trips of an incentive type → earns one bonus). Surfacing "+$X" on a per-trip pill/badge/banner is misleading and forbidden. Bonus dollar values appear ONLY in: (a) the I-2 contribution popover/tooltip (layered on all 3 pill/badge/banner variants), (b) Dashboard incentive cards (I-3, ONCE per program), (c) Upcoming Payout widget (I-3 sum), (d) Achievement Unlock Dialog (I-8).
4. **Accounting integration** — no QuickBooks, Stripe Connect, or payroll export UI.
5. **Multi-period historical analytics** — no charts comparing this week vs last week vs last month. Current period only.
6. **Admin-side incentive configuration UI** — no "Create incentive", "Edit eligibility rules", or "Set bonus amount" forms.
7. **Rider-facing surfacing** — no rider app screens.
8. **Rider notifications** — no push/SMS/email to riders about driver incentives.
9. **Real authentication / onboarding flows** — assume the driver is already logged in.
10. **Real backend wiring** — all data comes from `lib/data/incentives.ts` and `lib/variants.ts`. No fetch calls.
11. **Trip booking / dispatch flow** — drivers see trips already assigned. No accept/reject business logic.
12. **GPS, mapping, or live tracking** — out of scope. Map preview on Ride Details is a placeholder image or OSM iframe; NO live map SDK.
13. **Driver chat / messaging** — no inbox, no thread UI.
14. **Settings/profile editing** — Profile (if replicated) is a placeholder shell only.
15. **Document upload / DMV / compliance UI** — separate project (Driver Onboarding).
16. **Redesigning existing surfaces** — Dashboard, Requests, My Rides, Ride Details, Ride History are REPLICATED, not redesigned. Augment only.
17. **New top-level nav items** — match existing app's nav. The deep-link from dashboard cards routes to Requests; no "Incentives" tab.
18. **A separate "Started Trip / On-Route" Ride Details state** — the Needs Action / Accepted Ride state IS the canonical "after-taken" surface for this prototype. A truly-started trip would look essentially the same for incentive-surfacing purposes.

---

## Step-by-Step Build Plan (HIGH-LEVEL ONLY)

Build ONE step at a time. Detailed specs are in `PROTOTYPE-TRACKER.md`. Two required navigation paths must work end-to-end after I-0b: (1) Requests → Ride Details (Before Taken); (2) My Rides Needs Action → Ride Details (Needs Action).

| # | Goal |
|---|------|
| 0 | Setup — read this file + Tracker, confirm understanding, no code generated |
| I-0a | Shell replication — scaffold (Header, BottomNav, routing) + 4 list surfaces (Dashboard, Requests, My Rides, Ride History). Build shared `RideCard` once and reuse 4×. NO ride detail screens, NO incentive UI. |
| I-0b | Shell replication — Ride Details with both states merged (Before Taken + Needs Action / In Progress sharing the trip-detail body, swapping only the bottom region). Wire two nav paths. NO incentive UI. |
| I-0.5 | Schema + seed data (`lib/data/incentives.ts` + `lib/variants.ts`). Bonuses are PROGRAM-level — Trip carries `incentiveTypes` only. |
| I-1 | Variant Toggle infrastructure (global `Sheet` + URL/localStorage persistence; 3 surfaces: pill / dashboard / detail) |
| I-2 | Pill / Badge / Banner on ride card — variant set (3 fun designs: `pill-named-bottom`, `badge-corner-flag`, `banner-wingz-hero`) **+ ProgramContributionIndicator** (single-design Tooltip + Popover layered on all 3 variants showing program progress + program-level bonus on tap/hover). NO dollar amount on any pill/badge/banner surface; bonus appears only inside the popover/tooltip. |
| I-3 | Dashboard incentive surfacing — variant set (2–3 designs) + deep-link to Requests filter + **Upcoming Payout widget** (read-only, sums program-level bonuses for completed programs) |
| I-4 | Ride details incentive callout — variant set (3 designs: badge / pill / map-banner) on Ride Details (before-taken + needs-action / in-progress) |
| I-5 | Filter trips by incentive in Requests (single design — extends existing modal pattern; supports `?incentive=` URL param init) |
| I-6 | Tier system + tier-based bonus boost (single design — net-new section, finalizes `TierBadge`, wires multiplier into dashboard projected bonus) |
| I-7 | Leaderboard (single design — net-new screen, anonymized handles, consumes finalized `TierBadge` from I-6) |
| I-8 | Polish + edge states + **Achievement Unlock Dialog** (fires on program completion: "Bonus Earned!" → "View Earnings" CTA scrolls to Upcoming Payout) + Tier Unlock Dialog |

---

## Source of Truth

This prototype has **no PRD** — design is being learned through ideation. The source of truth for scope, reuse, and constraints is:

- `Project - Driver Incentives/General Plan.md` — strategy baseline (§3 Scope, §4 Reuse, §6 Decision Framework, §7 Risks)
- `Project - Driver Incentives/Working Plan - Driver Incentives.md` — open questions, decisions log, scope snapshot
- `Project - Driver Incentives/References/Trip Type Definitions.md` — working defs for the 4 incentive trip types
- `Project - Driver Incentives/References/Screenshots/Reference - Existing App/` — existing-app reference screenshots (mirrored into this repo at `references/screenshots/`)

Each step prompt includes a relevant excerpt from these files. **If a behavior is not in the excerpt, do not invent it.** Mark unclear states as `TODO` in the Tracker rather than guessing.
