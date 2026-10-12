"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { DRIVER_NAME } from "@/lib/driver-data/options-menu";
import { ID_BADGE } from "@/lib/driver-data/id-badge";

/**
 * ID Badge — replicated from captures `05-06` and `05-07`.
 *
 * Presented as a sheet over the app, not a stack push: a dark bar with a single
 * **Close** on the right, then a white card holding the Wingz mark, the driver
 * name, a portrait, VEHICLE and LICENSE PLATE pills, a **Save as PDF** button
 * and a "How to print and make your ID badge" link.
 *
 * ⛔ THE CAPTURED BADGE SHOWS A REAL PERSON'S FACE. The account is a test
 * driver but the portrait is not synthetic, so it is never replicated — this
 * renders a generic avatar. Do not publish `05-06`/`05-07` anywhere.
 */
export default function IdBadgePage() {
  const router = useRouter();
  const { toast } = useToast();

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <div className="flex items-center justify-end bg-[#2B2B2B] px-6 py-5">
        <button type="button" onClick={() => router.back()} className="text-xl text-white">
          Close
        </button>
      </div>

      <main className="flex-1 px-6 py-6">
        <div className="rounded-3xl bg-white p-8 shadow-[0_2px_16px_rgba(0,0,0,0.08)]">
          <div className="flex flex-col items-center gap-6">
            {/* The real brand assets, already in the repo from the balance
                surfaces — better than redrawing the mark by eye. */}
            <div className="flex flex-col items-center gap-2">
              <Image src="/wingz-emblem.svg" alt="" width={72} height={72} />
              {/* ⛔ Was `-dark`, whose letters are `fill="white"` — on this
                  white card the wordmark has been invisible since the screen was
                  built, leaving the emblem alone where capture `05-06` shows
                  emblem AND word. Found while building the login screens, which
                  hit the identical trap. ⚠️ Navy, not the login screens' black —
                  `05-06`'s wordmark is distinctly indigo. */}
              <Image src="/wingz-wordmark-navy.svg" alt="Wingz" width={150} height={60} />
            </div>
            <p className="text-center text-3xl font-bold text-[#37474F]">{DRIVER_NAME}</p>

            {/* Generic avatar — see the file header on why the portrait is not replicated. */}
            <div className="flex h-40 w-32 items-center justify-center rounded-md bg-[#ECEFF1]">
              <User className="h-16 w-16 text-[#90A4AE]" />
            </div>

            <div className="flex flex-col items-center gap-2">
              <p className="text-lg tracking-wide text-[#546E7A]">VEHICLE:</p>
              <span className="rounded-lg bg-[#37474F] px-5 py-2.5 font-bold text-white">
                {ID_BADGE.vehicle}
              </span>
            </div>

            <div className="flex flex-col items-center gap-2">
              <p className="text-lg tracking-wide text-[#546E7A]">LICENSE PLATE:</p>
              <span className="rounded-lg bg-[#37474F] px-5 py-2.5 font-bold text-white">
                {ID_BADGE.licensePlate}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-6 pt-8">
          <button
            type="button"
            onClick={() =>
              toast({
                title: "Save as PDF",
                description: "Not wired in the prototype — this is the production action.",
              })
            }
            className="rounded-full bg-[#5C6670] px-10 py-4 text-xl text-white"
          >
            Save as PDF
          </button>
          <button
            type="button"
            onClick={() =>
              toast({
                title: "How to print and make your ID badge",
                description: "Not wired in the prototype — this is the production action.",
              })
            }
            className="text-xl font-semibold text-[#37474F] underline"
          >
            How to print and make your ID badge
          </button>
        </div>
      </main>
    </div>
  );
}

