"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChatSlotNote } from "@/components/dev/chat-slot-note";
import { ChevronLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SignaturePad } from "@/components/ui/signature-pad";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RiderNoShowForm } from "@/components/support/rider-no-show-form";
import {
  NO_SHOW_REFUSAL_COPY,
  NO_SHOW_TYPES,
  resolveNoShow,
  treatmentFor,
  type NoShowOutcome,
} from "@/lib/driver-data/no-show-rules";
import { refusalCopyFor } from "@/components/driver/more-options-screen";
import { getLegStage, type Trip } from "@/lib/driver-data/mock-trips";
import {
  COUNTDOWN_MAX_MINUTES,
  formatLongWait,
  formatCountdown,
  useNoShowClock,
} from "@/hooks/use-no-show-clock";
import { DRIVER_TEAL } from "@/constants/driver-app-colors";

/**
 * Member No-Show — the production screen, replicated.
 *
 * A pushed page rather than a sheet, because that is what production is: back
 * chevron, centred title, `No-Show Type:` select, a tall `Driver Signature`
 * canvas, a centred blue Clear, and a full-width teal Submit pinned to the
 * bottom.
 *
 * **The guardrail fires at Submit, not on entry**, which is also production's
 * order. That means a driver about to be refused has already picked a type and
 * signed — work collected for nothing. The earlier design ran the check first to
 * avoid exactly that, and this deliberately does not: the driver knows this
 * screen, and familiarity was chosen over the saved keystrokes. ⚠️ Worth
 * revisiting if the refusal rate turns out to be high.
 *
 * What this branch changes is only what happens AFTER the refusal. Production's
 * dialog is a dead end — OK, and back to Zendesk. Here the same dialog offers a
 * way forward.
 */
