"use client";

import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { getBalanceSummary } from "@/lib/data/wallet";

/**
 * Dashboard balance card: Balance + scheduled payout date + two actions —
 * Weekly Earnings (→ /weekly-earnings) and Payout Activity (→ /wallet).
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
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => router.push("/weekly-earnings")}
          className="flex items-center justify-center rounded-full bg-[#00F9B8] py-2.5 text-sm font-semibold text-[#131A1B] transition-colors hover:bg-[#00B692]"
        >
          Weekly Earnings
        </button>
        <button
          type="button"
          onClick={() => router.push("/wallet")}
          className="flex items-center justify-center rounded-full border border-[#E7F3F3]/30 py-2.5 text-sm font-semibold text-[#E7F3F3] transition-colors hover:bg-white/5"
        >
          Payout Activity
        </button>
      </div>
    </Card>
  );
}
