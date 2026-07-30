"use client";

import { Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SupportField } from "@/types/support";

/**
 * Renders one support-form field from its definition.
 *
 * Label conventions come from reference screenshot `s-02a`:
 *   required → red asterisk after the label ("Reason *")
 *   optional → the word is in the label itself ("Comments (optional)")
 *
 * One switch rather than a file per type — with a handful of types that is
 * easier to read, and splitting it later is mechanical.
 */
export function SupportFieldRenderer({
  field,
  value,
  onChange,
}: {
  field: SupportField;
  value: string;
  onChange: (value: string) => void;
}) {
  // Only lock a field once a prefilled value actually resolved. A locked field
  // with nothing in it would be an unfillable dead end.
  const isLocked = Boolean(field.locked && value);

  return (
    <div className="space-y-2">
      <label
        htmlFor={field.id}
        className="flex items-center gap-2 text-base font-medium text-gray-900"
      >
        <span>
          {field.label}
          {field.required && <span className="ml-0.5 text-[#EF4444]">*</span>}
        </span>
        {isLocked && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-500">
            From this ride
          </span>
        )}
      </label>

      {field.type === "select" && (
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger
            id={field.id}
            className="h-14 rounded-xl border-gray-200 px-4 text-base data-[placeholder]:text-gray-400"
          >
            <SelectValue placeholder={field.placeholder ?? "Select an option"} />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((option) => (
              <SelectItem
                key={option.value}
                value={option.value}
                className="text-base"
              >
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {field.type === "textarea" && (
        <Textarea
          id={field.id}
          value={value}
          maxLength={field.maxLength}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          className="min-h-[132px] resize-none rounded-xl border-gray-200 p-4 text-base placeholder:text-gray-400"
        />
      )}

      {(field.type === "text" ||
        field.type === "time" ||
        field.type === "date" ||
        field.type === "number") && (
        <Input
          id={field.id}
          type={
            field.type === "text"
              ? "text"
              : field.type === "number"
                ? "number"
                : field.type
          }
          value={value}
          maxLength={field.maxLength}
          readOnly={isLocked}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          className={cn(
            "h-14 rounded-xl border-gray-200 px-4 text-base placeholder:text-gray-400",
            // A locked field is context, not an input. Muting it says "we filled
            // this in, you don't need to touch it".
            isLocked && "bg-gray-50 text-gray-600 focus-visible:ring-0"
          )}
        />
      )}

      {field.type === "file" && (
        <label
          htmlFor={field.id}
          className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gray-300 text-center"
        >
          <Paperclip className="h-5 w-5 text-gray-400" />
          <span className="text-sm text-gray-500">
            {value || "Choose a file or drag and drop here"}
          </span>
          <input
            id={field.id}
            type="file"
            className="hidden"
            onChange={(event) =>
              onChange(event.target.files?.[0]?.name ?? "")
            }
          />
        </label>
      )}

      {field.helpText && (
        <p className="text-sm text-gray-500">{field.helpText}</p>
      )}
    </div>
  );
}
