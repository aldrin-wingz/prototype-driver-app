"use client";

import { MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { absentReasonFor } from "@/lib/messages-data/chat-placement";
import { useChatPlacement } from "@/lib/messages-data/chat-placement-context";

/**
 * A dashed ghost where the chat affordance would have gone but doesn't.
 *
 * Without this, every "no" in the coverage table is indistinguishable from "we
 * ran out of time". The ghost says a slot was considered and declined; the study
 * strip carries the reason, because 40x40 cannot hold a sentence and a tooltip
 * does not survive a screenshot.
 *
 * Renders nothing unless the "Gaps" toggle is on, so it never pollutes a normal
 * placement capture.
 */
export function ChatSlotNote({ className }: { className?: string }) {
  const pathname = usePathname();
  const { placement, showAbsences } = useChatPlacement();

  if (!showAbsences) return null;

  const reason = absentReasonFor(pathname, placement);
  if (!reason) return null;

  return (
    <div
      title={reason}
      className={
        "flex h-10 w-10 items-center justify-center rounded border border-dashed border-gray-300 " +
        (className ?? "")
      }
    >
      <MessageCircle className="h-5 w-5 text-gray-300" />
    </div>
  );
}
