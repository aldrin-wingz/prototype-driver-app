"use client";

import Image from "next/image";
import { Check, ChevronLeft, ChevronRight, FileCheck, Headset, Plus, Route, Send, ShieldCheck, X } from "lucide-react";
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
  UNREAD_SUPPORT,
  type ChatChannelId,
  type ChatMessage,
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
 * What the driver sees first, and why it is one row per channel.
 *
 * ⭐ THE ROWS ARE DESTINATIONS, NOT A DIRECTORY. Support opens Zendesk's own
 * conversation list, because that is a separate application and pretending
 * otherwise hides a real seam. Each Ops row opens ITS CONVERSATION DIRECTLY —
 * there is no in-app inbox in between, because with three channels a list of
 * three would only ever be a second tap on the way to the same place.
 *
 * ⚠️ The counts are read from the threads, not written here. A hand-kept badge
 * beside a hand-kept thread list is two numbers that disagree the first time
 * either is edited.
 */

/** Per-channel chrome. Keyed by id so a missing channel fails loudly in tsc. */
const OPS_CHANNEL_META: Record<
  Exclude<ChatChannelId, "support">,
  { icon: typeof Route; subtitle: string }
> = {
  "trip-offers-dispatch": {
    icon: Route,
    subtitle: "Same-day offers, routed trips and confirmations",
  },
  "compliance-requirements": {
    icon: FileCheck,
    subtitle: "Document renewals and policy changes",
  },
  "safety-reliability": {
    icon: ShieldCheck,
    subtitle: "Incidents, no-shows and on-trip issues",
  },
};

function ChooserView() {
  const { openSupport, openInAppThread, close } = useChatPlacement();

  return (
    <>
      <SheetHeader title="Messages" onClose={close} />

      <div className="flex-1 space-y-3 px-4 pt-3">
        <ChooserRow
          icon={<Headset className="h-6 w-6 text-white" />}
          iconBg={ZENDESK_TEAL}
          title={SUPPORT_LABEL}
          subtitle="Pay, account and general app help"
          count={UNREAD_SUPPORT}
          onClick={openSupport}
        />

        {inAppThreads().map((thread) => {
          const meta = OPS_CHANNEL_META[thread.channel as Exclude<ChatChannelId, "support">];
          const Icon = meta.icon;
          return (
            <ChooserRow
              key={thread.id}
              icon={<Icon className="h-6 w-6 text-white" />}
              iconBg={CHAT_GREEN}
              title={thread.title}
              subtitle={meta.subtitle}
              count={thread.unread}
              onClick={() => openInAppThread(thread.id)}
            />
          );
        })}
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

/**
 * Where a date pill goes once a channel carries several days of conversation.
 *
 * ⚠️ The old single pill read `thread.dateLabel` once and stamped it over every
 * message. That was true while a thread was one topic on one day; a channel
 * that absorbed five of them spans three days, and one pill would have dated
 * a Sep 9 bonus notice as "Today".
 */
function withDayPills(thread: ChatThread): { message: ChatMessage; dayPill: string | null }[] {
  let running: string | null = null;
  return thread.messages.map((message, index) => {
    const day = message.day ?? (index === 0 ? thread.dateLabel : null);
    const dayPill = day && day !== running ? day : null;
    if (day) running = day;
    return { message, dayPill };
  });
}

function ThreadView({ thread }: { thread: ChatThread }) {
  const { close, back } = useChatPlacement();
  const { toast } = useToast();

  return (
    <>
      <SheetHeader title={thread.title} onClose={close} onBack={back} />

      {/* Bottom-anchored, as captured — a short thread sits at the floor. */}
      <div className="flex min-h-0 flex-1 flex-col justify-end overflow-y-auto px-4 pb-3">
        {withDayPills(thread).map(({ message, dayPill }) => {
          const isMine = message.from === "me";
          return (
            <div
              key={message.id}
              className={`flex flex-col ${isMine ? "items-end" : "items-start"} mt-3`}
            >
              {dayPill && (
                <div className="flex w-full justify-center py-3">
                  <span
                    className="rounded-full px-4 py-1.5 text-sm font-medium text-gray-700"
                    style={{ backgroundColor: CHAT_DATE_PILL }}
                  >
                    {dayPill}
                  </span>
                </div>
              )}
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
