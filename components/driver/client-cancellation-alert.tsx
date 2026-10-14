"use client";

import { useRouter } from "next/navigation";
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
import {
  cancelAlertBody,
  CANCEL_ALERT_DISMISS,
  CANCEL_ALERT_GO,
  CANCEL_ALERT_TITLE,
} from "@/lib/driver-data/client-cancellation";
import type { Trip } from "@/lib/driver-data/mock-trips";

/**
 * ⭐⭐ Production's answer to a ride Wingz cancelled — catalogue row 19's Now
 * side. `CAP-341`, verbatim.
 *
 * > **Wingz Driver**
 * > Trip: 20261013134622G scheduled for 2026-10-18 at 01:46 PM was canceled.
 * > `OK`  `Go to ride`
 *
 * ⛔⛔ **`Go to ride` is the only door, and `OK` closes it.** The ride is in no
 * tab. A driver who dismisses this mid-drive has lost the trip id and cannot
 * work out which of the day's rides went — so they ring Support to confirm the
 * rest are still on. That call is the row.
 *
 * ⛔ **Ungated: this fires on both sides of the toggle.** The proposal does not
 * remove production's alert, it adds somewhere to find the ride afterwards. A
 * gate here would make the Proposed side look like the cancellation never
 * arrived.
 *
 * ⚠️ The title is the APP'S NAME, because the OS raises this, not the app. It
 * reads oddly beside the rest of the prototype's copy and it is what the
 * capture shows.
 */
export function ClientCancellationAlert({
  trip,
  onOpenChange,
}: {
  /**
   * `null` when the alert is closed — the trip IS the open state.
   *
   * ⛔ One value, not an `open` boolean beside it. Two fields can disagree, and
   * the disagreement here is an alert naming a trip the driver is not looking
   * at. The same shape `SwipeTooFarDialog` and `MissedSwipePrompt` use.
   */
  trip: Trip | null;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();

  return (
    <AlertDialog open={trip !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center text-lg font-bold text-gray-900">
            {CANCEL_ALERT_TITLE}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-sm text-gray-700">
            {trip ? cancelAlertBody(trip) : ""}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {/*
          ⛔⛔ TWO actions, and the second one is the whole finding. `OK` is
          terminal — it records nothing and leaves the ride unreachable. The
          capture puts them side by side with `Go to ride` on the right.
        */}
        <AlertDialogFooter className="flex-row justify-center gap-3 sm:justify-center">
          <AlertDialogCancel
            onClick={() => onOpenChange(false)}
            className="mt-0 flex-1 rounded-xl"
          >
            {CANCEL_ALERT_DISMISS}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onOpenChange(false);
              if (trip) router.push(`/my-rides/${trip.id}`);
            }}
            className="flex-1 rounded-xl"
          >
            {CANCEL_ALERT_GO}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
