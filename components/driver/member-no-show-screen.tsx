"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSolution } from "@/lib/solutions/solution-context";
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
import { CancelAtDoorForm } from "@/components/support/cancel-at-door-form";
import {
  NO_SHOW_REFUSAL_COPY,
  NO_SHOW_TYPES,
  noShowFormFor,
  resolveNoShow,
  treatmentFor,
  waivesPresenceWait,
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
 * chevron, centred title, `No-Show Type:` select, a tall signature canvas, a
 * centred blue Clear, and a full-width teal Submit pinned to the bottom.
 *
 * ⛔ **The body below the select is per-type**, replicated from `CAP-232`–
 * `CAP-234`: Cancel At Door inserts a required `Spoke with` and relabels the pad
 * "Member Signature"; Member Not Ready adds a wait notice; Member Not Home adds
 * nothing. The shape lives in `NO_SHOW_TYPE_FORMS` rather than in this JSX, so
 * one rule drives the render, the validation and the guardrail instead of three
 * that can disagree.
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
  // ⛔ Which side of rows 01/02 this screen is showing. Production refuses and
  // stops; the proposal adds the countdown and the way forward.
  const { demo } = useSolution();
  const { toast } = useToast();

  const [noShowType, setNoShowType] = useState("");
  const [extraValue, setExtraValue] = useState("");
  const [signed, setSigned] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [refusal, setRefusal] = useState<NoShowOutcome | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [cancelAtDoorOpen, setCancelAtDoorOpen] = useState(false);
  /** Whether the app can place the driver at the pick-up — picks the variant. */
  const [cancelAtDoorAtPickup, setCancelAtDoorAtPickup] = useState(false);

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
  const treatment = treatmentFor(trip, demo);
  /** The captured form contract for whatever is selected right now. */
  const typeForm = noShowFormFor(noShowType);
  /**
   * ⚠️ The outcome depends on the no-show type again, which is what Phase 2
   * restores. A Cancel At Door at the pick-up but short of ten minutes resolves
   * to `files`, not `timer` — so selecting it here also stops the clock below,
   * and that is correct: there is no longer a wait to count down.
   */
  const outcomeNow = resolveNoShow(trip, activeLeg, demo, 0, noShowType);
  const elapsed = useNoShowClock(outcomeNow.kind === "timer");
  const outcome = resolveNoShow(trip, activeLeg, demo, elapsed, noShowType);

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
    // ⚠️ The only field production marks required with `*`, and it exists on
    // exactly one type. Checked before the signature because that is the order
    // it is rendered in.
    if (typeForm.extraField && !extraValue.trim()) {
      toast({
        title: "Member No-Show",
        description: `${typeForm.extraField.label} is required for ${noShowType}.`,
      });
      return;
    }
    if (!signed) {
      toast({
        title: "Member No-Show",
        // ⚠️ Whose signature it is changes with the type, so the prompt has to
        // as well — telling a driver to "add your signature" under a pad
        // labelled "Member Signature" asks for the wrong person's.
        description:
          typeForm.signatureLabel === "Member Signature"
            ? "Have the member sign before submitting."
            : "Add your signature before submitting.",
      });
      return;
    }
    if (!activeLeg) return;

    /**
     * ⛔ **Cancel at Door does not end here — it ends in the form below.**
     *
     * The waiver is a claim that the member came out and refused, and nothing
     * has yet asked whether that is what happened. So on every path the waiver
     * touches, Submit opens the two questions instead of resolving:
     *
     *   at the pick-up, short of ten minutes → `files` with the waiver set
     *   not at the pick-up, or no fix at all → `form`
     *
     * ⚠️ It deliberately bypasses `treatment.offerForm`, which exists to stop a
     * form appearing on a timer — "a form here would be a way to skip the wait".
     * That rule still holds for the other two types. It does not apply here
     * because THIS form is what decides whether the wait is skipped, and it
     * refuses the waiver when the answer does not support it.
     *
     * ⚠️ A ride that has genuinely served the ten minutes is NOT included: the
     * outcome carries no waiver, so there is nothing to justify and production's
     * plain filing stands.
     */
    const usingWaiver =
      waivesPresenceWait(noShowType, demo) &&
      ((outcome.kind === "files" && outcome.presenceWaitWaived) ||
        outcome.kind === "form");
    if (usingWaiver) {
      setCancelAtDoorAtPickup(outcome.kind === "files");
      setCancelAtDoorOpen(true);
      return;
    }

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
      // ⚠️ Two ways to reach `files` now, and they must not claim the same
      // thing. The waived path never observed ten minutes and does not pretend
      // to — it says what it DID see, and what stood in for the rest.
      description: outcome.presenceWaitWaived
        ? `${noShowType} — ${extraValue.trim()} refused at the door, so the 10-minute wait does not apply. We had you at the pick-up for ${Math.floor(outcome.qualifyingMinutes)} minutes. Not wired further in the prototype.`
        : `We had you at the pick-up for ${Math.floor(outcome.qualifyingMinutes)} minutes. Not wired further in the prototype — this is the production action.`,
    });
    router.push(backHref);
  }

  /** What the refusal dialog says — production's wording, or the revised copy. */
  const refusalCopy = refusalCopyFor(refusal, treatment, activeLeg, trip, demo);
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
        <h1 className="flex-1 pr-7 text-center text-xl font-bold text-gray-900">
          Member No-Show
        </h1>
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

        {/* ⚠️ Plain weight and no control — this is guidance, not a field.
            `CAP-234` places it between the select and the signature heading. */}
        {typeForm.helper && (
          <p className="mt-6 text-base text-gray-700">{typeForm.helper}</p>
        )}

        {/* Cancel At Door only. A free-text input, NOT a picker: production
            stores 3,601 distinct values in `ride_observation.spoke_with`, which
            no canned list produces. An earlier version of this prototype used a
            select labelled "Who did you talk to?" and was wrong on both counts. */}
        {typeForm.extraField && (
          <>
            <h2 className="mb-2 mt-7 text-xl font-bold text-gray-900">
              <label htmlFor={typeForm.extraField.id}>
                {typeForm.extraField.label} *
              </label>
            </h2>
            <input
              id={typeForm.extraField.id}
              type="text"
              value={extraValue}
              onChange={(event) => setExtraValue(event.target.value)}
              className="h-16 w-full rounded-lg border border-gray-300 px-4 text-lg text-gray-900 outline-none focus:border-gray-400"
            />
          </>
        )}

        <h2 className="mb-2 mt-7 text-xl font-bold text-gray-900">
          {typeForm.signatureLabel}
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

          ⚠️ No countdown on the button, and no refusal before this point. The
          More Options tile enforces guardrail 1 (the ride's STATUS) and nothing
          else, because the production lookback runs only on Submit — until then
          the app has done no location check at all. So every location refusal
          fires here, and that is also what makes Phase 2 possible: Submit is the
          only moment at which both the no-show type and the walk exist. */}
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
      {/* ⚠️ Re-keyed on the variant as well as the type: the sheet seeds its
          values in a `useState` initialiser that runs once at mount, and the two
          variants have different field sets. Without the variant in the key, a
          driver who hit the away form first would carry its time fields into the
          at-pick-up one. */}
      <CancelAtDoorForm
        key={`cad-${noShowType}-${cancelAtDoorAtPickup}`}
        trip={trip}
        leg={activeLeg}
        noShowType={noShowType}
        atPickup={cancelAtDoorAtPickup}
        open={cancelAtDoorOpen}
        onOpenChange={setCancelAtDoorOpen}
        onResolved={(resolution) => {
          if (resolution === "waiver-refused") {
            /**
             * ⛔ Resolve WITHOUT the type, deliberately. The waived outcome is
             * `files`, and showing that would be the opposite of what just
             * happened — the driver needs the countdown they would have had if
             * they had never claimed a refusal at the door.
             */
            setRefusal(resolveNoShow(trip, activeLeg, demo, elapsed, null));
            return;
          }
          router.push(backHref);
        }}
      />

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
