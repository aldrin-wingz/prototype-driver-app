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

/**
 * The Reach Rider modal's `Next` button, and its selected-option ring.
 *
 * ⚠️ Sampled from `Stage 01 - Member Confirmation - Reach Rider modal
 * (same-day).webp` in the Flow Reference shoot, NOT from the canonical folder
 * the constants above come from. Different shoot, different device, so treat
 * it as close rather than matched.
 */
export const DRIVER_SPRING = "#00E8A8";

/** The same button before an option is picked — the disabled state. */
export const DRIVER_SPRING_MUTED = "#A6E3CD";
