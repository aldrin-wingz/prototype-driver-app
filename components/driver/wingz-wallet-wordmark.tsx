import { cn } from "@/lib/utils";

/** Wingz brand font stack (General Sans loaded from Fontshare in layout). */
export const WINGZ_FONT =
  "'General Sans', 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif";

/**
 * The unified "wingz wallet" lockup: Wingz emblem + "wingz wallet" rendered as
 * one continuous wordmark (same brand font, size, weight, color). Used on the
 * dashboard Wallet card and the payout-portal wallet strip so they read
 * identically. Sized via `emblemClass` (height) + `textClass` (font size).
 */
export function WingzWalletWordmark({
  emblemClass = "h-7 w-auto",
  textClass = "text-2xl",
  className,
}: {
  emblemClass?: string;
  textClass?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/wingz-emblem.svg" alt="Wingz" className={cn("shrink-0", emblemClass)} />
      <span
        className={cn("font-medium lowercase tracking-tight text-[#E7F3F3]", textClass)}
        style={{ fontFamily: WINGZ_FONT }}
      >
        wingz wallet
      </span>
    </div>
  );
}
