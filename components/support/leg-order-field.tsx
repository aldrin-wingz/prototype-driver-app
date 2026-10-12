"use client";

import { useRef, useState } from "react";
import { GripVertical, Lock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { fromTimeInputValue } from "@/lib/support/prefill";
import type { LegOrderConfig } from "@/types/support";

/**
 * Place a new leg among a trip's existing ones — catalogue row 19.
 *
 * ⛔⛔ **This control decides nothing.** Which slots are allowed, which rows are
 * blocked and why, and what the letters are all arrive on `config` from
 * `lib/driver-data/add-leg-request.ts`. A reorder list that worked out its own
 * legal moves would be a correctness rule inside JSX, which is the one thing
 * this repo does not allow.
 *
 * ⛔⛔ **vaul reads a downward drag as a dismiss**, and this is a mostly-downward
 * drag. The repo has paid for this once already — the signature pad dismissed
 * the sheet mid-signature — so the container carries `data-vaul-no-drag` AND the
 * handle stops propagation, which is the pair that fixed it then.
 *
 * ⭐ **Every slot is also a tap target**, for three reasons and the third is the
 * one that matters: keyboard and reader users cannot drag; a tap is an easier
 * target on a phone than a three-row drag; and **a drag cannot be driven
 * reliably from a check or a browser walk**, so a drag-only control would ship
 * with its central rule unverified.
 */
export function LegOrderField({
  config,
  value,
  values,
  onChange,
}: {
  config: LegOrderConfig;
  value: string;
  values: Record<string, string>;
  onChange: (value: string) => void;
}) {
  const slot = Number(value);
  // ⚠️ Falls back to the FIRST allowed slot, never to 0 — zero is the one slot
  // most likely to be illegal, since it sits ahead of a leg already under way.
  const current = config.allowedSlots.includes(slot)
    ? slot
    : config.allowedSlots[0];

  const listRef = useRef<HTMLDivElement>(null);
  const rowRefs = useRef<Array<HTMLDivElement | null>>([]);
  /**
   * ⛔⛔ **A ref, not state** — and the `useState` beside it is only for the
   * shadow.
   *
   * A `pointermove` that arrives in the same frame as its `pointerdown` would
   * read a `dragging` state React has not committed yet and be dropped, so the
   * first part of a fast drag would do nothing. Caught driving the control from
   * the browser console, where every event lands in one tick and the drag moved
   * nothing at all.
   */
  const draggingRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  /**
   * The nearest ALLOWED slot to a pointer position.
   *
   * ⛔ Clamps rather than rejecting. A row that follows the finger and then
   * snaps back on release reads as a bug; a row that simply will not go past a
   * locked leg reads as the rule it is.
   */
  function slotFromPointer(clientY: number): number {
    const midpoints = rowRefs.current.map((row) => {
      if (!row) return Number.POSITIVE_INFINITY;
      const box = row.getBoundingClientRect();
      return box.top + box.height / 2;
    });
    let target = config.rows.length;
    for (let index = 0; index < midpoints.length; index++) {
      if (clientY < midpoints[index]) {
        target = index;
        break;
      }
    }
    const allowed = config.allowedSlots;
    return allowed.reduce((best, candidate) =>
      Math.abs(candidate - target) < Math.abs(best - target) ? candidate : best
    );
  }

  function handlePointerDown(event: React.PointerEvent) {
    // ⛔ Both halves, per the signature-pad fix: the attribute keeps vaul from
    // treating the gesture as a drawer drag, and this keeps the event from
    // reaching the drawer's own listener at all.
    event.stopPropagation();
    // ⚠️ Wrapped — a synthetic pointer id has no capture to take, and throwing
    // here would abandon the drag before it started.
    try {
      (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    } catch {
      /* capture is an optimisation, not a requirement */
    }
    draggingRef.current = true;
    setDragging(true);
  }

  function handlePointerMove(event: React.PointerEvent) {
    if (!draggingRef.current) return;
    event.stopPropagation();
    const next = slotFromPointer(event.clientY);
    if (next !== current) onChange(String(next));
  }

  function endDrag(event: React.PointerEvent) {
    if (!draggingRef.current) return;
    event.stopPropagation();
    draggingRef.current = false;
    setDragging(false);
  }

  const pickup = fromTimeInputValue(values[config.pickupTimeField] ?? "");
  const dropoff = fromTimeInputValue(values[config.dropoffTimeField] ?? "");

  const newRow = (
    <div
      key="new-leg"
      className={cn(
        "flex items-center gap-3 rounded-xl border-2 border-[#10B981] bg-[#ECFDF5] px-3 py-3",
        dragging && "shadow-lg"
      )}
    >
      <button
        type="button"
        aria-label="Drag to move the new leg"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="flex h-9 w-9 flex-shrink-0 touch-none items-center justify-center rounded-lg text-[#047857]"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold text-[#065F46]">
          {config.newLegLabel}
        </span>
        <span className="block text-sm text-[#047857]">
          {pickup || "—"} → {dropoff || "—"}
        </span>
      </span>
    </div>
  );

  /** A tappable gap. The accessible path, and the one a check can drive. */
  function slotButton(index: number) {
    if (index === current) return null;
    const allowed = config.allowedSlots.includes(index);
    if (!allowed) return null;
    return (
      <button
        key={`slot-${index}`}
        type="button"
        aria-label={`Put the new leg in position ${index + 1}`}
        onClick={() => onChange(String(index))}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-1.5 text-xs font-medium text-gray-500 hover:border-[#10B981] hover:text-[#047857]"
      >
        <Plus className="h-3 w-3" />
        Put it here
      </button>
    );
  }

  const items: React.ReactNode[] = [];
  for (let index = 0; index <= config.rows.length; index++) {
    if (index === current) items.push(newRow);
    else items.push(slotButton(index));
    const row = config.rows[index];
    if (!row) continue;
    items.push(
      <div
        key={row.index}
        ref={(element) => {
          rowRefs.current[index] = element;
        }}
        className={cn(
          "flex items-center gap-3 rounded-xl border px-3 py-3",
          row.blockedReason ? "border-gray-200 bg-gray-50" : "border-gray-200"
        )}
      >
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-600">
          {row.blockedReason ? <Lock className="h-4 w-4" /> : row.letter}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-semibold text-gray-900">
            Leg {row.letter}
          </span>
          <span className="block text-sm text-gray-600">
            {row.pickupLabel} → {row.dropoffLabel}
          </span>
          <span className="block truncate text-xs text-gray-400">
            {row.address}
          </span>
          {row.blockedReason && (
            <span className="mt-1 block text-xs text-gray-500">
              {row.blockedReason}
            </span>
          )}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      data-vaul-no-drag
      className="space-y-2"
      role="listbox"
      aria-label="Where the new leg goes"
    >
      {items}
    </div>
  );
}
