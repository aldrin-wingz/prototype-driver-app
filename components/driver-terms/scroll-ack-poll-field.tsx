"use client";

import { useCallback, useEffect, useRef } from "react";
import { ChevronsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { TERMS_FOOTER_HINT, TERMS_SCROLL_HINT, reachedEnd, scrollAckChoices } from "@/lib/driver-terms/acceptance";

/**
 * Web port of the Driver App's in-app onboarding T&C step,
 * `App/Components/DynamicForm/ScrollAckPollField.tsx` (driver-app `develop` @ cb752e40).
 *
 * ⚠️ BUILT FROM CODE, NOT A CAPTURE. The in-app T&C step has never been photographed
 * (only the web portal's Stage 2 has). Colours, sizes and copy are read from the RN
 * source: terms panel gray._11 / border gray._7 / radius 8, 12px text; poll card muted
 * until read, then green._4 with a green._6 border; selected choice 2px green._1.
 *
 * `hideDisagree` is the one change the T&C acceptance screen needs.
 */
export function ScrollAckPollField({
  slug, question, required, content, value, scrolled, onScrolled, onChange, hideDisagree = false, panelHeight = 300,
}: {
  slug: string;
  question: string;
  required: boolean;
  content: string;
  value: boolean | undefined;
  scrolled: boolean;
  onScrolled: () => void;
  onChange: (v: boolean) => void;
  hideDisagree?: boolean;
  panelHeight?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const choices = scrollAckChoices(slug, { hideDisagree });
  const muted = !scrolled;

  const check = useCallback(() => {
    const el = ref.current;
    if (el && reachedEnd(el.scrollTop, el.clientHeight, el.scrollHeight)) onScrolled();
  }, [onScrolled]);

  // Short text that fits without scrolling counts as read (app: maybeMarkScrolledIfContentFits).
  useEffect(() => { check(); }, [check, content]);

  return (
    <div className="mb-4">
      <div className="relative mb-2.5 overflow-hidden rounded-lg border border-[#D9D9D9] bg-[#F5F7F8]">
        <div
          ref={ref}
          onScroll={check}
          tabIndex={0}
          aria-label="Driver Terms and Conditions text"
          data-testid="terms-panel"
          style={{ height: panelHeight }}
          className="overflow-y-auto whitespace-pre-wrap break-words p-3 text-[12px] leading-[1.45] text-[#111111] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#16CFA9]"
        >
          {content}
        </div>
        {!scrolled && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 flex h-[84px] flex-col items-center justify-end gap-0.5 bg-gradient-to-b from-[#F5F7F8]/0 via-white/95 via-40% to-white pb-2 text-[12px] text-[#5D5D5D]"
          >
            <ChevronsDown className="h-[22px] w-[22px] animate-bounce text-[#5D5D5D] motion-reduce:animate-none" />
            <span>{TERMS_SCROLL_HINT}</span>
          </div>
        )}
      </div>

      <div
        data-testid="terms-poll"
        className={cn(
          "rounded-lg border p-3",
          muted ? "border-[#D9D9D9] bg-[#F4F4F5]/20" : "border-[#99E5D1] bg-[#EEFBF5]",
        )}
      >
        <p className={cn("mb-2.5 text-[14px] font-semibold", muted ? "text-[#9B9B9B]" : "text-[#111111]")}>
          {question}
          {required && <span className={muted ? "text-[#CF1322]/35" : "text-[#CF1322]"}> *</span>}
        </p>
        <div className="flex flex-col gap-2">
          {choices.map((c) => {
            const sel = value === c.value;
            return (
              <button
                key={c.label}
                type="button"
                disabled={muted}
                aria-pressed={sel}
                onClick={() => onChange(c.value)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg border bg-white p-3 text-left text-[12px] text-[#111111] disabled:cursor-not-allowed",
                  muted && "border-[#E5E5EA] text-[#9B9B9B]",
                  !muted && !sel && "border-[#99E5D1]",
                  sel && !muted && "border-2 border-[#16CFA9] bg-[#EEFBF5] p-[11px] text-[#3A3A3A]",
                )}
              >
                <span
                  className={cn(
                    "grid h-4 w-4 flex-none place-items-center rounded-full border bg-white",
                    muted ? "border-[#E5E5EA]" : "border-[#16CFA9]",
                  )}
                >
                  {sel && !muted && <span className="h-2.5 w-2.5 rounded-full bg-[#16CFA9]" />}
                </span>
                {c.label}
              </button>
            );
          })}
        </div>
        {muted && <p className="mt-2.5 text-[12px] text-[#9B9B9B]">{TERMS_FOOTER_HINT}</p>}
      </div>
    </div>
  );
}
