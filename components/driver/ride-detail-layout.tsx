"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft,
  RefreshCw,
  AlertTriangle,
  Phone,
  MessageSquare,
  Users,
  RotateCcw,
  Info,
  Check,
  Circle,
  Car,
  PersonStanding,
  CheckCircle2,
  CornerUpRight,
  ChevronRight,
  Hourglass,
  CalendarX,
  PencilLine,
  CalendarPlus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { ProgramContributionIndicator } from "./program-contribution-indicator";
import { RevenueDisplay } from "./revenue-display";
import { cn } from "@/lib/utils";
import {
  getLegStage,
  getNextSwipe,
  type Trip,
  type TripLeg,
  type TimeAnchorType,
  type LegSwipeProgress,
  type LegSwipeStage,
} from "@/lib/driver-data/mock-trips";
import { useRideFlow } from "@/lib/support-data/ride-flow-context";
import {
  getMissingAnchors,
  routeSwipeTap,
  offeredSwipe,
  routeMissedSwipe,
  swipeNeedsConfirming,
  type SwipeAnchor,
} from "@/lib/driver-data/missed-swipe-rules";
import { OdometerReadingDialog } from "./odometer-reading-dialog";
import { PreferredDriverPrompt } from "@/components/driver/preferred-driver-prompt";
import { AutoAssignRequestForm } from "@/components/support/auto-assign-request-form";
import { shouldAskPreferredDriver } from "@/lib/driver-data/member-assignment";
import { useSolution } from "@/lib/solutions/solution-context";
import { SwipeTooFarDialog } from "@/components/driver/swipe-too-far-dialog";
import {
  OVER_CAPACITY_SWIPE_LABEL,
  dispatchDialHref,
  isOverCapacity,
  overCapacityHeadline,
} from "@/lib/driver-data/over-capacity";
import {
  CANCELLATION_REQUESTED_DETAIL,
  CANCELLATION_REQUESTED_PILL,
  CANCELLATION_REQUESTED_TITLE,
} from "@/lib/driver-data/rider-declined";
import {
  canRequestTripChange,
  changeAnchors,
  showsTripChangeEntry,
  TRIP_CHANGE_LABEL,
  TRIP_CHANGE_REQUESTED_DETAIL,
  TRIP_CHANGE_REQUESTED_TITLE,
} from "@/lib/driver-data/trip-change-request";
import { TripChangeForm } from "@/components/support/trip-change-form";
import {
  addLegRefusal,
  canRequestAddLeg,
  groupKey,
  showsAddLegEntry,
  ADD_LEG_LABEL,
  ADD_LEG_REQUESTED_DETAIL,
  ADD_LEG_REQUESTED_TITLE,
} from "@/lib/driver-data/add-leg-request";
import { AddLegForm } from "@/components/support/add-leg-form";
import { RideSignatureScreen } from "./ride-signature-screen";
import {
  MissedSwipePrompt,
  type MissedSwipeAnswer,
} from "@/components/support/missed-swipe-prompt";
import { MissedSwipeForm } from "@/components/support/missed-swipe-form";
import { ReachRiderModal } from "./reach-rider-modal";

type DetailState = "before-taken" | "in-progress" | "needs-action" | "completed";

/** Driver-facing label + display order for each swipe mark. */
/**
 * ⚠️ Typed to the TIME marks only. `LegSwipeProgress` also carries odometer
 * readings now, and `keyof` would sweep them into a row list whose renderer
 * formats clock faces.
 */
const SWIPE_ROWS: Array<{
  key: "startedAt" | "pickedUpAt" | "droppedOffAt";
  label: string;
}> = [
  { key: "startedAt", label: "Started" },
  { key: "pickedUpAt", label: "Picked up" },
  { key: "droppedOffAt", label: "Dropped off" },
];

/**
 * Swipe CTA per stage — copy, fill and icon all replicated from reference
 * screenshots s-01a / s-01b / s-01c. Each stage has its own colour: the
 * driver reads the button by colour before they read the words.
 */
const SWIPE_CTA: Record<
  "start" | "pick-up" | "drop-off",
  { label: string; name: string; bg: string; icon: typeof Car }
> = {
  start: {
    label: "SWIPE TO START",
    name: "Swipe to Start",
    bg: "bg-[#282828]",
    icon: Car,
  },
  "pick-up": {
    label: "PICK UP MEMBER",
    name: "Pick up member",
    bg: "bg-[#00B090]",
    icon: PersonStanding,
  },
  "drop-off": {
    label: "DROP OFF MEMBER",
    name: "Drop off member",
    bg: "bg-[#E06078]",
    icon: CheckCircle2,
  },
};


/**
 * Header title per swipe stage, per reference screenshots:
 *   nothing swiped → "Accepted Ride"   (s-01a)
 *   started        → "Active Ride"     (s-01b)
 *   picked up      → "Ride"            (s-01c)
 */
function getInProgressSubtitle(stage: LegSwipeStage, sameDay = false): string {
  switch (stage) {
    case "not-started":
      // Per the stage map: a same-day / will-call trip reads "Will-Call Ride"
      // here, as `Stage 01 - Member Confirmation - Reach Rider modal
      // (same-day).webp` shows. Only on the unstarted phase — once the trip is
      // under way it is an Active Ride like any other.
      return sameDay ? "Will-Call Ride" : "Accepted Ride";
    case "started":
      return "Active Ride";
    case "picked-up":
      return "Ride";
    case "completed":
      return "Completed Ride";
  }
}

interface RideDetailLayoutProps {
  trip: Trip;
  /** Optional banner rendered at the top of the scroll area (e.g. the sent-back penalty notice). */
  banner?: ReactNode;
  state: DetailState;
  backHref: string;
}

