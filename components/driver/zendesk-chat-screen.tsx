"use client";

import { Paperclip } from "lucide-react";

import { Header } from "@/components/driver/header";
import {
  ZENDESK_COMPOSER_PLACEHOLDER,
  ZENDESK_SENT_STATUS,
} from "@/lib/driver-data/rider-declined";
import {
  DEFAULT_SUPPORT_CHAT_TOPIC,
  supportChatMessage,
  type SupportChatTopic,
} from "@/lib/driver-data/support-chat";
import type { Trip } from "@/lib/driver-data/mock-trips";

/**
 * The Zendesk support chat — catalogue row **17**'s Now side, and row **14**'s
 * PROPOSED destination for a standing order.
 *
 * ⛔⛔ **One surface, two valences, and that is not a contradiction.** For
 * row 17 the chat is the dead end the proposal exists to replace: the app could
 * have handled it and did not. For row 14 the block is real and is NOT being
 * lifted, so Support genuinely has to do it — and chat beats production's
 * *"call into support"*. Same screen, opposite argument, which is why it takes
 * a `topic` rather than being copied.
 *
 * ⭐⭐ **This is the dead end.** Tapping `Chat with Support` on the declined
 * sheet opens this and **auto-sends** the template; the driver typed nothing and
 * now waits. Replicated from `CAP-327`: dark thread, the driver's own message on
 * the right in teal, `Sent · Just now` beneath it, and a composer they never
 * used.
 *
 * ⛔⛔ **A SCREEN, not a sheet.** It was built as a third drawer and that was
 * wrong: production hands the driver to a full page, and the difference is not
 * cosmetic. A sheet sits over the ride with the ride still behind it, which
 * reads as *"you are still on your trip, just talking to someone"*. A page is
 * what actually happens — the driver has LEFT the ride, and getting back to it
 * is their problem. That is the dead end, and a sheet softens it.
 *
 * ⛔ **Read-only on purpose.** The composer does not submit and the thread has
 * no reply, because the prototype cannot honestly show one — nobody has captured
 * what Support says back, and inventing it would put words in an agent's mouth
 * on the screen that is meant to show what really happens.
 *
 * ⛔ The capture also carries an agent's photograph and a real member's name.
 * Neither is replicated: there is no avatar here, and the name comes from the
 * seed.
 *
 * ⚠️ Zendesk chat is NOT the in-app chat. Different surface, different product.
 */
export function ZendeskChatScreen({
  trip,
  topic = DEFAULT_SUPPORT_CHAT_TOPIC,
}: {
  trip: Trip;
  /**
   * ⛔ Which conversation this is. Defaults to row 17's, so every existing
   * caller renders exactly what it rendered before this prop existed — the
   * screen gained a second topic, it did not change its first.
   */
  topic?: SupportChatTopic;
}) {
  const message = supportChatMessage(trip, topic);

  return (
    <div className="flex min-h-screen flex-col bg-[#0B0F10]">
      <Header title="Wingz NEMT Support" showBack showMessages={false} />

      <div className="flex-1 overflow-y-auto px-5 pb-4 pt-5">
        {/* The driver's own message — right-aligned and teal, as captured. */}
        <div className="flex justify-end">
          <div className="max-w-[88%] rounded-2xl bg-[#134E4A] px-4 py-3 text-left text-[15px] leading-snug text-white">
            <p>{message.intro}</p>
            <dl className="mt-2 space-y-0.5 pl-3">
              {message.lines.map((line) => (
                <div key={line.label} className="flex gap-1.5">
                  <dt className="shrink-0">{line.label}:</dt>
                  <dd className="min-w-0 break-words underline decoration-white/40">
                    {line.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <p className="mt-1.5 text-right text-xs text-[#E7F3F3]/50">
          {ZENDESK_SENT_STATUS}
        </p>
        {/*
          ⛔ No reply, and no typing indicator. Nobody has captured what Support
          says back, and the waiting IS the finding — a thread that answered
          itself would be the prototype arguing the dead end is fine.
        */}
      </div>

      <div className="flex items-center gap-3 border-t border-white/10 px-5 py-4">
        <Paperclip className="h-5 w-5 shrink-0 text-[#E7F3F3]/60" aria-hidden />
        <div className="flex-1 rounded-full border border-white/25 px-4 py-2.5 text-[15px] text-[#E7F3F3]/45">
          {ZENDESK_COMPOSER_PLACEHOLDER}
        </div>
      </div>
    </div>
  );
}
