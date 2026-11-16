"use client";

import { useEffect, useRef, useState } from "react";
import {
  TERMS_AGREE_BUTTON, TERMS_LOGOUT, TERMS_SCREEN_INTRO, TERMS_SCREEN_TITLE,
  canAcceptTerms, type DriverTermsVersion,
} from "@/lib/driver-terms/acceptance";
import { ScrollAckPollField } from "./scroll-ack-poll-field";

/**
 * The blocking T&C acceptance screen (PRD story 6) — FEATURE, not shipped.
 * Mirrors `DriverTermsAcceptanceModal` on the Driver App branch: full screen, no close
 * control, Agree only, plus Log out. It covers the whole app and traps focus inside.
 */
export function TermsAcceptanceScreen({
  terms, onAccept, onLogout,
}: {
  terms: DriverTermsVersion;
  onAccept: () => void;
  onLogout: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [agreed, setAgreed] = useState<boolean | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // A new version starts unread and unanswered, at the top.
  useEffect(() => {
    setScrolled(false);
    setAgreed(undefined);
    scrollRef.current?.scrollTo({ top: 0 });
  }, [terms.version]);

  // Nothing behind the screen is reachable: lock page scroll and keep focus inside.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") e.preventDefault(); // cannot be dismissed
      if (e.key !== "Tab" || !dialogRef.current) return;
      const f = dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled]), [tabindex='0']");
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener("keydown", onKey); };
  }, []);

  const canAccept = canAcceptTerms(scrolled, agreed);

  return (
    <div className="fixed inset-0 z-[100] bg-black/50" data-testid="terms-acceptance-screen">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-title"
        tabIndex={-1}
        className="mx-auto flex h-full max-w-md flex-col bg-white outline-none animate-in slide-in-from-bottom duration-300 motion-reduce:animate-none"
      >
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-6 pb-4 pt-12">
          <h1 id="terms-title" className="mb-2 text-[20px] font-semibold text-[#111111]">{TERMS_SCREEN_TITLE}</h1>
          <p className="mb-4 text-[14px] text-[#111111]">{TERMS_SCREEN_INTRO}</p>
          <ScrollAckPollField
            slug={terms.slug}
            question={terms.helpText || terms.label}
            required
            content={terms.content}
            value={agreed}
            scrolled={scrolled}
            onScrolled={() => setScrolled(true)}
            onChange={setAgreed}
            hideDisagree
          />
        </div>
        <div className="flex flex-col gap-3.5 border-t border-[#E5E5EA] bg-white px-4 pb-6 pt-4">
          <button
            type="button"
            disabled={!canAccept}
            onClick={onAccept}
            data-testid="terms-accept"
            className="min-h-[44px] rounded-lg bg-[#16CFA9] text-[16px] font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#00ECAF]/40 disabled:text-white/60"
          >
            {TERMS_AGREE_BUTTON}
          </button>
          <button
            type="button"
            onClick={onLogout}
            data-testid="terms-logout"
            className="self-center px-3 py-1 text-[14px] font-semibold text-[#16CFA9]"
          >
            {TERMS_LOGOUT}
          </button>
        </div>
      </div>
    </div>
  );
}
