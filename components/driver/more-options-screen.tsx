"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  CornerUpRight,
  Phone,
  Mail,
  Calendar,
  X,
  Reply,
  AlarmClockOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { SupportFormSheet } from "@/components/support/support-form-sheet";
import {
  buildSupportFormCase,
  TIME_FIELD_FOR_SWIPE,
} from "@/lib/support-data/case-registry";
import { ISSUE_MISSED_SWIPE } from "@/lib/support-data/issue-types";
import { buildPrefilledValues } from "@/lib/support/prefill";
import { resolveTripContext } from "@/lib/support/trip-context";
import { useRideFlow } from "@/lib/support-data/ride-flow-context";
import {
  getLegStage,
  getUnrecordedSwipes,
  type Trip,
} from "@/lib/driver-data/mock-trips";
import {
  DRIVER_NAVY,
  DRIVER_TEAL,
  DRIVER_ROSE,
  DRIVER_ROSE_DEEP,
  DRIVER_GOLD,
} from "@/constants/driver-app-colors";

/**
 * Icon treatments observed in reference capture `s-03a`. Three distinct ones,
 * and the difference is meaningful — a ring reads as navigation, a bare glyph as
 * a contact action, a filled circle as a consequential action.
 */
type TileVariant = "ring" | "plain" | "filled";

interface OptionTile {
  id: string;
  label: string;
  icon: typeof Phone;
  variant: TileVariant;
  color: string;
  /** Renders full-width and centred instead of taking a grid column. */
  fullWidth?: boolean;
  /**
   * Fill the glyph rather than stroking it.
   *
   * The capture shows all three plain glyphs as solid, but lucide is
   * stroke-based: filling only works for single closed paths like the phone.
   * Filling the mail or calendar collapses their interior detail into a blob, so
   * those stay stroked at a heavier weight. Known fidelity gap — exact solid
   * versions would need hand-drawn SVG.
   */
  solid?: boolean;
}

/**
 * The seven actions in the production More Options screen, in capture order.
 *
 * Replicated as observed. Note that three of them are already support paths:
 * `Call Member or Support` and `Email Support` are today's routes into Zendesk,
 * and `Member No-Show` / `Send Back Trip` are two of the candidate support cases
 * in the Support Case Catalog. Left exactly as captured — restructuring this
 * screen around support cases is a design decision nobody has made yet.
 */
const PRODUCTION_TILES: OptionTile[] = [
  {
    id: "map-pickup",
    label: "Map to Pickup Location",
    icon: CornerUpRight,
    variant: "ring",
    color: DRIVER_TEAL,
  },
  {
    id: "map-dropoff",
    label: "Map to Drop-off Location",
    icon: CornerUpRight,
    variant: "ring",
    color: DRIVER_ROSE,
  },
  {
    id: "call",
    label: "Call Member or Support",
    icon: Phone,
    variant: "plain",
    color: DRIVER_NAVY,
    solid: true,
  },
  {
    id: "email-support",
    label: "Email Support",
    icon: Mail,
    variant: "plain",
    color: DRIVER_NAVY,
  },
  {
    id: "calendar",
    label: "Add Event To Calendar",
    icon: Calendar,
    variant: "plain",
    color: DRIVER_NAVY,
  },
  {
    id: "no-show",
    label: "Member No-Show",
    icon: X,
    variant: "filled",
    color: DRIVER_ROSE_DEEP,
  },
  {
    id: "send-back",
    label: "Send Back Trip",
    icon: Reply,
    variant: "filled",
    color: DRIVER_GOLD,
  },
];

/**
 * Missed Swipe — the one support case v1 covers, and the only way into a form.
 *
 * A tile rather than a dropdown entry: the driver opened this screen from a
 * specific ride, so which trip the request is about is already settled. Tapping
 * it goes straight to the form with the issue and the ride both filled in.
 *
 * Not gated by swipe stage. A driver notices a missed swipe whenever they notice
 * it, which is not always the moment the app works out that a mark is missing.
 */
const MISSED_SWIPE_TILE: OptionTile = {
  id: "missed-swipe",
  label: "Missed Swipe",
  icon: AlarmClockOff,
  variant: "filled",
  color: DRIVER_NAVY,
};

function TileIcon({ tile }: { tile: OptionTile }) {
  const Icon = tile.icon;

  if (tile.variant === "ring") {
    return (
      <span
        className="flex h-[52px] w-[52px] items-center justify-center rounded-full border-[3px]"
        style={{ borderColor: tile.color }}
      >
        <Icon
          className="h-7 w-7"
          style={{ color: tile.color, fill: tile.color }}
          strokeWidth={1}
        />
      </span>
    );
  }

  if (tile.variant === "filled") {
    return (
      <span
        className="flex h-[52px] w-[52px] items-center justify-center rounded-full"
        style={{ backgroundColor: tile.color }}
      >
        <Icon className="h-7 w-7 text-white" strokeWidth={3} />
      </span>
    );
  }

  return (
    <span className="flex h-[52px] w-[52px] items-center justify-center">
      <Icon
        className="h-9 w-9"
        style={{
          color: tile.color,
          fill: tile.solid ? tile.color : "none",
        }}
        strokeWidth={tile.solid ? 1 : 2.25}
      />
    </span>
  );
}

