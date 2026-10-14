"use client";

import { useToast } from "@/hooks/use-toast";
import { legOptionFor } from "@/lib/support-data/leg-options";
import { SupportFormSheet } from "./support-form-sheet";
import { buildSupportFormCase } from "@/lib/support-data/case-registry";
import { ISSUE_ADD_LEG_REQUEST } from "@/lib/support-data/issue-types";
import { buildPrefilledValues } from "@/lib/support/prefill";
import { ticked } from "@/lib/support/field-rules";
import { useRideFlow } from "@/lib/support-data/ride-flow-context";
import {
  addLegBlocks,
  allowedSlots,
  cascadeShifts,
  earliestSlot,
  groupKey,
  groupLegs,
  isTripToday,
  minutesToClock,
  minutesToTimeInput,
  newLegLetter,
  newLegMinutes,
  rowLetterWithInsertion,
  legDropoffTimeFieldId,
  shiftFieldId,
  slotOrderWarning,
  timeInputToMinutes,
  ADD_DROPOFF_ADDRESS_FIELD,
  ADD_DROPOFF_TIME_FIELD,
  ADD_LEG_LABEL,
  ADD_LEG_REQUESTED_TITLE,
  ADD_LEG_SUBMIT_TOAST,
  ADD_PICKUP_ADDRESS_FIELD,
  ADD_PICKUP_TIME_FIELD,
  riderHomeAddress,
  SLOT_BLOCKED_REASON,
  ADD_LEG_GROUP,
  SLOT_FIELD,
  type AddLegBlock,
  type GroupLeg,
  type LegShift,
} from "@/lib/driver-data/add-leg-request";
import type { Trip, TripLeg } from "@/lib/driver-data/mock-trips";
import type { LegOrderConfig, SupportCaseDefinition } from "@/types/support";

function legOrderConfig(legs: GroupLeg[], slot: number): LegOrderConfig {
  return {
    rows: legs.map((leg) => ({
      index: leg.index,
      /**
       * ⛔⛔ The leg's own trip id, which is exactly what `addLegBlocks` uses
       * for `tripId` and what the block's fields are grouped under. The row and
       * the fields must name the same group or tapping a leg opens an empty
       * editor — a check pairs every row against the fields it claims.
       *
       * ⚠️ Present on EVERY row, including ones this insertion does not push.
       * A leg with no block simply has no fields to edit, and the control shows
       * no chevron on it; deciding that here would be a second copy of the
       * "which legs are pushed" rule.
       */
      groupId: leg.trip.id,
      /**
       * ⛔ Built from the same id helpers `addLegBlocks` uses, so the row and
       * the block cannot read different fields. A leg with no block simply has
       * no values at these ids and the row falls back to its own labels.
       */
      pickupTimeField: shiftFieldId(leg.trip.id),
      dropoffTimeField: legDropoffTimeFieldId(leg.trip.id),
      // ⛔ The letter AFTER the insertion, not the one the leg has now. See
      // `rowLetterWithInsertion` — this printed "New leg B" above "Leg B" until
      // a walk caught it.
      letter: rowLetterWithInsertion(leg.index, slot),
      pickupLabel: leg.pickupLabel,
      dropoffLabel: leg.dropoffLabel,
      address: leg.address,
      // ⛔ Blocked is a property of the LEG, and the control is told the reason
      // rather than working it out. `earliestSlot` is the rule.
      blockedReason:
        leg.index < earliestSlot(legs) && leg.activity !== "pending"
          ? SLOT_BLOCKED_REASON[leg.activity]
          : undefined,
    })),
    allowedSlots: allowedSlots(legs),
    newLegLabel: `New leg ${newLegLetter(slot)}`,
    /** ⛔ Matches `addLegBlocks`' own id for the new block, which has no trip. */
    newLegGroupId: ADD_LEG_GROUP,
    pickupTimeField: ADD_PICKUP_TIME_FIELD,
    dropoffTimeField: ADD_DROPOFF_TIME_FIELD,
  };
}

/**
 * Everything row 21 works out from a set of answers.
 *
 * ⭐ **One function, called from three places** — the case builder, the derived
 * values and the submit handler — so the shifts the form shows, the times it
 * writes back and the request it files are the same computation. Three walks
 * over the same trip would be three chances to disagree.
 */
