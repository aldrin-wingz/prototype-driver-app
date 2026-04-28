"use client";

import { Download, ExternalLink, Flag, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

interface FieldData {
  label: string;
  value: string;
  colSpan?: 4 | 6 | 12;
}

interface SubmittedFieldsDisplayProps {
  fields: FieldData[];
  /** When true, fields become clickable to toggle selection for requesting changes */
  flagMode?: boolean;
  /** Set of field labels currently selected for requesting changes */
  selectedFields?: Set<string>;
  /** Callback when a field is toggled in change request mode */
  onToggleField?: (label: string) => void;
  /** Set of field labels that already have changes requested */
  flaggedFields?: Set<string>;
  /** When true, text fields become inline-editable */
  editMode?: boolean;
  /** Map of label -> edited value for fields changed by agent */
  editedValues?: Record<string, string>;
  /** Callback when agent changes a field value */
  onFieldChange?: (label: string, value: string) => void;
  /** Set of field labels that were previously edited by agent */
  agentEditedFields?: Set<string>;
}

export function SubmittedFieldsDisplay({
  fields,
  flagMode = false,
  selectedFields,
  onToggleField,
  flaggedFields,
  editMode = false,
  editedValues,
  onFieldChange,
  agentEditedFields,
}: SubmittedFieldsDisplayProps) {
  return (
    <div className="grid grid-cols-12 gap-x-4 gap-y-4">
      {fields.map((field, index) => {
        const isFileField = field.label.toLowerCase().includes("photo") ||
                           field.label.toLowerCase().includes("image") ||
                           field.label.toLowerCase().includes("license") ||
                           field.label.toLowerCase().includes("insurance") ||
                           field.label.toLowerCase().includes("document") ||
                           field.label.toLowerCase().includes("file");

        const isImageUrl = field.value.startsWith("http") || field.value.startsWith("/");
        const colSpan = field.colSpan || 12;
        const colClass =
          colSpan === 4 ? "col-span-12 sm:col-span-4" :
          colSpan === 6 ? "col-span-12 sm:col-span-6" :
          "col-span-12";

        const isSelected = flagMode && selectedFields?.has(field.label);
        const isFlagged = flaggedFields?.has(field.label);
        const isEdited = editMode && editedValues && field.label in editedValues;
        const wasAgentEdited = agentEditedFields?.has(field.label);
        const displayValue = editedValues?.[field.label] ?? field.value;
        const isLongText = field.value.length > 80;
        const isEditableField = !isFileField || !isImageUrl;

        if (editMode && isEditableField) {
          return (
            <div key={index} className={colClass}>
              <div className={cn(
                "flex flex-col gap-1.5 rounded-lg p-2 -m-2 transition-all",
                isEdited && "ring-2 ring-blue-400 bg-blue-50/40 dark:bg-blue-950/15 dark:ring-blue-600"
              )}>
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  {field.label}
                  {isEdited && <Pencil className="h-3 w-3 text-blue-500" />}
                  {wasAgentEdited && !editMode && <Pencil className="h-3 w-3 text-blue-500" />}
                </span>
                {isLongText ? (
                  <textarea
                    value={displayValue}
                    onChange={(e) => onFieldChange?.(field.label, e.target.value)}
                    rows={3}
                    className="rounded-md px-3 py-2.5 border border-blue-300 dark:border-blue-700 bg-background text-sm font-medium text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600"
                  />
                ) : (
                  <input
                    type="text"
                    value={displayValue}
                    onChange={(e) => onFieldChange?.(field.label, e.target.value)}
                    className="rounded-md px-3 py-2.5 border border-blue-300 dark:border-blue-700 bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600"
                  />
                )}
                {isEdited && displayValue !== field.value && (
                  <p className="text-[10px] text-muted-foreground">
                    <span className="line-through">{field.value.length > 60 ? field.value.slice(0, 60) + "..." : field.value}</span>
                  </p>
                )}
              </div>
            </div>
          );
        }

        return (
          <div key={index} className={colClass}>
            <button
              type="button"
              disabled={!flagMode}
              onClick={() => flagMode && onToggleField?.(field.label)}
              className={cn(
                "w-full text-left flex flex-col gap-1.5 rounded-lg p-2 -m-2 transition-all",
                flagMode && "cursor-pointer hover:ring-2 hover:ring-amber-300 dark:hover:ring-amber-700",
                isSelected && "ring-2 ring-amber-400 bg-amber-50/60 dark:bg-amber-950/20 dark:ring-amber-600",
                isFlagged && !flagMode && "ring-2 ring-amber-300 bg-amber-50/40 dark:bg-amber-950/15 dark:ring-amber-700",
                wasAgentEdited && !flagMode && !editMode && "ring-2 ring-blue-200 bg-blue-50/30 dark:bg-blue-950/10 dark:ring-blue-800",
                !flagMode && !isFlagged && !wasAgentEdited && "cursor-default"
              )}
            >
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                {field.label}
                {isSelected && <Flag className="h-3 w-3 text-amber-500" />}
                {isFlagged && !flagMode && <Flag className="h-3 w-3 text-amber-500" />}
                {wasAgentEdited && !flagMode && !editMode && <Pencil className="h-3 w-3 text-blue-500" />}
              </span>

              {isFileField && isImageUrl ? (
                <div className="flex flex-col gap-2">
                  <img
                    src={field.value}
                    alt={field.label}
                    className="w-full max-w-sm max-h-64 rounded-md border border-border object-cover"
                  />
                  <div className="flex items-center gap-3">
                    <a
                      href={field.value}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>View Full Size</span>
                    </a>
                    <a
                      href={field.value}
                      download
                      className="text-xs text-primary hover:underline flex items-center gap-1.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Download className="h-3 w-3" />
                      <span>Download</span>
                    </a>
                  </div>
                </div>
              ) : isFileField && !isImageUrl ? (
                <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2 border border-border">
                  <span className="text-sm font-medium text-foreground">{field.value}</span>
                </div>
              ) : (
                <div className={cn(
                  "rounded-md px-3 py-2.5 border",
                  isSelected
                    ? "bg-amber-50/50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800"
                    : isFlagged && !flagMode
                      ? "bg-amber-50/30 border-amber-200/60 dark:bg-amber-950/10 dark:border-amber-800/40"
                      : wasAgentEdited && !editMode
                        ? "bg-blue-50/30 border-blue-200/60 dark:bg-blue-950/10 dark:border-blue-800/40"
                        : "bg-muted/30 border-border/50"
                )}>
                  <span className="text-sm font-medium text-foreground break-words">{wasAgentEdited && !editMode ? (displayValue || field.value) : field.value}</span>
                </div>
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
