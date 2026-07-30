"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  FilePlus2,
  FileText,
  Hourglass,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { SupportFormSheet } from "./support-form-sheet";
import { buildSupportFormCase } from "@/lib/support-data/case-registry";
import { findLegOption } from "@/lib/support-data/leg-options";
import { resolveTripContext } from "@/lib/support/trip-context";
import {
  useRideFlow,
  type SupportFormRecord,
} from "@/lib/support-data/ride-flow-context";
import { DRIVER_NAVY } from "@/constants/driver-app-colors";

/** The record being edited, or `"new"` for a blank form. */
type SheetTarget = SupportFormRecord | "new" | null;

/**
 * Which field carries the driver's own words, per issue.
 *
 * Used for the one-line preview on a list row. Reading the first non-empty one
 * beats guessing, and beats showing a row with nothing but a label on it.
 */
const PREVIEW_FIELDS = [
  "generalDetails",
  "paymentDetails",
  "reason",
  "comments",
  "tripRequestNotes",
  // Last resort: a Trip Request with no notes is still identifiable by who it
  // names, which is the only field it actually requires.
  "member",
];

function previewOf(record: SupportFormRecord): string | undefined {
  for (const id of PREVIEW_FIELDS) {
    const value = record.values[id]?.trim();
    if (value) return value;
  }
  return undefined;
}

/** The trip a form names, if it names one. */
function tripLabelOf(record: SupportFormRecord): string | undefined {
  if (!record.legId) return record.tripId ? `Trip #${record.tripId}` : undefined;
  const option = findLegOption(record.legId);
  if (!option) return `Leg ${record.legId}`;
  const letter = option.leg.legCode ? `${option.leg.legCode} · ` : "";
  return `${letter}${option.legId} · ${option.trip.rider}`;
}

