"use client";

import {
  MessageCircle,
  MessageCircleQuestion,
  RefreshCw,
  SlidersHorizontal,
  ChevronLeft,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { ChatHeaderActions } from "@/components/dev/chat-header-actions";
import { CHAT_GREEN } from "@/constants/driver-app-colors";
import { isChatVisible, slotConflict } from "@/lib/messages-data/chat-placement";
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
 * The app header, as captured from the production driver app.
 *
 * ⚠️ THE TOP-LEFT SPEECH BUBBLE IS ZENDESK, confirmed by the user 2026-09-11.
 * It is not ours to rewire — it is the existing Support Chat launcher, and
 * `c-01a`/`c-01b`/`c-01c` show it on Home, Requests and My Rides only. So:
 *
 *   - `off`            — the Zendesk bubble alone. Exactly what ships.
 *   - one inbox        — ONE icon at the chosen slot, absorbing Zendesk. At
 *                        `header-left` that is invisible to the driver: same
 *                        bubble, same place, different destination.
 *   - two entry points — the Zendesk bubble STAYS top-left and in-app chat gets
 *                        a second, green `?`-bubble elsewhere. Which is why
 *                        `header-left` + two entry points is impossible.
 *
 * The green `?`-in-bubble is not invented either — it is how the onboarding
 * flow already draws in-app chat (`c-02a`).
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
  const { toast } = useToast();
  const { placement, coexistence, openChat } = useChatPlacement();

  const covered = isChatVisible(pathname, placement);
  const conflict = slotConflict(placement, coexistence);

  // In-app chat takes the left slot only when it is the ONLY icon there.
  const chatOnLeft = covered && placement === "header-left" && !conflict;
  // Zendesk keeps its bubble unless in-app chat has absorbed it.
  const zendeskOnLeft = showMessages && !showBack && !chatOnLeft;

  function openSupportChat() {
    toast({
      title: "Support Chat",
      description: "Not wired in the prototype — this opens Zendesk.",
    });
  }

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
            aria-label="Messages"
            className="relative flex h-10 w-10 items-center justify-center"
          >
            <MessageCircle className="h-6 w-6 text-gray-700" />
            {messageCount > 0 && (
              <span className="absolute -right-0.5 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-[#EF4444] text-[10px] font-bold text-white">
                {messageCount}
              </span>
            )}
          </button>
        ) : zendeskOnLeft ? (
          <button
            onClick={openSupportChat}
            aria-label="Support Chat"
            className="flex h-10 w-10 items-center justify-center"
          >
            <MessageCircle className="h-6 w-6 text-gray-700" />
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

/** The in-app chat icon, as onboarding draws it (`c-02a`). */
export function InAppChatIcon({ className }: { className?: string }) {
  return <MessageCircleQuestion className={className} style={{ color: CHAT_GREEN }} />;
}