export function addLegPlan(trip: Trip, values: Record<string, string>) {
  const legs = groupLegs(trip);
  const slots = allowedSlots(legs);
  const raw = Number(values[SLOT_FIELD]);
  const slot = slots.includes(raw) ? raw : slots[0];

  const estimate = newLegMinutes(legs);
  const pickupMinutes = timeInputToMinutes(values[ADD_PICKUP_TIME_FIELD] ?? "");
  /**
   * ⚠️ The drop-off follows the pick-up, EXCEPT where the driver has overridden
   * it — their own figure wins, because they were told they could change it.
   * ⛔ The override is detected by comparing against what we would have
   * proposed, not by a "touched" flag: the sheet resets on close and a flag
   * would not survive it, while this comparison is stateless.
   */
  const proposedDropoff =
    pickupMinutes === null ? null : pickupMinutes + estimate.minutes;
  const enteredDropoff = timeInputToMinutes(
    values[ADD_DROPOFF_TIME_FIELD] ?? ""
  );
  const dropoffMinutes = enteredDropoff ?? proposedDropoff;

  const cascade =
    pickupMinutes !== null && dropoffMinutes !== null
      ? cascadeShifts(legs, slot, pickupMinutes, dropoffMinutes)
      : { shifts: [] as LegShift[], overnight: false };

  return {
    legs,
    slot,
    estimate,
    pickupMinutes,
    proposedDropoff,
    dropoffMinutes,
    shifts: cascade.shifts,
    overnight: cascade.overnight,
    blocks: addLegBlocks(legs, slot, cascade.shifts),
    homeAddress: riderHomeAddress(legs),
  };
}

/** The case for a given set of answers. */
export function buildAddLegCase(
  trip: Trip,
  values: Record<string, string>
): SupportCaseDefinition {
  const plan = addLegPlan(trip, values);
  return buildSupportFormCase({
    includeIssues: [ISSUE_ADD_LEG_REQUEST],
    addLeg: {
      legOrder: legOrderConfig(plan.legs, plan.slot),
      estimateSource: plan.estimate.source,
      blocks: plan.blocks,
      homeAddress: plan.homeAddress,
      overnight: plan.overnight,
      slotWarning: slotOrderWarning(plan.legs, plan.slot, plan.pickupMinutes),
    },
  });
}

/**
 * Build the Add Leg to Trip case at rest — catalogue row 21.
 *
 * Exported so `scripts/verify-solutions.ts` can build the same case all three
 * entry points do: the More Options tile, the completed ride's own button, and
 * whichever leg of the group the driver happened to open.
 */
export function buildAddLeg(trip: Trip, leg: TripLeg | undefined) {
  const legs = groupLegs(trip);
  const openingValues: Record<string, string> = {
    [SLOT_FIELD]: String(allowedSlots(legs)[0]),
  };
  const supportCase = buildAddLegCase(trip, openingValues);
  const initialValues: Record<string, string> = {
    ...buildPrefilledValues(supportCase, trip, leg),
    ...openingValues,
    issue: ISSUE_ADD_LEG_REQUEST,
  };
  return { supportCase, initialValues, legs };
}

/**
 * The values that FOLLOW from the answers, and the key the sheet re-runs on.
 *
 * ⛔⛔ **Extracted rather than written inline in the `recompute` prop**, because
 * a check cannot reach a closure inside JSX. The first version of this lived in
 * the prop and the check that was meant to prove the key and the patch are
 * disjoint compared two RESTATEMENTS of them declared in the check itself — so
 * a break that added a patched field to the real key produced no failure at all.
 * Same shape as the label defect row 22's break tests found.
 */
