"use client";

import { ChevronLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  BANK_ACCOUNTS,
  getPayoutActivityItem,
  getPayoutTransactions,
} from "@/lib/data/wallet";

/** A bank-style detail row. */
function DetailRow({
  label,
  value,
  tone = "default",
  bold = false,
}: {
  label: string;
  value: string;
  tone?: "default" | "negative";
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 last:border-b-0">
      <span className={cn("text-sm text-gray-500", bold && "font-semibold text-gray-900")}>
        {label}
      </span>
      <span
        className={cn(
          "text-sm",
          tone === "negative" ? "text-[#DC2626]" : "text-gray-900",
          bold ? "font-semibold" : "font-medium"
        )}
      >
        {value}
      </span>
    </div>
  );
}

/**
 * Payout detail — a single weekly bank payout, styled like a bank transaction
 * record: big amount, status, destination account, key dates, and a simple
 * breakdown of what made up the payout.
 */
export default function PayoutDetailPage() {
  const router = useRouter();
  const params = useParams();
  const periodId = String(params.id);
  const payout = getPayoutActivityItem(periodId);
  const bank = BANK_ACCOUNTS.find((a) => a.isDefault) ?? BANK_ACCOUNTS[0];

  return (
    <div className="flex min-h-screen flex-col bg-[#F9FAFB] font-wingz">
      <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between bg-white px-4 shadow-sm">
        <button
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center text-gray-700"
          aria-label="Back"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold text-gray-900">
          Payout
        </h1>
        <div className="w-10" />
      </header>

      {!payout ? (
        <div className="px-4 py-16 text-center text-sm text-gray-400">
          Payout not found.
        </div>
      ) : (
        <Body periodId={periodId} payout={payout} bank={bank} />
      )}
    </div>
  );
}

function Body({
  periodId,
  payout,
  bank,
}: {
  periodId: string;
  payout: NonNullable<ReturnType<typeof getPayoutActivityItem>>;
  bank: (typeof BANK_ACCOUNTS)[number];
}) {
  const t = getPayoutTransactions(periodId);
  const paid = payout.status === "Paid";
  const reference = `WZ-${periodId.replace(/\D/g, "").slice(-8) || "00000000"}`;

  return (
    <div className="flex-1 overflow-y-auto pb-10">
      {/* Hero amount */}
      <div className="flex flex-col items-center px-4 pb-6 pt-8 text-center">
        <p className="text-5xl font-semibold tracking-tight text-gray-900">
          ${payout.amount.toFixed(2)}
        </p>
        <span
          className={cn(
            "mt-3 rounded-full px-3 py-1 text-xs font-semibold",
            paid ? "bg-[#E7F3F3] text-[#00B692]" : "bg-gray-100 text-gray-600"
          )}
        >
          {paid ? "Paid" : "Scheduled"}
        </span>
        <p className="mt-3 text-sm text-gray-500">
          {paid ? "Sent to" : "Scheduled to"} {bank.bankName} ••{bank.last4}
        </p>
      </div>

      {/* Payout facts */}
      <div className="mx-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <DetailRow label={paid ? "Date sent" : "Scheduled for"} value={payout.payoutDate} />
        <DetailRow label="Pay period" value={payout.weekLabel} />
        <DetailRow label="Type" value="Weekly payout" />
        <DetailRow label="Reference" value={reference} />
      </div>

      {/* What made up this payout */}
      <p className="px-4 pb-2 pt-6 text-xs font-medium uppercase tracking-wide text-gray-400">
        What made up this payout
      </p>
      <div className="mx-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <DetailRow label="Rides" value={`$${t.revenueTotal.toFixed(2)}`} />
        <DetailRow label="Incentives" value={`+$${t.incentivesTotal.toFixed(2)}`} />
        <DetailRow
          label="Send Backs"
          value={`−$${t.penaltiesTotal.toFixed(2)}`}
          tone="negative"
        />
        <DetailRow label="Total" value={`$${t.earnedTotal.toFixed(2)}`} bold />
      </div>
    </div>
  );
}
