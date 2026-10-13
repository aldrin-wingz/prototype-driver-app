"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { findSolution, SOLUTION_HOME, type Solution } from "./catalogue";
import { adoptDecision, keepClearedMemory } from "./adopt-rules";
import { demoFocus, type DemoFocus, type DemoMode } from "./demo-mode";

/**
 * Which proposed feature the prototype is currently focused on.
 *
 * ⚠️ The focus is held in React state and MIRRORED into the URL — not held in
 * the URL alone. That was the first design and it broke on the first walk: the
 * app's own navigation (a tile pushing `/my-rides/[id]/no-show`) carries no
 * query string, so the briefing vanished the moment you started demonstrating
 * the flow it describes. Making the app preserve the param everywhere would
 * mean editing mirrored screens to suit the selector, which the base contract
 * forbids.
 *
 * So: the URL SEEDS the focus and is kept truthful afterwards, and state keeps
 * it alive across in-app navigation. The mirror is written with
 * `history.replaceState` rather than a Next navigation, because a navigation
 * here would remount the screen under the person using it.
 *
 * ⚠️ `useSearchParams` makes this a dynamic client boundary, so the provider
 * MUST sit inside a Suspense boundary. `next dev` never prerenders, so a
 * missing one is invisible until `next build`.
 */
export const SOLUTION_PARAM = "solution";

/**
 * ⛔⛔ **The ONE place the demo mode is decided, and for now it is pinned.**
 *
 * B1 names the rule and converts every guard and builder to take a `DemoFocus`,
 * with the mode hardwired to `"fixed"` — the side the app has always shown — so
 * the walked app is byte-identical to the commit before it. B2 replaces this
 * constant with real state; a check asserts it is the only `DemoMode` literal
 * outside `demo-mode.ts`, so there is exactly one seam to move.
 *
 * ⚠️ Deliberately NOT `DEFAULT_DEMO_MODE`. That constant is `"now"` — the mode
 * the app will LAND on once there is a toggle to get back from. Wiring it in
 * before B4 would hide every proposal behind a switch that does not exist yet.
 */
const HARDWIRED_MODE: DemoMode = "fixed";

interface SolutionValue {
  /** `undefined` when nothing is focused — the app runs as the plain mirror. */
  active: Solution | undefined;
  /**
   * What the app is being asked to show: the focused row, and which side of it.
   *
   * ⭐ Assembled here and passed down, so no screen builds its own and no rule
   * reads React. Every proposal guard takes this.
   */
  demo: DemoFocus;
  /** Focus a solution and navigate to its entry point, if it has one. */
  focus: (solution: Solution) => void;
  clear: () => void;
  pickerOpen: boolean;
  setPickerOpen: (open: boolean) => void;
}

const SolutionContext = createContext<SolutionValue | null>(null);

/**
 * A route with the solution id attached.
 *
 * ⛔⛔ **A naive `${route}?solution=${id}` breaks the moment an entry route
 * carries its own query**, producing `/requests?member=X?solution=Y` — a second
 * `?` that every parser reads as part of the first value, so the solution is
 * silently dropped AND the member filter arrives named `X?solution=Y`. No entry
 * route had a query until catalogue row 10 deep-linked its filter, so the bug
 * was latent in two places at once: here and the strip's alternate buttons.
 *
 * Named in `lib/` and used by both, because the two call sites agreeing by
 * coincidence is exactly how they drift.
 */
export function solutionHref(route: string, id: string): string {
  const separator = route.includes("?") ? "&" : "?";
  return `${route}${separator}${SOLUTION_PARAM}=${encodeURIComponent(id)}`;
}

function writeParam(id: string | null) {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set(SOLUTION_PARAM, id);
  else url.searchParams.delete(SOLUTION_PARAM);
  window.history.replaceState(null, "", url);
}

