"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  normalizeUsPhoneE164,
  formatUsPhoneForDisplay,
  formatUsPhoneNational,
  getUsPhoneDigits,
} from "@/lib/utils/phone";
import { cn } from "@/lib/utils";

export interface PhoneNumberInputProps
  extends Omit<
    React.ComponentProps<typeof Input>,
    "type" | "value" | "onChange" | "onBlur"
  > {
  /** Current value: E.164 (+1...), national (555) 123-4567, or partial digits */
  value: string;
  /** Called with display value in national format e.g. "(555) 123-4567". Use normalizeUsPhoneE164() when you need E.164. */
  onChange: (value: string) => void;
  onBlur?: () => void;
  id?: string;
  /** Optional label (e.g. "Phone number") */
  label?: string;
  /** Show error state and optional message */
  error?: boolean;
  errorMessage?: string;
  /** Input placeholder */
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  /** When true, show +1 prefix. Default true for US. */
  showCountryPrefix?: boolean;
  /** Accessible description for error (sets aria-describedby) */
  "aria-describedby"?: string;
}

/**
 * US phone input: +1 prefix, national format (555) 123-4567, paste handling, blur formatting.
 * Uses lib/utils/phone for validation and formatting.
 */
export const PhoneNumberInput = React.forwardRef<
  HTMLInputElement,
  PhoneNumberInputProps
>(function PhoneNumberInput(
  {
    value,
    onChange,
    onBlur,
    id = "phone",
    label,
    error = false,
    errorMessage = "Enter a valid 10-digit US phone number.",
    placeholder = "(555) 123-4567",
    disabled,
    required,
    showCountryPrefix = true,
    className,
    "aria-describedby": ariaDescribedBy,
    ...rest
  },
  ref
) {
  const [touched, setTouched] = React.useState(false);
  const displayValue = React.useMemo(() => {
    const digits = getUsPhoneDigits(value);
    if (digits.length === 0) return value.trim();
    if (digits.length >= 10) return formatUsPhoneNational(value);
    return value;
  }, [value]);

  const e164 = React.useMemo(() => normalizeUsPhoneE164(value), [value]);
  const showError = (touched || error) && value.trim().length > 0 && !e164;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digits = getUsPhoneDigits(raw);
    if (digits.length > 11) return;
    const formatted =
      digits.length >= 10 ? formatUsPhoneNational(digits) : raw;
    onChange(formatted);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").trim();
    const digits = getUsPhoneDigits(pasted);
    if (digits.length === 11 && digits.startsWith("1")) {
      e.preventDefault();
      onChange(formatUsPhoneNational(digits));
    }
  };

  const handleBlur = () => {
    setTouched(true);
    if (e164) {
      onChange(formatUsPhoneForDisplay(value));
    }
    onBlur?.();
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {label && (
        <Label
          htmlFor={id}
          className="text-sm font-medium text-foreground"
        >
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </Label>
      )}
      <div
        className={cn(
          "flex h-12 items-center rounded-md border bg-background px-3 ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          (showError || error)
            ? "border-destructive aria-invalid"
            : "border-input"
        )}
        aria-invalid={showError || error}
      >
        {showCountryPrefix && (
          <span
            className="select-none pr-2 text-muted-foreground"
            aria-hidden="true"
          >
            +1
          </span>
        )}
        <Input
          ref={ref}
          id={id}
          name={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder={placeholder}
          value={displayValue}
          onChange={handleChange}
          onPaste={handlePaste}
          onBlur={handleBlur}
          disabled={disabled}
          required={required}
          aria-describedby={
            showError || error
              ? ariaDescribedBy ?? `${id}-error`
              : ariaDescribedBy
          }
          aria-invalid={showError || error}
          className="h-auto min-w-0 flex-1 border-0 p-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
          {...rest}
        />
      </div>
      {(showError || error) && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-xs text-destructive"
        >
          {errorMessage ?? "Enter a valid 10-digit US phone number."}
        </p>
      )}
    </div>
  );
});
