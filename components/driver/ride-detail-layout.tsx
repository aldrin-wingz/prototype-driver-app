"use client";

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
  Hourglass,
} from "lucide-react";
import { useRouter } from "next/navigation";
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

type DetailState = "before-taken" | "needs-action" | "in-progress";

/** Driver-facing label + display order for each swipe mark. */
const SWIPE_ROWS: Array<{ key: keyof LegSwipeProgress; label: string }> = [
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
  { label: string; bg: string; icon: typeof Car }
> = {
  start: { label: "SWIPE TO START", bg: "bg-[#282828]", icon: Car },
  "pick-up": { label: "PICK UP MEMBER", bg: "bg-[#00B090]", icon: PersonStanding },
  "drop-off": { label: "DROP OFF MEMBER", bg: "bg-[#E06078]", icon: CheckCircle2 },
};

/**
 * Header title per swipe stage, per reference screenshots:
 *   nothing swiped → "Accepted Ride"   (s-01a)
 *   started        → "Active Ride"     (s-01b)
 *   picked up      → "Ride"            (s-01c)
 */
function getInProgressSubtitle(stage: LegSwipeStage): string {
  switch (stage) {
    case "not-started":
      return "Accepted Ride";
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
 * Also a preview of the Missed Swipe form: a recorded mark arrives locked, a blank
 * one is what the driver would be asked to supply.
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
}: {
  leg: TripLeg;
  isFirst: boolean;
  isLast: boolean;
  state: DetailState;
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
          <p className="text-sm font-medium text-gray-700">{leg.label}</p>
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
  trip,
  state,
  backHref,
}: RideDetailLayoutProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { getPendingRequest } = useRideFlow();
  const pendingRequest = getPendingRequest(trip.id);

  // The leg the driver is working, and the swipe expected next on it. Only legs
  // that carry a `progress` object take part in the swipe sequence — the
  // Appointment Time row is a destination, not a separately swiped leg.
  const swipeLegs = trip.legs.filter((leg) => leg.progress);
  const activeLeg =
    swipeLegs.find((leg) => getLegStage(leg) !== "completed") ?? swipeLegs[0];
  const activeStage: LegSwipeStage = activeLeg
    ? getLegStage(activeLeg)
    : "not-started";
  const nextSwipe = activeLeg ? getNextSwipe(activeLeg) : null;

  const subtitle =
    state === "before-taken"
      ? "Will-Call Ride"
      : state === "in-progress"
        ? getInProgressSubtitle(activeStage)
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
          state === "before-taken" ? "pb-28" : "pb-44"
        )}
      >
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
          {state === "needs-action" && !pendingRequest && (
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
              />
            ))}
          </div>

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

          {state === "needs-action" && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-block rounded-full bg-[#FEE2E2] px-3 py-1 text-xs font-medium text-[#991B1B]">
                Not Confirmed
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
        </div>
      </div>

      {/* Bottom region — varies by state */}
      {state === "before-taken" ? (
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
            ) : nextSwipe ? (
              (() => {
                const cta = SWIPE_CTA[nextSwipe];
                const CtaIcon = cta.icon;
                return (
                  <div
                    className={cn(
                      "relative flex h-16 items-center justify-center rounded-full",
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
                      {activeLeg?.legCode && (
                        <span className="text-sm font-bold text-white">
                          {activeLeg.legCode} Leg
                        </span>
                      )}
                    </span>
                  </div>
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
      ) : (
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
            {pendingRequest ? (
              <div className="flex h-16 items-center justify-center gap-2 rounded-full bg-[#FEF3C7]">
                <Hourglass className="h-5 w-5 text-[#92400E]" />
                <span className="text-sm font-bold uppercase text-[#92400E]">
                  Pending Support Review
                </span>
              </div>
            ) : (
              <button
                type="button"
                // A production action v1 does not cover. Saying so beats a dead
                // tap that reads as a bug — the same treatment the More Options
                // tiles give every unwired action.
                onClick={() =>
                  toast({
                    title: "I Reached Out to Confirm",
                    description:
                      "Not wired in the prototype — this is the production action.",
                  })
                }
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
      )}

    </div>
  );
}
