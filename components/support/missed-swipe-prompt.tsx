"use client";

import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { PersonStanding, FileText } from "lucide-react";
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
  /** 1a — the member is in the car; the leg is still live. */
  | "member-aboard"
  /** 1b — the leg is over and nothing was swiped live. */
  | "ride-over";

/**
 * ⛔ **No subtext.** Each answer is one line that says what the driver did.
 * The explanatory second line went (user direction, 2026-10-14): it described
 * what the APP would do next, which is a promise made before the driver has
 * answered, and it made four lines of prose out of a two-way question.
 */
interface Choice {
  answer: MissedSwipeAnswer;
  icon: typeof PersonStanding;
  title: string;
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
 * Tapping a swipe *is* the driver saying that end of the leg happened. A no-show
 * driver never taps it. The trigger does the work the extra options were doing,
 * and the question is back to the two states that can actually follow.
 */
const PICKUP_CHOICES: Choice[] = [
  {
    answer: "member-aboard",
    icon: PersonStanding,
    title: "Yes — they're in the car now",
    tone: "primary",
  },
  {
    answer: "ride-over",
    icon: FileText,
    // ⚠️ "No", not "Yes — and". The question asks whether the member is still
    // with you, and a driver whose ride is over is answering no.
    title: "No — the ride is already over",
    tone: "plain",
  },
];

/**
 * ⛔⛔ **The drop-off asks the same question for a different reason.**
 *
 * The trail cannot place this tap at the drop-off. That has two ordinary
 * causes and the app cannot tell them apart: the drop-off already happened
 * somewhere else and was never marked, or the driver is still on the road with
 * the member and tapped early. Until this existed the second driver was handed
 * a form asking them to reconstruct a leg they were still driving.
 *
 * ⚠️ The answers are the same two values as the pick-up's, and the CONSEQUENCES
 * differ — `member-aboard` here means "carry on", not "postpone". That
 * difference lives in `routeMissedSwipe`, never here; this file only says what
 * the driver is being asked.
 */
const DROPOFF_CHOICES: Choice[] = [
  {
    answer: "member-aboard",
    icon: PersonStanding,
    title: "Yes — they're still in the car",
    tone: "primary",
  },
  {
    answer: "ride-over",
    icon: FileText,
    title: "No — I've already dropped them off",
    tone: "plain",
  },
];

/**
 * The question and its answers, per end of the leg.
 *
 * ⚠️ Exported so `verify-missed-swipe` can read the real lists rather than grep
 * the markup for a line — the same reason `reachOptionsFor` is pure.
 */
export function promptChoices(anchor: SwipeAnchor): {
  question: string;
  reason: string;
  choices: Choice[];
} {
  if (anchor === "pickup") {
    return {
      question: "Is the member still with you?",
      reason: "You are not at the pick-up location.",
      choices: PICKUP_CHOICES,
    };
  }
  return {
    question: "Is the member still with you?",
    reason: "You are not at the drop-off location.",
    choices: DROPOFF_CHOICES,
  };
}

export function MissedSwipePrompt({
  anchor,
  onOpenChange,
  onAnswer,
}: {
  /**
   * `null` when the prompt is closed — the anchor IS the open state.
   *
   * ⛔ One value, not an `open` boolean beside it. Two fields can disagree, and
   * the disagreement here is a sheet showing the pick-up's wording after a
   * drop-off tap. The same shape `SwipeTooFarDialog` uses.
   */
  anchor: SwipeAnchor | null;
  onOpenChange: (open: boolean) => void;
  onAnswer: (answer: MissedSwipeAnswer) => void;
}) {
  // ⚠️ Falls back to the pick-up copy only while the sheet animates closed,
  // where it is not on screen. vaul keeps the content mounted for half a
  // second after `open` goes false; reading `null` there would blank it.
  const { question, reason, choices } = promptChoices(anchor ?? "pickup");

  return (
    <Drawer open={anchor !== null} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-md">
        <div className="px-5 pb-8 pt-2">
          {/* ⚠️ The location line LEADS, the question follows — the order the
              driver reads it in. `DrawerTitle` stays on the question so the
              sheet's accessible name is what it is asking. */}
          <p className="text-sm text-gray-600">{reason}</p>
          <DrawerTitle className="mt-1 text-lg font-bold text-[#303068]">
            {question}
          </DrawerTitle>

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
                  <span
                    className={
                      choice.tone === "primary"
                        ? "min-w-0 text-sm font-semibold text-white"
                        : "min-w-0 text-sm font-semibold text-[#303068]"
                    }
                  >
                    {choice.title}
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
