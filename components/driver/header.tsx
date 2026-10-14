"use client";

import {
  MessageCircle,
  RefreshCw,
  SlidersHorizontal,
  ChevronLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface HeaderProps {
  title: string;
  showMessages?: boolean;
  showRefresh?: boolean;
  showFilter?: boolean;
  showBack?: boolean;
  onFilterClick?: () => void;
  onRefreshClick?: () => void;
  messageCount?: number;
  /**
   * How many filters are applied, shown on the filter icon.
   *
   * ⭐ Production's own, not an invention: `CAP-054` photographs the Requests
   * header with a green `2` on the filter icon, and the Map Request View
   * contract says it *"counts the filters you have added beyond day and time"*.
   * WHICH filters count is the caller's rule, never this component's.
   *
   * ⚠️ `0` renders no badge. A zero in a counter reads as a broken feature.
   */
  filterBadge?: number;
}

/**
 * The app header, unmodified from the production driver app.
 *
 * v1 deliberately adds no SUPPORT surface here. A support form belongs to a
 * trip, so the only way into one is from the trip — there is no trip-independent
 * entry point and nothing about support in the app chrome.
 *
 * ⚠️ `filterBadge` is the one later addition, and it is a replication rather
 * than an invention: `CAP-054` shows production's Requests header carrying
 * exactly this badge on exactly this icon.
 *
 * ⚠️ `app/requests/page.tsx` does NOT use it. That screen predates the prop and
 * renders its own absolutely-positioned button so it could carry a badge at
 * all; the two are duplicate MARKUP, not duplicate rules — each page decides
 * its own count. Worth merging, but a change to a replicated screen is its own
 * decision and not a side effect of adding a feature elsewhere.
 */
export function Header({
  title,
  showMessages = true,
  showRefresh = true,
  showFilter = false,
  showBack = false,
  onFilterClick,
  onRefreshClick,
  messageCount = 6,
  filterBadge = 0,
}: HeaderProps) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between bg-white px-4 shadow-sm">
      {/* Left side */}
      <div className="flex items-center gap-3">
        {showBack ? (
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center text-gray-700"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        ) : showMessages ? (
          <button className="relative flex h-10 w-10 items-center justify-center">
            <MessageCircle className="h-6 w-6 text-gray-700" />
            {messageCount > 0 && (
              <span className="absolute -right-0.5 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-[#EF4444] text-[10px] font-bold text-white">
                {messageCount}
              </span>
            )}
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* Center title */}
      <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold text-gray-900">
        {title}
      </h1>

      {/* Right side */}
      <div className="flex items-center gap-1">
        {showFilter && (
          <button
            onClick={onFilterClick}
            aria-label="Filter rides"
            aria-haspopup="dialog"
            className="relative flex h-10 w-10 items-center justify-center text-gray-700"
          >
            <SlidersHorizontal className="h-5 w-5" />
            {filterBadge > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#10B981] text-[10px] font-bold text-white">
                {filterBadge}
              </span>
            )}
          </button>
        )}
        {showRefresh && (
          <button
            onClick={onRefreshClick}
            className="flex h-10 w-10 items-center justify-center text-gray-700"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        )}
      </div>
    </header>
  );
}
