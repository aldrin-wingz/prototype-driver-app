"use client";

import { X, ChevronRight, CalendarDays, Landmark } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  BANK_ACCOUNTS,
  getBalanceSummary,
  getPayoutActivity,
} from "@/lib/data/wallet";
import { PageHelpSheet } from "@/components/driver/page-help-sheet";

/**
 * Wallet — Balance + scheduled payout, recent bank payouts ("Last payouts" →
 * Transaction Details), and the attached payment method. Help lives in the
 * header (shared slider). Wingz-original; no instant cashout, no wallet system.
 */
export default function WalletPage() {
  const router = useRouter();
  const { balance, nextPayoutDate } = getBalanceSummary();
  const bank = BANK_ACCOUNTS.find((a) => a.isDefault) ?? BANK_ACCOUNTS[0];
  // "Last payouts" = weeks already paid out (sent to the bank).
  const lastPayouts = getPayoutActivity().filter((a) => a.status === "Paid");

  return (
    <div className="flex min-h-screen flex-col bg-[#F9FAFB] font-wingz">
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between bg-white px-4 shadow-sm">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center text-gray-700"
          aria-label="Close"
        >
          <X className="h-6 w-6" />
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold text-gray-900">
          Wallet
        </h1>
        <PageHelpSheet
          title="Your Wallet"
          intro="Your balance and the payouts sent to your bank."
          points={[
            {
              label: "Balance",
              body: "What you've earned that's scheduled to pay out — this pay period's total, sent to your bank on the scheduled date.",
            },
            {
              label: "Payout activity",
              body: "Each weekly payout sent to your bank. Tap one to see what made it up.",
            },
            {
              label: "Payment method",
              body: "The bank account your weekly payouts are sent to.",
            },
          ]}
        />
      </header>

      <div className="flex-1 overflow-y-auto pb-10">
        {/* Balance card */}
        <div className="mx-4 mt-4 rounded-2xl bg-[#131A1B] p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-[#E7F3F3]/60">
            Balance
          </p>
          <p className="mt-1 text-4xl font-bold leading-tight text-[#00F9B8]">
            ${balance.toFixed(2)}
          </p>
          <p className="mt-2 text-sm text-[#E7F3F3]/70">
            Payout scheduled:{" "}
            <span className="font-semibold text-[#E7F3F3]">{nextPayoutDate}</span>
          </p>
        </div>

        {/* Payout activity */}
        <section className="px-4 pt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Payout activity</h2>
            <button
              type="button"
              onClick={() => router.push("/payouts")}
              className="text-sm font-medium text-[#047857]"
            >
              See all
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500">Last payouts</p>

          <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white">
            {lastPayouts.map((item) => (
              <button
                key={item.periodId}
                type="button"
                onClick={() => router.push(`/payouts/${item.periodId}`)}
                className="flex w-full items-center gap-3 border-b border-gray-100 p-4 text-left transition-colors last:border-b-0 hover:bg-gray-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-gray-900">
                    ${item.amount.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500">Sent {item.payoutDate}</p>
                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
                    <CalendarDays className="h-3 w-3" />
                    Weekly payment
                  </span>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-gray-300" />
              </button>
            ))}
          </div>
        </section>

        {/* Payment method (attached bank) — display only, nothing to open yet */}
        <section className="mt-6 border-t border-gray-200 bg-white">
          <div className="flex w-full items-center gap-3 px-4 py-4">
            <Landmark className="h-5 w-5 shrink-0 text-gray-700" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">Payment Methods</p>
              <p className="text-xs text-gray-500">
                {bank.bankName} •••• {bank.last4} · paid out weekly
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
