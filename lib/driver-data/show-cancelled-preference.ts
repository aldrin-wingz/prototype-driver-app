import { SHOW_CANCELLED_DEFAULT } from "./client-cancellation";

/**
 * Catalogue row 19 — where the "Show cancelled trips" setting is kept.
 *
 * ⛔⛔ **The driver app's FIRST real use of `localStorage`, and the reason it is
 * a module rather than two lines in the page.** Production stores My Rides
 * preferences on the phone; `ride-filters.ts` named that divergence and did not
 * close it, because its filter state was React state that reset on reload. The
 * approved solution says the toggle survives closing the app, so it has to.
 *
 * ## ⛔⛔ Three ways this breaks, all of them silent
 *
 * 1. **Hydration.** `next build` prerenders every static route, and the server
 *    has no storage. Reading it during render makes the first client paint
 *    disagree with the server's HTML, and React discards the tree. So the page
 *    must RENDER the default and adopt the stored value in an effect, after
 *    mount — which is why there is no `initialShowCancelled()` here to call
 *    from `useState`. A function with that name is the trap.
 * 2. **It throws.** A private window, blocked site data, or a browser with
 *    storage disabled raises on ACCESS, not on read — so even
 *    `typeof localStorage` is not safe on its own. Both calls are wrapped.
 * 3. **It comes back as a string.** `"false"` is truthy. The parse is explicit
 *    and anything unrecognised falls back to the default rather than to `false`,
 *    because a corrupt value must not silently hide the driver's manifest.
 *
 * ⚠️ Storage is per-origin and per-browser. It never reaches another device and
 * never reaches the prototype's seed — this is a UI preference, not data.
 */

/** ⛔ Declared once. A key spelled twice is a key that gets spelled differently. */
export const SHOW_CANCELLED_KEY = "wingz.myRides.showCancelled";

/**
 * What was stored, or the default when nothing readable is there.
 *
 * ⛔ Call this from an effect, never from `useState` — see (1) above.
 */
export function readShowCancelled(): boolean {
  try {
    const raw = window.localStorage.getItem(SHOW_CANCELLED_KEY);
    if (raw === "true") return true;
    if (raw === "false") return false;
    return SHOW_CANCELLED_DEFAULT;
  } catch {
    // ⛔ Swallowed deliberately. A preference that cannot be stored is a
    // preference that does not persist, which is a degraded experience — not
    // an error the driver can act on, and not a reason to break the manifest.
    return SHOW_CANCELLED_DEFAULT;
  }
}

/** Remember the driver's choice. Failure is silent, for the same reason. */
export function writeShowCancelled(value: boolean): void {
  try {
    window.localStorage.setItem(SHOW_CANCELLED_KEY, String(value));
  } catch {
    /* see readShowCancelled */
  }
}
