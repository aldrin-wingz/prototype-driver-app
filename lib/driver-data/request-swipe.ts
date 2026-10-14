/**
 * Production's two-sided control at the foot of a request the driver may take.
 *
 * ⛔⛔ **One home, because two screens draw it.** A normal request shows
 * `Swipe to Reject` / `Swipe to Accept`; catalogue row 13 draws the same pill
 * with the accept half replaced. Retyping `Swipe to Reject` on the second
 * screen is how the two start disagreeing about a word production owns — the
 * failure this repo has already shipped once, with one rule copied into six
 * renderers that all agreed and were all wrong.
 *
 * ⚠️ **Replicated copy, not ours.** Both strings below are production's, read
 * off the request screen the base mirrors.
 *
 * ⛔⛔ **Decorative, on every request in this app.** The pill is a replica: the
 * base has no accept handler and no reject handler, because accepting a trip is
 * not what any of these prototypes are about. Row 13's proposal makes the
 * REQUEST half live — that is the slice — and leaves the reject half exactly as
 * inert as it is on every other request screen. ⚠️ So "the driver can still
 * reject" means the affordance production offers is back on screen, not that
 * this prototype has grown a rejection flow it has nowhere else. A check
 * asserts the base's own half is inert too, so the asymmetry reads as
 * replication rather than something half-wired.
 */
export const REQUEST_SWIPE_REJECT = "Swipe to Reject";
export const REQUEST_SWIPE_ACCEPT = "Swipe to Accept";
