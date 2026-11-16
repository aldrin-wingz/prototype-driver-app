"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FlaskConical, X } from "lucide-react";
import { driverTermsActions, useDriverTermsSession } from "@/lib/driver-terms/session";

/**
 * Prototype controls — NOT part of the Driver App. Lets engineers drive the scenarios
 * the backend will produce: publish a new T&C version, send the app to the background
 * and reopen it, reset. Also shows the acceptance record the backend would store.
 */
export function DemoControls() {
  const session = useDriverTermsSession();
  const [open, setOpen] = useState(false);
  const [away, setAway] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  if (!session) return null;

  const resume = () => {
    setAway(true);
    setTimeout(() => { setAway(false); driverTermsActions.simulateResume(); }, 1000);
  };

  return (
    <>
      {away && (
        <div className="fixed inset-0 z-[120] flex flex-col items-center justify-center gap-1 bg-[#0F1414]/95 text-center text-white">
          <span className="text-[15px] font-semibold">App in the background</span>
          <span className="text-[13px] text-[#9AA8A6]">Reopening checks the T&amp;C version again</span>
        </div>
      )}
      {/* Right edge, mid-height: clear of the bottom nav, the T&C screen's buttons and the header icons. */}
      <div className="fixed right-2 top-[42%] z-[115] flex flex-col items-end gap-2">
        {open && (
          <div className="order-last w-[300px] max-w-[calc(100vw-24px)] rounded-xl border border-[#2A3634] bg-[#131A1B] p-4 text-[13px] text-[#ECEFEF] shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold">Prototype controls</p>
              <button type="button" aria-label="Close prototype controls" onClick={() => setOpen(false)}><X className="h-4 w-4" /></button>
            </div>
            <p className="mb-3 text-[12px] text-[#9AA8A6]">Not part of the app. They stand in for what the backend will do.</p>
            <dl className="mb-3 grid grid-cols-3 gap-2 text-[12px]">
              <div><dt className="text-[#9AA8A6]">Current</dt><dd className="font-semibold" data-testid="demo-current">v{session.currentVersion}</dd></div>
              <div><dt className="text-[#9AA8A6]">Accepted</dt><dd className="font-semibold" data-testid="demo-accepted">{session.acceptedVersion == null ? "None" : `v${session.acceptedVersion}`}</dd></div>
              <div><dt className="text-[#9AA8A6]">Driver</dt><dd className="font-semibold">{session.loggedIn ? "Logged in" : "Logged out"}</dd></div>
            </dl>
            <div className="flex flex-col gap-2">
              <button type="button" data-testid="demo-publish" onClick={() => driverTermsActions.publishNewVersion()} className="rounded-lg bg-[#16CFA9] px-3 py-2 text-left font-semibold text-[#0F1414]">
                Publish a new T&amp;C version
              </button>
              <button type="button" data-testid="demo-resume" disabled={!session.loggedIn} onClick={resume} className="rounded-lg border border-[#2A3634] px-3 py-2 text-left font-semibold disabled:opacity-40">
                Send app to background, then reopen
              </button>
              <button type="button" data-testid="demo-reset" onClick={() => { driverTermsActions.reset(); if (pathname !== "/login") router.replace("/login"); }} className="rounded-lg border border-[#2A3634] px-3 py-2 text-left font-semibold">
                Reset demo
              </button>
            </div>
            <p className="mb-1 mt-3 text-[12px] text-[#9AA8A6]">Last acceptance record (what the backend stores)</p>
            {session.lastRecord ? (
              <pre data-testid="demo-record" className="max-h-40 overflow-auto rounded-lg bg-[#0F1414] p-2 font-mono text-[11px] leading-[1.5]">{JSON.stringify(session.lastRecord, null, 2)}</pre>
            ) : (
              <p className="text-[12px]">None yet.</p>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          data-testid="demo-toggle"
          aria-label="Prototype controls"
          title="Prototype controls"
          aria-expanded={open}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#131A1B] text-white shadow-lg"
        >
          <FlaskConical className="h-5 w-5" />
        </button>
      </div>
    </>
  );
}
