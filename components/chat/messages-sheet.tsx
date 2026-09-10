"use client";

import Image from "next/image";
import { Check, ChevronLeft, ChevronRight, Headset, MessageCircleQuestion, Plus, Send, X } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useToast } from "@/hooks/use-toast";
import {
  CHAT_COMPOSER_BORDER,
  CHAT_DATE_PILL,
  CHAT_GREEN,
  ZENDESK_BG,
  ZENDESK_TEAL,
} from "@/constants/driver-app-colors";
import { inAppLabel, SUPPORT_LABEL } from "@/lib/messages-data/chat-placement";
import { useChatPlacement } from "@/lib/messages-data/chat-placement-context";
import {
  getThread,
  inAppThreads,
  supportThreads,
  UNREAD_IN_APP,
  UNREAD_SUPPORT,
  UNREAD_TOTAL,
  type ChatThread,
} from "@/lib/messages-data/mock-threads";

/**
 * Everything the chat icons open, as a bottom sheet.
 *
 * A sheet and not a route because `c-03a`/`c-04a` show production already does
 * it that way. Four surfaces live in here:
 *
 *   chooser  — `merged` only. Splits the unread count before opening anything.
 *   wingz    — the in-app inbox, styled to `c-03a`.
 *   zendesk  — Support Chat, styled to `c-05a` (dark, teal bar).
 *   thread   — one in-app conversation, styled to `c-04a`.
 */
