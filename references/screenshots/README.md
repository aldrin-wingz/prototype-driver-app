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

| s-02a | `s-02a - Form Request - Late Pickup Reason.png` | The app's existing "Late pickup reason" form | **The base pattern for every support form.** Bottom sheet w/ drag handle · bold title + ✕ · pink context callout (`Scheduled time` / `N mins late`) · required = red asterisk · optional-ness in the label text · Cancel (outline) + case-specific primary · **primary DISABLED while required fields are empty** (which is why "Save Reason" is muted green) |
| s-03a | `s-03a - More Options - Grid.jpg` | The screen behind `More` | **Full pushed page, not a sheet.** Back chevron + centred "More Options", no bottom nav. Two-column icon grid, hairline dividers, odd last tile full-width. 7 actions: Map to Pickup · Map to Drop-off · Call Member or Support · Email Support · Add Event To Calendar · Member No-Show · Send Back Trip |

### Member No-Show pack (`s-06*`)

Filed 2026-09-03. **The source of truth for the Rider No-Show branch** (`luis/rider-no-show`) — the production screen and both of its refusals.

| Slot | Filename | Screen | What it pins down |
|------|----------|--------|-------------------|
| s-06a | `s-06a - Member No-Show - Empty.jpg` | The Member No-Show screen, untouched | **A pushed page, not a sheet.** Back chevron + centred title · bold `No-Show Type:` + a `Select:` box · bold `Driver Signature` + a tall **full-bleed** canvas · centred **blue** Clear · full-width teal Submit pinned at the bottom. ⚠️ **Submit is bright/enabled with nothing filled** — production lets you submit and then refuses |
| s-06b | `s-06b - Member No-Show - No-Show Type Picker.jpg` | The type picker, open | **All three options: `Member Not Home` · `Cancel At Door` · `Member Not Ready`.** A native action sheet, blue text, options-then-gap-then-Cancel — the same shape as `s-06e`, and nothing sits in the gap, which is how we know the list is complete |
| s-06c | `s-06c - Member No-Show - Wait 10 Minutes Refusal.jpg` | Guardrail 2 refusing | Title **"Unable to complete action"** + *"Please wait at least 10 minutes at the pick up location before requesting a Member no-show."* + a single teal **OK**. ⚠️ Type is already picked and the signature already drawn — **the check runs at Submit, after the work** |
| s-06d | `s-06d - More Options - Ready To Start Or En-Route Refusal.jpg` | Guardrail 1 refusing | **No title** — just *"Member No-Show is only allowed for rides that are ready to start or en-route."* + teal OK. Fires over the More Options grid, and proves the **tile is always present** rather than hidden |
| s-06e | `s-06e - More Options - Call Member Or Support Sheet.jpg` | The Call action sheet | Not a support surface — filed as the **control comparison** for `s-06b`. Four options (Rider Phone · Pickup Phone · Dropoff Phone · Wingz Support), then the gap, then Cancel |

**Step packs:** `by-step/s-1/` (three swipe stages) · `by-step/s-2/` (form pattern) · `by-step/s-3/` (More Options) · `by-step/s-6/` (Member No-Show, all five).

### In-App Chat pack (`c-*`)

Filed 2026-09-11. **The source of truth for the `luis/in-app-chat` placement study.** Two groups: where the chat bubble is and is not on the active-driver screens (`c-01*`), and what the chat actually looks like in the Onboarding flow (`c-02a`–`c-04a`).

| Slot | Screen | What it pins down |
|------|--------|-------------------|
| c-01a | Home | Chat bubble **top-left**, no badge at zero unread. Refresh top-right. Confirms the bubble is real chrome, not a prototype invention |
| c-01b | Requests | Bubble top-left; filter (with a red **1** count) + refresh top-right. The crowded case |
| c-01c | My Rides | Bubble top-left, refresh top-right, four tabs with superscript counts |
| c-01d | Planner | ⛔ **No bubble, and no standard header** — a date-picker bar instead. Planner is outside the rule |
| c-01e | Options | ⛔ **No header icons at all.** Support is a `Contact Support` LIST ROW with a phone glyph, not a bubble |
| c-01f | Ride Details | ⛔ **Back chevron owns the left slot**, refresh right. No bubble on any stack-pushed screen |
| c-02a | Onboarding — Your application | The chat entry point in onboarding: a **green `?`-in-speech-bubble, top-right** |
| c-03a | In-App Chat — inbox | ⭐ **A BOTTOM SHEET over a dimmed backdrop**, not a route. Centred bold `Messages` + ✕. Row = circular Wingz-logo avatar, bold name, one preview line with a green **`Draft:`** prefix. **No timestamp and no unread badge on the row** |
| c-05a | Zendesk Support Chat — inbox | ⭐ **Zendesk opens its OWN conversation list** — one row per topic, each resolvable. Visually a different application: near-black rows under a **teal `#26484C`** bar, indigo Wingz mark, white ✕. That contrast is the strongest existing signal that these are two systems |
| c-04a | In-App Chat — thread | ⭐ ‹ back / centred title / ✕. **Bottom-anchored**, opens with a grey `Today` pill. Outbound bubble green and heavily rounded; **the ✓ and the time sit OUTSIDE the bubble**, right-aligned beneath. Composer = `+` circle, rounded `Send a message` field, circular send arrow. **No drag handle** |

**The coverage rule these settle:** chat appears **only where the Zendesk support box appears** — Home, Requests, My Rides. The `nav-tab` and `options-row` placements were removed on the back of it.

**The four options now under study** (one axis — each is a whole proposal): `off` (Zendesk bubble alone) · `beside` (green ?-bubble next to it) · `roles` (Zendesk→headset "Support", new one→"Updates" tray) · `merged` (one bubble → a chooser that splits 7 unread into 3 Support + 4 Market Ops).

**Sampled colours** (added to `constants/driver-app-colors.ts`): chat green `#5FCBAA` — ⚠️ *not* the driver green `#10B981`; it carries both the outbound bubble and the `Draft:` prefix. Date pill `#F4F6F8`. Composer border `#C0C3C9`.

**Step pack:** `by-step/c-1/` (all nine).

### Sampled colours

Taken from the captures directly rather than eyeballed, and codified in `constants/driver-app-colors.ts`. Several differ from the template defaults, so prefer these on replicated surfaces:

| Token | Value | Where |
|---|---|---|
| Navy | `#303068` | all plain glyphs — phone, chat, mail, calendar. **Indigo, not charcoal** |
| Teal | `#00B090` | pickup-side ring + PICK UP MEMBER CTA |
| Rose | `#E05878` | drop-off-side ring |
| Rose deep | `#D85878` | filled Member No-Show circle |
| Gold | `#E0C878` | filled Send Back Trip circle |
| Ink | `#282828` | SWIPE TO START CTA fill |
| Drop-off | `#E06078` | DROP OFF MEMBER CTA fill |
| Divider | `#F0F0F0` | grid hairlines |

### Icon fidelity gap

`s-03a` shows the plain glyphs as SOLID shapes. Lucide is stroke-based, so filling only works for single closed paths — the phone fills correctly, but filling the mail or calendar collapses their interior detail into a blob. Those two are stroked at a heavier weight instead. Exact solid versions would need hand-drawn SVG.

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