function FormRow({
  record,
  onOpen,
  onDelete,
}: {
  record: SupportFormRecord;
  onOpen: () => void;
  onDelete?: () => void;
}) {
  const trip = tripLabelOf(record);
  const preview = previewOf(record);
  const isDraft = record.state === "draft";

  return (
    <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-white">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-3 p-4 text-left"
      >
        {isDraft ? (
          <FileText className="h-5 w-5 flex-shrink-0 text-gray-400" />
        ) : (
          <Hourglass className="h-5 w-5 flex-shrink-0 text-[#D97706]" />
        )}
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-base font-semibold text-gray-900">
              {record.issueLabel}
            </span>
            <span
              className={cn(
                "flex-shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                isDraft
                  ? "bg-gray-100 text-gray-600"
                  : "bg-[#FEF3C7] text-[#92400E]"
              )}
            >
              {isDraft ? "Draft" : "Waiting on Support"}
            </span>
          </span>
          {trip && (
            <span className="mt-0.5 block truncate text-sm text-gray-500">
              {trip}
            </span>
          )}
          {preview && (
            <span className="mt-0.5 block truncate text-sm text-gray-400">
              {preview}
            </span>
          )}
        </span>
        <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-300" />
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${record.issueLabel} draft`}
          className="mr-2 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-gray-400"
        >
          <Trash2 className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

type TabValue = "drafts" | "pending";

/**
 * Read-only view of a submitted form.
 *
 * Deliberately low fidelity: there is no Support-side surface in scope, so this
 * shows what was sent and says who has it. Nothing here is editable — once it is
 * Support's, the driver changing it silently would be the wrong model.
 */
function SubmittedFormSheet({
  record,
  onOpenChange,
}: {
  record: SupportFormRecord;
  onOpenChange: (open: boolean) => void;
}) {
  const supportCase = buildSupportFormCase();
  const trip = tripLabelOf(record);
  // Repeater rows live under flattened `${id}.${index}.${rowField}` keys, so they
  // need expanding here or a Trip Request's legs would show as nothing at all.
  const rows = supportCase.fields
    .filter((field) => field.type !== "notice" && field.id !== "issue")
    .flatMap((field) => {
      if (field.type !== "leg-repeater") {
        return [{ label: field.label, value: record.values[field.id] }];
      }
      return Object.entries(record.values)
        .filter(([key]) => key.startsWith(`${field.id}.`))
        .map(([key, value]) => {
          const [, index, rowFieldId] = key.split(".");
          const rowField = field.rowFields?.find((f) => f.id === rowFieldId);
          return {
            label: `${field.rowLabel ?? "Row"} ${Number(index) + 1} · ${
              rowField?.label ?? rowFieldId
            }`,
            value,
          };
        });
    })
    .filter((row) => row.value?.trim());

  return (
    <Drawer open onOpenChange={onOpenChange}>
      <DrawerContent className="flex max-h-[85vh] flex-col rounded-t-3xl border-0 px-6 pb-8">
        <div className="mx-auto flex w-full min-h-0 max-w-md flex-col">
          <div className="flex flex-shrink-0 items-start justify-between pt-2">
            <DrawerTitle className="text-2xl font-bold text-gray-900">
              {record.issueLabel}
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

          <div className="mt-5 flex flex-shrink-0 items-start gap-3 rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3.5">
            <Hourglass className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#D97706]" />
            <div className="min-w-0">
              <p className="text-base font-semibold text-gray-900">
                Waiting on Support
              </p>
              <p className="text-sm text-gray-600">
                Sent {record.updatedAt.toLowerCase()}. Support will follow up —
                nothing more is needed from you.
              </p>
            </div>
          </div>

          <div className="mt-6 min-h-0 flex-1 overflow-y-auto">
            {trip && (
              <div className="flex justify-between gap-4 border-b border-gray-100 py-2.5">
                <span className="text-sm text-gray-500">Trip</span>
                <span className="text-right text-sm font-medium text-gray-900">
                  {trip}
                </span>
              </div>
            )}
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex justify-between gap-4 border-b border-gray-100 py-2.5"
              >
                <span className="flex-shrink-0 text-sm text-gray-500">
                  {row.label}
                </span>
                <span className="text-right text-sm font-medium text-gray-900">
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

/**
 * Support Requests — the menu behind the header's clipboard icon.
 *
 * The point of this screen is that a support request does not have to be about a
 * trip. Everything reachable before it was gated behind opening a ride, so a
 * payment or general question had nowhere to go, and a half-filled form was lost
 * the moment the sheet closed.
 *
 * Follows the pushed-page pattern of `more-options-screen.tsx`: back chevron plus
 * centred title, no bottom nav.
 */
export function FormsInboxScreen() {
  const router = useRouter();
  const { toast } = useToast();
  const { drafts, pendingForms, saveDraft, submitForm, deleteForm } =
    useRideFlow();

  const [target, setTarget] = useState<SheetTarget>(null);
  const [viewing, setViewing] = useState<SupportFormRecord | null>(null);
  const [activeTab, setActiveTab] = useState<TabValue>("drafts");

  const editing = target === "new" ? undefined : target ?? undefined;
  const supportCase = buildSupportFormCase();

  // Same tab treatment as My Rides — two lists of forms are the same kind of
  // thing as two lists of rides, so they should read the same way.
  const tabs: Array<{ value: TabValue; label: string; count: number }> = [
    { value: "drafts", label: "Drafts", count: drafts.length },
    { value: "pending", label: "Pending Review", count: pendingForms.length },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-20 flex items-center bg-white px-4 py-4">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Back"
          className="text-gray-900"
        >
          <ChevronLeft className="h-7 w-7" />
        </button>
        <h1 className="flex-1 pr-7 text-center text-xl font-bold text-gray-900">
          Support Requests
        </h1>
      </header>

      {/* Tab row, replicated from `app/my-rides/page.tsx`. */}
      <div className="flex border-b border-gray-200 bg-white">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={cn(
              "relative flex-1 px-2 py-3 text-[13px] font-medium leading-tight transition-colors",
              activeTab === tab.value ? "text-gray-900" : "text-gray-500"
            )}
          >
            <span className="flex items-center justify-center gap-1">
              {tab.label}
              <sup
                className={cn(
                  "text-[10px]",
                  activeTab === tab.value ? "text-red-500" : "text-gray-400"
                )}
              >
                {tab.count}
              </sup>
            </span>
            {activeTab === tab.value && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#10B981]" />
            )}
          </button>
        ))}
      </div>

      <main className="flex-1 space-y-2 p-4">
        {activeTab === "drafts" &&
          (drafts.length === 0 ? (
            <p className="py-12 text-center text-gray-500">
              Nothing saved. A form you leave part-way through lands here.
            </p>
          ) : (
            drafts.map((record) => (
              <FormRow
                key={record.id}
                record={record}
                onOpen={() => setTarget(record)}
                onDelete={() => {
                  deleteForm(record.id);
                  toast({ title: "Draft deleted" });
                }}
              />
            ))
          ))}

        {activeTab === "pending" &&
          (pendingForms.length === 0 ? (
            <p className="py-12 text-center text-gray-500">
              Nothing with Support right now.
            </p>
          ) : (
            pendingForms.map((record) => (
              <FormRow
                key={record.id}
                record={record}
                onOpen={() => setViewing(record)}
              />
            ))
          ))}
      </main>

      {/* Pinned to the bottom, where the bottom nav sits on the tabbed screens —
          the list is what the driver came to read, and the action stays in reach
          however long that list gets. */}
      <div className="sticky bottom-0 border-t border-gray-100 bg-white px-4 pb-6 pt-4">
        <Button
          type="button"
          onClick={() => setTarget("new")}
          className="h-14 w-full gap-2 rounded-xl text-base font-bold text-white"
          style={{ backgroundColor: DRIVER_NAVY }}
        >
          <FilePlus2 className="h-5 w-5" />
          Submit a new form
        </Button>
      </div>

      {target && (
        <SupportFormSheet
          supportCase={supportCase}
          open
          initialValues={editing?.values}
          onOpenChange={(next) => {
            if (!next) setTarget(null);
          }}
          onSaveDraft={(values) => {
            saveDraft({
              id: editing?.id,
              caseId: supportCase.id,
              issue: values.issue ?? "",
              ...resolveTripContext(supportCase, values),
              values,
            });
            setTarget(null);
            // Land the driver on the tab the form just moved to, so the toast is
            // not the only evidence of where it went.
            setActiveTab("drafts");
            toast({
              title: "Saved to drafts",
              description: "Pick it back up from Support Requests whenever.",
            });
          }}
          onSubmit={(values) => {
            submitForm({
              // Reuses the draft's id, so submitting converts it rather than
              // leaving a stale copy behind in Drafts.
              id: editing?.id,
              caseId: supportCase.id,
              issue: values.issue ?? "",
              ...resolveTripContext(supportCase, values),
              values,
            });
            setTarget(null);
            setActiveTab("pending");
            toast({
              title: supportCase.successMessage ?? "Sent to Support",
              description: "It's in Pending review while Support looks at it.",
            });
          }}
        />
      )}

      {viewing && (
        <SubmittedFormSheet
          record={viewing}
          onOpenChange={(next) => {
            if (!next) setViewing(null);
          }}
        />
      )}
    </div>
  );
}
