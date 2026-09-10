/**
 * Colours sampled directly from the reference captures of the production
 * NEMT Driver App, rather than eyeballed or taken from the template.
 *
 * Sampled from `references/screenshots/canonical/` (s-01a/b/c and s-03a) with
 * the dominant-colour-per-region method; values are JPEG/WebP-quantised, so
 * treat them as accurate to a couple of levels rather than exact.
 *
 * These take precedence over template defaults on REPLICATED surfaces, per the
 * design-system directive in `PROTOTYPE-BIBLE.md`.
 */

/** Deep indigo used for all plain glyphs — phone, chat, mail, calendar. */
export const DRIVER_NAVY = "#303068";

/** Teal used for the pickup-side ring and the PICK UP MEMBER swipe CTA. */
export const DRIVER_TEAL = "#00B090";

/** Rose used for the drop-off-side ring. */
export const DRIVER_ROSE = "#E05878";

/** Slightly deeper rose used for filled destructive circles (Member No-Show). */
export const DRIVER_ROSE_DEEP = "#D85878";

/** Muted gold used for the Send Back Trip circle. */
export const DRIVER_GOLD = "#E0C878";

/** Near-black fill of the SWIPE TO START CTA. */
export const DRIVER_INK = "#282828";

/** Fill of the DROP OFF MEMBER CTA. */
export const DRIVER_DROPOFF = "#E06078";

/** Hairline divider between grid cells on the More Options screen. */
export const DRIVER_DIVIDER = "#F0F0F0";

/* ── In-App Chat ───────────────────────────────────────────────────────────
 * Sampled from `c-03a` (inbox) and `c-04a` (thread) — the production
 * onboarding chat. ⚠️ The chat green is NOT the driver green `#10B981`: it is
 * visibly lighter, and the same value carries both the outbound bubble and the
 * `Draft:` prefix.
 */

/** Outbound message bubble, and the green `Draft:` prefix in the inbox. */
export const CHAT_GREEN = "#5FCBAA";

/** The grey `Today` date pill that opens a thread. */
export const CHAT_DATE_PILL = "#F4F6F8";

/** Border of the composer's "Send a message" field. */
export const CHAT_COMPOSER_BORDER = "#C0C3C9";

/* ── Zendesk Support Chat ──────────────────────────────────────────────────
 * Sampled from `c-05a`. Zendesk is visually a different application: a dark
 * near-black conversation list under a teal bar, where the Wingz chat is white
 * with green bubbles. That contrast is doing real work in this study — it is
 * the strongest existing signal that these are two systems.
 */

/** The teal header bar of the Zendesk widget. */
export const ZENDESK_TEAL = "#26484C";

/** The near-black conversation list behind it. */
export const ZENDESK_BG = "#000000";

/** Indigo cast of the Wingz mark as Zendesk renders it. */
export const ZENDESK_LOGO = "#323265";
