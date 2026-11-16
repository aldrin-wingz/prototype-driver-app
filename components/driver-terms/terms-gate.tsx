"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { gateBlocks } from "@/lib/driver-terms/acceptance";
import { currentTerms, driverTermsActions, useDriverTermsSession } from "@/lib/driver-terms/session";
import { TermsAcceptanceScreen } from "./terms-acceptance-screen";

/**
 * Decides when the T&C acceptance screen blocks the app — FEATURE, not shipped.
 *
 * Mirrors the Driver App branch's `useDriverTermsGate`: checks when the driver logs in
 * and every time the app returns to the foreground (the browser tab becoming visible,
 * or the demo's "background and reopen" control). A version published while the app
 * is open is therefore caught on the next resume, not instantly.
 *
 * Logged out → every screen sends the driver to /login (this branch only).
 */
export function TermsGate() {
  const session = useDriverTermsSession();
  const pathname = usePathname();
  const router = useRouter();
  // The version the gate last checked against. Publishing a new version does not
  // change this until the next login or resume — exactly like the app.
  const [checkedVersion, setCheckedVersion] = useState<number | null>(null);

  const loggedIn = session?.loggedIn ?? false;
  const resumeCount = session?.resumeCount ?? 0;

  // Login and simulated resume.
  useEffect(() => {
    if (!session) return;
    setCheckedVersion(session.loggedIn ? session.currentVersion : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn, resumeCount]);

  // Real resume: the tab becomes visible again.
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === "visible") driverTermsActions.simulateResume(); };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    if (session && !session.loggedIn && pathname !== "/login") router.replace("/login");
  }, [session, pathname, router]);

  if (!session || !session.loggedIn || pathname === "/login") return null;

  if (!gateBlocks(checkedVersion, session.acceptedVersion, session.currentVersion)) return null;

  return (
    <TermsAcceptanceScreen
      terms={currentTerms(session)}
      onAccept={() => driverTermsActions.accept()}
      onLogout={() => { driverTermsActions.logOut(); router.replace("/login"); }}
    />
  );
}
