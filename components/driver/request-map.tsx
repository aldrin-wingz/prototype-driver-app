"use client";

import { Home, Map as MapIcon, Plus, Minus, Navigation, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { isWillCall, pinPosition } from "@/lib/driver-data/map-view";
import type { Trip } from "@/lib/driver-data/mock-trips";

/**
 * The map behind the Requests sheet.
 *
 * ⛔ THE TILES ARE NOT THE POINT. Production renders Google Maps on Android and
 * Apple MapKit on the macOS simulator, which is the entire reason B1 captures
 * look pale green and B2 captures look teal/navy. That difference is PLATFORM,
 * not product — so this replicates the CHROME exactly (control rail, fare pins,
 * will-call badge, route markers) and leaves the tiles as a neutral surface
 * rather than chasing either SDK's palette.
 */

interface RequestMapProps {
  trips: Trip[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  zoom: number;
  onZoom: (next: number) => void;
}

/** Right-hand rail, top to bottom, per contract Part 2 ①–⑤. */
function MapControls({ onZoom, zoom }: { onZoom: (n: number) => void; zoom: number }) {
  return (
    <div className="absolute right-3 top-3 z-20 flex flex-col items-center gap-2">
      {/* ⚠️ Home is rendered DISABLED. It is greyed out in all 20 B2 captures —
          a simulator with no location permission, not a product state — and the
          base does not have a home address to recentre on either. */}
      <button
        type="button"
        disabled
        aria-label="Home"
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/45 text-white/80 shadow-md"
      >
        <Home className="h-5 w-5 fill-current" />
      </button>
      <button
        type="button"
        onClick={() => onZoom(1)}
        aria-label="Default zoom"
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-md"
      >
        <MapIcon className="h-5 w-5 text-gray-900" />
      </button>
      <button
        type="button"
        onClick={() => onZoom(Math.min(zoom + 0.25, 2))}
        aria-label="Zoom in"
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-md"
      >
        <Plus className="h-5 w-5 text-gray-900" />
      </button>
      <button
        type="button"
        onClick={() => onZoom(Math.max(zoom - 0.25, 0.5))}
        aria-label="Zoom out"
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-md"
      >
        <Minus className="h-5 w-5 text-gray-900" />
      </button>
      <button
        type="button"
        aria-label="Current location"
        className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1F2937] shadow-md"
      >
        <Navigation className="h-5 w-5 fill-[#34D399] text-[#34D399]" />
      </button>
    </div>
  );
}

/** A fare pin: the price, and an amber phone badge when the trip is will-call. */
function FarePin({
  trip, selected, onSelect,
}: { trip: Trip; selected: boolean; onSelect: () => void }) {
  const { leftPct, topPct } = pinPosition(trip);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`$${trip.totalRevenue.toFixed(2)}${isWillCall(trip) ? " will-call" : ""}`}
      style={{ left: `${leftPct}%`, top: `${topPct}%` }}
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
    >
      <span
        className={cn(
          "relative inline-flex items-center rounded-full border-2 border-white px-3 py-1 text-sm font-bold text-white shadow-md",
          selected ? "bg-[#065F46]" : "bg-[#3BAF8F]",
        )}
      >
        ${trip.totalRevenue.toFixed(2)}
        {isWillCall(trip) && (
          <span
            data-will-call-badge
            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full border border-white bg-[#F0B429]"
          >
            <Phone className="h-2.5 w-2.5 fill-white text-white" />
          </span>
        )}
      </span>
    </button>
  );
}

export function RequestMap({ trips, selectedId, onSelect, zoom, onZoom }: RequestMapProps) {
  const selected = trips.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#2F7F72]">
      {/* Neutral landmass/water wash. Deliberately not a tile palette — see the
          file header on why the tint is platform, not product. */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 22% 34%, #3E9385 0%, transparent 58%)," +
            "radial-gradient(ellipse at 74% 68%, #24707F 0%, transparent 62%)," +
            "linear-gradient(140deg, #2F7F72 0%, #2B7A78 48%, #1E4E6B 100%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,.18) 1px, transparent 1px)," +
            "linear-gradient(to bottom, rgba(255,255,255,.18) 1px, transparent 1px)",
          backgroundSize: `${44 * zoom}px ${44 * zoom}px`,
        }}
      />

      <MapControls onZoom={onZoom} zoom={zoom} />

      {/* Route view: A at the pickup (green), B at the drop-off (blue), drawn
          only for the selected trip. Drop-off is never shown while browsing. */}
      {selected && (
        <svg aria-hidden className="absolute inset-0 z-[5] h-full w-full">
          <line
            x1={`${pinPosition(selected).leftPct}%`}
            y1={`${pinPosition(selected).topPct}%`}
            x2={`${Math.min(pinPosition(selected).leftPct + 18, 92)}%`}
            y2={`${Math.min(pinPosition(selected).topPct + 16, 88)}%`}
            stroke="#2563EB"
            strokeWidth={3}
            strokeLinecap="round"
          />
        </svg>
      )}

      <div className="absolute inset-0" style={{ transform: `scale(${zoom})`, transformOrigin: "center" }}>
        {trips.map((trip) => (
          <FarePin
            key={trip.id}
            trip={trip}
            selected={trip.id === selectedId}
            onSelect={() => onSelect(trip.id === selectedId ? null : trip.id)}
          />
        ))}

        {selected && (
          <>
            <span
              style={{ left: `${pinPosition(selected).leftPct}%`, top: `${pinPosition(selected).topPct}%` }}
              className="absolute z-20 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-[#10B981] text-xs font-bold text-white shadow"
            >
              A
            </span>
            <span
              style={{
                left: `${Math.min(pinPosition(selected).leftPct + 18, 92)}%`,
                top: `${Math.min(pinPosition(selected).topPct + 16, 88)}%`,
              }}
              className="absolute z-20 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-[#2563EB] text-xs font-bold text-white shadow"
            >
              B
            </span>
          </>
        )}
      </div>
    </div>
  );
}
