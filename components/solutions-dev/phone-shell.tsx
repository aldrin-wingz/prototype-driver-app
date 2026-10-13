"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

/**
 * The element that fixed-position and portalled app content must land inside
 * once the desktop two-pane shell is on screen.
 *
 * ⛔⛔ **Why this exists at all.** The driver app is full of
 * `position: fixed` bars — the bottom nav, three Ride Details action rows — and
 * `fixed` resolves against the VIEWPORT, not against whatever column you put
 * the app in. Dropped into a right-hand pane untreated, the driver's bottom nav
 * lies across the feature table on the left.
 *
 * Two separate fixes are needed, because there are two separate escapes:
 *
 *  1. **Descendants** are handled by CSS alone — a `transform` on the shell
 *     makes it the containing block for every fixed element inside it. No React
 *     involved. See the `.phone-shell` block in `globals.css`.
 *  2. **Portalled content** is not a descendant. vaul and Radix render to
 *     `document.body`, so no ancestor transform can reach them. They each take
 *     a `container` prop, and this context is how that container gets to them.
 *
 * ⚠️ Below the breakpoint the value is `null`, which every consumer passes
 * straight through as "portal to `document.body`" — i.e. exactly today's
 * behaviour. The phone frame is a desktop affordance and must leave the mobile
 * layout untouched.
 */

/**
 * ⚠️ The breakpoint in TS. The CSS copy lives in `globals.css`; they are
 * compared by a check rather than trusted to agree, because two sources for one
 * number is how the pane and the portal target end up disagreeing about whether
 * the shell is on screen.
 */
export const DESKTOP_SHELL_MIN_PX = 1280;

/** The phone frame's CSS pixel size. Also declared in `globals.css`. */
export const PHONE_W_PX = 390;
export const PHONE_H_PX = 844;

const DESKTOP_QUERY = `(min-width: ${DESKTOP_SHELL_MIN_PX}px)`;

const PhoneShellContext = createContext<HTMLElement | null>(null);

function subscribe(onStoreChange: () => void): () => void {
  const query = window.matchMedia(DESKTOP_QUERY);
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
}

/**
 * Whether the desktop two-pane shell is on screen.
 *
 * ⚠️ The server snapshot is `false`, so the first client render agrees with the
 * HTML and hydration is clean. React re-reads the live snapshot immediately
 * after, and no drawer can be open at first paint, so there is nothing to
 * flicker.
 */
export function useIsDesktopShell(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
}

/** The phone frame element, or `null` when the app is not inside one. */
export function usePhoneShell(): HTMLElement | null {
  return useContext(PhoneShellContext);
}

export function PhoneShellProvider({
  element,
  children,
}: {
  element: HTMLElement | null;
  children: React.ReactNode;
}) {
  const desktop = useIsDesktopShell();
  // ⛔ Gated on the media query, not just on the ref. The element exists in the
  // DOM at every width — it is only a *frame* above the breakpoint, and
  // containing a drawer inside an untransformed, unsized div would clip it to
  // nothing on a phone.
  return (
    <PhoneShellContext.Provider value={desktop ? element : null}>
      {children}
    </PhoneShellContext.Provider>
  );
}
