"use client";

import Image from "next/image";
import { Check, ChevronLeft, LifeBuoy, Plus, Send, X } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useToast } from "@/hooks/use-toast";
import {
  CHAT_COMPOSER_BORDER,
  CHAT_DATE_PILL,
  CHAT_GREEN,
  DRIVER_NAVY,
} from "@/constants/driver-app-colors";
import { useChatPlacement } from "@/lib/messages-data/chat-placement-context";
import { getThread, getVisibleThreads, type ChatThread } from "@/lib/messages-data/mock-threads";

/**
 * In-App Chat, as a bottom sheet over the current screen.
 *
 * ⚠️ A SHEET, not a route — this reverses an earlier call. I had argued for
 * routes so the destination stayed constant while the icon moved, but
 * `c-03a`/`c-04a` show production already does this as a sheet with a dimmed
 * backdrop, a centred title and an ✕. Matching what ships beats the tidier
 * comparison, and the sheet keeps the screen behind it visible, which is
 * arguably better for judging a placement anyway.
 *
 * Two views in one sheet, exactly as captured: the inbox, and a thread reached
 * from it with ‹ back / ✕ close.
 */
export function MessagesSheet() {
  const { chatOpen, closeChat, activeThreadId, openThread, backToInbox, coexistence } =
    useChatPlacement();

  const thread = activeThreadId ? getThread(activeThreadId) : undefined;

  return (
    <Drawer open={chatOpen} onOpenChange={(open) => !open && closeChat()}>
      {/* `[&>div:first-child]:hidden` kills the drag handle that DrawerContent
          bakes in. Production's chat sheet has none (c-03a) — but the SUPPORT
          form sheet does (s-02a), so this is scoped here, not in the primitive. */}
      <DrawerContent className="h-[78vh] rounded-t-2xl border-0 p-0 [&>div:first-child]:hidden">
        <DrawerTitle className="sr-only">
          {thread ? thread.title : "Messages"}
        </DrawerTitle>
        <div className="mx-auto flex h-full w-full max-w-md flex-col">
          {thread ? (
            <ThreadView thread={thread} onBack={backToInbox} onClose={closeChat} />
          ) : (
            <InboxView coexistence={coexistence} onOpen={openThread} onClose={closeChat} />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/* ── Inbox ─────────────────────────────────────────────────────────────── */

function InboxView({
  coexistence,
  onOpen,
  onClose,
}: {
  coexistence: "unified" | "separate";
  onOpen: (id: string) => void;
  onClose: () => void;
}) {
  const threads = getVisibleThreads(coexistence);

  return (
    <>
      <div className="relative flex h-14 shrink-0 items-center justify-center px-4">
        <h2 className="text-base font-bold text-gray-900">Messages</h2>
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 flex h-10 w-10 items-center justify-center text-gray-900"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {threads.map((thread) => (
          <InboxRow key={thread.id} thread={thread} onOpen={onOpen} />
        ))}

        {coexistence === "separate" && (
          <p className="px-4 py-4 text-xs leading-relaxed text-gray-400">
            Support Chat has its own entry point, so it is not listed here.
          </p>
        )}
      </div>
    </>
  );
}

function InboxRow({ thread, onOpen }: { thread: ChatThread; onOpen: (id: string) => void }) {
  const isSupport = thread.channel === "support";

  return (
    <button
      onClick={() => onOpen(thread.id)}
      className="flex w-full items-center gap-4 border-b border-gray-100 px-4 py-4 text-left transition-colors active:bg-gray-50"
    >
      {isSupport ? (
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: DRIVER_NAVY }}
        >
          <LifeBuoy className="h-6 w-6 text-white" />
        </span>
      ) : (
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gray-900">
          <Image src="/WINGZLOGO2.png" alt="" width={26} height={26} className="object-contain" />
        </span>
      )}

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

/* ── Thread ────────────────────────────────────────────────────────────── */

function ThreadView({
  thread,
  onBack,
  onClose,
}: {
  thread: ChatThread;
  onBack: () => void;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const isSupport = thread.channel === "support";

  return (
    <>
      <div className="relative flex h-14 shrink-0 items-center justify-center px-4">
        <button
          onClick={onBack}
          aria-label="Back"
          className="absolute left-2 flex h-10 w-10 items-center justify-center text-gray-900"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h2 className="truncate px-12 text-base font-bold text-gray-900">{thread.title}</h2>
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 flex h-10 w-10 items-center justify-center text-gray-900"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {isSupport ? (
        <SupportHandoff thread={thread} />
      ) : (
        <>
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

          <div className="flex shrink-0 items-center gap-3 border-t border-gray-100 px-4 py-3">
            <button
              onClick={() =>
                toast({
                  title: "Attach",
                  description: "Not wired in the prototype.",
                })
              }
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
      )}
    </>
  );
}

/**
 * Zendesk gets a handoff, not a transcript.
 *
 * Support Chat is a different application. Drawing its history as identical
 * bubbles here would assert an SDK embed nobody has scoped — and it would
 * pre-answer the study's own question, since two channels that look the same
 * are indistinguishable by construction rather than by finding.
 */
function SupportHandoff({ thread }: { thread: ChatThread }) {
  const { toast } = useToast();

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4">
      <div className="rounded-xl border border-gray-100 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Your open ticket
        </p>
        <p className="mt-1 font-medium text-gray-900">{thread.ticket?.subject}</p>

        <dl className="mt-4 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Status</dt>
            <dd className="font-medium text-gray-900">{thread.ticket?.status}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Last update</dt>
            <dd className="font-medium text-gray-900">{thread.ticket?.updatedAt}</dd>
          </div>
        </dl>

        <button
          onClick={() =>
            toast({
              title: "Support Chat",
              description: "Not wired in the prototype — this opens Zendesk.",
            })
          }
          className="mt-5 w-full rounded-lg py-3 text-sm font-semibold text-white"
          style={{ backgroundColor: DRIVER_NAVY }}
        >
          Open Support Chat
        </button>
      </div>

      <p className="mt-4 px-1 text-xs leading-relaxed text-gray-400">
        Support Chat runs in Zendesk, a separate app. Messages there stay there —
        they do not appear in your Wingz threads.
      </p>
    </div>
  );
}
