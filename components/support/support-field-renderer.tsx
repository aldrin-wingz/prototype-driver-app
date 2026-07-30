"use client";

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
  return (
    <div className="space-y-2">
      <label
        htmlFor={field.id}
        className="block text-base font-medium text-gray-900"
      >
        {field.label}
        {field.required && <span className="ml-0.5 text-[#EF4444]">*</span>}
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

      {(field.type === "text" || field.type === "time") && (
        <Input
          id={field.id}
          type={field.type === "time" ? "time" : "text"}
          value={value}
          maxLength={field.maxLength}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
          className="h-14 rounded-xl border-gray-200 px-4 text-base placeholder:text-gray-400"
        />
      )}

      {field.helpText && (
        <p className="text-sm text-gray-500">{field.helpText}</p>
      )}
    </div>
  );
}
