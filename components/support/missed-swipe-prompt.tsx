"use client";

import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { PersonStanding, FileText, UserX, Clock } from "lucide-react";
import type { SwipeAnchor } from "@/lib/driver-data/missed-swipe-rules";

/**
 * What the driver says happened, when the app notices a swipe is owed.
 *
 * ⛔⛔ **Four answers, and the third is the one that keeps the rest honest.**
 * The app raises this by itself now, off the location trail — so it will also
 * raise it for a driver who waited at the pick-up and drove off because nobody
 * came out. That driver left the pick-up with the pick-up unrecorded, exactly
 * like a driver who forgot. Offering only "the member is with me" and "the ride
 * is over" would make them pick one and claim a ride that never happened — the
 * same trap the Cancel at Door picker had, in a flow that nobody chose to open.
 *
 * ⚠️ And "not yet" is not a cancel. The app is reading GPS and can be wrong, so
 * a notice it raises on its own has to be refusable without the driver asserting
 * anything at all.
 */
export type MissedSwipeAnswer =
  /** The member is in the car; the leg is still live. */
  | "member-aboard"
  /** The leg is over and the mark is simply missing. */
  | "ride-over"
  /** The member never came out — this is a no-show, not a missed swipe. */
  | "no-show"
  /** The app is early or wrong. Dismiss without claiming anything. */
  | "not-yet";

interface Choice {
  answer: MissedSwipeAnswer;
  icon: typeof PersonStanding;
  title: string;
  detail: string;
  tone: "primary" | "plain";
}

const PICKUP_CHOICES: Choice[] = [
  {
    answer: "member-aboard",
    icon: PersonStanding,
    title: "Yes — they're in the car now",
    detail: "Carry on and drop them off. We'll sort the pick-up out afterwards.",
    tone: "primary",
  },
  {
    answer: "ride-over",
    icon: FileText,
    title: "Yes — and the ride is already over",
    detail: "We'll ask about both ends and fill in whatever we can.",
    tone: "plain",
  },
  {
    answer: "no-show",
    icon: UserX,
    title: "No — the member never came out",
    detail: "That's a no-show, not a missed swipe. We'll take you there instead.",
    tone: "plain",
  },
  {
    answer: "not-yet",
    icon: Clock,
    title: "Not yet — I'm still on my way",
    detail: "We'll stop asking. The notice stays on the ride if you need it.",
    tone: "plain",
  },
];

const DROPOFF_CHOICES: Choice[] = [
  {
    answer: "ride-over",
    icon: FileText,
    title: "Yes — I dropped them off",
    detail: "We'll ask when and where, and fill in whatever we can.",
    tone: "primary",
  },
  {
    answer: "not-yet",
    icon: Clock,
    title: "Not yet — I'm still driving",
    detail: "We'll stop asking. The notice stays on the ride if you need it.",
    tone: "plain",
  },
];

/**
 * ⚠️ The claim is worded to its evidence. "We can see you were there" is only
 * true on a CONFIRMED departure — a fix inside the radius followed by one
 * outside it. On an inferred one the trail only approached and receded, and
 * saying more than that would be the app overstating what it has.
 */
function headline(anchor: SwipeAnchor, basis: "confirmed" | "inferred"): string {
  const end = anchor === "pickup" ? "pick-up" : "drop-off";
  return basis === "confirmed"
    ? `We can see you were at the ${end} and have moved on`
    : `It looks like you've driven on from the ${end}`;
}

export function MissedSwipePrompt({
  anchor,
  basis,
  open,
  onOpenChange,
  onAnswer,
}: {
  anchor: SwipeAnchor;
  basis: "confirmed" | "inferred";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAnswer: (answer: MissedSwipeAnswer) => void;
}) {
  const choices = anchor === "pickup" ? PICKUP_CHOICES : DROPOFF_CHOICES;
  const question =
    anchor === "pickup"
      ? "Did you pick the member up?"
      : "Did you drop the member off?";

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-md">
        <div className="px-5 pb-8 pt-2">
          <DrawerTitle className="text-lg font-bold text-[#303068]">
            {question}
          </DrawerTitle>
          <p className="mt-2 text-sm text-gray-600">
            {headline(anchor, basis)}, with no{" "}
            {anchor === "pickup" ? "pick-up" : "drop-off"} recorded for this leg.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            {choices.map((choice) => {
              const Icon = choice.icon;
              return (
                <Button
                  key={choice.answer}
                  type="button"
                  variant={choice.tone === "primary" ? "default" : "outline"}
                  onClick={() => onAnswer(choice.answer)}
                  className={
                    choice.tone === "primary"
                      ? "h-auto w-full justify-start gap-3 whitespace-normal rounded-2xl bg-[#00B090] px-4 py-4 text-left hover:bg-[#00997C]"
                      : "h-auto w-full justify-start gap-3 whitespace-normal rounded-2xl border-gray-300 px-4 py-4 text-left"
                  }
                >
                  <Icon
                    className={
                      choice.tone === "primary"
                        ? "h-6 w-6 shrink-0 text-white"
                        : "h-6 w-6 shrink-0 text-[#303068]"
                    }
                  />
                  <span className="flex min-w-0 flex-col">
                    <span
                      className={
                        choice.tone === "primary"
                          ? "text-sm font-semibold text-white"
                          : "text-sm font-semibold text-[#303068]"
                      }
                    >
                      {choice.title}
                    </span>
                    <span
                      className={
                        choice.tone === "primary"
                          ? "text-xs font-normal text-white/85"
                          : "text-xs font-normal text-gray-500"
                      }
                    >
                      {choice.detail}
                    </span>
                  </span>
                </Button>
              );
            })}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