function getTimeAnchorStyles(type: TimeAnchorType): { bg: string; text: string; border: string } {
  switch (type) {
    case "wait-for-call":
      return { bg: "bg-amber-400", text: "text-amber-600", border: "border-amber-400" };
    case "appointment":
      return { bg: "bg-[#10B981]", text: "text-[#10B981]", border: "border-[#10B981]" };
    case "scheduled":
      return { bg: "bg-[#10B981]", text: "text-[#10B981]", border: "border-[#10B981]" };
    case "est-pickup":
    default:
      return { bg: "bg-gray-800", text: "text-gray-800", border: "border-gray-800" };
  }
}

/**
 * Swipe record for one leg — which of the three marks have times against them.
 *
 * Context only on this branch — nothing here is editable. It is how a driver
 * confirms they are looking at the leg they think they are.
 */
function LegSwipeRecord({ leg }: { leg: TripLeg }) {
  const progress = leg.progress;
  if (!progress) return null;

  // Nothing swiped at all — three empty rows is noise on a ride that has not
  // started, and the real app shows no swipe history. This block exists only to
  // surface progress once there is some.
  if (!SWIPE_ROWS.some(({ key }) => progress[key])) return null;

  return (
    <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        Swipes
      </p>

      <dl className="space-y-1.5">
        {SWIPE_ROWS.map(({ key, label }) => {
          const time = progress[key];

          return (
            <div key={key} className="flex items-center justify-between gap-2">
              <dt className="flex items-center gap-1.5 text-sm">
                {time ? (
                  <Check className="h-3.5 w-3.5 flex-shrink-0 text-[#10B981]" />
                ) : (
                  <Circle className="h-3.5 w-3.5 flex-shrink-0 text-gray-300" />
                )}
                <span className="text-gray-700">{label}</span>
              </dt>
              <dd
                className={cn(
                  "text-sm font-medium",
                  time ? "text-gray-900" : "text-gray-400"
                )}
              >
                {time ?? "—"}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}

function LegCard({
  leg,
  isFirst,
  isLast,
  state,
  onEdit,
}: {
  leg: TripLeg;
  isFirst: boolean;
  isLast: boolean;
  state: DetailState;
  /**
   * Catalogue row 20 — open Update Trip Details for this anchor.
   *
   * ⛔ Optional, and the decision of whether to pass it is NOT taken here. Which
   * anchors can be changed, whether the ride's state admits a request at all and
   * whether this proposal belongs to the solution in focus are three rules that
   * live in `trip-change-request.ts`; a `LegCard` that worked any of them out
   * would be a correctness rule inline in JSX that no check can reach.
   */
  onEdit?: () => void;
}) {
  const anchorStyles = getTimeAnchorStyles(leg.type);
  const showWaitForCall = leg.type === "wait-for-call";
  const showOTP = leg.type === "appointment";

  return (
    <div className="relative">
      {/* Timeline line — connects from previous to this node */}
      {!isFirst && (
        <div
          className="absolute left-[7px] bottom-[calc(100%-8px)] w-0.5 bg-blue-500"
          style={{ height: "24px" }}
        />
      )}

      {/* Timeline node and content */}
      <div className="flex gap-3">
        <div className="relative flex flex-col items-center">
          <div
            className={cn(
              "h-4 w-4 rounded-full border-2",
              anchorStyles.bg,
              anchorStyles.border
            )}
          />
          {!isLast && (
            <div className="w-0.5 flex-1 bg-blue-500" style={{ minHeight: "80px" }} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 pb-4">
          {/* ⚠️ The pencil sits on the LABEL row, not the time row. The row
              below already pins `$31.80 Accepted by you` hard right on an
              accepted leg, so an icon there would collide with the fare — and
              the label row is where the user pointed. */}
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-gray-700">{leg.label}</p>
            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                aria-label={`${TRIP_CHANGE_LABEL} — ${leg.label}`}
                className="-mr-1 -mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-[#303068] hover:bg-gray-100"
              >
                <PencilLine className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <p className={cn("text-xl font-bold", anchorStyles.text)}>{leg.time}</p>
            {showWaitForCall && <Phone className="h-4 w-4 text-amber-500" />}
            {showOTP && (
              <span className="rounded border border-gray-400 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">
                OTP
              </span>
            )}
            {/* Per reference screenshots, an accepted leg puts its fare and
                caption on the time row rather than stacking it underneath. */}
            {leg.revenueNote && leg.revenue > 0 && (
              <span className="ml-auto whitespace-nowrap text-sm font-bold text-gray-900">
                ${leg.revenue.toFixed(2)}{" "}
                <span className="font-normal">{leg.revenueNote}</span>
              </span>
            )}
          </div>

          {!leg.revenueNote && leg.revenue > 0 && (
            <RevenueDisplay
              totalRevenue={leg.revenue}
              revenueColor="green"
              layout="vertical"
            />
          )}

          <p className="mt-1 text-sm text-gray-700">{leg.address.split(",")[0]}</p>
          <p className="text-sm text-gray-600">{leg.address}</p>
          <p className="text-sm text-gray-500">{leg.county}</p>

          {state === "in-progress" && <LegSwipeRecord leg={leg} />}
        </div>
      </div>
    </div>
  );
}

/**
 * Ride detail layout.
 *
 * v1 locked variant: `pill-named-bottom` — incentive pills render only in the
 * inline chips row alongside the status pill. The above-metadata-card banner
 * surface and the variant-switch were stripped in I-0.
 */
export function RideDetailLayout({
  trip: seededTrip,
  state: seededState,
  backHref,
  banner,
}: RideDetailLayoutProps) {
  const router = useRouter();
  const { toast } = useToast();
  const {
    getPendingRequest,
    submittedForms,
    applySessionSwipes,
    recordSwipe,
    isPickupPostponed,
    postponePickup,
    clearPostponedPickup,
    isTripConfirmed,
    confirmTrip,
    isCancellationRequested,
    tripChangeRequest,
    addLegRequest,
    preferredDriverOptOuts,
    optOutOfPreferredDriverAsk,
  } = useRideFlow();
  const { demo } = useSolution();

  // Any swipe the driver made in this session, laid over the seed. Everything
  // below reads the overlaid trip, so a drop-off recorded a moment ago moves the
  // stage, the header and the swipe record together.
  const trip = applySessionSwipes(seededTrip);
  const pendingRequest = getPendingRequest(trip.id);
  /**
   * The member declined and Support has the report — catalogue row 16.
   *
   * ⛔ NOT a cancellation. The ride is still here and still on the manifest;
   * what changes is that nobody is waiting on the driver any more.
   */
  const cancellationRequested = isCancellationRequested(trip.id);

  /**
   * Catalogue row 20 — the change this ride is waiting on, if any.
   *
   * ⛔ The ride below still shows its OLD times and addresses, because nothing
   * about it has changed and nothing will until the client acts. That is exactly
   * why the request has to be printed: a driver returning to a screen identical
   * to the one they just filled a form on reads it as the submit having failed.
   */
  const changeRequest = tripChangeRequest(trip.id);
  /**
   * ⛔⛔ **Confirming the trip is what moves Ride Details off `needs-action`.**
   *
   * The page computes the seeded phase from `trip.status`, which cannot know
   * about a confirmation the driver made thirty seconds ago — there is no
   * backend to write it to. So the one transition production's Stage 01 exists
   * to perform is applied here, over the seed, exactly like `applySessionSwipes`
   * applies a swipe. Without it the modal's first option would tick a box and
   * leave the driver on the same screen.
   *
   * Only ever `needs-action` → `in-progress`. No other phase is touched, so a
   * completed or sent-back ride cannot be dragged backwards by this.
   */
  const state =
    seededState === "needs-action" && isTripConfirmed(trip.id)
      ? "in-progress"
      : seededState;

  /**
   * Which anchors carry a pencil.
   *
   * ⛔⛔ Four rules at once, and every one of them lives in
   * `trip-change-request.ts`: the ride's state has to admit a request, no
   * request may already be open, the anchor must not have been swiped past —
   * and **a proposal belongs to its own build**, which is the rule that escaped
   * the Reach Rider modal until the user caught it on 2026-10-13.
   */
  const changeEntryShown =
    showsTripChangeEntry(demo) &&
    canRequestTripChange(trip, state, Boolean(changeRequest));
  const editableAnchorIds = new Set(
    changeEntryShown
      ? changeAnchors(trip)
          .filter((anchor) => !anchor.passed)
          .map((anchor) => anchor.index)
      : []
  );

  /**
   * Catalogue row 19 — the leg this TRIP GROUP is waiting on, if any.
   *
   * ⛔ Looked up by GROUP, so the sibling leg the driver was not looking at when
   * they filed also says that its own pick-up time is part of a request.
   */
  const legRequest = addLegRequest(groupKey(trip));
  /**
   * ⭐ **The one surface in this app that a `completed` ride offers.**
   *
   * User direction 1.1: a completed leg still needs a way in, because the
   * driver who has just swiped drop-off is exactly who hears *"actually, I also
   * need the pharmacy."* ⛔ Deliberately NOT the More grid — a completed ride
   * cannot reach `/more` at all, and the grid would offer Member No-Show and
   * Send Back Trip on a ride that is finished.
   *
   * ⛔⛔ And it obeys *a proposal belongs to its own build*, like the tile and
   * the pencil.
   */
  const addLegShown =
    showsAddLegEntry(demo) &&
    canRequestAddLeg(state, Boolean(legRequest));

  // ⚠️ Reads the EFFECTIVE `state` above, not `seededState`. A driver who just
  // confirmed a Needs Action ride is on an In Progress one, and both admit a
  // change request — but a rule reading the seed would be answering about the
  // screen they were on a moment ago.

  const [promptOpen, setPromptOpen] = useState(false);
  /**
   * ⛔ Row 03's Now side. The ANCHOR is the open state — the dialog names the
   * end of the leg in its sentence, so "open" and "which end" are one fact and
   * a separate boolean could disagree with it.
   */
  const [tooFarAnchor, setTooFarAnchor] = useState<SwipeAnchor | null>(null);
  /** Stage 01 Step 2 — the Reach Rider modal behind the orange CTA. */
  const [reachOpen, setReachOpen] = useState(false);
  /**
   * Stage 04 → 05, as `CAP-095` / `CAP-098` have them: the swipe opens the
   * odometer popup, Submit advances to the full-screen Ride Signature, and only
   * then is the mark recorded. Two pieces of state because they are two screens.
   */
  const [odometerOpen, setOdometerOpen] = useState(false);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [preferredOpen, setPreferredOpen] = useState(false);
  const [preferredFormOpen, setPreferredFormOpen] = useState(false);
  const [tripChangeOpen, setTripChangeOpen] = useState(false);
  const [addLegOpen, setAddLegOpen] = useState(false);
  const [dropOffReading, setDropOffReading] = useState<number | null>(null);
  const [missedSwipeAsks, setMissedSwipeAsks] = useState<SwipeAnchor[] | null>(
    null
  );

  // The leg the driver is working, and the swipe expected next on it. Only legs
  // that carry a `progress` object take part in the swipe sequence — the
  // Appointment Time row is a destination, not a separately swiped leg.
  const swipeLegs = trip.legs.filter((leg) => leg.progress);
  const activeLeg =
    swipeLegs.find((leg) => getLegStage(leg) !== "completed") ?? swipeLegs[0];
  const activeStage: LegSwipeStage = activeLeg
    ? getLegStage(activeLeg)
    : "not-started";
  const pickupPostponed = activeLeg ? isPickupPostponed(activeLeg.id) : false;
  // ⚠️ The OFFERED swipe, not the next one in the sequence. A driver who told us
  // the member is in the car is offered the drop-off production would withhold.
  // ⛔ The unblock is row 03's proposal, so it is gated. In `"now"` production
  // still withholds DROP OFF MEMBER until the pick-up exists.
  const nextSwipe = offeredSwipe(
    activeLeg ? getNextSwipe(activeLeg) : null,
    pickupPostponed,
    demo
  );

  const cta = nextSwipe ? SWIPE_CTA[nextSwipe] : null;

  /**
   * The swipe CTA.
   *
   * ⛔⛔ **This is where the case starts now.** Tapping a swipe outside its own
   * geofence is the moment the app and the driver disagree: the driver is saying
   * it happened, and the app can see it cannot have happened here. Everything
   * else — the question, the form, the confirmations — hangs off this tap.
   *
   * ⚠️ Three paths, and the order matters:
   * 1. A postponed drop-off runs the real drop-off steps (odometer + signature).
   * 2. A pick-up swiped from outside the geofence asks 1a-or-1b.
   * 3. A drop-off swiped from outside the geofence goes STRAIGHT to the drop-off
   *    steps, with no question — there is only one thing it can mean.
   */
  function handleSwipeTap() {
    if (!activeLeg) return;

    /**
     * ⛔⛔ **Every branch lives in `routeSwipeTap`, including which SIDE we
     * are on.** Until B3e this function decided for itself and production's
     * answer did not exist at all — a swipe from outside the geofence opened
     * our prompt in both modes, so row 03 demonstrated its own fix as the
     * status quo. That is the mistake row 02 shipped and the user found.
     *
     * The member-signature guarantee is unchanged: `routeSwipeTap` calls
     * `routeDropOffSwipe`, which still owns it, rather than restating it.
     */
    const route = routeSwipeTap({
      nextSwipe,
      pickupPostponed,
      trailChallengesPickup: swipeNeedsConfirming(activeLeg, "pickup"),
      trailChallengesDropOff: swipeNeedsConfirming(activeLeg, "dropoff"),
      focus: demo,
    });

    switch (route.kind) {
      // Production: the mark is NOT made, and the way forward is a phone number.
      case "production-refusal":
        setTooFarAnchor(route.anchor);
        return;
      case "ask-member-aboard":
        setPromptOpen(true);
        return;
      case "missed-swipe-form":
        fileMissedSwipe(activeLeg, null);
        return;
      case "drop-off-steps":
        setOdometerOpen(true);
        return;
      case "production-action":
        // Inside the geofence, or no location to argue with: production's own
        // action, which this prototype does not stand in for.
        toast({
          title: cta?.name ?? "Swipe",
          description: "Not wired in the prototype — this is the production action.",
        });
        return;
    }
  }

  /**
   * Open the form for every end of this leg that is still missing.
   *
   * ⚠️ Routed, never hardcoded. The first version asked only about the drop-off
   * whenever the button said DROP OFF MEMBER — right on an ordinary leg and
   * WRONG on a postponed one, where the button says drop-off precisely because
   * the pick-up is still missing.
   */
  function fileMissedSwipe(leg: TripLeg, memberAboard: boolean | null) {
    const route = routeMissedSwipe({
      missing: getMissingAnchors(leg),
      memberAboard,
    });
    if (route.kind === "form") setMissedSwipeAsks(route.asks);
  }

  /** 1a or 1b — the one fact only the driver has. */
  function handleAnswer(answer: MissedSwipeAnswer) {
    setPromptOpen(false);
    if (!activeLeg) return;

    if (answer === "member-aboard") {
      postponePickup(activeLeg.id);
      toast({
        title: "Drop them off as normal",
        description:
          "We'll ask you to confirm the pick-up once the drop-off is done.",
      });
      return;
    }

    // Defer by a tick: vaul reports the dismissal before the handler that caused
    // it, and opening the next sheet inside that window leaves the first one's
    // scroll lock on.
    setTimeout(() => fileMissedSwipe(activeLeg, false), 0);
  }

  /** Stage 04 Step 2 → Stage 05. The reading is held until both panels sign. */
  function handleOdometerSubmit(reading: number) {
    setDropOffReading(reading);
    setOdometerOpen(false);
    setSignatureOpen(true);
  }

  /**
   * Stage 05 submitted — the leg is dropped off properly.
   *
   * ⚠️ The mark AND the odometer are recorded here, which is what makes the
   * drop-off end read-only in the form that follows: it is not a reconstruction,
   * it is a swipe that just happened, with both signatures taken.
   */
  function handleSignatureSubmit() {
    setSignatureOpen(false);
    if (!activeLeg) return;
    const leg = activeLeg;
    recordSwipe(leg, "droppedOffAt", dropOffReading ?? undefined);
    clearPostponedPickup(leg.id);
    setDropOffReading(null);
    setTimeout(() => {
      // 1a: the drop-off is now a fact, so only the pick-up is left to confirm.
      const remaining = getMissingAnchors(leg).filter(
        (anchor) => anchor !== "dropoff"
      );
      if (remaining.length > 0) {
        setMissedSwipeAsks(remaining);
        return;
      }
      /**
       * ⛔ Only once there is nothing left to reconstruct. A driver who still
       * owes us a pick-up time is mid-correction, and stacking a second,
       * unrelated question on top of that is how both get dismissed.
       */
      if (askPreferred) setPreferredOpen(true);
    }, 0);
  }

  /**
   * Whether to ask about a preferred-driver request at the end of this leg.
   *
   * ⚠️ The rule itself is in `lib/driver-data/member-assignment.ts` — three
   * conditions, one of which is that a different solution is not focused. Read
   * here so the handler above stays a sequence rather than a second copy of it.
   */
  const askPreferred = shouldAskPreferredDriver({
    trip,
    focus: demo,
    suppressedMembers: preferredDriverOptOuts,
  });

  function handlePreferredAnswer({
    requested,
    optOut,
  }: {
    requested: boolean;
    optOut: boolean;
  }) {
    setPreferredOpen(false);
    // ⛔ Applied on BOTH answers — see the component's note.
    if (optOut) optOutOfPreferredDriverAsk(trip.rider);
    if (!requested) return;
    // Defer a tick: vaul reports the dismissal before the handler that caused
    // it, and opening the next sheet inside that window leaves the scroll lock on.
    setTimeout(() => setPreferredFormOpen(true), 0);
  }

  const subtitle =
    state === "before-taken"
      ? "Will-Call Ride"
      : state === "in-progress"
        ? getInProgressSubtitle(activeStage, trip.sameDay)
        : state === "completed"
          ? "Completed Ride"
          // The unconfirmed phase. Same rule as the unstarted in-progress one
          // above and spelled out rather than shared, because this branch is
          // reached from a different state and silently kept saying "Accepted
          // Ride" on a will-call trip when only the other was patched.
          : trip.sameDay
            ? "Will-Call Ride"
            : "Accepted Ride";

  // Multi-incentive support in v1: render all incentive pills
  const hasIncentives = trip.incentiveTypes && trip.incentiveTypes.length > 0 && trip.clientEnrolledInIncentives !== false;
  const activeIncentiveTypes = hasIncentives ? trip.incentiveTypes : [];

  return (
    <div className="flex min-h-screen flex-col bg-[#F9FAFB]">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between bg-white px-4 py-3 shadow-sm">
        <button
          onClick={() => router.push(backHref)}
          className="flex items-center text-gray-700"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <div className="flex-1 text-center">
          <h1 className="text-base font-bold text-gray-900">
            #{trip.id} - {subtitle}
          </h1>
        </div>
        <button className="text-gray-700">
          <RefreshCw className="h-5 w-5" />
        </button>
      </header>

      {/* Scrollable content area */}
      <div
        className={cn(
          "flex-1 overflow-y-auto",
          state === "before-taken"
            ? "pb-28"
            : state === "completed"
              ? "pb-8"
              : "pb-44"
        )}
      >
        {banner}

        {/* Map preview */}
        <div className="relative h-64 w-full bg-[#1e3a4c]">
          <iframe
            src="https://www.openstreetmap.org/export/embed.html?bbox=-84.9,33.4,-83.5,34.2&layer=mapnik"
            className="h-full w-full border-0 opacity-90"
            style={{ filter: "saturate(0.8) hue-rotate(150deg)" }}
            title="Trip route map"
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-1 w-32 rounded-full bg-[#10B981]/60" />
          </div>

          {/* Suppressed once Support has the ride: "please call the rider first"
              and "nothing more is needed from you" cannot both be true, and the
              driver who just filed the form is the one who would read both. */}
          {state === "needs-action" && !pendingRequest && !cancellationRequested && (
            <div className="absolute bottom-4 left-4 right-4">
              <div className="rounded-lg bg-[#FEE2E2] border border-[#F87171] px-4 py-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#DC2626]" />
                  <div>
                    <p className="font-semibold text-[#991B1B]">Confirmation required</p>
                    <p className="text-sm text-[#991B1B]">
                      This ride has not been confirmed yet. Please call the rider first.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ⛔ Replaces production's red "please call the rider first" rather than
            sitting under it. The driver has just told us the rider is not going;
            telling them to go and call the rider is the app arguing with itself
            in two adjacent rectangles. */}
        {cancellationRequested && (
          <div className="mx-4 mt-4 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
            <div className="flex items-start gap-3">
              <CalendarX className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#D97706]" />
              <div className="min-w-0">
                <p className="font-semibold text-[#92400E]">
                  {CANCELLATION_REQUESTED_TITLE}
                </p>
                <p className="mt-0.5 text-sm text-[#92400E]">
                  {CANCELLATION_REQUESTED_DETAIL}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ⛔ Prints the POSITION and the knock-on, not just the headline. The
            new leg is deliberately NOT drawn into the timeline below — a leg
            that does not exist, rendered as if it does, is the one thing this
            form must not do — so this block is the only place the request is
            visible at all. ⚠️ It appears on EVERY leg of the group, including
            one whose own pick-up time is in the shift list. */}
        {legRequest && (
          <div className="mx-4 mt-4 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
            <div className="flex items-start gap-3">
              <CalendarPlus className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#D97706]" />
              <div className="min-w-0">
                <p className="font-semibold text-[#92400E]">
                  {ADD_LEG_REQUESTED_TITLE}
                </p>
                <p className="mt-0.5 text-sm text-[#92400E]">
                  {ADD_LEG_REQUESTED_DETAIL}
                </p>
                <p className="mt-2 text-sm text-[#92400E]">
                  <span className="font-medium">
                    Leg {legRequest.letter} — {legRequest.pickupLabel} →{" "}
                    {legRequest.dropoffLabel}
                  </span>
                  <span className="block text-xs">
                    {legRequest.pickupAddress} → {legRequest.dropoffAddress}
                  </span>
                </p>
                {legRequest.shifts.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {legRequest.shifts.map((shift) => (
                      <li key={shift.tripId} className="text-sm text-[#92400E]">
                        <span className="font-medium">
                          Leg {shift.letter} pick-up:
                        </span>{" "}
                        <span className="line-through opacity-70">
                          {shift.fromLabel}
                        </span>{" "}
                        → <span className="font-semibold">{shift.toLabel}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ⛔ Prints the CHANGES, not just the headline. The timeline underneath
            is unchanged and will stay unchanged until the client acts, so a
            banner saying only "Change requested" would leave the driver with no
            way to check what they actually asked for. Each row is `was → asked
            for`, which is also the shape the request arrives at Support in. */}
        {changeRequest && (
          <div className="mx-4 mt-4 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
            <div className="flex items-start gap-3">
              <PencilLine className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#D97706]" />
              <div className="min-w-0">
                <p className="font-semibold text-[#92400E]">
                  {TRIP_CHANGE_REQUESTED_TITLE}
                </p>
                <p className="mt-0.5 text-sm text-[#92400E]">
                  {TRIP_CHANGE_REQUESTED_DETAIL}
                </p>
                <ul className="mt-2 space-y-1">
                  {changeRequest.map((change) => (
                    <li
                      key={`${change.anchorLabel}-${change.what}`}
                      className="text-sm text-[#92400E]"
                    >
                      <span className="font-medium">
                        {change.anchorLabel} — {change.what}:
                      </span>{" "}
                      <span className="line-through opacity-70">
                        {change.was}
                      </span>{" "}
                      → <span className="font-semibold">{change.asked}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {pendingRequest && (
          <div className="mx-4 mt-4 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-4">
            <div className="flex items-start gap-3">
              <Hourglass className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#D97706]" />
              <div className="min-w-0">
                <p className="font-semibold text-[#92400E]">
                  Waiting on Support
                </p>
                <p className="mt-0.5 text-sm text-[#92400E]">
                  Your {pendingRequest.caseTitle} request was sent{" "}
                  {pendingRequest.submittedAt.toLowerCase()}. Support is
                  reviewing it — nothing more is needed from you.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Trip metadata card */}
        <Card className="mx-4 mt-4 rounded-xl bg-white p-4 shadow-md">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm text-gray-600">
                When: <span className="font-semibold text-gray-900">{trip.date}</span>
              </p>
              <p className="text-sm text-gray-600">
                Rider: <span className="font-semibold text-gray-900">{trip.rider}</span>
              </p>
              <p className="text-sm text-gray-600">
                Client: <span className="font-semibold text-gray-900">{trip.client}</span>
                {trip.client === "Verida" && <span className="ml-1">🌿</span>}
              </p>
              <p className="text-sm text-gray-600">
                Leg: <span className="font-semibold text-gray-900">{trip.legs[0]?.id || trip.id}</span>
              </p>
            </div>
            <div className="flex items-center gap-1 text-gray-500">
              <span className="text-sm">{trip.passengerCount}</span>
              <Users className="h-4 w-4" />
              <span className="font-semibold text-[#10B981]">
                ${trip.totalRevenue.toFixed(2)}
              </span>
              <Info className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </Card>

        {/* Leg details section */}
        <div className="p-4">
          <div className="ml-1">
            {trip.legs.map((leg, index) => (
              <LegCard
                key={leg.id}
                leg={leg}
                isFirst={index === 0}
                isLast={index === trip.legs.length - 1}
                state={state}
                onEdit={
                  editableAnchorIds.has(index)
                    ? () => setTripChangeOpen(true)
                    : undefined
                }
              />
            ))}
          </div>

          {/* ⭐ Catalogue row 19's third entry point, and the only action a
              COMPLETED ride offers. In the BODY, under the timeline, never in a
              footer — the completed state deliberately renders no footer at all
              and the capture has none, so putting it there would rewrite
              captured chrome to hold a proposal.

              ⚠️ Only on `completed`. The other two states reach the same form
              through the More Options tile, and two doors to one form on one
              screen is two things to keep in step. */}
          {state === "completed" && addLegShown && (
            <button
              type="button"
              onClick={() => setAddLegOpen(true)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#303068] py-3.5 text-base font-bold text-[#303068]"
            >
              <CalendarPlus className="h-5 w-5" />
              {ADD_LEG_LABEL}
            </button>
          )}

          {trip.notes && (
            <p className="mt-2 text-sm text-gray-600">
              <span className="font-medium text-gray-700">Notes:</span> {trip.notes}
            </p>
          )}

          {/* Chips row — locked variant: pill-named-bottom */}
          {state === "before-taken" && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-block rounded-full bg-[#F3F4F6] px-3 py-1 text-xs font-medium text-[#6B7280]">
                Expires in 185 days
              </span>
              {hasIncentives &&
                activeIncentiveTypes.map((incentiveType) => (
                  <ProgramContributionIndicator
                    key={incentiveType}
                    incentiveType={incentiveType}
                    isCompleted={false}
                    context="detail"
                  />
                ))}
            </div>
          )}

          {state === "in-progress" && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-block rounded-full bg-[#D1FAE5] px-3 py-1 text-xs font-medium text-[#065F46]">
                In Progress
              </span>
              {hasIncentives &&
                activeIncentiveTypes.map((incentiveType) => (
                  <ProgramContributionIndicator
                    key={incentiveType}
                    incentiveType={incentiveType}
                    isCompleted={false}
                    context="detail"
                  />
                ))}
            </div>
          )}

          {state === "completed" && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-block rounded-full bg-[#D1FAE5] px-3 py-1 text-xs font-medium text-[#047857]">
                Completed
              </span>
              {hasIncentives &&
                activeIncentiveTypes.map((incentiveType) => (
                  <ProgramContributionIndicator
                    key={incentiveType}
                    incentiveType={incentiveType}
                    isCompleted={true}
                    context="detail"
                  />
                ))}
            </div>
          )}

          {state === "needs-action" && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {/* ⛔ The same contradiction as the banner, in a smaller font. A
                  ride whose cancellation Support is already chasing is not
                  "Not Confirmed" — nobody is waiting on the driver to confirm
                  it. Found by walking; the banner alone left this chip red. */}
              {cancellationRequested ? (
                <span className="inline-block rounded-full bg-[#FEF3C7] px-3 py-1 text-xs font-medium text-[#92400E]">
                  {CANCELLATION_REQUESTED_TITLE}
                </span>
              ) : (
                <span className="inline-block rounded-full bg-[#FEE2E2] px-3 py-1 text-xs font-medium text-[#991B1B]">
                  Not Confirmed
                </span>
              )}
              {hasIncentives &&
                activeIncentiveTypes.map((incentiveType) => (
                  <ProgramContributionIndicator
                    key={incentiveType}
                    incentiveType={incentiveType}
                    isCompleted={false}
                    context="detail"
                  />
                ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom region — varies by state */}
      {state === "before-taken" && isOverCapacity(trip) ? (
        /*
          ⭐⭐ Catalogue rows 11 and 12 — production's over-capacity screen, and
          it is NOT a block. `CAP-340`: the accept control is simply absent, and
          where SWIPE TO ACCEPT would be there is a pink swipe that dials
          dispatch. A block at least says what went wrong; this says only *over
          capacity* and a reference number, and hands the driver a telephone.
          That call IS what rows 11 and 12 exist to remove.

          ⛔ Now-only. Both rows are `no-app-surface`, so there is no proposed
          side, no toggle, and `showsProposal` is never consulted here — there
          is nothing to gate.

          ⚠️ A real `tel:` href, because a prototype that only SAYS it would
          dial cannot be told apart from one that does nothing.
        */
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white px-4 py-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <a
            href={dispatchDialHref()}
            className="relative flex h-14 items-center justify-center gap-3 overflow-hidden rounded-full bg-[#DB6A8F] pl-2 pr-6 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DB6A8F]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white">
              <Phone className="h-5 w-5 fill-[#303068] text-[#303068]" />
            </span>
            <span className="min-w-0 text-center">
              <span className="block text-sm leading-tight">
                {overCapacityHeadline(trip)}
              </span>
              <span className="block text-base font-bold uppercase leading-tight">
                {OVER_CAPACITY_SWIPE_LABEL}
              </span>
            </span>
          </a>
        </div>
      ) : state === "before-taken" ? (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white px-4 py-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <div className="relative flex h-14 items-center justify-center overflow-hidden rounded-full">
            <div className="absolute inset-y-0 left-0 w-1/2 bg-[#F472B6]" />
            <div className="absolute inset-y-0 right-0 w-1/2 bg-[#34D399]" />
            <div className="absolute left-1/2 top-1/2 z-10 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white shadow-md">
              <svg className="h-6 w-6 text-[#10B981]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" />
              </svg>
            </div>
            <span className="relative z-10 pr-8 text-sm font-bold uppercase text-white">
              Swipe to Reject
            </span>
            <span className="relative z-10 pl-8 text-sm font-bold uppercase text-white">
              Swipe to Accept
            </span>
          </div>
        </div>
      ) : state === "in-progress" ? (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          {/* Action row — 4 controls + More, divided into cells by vertical
              hairlines, per reference screenshots s-01a/b/c. */}
          <div className="flex items-stretch border-b border-t border-gray-100">
            <button className="flex flex-1 items-center justify-center py-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#00B090]">
                <CornerUpRight className="h-5 w-5 fill-[#00B090] text-[#00B090]" />
              </span>
            </button>
            <span className="w-px self-stretch bg-gray-100" />
            <button className="flex flex-1 items-center justify-center py-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E05878]">
                <CornerUpRight className="h-5 w-5 fill-[#E05878] text-[#E05878]" />
              </span>
            </button>
            <span className="w-px self-stretch bg-gray-100" />
            <button className="flex flex-1 items-center justify-center py-3">
              <Phone className="h-6 w-6 fill-[#303068] text-[#303068]" />
            </button>
            <span className="w-px self-stretch bg-gray-100" />
            <button className="flex flex-1 items-center justify-center py-3">
              <MessageSquare className="h-6 w-6 fill-[#303068] text-[#303068]" />
            </button>
            <span className="w-px self-stretch bg-gray-100" />
            <button
              type="button"
              onClick={() => router.push(`/my-rides/${trip.id}/more`)}
              className="flex flex-1 items-center justify-center py-3"
            >
              <span className="text-sm font-semibold text-[#303068]">More</span>
            </button>
          </div>

          <div className="px-4 py-4">
            {pendingRequest ? (
              <div className="flex h-16 items-center justify-center gap-2 rounded-full bg-[#FEF3C7]">
                <Hourglass className="h-5 w-5 text-[#92400E]" />
                <span className="text-sm font-bold uppercase text-[#92400E]">
                  Pending Support Review
                </span>
              </div>
            ) : cta ? (
              (() => {
                const CtaIcon = cta.icon;
                const legLine = activeLeg?.legCode
                  ? `${activeLeg.legCode} Leg`
                  : "";
                return (
                  <button
                    type="button"
                    onClick={handleSwipeTap}
                    className={cn(
                      "relative flex h-16 w-full items-center justify-center rounded-full",
                      cta.bg
                    )}
                  >
                    <span className="absolute left-1.5 top-1/2 flex h-[52px] w-[52px] -translate-y-1/2 items-center justify-center rounded-full bg-white">
                      <CtaIcon className="h-6 w-6 text-[#303068]" />
                    </span>
                    <span className="flex flex-col items-center leading-tight">
                      <span className="text-sm font-medium uppercase tracking-wide text-white">
                        {cta.label}
                      </span>
                      {legLine && (
                        <span className="text-sm font-bold text-white">
                          {legLine}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })()
            ) : (
              <div className="flex h-16 items-center justify-center rounded-full bg-gray-100">
                <span className="text-sm font-semibold text-gray-500">
                  All legs complete
                </span>
              </div>
            )}

          </div>
        </div>
      ) : state === "needs-action" ? (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-around border-b border-gray-100 px-4 py-3">
            <button className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#10B981]">
              <RotateCcw className="h-5 w-5 text-[#10B981]" />
            </button>
            <button className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#EC4899]">
              <RotateCcw className="h-5 w-5 rotate-180 text-[#EC4899]" />
            </button>
            <button className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-gray-300">
              <Phone className="h-5 w-5 text-gray-600" />
            </button>
            <button className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-gray-300">
              <MessageSquare className="h-5 w-5 text-gray-600" />
            </button>
            <button
              type="button"
              onClick={() => router.push(`/my-rides/${trip.id}/more`)}
              className="text-sm font-medium text-gray-700"
            >
              More
            </button>
          </div>

          <div className="px-4 py-4">
            {/* Same swap the in-progress region makes: once Support holds the
                ride, re-offering the whole confirmation flow would invite a
                second request for something already filed. */}
            {cancellationRequested ? (
              /* Where the orange CTA was. ⚠️ Re-offering the confirmation flow
                 here would invite a second report about the same member saying
                 the same thing, which is how Support ends up with two tickets
                 for one conversation. */
              <div className="flex h-16 items-center justify-center gap-2 rounded-full bg-[#FEF3C7]">
                <CalendarX className="h-5 w-5 text-[#92400E]" />
                <span className="text-sm font-bold uppercase text-[#92400E]">
                  {CANCELLATION_REQUESTED_PILL}
                </span>
              </div>
            ) : pendingRequest ? (
              <div className="flex h-16 items-center justify-center gap-2 rounded-full bg-[#FEF3C7]">
                <Hourglass className="h-5 w-5 text-[#92400E]" />
                <span className="text-sm font-bold uppercase text-[#92400E]">
                  Pending Support Review
                </span>
              </div>
            ) : (
              <button
                type="button"
                // Stage 01 Step 2. This used to raise a "not wired" toast,
                // which meant the app could enter the unconfirmed phase and had
                // no way out of it — and the proposal in rows 04/05 is a FOURTH
                // option on a modal that has to exist before a fourth makes
                // sense.
                onClick={() => setReachOpen(true)}
                className="flex w-full items-center justify-center gap-3 rounded-full bg-[#F97316] py-4 text-white shadow-lg"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <Phone className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold uppercase">I Reached Out to Confirm</p>
                  <p className="text-xs opacity-90">
                    {activeLeg?.legCode ? `${activeLeg.legCode} Leg` : "A Leg"}
                  </p>
                </div>
              </button>
            )}
          </div>
        </div>
      ) : null}

      {/* ⭐ Row 03's Now side, mounted beside the proposal's prompt — one tap,
          two answers, and `routeSwipeTap` is what picks. */}
      <SwipeTooFarDialog
        anchor={tooFarAnchor}
        onOpenChange={(open) => { if (!open) setTooFarAnchor(null); }}
      />
      <MissedSwipePrompt
        open={promptOpen}
        onOpenChange={setPromptOpen}
        onAnswer={handleAnswer}
      />
      <OdometerReadingDialog
        anchor="dropoff"
        open={odometerOpen}
        onOpenChange={setOdometerOpen}
        onSubmit={handleOdometerSubmit}
      />
      <PreferredDriverPrompt
        member={trip.rider}
        open={preferredOpen}
        onOpenChange={setPreferredOpen}
        onAnswer={handlePreferredAnswer}
      />
      <AutoAssignRequestForm
        trip={trip}
        open={preferredFormOpen}
        onOpenChange={setPreferredFormOpen}
      />

      <AddLegForm
        trip={trip}
        leg={activeLeg}
        open={addLegOpen}
        onOpenChange={setAddLegOpen}
      />

      {/* ⛔ No `onSubmitted` navigation — the driver is already on the ride, and
          the banner appears above them where they are. The More Options entry
          routes back here for exactly the same reason. */}
      <TripChangeForm
        trip={trip}
        leg={activeLeg}
        open={tripChangeOpen}
        onOpenChange={setTripChangeOpen}
      />

      <RideSignatureScreen
        open={signatureOpen}
        /*
          ⚠️ Always true here. This screen is only ever reached from the
          postponed drop-off, which exists precisely because the member IS in
          the car — see `handleSwipeTap`. The prop is explicit so the opposite
          case cannot be reached by accident.
        */
        memberPresent
        onCancel={() => setSignatureOpen(false)}
        onSubmit={handleSignatureSubmit}
      />
      {missedSwipeAsks && (
        <MissedSwipeForm
          /*
            ⚠️ Keyed on what it asks. The postponed path opens this component a
            second time with a different `asks`, and without a key React keeps
            the first mount's field values — so the pick-up form would open
            holding the answers to the drop-off form.
          */
          key={`missed-swipe-${missedSwipeAsks.join("-")}`}
          trip={trip}
          leg={activeLeg}
          asks={missedSwipeAsks}
          open
          onOpenChange={(next) => {
            if (!next) setMissedSwipeAsks(null);
          }}
        />
      )}

      {/* Stage 01 Step 2 — only on the unconfirmed phase, which is the only
          phase whose CTA opens it. Mounted here rather than inside the footer
          so the sheet is not clipped by the fixed action bar. */}
      {seededState === "needs-action" && (
        <ReachRiderModal
          trip={trip}
          leg={activeLeg}
          open={reachOpen}
          onOpenChange={setReachOpen}
          onConfirmed={() => confirmTrip(trip.id)}
        />
      )}
    </div>
  );
}
