/**
 * The 26 proposed features from the support call analysis, made executable.
 *
 * Source: `References/Support Call Volume by Subject Area - Problems and
 * Proposed Features.xlsx`. One entry per row of that table, so the prototype
 * selector is a faithful mirror of the analysis rather than a convenient subset
 * of it — including the rows there is nothing to build for, which carry a
 * reason instead of an entry point.
 *
 * ⚠️ `calls` is the SUBJECT AREA's total, not the row's. Several rows share one
 * subject area, exactly as the spreadsheet merges those cells. Summing `calls`
 * across entries would therefore multiply-count; sum across DISTINCT subject
 * areas, which is what `scripts/verify-solutions.ts` asserts.
 */

/** Total support calls that carry a subject area at all. The denominator. */
export const CATEGORIZED_CALLS = 7483;

/**
 * Calls covered by the 15 subject areas below.
 *
 * ⚠️ Declared, not derived. A total computed from the same array it checks
 * cannot fail. `verify-solutions` compares the array against this literal.
 */
export const COVERED_CALLS = 6665;

/**
 * What kind of thing the proposed feature is. This decides what "built" means.
 *
 * - `form`    — a driver submission, rendered by the shared support form runtime
 * - `surface` — a driver-facing screen, state, banner or control; no submission
 * - `no-app-surface` — backend, data or policy. Listed so the set stays
 *   complete and the call totals still reconcile, but there is nothing to build
 *   in the driver app.
 */
export type SolutionClass = "form" | "surface" | "no-app-surface";

/**
 * ⚠️ Project vocabulary, locked at scaffold. These render as "In prototype" and
 * "⚠️ Not in prototype yet". Never "BUILT" / "NOT-BUILT".
 */
export type BuildState = "in-prototype" | "not-yet";

export interface SolutionEntry {
  /** Where the demo starts. */
  route: string;
  /** What the driver does from there. */
  label: string;
  /**
   * Other states of the SAME slice worth showing.
   *
   * ⚠️ A slice is not always one screen. Rider No-Show has two branches of a
   * single check — the driver is at the pick-up, or they are not — and showing
   * only one of them demonstrates half the case. Alternates keep the catalogue
   * at one row per spreadsheet row while making both reachable.
   */
  alternates?: Array<{ route: string; label: string }>;
}

/**
 * Where the app lands when a focused solution has nowhere of its own to go.
 *
 * ⛔ 21 of the 26 rows have no entry point, and `focus()` used to just rewrite
 * the query string for those — leaving whoever switched standing on the
 * PREVIOUS solution's ride detail screen, reading a briefing about something
 * else, with that ride filtered out of its own list. Switching has to move the
 * app somewhere every solution means the same thing, and the ride list is it:
 * focused, it is either the solution's scenario rides or an empty tab that says
 * so by name.
 *
 * Declared here rather than written inline so `scripts/verify-solutions.ts` can
 * assert the route resolves to a real page.
 */
export const SOLUTION_HOME = "/my-rides";

export interface Solution {
  id: string;
  /** 1-26, call-volume order — the order the phases are built in. */
  order: number;
  subjectArea: string;
  /** The SUBJECT AREA's call total. Shared across that area's rows. */
  calls: number;
  problem: string;
  useCase: string;
  proposedFeature: string;
  klass: SolutionClass;
  buildState: BuildState;
  /** `null` until the slice is in the prototype. */
  entry: SolutionEntry | null;
  /** Several rows can point at one build — the requests tray serves two. */
  sharedBuildWith?: string;
  /** Required when `klass` is `no-app-surface`; forbidden otherwise. */
  noSurfaceReason?: string;
}

/**
 * ⚠️ Production ALREADY collects the proof that row 02 proposes to act on.
 *
 * Selecting `Cancel At Door` on the production Member No-Show screen swaps
 * `Driver Signature` for `Member Signature` and adds a required free-text
 * `Spoke with`. Confirmed three ways: a 2026-10 production screenshot; the
 * warehouse columns `bronze.ride_observation.noshow_type` and `.spoke_with`;
 * and the shape of the data — `spoke_with` holds 3,601 DISTINCT values across
 * 6,940 Cancel At Door observations in the last 12 months (real names), versus
 * 122 and 51 distinct for the other two types, which are placeholders.
 *
 * ⛔ The Apr-2026 captures (CAP-229/230/231) show only the EMPTY state, so the
 * capture library does not contain this variant. The screenshot needs
 * registering before anything is built against it.
 *
 * So row 02 is not "add a signature". It is "stop discarding one".
 */
