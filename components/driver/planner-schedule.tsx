"use client";

import { useRouter } from "next/navigation";
import { CarFront, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PLANNER_COPY, axisLabel, axisTicks, blockWindow,
  type PlannerBlock,
} from "@/lib/driver-data/planner";

/**
 * The Schedule card — a half-hourly time rail with blocks positioned against it.
 * Replicated from `03-03`–`03-06`.
 *
 * Geometry is derived from the tick range so a block always lines up with the
 * rail; hardcoding pixel offsets would let the two disagree the moment the seed
 * changed.
 */
const PX_PER_MIN = 2.2;

export function PlannerSchedule({ blocks }: { blocks: PlannerBlock[] }) {
  const router = useRouter();
  const ticks = axisTicks(blocks);
  if (!ticks.length) return null;

  const originMin = ticks[0];
  const height = (ticks[ticks.length - 1] - originMin) * PX_PER_MIN;
  const top = (m: number) => (m - originMin) * PX_PER_MIN;

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
        <Clock className="h-6 w-6" />
        {PLANNER_COPY.schedule}
      </h2>

      <div className="relative mt-4" style={{ height }}>
        {/* Time rail */}
        {ticks.map((t) => (
          <p
            key={t}
            style={{ top: top(t) - 9 }}
            className="absolute left-0 w-16 whitespace-pre-line text-[13px] leading-tight text-gray-500"
          >
            {axisLabel(t)}
          </p>
        ))}

        {/* Blocks */}
        <div className="absolute inset-y-0 left-[72px] right-0">
          {blocks.map((b) => {
            const isTrip = b.kind === "trip";
            return (
              <div
                key={b.id}
                role={isTrip ? "button" : undefined}
                tabIndex={isTrip ? 0 : undefined}
                onClick={isTrip && b.tripId ? () => router.push(`/my-rides/${b.tripId}`) : undefined}
                style={{ top: top(b.startMin), height: (b.endMin - b.startMin) * PX_PER_MIN }}
                className={cn(
                  "absolute inset-x-0 overflow-hidden rounded-r-xl border-l-4 px-4 py-3",
                  isTrip
                    ? "border-[#3CB371] bg-[#E6F7EC] text-left"
                    : "border-[#E8813A] bg-[#FCE8DC]",
                )}
              >
                {isTrip ? (
                  <div className="flex h-full flex-col">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5 truncate text-base font-bold text-gray-900">
                        {PLANNER_COPY.accepted}
                        {b.otp && (
                          <span className="flex-shrink-0 rounded border border-gray-900 px-1 text-[10px] font-bold">
                            OTP
                          </span>
                        )}
                      </span>
                      <span className="flex-shrink-0 rounded-full bg-[#9BE3B8] px-2.5 py-1 text-[15px] font-bold text-[#165c36]">
                        ${b.fare?.toFixed(2)}
                      </span>
                    </div>

                    <p className="flex items-center gap-2 pt-2 text-[15px] font-bold text-gray-900">
                      <User className="h-5 w-5" />
                      {b.rider}
                    </p>
                    <p className="text-sm text-gray-500">{blockWindow(b)}</p>

                    <div className="space-y-1 pt-2">
                      <p className="flex gap-2 text-[13px] leading-snug text-gray-900">
                        <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#10B981] text-[11px] font-bold text-white">
                          A
                        </span>
                        {b.pickupAddress}
                      </p>
                      <p className="flex gap-2 text-[13px] leading-snug text-gray-900">
                        <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-[3px] border-[#10B981] bg-white" />
                        {b.dropoffAddress}
                      </p>
                    </div>

                    <p className="mt-auto pt-3 text-center text-[13px] text-gray-600">
                      {PLANNER_COPY.tapToOpen}
                    </p>
                  </div>
                ) : (
                  <div className="flex h-full flex-col justify-end">
                    <p className="flex items-start gap-2 text-[15px] font-bold text-gray-900">
                      <CarFront className="mt-1 h-5 w-5 flex-shrink-0" />
                      <span>
                        Leave by {blockWindow(b).split(" - ")[0]} to pick up {b.rider}
                      </span>
                    </p>
                    <p className="text-sm text-gray-500">{blockWindow(b)}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