export function addLegDerive(trip: Trip, values: Record<string, string>) {
  /**
   * ⛔⛔ **Planned with the drop-off STRIPPED**, which is not the same as
   * planning from `values`. This function runs exactly when the slot, the
   * pick-up or a tick box has just changed, so whatever drop-off is sitting in
   * `values` is a proposal for a schedule that no longer exists — and
   * `addLegPlan` treats an entered drop-off as authoritative, which is right
   * everywhere except here.
   *
   * ⚠️ Found by the second half of a walk defect: re-proposing the drop-off was
   * not enough, because the stale one was still driving the cascade, so Leg C
   * went on showing a knock-on that had been undone.
   */
  const plan = addLegPlan(trip, { ...values, [ADD_DROPOFF_TIME_FIELD]: "" });
  const patch: Record<string, string> = {};
  const seeded = new Map(plan.legs.map((leg) => [leg.trip.id, leg]));

  /**
   * ⛔⛔ **Written unconditionally, and the first version of this was wrong.**
   *
   * It used to write only into an EMPTY drop-off, so a figure the driver typed
   * would survive. But the app's own write fills the same field, so after the
   * first keystroke the guard was always false — and a walk caught it: changing
   * the pick-up from 2:30 PM to 1:00 PM left the drop-off at 3:20 PM and the
   * knock-on for Leg C still on screen. From `values` alone an app-written
   * figure and a driver-typed one are indistinguishable.
   *
   * ⭐ The KEY is what protects an override instead. The effect only runs when
   * the slot, the pick-up or a tick box changes, so a drop-off the driver edits
   * survives every render until the proposal is stale anyway.
   */
  if (plan.proposedDropoff !== null) {
    patch[ADD_DROPOFF_TIME_FIELD] = minutesToTimeInput(plan.proposedDropoff);
  }

  for (const block of plan.blocks) {
    if (block.kind !== "existing" || !block.tripId) continue;
    const leg = seeded.get(block.tripId);
    const shift = plan.shifts.find((s) => s.tripId === block.tripId);
    // The cascade's proposal, same contract as the new leg's drop-off above.
    if (shift) patch[block.fields.pickupTime] = minutesToTimeInput(shift.toMinutes);
    if (!leg) continue;
    /**
     * ⛔ The three fields a pushed leg gained open with what it HOLDS today —
     * written only into an empty field, never over one. The driver is
     * correcting a leg already on their manifest; four blanks would be the
     * retyping this project exists to remove, and an unconditional write would
     * discard their correction the moment they nudged the slot.
     *
     * ⚠️ Unlike the times above, these are facts rather than proposals, so the
     * stale-proposal argument for clobbering does not apply to them.
     */
    if (!values[block.fields.pickupAddress]) {
      patch[block.fields.pickupAddress] = leg.address;
    }
    if (!values[block.fields.dropoffAddress]) {
      patch[block.fields.dropoffAddress] = leg.dropoffAddress;
    }
    /**
     * ⛔⛔ The pushed leg's DROP-OFF is a proposal, not a fact — so it is
     * written unconditionally, exactly like its pick-up, and it comes from the
     * cascade rather than from the seed.
     *
     * Walk-found 2026-10-14: prefilled with the time the leg holds today it
     * read "Leg C pick-up 3:35 PM, drop-off 3:50 PM" — fifteen minutes for a
     * fifty-minute leg — and nothing warned, because 3:50 PM is still after
     * 3:35 PM. The leg keeps its own duration; what moves is when it starts.
     */
    if (shift?.toDropoffMinutes != null) {
      patch[block.fields.dropoffTime] = minutesToTimeInput(shift.toDropoffMinutes);
    } else if (!values[block.fields.dropoffTime] && leg.dropoffMinutes !== null) {
      patch[block.fields.dropoffTime] = minutesToTimeInput(leg.dropoffMinutes);
    }
  }

  /**
   * The tick boxes, applied LAST so they win over the seeded values above.
   *
   * ⛔⛔ **They write on tick and never clear on untick.** "Prefill upon
   * checking" is what was asked for, and a box that also wiped the field would
   * mean a driver who ticked, saw the address, unticked and corrected it lost
   * their correction on the next render — because `derive` is stateless and
   * cannot tell an untick from a field that was simply never ticked.
   */
  for (const block of plan.blocks) {
    const { sameAsPrevious, dropoffIsHome, pickupAddress, dropoffAddress } =
      block.fields;
    if (sameAsPrevious && ticked(values[sameAsPrevious]) && block.previous) {
      /**
       * ⛔ The leg in front may be one the driver is filling in RIGHT NOW — the
       * user's own example: tick C's box and it takes the drop-off just given
       * to the new leg B. So the source is a field id where there is one, and
       * the seed's address only where the leg in front is not on this form.
       */
      const source = block.previous.fieldId
        ? (values[block.previous.fieldId] ?? "")
        : block.previous.address;
      if (source) patch[pickupAddress] = source;
    }
    if (dropoffIsHome && ticked(values[dropoffIsHome]) && plan.homeAddress) {
      patch[dropoffAddress] = plan.homeAddress;
    }
  }

  /**
   * ⛔⛔ The key is built from the driver's OWN inputs only — the slot, the new
   * leg's pick-up, and every tick box. The patch writes addresses and times,
   * none of which appear here, so applying the patch cannot change the key and
   * the effect cannot retrigger itself.
   *
   * ⚠️ It is computed from the blocks rather than declared as a constant,
   * because which tick boxes exist depends on where the new leg goes. A fixed
   * list would stop covering them the moment the slot moved, and a tick would
   * then do nothing at all.
   */
  const keyFields = addLegKeyFields(plan.blocks);
  return {
    key: keyFields.map((id) => values[id] ?? "").join("|"),
    patch,
  };
}

