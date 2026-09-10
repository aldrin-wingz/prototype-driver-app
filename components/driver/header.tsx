"use client";

import {
  MessageCircle,
  RefreshCw,
  SlidersHorizontal,
  ChevronLeft,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { ChatHeaderActions } from "@/components/dev/chat-header-actions";
import { isChatVisible } from "@/lib/messages-data/chat-placement";
import { useChatPlacement } from "@/lib/messages-data/chat-placement-context";
import { MOCK_UNREAD_TOTAL } from "@/lib/messages-data/mock-threads";

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
 * The app header, as captured from the production driver app — now under study.
 *
 * ⚠️ This replaces the v1 note that said the header "deliberately adds nothing…
 * no support surface in the app chrome". That was scoped to the Rider No-Show
 * question, where a support form belongs to a trip. In-App Chat is not a support
 * form and is not about a trip, so the chrome is exactly what is being decided.
 *
 * The MessageCircle in the top-left ALREADY SHIPS, badge and all, and already
 * goes nowhere. So `header-left` is a rewiring, not an addition — and the other
 * placements HIDE it rather than duplicating it, because the study is about where
 * one icon goes, not how many there are.
 *
 * At placement `off` this renders exactly as it did before the study existed.
 */
export function Header({
  title,
  showMessages = true,
  showRefresh = true,
  showFilter = false,
  showBack = false,
  onFilterClick,
  onRefreshClick,
  messageCount = MOCK_UNREAD_TOTAL,
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { placement, openChat } = useChatPlacement();

  const chatOnLeft = isChatVisible(pathname, placement) && placement === "header-left";

  // The dead icon stays put only in the control. Every other placement is that
  // same icon somewhere else, so leaving it here would show two.
  const showDeadIcon = placement === "off" && showMessages;

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
        ) : chatOnLeft ? (
          <button
            onClick={openChat}
            className="relative flex h-10 w-10 items-center justify-center"
          >
            <MessageCircle className="h-6 w-6 text-gray-700" />
            {messageCount > 0 && (
              <span className="absolute -right-0.5 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-[#EF4444] text-[10px] font-bold text-white">
                {messageCount}
              </span>
            )}
          </button>
        ) : showDeadIcon ? (
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
        <ChatHeaderActions />
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