const NO_SHOW =
  "Driver waits → gives up and leaves → remembers the no-show → now too far for the app to accept it → calls Support";

export const SOLUTIONS: Solution[] = [
  {
    id: "rider-no-show",
    order: 1,
    subjectArea: "Member / Rider No-Show",
    calls: 882,
    problem: "Rider no-show",
    useCase: NO_SHOW,
    proposedFeature:
      "Driver files the no-show in-app at the curb; the answers submit to Zendesk as a ticket, handled asynchronously instead of on a call",
    klass: "form",
    buildState: "in-prototype",
    entry: {
      route: "/my-rides/1049800377/more",
      label:
        "More Options → Member No-Show. The driver is 0.6 mi out at a hospital campus, so waiting can never place them at the pick-up and the form is offered.",
      alternates: [
        {
          route: "/my-rides/1049800373/more",
          label:
            "The other branch — the driver IS at the pick-up but short of ten minutes, so the refusal carries a live countdown and deliberately offers NO form. A form here would be a way to skip the wait. (Selecting Cancel At Door on this same ride is slice 02, and files instead.)",
        },
      ],
    },
  },
  {
    id: "cancel-at-door",
    order: 2,
    subjectArea: "Member / Rider No-Show",
    calls: 882,
    problem: "Driver must still wait 10 min even after selecting Cancel at Door",
    useCase:
      "Driver selects Cancel at Door → app asks who refused the ride and takes the member's signature → enforces the 10-minute wait anyway → driver waits at a door they have already been turned away from → driver calls Support",
    /**
     * ⚠️ Reworded twice on 2026-10-09, both times by evidence rather than by
     * preference. First: production already captures a member signature, so this
     * was never "add a signature". Then `CAP-232`–`CAP-234`: the signature
     * carries no `*` in ANY of the three types, so it is optional and cannot be
     * the thing a guardrail hangs on. `Spoke with` is the required one, and it is
     * the one the warehouse can audit — `ride_observation.spoke_with`, ~99%
     * populated for Cancel At Door, against no signature column anywhere.
     */
    proposedFeature:
      "Let Cancel at Door skip the 10-minute wait, in exchange for two questions it asks instead → who came to the door (the member, someone else, or no one) → and what that person is to the member → nobody at the door earns no skip, because that is a Member Not Home",
    klass: "form",
    buildState: "in-prototype",
    entry: {
      route: "/my-rides/1049800373/more",
      label:
        "More Options → Member No-Show. The same ride slice 01 uses for the countdown: the driver is at the pick-up but short of ten minutes. Pick Member Not Home and it counts down. Pick Cancel At Door and two questions open instead — answer 'the member' and it files, answer 'no one came to the door' and the countdown comes back.",
    },
  },
  {
    id: "missed-swipe",
    order: 3,
    subjectArea: "Trip Data Update / Completion",
    calls: 805,
    problem: "Missed swipe",
    useCase:
      "Driver forgets to swipe the pick-up → the app will not offer the drop-off until the pick-up exists → the whole rest of the leg goes unrecorded → driver calls Support to reconstruct the trip from memory",
    /**
     * ⚠️ Reworded on 2026-10-09 against `silver.ride_silver` and
     * `bronze.location`. Two measurements moved it:
     *
     * 1. A missed pick-up is not one missing timestamp, it is the whole leg.
     *    Over 30 days, 14 legs missed ONLY the pick-up against 2,521 that
     *    missed both — because the pick-up swipe gates the drop-off swipe. So
     *    the feature is an UNBLOCK first and a form second.
     * 2. "Times prefilled" was doing a lot of unexamined work. The background
     *    location trail is real (median 271 fixes a leg, present on 99% of
     *    them) but it places the driver at the pick-up on only 53.3% of
     *    missed-swipe legs and at the drop-off on 33.6%, against 89.6% / 92.6%
     *    on a swiped control. Prefill is worth building and is NOT the common
     *    case, so the proposal has to carry what happens when it misses.
     */
    proposedFeature:
      "The swipe itself is the trigger — tap PICK UP MEMBER from outside the pick-up geofence and the app asks the one thing only the driver knows, is the member still in the car → if yes, take the drop-off properly, odometer and signature and all, then confirm the pick-up alone → if not, confirm both ends → a drop-off missed the same way leaves the rider signature gone for good, so the leg ends COMPLETE and pending rather than simply late → every field is prefilled with what the app holds and only the ends being confirmed can be edited",
    klass: "form",
    buildState: "in-prototype",
    entry: {
      route: "/my-rides/1049800381",
      label:
        "Tap PICK UP MEMBER. The driver is a mile past the pick-up, so the app asks whether the member is still in the car. Answer YES (1a) → the button becomes DROP OFF MEMBER, which production would not offer → the drop-off takes its odometer and the member's signature as normal → then a form confirming the PICK-UP alone. Answer NO (1b) → one form confirming BOTH ends, and the rider signature is gone for good. Ride 1049800382 is the other case: the pick-up was swiped properly and only the drop-off was missed, so only the drop-off is confirmable.",
    },
  },
  {
    id: "tag-number-invalid",
    order: 4,
    subjectArea: "Trip Confirmation",
    calls: 747,
    problem:
      "Driver wants to push through with the trip but cannot reach the member",
    useCase:
      "Ex 1 — Number is invalid → Support calls to confirm it is invalid → Support calls the broker for a new number",
    /**
     * ⛔⛔ **Reworded 2026-10-09, and the change is about WHO decides.**
     *
     * The spreadsheet reads "driver tags the number invalid from the app". That
     * names the wrong actor. Whether a number is invalid is a judgement made
     * across every trip that number appears on — an agent-side CS Tool feature,
     * and one this driver-app-only prototype is not the place for. A driver has
     * one failed call and cannot see the rest.
     *
     * What the driver CAN report honestly is which number they tried and what
     * happened when they dialled, and "the number was disconnected or not in
     * service" is the answer an agent reads as a candidate invalid number. So
     * the driver-app half of this row is a report, not a tag — the agent-side
     * half stays out of scope and is named as such rather than quietly claimed.
     */
    proposedFeature:
      "Driver reports a specific number as unreachable, with what happened and photo proof of the attempt, so Support has the evidence before it calls — ⚠️ Not in prototype yet: deciding a number is INVALID across its trips is an agent-side CS Tool feature, outside this driver-app prototype",
    // Was "surface". Both this row and row 05 open the same form from two
    // different places, so the distinction between them stopped meaning
    // anything the moment they became one build.
    klass: "form",
    buildState: "in-prototype",
    sharedBuildWith: "cannot-reach-member",
    entry: {
      route: "/my-rides/1049800391",
      label:
        "Tap I REACHED OUT TO CONFIRM. The STANDARD Reach Rider modal opens with its three production options — note that option 3, 'No, try again later', closes and changes nothing, which is the whole problem. Pick the fourth option to report which number you tried and what happened.",
      alternates: [
        {
          route: "/my-rides/1049800392",
          label:
            "The SAME-DAY variant, on a will-call ride. Option 3 here reads 'No, but I will go to the pickup as scheduled' and ADVANCES the trip — today a driver who cannot reach the member drives out unconfirmed instead of telling anyone. This ride also carries only TWO member numbers, so the form offers two.",
        },
      ],
    },
  },
  {
    id: "cannot-reach-member",
    order: 5,
    subjectArea: "Trip Confirmation",
    calls: 747,
    problem:
      "Driver wants to push through with the trip but cannot reach the member",
    useCase:
      "Ex 2 — Driver calls the facility → hits a confusing IVR → gives up → Support navigates the IVR for them",
    proposedFeature:
      "“Cannot reach member” in-app form where the driver adds what they tried; filed asynchronously instead of being held on the line",
    klass: "form",
    buildState: "in-prototype",
    sharedBuildWith: "tag-number-invalid",
    entry: {
      route: "/my-rides/1049800391/more",
      // ⚠️ The second door onto the same form. Row 04 reaches it from the
      // confirmation modal, which only exists while a trip is unconfirmed; this
      // one is in More Options, which is reachable at any stage.
      label:
        "More Options → the eighth tile. Same form as row 04, reached without going through the confirmation modal — both entry points call one builder, so the two paths cannot drift into asking different questions.",
    },
  },
  {
    id: "ai-assistant",
    order: 6,
    subjectArea: "Trip-Related Questions",
    calls: 657,
    problem: "Random questions that are unclear to the driver",
    useCase:
      "Ex 1 — Instruction reads “Do not book Police department: UBM” → driver cannot tell what it means → calls Support",
    proposedFeature:
      "In-app AI assistant answering from Help Desk articles and the current leg's own data, escalating anything it cannot resolve",
    klass: "surface",
    buildState: "not-yet",
    entry: null,
  },
  {
    id: "multiload-disclosure",
    order: 7,
    subjectArea: "Trip-Related Questions",
    calls: 657,
    problem: "Random questions that are unclear to the driver",
    useCase:
      "Ex 2 — Driver assigned a multiload → unsure the member agreed to share → calls Support to verify",
    proposedFeature:
      "Ride Details states plainly that the leg is shared, how many riders, and that the client authorised it",
    klass: "surface",
    buildState: "not-yet",
    entry: null,
  },
  {
    id: "coded-term-definitions",
    order: 8,
    subjectArea: "Trip-Related Questions",
    calls: 657,
    problem: "Random questions that are unclear to the driver",
    useCase:
      "Ex 3 — Driver sees C2C / D2D on the trip → does not know what they mean → calls Support",
    proposedFeature: "Tap any coded term on Ride Details for a one-line definition",
    klass: "surface",
    buildState: "not-yet",
    entry: null,
  },
  {
    id: "auto-assign-request",
    order: 9,
    subjectArea: "Trip / Ride Assignment",
    calls: 610,
    problem: "Member wants the same driver next time",
    useCase:
      "Member asks → driver calls to confirm it is assigned → trip is not created yet → Support asks the broker → broker is slow → repeat follow-ups",
    proposedFeature:
      "In-app request to be auto-assigned that member's future trips — ⚠️ Not in prototype yet: actually assigning them. The request goes to the CS queue and nothing is held, claimed or created. `Project - Standing Order Offers` is building the system that does the assigning; this is the support call it absorbs until that exists.",
    klass: "form",
    buildState: "in-prototype",
    sharedBuildWith: "request-feed-member-filter",
    entry: {
      route: "/my-rides/1049800393/more",
      label:
        "AMARA OKONKWO is onboard and has asked you to be her driver. Tap 'Member requested me as preferred driver'. The member is locked from this ride and the form prints the two trips you have already driven her in the last 30 days — the one checkable claim the request carries. It asks what to actually SET UP — all their future trips, a standing order, or one specific trip — and the last two require a schedule, because Support cannot match an incoming trip against a request that does not say when. Submitting changes nothing about any trip, and the toast says so.",
      alternates: [
        {
          route: "/my-rides/1049800393",
          label:
            "The second door, and the better one: tap DROP OFF MEMBER, enter an odometer reading and sign both panels. Once the leg is complete the app asks whether she requested you — which is the moment the driver actually knows, rather than expecting them to remember and go hunting for a tile afterwards. ⛔ Answering yes opens the same form; it files nothing on its own. 'Don't ask again for this member' is per MEMBER, because a standing order is a weekly ride.",
        },
      ],
    },
  },
  {
    id: "request-feed-member-filter",
    order: 10,
    subjectArea: "Trip / Ride Assignment",
    calls: 610,
    problem: "Member wants the same driver next time",
    useCase:
      "Member asks → driver calls to confirm it is assigned → trip is not created yet → Support asks the broker → broker is slow → repeat follow-ups",
    proposedFeature:
      "Request Feed filter by member, so the driver can find that member's trips themselves",
    klass: "surface",
    buildState: "in-prototype",
    sharedBuildWith: "auto-assign-request",
    entry: {
      route: "/requests?member=AMARA%20OKONKWO",
      label:
        "Lands with the Member filter already applied — open the filter sheet to see AMARA OKONKWO selected. Her three posted trips come back across all three days, so you can take them yourself instead of waiting for the assignment request. ⚠️ The Member row is the only PROPOSED control in that sheet — and the only one besides Incentive Filter that filters anything at all; the other four are production's, replicated and inert.",
      alternates: [
        {
          route: "/requests?member=THEODORE%20ASHBY",
          label:
            "THEODORE ASHBY instead — a member you really have driven, with nothing posted. The feed goes empty with Clear Filters, which is the honest answer and not a broken control.",
        },
      ],
    },
  },
  {
    id: "vehicle-capacity-cleanse",
    order: 11,
    subjectArea: "Trip / Ride Assignment",
    calls: 610,
    problem: "Driver blocked by over-capacity logic",
    useCase: "Driver tries to take a trip → blocked by over-capacity → calls Support",
    proposedFeature:
      "One-off cleanse of stored vehicle capacity so the block reflects the real vehicle",
    klass: "no-app-surface",
    buildState: "not-yet",
    entry: null,
    noSurfaceReason:
      "A one-off cleanse of stored vehicle-capacity data. Nothing for the driver app to show.",
  },
  {
    id: "vehicle-capacity-backend",
    order: 12,
    subjectArea: "Trip / Ride Assignment",
    calls: 610,
    problem: "Driver blocked by over-capacity logic",
    useCase: "Driver tries to take a trip → blocked by over-capacity → calls Support",
    proposedFeature:
      "Backend path that updates capacity when a driver changes vehicle, so it stays correct",
    klass: "no-app-surface",
    buildState: "not-yet",
    entry: null,
    noSurfaceReason:
      "A backend path that keeps stored capacity correct when a vehicle changes. No driver-facing surface.",
  },
  {
    id: "send-back-reason-form",
    order: 13,
    subjectArea: "Send-back",
    calls: 609,
    problem: "Send-backs denied, specifically Standing Orders",
    useCase: "Driver needs to send back an SO → denied → calls Support",
    proposedFeature:
      "In-app send-back reason form on every send-back, plus an explicit warning when the trip is a standing order — ⚠️ Not in prototype yet: bypassing the Standing Order block, which is being handled separately, and weighting the penalty by reason, which is row 14's scoring decision and still open",
    klass: "form",
    buildState: "in-prototype",
    entry: {
      route: "/my-rides/1049800394/more",
      label:
        "Tap Send Back Trip — a PRODUCTION tile, and the first one this prototype replaces rather than adds to. The reason comes FIRST, offering CS Tool DRIVER INITIATED reasons narrowed to the ones a driver can truthfully answer; then production's own 'strongly discouraged' popup (No / Yes); then, because this trip is short-notice, production's $25 penalty warning. ⚠️ Note the deviation: in the real app that discouragement popup is step 1 and nothing precedes it. Here the reason is asked before anything is argued. Continue sends it back and the ride leaves My Rides.",
      alternates: [
        {
          route: "/my-rides/1049800395/more",
          label:
            "An ADVANCE trip. Reason, then production's discouragement popup, and NO penalty warning at all. Without this branch a reason form seen only on the way to a penalty screen cannot be told apart from part of the penalty screen.",
        },
        {
          route: "/my-rides/1049800396/more",
          label:
            "A STANDING ORDER (SO-4471, dialysis Mon/Wed/Fri). Three screens: reason, production's own popup, then the standing-order warning — general before specific, so the extra screen is earned by something true about the trip. The warning says in as many words what nothing in the app says today: sending back one trip can cost the whole standing order, and repeated send-backs risk suspension. ⚠️ Not in prototype yet: this copy is PROPOSED — production says nothing at all here today, which is the problem. ⛔ It warns, it does not block; a hard block is what sends drivers to Support in the first place.",
        },
      ],
    },
  },
  {
    id: "send-back-scoring",
    order: 14,
    subjectArea: "Send-back",
    calls: 609,
    problem: "Drivers avoid in-app send-back to dodge a penalty",
    useCase:
      "Driver wants out of a trip → avoids the in-app button → calls Support instead",
    proposedFeature:
      "Score a Support-mediated send-back identically to an in-app one, and weight the penalty by reason so a legitimate send-back is free",
    klass: "surface",
    buildState: "not-yet",
    entry: null,
  },
  {
    id: "account-self-service",
    order: 15,
    subjectArea: "Other / not listed (catch-all)",
    calls: 567,
    problem: "Driver cannot update their own account details in the app",
    useCase:
      "Ex 1 — Email needs changing → no in-app route → calls Support\nEx 2 — Password needs resetting → calls Support\nEx 3 — Phone number needs changing → calls Support",
    proposedFeature:
      "Let drivers change their own email, password and phone number in the app",
    klass: "surface",
    buildState: "in-prototype",
    /*
      ⏸️ ONE entry point. The pre-auth half was built and then removed on
      2026-10-13 by user direction — *"lets remove the flow in the sign in for
      now. Lets keep the changing pw and email or phone when they have already
      logged in."*

      ⛔ `/login` still exists, but it is NOT listed here any more: with the
      proposal gone it is pure replication, carrying nothing of row 15's. It
      stays because the CAPTURED Logout row lands on a sign-in screen in
      production and until this slice there was nowhere for it to go.

      ⚠️ So the dead end CAP-127 documents is replicated WITHOUT its answer,
      which is exactly what production does today — and is where this row's 567
      calls start.
    */
    entry: {
      route: "/options/account",
      label: "Signed in: change the email, password or phone",
    },
  },
  {
    id: "rider-initiated-cancellation",
    order: 16,
    subjectArea: "Trip / Ride Cancellation",
    calls: 509,
    problem:
      "Driver wants Support to cancel the trip so it is not counted against them",
    useCase:
      "Member declines during member confirmation → the driver's own route out is a send-back, which penalises them → so they call Support to cancel it instead",
    proposedFeature:
      "In-app rider-initiated cancellation form that records the member's cancellation as a cancellation, not as a driver send-back",
    klass: "form",
    buildState: "not-yet",
    entry: null,
  },
  {
    id: "requests-tray",
    order: 17,
    subjectArea: "Trip / Ride Cancellation",
    calls: 509,
    problem: "Driver cannot easily see whether the cancellation went through",
    useCase:
      "Driver reports it → client takes a while to confirm → nothing obvious changes in the app → driver calls back repeatedly",
    proposedFeature:
      "Requests tray — one list of every in-app request the driver has submitted and its current state",
    klass: "surface",
    buildState: "not-yet",
    // ⚠️ Added 2026-10-09. Row 18 has always pointed here; this never pointed
    // back, so the relationship existed in one direction only. Invisible while
    // the picker's label was hardcoded — it printed "17" regardless of which
    // row you opened, which is the right answer for row 18 and the reason
    // nobody noticed row 17 was silent.
    sharedBuildWith: "requests-tray-modifications",
    entry: null,
  },
  {
    id: "requests-tray-modifications",
    order: 18,
    subjectArea: "Trip / Ride Modification",
    calls: 364,
    problem:
      "Confirming a request was handled takes hunting, so the driver stays on the line",
    useCase:
      "Driver asks for a leg to be added → the only way to check is to open upcoming rides and find the member's name for that day → not explicit enough to rely on → stays on the call until Support confirms it",
    proposedFeature:
      "Requests tray — one list of every in-app request the driver has submitted and its current state",
    klass: "surface",
    buildState: "not-yet",
    entry: null,
    sharedBuildWith: "requests-tray",
  },
  {
    id: "add-leg-request",
    order: 19,
    subjectArea: "Trip / Ride Modification",
    calls: 364,
    problem: "A leg needs to be added",
    useCase: "Trip needs an extra leg → driver calls Support to add it",
    proposedFeature:
      "In-app request form to add a leg, tagged critical when it is same-day or the driver has already started",
    klass: "form",
    buildState: "not-yet",
    entry: null,
  },
  {
    id: "change-pickup-dropoff",
    order: 20,
    subjectArea: "Trip / Ride Modification",
    calls: 364,
    problem: "A leg's pick-up/drop-off address or time needs changing",
    useCase:
      "Address or time is wrong on an existing leg → driver calls Support to change it",
    proposedFeature:
      "In-app form to request a change to a leg's pick-up or drop-off address or time",
    klass: "form",
    buildState: "not-yet",
    entry: null,
  },
  {
    id: "eta-send-back-explicit",
    order: 21,
    subjectArea: "ETA Request",
    calls: 196,
    problem: "Driver needs the member told about a changed arrival",
    useCase:
      "Driver knows they will arrive early or late → cannot reach the member → calls Support to relay it",
    proposedFeature:
      "Make it explicit in the flow that a driver who cannot accommodate the timing sends the trip back, rather than asking Support to relay a message",
    klass: "surface",
    buildState: "not-yet",
    entry: null,
  },
  {
    id: "compliance-status",
    order: 22,
    subjectArea: "Compliance Related",
    calls: 167,
    problem: "Driver confirming their requirements were received",
    useCase:
      "Driver submits requirements → no confirmation in the app that it landed → calls Support to check",
    proposedFeature:
      "Compliance section in the driver app showing which requirements have been received and which are outstanding",
    klass: "surface",
    buildState: "not-yet",
    entry: null,
  },
  {
    id: "dispatch-chat",
    order: 23,
    subjectArea: "Trip Requests",
    calls: 156,
    problem: "Driver asking for more trips — not Support's role",
    useCase: "Driver wants more work → calls Support to ask",
    proposedFeature:
      "In-app chat with Dispatch, so drivers ask for work there instead of calling Support",
    klass: "surface",
    buildState: "not-yet",
    entry: null,
  },
  {
    id: "distribution-restriction",
    order: 24,
    subjectArea: "Payment Issues",
    calls: 146,
    problem: "Driver wants to know when they will get paid",
    useCase:
      "Driver is suspended → loses access to the app → cannot check their payout themselves → calls Support",
    proposedFeature:
      "Restrict trip distribution for non-compliant drivers instead of suspending them, so they keep app access and can check their own earnings",
    klass: "surface",
    buildState: "not-yet",
    entry: null,
  },
  {
    id: "technical-issues",
    order: 25,
    subjectArea: "Technical Issues",
    calls: 127,
    problem: "Generic and varied — no single recurring cause",
    useCase:
      "Most recent frequent blocker: Zendesk chat stopped working → driver had no route in → called Support",
    proposedFeature: "—",
    klass: "no-app-surface",
    buildState: "not-yet",
    entry: null,
    noSurfaceReason:
      "No proposal yet. The subject area is generic and has no single recurring cause to design against.",
  },
  {
    id: "otp-exclusion",
    order: 26,
    subjectArea: "OTP",
    calls: 123,
    problem: "Drivers are dinged for lateness even when the delay was legitimate",
    useCase:
      "Driver is late for a good reason → submits a Late Reason form → reason is recorded but the trip still counts against OTP → strict client flags the OTP miss → calls follow, with no way to exclude the trip",
    proposedFeature:
      "Allow a trip to be excluded from the OTP calculation when the late reason is accepted",
    klass: "surface",
    buildState: "not-yet",
    entry: null,
  },
];

