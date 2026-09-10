# inbox/ — drop screenshots here

Staging folder for new reference captures of the **existing production Wingz NEMT Driver App**.

**Drop files here with any filenames.** Phone screenshot names (`IMG_4821.PNG`) are fine. They get renamed to the slot convention and copied into `canonical/` + the relevant `by-step/<step-id>/` folder, with `README.md` and `SUPPORT-BIBLE.md` updated to match. Once filed, the file is removed from here — an empty `inbox/` means everything has been processed.

Naming only matters if a screenshot is ambiguous on its own. If two captures are the same screen in different states, or one is a scrolled continuation of another, say so in a note or make the filename hint at it (`options menu scrolled.png`).

## Filed so far

✅ **2026-09-03 — the Member No-Show pack** (`s-06a`–`s-06e`) was filed into `canonical/` and `by-step/s-6/`, and documented in the parent `README.md`. It closed the "Existing support/help entry" and "Options menu — open" needs below, and is the source of truth for the `luis/rider-no-show` branch.

## What's needed for the In-App Support Requests slice

| Need | Screen | Why |
|---|---|---|
| **Ride Details — in progress** | A ride the driver is actively working, top of screen | The in-progress state was built from existing patterns, not from a real capture — this is what corrects it |
| **Ride Details — in progress, scrolled** | Same ride, scrolled to the bottom action row | Shows the real action controls and where `More` sits |
| **Options menu — open** | `More` tapped | **Decides the container**: bottom sheet, dropdown, or full page. Blocking the menu build |
| **Options menu — scrolled** | Only if the list is longer than one screen | Reveals the full action list |
| Swipe controls | However the driver actually swipes arrive / pick up / drop off | The prototype invents this; a capture replaces the guess |
| Existing support/help entry | Any current in-app route to support | Shows what drivers already recognise |

Nice to have, not blocking: any current Zendesk/help form a driver sees today, and a completed ride's detail screen (for whether Trip Update should also work retrospectively).

## What's needed for the In-App Chat placement study (`c-*` slots)

Branch `luis/in-app-chat`. The study compares where the chat icon goes now that
In-App Chat is opening beyond Onboarding while Zendesk stays as **Support Chat**.
`c-*` slots so they don't collide with `01a`–`11` (incentives) or `s-*` (support).

⚠️ **Two of these settle open questions in the prototype, not just styling.**

| Slot | Screen | Why | Blocking? |
|------|--------|-----|-----------|
| `c-01a` | The chat entry point in place, unopened | **Settles whether the header `MessageCircle` IS the chat.** It already ships with a red badge and no handler; the Comms Tool story says the in-app unread count shows on "the chat/help bubble". If they are the same thing, `header-left` is a rewiring and not a new icon | ✅ blocking |
| `c-02a` | A chat thread open (an onboarding conversation) | Bubble shape, colours, who the sender reads as. The prototype's bubbles are invented from the agent-side markup | |
| `c-02b` | The composer, keyboard up | What "basic" means here, and whether attachments exist | |
| `c-03a` | An inbox / thread list — **if one exists** | Decides whether a list is a new concept or an existing one. **Its absence is a finding, not a gap** — say so rather than leaving the row blank | ✅ blocking |
| `c-04a` | Zendesk Support Chat as a driver sees it | What the new chat has to be distinguishable from. Also whether it is the same bubble the 4.5.1 overlay bug was about | |
| `c-05a` | Empty state | | |
| `c-05b` | The unread badge as production draws it | The prototype copies the header's `#EF4444` 6-badge; confirm | |
| `c-05c` | A chat push notification | | |

**What the blocking two unblock:** the coverage row for `/my-rides/[id]/no-show`,
currently excluded under every placement and marked ⏳ provisional in
`lib/messages-data/chat-placement.ts`. App Release 4.5.1 shipped a fix for "the
Zendesk chat overlay covering the trip screen mid-trip", which is precedent for
keeping chat off a mid-flow form — but if that was an overlay bug rather than a
placement one, the row flips.

## Existing structure

- `canonical/` — flat, one copy of every reference screenshot. 12 slots (`01a`–`11`) from the Driver Incentives work.
- `by-step/<step-id>/` — per-build-step copies. Duplication across step folders is intentional.
- Naming: `<slot>(<sub>) - <Surface> - <Detail>.png`, e.g. `04b - Ride Details - Before Taken - Scrolled.png`.

Support-slice captures will take `s-*` slots so they don't collide with the incentives numbering.