export function MessagesSheet() {
  const { view, close, activeThreadId, placement } = useChatPlacement();
  const thread = activeThreadId ? getThread(activeThreadId) : undefined;
  const isZendesk = view === "zendesk";

  return (
    <Drawer open={view !== null} onOpenChange={(open) => !open && close()}>
      <DrawerContent
        className="h-[78vh] rounded-t-2xl border-0 p-0 [&>div:first-child]:hidden"
        style={isZendesk ? { backgroundColor: ZENDESK_BG } : undefined}
      >
        <DrawerTitle className="sr-only">
          {thread ? thread.title : isZendesk ? SUPPORT_LABEL : "Messages"}
        </DrawerTitle>
        <div className="mx-auto flex h-full w-full max-w-md flex-col">
          {view === "chooser" && <ChooserView />}
          {view === "zendesk" && <ZendeskInbox />}
          {view === "wingz" && (thread ? <ThreadView thread={thread} /> : <WingzInbox placement={placement} />)}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/* ── Chooser (the `merged` option) ─────────────────────────────────────── */

/**
 * The extra tap that `merged` buys, and what it buys it for.
 *
 * A single merged badge of 7 is a number a driver cannot act on — it could be
 * Support waiting on a reply or Ops announcing a schedule change, and those
 * deserve different urgency. So the chooser's job is not routing, it is
 * SPLITTING: 3 from Support, 4 from Market Ops, before anything opens.
 */
function ChooserView() {
  const { openSupport, openInApp, close, placement } = useChatPlacement();

  return (
    <>
      <SheetHeader title="Messages" onClose={close} />

      <div className="px-4 pb-2 pt-1">
        <p className="text-sm text-gray-500">
          <span className="font-semibold text-gray-900">{UNREAD_TOTAL} new messages</span> — where
          do you want to go?
        </p>
      </div>

      <div className="flex-1 px-4 pt-2">
        <ChooserRow
          icon={<Headset className="h-6 w-6 text-white" />}
          iconBg={ZENDESK_TEAL}
          title={SUPPORT_LABEL}
          subtitle="Pay, account and general app help"
          count={UNREAD_SUPPORT}
          onClick={openSupport}
        />
        <div className="h-3" />
        <ChooserRow
          icon={<MessageCircleQuestion className="h-6 w-6 text-white" />}
          iconBg={CHAT_GREEN}
          title={inAppLabel(placement)}
          subtitle="Trip offers, confirmations, compliance and policy"
          count={UNREAD_IN_APP}
          onClick={openInApp}
        />

        <p className="mt-5 px-1 text-xs leading-relaxed text-gray-400">
          Support Chat runs in Zendesk, a separate app. Messages there stay there
          — they do not appear in your {inAppLabel(placement)} threads.
        </p>
      </div>
    </>
  );
}

function ChooserRow({
  icon,
  iconBg,
  title,
  subtitle,
  count,
  onClick,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-xl border border-gray-200 p-4 text-left transition-colors active:bg-gray-50"
    >
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: iconBg }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold text-gray-900">{title}</span>
        <span className="mt-0.5 block text-sm leading-snug text-gray-500">{subtitle}</span>
      </span>
      {count > 0 && (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#EF4444] text-xs font-bold text-white">
          {count}
        </span>
      )}
      <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
    </button>
  );
}

/* ── Shared sheet header ───────────────────────────────────────────────── */

function SheetHeader({
  title,
  onClose,
  onBack,
}: {
  title: string;
  onClose: () => void;
  onBack?: () => void;
}) {
  return (
    <div className="relative flex h-14 shrink-0 items-center justify-center px-4">
      {onBack && (
        <button
          onClick={onBack}
          aria-label="Back"
          className="absolute left-2 flex h-10 w-10 items-center justify-center text-gray-900"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      <h2 className="truncate px-12 text-base font-bold text-gray-900">{title}</h2>
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-3 flex h-10 w-10 items-center justify-center text-gray-900"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

/* ── Wingz inbox (c-03a) ───────────────────────────────────────────────── */

function WingzInbox({ placement }: { placement: ReturnType<typeof useChatPlacement>["placement"] }) {
  const { openThread, close, back } = useChatPlacement();
  const threads = inAppThreads();

  return (
    <>
      <SheetHeader
        title={placement === "merged" ? inAppLabel(placement) : "Messages"}
        onClose={close}
        onBack={placement === "merged" ? back : undefined}
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {threads.map((thread) => (
          <InboxRow key={thread.id} thread={thread} onOpen={openThread} />
        ))}
      </div>
    </>
  );
}

function InboxRow({ thread, onOpen }: { thread: ChatThread; onOpen: (id: string) => void }) {
  return (
    <button
      onClick={() => onOpen(thread.id)}
      className="flex w-full items-center gap-4 border-b border-gray-100 px-4 py-4 text-left transition-colors active:bg-gray-50"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-900">
        <Image src="/WINGZLOGO2.png" alt="" width={26} height={26} className="object-contain" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-lg font-bold text-gray-900">{thread.title}</span>
        <span className="mt-0.5 block truncate text-sm text-gray-500">
          {thread.draft ? (
            <>
              <span className="font-semibold" style={{ color: CHAT_GREEN }}>
                Draft:
              </span>{" "}
              {thread.draft}
            </>
          ) : (
            thread.preview
          )}
        </span>
      </span>
      {thread.unread > 0 && (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EF4444] text-[10px] font-bold text-white">
          {thread.unread}
        </span>
      )}
    </button>
  );
}

/* ── Zendesk inbox (c-05a) ─────────────────────────────────────────────── */

/**
 * Support Chat, reproduced rather than summarised.
 *
 * `c-05a` shows Zendesk opens its own conversation list — one row per topic,
 * each resolvable — on a near-black ground under a teal bar. Rendering that
 * instead of a handoff card is the honest version: it shows the driver really
 * does cross into another application, and the visual jolt is the clearest
 * existing signal that these are two systems.
 */
function ZendeskInbox() {
  const { close, back, placement } = useChatPlacement();
  const { toast } = useToast();
  const threads = supportThreads();

  return (
    <>
      <div
        className="relative flex h-14 shrink-0 items-center justify-center px-4"
        style={{ backgroundColor: ZENDESK_TEAL }}
      >
        {placement === "merged" && (
          <button
            onClick={back}
            aria-label="Back"
            className="absolute left-2 flex h-10 w-10 items-center justify-center text-white"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        <h2 className="text-lg font-bold text-white">Wingz</h2>
        <button
          onClick={close}
          aria-label="Close"
          className="absolute right-3 flex h-10 w-10 items-center justify-center text-white"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto" style={{ backgroundColor: ZENDESK_BG }}>
        {threads.map((thread) => (
          <button
            key={thread.id}
            onClick={() =>
              toast({
                title: "Support Chat",
                description: "Not wired in the prototype — this opens the Zendesk thread.",
              })
            }
            className="flex w-full items-start gap-4 border-b border-white/10 px-4 py-4 text-left"
          >
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center">
              <Image
                src="/WINGZLOGO2.png"
                alt=""
                width={34}
                height={34}
                className="object-contain opacity-70"
                style={{ filter: "hue-rotate(80deg) saturate(0.8)" }}
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline gap-2">
                <span className="text-base font-bold text-white">{thread.title}</span>
                <span className="text-sm text-gray-400">{thread.dateLabel}</span>
              </span>
              <span className="mt-1 block text-[15px] leading-snug text-gray-200">
                {thread.preview}
              </span>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

/* ── Thread (c-04a) ────────────────────────────────────────────────────── */

function ThreadView({ thread }: { thread: ChatThread }) {
  const { close, back } = useChatPlacement();
  const { toast } = useToast();

  return (
    <>
      <SheetHeader title={thread.title} onClose={close} onBack={back} />

      {/* Bottom-anchored, as captured — a short thread sits at the floor. */}
      <div className="flex min-h-0 flex-1 flex-col justify-end overflow-y-auto px-4 pb-3">
        <div className="flex justify-center py-3">
          <span
            className="rounded-full px-4 py-1.5 text-sm font-medium text-gray-700"
            style={{ backgroundColor: CHAT_DATE_PILL }}
          >
            {thread.dateLabel}
          </span>
        </div>

        {thread.messages.map((message) => {
          const isMine = message.from === "me";
          return (
            <div
              key={message.id}
              className={`flex flex-col ${isMine ? "items-end" : "items-start"} mt-3`}
            >
              <div
                className="max-w-[78%] rounded-[22px] px-4 py-2.5 text-[15px] leading-snug"
                style={
                  isMine
                    ? { backgroundColor: CHAT_GREEN, color: "#FFFFFF" }
                    : { backgroundColor: CHAT_DATE_PILL, color: "#111827" }
                }
              >
                {message.body}
              </div>
              {/* Tick and time sit OUTSIDE the bubble in production. */}
              <div className="mt-1 flex items-center gap-1.5 px-1 text-sm text-gray-500">
                {isMine && message.delivered && <Check className="h-4 w-4" />}
                <span>{message.timestamp}</span>
              </div>
            </div>
          );
        })}
      </div>

      {thread.consequence && (
        <p className="shrink-0 border-t border-gray-100 px-4 pt-2.5 text-xs leading-snug text-gray-500">
          <span className="font-semibold text-gray-700">If you don&apos;t reply:</span>{" "}
          {thread.consequence}
        </p>
      )}

      <div className="flex shrink-0 items-center gap-3 px-4 py-3">
        <button
          onClick={() => toast({ title: "Attach", description: "Not wired in the prototype." })}
          aria-label="Attach"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-gray-500"
          style={{ borderColor: CHAT_COMPOSER_BORDER }}
        >
          <Plus className="h-5 w-5" />
        </button>
        <div
          className="flex h-11 flex-1 items-center justify-between rounded-full border pl-4 pr-1.5"
          style={{ borderColor: CHAT_COMPOSER_BORDER }}
        >
          <span className="text-[15px] text-gray-400">Send a message</span>
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: CHAT_DATE_PILL }}
          >
            <Send className="h-4 w-4 text-gray-400" />
          </span>
        </div>
      </div>
    </>
  );
}