/** Share of categorised calls this entry's subject area accounts for. */
export function shareOfCategorized(solution: Solution): number {
  return solution.calls / CATEGORIZED_CALLS;
}

export function formatShare(solution: Solution): string {
  return `${(shareOfCategorized(solution) * 100).toFixed(1)}%`;
}

export function findSolution(id: string | null): Solution | undefined {
  if (!id) return undefined;
  return SOLUTIONS.find((s) => s.id === id);
}

/** ⚠️ Locked vocabulary. Never "BUILT" / "NOT-BUILT". */
export function buildStateLabel(state: BuildState): string {
  return state === "in-prototype" ? "In prototype" : "⚠️ Not in prototype yet";
}

export const CLASS_LABEL: Record<SolutionClass, string> = {
  form: "In-app form",
  surface: "App surface",
  "no-app-surface": "No driver-app surface",
};

/** Subject areas in call order, each appearing once. */
export function subjectAreaGroups(): Array<{ subjectArea: string; calls: number; solutions: Solution[] }> {
  const groups: Array<{ subjectArea: string; calls: number; solutions: Solution[] }> = [];
  for (const s of [...SOLUTIONS].sort((a, b) => a.order - b.order)) {
    const last = groups[groups.length - 1];
    if (last && last.subjectArea === s.subjectArea) last.solutions.push(s);
    else groups.push({ subjectArea: s.subjectArea, calls: s.calls, solutions: [s] });
  }
  return groups;
}
