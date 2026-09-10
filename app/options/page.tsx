"use client";

import Link from "next/link";
import { Header } from "@/components/driver/header";
import { BottomNav } from "@/components/driver/bottom-nav";
import { Settings, History, HelpCircle, LogOut, ChevronRight, MessageCircle } from "lucide-react";
import { useChatPlacement } from "@/lib/messages-data/chat-placement-context";
import { MOCK_UNREAD_TOTAL } from "@/lib/messages-data/mock-threads";

const baseMenuItems = [
  { 
    icon: History, 
    label: "Ride History", 
    href: "/ride-history",
    description: "View your completed trips"
  },
  { 
    icon: Settings, 
    label: "Settings", 
    href: "#",
    description: "App preferences and account"
  },
  { 
    icon: HelpCircle, 
    label: "Help & Support", 
    href: "#",
    description: "Get help and contact support"
  },
  { 
    icon: LogOut, 
    label: "Log Out", 
    href: "#",
    description: "Sign out of your account"
  },
];

/**
 * Under the `options-row` placement the chat lives here and nowhere else — no
 * chrome change at all. Cheapest to build and least discoverable: the unread
 * badge does no work if the driver has to go looking for it.
 *
 * Under "two entry points" this is also where Support Chat stays, so the two
 * appear as sibling rows rather than as two competing icons.
 */
export default function OptionsPage() {
  const { placement, coexistence, openChat } = useChatPlacement();

  const messagesRow = {
    icon: MessageCircle,
    label: "Messages",
    href: "__chat__",
    description:
      coexistence === "separate"
        ? `${MOCK_UNREAD_TOTAL} unread from the Wingz team`
        : `${MOCK_UNREAD_TOTAL} unread — Wingz team and Support`,
  };

  // Insert above "Help & Support" so the two chats read as siblings.
  const menuItems =
    placement === "options-row"
      ? [baseMenuItems[0], baseMenuItems[1], messagesRow, ...baseMenuItems.slice(2)]
      : baseMenuItems;

  return (
    <div className="flex min-h-screen flex-col pb-20">
      <Header title="Options" showFilter={false} showRefresh={false} />
      
      <main className="flex-1 p-4">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <MenuRow
                key={item.label}
                href={item.href}
                onOpenChat={openChat}
                className="flex w-full items-center gap-4 rounded-xl bg-white p-4 text-left shadow-sm transition-colors hover:bg-gray-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                  <Icon className="h-5 w-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.label}</p>
                  <p className="text-sm text-gray-500">{item.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </MenuRow>
            );
          })}
        </div>
        
        <p className="mt-8 text-center text-sm text-gray-400">
          (Placeholder - not part of prototype scope)
        </p>
      </main>
      
      <BottomNav />
    </div>
  );
}

/** A menu row: a Link for a route, a button for the chat sheet. */
function MenuRow({
  href,
  onOpenChat,
  className,
  children,
}: {
  href: string;
  onOpenChat: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  if (href === "__chat__") {
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
