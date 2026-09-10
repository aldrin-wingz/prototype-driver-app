"use client";

import { LifeBuoy, MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { ChatSlotNote } from "@/components/dev/chat-slot-note";
import { DRIVER_NAVY } from "@/constants/driver-app-colors";
import { isChatVisible } from "@/lib/messages-data/chat-placement";
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
  const { toast } = useToast();
  const { placement, coexistence, openChat } = useChatPlacement();

  const chatVisible = isChatVisible(pathname, placement);
  const chatOnRight = chatVisible && placement === "header-right";
  const supportOnRight =
    chatVisible && coexistence === "separate" && placement !== "options-row";

  return (
    <>
      {chatOnRight && (
        <button
          onClick={openChat}
          className="relative flex h-10 w-10 items-center justify-center text-gray-700"
        >
          <MessageCircle className="h-5 w-5" />
          {MOCK_UNREAD_TOTAL > 0 && (
            <span className="absolute right-0 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#EF4444] text-[9px] font-bold text-white">
              {MOCK_UNREAD_TOTAL}
            </span>
          )}
        </button>
      )}
      {supportOnRight && (
        <button
          onClick={() =>
            toast({
              title: "Support Chat",
              description: "Not wired in the prototype — this opens Zendesk.",
            })
          }
          className="flex h-10 w-10 items-center justify-center"
          style={{ color: DRIVER_NAVY }}
        >
          <LifeBuoy className="h-5 w-5" />
        </button>
      )}
      <ChatSlotNote />
    </>
  );
}
