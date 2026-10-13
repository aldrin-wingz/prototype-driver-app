"use client";

import { useToast } from "@/hooks/use-toast";
import type { DemoFocus } from "@/lib/solutions/demo-mode";
import { useSolution } from "@/lib/solutions/solution-context";
import { SupportFormSheet } from "./support-form-sheet";
import { buildSupportFormCase } from "@/lib/support-data/case-registry";
import { ISSUE_RIDER_NO_SHOW } from "@/lib/support-data/issue-types";
import { buildPrefilledValues } from "@/lib/support/prefill";
import { resolveTripContext } from "@/lib/support/trip-context";
import { useRideFlow } from "@/lib/support-data/ride-flow-context";
import { resolveNoShow } from "@/lib/driver-data/no-show-rules";
import type { Trip, TripLeg } from "@/lib/driver-data/mock-trips";
import type { SupportCallout } from "@/types/support";

/**
 * Build the Rider No-Show case for one leg, plus the values the app can prefill.
 *
 * Exported because an entry point needs the prefilled `legId` *before* it opens
 * anything: an empty one means this ride is not a ride the form's own leg picker
 * would accept (`legScope: "in-progress"` drops a ride that has not started), and
 * opening the form anyway degrades the locked "From this ride" card into an open
 * search box — asking the driver the one question arriving from a ride has
 * already answered.
 */
export function buildRiderNoShow(
  trip: Trip,
  leg: TripLeg | undefined,
  /** What the driver picked on the Member No-Show screen — "" when none ran. */
  noShowType = ""
) {
  // ⚠️ No screen ran, so nothing has been collected: the form has to ask for the
  // type and take the signature itself, or Support gets a claim with neither.
  const standalone = noShowType === "";
  const supportCase = buildSupportFormCase({
    askNoShowType: standalone,
    askSignature: standalone,
    // `includeIssues` is what puts Rider No-Show in the select's options at all —
    // a selected value with no matching option renders as the placeholder, so the
    // form would claim no issue was picked.
    includeIssues: [ISSUE_RIDER_NO_SHOW],
  });

  const initialValues: Record<string, string> = {
    ...buildPrefilledValues(supportCase, trip, leg),
    // Seeding a value is what marks it app-supplied, which is what
    // `lockWhenPrefilled` reads.
    issue: ISSUE_RIDER_NO_SHOW,
    noShowType,
  };

  return { supportCase, initialValues };
}

/**
 * What the app could not confirm, said plainly at the top of the sheet.
 *
 * The driver is being asked questions *because* a check failed, and a form that
 * opens without saying which one reads as the app being difficult. Naming the gap
 * also tells them what to write: "we only saw 4 minutes" and "we never placed you
 * there" call for different answers.
 */
function buildCallout(
  trip: Trip,
  leg: TripLeg | undefined,
  noShowType: string,
  // ⚠️ A PARAMETER, not a hook read inside — this is a plain function, and
  // keeping it pure is what lets a check build the real callout for each side.
  focus: DemoFocus
): SupportCallout | undefined {
  // ⚠️ The type travels here too, so this form cannot disagree with the screen
  // that opened it about whether the ride was fileable.
  const outcome = resolveNoShow(trip, leg, focus, 0, noShowType);

  // Only the form outcomes reach this sheet, and only they have
  // something to explain. Anything else means the sheet was opened by a path
  // that should not have — better to render no callout than to invent one.
  if (outcome.kind !== "form") return undefined;

  return {
    tone: "warning",
    title:
      outcome.gap === "no_location_data"
        ? "We can't see your location"
        : "You're not at the pick-up",
    detail: outcome.detail,
  };
}

/**
 * The Rider No-Show form, with its submit wired up.
 *
 * One mount, so the required fields, the locks and the store write cannot differ
 * between callers — there is a single entry point today, and that is exactly when
 * it is cheap to keep it that way.
 */
export function RiderNoShowForm({
  trip,
  leg,
  noShowType,
  open,
  onOpenChange,
  onSubmitted,
}: {
  trip: Trip;
  leg: TripLeg | undefined;
  /** Carried from the Member No-Show screen, so it is not asked twice. */
  noShowType?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Runs after the store write, for a caller that wants to navigate. */
  onSubmitted?: () => void;
}) {
  const { toast } = useToast();
  const { submitForm } = useRideFlow();
  const { demo } = useSolution();
  const { supportCase, initialValues } = buildRiderNoShow(trip, leg, noShowType);

  return (
    <SupportFormSheet
      supportCase={supportCase}
      callout={buildCallout(trip, leg, noShowType ?? "", demo)}
      open={open}
      onOpenChange={onOpenChange}
      initialValues={initialValues}
      onSubmit={(values) => {
        onOpenChange(false);
        submitForm({
          caseId: supportCase.id,
          issue: ISSUE_RIDER_NO_SHOW,
          ...resolveTripContext(supportCase, values),
          values,
          // ⚠️ Zendesk is the destination, so there is no status to read back.
          // The ride deliberately shows nothing afterwards — see the PRD's
          // superseded section, and `SupportFormRecord.appTracksStatus`.
          appTracksStatus: false,
        });
        toast({
          title: supportCase.successMessage ?? "Sent to Support",
          description:
            "Support has your report. The app will not show its progress — they will contact you if they need more.",
        });
        onSubmitted?.();
      }}
    />
  );
}
