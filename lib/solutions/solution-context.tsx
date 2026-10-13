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
import {
  DEFAULT_DEMO_MODE,
  DEMO_MODE_PARAM,
  demoFocus,
  modeFromParam,
  type DemoFocus,
  type DemoMode,
} from "./demo-mode";

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
  /** Which side of the focused row is showing. Meaningless with no focus. */
  mode: DemoMode;
  /**
   * Flip the focused row between production and the proposal.
   *
   * ⛔ Sets state and NOTHING else. Flipping the toggle on a ride detail has to
   * leave you on that ride — a navigation here would remount the screen and
   * throw away the ride-flow state the comparison is being made against, which
   * is the whole reason there is a mode rather than two separate links.
   */
  setMode: (mode: DemoMode) => void;
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

/**
 * What the URL should say, for a focus. `null` means "delete this param".
 *
 * ⛔ Pure and exported so the rule can be truth-tabled instead of walked. Two
 * things it encodes, both load-bearing:
 *
 * **`"now"` is never written.** Absence means `"now"` — see `DEMO_MODE_PARAM`.
 *
 * **The mode param never appears without a solution.** With no focus there is
 * no side to be on, so `?mode=fixed` alone would describe a state the app
 * cannot be in, and a reader of the URL would be told something false.
 */
export function focusParams(focus: DemoFocus): Record<string, string | null> {
  return {
    [SOLUTION_PARAM]: focus.solutionId,
    [DEMO_MODE_PARAM]:
      focus.solutionId !== null && focus.mode === "fixed" ? focus.mode : null,
  };
}

function writeParams(focus: DemoFocus) {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(focusParams(focus))) {
    if (value === null) url.searchParams.delete(key);
    else url.searchParams.set(key, value);
  }
  window.history.replaceState(null, "", url);
}

export function SolutionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  /**
   * ⛔ Seeded from `DEFAULT_DEMO_MODE`, which is `"now"`. The plain mirror has
   * no focus, so this is inert until one is picked — `showsProposal` returns on
   * the `null` branch before the mode is read at all.
   */
  const [mode, setModeState] = useState<DemoMode>(DEFAULT_DEMO_MODE);

  const paramId = searchParams.get(SOLUTION_PARAM);
  const paramMode = searchParams.get(DEMO_MODE_PARAM);

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
    if (decision === "adopt" && paramId) {
      setActiveId(paramId);
      /**
       * ⛔⛔ **The mode is adopted ONLY here, as part of taking a new id —
       * never on its own, on any other render.**
       *
       * This is the `clear()` bug's shape (D80) and it would come straight
       * back. `writeParams` mirrors with `history.replaceState`, which Next's
       * router never observes, so `useSearchParams()` goes on returning the
       * mode from before the flip. An effect that re-read it every render
       * would see `"now"` a tick after `setMode("fixed")` and put it back —
       * a toggle that visibly bounces, with nothing in the console.
       *
       * One seed, and it only ever widens: `(paramId, paramMode)` arrive
       * together or not at all.
       */
      setModeState(modeFromParam(paramMode));
    }
  }, [paramId, paramMode, activeId]);

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
    /**
     * ⚠️ Compared on BOTH axes. `paramMode` may be stale — see the adopt effect
     * — but that only ever causes a redundant write of the value state already
     * holds, never a write of the stale value itself. State leads; the URL
     * follows.
     */
    const urlAgrees = paramId === activeId && modeFromParam(paramMode) === mode;
    if (activeId && !urlAgrees) writeParams({ solutionId: activeId, mode });
  }, [activeId, mode, paramId, paramMode, pathname]);

  const active = findSolution(activeId);
  // ⛔ Built through `demoFocus`, never as a bare object literal — a check
  // asserts this is the ONLY construction in the app, which is what keeps B2 a
  // one-line change instead of a hunt through the screens.
  const demo = useMemo<DemoFocus>(
    () => demoFocus(activeId, mode),
    [activeId, mode],
  );

  const focus = useCallback(
    (solution: Solution) => {
      // ⛔ A new focus ends any memory of a clear, so re-picking the row that
      // was just cleared works rather than being swallowed as its own echo.
      clearedId.current = null;
      /**
       * ⛔⛔ **The mode resets BEFORE anything else, including `pendingFocus`.**
       *
       * An inherited mode is exactly a half-switch: the right ride, the wrong
       * side of it, and nothing errors. Someone who had row 01 on `"fixed"` and
       * picked row 16 would land on row 16's ride already showing the proposal,
       * having never seen what happens today — which is the one thing the
       * whole slice exists to show.
       *
       * ⭐ `DEFAULT_DEMO_MODE` is `"now"`: picking a row lands on the dead end,
       * and the toggle is how you get to the fix. That order is the argument.
       */
      setModeState(DEFAULT_DEMO_MODE);
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
      // ⚠️ `solutionHref` deliberately carries no mode. The push lands on a URL
      // with no `?mode`, which reads back as `"now"` — the same thing the state
      // above was just set to, so nothing to reconcile on arrival.
      router.push(solutionHref(target, solution.id));
    },
    [router],
  );

  const clear = useCallback(() => {
    // ⛔ Recorded BEFORE the state change: once `activeId` is null there is
    // nothing left to tell the stale param apart from a fresh deep link.
    clearedId.current = activeId;
    setActiveId(null);
    /**
     * ⚠️ The mode is meaningless without a focus, so it goes back to the
     * default rather than lingering. Without this, clearing from `"fixed"` and
     * then deep-linking a row would be the only path that skipped `focus()` and
     * so kept the old side — one route into a half-switch, left open.
     */
    setModeState(DEFAULT_DEMO_MODE);
    writeParams({ solutionId: null, mode: DEFAULT_DEMO_MODE });
  }, [activeId]);

  /**
   * ⛔ Sets state, never navigates — see `SolutionValue.setMode`. Declared
   * immediately before `value` so a check can read this statement on its own:
   * a slice that ran to the next `const` swept up `focus` and `clear`, both of
   * which legitimately call `router`, and the check failed on their code.
   */
  const setMode = useCallback((next: DemoMode) => setModeState(next), []);

  const value = useMemo<SolutionValue>(
    () => ({ active, demo, mode, setMode, focus, clear, pickerOpen, setPickerOpen }),
    [active, demo, mode, setMode, focus, clear, pickerOpen],
  );

  return <SolutionContext.Provider value={value}>{children}</SolutionContext.Provider>;
}

export function useSolution(): SolutionValue {
  const ctx = useContext(SolutionContext);
  if (!ctx) throw new Error("useSolution must be used inside a SolutionProvider");
  return ctx;
}
