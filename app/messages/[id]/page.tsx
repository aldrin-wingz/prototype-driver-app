"use client";

import { use } from "react";
import { ChevronLeft, LifeBuoy } from "lucide-react";
import { notFound, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { DRIVER_NAVY } from "@/constants/driver-app-colors";
import { getThread } from "@/lib/messages-data/mock-threads";

interface PageProps {
  params: Promise<{ id: string }>;
}

/**
 * One conversation.
 *
 * An in-app thread renders bubbles. A Support thread renders a HANDOFF PANEL and
 * deliberately no transcript — Zendesk is a different application, and drawing
 * its history as inline bubbles here would quietly assert an SDK embed nobody has
 * scoped. It would also pre-answer the study's own question: if both look
 * identical, of course a driver cannot tell them apart, but only because the
 * mockup made them identical.
 */
export default function MessageThreadPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const thread = getThread(id);
  if (!thread) {
    notFound();
  }

  const isSupport = thread.channel === "support";

  return (
    <div className="flex min-h-screen flex-col bg-[#F9FAFB]">
      <header className="sticky top-0 z-50 flex h-14 items-center bg-white px-2 shadow-sm">
        <button
          onClick={() => router.push("/messages")}
          className="flex h-10 w-10 items-center justify-center text-gray-700"
        >
          <ChevronLeft className="h-7 w-7" />
        </button>
        <h1 className="flex-1 pr-10 text-center text-lg font-semibold text-gray-900">
          {thread.title}
        </h1>
      </header>

      {isSupport ? (
        <SupportHandoff
          subject={thread.ticket?.subject ?? ""}
          status={thread.ticket?.status ?? ""}
          updatedAt={thread.ticket?.updatedAt ?? ""}
          onOpen={() =>
            toast({
              title: "Support Chat",
              description: "Not wired in the prototype — this opens Zendesk.",
            })
          }
        />
      ) : (
        <>
          <main className="flex flex-1 flex-col gap-3 p-4">
            {thread.messages.map((message) => {
              const isMine = message.from === "me";
              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex flex-col gap-0.5",
                    isMine ? "items-end" : "items-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                      isMine
                        ? "rounded-br-md bg-[#10B981] text-white"
                        : "rounded-bl-md bg-white text-gray-900 shadow-sm"
                    )}
                  >
                    {message.body}
                  </div>
                  <span className="px-1 text-[10px] text-gray-400">
                    {message.timestamp}
                  </span>
                </div>
              );
            })}
          </main>

          {/* Disabled on purpose — sending answers nothing the study is asking. */}
          <div className="sticky bottom-0 border-t border-gray-200 bg-white px-4 py-3">
            <div className="flex h-11 items-center rounded-full bg-gray-100 px-4">
              <span className="text-sm text-gray-400">
                Messaging not wired in the prototype
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SupportHandoff({
  subject,
  status,
  updatedAt,
  onOpen,
}: {
  subject: string;
  status: string;
  updatedAt: string;
  onOpen: () => void;
}) {
  return (
    <main className="flex-1 p-4">
      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div
          className="mb-4 flex h-12 w-12 items-center justify-center rounded-full"
          style={{ backgroundColor: DRIVER_NAVY }}
        >
          <LifeBuoy className="h-6 w-6 text-white" />
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Your open ticket
        </p>
        <p className="mt-1 font-medium text-gray-900">{subject}</p>

        <dl className="mt-4 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Status</dt>
            <dd className="font-medium text-gray-900">{status}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Last update</dt>
            <dd className="font-medium text-gray-900">{updatedAt}</dd>
          </div>
        </dl>

        <button
          onClick={onOpen}
          className="mt-5 w-full rounded-lg py-3 text-sm font-semibold text-white"
          style={{ backgroundColor: DRIVER_NAVY }}
        >
          Open Support Chat
        </button>
      </div>

      <p className="mt-4 px-1 text-xs leading-relaxed text-gray-400">
        Support Chat runs in Zendesk, a separate app. Messages there stay there —
        they do not appear in your Wingz Team threads.
      </p>
    </main>
  );
}
