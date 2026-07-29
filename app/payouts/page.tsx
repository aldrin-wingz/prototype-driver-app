"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { getBankTransactions, type PayoutActivityItem } from "@/lib/data/wallet";

/**
 * Payouts — the full list of bank payouts (money sent to the driver's bank),
 * grouped by payout date with a date divider per the Earnings Activity feed,
 * newest first. Each row opens the bank-style Payout detail.
 */
export default function PayoutsPage() {
  const router = useRouter();
  const payouts = getBankTransactions();

  // Group by payout date (date-divider layout, mirroring Earnings Activity).
  const groups: { date: string; items: PayoutActivityItem[] }[] = [];
  for (const p of payouts) {
    let g = groups.find((x) => x.date === p.payoutDate);
    if (!g) {
      g = { date: p.payoutDate, items: [] };
      groups.push(g);
    }
    g.items.push(p);
  }

  return (
    <div className="flex min-h-screen flex-col bg-white font-wingz">
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between bg-white px-4 shadow-sm">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center text-gray-700"
          aria-label="Back"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold text-gray-900">
          Payouts
        </h1>
        <div className="w-10" />
      </header>

      {groups.length === 0 ? (
        <div className="px-4 py-16 text-center text-sm text-gray-400">
          No payouts yet.
        </div>
      ) : (
        <div className="pb-10">
          {groups.map((g) => (
            <section key={g.date}>
              <div className="bg-gray-50 px-4 py-2">
                <span className="text-sm font-medium text-gray-500">{g.date}</span>
              </div>
              <div className="divide-y divide-gray-100">
                {g.items.map((p) => {
                  const paid = p.status === "Paid";
                  return (
                    <button
                      key={p.periodId}
                      type="button"
                      onClick={() => router.push(`/payouts/${p.periodId}`)}
                      className="flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-gray-50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-base font-semibold text-gray-900">
                          ${p.amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500">Weekly payout</p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          paid ? "bg-[#E7F3F3] text-[#00B692]" : "bg-gray-100 text-gray-600"
                        )}
                      >
                        {paid ? "Paid" : "Scheduled"}
                      </span>
                      <ChevronRight className="h-5 w-5 shrink-0 text-gray-300" />
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
