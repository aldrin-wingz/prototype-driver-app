/**
 * US-only phone utilities. Accept any format; validate as 10 digits or 11 starting with 1; normalize to E.164.
 */

export function getUsPhoneDigits(raw: string): string {
  return raw.replace(/\D/g, "");
}

/**
 * Returns E.164 for valid US numbers: +15551234567, or null if invalid.
 * Valid: 10 digits (national) or 11 digits starting with 1 (country code).
 */
export function normalizeUsPhoneE164(raw: string): string | null {
  const digits = getUsPhoneDigits(raw);

  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;

  return null;
}

/**
 * National format only: (555) 123-4567. Use for input value when prefix "+1" is shown separately.
 */
export function formatUsPhoneNational(raw: string): string {
  const digits = getUsPhoneDigits(raw);
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits.slice(0, 10);
  if (ten.length !== 10) return raw.trim();
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}

/**
 * For display only (e.g. confirmation "We sent a code to …"). Includes +1.
 */
export function formatUsPhoneForDisplay(raw: string): string {
  const digits = getUsPhoneDigits(raw);

  let ten = digits;
  let hasCountry = false;

  if (digits.length === 11 && digits.startsWith("1")) {
    ten = digits.slice(1);
    hasCountry = true;
  }

  if (ten.length !== 10) return raw.trim();

  const area = ten.slice(0, 3);
  const mid = ten.slice(3, 6);
  const last = ten.slice(6);

  return `${hasCountry ? "+1 " : ""}(${area}) ${mid}-${last}`;
}
