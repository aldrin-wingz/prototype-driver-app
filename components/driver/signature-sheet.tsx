"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

/** Drawn line weight, in CSS pixels. */
const STROKE_WIDTH = 2.5;
const STROKE_COLOR = "#111827";

/**
 * Driver signature capture.
 *
 * The first step of the production Member No-Show flow, before any validation —
 * the driver attests to the no-show, and only then does the app decide whether it
 * can accept the submission. Keeping that order matters: it is what makes a
 * refusal land as the real refusal rather than a pre-check that never let them
 * start.
 *
 * The drawn image is deliberately NOT returned. Nothing downstream stores or
 * displays a signature, so capturing the strokes and reporting "signed" is the
 * honest surface. Add a `toDataURL()` payload here if that ever changes.
 */
export function SignatureSheet({
  open,
  onOpenChange,
  riderName,
  onSigned,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Named in the attestation line, so the driver sees who they are signing about. */
  riderName: string;
  onSigned: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [hasStroke, setHasStroke] = useState(false);

  /**
   * Size the backing store to the device's pixel ratio.
   *
   * A canvas defaults to 300×150 CSS pixels stretched to fit, which renders a
   * blurry, offset line — and the offset breaks the coordinate maths, not just
   * the looks.
   */
  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;

    const context = canvas.getContext("2d");
    if (!context) return;
    context.scale(ratio, ratio);
    context.lineWidth = STROKE_WIDTH;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = STROKE_COLOR;
  }, []);

  // The canvas only exists once the drawer has mounted its content, so measure on
  // open rather than on first render.
  useEffect(() => {
    if (!open) return;
    setHasStroke(false);
    // One frame's grace for the drawer's open transition to settle, otherwise the
    // rect is still mid-animation and the backing store is sized wrong.
    const frame = requestAnimationFrame(resize);
    return () => cancelAnimationFrame(frame);
  }, [open, resize]);

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
    drawing.current = true;

    const { x, y } = pointFrom(event);
    context.beginPath();
    context.moveTo(x, y);
    // A tap with no drag is still a mark, so commit a dot immediately rather than
    // waiting for movement that may never come.
    context.lineTo(x, y);
    context.stroke();
    setHasStroke(true);
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;

    const { x, y } = pointFrom(event);
    context.lineTo(x, y);
    context.stroke();
  }

  function end() {
    drawing.current = false;
  }

  function clear() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    // Clearing in device pixels, since the context is scaled by the pixel ratio.
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.beginPath();
    setHasStroke(false);
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-3xl border-0 px-6 pb-8">
        <div className="mx-auto w-full max-w-md">
          <div className="flex items-start justify-between pt-2">
            <DrawerTitle className="text-2xl font-bold text-gray-900">
              Sign to confirm the no-show
            </DrawerTitle>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="-mr-2 -mt-1 p-2 text-gray-400"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <p className="mt-2 text-sm leading-relaxed text-gray-500">
            By signing, you confirm {riderName} was not present at the pick-up
            location.
          </p>

          <div className="mt-6">
            <canvas
              ref={canvasRef}
              onPointerDown={start}
              onPointerMove={move}
              onPointerUp={end}
              onPointerCancel={end}
              aria-label="Signature area"
              // `touch-none` is load-bearing on a phone: without it the browser
              // claims the gesture as a scroll and no stroke is ever drawn.
              className="h-44 w-full touch-none rounded-xl border border-dashed border-gray-300 bg-white"
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

          <Button
            type="button"
            disabled={!hasStroke}
            onClick={onSigned}
            className="mt-7 h-14 w-full rounded-xl bg-[#00B090] text-lg font-bold text-white hover:bg-[#059669] disabled:bg-[#9DECD4] disabled:opacity-100"
          >
            Done
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
