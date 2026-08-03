"use client";

import { useEffect, useRef, useState } from "react";
import { Paperclip, Search, Check, Trash2, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SignaturePad } from "@/components/ui/signature-pad";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getLegStatusLabel } from "@/lib/driver-data/mock-trips";
import { findLegOption, searchLegOptions } from "@/lib/support-data/leg-options";
import {
  findMemberOption,
  searchMemberOptions,
} from "@/lib/support-data/member-options";
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
  locked,
  onChange,
}: {
  field: SupportField;
  value: string;
  locked: boolean;
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  // Search is scoped — a missed swipe only applies to a trip that is under way —
  // but the selected leg is looked up unscoped, so a draft filed against a ride
  // that has since moved on still displays what it names.
  const results = searchLegOptions(query, field.legScope).slice(0, 6);
  const selected = value ? findLegOption(value) : undefined;

  // Some flows are about one specific ride and nothing else — a no-show filed from
  // a ride must stay filed against that ride. Show it as settled context, the same
  // as a locked member.
  if (locked && selected) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5">
        <p className="text-base font-semibold text-gray-900">
          {selected.leg.legCode ? `${selected.leg.legCode} Leg · ` : ""}
          {selected.legId}
        </p>
        <p className="text-sm text-gray-500">
          {selected.trip.rider} · {selected.trip.date} · {selected.leg.time}
        </p>
      </div>
    );
  }

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
 * Searchable picker over members the driver has driven in the last 30 days.
 *
 * Same interaction as `LegPicker`, over a different subject. When the form is
 * opened from a ride the member is already known, so the search box is replaced
 * by a locked row — there is nothing to look up.
 */