function Tile({
  tile,
  onSelect,
}: {
  tile: OptionTile;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(tile.id)}
      className="flex min-h-[168px] w-full flex-col items-center justify-center gap-3 px-4 py-6"
    >
      <TileIcon tile={tile} />
      <span className="max-w-[150px] text-center text-base leading-snug text-gray-800">
        {tile.label}
      </span>
    </button>
  );
}

/**
 * More Options — the screen behind `More` in the Ride Details action row.
 *
 * Replicates reference capture `s-03a`: a stack-pushed full page (back chevron +
 * centred title, no bottom nav) holding a two-column icon grid with hairline
 * dividers, the odd last tile spanning full width.
 */
export function MoreOptionsScreen({
  trip,
  backHref,
}: {
  trip: Trip;
  backHref: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);

  const { getPendingRequest, submitForm } = useRideFlow();
  const pending = getPendingRequest(trip.id);

  const swipeLegs = trip.legs.filter((leg) => leg.progress);
  const activeLeg =
    swipeLegs.find((leg) => getLegStage(leg) !== "completed") ?? swipeLegs[0];
  // Hidden only while this ride already has a request in flight, so a driver
  // cannot file twice against the same trip.
  const gridTiles: OptionTile[] = !pending
    ? [...PRODUCTION_TILES, MISSED_SWIPE_TILE]
    : // Without the support tile the grid has an odd count, so Send Back Trip
      // takes the full width and centres, per capture s-03a.
      PRODUCTION_TILES.map((tile) =>
        tile.id === "send-back" ? { ...tile, fullWidth: true } : tile
      );

  /**
   * The issue is chosen for the driver, and the form shows it locked.
   *
   * `includeIssues` is what puts Missed Swipe in the select's options at all — a
   * selected value with no matching option renders as the placeholder, so the form
   * would claim no issue was picked. Seeding `issue` in the initial values is what
   * marks it app-supplied, which is what `lockWhenPrefilled` reads.
   *
   * The same seam takes a second case: register the issue, gate its fields on it,
   * and hand it to a tile.
   */
  const missedSwipeCase = buildSupportFormCase({
    includeIssues: [ISSUE_MISSED_SWIPE],
    // Every mark the app has no time for becomes required, because filing this
    // form asserts the driver drove the leg and could not swipe it. So the CTA the
    // ride is showing is what tells them what they will be asked: SWIPE TO START
    // means all three, DROP OFF MEMBER means just the drop-off.
    requireFields: activeLeg
      ? getUnrecordedSwipes(activeLeg).map((mark) => TIME_FIELD_FOR_SWIPE[mark])
      : [],
  });
  const initialValues: Record<string, string> = {
    ...buildPrefilledValues(missedSwipeCase, trip, activeLeg),
    issue: ISSUE_MISSED_SWIPE,
  };

  function handleProductionTile(id: string) {
    const tile = PRODUCTION_TILES.find((candidate) => candidate.id === id);
    // These are the real app's actions; none are wired in the prototype. Saying
    // so beats a dead tap that looks like a bug.
    toast({
      title: tile?.label ?? "Action",
      description: "Not wired in the prototype — this is the production action.",
    });
  }

  function handleGridTile(id: string) {
    if (id === MISSED_SWIPE_TILE.id) {
      // An empty prefilled leg means this ride is not one the form's own picker
      // would accept — `legScope: "in-progress"` drops it, because a missed swipe
      // is only actionable on a trip that is under way.
      //
      // Checked here rather than trusted, because opening the form anyway breaks
      // the premise it is built on: with nothing to prefill, the locked "From this
      // ride" card degrades into an open search box asking which trip the driver
      // means — the one question arriving from a ride has already answered.
      if (!initialValues.legId) {
        toast({
          title: "Missed Swipe",
          description: "Available once this ride is under way.",
        });
        return;
      }
      setFormOpen(true);
      return;
    }
    // Member No-Show included: it is a real production action and a candidate
    // support case, but not one v1 covers, so it toasts like the rest.
    handleProductionTile(id);
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-20 flex items-center bg-white px-4 py-4">
        <button
          type="button"
          onClick={() => router.push(backHref)}
          aria-label="Back"
          className="text-gray-900"
        >
          <ChevronLeft className="h-7 w-7" />
        </button>
        <h1 className="flex-1 pr-7 text-center text-xl font-bold text-gray-900">
          More Options
        </h1>
      </header>

      <div className="grid grid-cols-2 border-t border-[#F0F0F0]">
        {gridTiles.map((tile, index) => (
          <div
            key={tile.id}
            className={cn(
              "border-b border-[#F0F0F0]",
              // Vertical hairline on left-hand cells only, so the grid reads as
              // cells rather than boxed tiles.
              !tile.fullWidth && index % 2 === 0 && "border-r border-[#F0F0F0]"
            )}
            style={tile.fullWidth ? { gridColumn: "span 2" } : undefined}
          >
            <Tile tile={tile} onSelect={handleGridTile} />
          </div>
        ))}
      </div>

      <SupportFormSheet
        supportCase={missedSwipeCase}
        open={formOpen}
        onOpenChange={setFormOpen}
        initialValues={initialValues}
        onSubmit={(values) => {
          setFormOpen(false);
          submitForm({
            caseId: missedSwipeCase.id,
            issue: ISSUE_MISSED_SWIPE,
            ...resolveTripContext(missedSwipeCase, values),
            values,
          });
          toast({
            title: missedSwipeCase.successMessage ?? "Sent to Support",
            description:
              "This ride has moved to Pending while Support reviews it.",
          });
          router.push(backHref);
        }}
      />
    </div>
  );
}
