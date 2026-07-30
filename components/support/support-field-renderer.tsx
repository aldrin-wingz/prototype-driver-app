"use client";

import { useState } from "react";
import { Paperclip, Search, Check } from "lucide-react";
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
import { getLegStatusLabel } from "@/lib/driver-data/mock-trips";
import { searchLegOptions } from "@/lib/support-data/leg-options";
import type { SupportField } from "@/types/support";

/**
 * Searchable picker over the driver's own legs.
 *
 * A plain text box asking for a leg id is the worst part of the web form — the
 * driver has to go find the number. Here they search by rider, date or leg id and
 * pick from their own rides, and the selection drives every downstream prefill.
 */
function LegPicker({
  field,
  value,
  onChange,
}: {
  field: SupportField;
  value: string;
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const results = searchLegOptions(query).slice(0, 6);
  const selected = value ? searchLegOptions(value)[0] : undefined;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          id={field.id}
          value={open ? query : (selected ? `${selected.leg.legCode ?? ""} · ${selected.legId}` : "")}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={field.placeholder}
          className="h-14 rounded-xl border-gray-200 pl-11 pr-4 text-base placeholder:text-gray-400"
        />
      </div>

      {open && (
        <div className="max-h-60 space-y-1 overflow-y-auto rounded-xl border border-gray-200 p-1">
          {results.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-gray-500">
              No rides match that search.
            </p>
          )}
          {results.map((option) => (
            <button
              key={option.legId}
              type="button"
              onClick={() => {
                onChange(option.legId);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left",
                option.legId === value ? "bg-[#F0FDF9]" : "bg-white"
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-gray-900">
                  {option.leg.legCode ? `${option.leg.legCode} Leg · ` : ""}
                  {option.legId}
                </span>
                <span className="block text-xs text-gray-500">
                  {option.trip.rider} · {option.trip.date} · {option.leg.time} ·{" "}
                  {getLegStatusLabel(option.leg)}
                </span>
              </span>
              {option.legId === value && (
                <Check className="h-4 w-4 flex-shrink-0 text-[#00B090]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Renders one support-form field from its definition.
 *
 * Label conventions come from reference screenshot `s-02a`:
 *   required → red asterisk after the label ("Reason *")
 *   optional → the word is in the label itself ("Comments (optional)")
 *
 * `locked` is passed in rather than read off the field, because whether a value is
 * already known depends on the leg the driver just selected.
 */
export function SupportFieldRenderer({
  field,
  value,
  locked = false,
  onChange,
}: {
  field: SupportField;
  value: string;
  locked?: boolean;
  onChange: (value: string) => void;
}) {
  const isLocked = locked && Boolean(value);

  return (
    <div className="space-y-2">
      <label
        htmlFor={field.id}
        className="flex flex-wrap items-center gap-2 text-base font-medium text-gray-900"
      >
        <span>
          {field.label}
          {field.required && <span className="ml-0.5 text-[#EF4444]">*</span>}
        </span>
        {isLocked && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-500">
            Already recorded
          </span>
        )}
      </label>

      {field.type === "leg-picker" && (
        <LegPicker field={field} value={value} onChange={onChange} />
      )}

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
            onChange={(event) => onChange(event.target.files?.[0]?.name ?? "")}
          />
        </label>
      )}

      {field.helpText && !isLocked && (
        <p className="text-sm text-gray-500">{field.helpText}</p>
      )}
    </div>
  );
}
