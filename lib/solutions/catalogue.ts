import { DEFAULT_DEMO_MODE, type DemoMode } from "./demo-mode";

/**
 * The 28 proposed features from the support call analysis, made executable.
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

/**
 * A ticket on the Engineering Tasks Board that builds some of this row.
 *
 * ⛔⛔ **The Task ID, not the title.** A title is Notion's to change — these
 * two are due to be renamed to the `Support Automation - <Subject Area> - …`
 * convention — and a copy of it here would be a second, staler source for the
 * same string. The id survives a rename, it is how the team refers to a ticket
 * out loud, and it fits a table cell.
 *
 * ⚠️ **A row can carry more than one.** Row 01 is two stories — the branch
 * that counts down and the branch that offers a form — and they are separate
 * tickets. ⛔ The reverse is also true and is why this is not a single field:
 * one ticket can serve two rows once rows share a build.
 */
export interface NotionTicket {
  /** The board's own `Task ID`, e.g. `"10435"`. Rendered as `#10435`. */
  id: string;
  /** Absolute `app.notion.com` URL. A check asserts the host. */
  url: string;
}

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
  alternates?: Array<{
    route: string;
    label: string;
    /**
     * The same state, named in roughly forty characters, for the desktop table.
     *
     * ⛔⛔ **Hand-written, never derived.** A truncated `label` ends mid-word
     * and a generated one is the subject describing itself; both read as the
     * paragraph this field exists to replace. The eleven of these are the only
     * route to eleven demonstrable states across nine rows, so a label that
     * does not say where the button goes costs more than the paragraph did.
     */
    short: string;
  }>;
}

