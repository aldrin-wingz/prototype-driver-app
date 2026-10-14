"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SupportFieldRenderer } from "./support-field-renderer";
import { TripSummaryBanner } from "./trip-summary-banner";
import { findLegOption } from "@/lib/support-data/leg-options";
import { SUPPORT_FORM_TITLE } from "@/lib/support-data/issue-types";
import { deriveFromLeg } from "@/lib/support/prefill";
import {
  canSubmitCase,
  hasRequiredChange,
  emptyValues,
  isFieldVisible,
} from "@/lib/support/field-rules";
import { getTimeOrderWarnings } from "@/lib/support/time-order";
import type { SupportCaseDefinition } from "@/types/support";

/**
 * The base support-form sheet, replicating reference screenshot `s-02a`
 * ("Late pickup reason"). Every support case renders through this — the sheet is
 * the pattern, the case is the data.
 *
 * Anatomy, top to bottom: drag handle · title + close · fields · Cancel /
 * primary action.
 *
 * ⛔⛔ **One title for every case, and the Issue type field is the FIRST thing
 * under it.** The sheet used to take the chosen issue's NAME as its heading and
 * print that issue's purpose line beneath — so the driver read the case twice
 * before reaching a question, and the heading changed depending on how they got
 * in. The form is one form; which case it is, is an answer, and it is the first
 * field. User direction 2026-10-14.
 */
