"use client";

import {
  Headset,
  MessageCircle,
  MessageCircleQuestion,
  RefreshCw,
  SlidersHorizontal,
  ChevronLeft,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { ChatSlotNote } from "@/components/dev/chat-slot-note";
import { CHAT_GREEN } from "@/constants/driver-app-colors";
import { isChatVisible } from "@/lib/messages-data/chat-placement";
import { useChatPlacement } from "@/lib/messages-data/chat-placement-context";
import { UNREAD_IN_APP, UNREAD_SUPPORT, UNREAD_TOTAL } from "@/lib/messages-data/mock-threads";

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
 * The app header, as captured from production — now carrying the options study.
 *
 * ⚠️ THE TOP-LEFT SPEECH BUBBLE IS ZENDESK, confirmed by the user 2026-09-11.
 * Everything here is about what happens in and next to that one slot:
 *
 *   off     — the Zendesk bubble alone. Exactly what ships.
 *   beside  — the same bubble, plus a green ?-bubble immediately next to it.
 *   roles   — the same two slots, but neither reads as "chat": Zendesk becomes
 *             a headset (Support) and the new one an Updates tray.
 *   merged  — ONE bubble carrying the combined badge, opening a chooser.
 *
 * Coverage is Home / Requests / My Rides only — the screens where the Zendesk
 * box actually appears (`c-01a`–`c-01c`). Elsewhere `showMessages` is still
 * honoured for the bubble itself but the study adds nothing.
 */
export function Header({
  title,
  showMessages = true,
  showRefresh = true,
  showFilter = false,
  showBack = false,
  onFilterClick,
  onRefreshClick,
  messageCount,
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { placement, openInApp, openSupport, openChooser } = useChatPlacement();

  const covered = isChatVisible(pathname, placement);
  const merged = covered && placement === "merged";
  // `beside` and `roles` share a geometry and differ only in what the icons say.
  const twoIcons = covered && (placement === "beside" || placement === "roles");
  const asRoles = placement === "roles";

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between bg-white px-4 shadow-sm">
      {/* Left side — the whole study lives here */}
      <div className="flex items-center">
        {showBack ? (
          <button
            onClick={() => router.back()}
            className="flex h-10 w-10 items-center justify-center text-gray-700"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        ) : merged ? (
          <IconButton
            label="Messages"
            badge={messageCount ?? UNREAD_TOTAL}
            onClick={openChooser}
          >
            <MessageCircle className="h-6 w-6 text-gray-700" />
          </IconButton>
        ) : showMessages ? (
          <>
            {/* Zendesk. Under `roles` it stops pretending to be generic chat. */}
            <IconButton
              label="Support Chat"
              badge={twoIcons ? UNREAD_SUPPORT : 0}
              onClick={openSupport}
            >
              {asRoles ? (
                <Headset className="h-6 w-6 text-gray-700" />
              ) : (
                <MessageCircle className="h-6 w-6 text-gray-700" />
              )}
            </IconButton>

            {twoIcons && (
              <IconButton label="Updates" badge={UNREAD_IN_APP} onClick={openInApp}>
                <MessageCircleQuestion className="h-6 w-6" style={{ color: CHAT_GREEN }} />
              </IconButton>
            )}
          </>
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
        <ChatSlotNote />
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

function IconButton({
  label,
  badge,
  onClick,
  children,
}: {
  label: string;
  badge: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="relative flex h-10 w-10 items-center justify-center"
    >
      {children}
      {badge > 0 && (
        <span className="absolute -right-0.5 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-[#EF4444] text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  );
}
