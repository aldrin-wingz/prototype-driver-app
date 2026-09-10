"use client";

import { MessageCircleQuestion } from "lucide-react";
import { usePathname } from "next/navigation";
import { ChatSlotNote } from "@/components/dev/chat-slot-note";
import { CHAT_GREEN } from "@/constants/driver-app-colors";
import { isChatVisible, slotConflict } from "@/lib/messages-data/chat-placement";
import { useChatPlacement } from "@/lib/messages-data/chat-placement-context";
import { MOCK_UNREAD_TOTAL } from "@/lib/messages-data/mock-threads";

/**
 * The header-right chat cluster, in one place.
 *
 * Five screens hand-roll their own header — the ride detail, More Options, the
 * two incentives screens and Member No-Show — so without a shared component the
 * study would have six copies of this logic and they would disagree. Drop this
 * into any header's right side; it renders nothing at placement `off`.
 */
export function ChatHeaderActions() {
  const pathname = usePathname();
  const { placement, coexistence, openChat } = useChatPlacement();

  const chatVisible = isChatVisible(pathname, placement);
  const chatOnRight =
    chatVisible && placement === "header-right" && !slotConflict(placement, coexistence);

  return (
    <>
      {chatOnRight && (
        <button
          onClick={openChat}
          aria-label="Messages"
          className="relative flex h-10 w-10 items-center justify-center"
        >
          <MessageCircleQuestion className="h-5 w-5" style={{ color: CHAT_GREEN }} />
          {MOCK_UNREAD_TOTAL > 0 && (
            <span className="absolute right-0 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#EF4444] text-[9px] font-bold text-white">
              {MOCK_UNREAD_TOTAL}
            </span>
          )}
        </button>
      )}
      <ChatSlotNote />
    </>
  );
}
