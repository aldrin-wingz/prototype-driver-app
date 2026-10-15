"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getBalanceSummary } from "@/lib/data/wallet";

/**
 * Dashboard balance card: Balance + scheduled payout date + ONE action,
 * Payout Activity (→ /wallet).
 *
 * ⛔⛔ **The Weekly Earnings button is GONE, and two captures say so.** This
 * card mirrored the `BAL-B1` batch, which paired Weekly Earnings with Payout
 * Activity in a two-column grid. The later `BAL-B2` batch
 * (`01-08 - B2 Home - Positive Balance Friday Date.png`) and the 2026-10-14
 * production shot `CAP-329` both show a SINGLE full-width Payout Activity
 * button — one with a positive balance and a scheduled date, one with a
 * negative balance and no date, so this is not a state the other button hides
 * behind. The mirror was a batch out of date. (User direction, 2026-10-15:
 * *"the version should not have a weekly earnings section anymore"*.)
 *
 * ⚠️ **`/weekly-earnings` still exists and is now UNREACHABLE.** This button
 * was its only entry point anywhere in the app. Removing the screen as well
 * would be a claim about production that no capture supports — absence of a
 * capture is not evidence — so the route stays until someone shoots the
 * released app and establishes it. Flagged rather than tidied away.
 */
export function WalletCard() {
  const router = useRouter();
  const { balance, nextPayoutDate } = getBalanceSummary();
  return (
    <Card className="mx-4 mb-4 rounded-2xl border-0 bg-[#131A1B] p-5 shadow-sm font-wingz">
      <p className="text-xs font-medium uppercase tracking-wide text-[#E7F3F3]/60">
        Balance
      </p>
      <p className="mt-1 text-4xl font-bold leading-tight text-[#00F9B8]">
        ${balance.toFixed(2)}
      </p>
      <p className="mt-1.5 text-sm text-[#E7F3F3]/70">
        Payout scheduled:{" "}
        <span className="font-semibold text-[#E7F3F3]">{nextPayoutDate}</span>
      </p>
      {/* ⚠️ Full width, not a grid cell — `CAP-329` and the B2 shot both show it
          spanning the card. A single button left in a two-column grid would sit
          in half the space with a gap beside it. */}
      <button
        type="button"
        onClick={() => router.push("/wallet")}
        className="mt-4 flex w-full items-center justify-center rounded-full bg-[#00F9B8] py-2.5 text-sm font-semibold text-[#131A1B] transition-colors hover:bg-[#00B692]"
      >
        Payout Activity
      </button>
    </Card>
  );
}