export function SolutionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const paramId = searchParams.get(SOLUTION_PARAM);

  /**
   * ⛔⛔ **The path a `focus()` navigation is heading for, while it is in
   * flight — and the reason BOTH effects below stand down while it is set.**
   *
   * `router.push` is async, so for a render or two after a switch the URL still
   * describes the old solution on the old screen. Left alone, the two effects
   * each undo the switch in their own way: the adopt effect reads the stale
   * param and restores the old focus, and the mirror effect calls
   * `history.replaceState` on the page it is still on, overwriting the pending
   * push. Between them the app either stayed put or arrived wearing the wrong
   * id — reported as "the prototype struggles to switch, especially on a ride
   * page". Nothing throws and the briefing updates either way, which is exactly
   * why it survived a walk.
   */
  const pendingFocus = useRef<string | null>(null);

  /**
   * ⛔⛔ **The id `clear()` just removed, until the URL stops echoing it.**
   *
   * `writeParam` uses `history.replaceState`, which Next's router never
   * observes, so `useSearchParams()` keeps handing back the id we deleted. The
   * adopt effect below then put the focus straight back — measured at ~100ms,
   * so `clear()` has in fact never worked, on the strip's `×` or anywhere else.
   * The rule lives in `adopt-rules.ts` where a check can run its truth table.
   */
  const clearedId = useRef<string | null>(null);

  // Adopt a focus named in the URL: an entry point, a shared link, or a hand
  // edit. Only ever widens — a missing param means "the app navigated", not
  // "the focus was dropped".
  useEffect(() => {
    /**
     * ⛔⛔ **Not while we are mid-switch.** `router.push` is async, so for a
     * render or two after `focus()` the URL still names the PREVIOUS solution —
     * and this effect, reading it, would set the focus straight back. The app
     * then arrived at the new solution's entry screen still wearing the old
     * solution's id and briefing. Half-switched is worse than not switching: it
     * looks like it worked.
     */
    const decision = adoptDecision({
      paramId,
      activeId,
      clearedId: clearedId.current,
      navigating: pendingFocus.current !== null,
    });
    // ⚠️ Forget the clear as soon as the URL stops echoing it, or a later deep
    // link to the SAME solution would be ignored for the life of the page.
    if (!keepClearedMemory(clearedId.current, paramId)) clearedId.current = null;
    if (decision === "adopt" && paramId) setActiveId(paramId);
  }, [paramId, activeId]);

  /**
   * ⛔⛔ **The path a `focus()` navigation is heading for, while it is in
   * flight.**
   *
   * `router.push` is async. The mirror effect below renders first, sees the
   * param it wants is not in the URL yet, and calls `history.replaceState` on
   * the page it is STILL on — which overwrites the pending push. The app then
   * sat on the old screen wearing the new solution's id, which is the
   * "switching does nothing" the prototype was reported for. Nothing errors and
   * the briefing updates, so it reads as a sluggish app rather than a bug.
   */
  // Put it back after the app's own navigation drops it, so the URL always
  // says which solution produced what is on screen.
  useEffect(() => {
    // ⛔ Never while a focus navigation is still travelling — see above.
    if (pendingFocus.current) {
      // Settled once we have ARRIVED, or once the URL already agrees with us —
      // the second clause matters when the target is the page we are on, where
      // the pathname never changes and waiting on it would wedge both effects.
      if (pathname !== pendingFocus.current && paramId !== activeId) return;
      pendingFocus.current = null;
    }
    if (activeId && paramId !== activeId) writeParam(activeId);
  }, [activeId, paramId, pathname]);

  const active = findSolution(activeId);
  // ⛔ Built through `demoFocus`, never as a bare object literal — a check
  // asserts this is the ONLY construction in the app, which is what keeps B2 a
  // one-line change instead of a hunt through the screens.
  const demo = useMemo<DemoFocus>(
    () => demoFocus(activeId, HARDWIRED_MODE),
    [activeId],
  );

  const focus = useCallback(
    (solution: Solution) => {
      // ⛔ A new focus ends any memory of a clear, so re-picking the row that
      // was just cleared works rather than being swallowed as its own echo.
      clearedId.current = null;
      setActiveId(solution.id);
      /**
       * ⛔ **Switching ALWAYS moves the app.** An entry point goes to where the
       * solution is demonstrable; a row without one goes to `SOLUTION_HOME`.
       *
       * The second half used to just rewrite the query string, which looked
       * harmless and was not: switching while on a ride detail screen left you
       * on the PREVIOUS solution's ride, reading the new solution's briefing,
       * with that ride filtered out of its own list. Deep screens are where a
       * demo actually happens, so that was the common case, not the edge.
       */
      const target = solution.entry?.route ?? SOLUTION_HOME;
      // Claimed BEFORE the push, so the mirror effect's very first render after
      // `setActiveId` already knows to stay out of the way.
      pendingFocus.current = target.split("?")[0];
      router.push(solutionHref(target, solution.id));
    },
    [router],
  );

  const clear = useCallback(() => {
    // ⛔ Recorded BEFORE the state change: once `activeId` is null there is
    // nothing left to tell the stale param apart from a fresh deep link.
    clearedId.current = activeId;
    setActiveId(null);
    writeParam(null);
  }, [activeId]);

  const value = useMemo<SolutionValue>(
    () => ({ active, demo, focus, clear, pickerOpen, setPickerOpen }),
    [active, demo, focus, clear, pickerOpen],
  );

  return <SolutionContext.Provider value={value}>{children}</SolutionContext.Provider>;
}

export function useSolution(): SolutionValue {
  const ctx = useContext(SolutionContext);
  if (!ctx) throw new Error("useSolution must be used inside a SolutionProvider");
  return ctx;
}
