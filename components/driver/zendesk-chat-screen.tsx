"use client";

import { Paperclip } from "lucide-react";

import { Header } from "@/components/driver/header";
import {
  ZENDESK_COMPOSER_PLACEHOLDER,
  ZENDESK_SENT_STATUS,
  zendeskDeclineMessage,
} from "@/lib/driver-data/rider-declined";
import type { Trip } from "@/lib/driver-data/mock-trips";

/**
 * The Zendesk support chat, as production leaves it.
 *
 * ⭐⭐ **This is the dead end.** Tapping `Chat with Support` on the declined
 * sheet opens this and **auto-sends** the template; the driver typed nothing
 * and now waits. Replicated from `CAP-327`: dark thread, the driver's own
 * message on the right in teal, `Sent · Just now` beneath it, and a composer
 * they never used.
 *
 * ⛔⛔ **A SCREEN, not a sheet.** Production hands the driver to a full page,
 * and the difference is not cosmetic. A sheet sits over the ride with the ride
 * still behind it, which reads as *"you are still on your trip, just talking to
 * someone"*. A page is what actually happens — the driver has LEFT the ride,
 * and getting back to it is their problem.
 *
 * ⛔ **Read-only on purpose.** The composer does not submit and the thread has
 * no reply, because nobody has captured what Support says back. Inventing one
 * would put words in an agent's mouth on the screen meant to show what really
 * happens — and the waiting IS the finding.
 *
 * ⛔ The capture carries an agent's photograph and a real member's name.
 * Neither is replicated: no avatar here, and the name comes from the seed.
 *
 * ⚠️ Zendesk chat is NOT the in-app chat. Different surface, different product.
 */
export function ZendeskChatScreen({ trip }: { trip: Trip }) {
  const message = zendeskDeclineMessage(trip);

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
        {/* ⛔ No reply and no typing indicator. A thread that answered itself
            would be this mirror arguing the dead end is fine. */}
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