/**
 * The fields the recompute key is built from, for a given set of blocks.
 *
 * Exported so the check reads the same list `addLegDerive` does rather than a
 * restatement of it — the defect this function was extracted for in the first
 * place.
 */
export function addLegKeyFields(blocks: AddLegBlock[]): string[] {
  return [
    SLOT_FIELD,
    ADD_PICKUP_TIME_FIELD,
    ...blocks.flatMap((block) =>
      [block.fields.sameAsPrevious, block.fields.dropoffIsHome].filter(
        (id): id is string => Boolean(id)
      )
    ),
  ];
}

export function AddLegForm({
  trip,
  leg,
  open,
  onOpenChange,
  onSubmitted,
}: {
  trip: Trip;
  leg: TripLeg | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitted?: () => void;
}) {
  const { toast } = useToast();
  const { submitForm, requestAddLeg } = useRideFlow();
  const { supportCase, initialValues } = buildAddLeg(trip, leg);

  return (
    <SupportFormSheet
      context={legOptionFor(trip, leg)}
      supportCase={supportCase}
      open={open}
      onOpenChange={onOpenChange}
      initialValues={initialValues}
      // ⛔ This case carries no leg picker, so the context block has nothing
      // to hang under. The leg is told to the sheet for the same reason it is
      // told to `submitForm` below — the entry point is a ride, and the form
      // has to show which one.
      recompute={{
        case: (values) => buildAddLegCase(trip, values),
        // ⛔ The real function, not a copy — see `addLegDerive`.
        derive: (values) => addLegDerive(trip, values),
      }}
      onSubmit={(values) => {
        onOpenChange(false);
        const plan = addLegPlan(trip, values);

        submitForm({
          caseId: supportCase.id,
          issue: ISSUE_ADD_LEG_REQUEST,
          // ⛔ Passed explicitly — this case carries no leg picker, so the
          // generic resolver would file a trip-less request. Same hand-off as
          // rows 17 and 22.
          tripId: trip.id,
          legId: leg?.id,
          values,
          appTracksStatus: false,
        });

        requestAddLeg(groupKey(trip), {
          groupKey: groupKey(trip),
          letter: newLegLetter(plan.slot),
          pickupLabel:
            plan.pickupMinutes === null
              ? "—"
              : minutesToClock(plan.pickupMinutes),
          dropoffLabel:
            plan.dropoffMinutes === null
              ? "—"
              : minutesToClock(plan.dropoffMinutes),
          pickupAddress: values[ADD_PICKUP_ADDRESS_FIELD] ?? "",
          dropoffAddress: values[ADD_DROPOFF_ADDRESS_FIELD] ?? "",
          /**
           * ⚠️ The shifts as SUBMITTED, not as proposed — a driver who edited
           * one is asking for their figure, and the banner has to show what was
           * actually asked for.
           */
          shifts: plan.shifts.map((shift) => {
            const edited = timeInputToMinutes(
              values[shiftFieldId(shift.tripId)] ?? ""
            );
            return edited === null || edited === shift.toMinutes
              ? shift
              : { ...shift, toLabel: minutesToClock(edited), toMinutes: edited };
          }),
        });

        // ⛔ ONE toast — `TOAST_LIMIT` is 1.
        toast({
          title: ADD_LEG_REQUESTED_TITLE,
          description: ADD_LEG_SUBMIT_TOAST,
        });
        onSubmitted?.();
      }}
    />
  );
}

export { ADD_LEG_LABEL };
