"use client";

import { X, ChevronRight } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";
import type { SupportCaseDefinition } from "@/types/support";

/**
 * Ride options menu — opened from the `More` control in the Ride Details
 * action row.
 *
 * ⚠️ PROVISIONAL. The real app's menu has not been captured yet, so the ROW SET
 * here is a placeholder: it lists the support cases we know about, not the real
 * action list. The CONTAINER is a bottom sheet on the evidence of reference
 * screenshot `s-02a`, where the app's own form opens as one — the menu and the
 * form belong to the same family. Replace the rows once the menu is captured.
 *
 * Cases that are not built render as disabled rows flagged "Not in prototype
 * yet" rather than being hidden, so the menu shows its real eventual shape
 * without implying behaviour that does not exist.
 */
export function RideOptionsMenu({
  cases,
  open,
  onOpenChange,
  onSelectCase,
}: {
  cases: SupportCaseDefinition[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCase: (caseId: string) => void;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-3xl border-0 px-6 pb-8">
        <div className="mx-auto w-full max-w-md">
          <div className="flex items-start justify-between pt-2">
            <DrawerTitle className="text-2xl font-bold text-gray-900">
              Ride options
            </DrawerTitle>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
              className="-mr-2 -mt-1 p-2 text-gray-400"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="mt-5 space-y-2">
            {cases.map((supportCase) => {
              const isAvailable = supportCase.buildState !== "not-yet";

              return (
                <button
                  key={supportCase.id}
                  type="button"
                  disabled={!isAvailable}
                  onClick={() => onSelectCase(supportCase.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-4 text-left",
                    isAvailable
                      ? "border-gray-200 bg-white"
                      : "border-gray-100 bg-gray-50"
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block text-base font-semibold",
                        isAvailable ? "text-gray-900" : "text-gray-400"
                      )}
                    >
                      {supportCase.title}
                    </span>
                    {supportCase.summary && (
                      <span
                        className={cn(
                          "block text-sm",
                          isAvailable ? "text-gray-500" : "text-gray-400"
                        )}
                      >
                        {supportCase.summary}
                      </span>
                    )}
                    {!isAvailable && (
                      <span className="mt-1 inline-block rounded-full bg-[#FEF3C7] px-2 py-0.5 text-xs font-medium text-[#92400E]">
                        ⚠️ Not in prototype yet
                      </span>
                    )}
                  </span>
                  {isAvailable && (
                    <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-400" />
                  )}
                </button>
              );
            })}
          </div>

          <p className="mt-5 text-center text-xs text-gray-400">
            Placeholder list — awaiting a capture of the real options menu
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
