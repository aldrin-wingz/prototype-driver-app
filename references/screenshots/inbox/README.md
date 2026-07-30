# inbox/ — drop screenshots here

Staging folder for new reference captures of the **existing production Wingz NEMT Driver App**.

**Drop files here with any filenames.** Phone screenshot names (`IMG_4821.PNG`) are fine. They get renamed to the slot convention and copied into `canonical/` + the relevant `by-step/<step-id>/` folder, with `README.md` and `SUPPORT-BIBLE.md` updated to match. Once filed, the file is removed from here — an empty `inbox/` means everything has been processed.

Naming only matters if a screenshot is ambiguous on its own. If two captures are the same screen in different states, or one is a scrolled continuation of another, say so in a note or make the filename hint at it (`options menu scrolled.png`).

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

## Existing structure

- `canonical/` — flat, one copy of every reference screenshot. 12 slots (`01a`–`11`) from the Driver Incentives work.
- `by-step/<step-id>/` — per-build-step copies. Duplication across step folders is intentional.
- Naming: `<slot>(<sub>) - <Surface> - <Detail>.png`, e.g. `04b - Ride Details - Before Taken - Scrolled.png`.

Support-slice captures will take `s-*` slots so they don't collide with the incentives numbering.
