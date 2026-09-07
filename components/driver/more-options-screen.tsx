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
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useRideFlow } from "@/lib/support-data/ride-flow-context";
import {
  getLegStage,
  type Trip,
  type TripLeg,
} from "@/lib/driver-data/mock-trips";
import {
  canFileNoShow,
  NO_SHOW_POST_PICKUP_MINUTES,
  NO_SHOW_REFUSAL_COPY,
  NO_SHOW_STAGE_REFUSAL,
  NO_SHOW_WAIT_MINUTES,
  postPickupAvailableAt,
  postPickupRefusalCopy,
  postPickupThresholdMinutes,
  treatmentFor,
  type NoShowOutcome,
  type NoShowTreatment,
} from "@/lib/driver-data/no-show-rules";
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
 *
 * **`Member No-Show` is this branch's front door.** No new tile was added and no
 * separate Member No-Show case exists: the tile IS Rider No-Show. It behaves as
 * production does when the app can confirm the wait, and opens the form when it
 * cannot.
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
 * The refusal wording, per treatment.
 *
 * ⚠️ `production` is the exact string production raises today, including where it
 * is **wrong** — a driver who has already left is told to wait at a pick-up they
 * are not at. Reproducing that faithfully is the whole point of the as-is rows;
 * `revised` is the proposal.
 */
export function refusalCopyFor(
  outcome: NoShowOutcome | null,
  treatment: NoShowTreatment,
  /** The leg, so the availability time can come off its own pick-up. */
  leg?: TripLeg,
  /** The trip, which is what decides the threshold — 15 in Indiana, 0 elsewhere. */
  trip?: Trip
): string {
  if (!outcome) return "";
  if (outcome.kind === "timer") {
    if (outcome.reason !== "post-pickup") return NO_SHOW_REFUSAL_COPY.presence;
    // ⚠️ The threshold has to come from the TRIP, not from the constant. Reading
    // `NO_SHOW_POST_PICKUP_MINUTES` here would print "wait at least 15 minutes"
    // to a Georgia driver whose actual boundary is the pick-up time itself.
    const threshold = (trip && postPickupThresholdMinutes(trip)) ?? 0;
    return postPickupRefusalCopy({
      copy: treatment.copy,
      remainingMinutes: outcome.minutesRemaining,
      availableAt: leg ? postPickupAvailableAt(leg, threshold) : null,
      thresholdMinutes: threshold,
    });
  }
  if (outcome.kind !== "form") return "";
  return treatment.copy === "revised"
    ? NO_SHOW_REFUSAL_COPY[outcome.gap]
    : // Production has ONE message for every location failure.
      NO_SHOW_REFUSAL_COPY.presence;
}

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

  const { getPendingRequest } = useRideFlow();
  const pending = getPendingRequest(trip.id);

  const swipeLegs = trip.legs.filter((leg) => leg.progress);
  const activeLeg =
    swipeLegs.find((leg) => getLegStage(leg) !== "completed") ?? swipeLegs[0];

  const [stageRefused, setStageRefused] = useState(false);

  /**
   * ⚠️ Nothing about guardrail 2 is known here.
   *
   * The production lookback runs only on Submit, so at this point the app has
   * performed no location check at all — no distance, no dwell, nothing. There
   * used to be a countdown pill on this tile and a refusal dialog on the tap;
   * both were scrapped, because they were claiming knowledge the app does not
   * have until the driver submits.
   *
   * Guardrail 1 is different and stays: it reads the ride's own status, which is
   * available immediately and needs no location at all.
   */

  /**
   * ⚠️ The grid never changes shape. All seven production tiles, always, with
   * `Send Back Trip` full-width as the odd one — exactly as captured.
   */
  const gridTiles: OptionTile[] = PRODUCTION_TILES.map((tile) =>
    tile.id === "send-back" ? { ...tile, fullWidth: true } : tile
  );

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
    if (id === "no-show") {
      // Guardrail 1 only — the ride's status, which needs no location check.
      if (!activeLeg || !canFileNoShow(trip, activeLeg)) {
        setStageRefused(true);
        return;
      }
      // The prototype's own guard, which production has no concept of: one
      // request per ride, or the driver files the same claim twice.
      if (pending) {
        toast({
          title: "Member No-Show",
          description: "This ride is already with Support.",
        });
        return;
      }
      router.push(`/my-rides/${trip.id}/no-show`);
      return;
    }
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

      <AlertDialog
        open={stageRefused}
        onOpenChange={(open) => !open && setStageRefused(false)}
      >
        <AlertDialogContent className="max-w-[20rem] rounded-2xl">
          {/* No VISIBLE title, matching the capture — the sentence is the whole
              message and a heading above it would only restate it. But Radix
              requires one for screen readers (it errors without it), so it is
              present and `sr-only`: a driver using a reader hears what the dialog
              is before hearing the rule. */}
          <AlertDialogTitle className="sr-only">
            Member No-Show unavailable
          </AlertDialogTitle>
          <AlertDialogDescription className="py-2 text-base text-gray-900">
            {NO_SHOW_STAGE_REFUSAL}
          </AlertDialogDescription>
          <AlertDialogFooter>
            {/* Deliberately the only way out. A member already in the car cannot
                have failed to show, so there is nothing to collect. */}
            <AlertDialogAction className="bg-transparent text-base font-bold text-[#00B090] shadow-none hover:bg-transparent">
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

    </div>
  );
}
