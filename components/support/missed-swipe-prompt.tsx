"use client";

import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { PersonStanding, FileText } from "lucide-react";

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
  /** 1a — the member is in the car; the leg is still live. */
  | "member-aboard"
  /** 1b — the leg is over and nothing was swiped live. */
  | "ride-over";

interface Choice {
  answer: MissedSwipeAnswer;
  icon: typeof PersonStanding;
  title: string;
  detail: string;
  tone: "primary" | "plain";
}

/**
 * ⛔⛔ **Two answers, and that is only safe because the SWIPE is the trigger.**
 *
 * An earlier version raised this by itself when the ride was opened, which meant
 * it also caught a driver who had waited and left because nobody came out — so
 * it needed a third "the member never came out" answer and a dismiss, or it
 * would make that driver claim a ride that never happened.
 *
 * Tapping PICK UP MEMBER *is* the driver saying they have the member. A no-show
 * driver never taps it. The trigger does the work the extra options were doing,
 * and the question is back to the two states that can actually follow.
 */
const PICKUP_CHOICES: Choice[] = [
  {
    answer: "member-aboard",
    icon: PersonStanding,
    title: "Yes — they're in the car now",
    detail:
      "Carry on and drop them off as normal. We'll confirm the pick-up after that.",
    tone: "primary",
  },
  {
    answer: "ride-over",
    icon: FileText,
    title: "Yes — and the ride is already over",
    detail:
      "We'll ask you to confirm both ends, and fill in whatever we can.",
    tone: "plain",
  },
];

export function MissedSwipePrompt({
  open,
  onOpenChange,
  onAnswer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAnswer: (answer: MissedSwipeAnswer) => void;
}) {
  const choices = PICKUP_CHOICES;
  const question = "Is the member still with you?";

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-md">
        <div className="px-5 pb-8 pt-2">
          <DrawerTitle className="text-lg font-bold text-[#303068]">
            {question}
          </DrawerTitle>
          <p className="mt-2 text-sm text-gray-600">
            You&apos;re not at the pick-up any more, so we can&apos;t record this
            swipe where it happened.
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
