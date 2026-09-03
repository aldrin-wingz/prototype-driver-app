"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  resolveNoShowGate,
  type NoShowGate,
} from "@/lib/driver-data/no-show-rules";
import { getLegStage, type Trip } from "@/lib/driver-data/mock-trips";
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
  const [refusal, setRefusal] = useState<Extract<NoShowGate, { ok: false }> | null>(
    null
  );
  const [formOpen, setFormOpen] = useState(false);

  const swipeLegs = trip.legs.filter((leg) => leg.progress);
  const activeLeg =
    swipeLegs.find((leg) => getLegStage(leg) !== "completed") ?? swipeLegs[0];

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

    const gate = resolveNoShowGate(activeLeg);
    if (!gate.ok) {
      setRefusal(gate);
      return;
    }

    // The wait is provable, so production files it and there is nothing to ask.
    // ⚠️ No support request is created on this path, on purpose: the app action
    // IS the submission, and inventing a queue record would misrepresent what
    // happened.
    toast({
      title: "Member No-Show submitted",
      description: `We recorded ${gate.qualifyingMinutes} minutes at the pick-up. Not wired further in the prototype — this is the production action.`,
    });
    router.push(backHref);
  }

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

      {/* Pinned, and always enabled — production lets you submit and then tells
          you no, which is the behaviour being replicated. */}
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
              {refusal ? NO_SHOW_REFUSAL_COPY[refusal.gap] : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
            {/* The one thing production does not offer. Everything above this
                line is the dialog the driver already knows; this is the way out
                of it that used to be Zendesk.

                Labelled for the ARTEFACT, not the feeling — "Submit support
                form" tells the driver what they are about to do and matches the
                vocabulary the rest of the app uses. */}
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
