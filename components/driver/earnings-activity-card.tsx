"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EarningsActivityItem } from "@/lib/data/wallet";

/**
 * One row in the Earnings Activity feed — a clean transaction line: signed
 * amount (green + for revenue/incentives, red − for send-backs), title, meta,
 * and (for rides/send-backs) pickup → dropoff addresses. A trailing chevron
 * signals the row is tappable; it deep-links to the relevant detail screen.
 */
export function EarningsActivityCard({ item }: { item: EarningsActivityItem }) {
  const negative = item.amount < 0;
  const amountText = `${negative ? "−" : "+"}$${Math.abs(item.amount).toFixed(2)}`;

  return (
    <Link
      href={item.href}
      className="flex items-start gap-3 px-4 py-4 transition-colors hover:bg-gray-50"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <p
            className={cn(
              "text-lg font-semibold",
              negative ? "text-[#DC2626]" : "text-[#00B692]"
            )}
          >
            {amountText}
          </p>
          {item.timeLabel && (
            <span className="shrink-0 text-sm text-gray-400">{item.timeLabel}</span>
          )}
        </div>

        <p className="mt-0.5 truncate text-sm font-semibold capitalize text-gray-900">
          {item.title.toLowerCase()}
          {item.type === "penalty" && (
            <span className="ml-2 rounded-full bg-[#FDECEC] px-2 py-0.5 align-middle text-[11px] font-semibold uppercase tracking-wide text-[#DC2626]">
              Sent back
            </span>
          )}
        </p>
        <p className="truncate text-xs text-gray-500">{item.meta}</p>

        {item.pickup && (
          <div className="mt-2.5 space-y-1.5">
            <AddressRow kind="origin" text={item.pickup} />
            <AddressRow kind="dest" text={item.dropoff} />
          </div>
        )}
      </div>

      <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-gray-300" />
    </Link>
  );
}

function AddressRow({ kind, text }: { kind: "origin" | "dest"; text?: string }) {
  if (!text) return null;
  return (
    <div className="flex items-center gap-2">
      {kind === "origin" ? (
        <span className="flex h-3 w-3 shrink-0 items-center justify-center rounded-full border-2 border-[#00B692]" />
      ) : (
        <span className="h-3 w-3 shrink-0 rounded-[3px] bg-[#353233]" />
      )}
      <span className="truncate text-xs text-gray-600">{text}</span>
    </div>
  );
}
