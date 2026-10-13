"use client";

import { Paperclip, X } from "lucide-react";

import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import {
  ZENDESK_COMPOSER_PLACEHOLDER,
  ZENDESK_SENT_STATUS,
  zendeskDeclineMessage,
} from "@/lib/driver-data/rider-declined";
import type { Trip } from "@/lib/driver-data/mock-trips";

/**
 * The Zendesk support chat, as production leaves it — catalogue row **16**'s
 * Now side.
 *
 * ⭐⭐ **This is the dead end.** Tapping `Chat with Support` on the declined
 * sheet opens this and **auto-sends** the template; the driver typed nothing and
 * now waits. Replicated from `CAP-327`: dark thread, the driver's own message on
 * the right in teal, `Sent · Just now` beneath it, and a composer they never
 * used.
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
export function ZendeskChatSheet({
  trip,
  open,
  onOpenChange,
}: {
  trip: Trip;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const message = zendeskDeclineMessage(trip);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-3xl border-0 bg-[#0B0F10] px-0 pb-0">
        <div className="flex items-center justify-between px-5 pt-4">
          <DrawerTitle className="text-sm font-semibold text-[#E7F3F3]">
            Wingz NEMT Support
          </DrawerTitle>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[#E7F3F3]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 max-h-[52vh] overflow-y-auto px-5 pb-4">
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
            ⛔ No reply, and no typing indicator. Nobody has captured what
            Support says back, and the waiting IS the finding — a thread that
            answered itself would be the prototype arguing the dead end is fine.
          */}
        </div>

        <div className="flex items-center gap-3 border-t border-white/10 px-5 py-4">
          <Paperclip className="h-5 w-5 shrink-0 text-[#E7F3F3]/60" aria-hidden />
          <div className="flex-1 rounded-full border border-white/25 px-4 py-2.5 text-[15px] text-[#E7F3F3]/45">
            {ZENDESK_COMPOSER_PLACEHOLDER}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
