"use client";

import { useState } from "react";

import { IncentiveEarnedPopup } from "@/components/driver/incentive-earned-popup";
import { Toaster } from "@/components/ui/toaster";
import { PhoneShellProvider } from "./phone-shell";
import { SolutionStrip } from "./solution-strip";

/**
 * The page frame: briefing strip on top, and below it — on a wide screen — the
 * feature table beside the app running in a phone-sized frame.
 *
 * ⛔⛔ **One DOM tree at every width. The responsive switch is CSS only.**
 *
 * The obvious build is a `useIsDesktopShell()` branch returning a mobile tree or
 * a desktop tree. It is wrong twice over. Rendering both mounts `{children}`
 * twice — duplicate state, duplicate effects, duplicate element ids. Rendering
 * one and switching remounts the whole app screen every time the window crosses
 * 1280px, which wipes `RideFlowProvider` mid-demo: the exact state the project
 * has already learned survives only client-side navigation.
 *
 * So `{children}` is mounted once, in one place, and every desktop difference
 * is a class in `globals.css`. The media query in React exists only to pick a
 * portal target, which never moves the tree.
 *
 * ⚠️ `Toaster` and `IncentiveEarnedPopup` live HERE rather than in
 * `app/layout.tsx`, and that is load-bearing. Both are `position: fixed`, and in
 * the layout they were SIBLINGS of `{children}` — so the shell's transform,
 * which contains everything inside it, could never reach them. Radix Toast
 * portals only its aria-live region; `ToastViewport` renders in place, wherever
 * it is mounted. Moving them in is the whole fix, and it is a no-op below the
 * breakpoint, where no ancestor is transformed and `fixed` still means the
 * viewport.
 *
 * ⚠️ Accepted consequence: `react-remove-scroll` locks scrolling while a sheet
 * is open, so the feature table cannot be scrolled while a drawer is open
 * inside the phone. That is the library doing its job — do not "fix" it.
 */
export function SolutionShell({ children }: { children: React.ReactNode }) {
  // A callback ref rather than `useRef`, because the portal target has to cause
  // a render: consumers read it through context, and a ref object mutating in
  // place would leave them holding `null` forever.
  const [shell, setShell] = useState<HTMLElement | null>(null);

  return (
    <>
      <SolutionStrip />
      <div className="solution-split">
        {/* Filled by the feature table in the next slice. Empty, it has no
            height and no effect at any width. */}
        <div className="solution-table-col" />
        <div className="phone-col">
          <div className="phone-shell" ref={setShell}>
            {/* ⛔ The scroller is INSIDE the transformed box, not the box
                itself. `position: sticky` resolves against the nearest
                scrolling ancestor, so the app's five sticky headers need a
                scroller inside the frame — and the fixed bars need to hang off
                the frame itself so they stay pinned while content moves under
                them. One element cannot be both. */}
            <div className="phone-viewport">
              <PhoneShellProvider element={shell}>
                {children}
                <IncentiveEarnedPopup />
                <Toaster />
              </PhoneShellProvider>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
