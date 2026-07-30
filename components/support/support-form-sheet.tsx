"use client";

import { useEffect, useState } from "react";
import { X, Clock, AlertTriangle, Info } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SupportFieldRenderer } from "./support-field-renderer";
import { TripSummaryBanner } from "./trip-summary-banner";
import { findLegOption } from "@/lib/support-data/leg-options";
import { deriveFromLeg } from "@/lib/support/prefill";
import {
  areRequiredFieldsFilled,
  emptyValues,
  isFieldVisible,
} from "@/lib/support/build-zod-schema";
import type {
  SupportCallout,
  SupportCalloutTone,
  SupportCaseDefinition,
} from "@/types/support";

const CALLOUT_TONE: Record<
  SupportCalloutTone,
  { bg: string; border: string; icon: string; Icon: typeof Clock }
> = {
  danger: {
    bg: "bg-[#FEF2F2]",
    border: "border-[#FECACA]",
    icon: "text-[#EF4444]",
    Icon: Clock,
  },
  warning: {
    bg: "bg-[#FFFBEB]",
    border: "border-[#FDE68A]",
    icon: "text-[#D97706]",
    Icon: AlertTriangle,
  },
  info: {
    bg: "bg-[#EFF6FF]",
    border: "border-[#BFDBFE]",
    icon: "text-[#2563EB]",
    Icon: Info,
  },
};

/**
 * The base support-form sheet, replicating reference screenshot `s-02a`
 * ("Late pickup reason"). Every support case renders through this — the sheet is
 * the pattern, the case is the data.
 *
 * Anatomy, top to bottom: drag handle · title + close · context callout ·
 * fields · Cancel / primary action.
 */
export function SupportFormSheet({
  supportCase,
  callout,
  initialValues,
  open,
  onOpenChange,
  onSubmit,
}: {
  supportCase: SupportCaseDefinition;
  callout?: SupportCallout;
  /** Values the app already knows, so the driver only supplies what is new. */
  initialValues?: Record<string, string>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: Record<string, string>) => void;
}) {
  const blank = () => ({
    ...emptyValues(supportCase.fields),
    ...(initialValues ?? {}),
  });
  const [values, setValues] = useState<Record<string, string>>(blank);

  // The leg the driver picked drives the summary banner and every timestamp we
  // can fill. Re-derive on change rather than only at mount.
  const selectedLeg = values.legId ? findLegOption(values.legId) : undefined;

  useEffect(() => {
    if (!selectedLeg) return;
    const derived = deriveFromLeg(supportCase, selectedLeg.trip, selectedLeg.leg);
    setValues((previous) => ({ ...previous, ...derived }));
    // Keyed on the leg id so this runs once per selection, not every render.
  }, [selectedLeg?.legId]);

  const visibleFields = supportCase.fields.filter((field) =>
    isFieldVisible(field, values)
  );
  // Per `s-02a`, the primary action sits disabled (muted green) until every
  // required field has a value.
  const canSubmit = areRequiredFieldsFilled(supportCase.fields, values);

  function setValue(id: string, value: string) {
    setValues((previous) => ({ ...previous, [id]: value }));
  }

  function handleClose() {
    onOpenChange(false);
    setValues(blank());
  }

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit(values);
    setValues(blank());
  }

  const tone = callout ? CALLOUT_TONE[callout.tone] : null;
  const CalloutIcon = tone?.Icon;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="flex max-h-[92vh] flex-col rounded-t-3xl border-0 px-6 pb-8">
        {/* Header and footer stay put; only the fields scroll. A long form must
            never push its Submit button off screen. */}
        <div className="mx-auto flex w-full min-h-0 max-w-md flex-col">
          <div className="flex flex-shrink-0 items-start justify-between pt-2">
            <DrawerTitle className="text-2xl font-bold text-gray-900">
              {supportCase.title}
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

          {callout && tone && CalloutIcon && (
            <div
              className={cn(
                "mt-5 flex flex-shrink-0 items-start gap-3 rounded-xl border px-4 py-3.5",
                tone.bg,
                tone.border
              )}
            >
              <CalloutIcon
                className={cn("mt-0.5 h-5 w-5 flex-shrink-0", tone.icon)}
              />
              <div className="min-w-0">
                <p className="text-base font-semibold text-gray-900">
                  {callout.title}
                </p>
                {callout.detail && (
                  <p className="text-sm text-gray-600">{callout.detail}</p>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 min-h-0 flex-1 space-y-6 overflow-y-auto pb-2">
            {visibleFields.map((field) => (
              <div key={field.id} className="space-y-3">
                <SupportFieldRenderer
                  field={field}
                  value={values[field.id] ?? ""}
                  locked={Boolean(field.lockWhenPrefilled)}
                  onChange={(value) => setValue(field.id, value)}
                />
                {/* The summary sits directly under the picker that produced it. */}
                {field.type === "leg-picker" && selectedLeg && (
                  <TripSummaryBanner option={selectedLeg} />
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
              {supportCase.cancelLabel ?? "Cancel"}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="h-14 rounded-xl bg-[#10B981] text-base font-bold text-white hover:bg-[#059669] disabled:bg-[#6EE7B7] disabled:opacity-100"
            >
              {supportCase.submitLabel}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
