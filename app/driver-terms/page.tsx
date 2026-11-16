"use client";

import { Header } from "@/components/driver/header";
import { currentTerms, useDriverTermsSession } from "@/lib/driver-terms/session";

/**
 * Options → Driver Terms and Conditions (PRD story 7) — FEATURE, not shipped.
 *
 * Today the row opens a hardcoded website, `https://wingz.me/driver-terms`
 * (driver-app `OptionsScreen.tsx:231-233`). The story moves it in-app and onto the
 * versioned source, so it shows the same text the driver accepted, with its version
 * and effective date. ⚠️ The destination has never been captured; this layout is new.
 */
export default function DriverTermsPage() {
  const session = useDriverTermsSession();
  if (!session) return null;
  const terms = currentTerms(session);
  const accepted = session.acceptedVersion;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* "Driver Terms and Conditions" wraps to two lines in the base header; short form here. */}
      <Header title="Terms and Conditions" showBack showMessages={false} showRefresh={false} />
      <main className="mx-auto w-full max-w-md flex-1 px-5 pb-10 pt-4">
        <div className="mb-4 rounded-xl border border-[#E5E5EA] bg-[#F5F7F8] p-4" data-testid="terms-version-card">
          <p className="text-[15px] font-semibold text-[#111111]">Version {terms.version}</p>
          <p className="text-[13px] text-[#5D5D5D]">Effective {terms.effectiveDate}</p>
          <p className="mt-2 text-[13px] text-[#111111]">
            {accepted === terms.version
              ? "You accepted this version."
              : accepted == null
                ? "You have not accepted this version yet."
                : `You accepted version ${accepted}. You'll be asked to accept version ${terms.version} the next time you open the app.`}
          </p>
          {terms.textNote && <p className="mt-2 text-[12px] text-[#9B9B9B]">{terms.textNote}</p>}
        </div>
        <div className="whitespace-pre-wrap break-words text-[13px] leading-[1.55] text-[#111111]">{terms.content}</div>
      </main>
    </div>
  );
}
