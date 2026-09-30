/**
 * Wingz Wallet brand mark — the official Wingz emblem (green, reads on both
 * light and dark backgrounds). Used on the payout-portal wallet strip and the
 * Instant Payout sheet header. (The dashboard Wallet card uses the full
 * landscape wordmark instead.)
 */
export function WingzWalletMark({ size = 28 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/wingz-emblem.svg"
      alt="Wingz"
      className="shrink-0"
      style={{ width: size, height: size }}
    />
  );
}
