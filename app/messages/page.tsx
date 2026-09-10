"use client";

import Link from "next/link";
import { LifeBuoy, MessageCircle } from "lucide-react";
import { Header } from "@/components/driver/header";
import { BottomNav } from "@/components/driver/bottom-nav";
import { DRIVER_NAVY } from "@/constants/driver-app-colors";
import { getVisibleThreads, type ChatThread } from "@/lib/messages-data/mock-threads";
import { useChatPlacement } from "@/lib/messages-data/chat-placement-context";

/**
 * The inbox — the destination every placement points at.
 *
 * A route rather than a drawer, and that is the study's decision not a
 * convenience: the variable under test is where the ICON is, and a drawer opens
 * over whatever screen you were on, which conflates "where the icon sits" with
 * "what is behind it". A route holds the destination constant so two screenshots
 * differ only in the thing being compared.
 *
 * Reachable by URL under every placement including `off`, so it can be inspected
 * even when no chrome exposes it.
 */
export default function MessagesPage() {
  const { placement, coexistence } = useChatPlacement();
  const threads = getVisibleThreads(coexistence);

  const inApp = threads.filter((thread) => thread.channel === "in-app");
  const support = threads.filter((thread) => thread.channel === "support");

  return (
    <div className={placement === "nav-tab" ? "flex min-h-screen flex-col pb-20" : "flex min-h-screen flex-col"}>
      <Header title="Messages" showBack showMessages={false} showRefresh={false} />

      <main className="flex-1 p-4">
        <ThreadGroup label="Wingz Team" threads={inApp} />

        {support.length > 0 && (
          <div className="mt-6">
            <ThreadGroup label="Support" threads={support} />
            <p className="mt-2 px-1 text-xs leading-relaxed text-gray-400">
              Support Chat runs in Zendesk — a separate app.
            </p>
          </div>
        )}

        {coexistence === "separate" && (
          <p className="mt-6 px-1 text-xs leading-relaxed text-gray-400">
            Support Chat has its own entry point in the header, so it is not
            listed here.
          </p>
        )}
      </main>

      {placement === "nav-tab" && <BottomNav />}
    </div>
  );
}

function ThreadGroup({ label, threads }: { label: string; threads: ChatThread[] }) {
  if (threads.length === 0) return null;

  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </h2>
      <div className="space-y-2">
        {threads.map((thread) => (
          <ThreadRow key={thread.id} thread={thread} />
        ))}
      </div>
    </section>
  );
}

function ThreadRow({ thread }: { thread: ChatThread }) {
  const isSupport = thread.channel === "support";
  const Icon = isSupport ? LifeBuoy : MessageCircle;

  return (
    <Link
      href={`/messages/${thread.id}`}
      className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-sm transition-colors hover:bg-gray-50"
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: isSupport ? DRIVER_NAVY : "#10B981" }}
      >
        <Icon className="h-5 w-5 text-white" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-medium text-gray-900">{thread.title}</p>
          <span className="shrink-0 text-xs text-gray-400">{thread.timestamp}</span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-gray-500">
          {thread.preview}
        </p>
      </div>

      {thread.unread > 0 && (
        <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EF4444] text-[10px] font-bold text-white">
          {thread.unread}
        </span>
      )}
    </Link>
  );
}
