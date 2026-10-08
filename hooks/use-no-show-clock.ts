"use client";

import { useEffect, useState } from "react";

/**
 * Minutes elapsed since this screen mounted, ticking once a second.
 *
 * The prototype is otherwise clockless on purpose — `MOCK_TODAY` is a constant
 * and swipe times are seeded — but a countdown cannot be. So this is the one
 * real clock, and it is deliberately RELATIVE: seeded record ages advance by
 * this, which means the timer runs down and the gate genuinely opens when it
 * reaches zero, without any absolute date entering the model.
 *
 * A second is the right interval: the button shows `m:ss`, so anything coarser
 * would visibly stutter and anything finer would re-render for nothing.
 */
export function useNoShowClock(active: boolean): number {
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  useEffect(() => {
    if (!active) return;
    const startedAt = Date.now();
    const id = window.setInterval(() => {
      setElapsedMinutes((Date.now() - startedAt) / 60000);
    }, 1000);
    return () => window.clearInterval(id);
  }, [active]);

  return elapsedMinutes;
}

/** `6:00` / `0:30`. Minutes as a float in, `m:ss` out. */
export function formatCountdown(minutes: number): string {
  const total = Math.max(0, Math.ceil(minutes * 60));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Past this, a countdown stops being useful and becomes a stopwatch nobody
 * watches — so the button shows the time it becomes available instead.
 */
export const COUNTDOWN_MAX_MINUTES = 15;

/**
 * `2h 05m`, for a wait too long to count down.
 *
 * ⚠️ A DURATION, not a clock time — and the reason is a prototype seam worth
 * knowing. Showing "available at 10:15 AM" would be better product: a driver can
 * compare it to the appointment. But it means adding the remaining minutes to the
 * REAL clock, while every ride time here is seeded fiction — so a ride whose
 * pick-up reads 1:50 PM was offering "2:29 AM", which is arithmetically right and
 * plainly nonsense. A duration is coherent under both clocks.
 *
 * A real build should show the time of day.
 */
export function formatLongWait(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}