export function SupportFormSheet({
  supportCase,
  initialValues,
  open,
  onOpenChange,
  onSubmit,
  contextLegId,
  recompute,
}: {
  supportCase: SupportCaseDefinition;
  /** Values the app already knows, so the driver only supplies what is new. */
  initialValues?: Record<string, string>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: Record<string, string>) => void;
  /**
   * For a case whose FIELD SET follows the answers — catalogue row 19, so far
   * the only one.
   *
   * ⛔⛔ Every other case is a fixed schema the caller builds once. Add Leg to
   * Trip is not: which existing legs the insertion pushes later depends on the
   * pick-up time the driver is still typing, so the field set has to be rebuilt
   * as they type, and the proposed times that follow have to be written back
   * into the answers.
   *
   * ⚠️ One prop with two halves rather than two props, because passing only one
   * of them produces a form that either renders fields nobody filled or fills
   * fields nobody renders.
   */
  /**
   * The leg to show the context block against, when the case has no picker.
   *
   * ⛔⛔ **Two forms were filing against a trip and showing nothing about it.**
   * Rider Declined and Add Leg are both opened FROM a ride and pass their
   * `legId` straight to `submitForm`, so neither carries a `leg-picker` — and
   * the banner was mounted under the picker, which meant no picker, no block.
   * A reviewer opening either one saw "Which legs did the member decline?" with
   * no trip on screen at all. (User direction, 2026-10-14.)
   *
   * ⚠️ A leg ID, not an option: the sheet already resolves one through
   * `findLegOption`, and two resolvers are two chances to show a different leg
   * from the one the request is filed against.
   */
  contextLegId?: string;
  recompute?: {
    /** Rebuild the case from the current answers. */
    case: (values: Record<string, string>) => SupportCaseDefinition;
    /**
     * Values that FOLLOW from the answers, plus the key that decides when to
     * rewrite them.
     *
     * ⛔⛔ The key must not change when the patch is applied, or the effect
     * below writes, re-keys and writes again — forever. It is built from the
     * driver's own inputs and the patch touches only derived fields, so the two
     * sets are disjoint by construction. A check pins that.
     */
    derive: (values: Record<string, string>) => {
      key: string;
      patch: Record<string, string>;
    };
  };
}) {
  const blank = () => ({
    ...emptyValues(supportCase.fields),
    ...(initialValues ?? {}),
  });
  const [values, setValues] = useState<Record<string, string>>(blank);

  /**
   * Fields whose current value came from the app, not the driver.
   *
   * `lockWhenPrefilled` has to mean "we already know this", not "this has a
   * value" — otherwise picking a member from the search would lock the driver out
   * of changing their mind. Tracked as a set rather than inferred, because the
   * same field can be app-supplied on one leg and empty on the next.
   */
  const suppliedIds = (source: Record<string, string>) =>
    new Set(
      Object.entries(source)
        .filter(([, value]) => value.trim().length > 0)
        .map(([id]) => id)
    );
  const [appSupplied, setAppSupplied] = useState<Set<string>>(() =>
    suppliedIds(initialValues ?? {})
  );

  /**
   * The case as it stands for these answers.
   *
   * ⚠️ Everything below reads `activeCase`, never the `supportCase` prop — the
   * visible fields, the submit gate and the time-order warnings all have to
   * agree about which fields exist, and a mix of the two would warn about a
   * field that is no longer rendered.
   */
  const activeCase = recompute ? recompute.case(values) : supportCase;

  const derived = recompute?.derive(values);
  useEffect(() => {
    if (!derived) return;
    setValues((previous) => {
      // ⛔ Only write when something actually differs. An unconditional
      // `setValues` on every render is a re-render on every render.
      const changed = Object.entries(derived.patch).some(
        ([id, next]) => (previous[id] ?? "") !== next
      );
      return changed ? { ...previous, ...derived.patch } : previous;
    });
    // Keyed on the driver's own inputs, which the patch never touches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [derived?.key]);

  // The leg the driver picked drives the summary banner and every timestamp we
  // can fill. Re-derive on change rather than only at mount.
  //
  // Read from whichever leg picker is currently VISIBLE rather than a fixed field
  // id, because more than one issue owns a leg picker now and each needs its own
  // (one locked to the ride it came from, one freely re-pickable).
  const legField = activeCase.fields.find(
    (field) => field.type === "leg-picker" && isFieldVisible(field, values)
  );
  const legValue = legField ? (values[legField.id] ?? "") : "";
  const selectedLeg = legValue ? findLegOption(legValue) : undefined;
  /**
   * The leg the block is drawn for, and where it is drawn.
   *
   * ⛔ The picker's own selection always wins — a case that has one is a case
   * where the driver can change which leg this is about, and a `contextLegId`
   * passed alongside would freeze the block on the leg they started from.
   */
  const bannerLeg = selectedLeg ?? (contextLegId ? findLegOption(contextLegId) : undefined);

  useEffect(() => {
    if (!selectedLeg) return;
    const fromLeg = deriveFromLeg(activeCase, selectedLeg.trip, selectedLeg.leg);
    setValues((previous) => ({ ...previous, ...fromLeg }));
    // A timestamp the newly picked leg has is app-supplied; one it doesn't have
    // stops being, so the driver can fill it in.
    setAppSupplied((previous) => {
      const next = new Set(previous);
      for (const [id, value] of Object.entries(fromLeg)) {
        if (value.trim()) next.add(id);
        else next.delete(id);
      }
      return next;
    });
    // Keyed on the leg id so this runs once per selection, not every render.
  }, [selectedLeg?.legId]);

  /**
   * ⛔ One constant, for every case. See the anatomy note above — the heading
   * is not a place to say which form this is, because the first field already
   * does and the two could disagree.
   */
  const title = SUPPORT_FORM_TITLE;

  const visibleFields = activeCase.fields.filter((field) =>
    isFieldVisible(field, values)
  );

  /**
   * The one field the context block follows.
   *
   * ⛔⛔ Exactly one id, never a predicate evaluated per row. A predicate like
   * *"a picker, or the first field when there is no picker"* is two rules that
   * agree only as long as nobody adds a second picker — and the failure is the
   * block rendered twice, one of them against the wrong leg.
   */
  const bannerAfterId =
    visibleFields.find((field) => field.type === "leg-picker")?.id ??
    visibleFields[0]?.id;

  /**
   * Cautions about the times entered, keyed by field.
   *
   * Computed here because a warning depends on the whole set of values and the
   * sheet is the only thing holding them. Deliberately kept out of
   * `canSubmitCase` below — the driver was on the trip and we were not, so a
   * time that looks impossible to us is a question, not a rejection.
   *
   * The sequence comes from the case, since which fields are ordered is a
   * property of what is being collected, not of the sheet.
   */
  const warnings = getTimeOrderWarnings(
    activeCase.fields,
    values,
    activeCase.timeSequence ?? []
  );
  // Per `s-02a`, the primary action sits disabled (muted green) until every
  // required field has a value — and stays disabled for an issue whose field set
  // isn't built, since there is nothing to send.
  //
  // ⛔ AND the diff gate, for the one case that opens with every answer already
  // filled in. `canSubmitCase` cannot see a baseline and must not — it is shared
  // by every case, and only this one has something to compare against.
  const canSubmit =
    canSubmitCase(activeCase.fields, values) &&
    hasRequiredChange(
      activeCase.requireChangedFrom,
      values,
      initialValues ?? {}
    );

  function setValue(id: string, value: string) {
    setValues((previous) => ({ ...previous, [id]: value }));
    // The driver touched it, so it is theirs now.
    setAppSupplied((previous) => {
      if (!previous.has(id)) return previous;
      const next = new Set(previous);
      next.delete(id);
      return next;
    });
  }

  function reset() {
    setValues(blank());
    setAppSupplied(suppliedIds(initialValues ?? {}));
  }

  /**
   * Every route out of the sheet lands here, including twice for one tap: Cancel
   * and the X call it directly, and the Drawer reports the same close through its
   * own `onOpenChange`. Safe, because closing and resetting are both idempotent.
   */
  function handleClose() {
    onOpenChange(false);
    reset();
  }

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit(values);
    reset();
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (next) onOpenChange(true);
        else handleClose();
      }}
    >
      <DrawerContent className="flex max-h-[92vh] flex-col rounded-t-3xl border-0 px-6 pb-8">
        {/* Header and footer stay put; only the fields scroll. A long form must
            never push its Submit button off screen. */}
        <div className="mx-auto flex w-full min-h-0 max-w-md flex-col">
          <div className="flex flex-shrink-0 items-start justify-between pt-2">
            <DrawerTitle className="text-2xl font-bold text-gray-900">
              {title}
            </DrawerTitle>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              className="-mr-2 -mt-1 p-2 text-gray-400"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="mt-5 min-h-0 flex-1 space-y-6 overflow-y-auto pb-2">
            {visibleFields.map((field) => (
              <div key={field.id} className="space-y-3">
                <SupportFieldRenderer
                  field={field}
                  value={values[field.id] ?? ""}
                  locked={
                    Boolean(field.lockWhenPrefilled) &&
                    appSupplied.has(field.id)
                  }
                  // ⚠️ The computed time-order warning first, then one the
                  // case raised itself. Two cautions on one field would stack
                  // into noise, and the time-order one is the more specific.
                  warning={warnings[field.id] ?? field.warning}
                  onChange={(value) => setValue(field.id, value)}
                  values={values}
                  setValue={setValue}
                />
                {/*
                  The summary sits directly under the picker that produced it —
                  or, on a case with no picker, under the first field, which is
                  always the issue type. ⛔ `bannerAfterId` is computed once from
                  the visible fields rather than tested per row, so exactly one
                  row can ever match and the block cannot render twice.
                */}
                {field.id === bannerAfterId && bannerLeg && (
                  <TripSummaryBanner option={bannerLeg} />
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 grid flex-shrink-0 grid-cols-[1fr_1.4fr] gap-4 border-t border-gray-100 pt-5">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="h-14 rounded-xl border-gray-300 text-base font-bold text-gray-900"
            >
              {activeCase.cancelLabel ?? "Cancel"}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="h-14 rounded-xl bg-[#10B981] text-base font-bold text-white hover:bg-[#059669] disabled:bg-[#6EE7B7] disabled:opacity-100"
            >
              {activeCase.submitLabel}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