/**
 * Where the app lands when a focused solution has nowhere of its own to go.
 *
 * ⛔ 15 of the 28 rows have no entry point, and `focus()` used to just rewrite
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
  /** 1-28, call-volume order — the order the phases are built in. */
  order: number;
  subjectArea: string;
  /** The SUBJECT AREA's call total. Shared across that area's rows. */
  calls: number;
  problem: string;
  useCase: string;
  /**
   * The spreadsheet's own last column, mirrored 1:1.
   *
   * ⛔ Never edited to suit a renderer. It is the audit trail § 1 compares
   * against the source file — shorten it and the catalogue silently stops
   * mirroring the document it claims to mirror. The desktop table renders
   * `tableSummary` instead; this one still reaches the strip and the picker.
   */
  proposedFeature: string;
  /**
   * The same proposal in one sentence, for the desktop table's last column.
   *
   * ⭐ Added rather than substituted. `proposedFeature` runs to 535 characters
   * on row 03 because the spreadsheet says that much; a cell that long turns
   * the table into a wall of prose and the prototype is standing right beside
   * it, saying the same thing better. ⚠️ Rows 18 and 20 carry the SAME
   * sentence, because they carry the same `proposedFeature` — one tray, listed
   * twice in the source. A check asserts that is the only pair.
   */
  tableSummary: string;
  klass: SolutionClass;
  buildState: BuildState;
  /** `null` until the slice is in the prototype. */
  entry: SolutionEntry | null;
  /**
   * Where TODAY's behaviour is demonstrated, when that is not where the fix is.
   *
   * ⛔⛔ **Distinct from `entry`, which means "where the FIX is demonstrated"**
   * and is `null` for every row with no fix. A row may have one, both, or
   * neither. Rows 11 and 12 have a `nowEntry` and no `entry`: production's
   * over-capacity screen is real and reachable, and there is nothing proposed
   * to compare it against — so they stay `not-yet` with a null `entry`, and
   * every existing check about entries passes untouched.
   *
   * ⚠️ Added rather than weakening `entry`, deliberately. Letting `entry`
   * mean "wherever this row is demonstrated" would have made *"⚠️ Not in
   * prototype yet"* false for two rows whose proposal genuinely is not built.
   */
  nowEntry?: SolutionEntry;
  /** Several rows can point at one build — the requests tray serves two. */
  sharedBuildWith?: string;
  /** Required when `klass` is `no-app-surface`; forbidden otherwise. */
  noSurfaceReason?: string;
  /**
   * The Notion tickets that build this row, if any yet.
   *
   * ⚠️ Absent on most rows and that is not a gap — only 3 of 28 have stories
   * written, let alone ticketed. The column renders an em dash, which says
   * "no ticket" rather than "no value".
   */
  notionTickets?: readonly NotionTicket[];
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
    tableSummary: "File the no-show in-app at the curb instead of calling it in.",
    klass: "form",
    buildState: "in-prototype",
    /**
     * ⭐ The two branches of a single check, and two separate tickets:
     * `10435` is the countdown, `10437` the form offered once the driver can
     * no longer be placed at the pick-up.
     */
    notionTickets: [
      { id: "10435", url: "https://app.notion.com/p/3d5ac7c6c89d809794bafa8ba025ce5e" },
      { id: "10437", url: "https://app.notion.com/p/b74ac7c6c89d8369b1cf819ed729636d" },
    ],
    entry: {
      route: "/my-rides/1049800377/more",
      label:
        "More Options → Member No-Show. The driver is 0.6 mi out at a hospital campus, so waiting can never place them at the pick-up and the form is offered.",
      alternates: [
        {
          route: "/my-rides/1049800373/more",
          short: "At the pick-up, short of ten minutes",
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
      "Let Cancel at Door skip the 10-minute wait, in exchange for two questions it asks instead → who came to the door (the member, or someone else) → and what that person is to the member",
    tableSummary: "Skip the ten-minute wait by answering who came to the door.",
    klass: "form",
    buildState: "in-prototype",
    /**
     * ⭐ One ticket, because row 02 is one story: the waiver needs the driver
     * AT the pick-up and the type Cancel At Door. The away branch is row 01's
     * form, which is why it is not a second ticket here.
     */
    notionTickets: [
      { id: "11299", url: "https://app.notion.com/p/3fbac7c6c89d814aa8b8c5c6f01af269" },
    ],
    entry: {
      route: "/my-rides/1049800373/more",
      label:
        "More Options → Member No-Show. The same ride slice 01 uses for the countdown: the driver is at the pick-up but short of ten minutes. Pick Member Not Home and it counts down. Pick Cancel At Door and two questions open instead — name who came to the door and it files.",
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
    tableSummary: "The swipe itself asks whether the member is still in the car.",
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
    tableSummary: "Report a member number as unreachable, with photo proof.",
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
          short: "The same-day will-call, two numbers",
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
    tableSummary: "File what you tried to reach the member, instead of waiting on hold.",
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
    tableSummary: "An in-app assistant that answers from the Help Desk and the leg's own data.",
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
    tableSummary: "Ride Details says plainly that the leg is shared, and with how many.",
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
    tableSummary: "Tap a coded term on Ride Details for a one-line definition.",
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
    tableSummary: "Ask in-app to be auto-assigned that member's future trips.",
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
          short: "Asked after the drop-off instead",
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
    tableSummary: "Filter the Request Feed by member and find their trips yourself.",
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
          short: "A member with nothing posted",
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
    tableSummary: "A one-off cleanse so stored capacity matches the real vehicle.",
    klass: "no-app-surface",
    buildState: "not-yet",
    entry: null,
    nowEntry: {
      route: "/requests/REQ-OVERCAP-001",
      label:
        "Open the over-capacity request. Production offers no way to accept it — where SWIPE TO ACCEPT would be there is a pink swipe that dials dispatch, and a reference number that appears nowhere else on the screen. ⚠️ Now only: rows 11 and 12 propose a data fix and a backend path, so there is no second side to compare.",
    },
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
    tableSummary: "Capacity updates itself when the driver changes vehicle.",
    klass: "no-app-surface",
    buildState: "not-yet",
    entry: null,
    nowEntry: {
      route: "/requests/REQ-OVERCAP-001",
      label:
        "Open the over-capacity request. Production offers no way to accept it — where SWIPE TO ACCEPT would be there is a pink swipe that dials dispatch, and a reference number that appears nowhere else on the screen. ⚠️ Now only: rows 11 and 12 propose a data fix and a backend path, so there is no second side to compare.",
    },
    noSurfaceReason:
      "A backend path that keeps stored capacity correct when a vehicle changes. No driver-facing surface.",
  },
  /**
   * ⭐⭐ **A THIRD proposal for the same problem, and the first with a driver
   * surface.** Rows 11 and 12 are the spreadsheet's two answers to
   * over-capacity — clean the stored capacity, then keep it clean — and both
   * are backend work with nothing for the app to show. This row is the user's
   * answer, given 2026-10-15: *"instead of swipe and then it will call make it
   * a submit form where it will show the trips that are blocking them from
   * taking it and then them to give a reason why they can take another"*.
   *
   * ⛔⛔ **A new row, NOT a flip of row 11 or 12.** Marking either
   * `in-prototype` would claim we built a data cleanse or a backend path. We
   * built neither. This is the same call E1 made about the requests tray, and
   * for the same reason: `buildState` is a claim about what exists.
   *
   * ⚠️ **Not in the source spreadsheet yet.** `problem`, `useCase`,
   * `subjectArea` and `calls` are rows 11/12's own, so the merged cells still
   * reconstruct and `COVERED_CALLS` is untouched; `proposedFeature` is ours
   * until the user adds the row to the file § 1 mirrors. Recorded in the
   * Working Plan so the audit does not read it as the spreadsheet's wording.
   */
  {
    id: "over-capacity-exception",
    order: 13,
    // ⛔ Rows 11, 12 and 14 must stay ADJACENT and carry byte-identical
    // `subjectArea`, `problem` and `useCase` text, or `tableRows()` splits one
    // merged cell into two runs and the three §18 span checks fail.
    subjectArea: "Trip / Ride Assignment",
    calls: 610,
    problem: "Driver blocked by over-capacity logic",
    useCase: "Driver tries to take a trip → blocked by over-capacity → calls Support",
    proposedFeature:
      "An in-app over-capacity request in place of the dispatch phone number: production's Reject | Accept pill comes back with the accept half replaced by Swipe to Request, which names the accepted trips already holding the vehicle's seats, asks the driver why this one still fits, and sends that to Support",
    tableSummary: "Name what is holding the seats, and ask why this one fits.",
    klass: "form",
    buildState: "in-prototype",
    /**
     * ⚠️ The SAME route as `nowEntry`, which no other row does. Both sides are
     * the same screen — only the footer changes — so sending the two sides to
     * different places would invent a difference the proposal does not make.
     */
    entry: {
      route: "/requests/REQ-OVERCAP-001",
      label:
        "Open the over-capacity request. The telephone is gone and production's own pill is back, with one half changed: Swipe to Reject | Swipe to Request. Requesting shows which accepted trips are holding the seats, how short the record is, and asks why this one still fits. ⛔ Sending it accepts nothing — the trip stays in Requests until Support releases it.",
    },
    nowEntry: {
      route: "/requests/REQ-OVERCAP-001",
      label:
        "Open the over-capacity request. Production offers no way to accept it — where SWIPE TO ACCEPT would be there is a pink swipe that dials dispatch, and a reference number that appears nowhere else on the screen.",
    },
  },
  {
    id: "send-back-reason-form",
    order: 14,
    subjectArea: "Send-back",
    calls: 609,
    problem: "Send-backs denied, specifically Standing Orders",
    useCase: "Driver needs to send back an SO → denied → calls Support",
    proposedFeature:
      "In-app send-back reason form on every send-back, and a standing order is blocked on the first tap with a route into Support chat rather than production's phone number — ⛔ the Standing Order block is production's and is NOT lifted — ⚠️ Not in prototype yet: weighting the penalty by reason, which is row 15's scoring decision and still open",
    tableSummary: "Every send-back collects a reason; a standing order goes straight to Support chat.",
    klass: "form",
    buildState: "in-prototype",
    /**
     * ⭐ Two tickets for one row, and they are the two halves of its proposal:
     * `11300` is the reason on every send-back, `11301` the standing-order
     * redirect. Row 14's text covers both because the driver meets them on the
     * same tap — but a standing order never reaches the reason form, so they
     * could not be written as one story.
     */
    notionTickets: [
      { id: "11300", url: "https://app.notion.com/p/3fbac7c6c89d815ebd95c24d32fa5576" },
      { id: "11301", url: "https://app.notion.com/p/3fbac7c6c89d81579669ed2cd716555c" },
    ],
    entry: {
      route: "/my-rides/1049800394/more",
      label:
        "Tap Send Back Trip — a PRODUCTION tile, and the first one this prototype replaces rather than adds to. The reason comes FIRST, offering production's whole CS Tool DRIVER INITIATED set, nineteen reasons, with its exact string stored and a sentence-cased label shown; then production's own 'strongly discouraged' popup (No / Yes); then, because this trip is short-notice, production's $25 penalty warning. ⚠️ Note the deviation: in the real app that discouragement popup is step 1 and nothing precedes it. Here the reason is asked before anything is argued. Continue sends it back and the ride leaves My Rides.",
      alternates: [
        {
          route: "/my-rides/1049800395/more",
          short: "An advance trip, no penalty",
          label:
            "An ADVANCE trip. Reason, then production's discouragement popup, and NO penalty warning at all. Without this branch a reason form seen only on the way to a penalty screen cannot be told apart from part of the penalty screen.",
        },
        {
          route: "/my-rides/1049800396/more",
          short: "A standing order, blocked on the first tap",
          label:
            "A STANDING ORDER (SO-4471, dialysis Mon/Wed/Fri). ONE screen, and it is the first one: no reason form, no confirmation, no penalty — the app says no and offers Support chat. It still names what a send-back costs, because that is why Support is in the loop: one trip can cost the whole standing order, and repeated send-backs risk suspension. ⛔ The block is production's (`CAP-330`) and is not lifted — what changes is that production refuses on the THIRD tap and names a phone, while this refuses on the first and opens a chat. ⚠️ Not in prototype yet: this copy is PROPOSED; production warns about nothing.",
        },
      ],
    },
  },
  {
    id: "send-back-scoring",
    order: 15,
    subjectArea: "Send-back",
    calls: 609,
    problem: "Drivers avoid in-app send-back to dodge a penalty",
    useCase:
      "Driver wants out of a trip → avoids the in-app button → calls Support instead",
    proposedFeature:
      "Score a Support-mediated send-back identically to an in-app one, and weight the penalty by reason so a legitimate send-back is free",
    tableSummary: "Score a Support send-back like an in-app one, and weight the penalty by reason.",
    klass: "surface",
    buildState: "not-yet",
    entry: null,
  },
  {
    id: "account-self-service",
    order: 16,
    subjectArea: "Other / not listed (catch-all)",
    calls: 567,
    problem: "Driver cannot update their own account details in the app",
    useCase:
      "Ex 1 — Email needs changing → no in-app route → calls Support\nEx 2 — Password needs resetting → calls Support\nEx 3 — Phone number needs changing → calls Support",
    proposedFeature:
      "Let drivers change their own email, password and phone number in the app",
    tableSummary: "Change your own email, password and phone number in the app.",
    klass: "surface",
    buildState: "in-prototype",
    /*
      ⏸️ ONE entry point. The pre-auth half was built and then removed on
      2026-10-13 by user direction — *"lets remove the flow in the sign in for
      now. Lets keep the changing pw and email or phone when they have already
      logged in."*

      ⛔ `/login` still exists, but it is NOT listed here any more: with the
      proposal gone it is pure replication, carrying nothing of row 16's. It
      stays because the CAPTURED Logout row lands on a sign-in screen in
      production and until this slice there was nowhere for it to go.

      ⚠️ So the dead end CAP-127 documents is replicated WITHOUT its answer,
      which is exactly what production does today — and is where this row's 567
      calls start.
    */
    entry: {
      /**
       * ⭐⭐ **`/options`, not `/options/account`** — user direction,
       * 2026-10-14.
       *
       * The comparison IS the `Account` row appearing in the menu. Now shows
       * the captured eleven (`CAP-337`–`CAP-339`); Proposed shows a twelfth
       * inserted after `Driver Dashboard`. Landing on the Account screen itself
       * skips past the only thing this row is arguing for — and in Now it would
       * land on a screen production does not have at all, with nothing on
       * screen to say so.
       */
      route: "/options",
      label: "Options: the Account row appears, or does not",
      alternates: [
        {
          route: "/options/account",
          short: "...and the screen it opens",
          label: "...and what it opens: change the email, password or phone",
        },
      ],
    },
  },
  {
    id: "rider-initiated-cancellation",
    order: 17,
    subjectArea: "Trip / Ride Cancellation",
    calls: 509,
    problem:
      "Driver wants Support to cancel the trip so it is not counted against them",
    useCase:
      "Member declines during member confirmation → the driver's own route out is a send-back, which penalises them → so they call Support to cancel it instead",
    proposedFeature:
      "In-app rider-initiated cancellation form that records the member's cancellation as a cancellation, not as a driver send-back — filed with proof, from the Rider declined the trip option production already shows",
    tableSummary: "Record the member's cancellation as theirs, not as a driver send-back.",
    klass: "form",
    buildState: "in-prototype",
    entry: {
      route: "/my-rides/1049800398",
      label:
        "Tap I REACHED OUT TO CONFIRM, then option 2, 'Rider declined the trip'. Production's sheet still appears and still says this is not a cancellation — but Continue now opens a form instead of a chat. Both legs of the round trip are ticked, because the captured chat template removes both.",
      alternates: [
        {
          route: "/my-rides/1049800399",
          short: "Filed from the return leg",
          label:
            "The SAME decline filed from the return leg. The outbound is offered too — untick it to say the family drove her there and she still needs the ride home. ⛔ Neither filing cancels anything: the ride stays on the manifest marked 'Cancellation requested', because the client owns the cancellation and row 18's tray is what would tell the driver when it lands.",
        },
      ],
    },
  },
  {
    id: "requests-tray",
    order: 18,
    subjectArea: "Trip / Ride Cancellation",
    calls: 509,
    problem: "Driver cannot easily see whether the cancellation went through",
    useCase:
      "Driver reports it → client takes a while to confirm → nothing obvious changes in the app → driver calls back repeatedly",
    proposedFeature:
      "Requests tray — one list of every in-app request the driver has submitted and its current state",
    tableSummary: "One tray listing every request the driver has submitted, and its state.",
    klass: "surface",
    buildState: "not-yet",
    // ⚠️ Added 2026-10-09. Row 20 has always pointed here; this never pointed
    // back, so the relationship existed in one direction only. Invisible while
    // the picker's label was hardcoded — it printed "17" regardless of which
    // row you opened, which is the right answer for row 20 and the reason
    // nobody noticed row 18 was silent.
    sharedBuildWith: "requests-tray-modifications",
    entry: null,
  },
  /**
   * ⛔⛔ **Inserted 2026-10-15, which is why rows 20-28 moved.** It had to take
   * an `order` INSIDE the `Trip / Ride Cancellation` run, and that is what
   * forced the renumber — not where it sits in this array.
   *
   * ⚠️ The distinction cost a break test to find. `subjectAreaGroups()` sorts
   * by `order` and only THEN groups adjacent rows, so moving this literal to
   * the bottom of the file changes nothing and every check stays green. Give it
   * `order: 28` instead and `Trip / Ride Cancellation` appears twice in the
   * group list — area count 16 of 15, the area order stops matching the
   * spreadsheet, and covered calls reconcile at 7174 against a declared 6665.
   * Three §1 checks, and the first version of this comment blamed the wrong
   * one of the two.
   *
   * ⚠️ Not a flip of row 18. That one is the requests TRAY — a list of
   * submitted requests — and six built forms depend on it being unbuilt. This
   * is the opposite direction: a cancellation nobody submitted, arriving from
   * Wingz, which the driver can reach exactly once.
   *
   * ⛔⛔ **This row is DELIBERATELY thin on the listing and the pill, because
   * `Ride Card Pill - Cancelled Trips Visibility` shipped them** (Notion
   * project, Status Done; driver-app PR #175, released 2026-04-17: *"Introduces
   * `Cancelled by Client` pill and banner · Cancelled rides can be viewed on
   * the Upcoming tab"*). What this row carries is the part that project did not
   * build — the **toggle** — and the support call the pair of them answers.
   *
   * ⚠️ **The captures disagree with that release, and the disagreement is not
   * resolved.** `CAP-341`/`CAP-342` were shot 2026-10-14, six months after it
   * shipped, and show the ride in no tab. The likeliest reading is that the
   * pill system is per-client/market and was off for the captured market —
   * ⛔ but that is a reading, not a measurement, and it is an open question
   * with an owner. Until it is answered, the `"now"` side here mirrors the
   * PHOTOGRAPH, because a capture is evidence and a release note is a claim.
   *
   * Third instance of the thin-row pattern, after row 09 (`Project - Standing
   * Order Offers`) and row 23 (in-app chat).
   */
  {
    id: "my-rides-cancelled",
    order: 19,
    subjectArea: "Trip / Ride Cancellation",
    calls: 509,
    problem:
      "A cancelled ride is reachable only from the alert, so dismissing it loses the trip",
    useCase:
      "Wingz cancels an accepted trip → an alert offers Go to ride → the driver taps OK mid-drive → the ride is in no tab and the id is gone → calls Support to work out which of the day's rides went",
    proposedFeature:
      "Cancelled rides kept in My Rides — in Upcoming on their own date behind a default-on Show cancelled trips toggle the driver can turn off, and in Needs Action until the driver acknowledges having seen it",
    tableSummary: "Keep cancelled rides in the manifest, behind one toggle.",
    notionTickets: [
      {
        id: "11330",
        url: "https://app.notion.com/p/3fbac7c6c89d81cb9636e43172a39acf",
      },
    ],
    klass: "surface",
    buildState: "in-prototype",
    entry: {
      route: "/my-rides",
      label:
        "My Rides, with the row focused. In Now, production's alert fires over the Upcoming tab — tap Go to ride and the cancelled ride is there, banner and all; tap OK and it is in no tab at all, which is the dead end. Flip to Proposed without leaving the tab and three rides appear in place, in date order, each marked Cancelled, with a Show cancelled trips toggle above them — on by default, and the setting survives a reload.",
      alternates: [
        {
          route: "/my-rides/1049800412",
          short: "The ride the alert opens",
          label:
            "The cancelled ride itself — production's screen, unchanged on both sides: subtitle Ride, a pink Cancelled by Wingz banner and a greyed-out leg. The one thing the proposal adds is the Acknowledge button in the footer, which clears it from Needs Action and deliberately leaves it in the manifest.",
        },
      ],
    },
  },
  {
    id: "requests-tray-modifications",
    order: 20,
    subjectArea: "Trip / Ride Modification",
    calls: 364,
    problem:
      "Confirming a request was handled takes hunting, so the driver stays on the line",
    useCase:
      "Driver asks for a leg to be added → the only way to check is to open upcoming rides and find the member's name for that day → not explicit enough to rely on → stays on the call until Support confirms it",
    proposedFeature:
      "Requests tray — one list of every in-app request the driver has submitted and its current state",
    tableSummary: "One tray listing every request the driver has submitted, and its state.",
    klass: "surface",
    buildState: "not-yet",
    entry: null,
    sharedBuildWith: "requests-tray",
  },
  {
    id: "add-leg-request",
    order: 21,
    subjectArea: "Trip / Ride Modification",
    calls: 364,
    problem: "A leg needs to be added",
    useCase: "Trip needs an extra leg → driver calls Support to add it",
    proposedFeature:
      "In-app request form to add a leg, tagged critical when it is same-day or the driver has already started",
    tableSummary: "Request an added leg in-app, flagged critical when it is same-day.",
    klass: "form",
    buildState: "in-prototype",
    entry: {
      route: "/my-rides/1049800402",
      label:
        "A TWO-leg trip, entered from its finished first leg — the one dedicated action a completed ride offers, and the moment the member says they also need the pharmacy. The form places the new leg by drag or by tapping a gap; leg A is done so nothing can go before it. A 1:00 PM pick-up leaves leg B alone; a 2:30 PM one pushes it from 3:00 to 3:35 and asks for that leg in full — where it now starts, when, where it ends and when.",
      alternates: [
        {
          route: "/my-rides/1049800404",
          short: "A one-leg trip, nothing to push",
          label:
            "One finished leg and no round trip at all — the commonest real case. With no sibling there is no span to average, so the estimate falls back to a declared default. The new leg becomes B, nothing can be pushed, and it is the last leg — so it is the one that carries the \u201cfinish back at the rider\u2019s home address\u201d tick box.",
        },
        {
          route: "/my-rides/1049800405",
          short: "A three-leg trip, two legs pushed",
          label:
            "Three legs: dialysis, the pharmacy, then home. Tight enough that an insertion after the finished first leg pushes BOTH of the others \u2014 the only seeded trip where two blocks of four questions appear at once, each with its own \u201cstart where the leg before finishes\u201d tick box.",
        },
        {
          route: "/my-rides/1049800403/more",
          short: "The same group, from its live half",
          label:
            "The two-leg group from its live half, through the Add Leg to Trip tile in More Options. Same form, same locked leg A — the entry point changes, the case does not.",
        },
      ],
    },
  },
  {
    id: "change-pickup-dropoff",
    order: 22,
    subjectArea: "Trip / Ride Modification",
    calls: 364,
    problem: "A leg's pick-up/drop-off address or time needs changing",
    useCase:
      "Address or time is wrong on an existing leg → driver calls Support to change it",
    proposedFeature:
      "In-app form to request a change to a leg's pick-up or drop-off address or time",
    tableSummary: "Ask in-app to change a leg's pick-up or drop-off address or time.",
    klass: "form",
    buildState: "in-prototype",
    entry: {
      route: "/my-rides/1049800400",
      label:
        "A pencil on each anchor row, and Update Trip Details in More Options. Nothing has started, so both ends are editable and the form is the four fields user direction described — pick-up time, pick-up address, drop-off time, drop-off address — each opening with what the ride already holds. Submit stays disabled until one of them actually differs.",
      alternates: [
        {
          route: "/my-rides/1049800401",
          short: "The pick-up already made",
          label:
            "The same ride with the pick-up already made. That end is locked to what was recorded and loses its pencil — asking to move a pick-up that happened is a correction, which is row 03's case — so only the drop-off can be asked about.",
        },
      ],
    },
  },
  {
    id: "eta-send-back-explicit",
    order: 23,
    subjectArea: "ETA Request",
    calls: 196,
    problem: "Driver needs the member told about a changed arrival",
    useCase:
      "Driver knows they will arrive early or late → cannot reach the member → calls Support to relay it",
    proposedFeature:
      "Make it explicit in the flow that a driver who cannot accommodate the timing sends the trip back, rather than asking Support to relay a message",
    tableSummary: "Say plainly in the flow that a timing the driver cannot meet is a send-back.",
    klass: "surface",
    buildState: "not-yet",
    entry: null,
  },
  {
    id: "compliance-status",
    order: 24,
    subjectArea: "Compliance Related",
    calls: 167,
    problem: "Driver confirming their requirements were received",
    useCase:
      "Driver submits requirements → no confirmation in the app that it landed → calls Support to check",
    proposedFeature:
      "Compliance section in the driver app showing which requirements have been received and which are outstanding",
    tableSummary: "A compliance section showing what has been received and what is outstanding.",
    klass: "surface",
    buildState: "not-yet",
    entry: null,
  },
  {
    id: "dispatch-chat",
    order: 25,
    subjectArea: "Trip Requests",
    calls: 156,
    problem: "Driver asking for more trips — not Support's role",
    useCase: "Driver wants more work → calls Support to ask",
    proposedFeature:
      "In-app chat with Dispatch, so drivers ask for work there instead of calling Support",
    tableSummary: "In-app chat with Dispatch, so asking for work is not a Support call.",
    klass: "surface",
    buildState: "not-yet",
    entry: null,
  },
  {
    id: "distribution-restriction",
    order: 26,
    subjectArea: "Payment Issues",
    calls: 146,
    problem: "Driver wants to know when they will get paid",
    useCase:
      "Driver is suspended → loses access to the app → cannot check their payout themselves → calls Support",
    proposedFeature:
      "Restrict trip distribution for non-compliant drivers instead of suspending them, so they keep app access and can check their own earnings",
    tableSummary: "Restrict trip distribution instead of suspending, so app access survives.",
    klass: "surface",
    buildState: "not-yet",
    entry: null,
  },
  {
    id: "technical-issues",
    order: 27,
    subjectArea: "Technical Issues",
    calls: 127,
    problem: "Generic and varied — no single recurring cause",
    useCase:
      "Most recent frequent blocker: Zendesk chat stopped working → driver had no route in → called Support",
    proposedFeature: "—",
    tableSummary: "—",
    klass: "no-app-surface",
    buildState: "not-yet",
    entry: null,
    noSurfaceReason:
      "No proposal yet. The subject area is generic and has no single recurring cause to design against.",
  },
  {
    id: "otp-exclusion",
    order: 28,
    subjectArea: "OTP",
    calls: 123,
    problem: "Drivers are dinged for lateness even when the delay was legitimate",
    useCase:
      "Driver is late for a good reason → submits a Late Reason form → reason is recorded but the trip still counts against OTP → strict client flags the OTP miss → calls follow, with no way to exclude the trip",
    proposedFeature:
      "Allow a trip to be excluded from the OTP calculation when the late reason is accepted",
    tableSummary: "Exclude a trip from OTP when the late reason is accepted.",
    klass: "surface",
    buildState: "not-yet",
    entry: null,
  },
];

/**
 * Does this row have a PROPOSED side at all?
 *
 * ⛔⛔ `no-app-surface` means exactly this: backend, data or policy, with
 * nothing to build in the driver app. Three rows say so — 11, 12 and 25 — and
 * for them the comparison has one side, not two. Offering a "Proposed" segment
 * that shows the same screen is the "toggle that does nothing" this project has
 * already shipped twice, so the control is not offered at all.
 *
 * ⚠️ Read off `klass`, not off `entry`. Fourteen rows have no entry point and
 * most of them DO have a proposal — it is simply not built yet, which is a
 * different claim and is what `buildState` carries.
 */
export function hasProposedSide(solution: Solution): boolean {
  return solution.klass !== "no-app-surface";
}

/**
 * The sides of this row the PROTOTYPE can actually demonstrate.
 *
 * ⭐⭐ **One rule, replacing three booleans that could disagree.** Until now the
 * table asked `hasProposedSide` (does a proposal exist?), `modeFor` (which side
 * may this row be on?) and `columnModeFor` (which side does this cell select?)
 * — three predicates about one fact. This is that fact: an array of the sides
 * there is something to show on, in order.
 *
 * ⛔ **Not the same question as `hasProposedSide`.** That one is about the
 * CATALOGUE — row 06's AI assistant is a real proposal with a real klass, and
 * the catalogue says so. This one is about the PROTOTYPE, where row 06 is
 * nothing at all. Fourteen rows have a proposal that is not built; keeping the
 * two apart is what lets the table grey a row without the catalogue lying about
 * what was proposed.
 *
 * Three shapes come out of it, and the table reads all three off this one call:
 *
 * | | sides | what the table does |
 * | --- | --- | --- |
 * | 12 rows `in-prototype` | `["now", "fixed"]` | both cells select |
 * | rows 11 and 12 | `["now"]` | one screen, no toggle — their `nowEntry` |
 * | the other 12 | `[]` | greyed and inert — nothing to show |
 *
 * ⚠️ Rows 11 and 12 are `not-yet` and still have a side, which is the one
 * place "built" and "demonstrable" come apart: their PROPOSAL is a data cleanse
 * and a backend path that will never be in a driver app, but production's
 * over-capacity screen is real and we built it. Greying them would hide the
 * thing they exist to show.
 */
export function demonstrableSides(solution: Solution): readonly DemoMode[] {
  const sides: DemoMode[] = [];
  // Production's screen: built with the row, or carried on its own `nowEntry`.
  if (solution.buildState === "in-prototype" || solution.nowEntry) sides.push("now");
  // The proposal: only ever built with the row, and only if one exists at all.
  if (solution.buildState === "in-prototype" && hasProposedSide(solution)) {
    sides.push("fixed");
  }
  return sides;
}

/**
 * Is there anything to see on this row at all?
 *
 * ⛔ The predicate the table greys on. `false` for the twelve rows whose
 * proposal is not built and which have no production screen of their own —
 * they keep their place in the table, because §1 mirrors the spreadsheet 1:1,
 * but nothing about them is clickable. User direction 2026-10-14: *"anything we
 * have not built in the prototype yet lets not make it clickable and gray it.
 * Gives me a sense of whats remaining."*
 */
export function isDemonstrable(solution: Solution): boolean {
  return demonstrableSides(solution).length > 0;
}

/**
 * The side this row can actually be on.
 *
 * ⛔⛔ **A row with no proposal has ONE side, and nothing may put it on the
 * other** — not a cell, not the toggle, not a hand-edited URL. Without this,
 * `?solution=vehicle-capacity-cleanse&mode=fixed` is a reachable state in which
 * the Proposed Feature cell LIGHTS and clicking it moves you: a lit cell that
 * is not the side on screen, which is precisely the disagreement B3d was spent
 * fixing. Normalising once, where the focus is assembled, means no surface has
 * to remember.
 *
 * ⚠️ `undefined` is the plain mirror, whose mode is inert — `showsProposal`
 * returns on the `null` branch before reading it — so it is left alone.
 */
export function modeFor(solution: Solution | undefined, wanted: DemoMode): DemoMode {
  if (!solution) return wanted;
  const sides = demonstrableSides(solution);
  if (sides.includes(wanted)) return wanted;
  // ⚠️ A row with one side is pinned to it. A row with NONE keeps the default
  // rather than erroring — the table will not focus it, but a hand-edited URL
  // still can, and landing on `SOLUTION_HOME` in production's reading is the
  // honest answer to a row that has nothing to show.
  return sides[0] ?? DEFAULT_DEMO_MODE;
}

/**
 * Where focusing this row should land, for the side being shown.
 *
 * ⛔ `nowEntry` wins on `"now"` and `entry` wins on `"fixed"`, each falling
 * back to the other before `SOLUTION_HOME`. Only row 13 carries both, and both
 * of its entries point at the same screen, so this is identical to the old
 * `entry?.route ?? SOLUTION_HOME` for every row — and a check asserts that,
 * because a rule that changed 27 rows while adding one would be a refactor
 * wearing a feature's clothes.
 *
 * ⛔⛔ **`entryFor` is the whole entry, not just its route, and the strip reads
 * it.** Walked and found 2026-10-15: the briefing printed `entry.label`
 * unconditionally, so row 13 — the first row ever to carry both — described
 * its PROPOSAL while standing on production's side. "The telephone is gone"
 * over a screen whose only control is a telephone. `entryRouteFor` delegates
 * here so the route and the words can never name different sides.
 */
export function entryFor(solution: Solution, mode: DemoMode): SolutionEntry | undefined {
  // ⚠️ `?? undefined` because `entry` is `null` for a row with no proposal and
  // `nowEntry` is absent — two spellings of "nothing" that a caller testing
  // truthiness would not notice, and a return type mixing them would make the
  // strip's `{shownEntry && …}` render `null` as a legal value.
  return (
    (mode === "now"
      ? solution.nowEntry ?? solution.entry
      : solution.entry ?? solution.nowEntry) ?? undefined
  );
}

export function entryRouteFor(solution: Solution, mode: DemoMode): string {
  return entryFor(solution, mode)?.route ?? SOLUTION_HOME;
}

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

/**
 * What leaving a focus actually does — named once, because two affordances say
 * it and they must not disagree.
 *
 * ⭐⭐ It is "Show all proposals", not "Clear the focus", and the difference is
 * the whole point. Once the Now / Proposed toggle existed there were THREE
 * states, and this was the only one whose name did not say where you would
 * land:
 *
 * | state            | what the app shows                    |
 * |------------------|---------------------------------------|
 * | no focus         | **every** proposal, nothing filtered   |
 * | focus + Now      | that row's production dead end        |
 * | focus + Proposed | that row's proposal, and no other's    |
 *
 * ⛔ So leaving a focus moves you to the state with the MOST features on
 * screen. "Clear" reads as "reset to reality" — a reviewer who has just looked
 * at Now and taps it expecting production gets the opposite, four proposed
 * tiles at once. Naming the destination costs nothing and removes the trap.
 */
export const CLEAR_FOCUS_LABEL = "Show all proposals";

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
