"use client";

import { Fragment } from "react";

import { cn } from "@/lib/utils";

/**
 * A use case rendered as the chain of steps it actually is.
 *
 * Every use case in the catalogue is written as `a → b → c`, because that is
 * how the support call unfolds: each arrow is a step where the driver could
 * have been helped and was not. Run together as one line it reads as prose and
 * the shape is lost; split on the arrow, the chain is the point.
 *
 * Two shapes to handle, both already in the data:
 *  - several examples separated by newlines (the catch-all row has three)
 *  - an `Ex 1 — ` prefix naming which example this is
 *
 * ⚠️ Splits on the literal `→` in the catalogue text, so the catalogue stays
 * the single source and nothing has to be re-authored as an array.
 */

export function splitUseCase(text: string): Array<{ label: string | null; steps: string[] }> {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = /^(Ex\s*\d+)\s*[—-]\s*(.*)$/.exec(line);
      const body = match ? match[2] : line;
      return {
        label: match ? match[1] : null,
        steps: body
          .split("→")
          .map((step) => step.trim())
          .filter(Boolean),
      };
    });
}

export function UseCaseFlow({
  text,
  tone = "dark",
  className,
}: {
  text: string;
  tone?: "dark" | "light";
  className?: string;
}) {
  const lines = splitUseCase(text);

  const stepClass = tone === "dark" ? "text-[#E6EFEC]" : "text-gray-700";
  const arrowClass = tone === "dark" ? "text-[#4FD1AE]" : "text-[#00B090]";
  const labelClass =
    tone === "dark"
      ? "bg-[#1B2C28] text-[#9FC3B8]"
      : "bg-gray-100 text-gray-500";

  return (
    <div className={cn("space-y-1", className)}>
      {lines.map((line, i) => (
        <p key={i} className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          {line.label && (
            <span
              className={cn(
                "shrink-0 rounded px-1 py-px text-[9px] font-bold uppercase tracking-wide",
                labelClass,
              )}
            >
              {line.label}
            </span>
          )}
          {line.steps.map((step, j) => (
            <Fragment key={j}>
              {j > 0 && (
                <span aria-hidden className={cn("shrink-0 font-bold", arrowClass)}>
                  →
                </span>
              )}
              <span className={stepClass}>{step}</span>
            </Fragment>
          ))}
        </p>
      ))}
    </div>
  );
}