function MemberPicker({
  field,
  value,
  locked,
  onChange,
}: {
  field: SupportField;
  value: string;
  locked: boolean;
  onChange: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const results = searchMemberOptions(query).slice(0, 6);
  const selected = value ? findMemberOption(value) : undefined;

  if (locked && selected) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5">
        <p className="text-base font-semibold text-gray-900">{selected.name}</p>
        <p className="text-sm text-gray-500">
          {selected.client}
          {selected.tripCount > 0 &&
            ` · ${selected.tripCount} trip${selected.tripCount === 1 ? "" : "s"} in the last 30 days`}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          id={field.id}
          value={open ? query : (selected?.name ?? "")}
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
              No members you've driven in the last 30 days match that.
            </p>
          )}
          {results.map((option) => (
            <button
              key={option.name}
              type="button"
              onClick={() => {
                onChange(option.name);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left",
                option.name === value ? "bg-[#F0FDF9]" : "bg-white"
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-gray-900">
                  {option.name}
                </span>
                <span className="block text-xs text-gray-500">
                  {option.client} · last trip {option.lastTripDate} ·{" "}
                  {option.tripCount} trip{option.tripCount === 1 ? "" : "s"}
                </span>
              </span>
              {option.name === value && (
                <Check className="h-4 w-4 flex-shrink-0 text-[#00B090]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** The stored value of a drawn signature. Shown as-is in the submitted-form view. */
const SIGNED = "Signed";

/**
 * Draw-to-sign field.
 *
 * A signature has to be drawn in THIS session, so a stored value with a blank pad
 * is cleared on mount. Otherwise reopening a draft would leave Submit enabled with
 * no signature visible anywhere — the one field where trusting saved state would
 * let a driver submit an attestation they never made.
 */
function SignatureField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const cleared = useRef(false);

  useEffect(() => {
    if (cleared.current) return;
    cleared.current = true;
    if (value) onChange("");
    // Mount only — a later value is one the driver just drew.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SignaturePad onSignedChange={(signed) => onChange(signed ? SIGNED : "")} />
  );
}

/** Row count for a repeater, clamped so a typo can't render 900 rows. */
const MAX_REPEATER_ROWS = 8;

function clampRowCount(raw: string | undefined, max: number): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  if (Number.isNaN(parsed)) return 1;
  return Math.min(Math.max(parsed, 1), max);
}

/** A number with − / + buttons — easier on a phone than a bare numeric keypad. */
function Stepper({
  field,
  value,
  onChange,
}: {
  field: SupportField;
  value: string;
  onChange: (value: string) => void;
}) {
  const min = field.min ?? 0;
  const max = field.max ?? 99;
  const current = Number.parseInt(value, 10);
  const safe = Number.isNaN(current) ? min : current;

  const step = (delta: number) =>
    onChange(String(Math.min(Math.max(safe + delta, min), max)));

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => step(-1)}
        disabled={safe <= min}
        aria-label={`Decrease ${field.label}`}
        className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-700 disabled:opacity-40"
      >
        <Minus className="h-5 w-5" />
      </button>
      <Input
        id={field.id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-14 flex-1 rounded-xl border-gray-200 px-4 text-center text-base"
      />
      <button
        type="button"
        onClick={() => step(1)}
        disabled={safe >= max}
        aria-label={`Increase ${field.label}`}
        className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-700 disabled:opacity-40"
      >
        <Plus className="h-5 w-5" />
      </button>
    </div>
  );
}

/**
 * A repeating row group — the runtime's one composite field.
 *
 * Reads and writes the whole values map rather than a single value, because a row
 * owns several cells.
 *
 * The row count lives in ONE key — `rowCountFrom` when the case names a field for
 * it, otherwise the repeater's own `${id}Count`. That is the point: the stepper
 * above and the Add / remove controls here write the same value, so the number the
 * driver reads and the rows they see can never disagree.
 */
function LegRepeater({
  field,
  values,
  setValue,
}: {
  field: SupportField;
  values: Record<string, string>;
  setValue: (id: string, value: string) => void;
}) {
  const countKey = field.rowCountFrom ?? `${field.id}Count`;
  const maxRows = field.max ?? MAX_REPEATER_ROWS;
  const rowCount = clampRowCount(values[countKey], maxRows);
  const rowFields = field.rowFields ?? [];
  const rowLabel = field.rowLabel ?? "Row";

  function removeRow(index: number) {
    // Shift every later row down a slot so the values stay contiguous with the
    // indexes the renderer reads.
    for (let slot = index; slot < rowCount - 1; slot += 1) {
      for (const rowField of rowFields) {
        setValue(
          `${field.id}.${slot}.${rowField.id}`,
          values[`${field.id}.${slot + 1}.${rowField.id}`] ?? ""
        );
      }
    }
    for (const rowField of rowFields) {
      setValue(`${field.id}.${rowCount - 1}.${rowField.id}`, "");
    }
    setValue(countKey, String(Math.max(rowCount - 1, 1)));
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: rowCount }, (_, index) => (
        <div
          key={index}
          className="space-y-3 rounded-xl border border-gray-200 p-4"
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">
              {rowLabel} {index + 1}
            </p>
            {rowCount > 1 && (
              <button
                type="button"
                onClick={() => removeRow(index)}
                aria-label={`Remove ${rowLabel.toLowerCase()} ${index + 1}`}
                className="-mr-2 p-2 text-gray-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
          {rowFields.map((rowField) => {
            const key = `${field.id}.${index}.${rowField.id}`;
            return (
              <SupportFieldRenderer
                key={key}
                field={{ ...rowField, id: key }}
                value={values[key] ?? ""}
                onChange={(next) => setValue(key, next)}
              />
            );
          })}
        </div>
      ))}

      <button
        type="button"
        onClick={() => setValue(countKey, String(rowCount + 1))}
        disabled={rowCount >= maxRows}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 py-3.5 text-base font-medium text-gray-600 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
        {field.addRowLabel ?? "Add another"}
      </button>
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
  values,
  setValue,
}: {
  field: SupportField;
  value: string;
  locked?: boolean;
  onChange: (value: string) => void;
  /**
   * The whole form's values, for composite types only.
   *
   * A repeater owns several cells per row, so a single `value`/`onChange` pair
   * can't express it. Every other field ignores these.
   */
  values?: Record<string, string>;
  setValue?: (id: string, value: string) => void;
}) {
  const isLocked = locked && Boolean(value);

  // Not an input at all — a standing-in block where a field set would go. Uses
  // the project's locked flag wording, so nobody reads it as "broken".
  if (field.type === "notice") {
    return (
      <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] px-4 py-3.5">
        {/* The flag wording is the project's locked legend text, so it carries its
            own ⚠️ — no second icon beside it. */}
        <p className="text-base font-semibold text-gray-900">
          ⚠️ Not in prototype yet
        </p>
        {field.helpText && (
          <p className="mt-0.5 text-sm text-gray-600">{field.helpText}</p>
        )}
      </div>
    );
  }

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
        {/* `undefined` takes the default; an explicit `null` opts out. Without
            the distinction, dropping a field's badge silently falls back to
            "Already recorded" — which is wrong on anything but a timestamp. */}
        {isLocked && field.lockedBadge !== null && (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-normal text-gray-500">
            {field.lockedBadge ?? "Already recorded"}
          </span>
        )}
      </label>

      {field.type === "leg-picker" && (
        <LegPicker
          field={field}
          value={value}
          locked={isLocked}
          onChange={onChange}
        />
      )}

      {field.type === "member-picker" && (
        <MemberPicker
          field={field}
          value={value}
          locked={isLocked}
          onChange={onChange}
        />
      )}

      {field.type === "stepper" && (
        <Stepper field={field} value={value} onChange={onChange} />
      )}

      {field.type === "signature" && (
        <SignatureField value={value} onChange={onChange} />
      )}

      {field.type === "leg-repeater" && values && setValue && (
        <LegRepeater field={field} values={values} setValue={setValue} />
      )}

      {/* A locked select becomes a static row rather than a disabled dropdown —
          same treatment as the locked member picker. A greyed-out control invites
          a tap and then refuses it; a plain row reads as settled context, which is
          what an issue the flow already chose actually is. */}
      {field.type === "select" &&
        (isLocked ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5">
            <p className="text-base font-semibold text-gray-900">
              {field.options?.find((option) => option.value === value)?.label ??
                value}
            </p>
          </div>
        ) : (
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
        ))}

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
        field.type === "datetime" ||
        field.type === "number") && (
        <Input
          id={field.id}
          type={
            field.type === "text"
              ? "text"
              : field.type === "number"
                ? "number"
                : field.type === "datetime"
                  ? // Date and time in one control. The repo's own DatePicker is a
                    // Popover + Calendar, which would cost two taps per leg row —
                    // the native control is the right fidelity here, and the
                    // upgrade path if this ships.
                    "datetime-local"
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

      {/* Says outright that the asterisk above is real but unenforced here, using
          the project's locked flag wording — otherwise a required field that lets
          you submit without it reads as a bug in the gate. */}
      {field.requiredNotEnforced && (
        <p className="text-sm text-[#B45309]">
          ⚠️ Required in the real flow — not enforced in the prototype
        </p>
      )}
    </div>
  );
}