export function MemberNoShowScreen({
  trip,
  backHref,
}: {
  trip: Trip;
  backHref: string;
}) {
  const router = useRouter();
  const { toast } = useToast();

  const [noShowType, setNoShowType] = useState("");
  const [signed, setSigned] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [refusal, setRefusal] = useState<NoShowOutcome | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  const swipeLegs = trip.legs.filter((leg) => leg.progress);
  const activeLeg =
    swipeLegs.find((leg) => getLegStage(leg) !== "completed") ?? swipeLegs[0];

  /**
   * The clock still runs here, because the Submit-time refusal is a real backstop
   * for direct-URL entry and its remaining time has to be current.
   *
   * ⚠️ It no longer drives anything on the button. Every refusal fires on the
   * More Options tile now, so a driver who reaches this screen is one whose
   * no-show will succeed — the countdown belongs where the refusal is.
   */
  const treatment = treatmentFor(trip);
  // ⚠️ The outcome no longer depends on the no-show type. It used to — `Cancel At
  // Door` bypassed the wait — and dropping that type dropped the dependency, so
  // the guardrail is now a pure function of the trip, the leg and the clock.
  const outcomeNow = resolveNoShow(trip, activeLeg, 0);
  const elapsed = useNoShowClock(outcomeNow.kind === "timer");
  const outcome = resolveNoShow(trip, activeLeg, elapsed);

  function handleSubmit() {
    // Light validation first, and deliberately NOT the refusal dialog — an
    // unfilled form and a failed guardrail are different problems, and reusing
    // "Unable to complete action" for both would teach the driver to read it as
    // "something is wrong" rather than "you have not waited long enough".
    if (!noShowType) {
      toast({
        title: "Member No-Show",
        description: "Choose a no-show type first.",
      });
      return;
    }
    if (!signed) {
      toast({
        title: "Member No-Show",
        description: "Add your signature before submitting.",
      });
      return;
    }
    if (!activeLeg) return;

    if (outcome.kind !== "files") {
      setRefusal(outcome);
      return;
    }

    // Every condition met, so production files it and there is nothing to ask.
    // ⚠️ No support request is created on this path, on purpose: the app action
    // IS the submission, and inventing a queue record would misrepresent what
    // happened.
    toast({
      title: "Member No-Show submitted",
      description: `We had you at the pick-up for ${Math.floor(outcome.qualifyingMinutes)} minutes. Not wired further in the prototype — this is the production action.`,
    });
    router.push(backHref);
  }

  /** What the refusal dialog says — production's wording, or the revised copy. */
  const refusalCopy = refusalCopyFor(refusal, treatment, activeLeg);
  /**
   * ⚠️ Two independent reasons this can be false.
   *
   * A timer never offers the form, in any treatment: the driver is at the
   * pick-up and simply has not waited long enough, so a form there is a way to
   * skip the wait. And an `as-is` treatment never offers it either, because
   * production does not — that dead end is precisely what the proposals fix.
   */
  const refusalOffersForm = refusal?.kind === "form" && treatment.offerForm;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-20 flex items-center bg-white px-4 py-4">
        <button
          type="button"
          onClick={() => router.push(backHref)}
          aria-label="Back"
          className="text-gray-900"
        >
          <ChevronLeft className="h-7 w-7" />
        </button>
        <h1 className="flex-1 text-center text-xl font-bold text-gray-900">
          Member No-Show
        </h1>
        <div className="flex w-7 items-center justify-end">
          <ChatSlotNote />
        </div>
      </header>

      <div className="flex-1 px-4 pb-4">
        <h2 className="mb-2 text-xl font-bold text-gray-900">No-Show Type:</h2>
        <Select value={noShowType} onValueChange={setNoShowType}>
          <SelectTrigger
            id="noShowType"
            className="h-16 rounded-lg border-gray-300 px-4 text-lg text-gray-900 data-[placeholder]:text-gray-400"
          >
            {/* "Select:" verbatim from the capture, colon included. */}
            <SelectValue placeholder="Select:" />
          </SelectTrigger>
          <SelectContent>
            {NO_SHOW_TYPES.map((option) => (
              <SelectItem key={option} value={option} className="text-base">
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <h2 className="mb-2 mt-7 text-xl font-bold text-gray-900">
          Driver Signature
        </h2>
        {/* Full-bleed and tall, per the capture — the pad's own hint-and-Clear
            row is suppressed so Clear can be the centred blue link below. */}
        <SignaturePad
          onSignedChange={setSigned}
          resetKey={resetKey}
          showFooter={false}
          className="-mx-4"
          canvasClassName="h-[440px] rounded-none border-x-0 border-y border-solid border-gray-200"
        />
        <button
          type="button"
          onClick={() => setResetKey((key) => key + 1)}
          className="mt-4 w-full text-center text-lg font-bold text-[#2F80ED]"
        >
          Clear
        </button>
      </div>

      {/* Pinned, and always tappable — production lets you submit and then tells
          you no, which is the behaviour being replicated.

          ⚠️ No countdown here any more. Every refusal now fires on the More
          Options tile, before the driver picks a type or signs, so a driver who
          reaches this screen is one whose no-show will succeed. The Submit-time
          refusal below survives only as a backstop for direct-URL entry. */}
      <div className="sticky bottom-0 border-t border-gray-200 bg-white px-4 py-4">
        <button
          type="button"
          onClick={handleSubmit}
          className="h-14 w-full rounded-lg text-lg font-bold text-white"
          style={{ backgroundColor: DRIVER_TEAL }}
        >
          Submit
        </button>
      </div>

      <AlertDialog
        open={Boolean(refusal)}
        onOpenChange={(open) => !open && setRefusal(null)}
      >
        <AlertDialogContent className="max-w-[20rem] rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-bold text-gray-900">
              Unable to complete action
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-gray-700">
              {refusalCopy}
            </AlertDialogDescription>
            {/* On a timer the dialog also says HOW LONG — which production never
                does. "Wait at least 10 minutes" with no idea how many are left is
                the difference between a rule and an instruction, and it is gated
                on the treatment so the as-is rows stay honest. */}
            {refusal?.kind === "timer" && treatment.showTimer && (
              <p className="pt-1 text-base font-bold text-gray-900">
                {refusal.minutesRemaining > COUNTDOWN_MAX_MINUTES
                  ? `About ${formatLongWait(refusal.minutesRemaining)} to go — stay at the pick-up and it will unlock.`
                  : `${formatCountdown(refusal.minutesRemaining)} to go — stay at the pick-up and it will unlock.`}
              </p>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            {/* The one thing production does not offer. Everything above this
                line is the dialog the driver already knows; this is the way out
                of it that used to be Zendesk.

                ⚠️ And it appears ONLY on a form outcome. On a timer the driver is
                standing at the pick-up and simply has not waited long enough —
                offering a form there turns it into a way to skip the wait.

                Labelled for the ARTEFACT, not the feeling — "Submit support
                form" tells the driver what they are about to do and matches the
                vocabulary the rest of the app uses. */}
            {refusalOffersForm && (
              <AlertDialogAction
                onClick={() => {
                  setRefusal(null);
                  setFormOpen(true);
                }}
                className="h-12 w-full rounded-lg text-base font-bold text-white"
                style={{ backgroundColor: DRIVER_TEAL }}
              >
                Submit support form
              </AlertDialogAction>
            )}
            <AlertDialogCancel className="mt-0 h-12 w-full rounded-lg border-gray-300 text-base font-bold text-gray-900">
              OK
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ⚠️ `key` is load-bearing. The sheet seeds its values from `initialValues`
          in a `useState` INITIALISER, which runs once at mount — and this is
          mounted (closed) before the driver has picked a no-show type, so the
          type arrived empty and the locked field rendered blank. Re-keying on the
          type remounts the subtree so the initialiser re-runs with the real
          value. Caught in the browser; the field looked present and correct in
          the diff. */}
      <RiderNoShowForm
        key={noShowType}
        trip={trip}
        leg={activeLeg}
        noShowType={noShowType}
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmitted={() => router.push(backHref)}
      />
    </div>
  );
}
