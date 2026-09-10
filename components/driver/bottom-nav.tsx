"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  ClipboardList,
  Calendar,
  ClipboardCheck,
  Menu,
  MessageCircleQuestion,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useChatPlacement } from "@/lib/messages-data/chat-placement-context";
import { MOCK_UNREAD_TOTAL } from "@/lib/messages-data/mock-threads";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/requests", label: "Requests", icon: ClipboardList },
  { href: "/planner", label: "Planner", icon: Calendar },
  { href: "/my-rides", label: "My Rides", icon: ClipboardCheck },
  { href: "/options", label: "Options", icon: Menu },
];

/**
 * ⚠️ The label is "Chat", not "Messages", and that is a finding rather than a
 * preference: six cells in a 375px `max-w-md` row are ~62px each, and "Messages"
 * at text-xs needs ~53px of glyph plus the px-3 padding. It overflows. If this
 * placement wins, the tab cannot be called what the screen is called.
 */
const chatNavItem = { href: "__chat__", label: "Chat", icon: MessageCircleQuestion };

export function BottomNav() {
  const pathname = usePathname();
  const { placement, openChat, chatOpen } = useChatPlacement();

  const items = placement === "nav-tab" ? [...navItems, chatNavItem] : navItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#1F2937] bg-[#111827]">
      <div className="mx-auto flex h-16 max-w-md items-center justify-around">
        {items.map((item) => {
          // Prefix match so a tab stays lit inside its own stack (a thread under
          // /messages keeps Chat active). Home is exact — a bare startsWith
          // would make "/" match every route.
          const isChat = item.href === "__chat__";
          // The chat tab opens a sheet, so it is lit by sheet state, not path.
          const isActive = isChat
            ? chatOpen
            : item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Cell
              key={item.href}
              isChat={isChat}
              href={item.href}
              onOpenChat={openChat}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 transition-colors",
                isActive ? "text-[#10B981]" : "text-gray-400"
              )}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    "h-6 w-6",
                    isActive ? "fill-[#10B981] stroke-[#10B981]" : "stroke-current"
                  )}
                  fill={isActive ? "#10B981" : "none"}
                />
                {isChat && MOCK_UNREAD_TOTAL > 0 && (
                  <span className="absolute -right-1.5 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#EF4444] text-[9px] font-bold text-white">
                    {MOCK_UNREAD_TOTAL}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </Cell>
          );
        })}
      </div>
    </nav>
  );
}

/** A nav cell: a Link for a route, a button for the chat sheet. */
function Cell({
  isChat,
  href,
  onOpenChat,
  className,
  children,
}: {
  isChat: boolean;
  href: string;
  onOpenChat: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  if (isChat) {
    return (
      <button type="button" onClick={onOpenChat} className={className}>
        {children}
      </button>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}
