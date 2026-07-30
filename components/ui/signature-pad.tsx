"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Drawn line weight, in CSS pixels. */
const STROKE_WIDTH = 2.5;
const STROKE_COLOR = "#111827";

/**
 * Draw-to-sign canvas.
 *
 * Shared by the standalone signature sheet and the `signature` form field, so
 * both behave identically — the drawing, sizing and drag-conflict handling are
 * fiddly enough that two copies would drift.
 *
 * The drawn image is deliberately NOT exposed. Nothing downstream stores or
 * displays a signature, so reporting whether one exists is the honest surface.
 * Add a `toDataURL()` payload here if that ever changes.
 */
export function SignaturePad({
  /** Fires with true once the first stroke lands, false when cleared. */
  onSignedChange,
  /** Bumping this clears the pad — used to reset between openings. */
  resetKey,
  className,
}: {
  onSignedChange: (signed: boolean) => void;
  resetKey?: unknown;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const observer = useRef<ResizeObserver | null>(null);
  const drawing = useRef(false);
  const [hasStroke, setHasStroke] = useState(false);

  /**
   * Size the backing store to the device's pixel ratio.
   *
   * A canvas defaults to a 300×150 backing store stretched to fit its box, which
   * renders a blurry line — and worse, puts every pointer coordinate in a
   * different space from the pixels, so the stroke lands away from the finger.
   *
   * No-ops when the size already matches, because resizing a canvas clears it and
   * this runs from an observer that can fire mid-signature.
   */
  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;

    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(rect.width * ratio);
    const height = Math.round(rect.height * ratio);
    if (canvas.width === width && canvas.height === height) return;

    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(ratio, ratio);
    context.lineWidth = STROKE_WIDTH;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = STROKE_COLOR;
  }, []);

  /**
   * Measure the moment the canvas attaches, and again if its box changes.
   *
   * A drawer mounts its content only when it opens, so an effect keyed on open
   * state runs while the canvas does not yet exist — a callback ref is the only
   * hook that fires at the right time. The observer then covers the transition.
   */
  const attachCanvas = useCallback(
    (node: HTMLCanvasElement | null) => {
      observer.current?.disconnect();
      canvasRef.current = node;
      if (!node) return;

      resize();
      observer.current = new ResizeObserver(resize);
      observer.current.observe(node);
    },
    [resize]
  );

  useEffect(() => () => observer.current?.disconnect(), []);

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (canvas && context) {
      // Clearing in device pixels, since the context is scaled by the ratio.
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.beginPath();
    }
    setHasStroke(false);
    onSignedChange(false);
  }, [onSignedChange]);

  // Reset on demand — reopening a sheet must not inherit the last signature.
  useEffect(() => {
    if (resetKey === undefined) return;
    clear();
    // Only when the key changes; `clear` is stable enough for a prototype.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  function pointFrom(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;

    // Keeps the stroke following the finger even if it leaves the canvas, so a
    // signature that overshoots the box doesn't end mid-letter.
    event.currentTarget.setPointerCapture(event.pointerId);
    // A drawer treats a downward drag as dismiss, and a signature is full of
    // downward strokes — without this, signing swipes the sheet closed.
    event.stopPropagation();
    drawing.current = true;

    const { x, y } = pointFrom(event);
    context.beginPath();
    context.moveTo(x, y);
    // A tap with no drag is still a mark, so commit a dot immediately rather than
    // waiting for movement that may never come.
    context.lineTo(x, y);
    context.stroke();
    setHasStroke(true);
    onSignedChange(true);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;

    event.stopPropagation();
    const { x, y } = pointFrom(event);
    context.lineTo(x, y);
    context.stroke();
  }

  function end(event: React.PointerEvent<HTMLCanvasElement>) {
    event.stopPropagation();
    drawing.current = false;
  }

  return (
    <div className={className}>
      <canvas
        ref={attachCanvas}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        aria-label="Signature area"
        // Tells the drawer this region is not a drag handle. Belt and braces with
        // the stopPropagation above — a signature sheet that dismisses itself
        // mid-stroke is bad enough to warrant both.
        data-vaul-no-drag
        // `touch-none` is load-bearing on a phone: without it the browser claims
        // the gesture as a scroll and no stroke is ever drawn.
        className={cn(
          "h-44 w-full touch-none rounded-xl border border-dashed border-gray-300 bg-white"
        )}
      />
      <div className="mt-2 flex items-center justify-between">
        <p className="text-sm text-gray-400">
          {hasStroke ? "Signed" : "Draw your signature above"}
        </p>
        <button
          type="button"
          onClick={clear}
          disabled={!hasStroke}
          className="text-sm font-semibold text-gray-600 disabled:opacity-40"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
