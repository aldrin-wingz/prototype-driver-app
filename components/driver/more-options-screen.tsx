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
  FileText,
  AlarmClockOff,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { SupportFormSheet } from "@/components/support/support-form-sheet";
import {
  supportCases,
  getSupportCase,
  SUPPORT_FORM_CASE_ID,
} from "@/lib/support-data/case-registry";
import { buildCalloutForCase } from "@/lib/support/build-callout";
import { buildPrefilledValues } from "@/lib/support/prefill";
import { resolveTripContext } from "@/lib/support/trip-context";
import { useRideFlow } from "@/lib/support-data/ride-flow-context";
import { getLegStage, type Trip } from "@/lib/driver-data/mock-trips";
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
 * Submit Support Form — the in-app replacement for the Zendesk web form.
 *
 * Available on EVERY trip, not gated by swipe stage. A driver notices a missed
 * swipe whenever they notice it, and the form's leg picker lets them file against
 * any of their rides regardless of which one they opened this screen from.
 */
const SUPPORT_FORM_TILE: OptionTile = {
  id: SUPPORT_FORM_CASE_ID,
  label: "Submit Support Form",
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
  const [openCaseId, setOpenCaseId] = useState<string | null>(null);
  const openCase = openCaseId ? getSupportCase(openCaseId) : undefined;

  const { getPendingRequest, saveDraft, submitForm } = useRideFlow();
  const pending = getPendingRequest(trip.id);

  const swipeLegs = trip.legs.filter((leg) => leg.progress);
  const activeLeg =
    swipeLegs.find((leg) => getLegStage(leg) !== "completed") ?? swipeLegs[0];
  // Hidden only while this ride already has a request in flight, so a driver
  // cannot file twice against the same trip.
  const gridTiles: OptionTile[] = !pending
    ? [...PRODUCTION_TILES, SUPPORT_FORM_TILE]
    : // Without the support tile the grid has an odd count, so Send Back Trip
      // takes the full width and centres, per capture s-03a.
      PRODUCTION_TILES.map((tile) =>
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
            <Tile
              tile={tile}
              onSelect={
                tile.id === SUPPORT_FORM_TILE.id
                  ? () => setOpenCaseId("support-form")
                  : handleProductionTile
              }
            />
          </div>
        ))}
      </div>

      {/* ------------------------------------------------------------------
          Prototype-only. NOT part of the production More Options screen.
          Kept visually separated and explicitly labelled so this screen can be
          shown to stakeholders without implying these entries ship today.
         ------------------------------------------------------------------ */}
      <section className="mt-6 border-t-4 border-dashed border-gray-200 px-4 pb-10 pt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          Prototype only — not in the app today
        </p>
        <p className="mt-1 text-sm text-gray-500">
          In-app support requests being explored, so the forms are reachable for
          review.
        </p>

        <div className="mt-4 space-y-2">
          {/* Cases already promoted to a real grid tile are not repeated here. */}
          {supportCases()
            .filter((supportCase) => supportCase.id !== SUPPORT_FORM_TILE.id)
            .map((supportCase) => {
            const isAvailable = supportCase.buildState !== "not-yet";

            return (
              <button
                key={supportCase.id}
                type="button"
                disabled={!isAvailable}
                onClick={() => setOpenCaseId(supportCase.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border p-4 text-left",
                  isAvailable
                    ? "border-gray-200 bg-white"
                    : "border-gray-100 bg-gray-50"
                )}
              >
                <FileText
                  className={cn(
                    "h-5 w-5 flex-shrink-0",
                    isAvailable ? "text-gray-500" : "text-gray-300"
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-base font-semibold",
                      isAvailable ? "text-gray-900" : "text-gray-400"
                    )}
                  >
                    {supportCase.title}
                  </span>
                  {supportCase.summary && (
                    <span
                      className={cn(
                        "block text-sm",
                        isAvailable ? "text-gray-500" : "text-gray-400"
                      )}
                    >
                      {supportCase.summary}
                    </span>
                  )}
                  {!isAvailable && (
                    <span className="mt-1 inline-block rounded-full bg-[#FEF3C7] px-2 py-0.5 text-xs font-medium text-[#92400E]">
                      ⚠️ Not in prototype yet
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {openCase && (
        <SupportFormSheet
          supportCase={openCase}
          callout={buildCalloutForCase(openCase.id, activeLeg)}
          open
          onOpenChange={(next) => {
            if (!next) setOpenCaseId(null);
          }}
          initialValues={buildPrefilledValues(openCase, trip, activeLeg)}
          onSaveDraft={(values) => {
            setOpenCaseId(null);
            saveDraft({
              caseId: openCase.id,
              issue: values.issue ?? "",
              ...resolveTripContext(openCase, values),
              values,
            });
            toast({
              title: "Saved to drafts",
              description: "Pick it back up from My Forms whenever.",
            });
          }}
          onSubmit={(values) => {
            setOpenCaseId(null);
            const context = resolveTripContext(openCase, values);
            submitForm({
              caseId: openCase.id,
              issue: values.issue ?? "",
              ...context,
              values,
            });
            toast({
              title: openCase.successMessage ?? "Sent to Support",
              description: context.tripId
                ? "This ride has moved to Pending while Support reviews it."
                : "It's in Pending review under My Forms.",
            });
            router.push(backHref);
          }}
        />
      )}
    </div>
  );
}
