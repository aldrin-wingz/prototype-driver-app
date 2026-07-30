# Reference Screenshots — Wingz NEMT Driver App

Reference captures of the **existing production Wingz NEMT Driver App**. These are the source of truth for replicated surfaces (Dashboard, Requests, My Rides, Ride Details, Ride History) and the styling described in `PROTOTYPE-BIBLE.md` → "Observed Styling From Reference Screenshots" sections.

## Structure

- **`canonical/`** — single source of truth: every reference screenshot in one flat folder. Use this if you want to look at any screenshot directly.
- **`by-step/<step-id>/`** — copies grouped per build step. Each step prompt instructs v0 to read this folder for its visual context. Files are duplicated across step folders intentionally — the same source screenshot may inform multiple steps.

## Step pack contents

| Step | Screenshots | What v0 uses them for |
|------|-------------|------------------------|
| `i-0a/` | 01a/01b/01c (Dashboard), 02a/02b (Requests), 03a (My Rides Needs Action tab), 07 (Ride History) | Replicate scaffold + 4 list surfaces. Build shared RideCard reused across all four. |
| `i-0b/` | 04a/04b (Ride Details Before Taken — top + scrolled), 05a/05b (Ride Details Needs Action — top + scrolled) | Build Ride Details with shared body and state-driven footer/alert swap. |
| `i-2/` | 02a, 02b, 03a | Existing pill family reference (green Single Legs Allowed, yellow Wait For Call, orange/gray Expires, red Not Confirmed). Incentive pill/badge/banner variants extend this family AND surface program-contribution context (Tooltip + Popover) on tap/hover — both built in one step. |
| `i-3/` | 01a, 01c | Dashboard layout for incentive surfacing variants + Upcoming Payout widget placement. |
| `i-4/` | 04a/04b/05a/05b | Ride detail callout variants apply to both Before Taken and Needs Action states. |
| `i-5/` | 02a, 02b, 11 (Filter Requests Modal) | Existing filter pattern is a bottom-anchored modal — the incentive filter extends this modal. |

## Support slice packs (`s-*`)

Captures for the **In-App Support Requests** prototype use `s-*` slots so they never collide with the `01a`–`11` incentives numbering. New captures are dropped in `inbox/` and filed from there — see `inbox/README.md`.

| Slot | Filename | Screen | What it pins down |
|------|----------|--------|-------------------|
| s-01a | `s-01a - Ride Details - Accepted Ride - Swipe To Start.webp` | Accepted ride, nothing swiped | Header reads `#<id> - Accepted Ride`. CTA **SWIPE TO START / A Leg** on near-black `#1F2937`, car glyph in a white circle |
| s-01b | `s-01b - Ride Details - Active Ride - Pick Up Member.webp` | Started, en route to pickup | Header reads `#<id> - Active Ride`. CTA **PICK UP MEMBER / A Leg** on green `#10B981`, person glyph |
| s-01c | `s-01c - Ride Details - Ride - Drop Off Member.webp` | Member on board | Header reads `#<id> - Ride`. CTA **DROP OFF MEMBER / A Leg** on pink `#EC4899`, check glyph |

**Step pack:** `by-step/s-1/` holds all three.

Shared anatomy these three establish for the in-progress detail surface:
- **Swipe sequence is Start → Pick Up → Drop Off.** There is no "arrived" swipe.
- **Header title changes per swipe stage** — `Accepted Ride` → `Active Ride` → `Ride`.
- **Action row is 4 controls + More**, split into equal cells by vertical hairlines: green ring w/ turn arrow, pink ring w/ turn arrow, solid navy phone, solid navy chat, then `More` as plain text.
- **Leg fare sits on the time row**, right-aligned, as `$52.52 Accepted by you` — not stacked beneath.
- One "A Leg" = **two timeline rows** (Est Pick-up Time + Appointment Time). The swipe sequence belongs to the leg, anchored on the pickup row.
- **No swipe history is shown.** The prototype's `SWIPES` block is net-new, added so a driver can see a missing swipe; it renders only once a swipe exists or one was skipped.

Still needed: the **open `More` menu** (blocks the ride options menu build — container pattern is undecided), and the swipe control's own interaction.

## Naming convention

Canonical filenames follow `<slot>(<sub>) - <Surface> - <Detail>.png`:
- `01a - Dashboard - This Month.png`
- `04b - Ride Details - Before Taken - Scrolled.png`
- `11 - Filter Requests Modal.png`

If a slot has multiple captures (top + scrolled, or different states), they get sub-letter suffixes (a, b, c). See `PROTOTYPE-BIBLE.md` → "Reference Screenshot Inventory" for the full surface map and which slot each screenshot informs.

## Steps without reference screenshots

- `0` (Setup) — no screenshots
- `I-0.5` (Schema + Seed Data) — no UI yet
- `I-1` (Variant Toggle infra) — net-new pattern, no screenshot
- `I-6` (Tier System) — net-new screen
- `I-7` (Leaderboard) — net-new screen
- `I-8` (Polish + Edge States + Achievement Unlock Dialog) — net-new states (empty, period-ended, payout-pending, ineligible, achievement unlock + tier unlock dialogs)

For these steps, v0 follows `PROTOTYPE-BIBLE.md` design system + the existing-app styling already absorbed from earlier steps.

## Step renumbering history (2026-04-28)

Two pivots happened on 2026-04-28:

1. **Original I-3 (Revenue + Bonus Display variant set) deleted** because bonuses are **program-level**, not per-trip. A trip "counts toward" an incentive program; the bonus is earned only when the program threshold is hit. Per-trip "+$Y bonus" surfacing was misleading and removed.
2. **Standalone I-2.5 (Trip Contribution Surfacing) merged into I-2** because the variant treatment + its interaction (tap → popover with progress + program-level bonus) form one cohesive feature. Splitting them created a refactor cycle (basic Tooltip in I-2 then upgrade in I-2.5). I-2 now builds both in one v0 generation pass.
3. **I-6 / I-7 swapped** so Tier System (which finalizes `TierBadge`) ships BEFORE Leaderboard. This avoids the previous stub-then-refine cycle (Leaderboard built TierBadge stub, Tier System then refined it; now Leaderboard consumes the finalized component directly).

Renumbering map (final, after all 2026-04-28 pivots):
- I-3 (Revenue + Bonus) → DELETED
- I-2.5 (Trip Contribution Surfacing) → MERGED into I-2 (folder `i-2.5/` removed; same screenshots already in `i-2/`)
- I-4 (Dashboard Surfacing + Upcoming Payout) → I-3
- I-5 (Ride Detail Callout) → I-4
- I-6 (Filter) → I-5
- I-7 (Leaderboard) → I-7 (was briefly I-6 between pivots; final: I-7)
- I-8 (Tier System) → I-6 (was briefly I-7 between pivots; final: I-6)
- I-9 (Polish) → I-8

Final step order: 0 (Setup) → I-0a → I-0b → I-0.5 → I-1 → I-2 (variants + contribution popover merged) → I-3 → I-4 → I-5 → I-6 (Tier) → I-7 (Leaderboard) → I-8 (Polish + Achievement Unlock).
