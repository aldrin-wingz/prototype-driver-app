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
}

/**
 * The app header, unmodified from the production driver app.
 *
 * v1 deliberately adds nothing here. A support form belongs to a trip, so the
 * only way into one is from the trip — there is no trip-independent entry point
 * and no support surface in the app chrome.
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
            className="flex h-10 w-10 items-center justify-center text-gray-700"
          >
            <SlidersHorizontal className="h-5 w-5" />
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
