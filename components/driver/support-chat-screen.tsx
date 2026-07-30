"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Paperclip, Send } from "lucide-react";
import { useRideFlow } from "@/lib/support-data/ride-flow-context";
import type { Trip } from "@/lib/driver-data/mock-trips";

interface ChatMessage {
  id: string;
  from: "driver" | "support";
  /** Preserves newlines, which the templates rely on. */
  body: string;
  stamp?: string;
}

/**
 * Seeded history so the thread reads like an ongoing conversation rather than a
 * blank screen. Copy taken from reference capture `s-04c`, including the real
 * support contact details.
 */
const SEEDED_HISTORY: ChatMessage[] = [
  {
    id: "seed-1",
    from: "support",
    body:
      "Thank you for contacting Wingz NEMT Support. If you have any other questions or need further assistance, please don't hesitate to reach out either through chat on your driver app, email at nemtsupport@wingz.com or call us for urgent concerns at (470) 227-8878. Have a great day!",
  },
  {
    id: "seed-2",
    from: "support",
    body: "Sorry I couldn't answer your question. Would you like to chat with an agent?",
  },
];

/**
 * Low-fidelity in-app support chat.
 *
 * Built for brainstorming, not fidelity — the point is to show that a flow like
 * declining a trip or filing a no-show hands Support a COMPLETE, structured
 * message with no typing from the driver. Dark theme and bubble alignment follow
 * `s-04c`.
 *
 * This screen only DISPLAYS templates; the flow that produced one is what wrote
 * it. That matters: the template used to be composed here and spliced in on
 * arrival, so simply opening a ride's chat showed a decline message for a ride
 * nobody had declined.
 */
export function SupportChatScreen({
  trip,
  backHref,
}: {
  trip: Trip;
  backHref: string;
}) {
  const router = useRouter();
  const { getSupportMessages } = useRideFlow();
  const [draft, setDraft] = useState("");
  const [extraMessages, setExtraMessages] = useState<ChatMessage[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  const sentTemplates = getSupportMessages(trip.id);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [extraMessages.length]);

  const messages: ChatMessage[] = [
    ...SEEDED_HISTORY,
    ...sentTemplates.map((body, index) => ({
      id: `template-${index}`,
      from: "driver" as const,
      body,
      stamp: "Sent · Just now",
    })),
    ...extraMessages,
  ];

  function send() {
    const body = draft.trim();
    if (!body) return;
    setExtraMessages((previous) => [
      ...previous,
      { id: `msg-${previous.length}`, from: "driver", body, stamp: "Sent" },
    ]);
    setDraft("");
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#0F1417]">
      <header className="sticky top-0 z-20 flex items-center gap-2 bg-[#0F1417] px-4 py-4">
        <button
          type="button"
          onClick={() => router.push(backHref)}
          aria-label="Back"
          className="text-white"
        >
          <ChevronLeft className="h-7 w-7" />
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-white">Wingz NEMT Support</h1>
          <p className="text-xs text-gray-400">Trip {trip.id}</p>
        </div>
      </header>

      <div className="flex-1 space-y-4 px-4 pb-32 pt-2">
        {messages.map((message) => {
          const isDriver = message.from === "driver";
          return (
            <div
              key={message.id}
              className={isDriver ? "flex flex-col items-end" : "flex flex-col items-start"}
            >
              {!isDriver && (
                <span className="mb-1 text-xs text-gray-400">Wingz</span>
              )}
              <div
                className={
                  isDriver
                    ? "max-w-[85%] whitespace-pre-line rounded-2xl bg-[#134E4A] px-4 py-3 text-[15px] leading-snug text-white"
                    : "max-w-[85%] whitespace-pre-line rounded-2xl bg-[#252B31] px-4 py-3 text-[15px] leading-snug text-gray-100"
                }
              >
                {message.body}
              </div>
              {message.stamp && (
                <span className="mt-1 text-xs text-gray-500">{message.stamp}</span>
              )}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="fixed bottom-0 left-0 right-0 flex items-center gap-3 bg-[#0F1417] px-4 py-4">
        <Paperclip className="h-6 w-6 flex-shrink-0 text-gray-400" />
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") send();
          }}
          placeholder="Type a message"
          className="h-12 flex-1 rounded-full border border-gray-600 bg-transparent px-5 text-base text-white placeholder:text-gray-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={send}
          aria-label="Send"
          className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#1ECFA0]"
        >
          <Send className="h-5 w-5 text-white" />
        </button>
      </div>
    </div>
  );
}
