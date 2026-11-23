/**
 * PROTOTYPE — the OCR stand-in (Luis, 2026-11-24: "No manual dates in the Compliance Tool: OCR or derived").
 *
 * As production does (backend driver_onboarding.py:1580 enqueues document understanding on a document save; the CS
 * Tool card keeps the date editable and labels the read "AI-Input"): each dated document fills its date the moment it is
 * uploaded, as an OCR read, and Compliance or Onboarding can still edit it. Other dates are derived (MVR takes the
 * D.Lawson report date; Safety Equipment, Trade Dress and Signage take the inspection's expiry; terms add months).
 *
 * The prototype has no OCR, so a read is a fixture:
 *   - onboarding: each sample file has its own plausible date (`sample`);
 *   - renewals: a new document uploaded on a day reads a date relative to that day (`renewal`).
 *
 * One file for both prototypes: the driver app shows the read on upload; the CS Tool copies this file
 * (scripts/sync-sbs-driver-app.ts) and its engine writes the same date on the Compliance card.
 */

export type OcrKind = "expiry" | "done";

export interface OcrRead {
  /** The uploaded document's field slug. */
  doc: string;
  /** The same document under another slug (the card's name for it). */
  also?: string[];
  /** The date field the read fills (the card's; also the onboarding step's when the step has it as a staff field). */
  date: string;
  kind: OcrKind;
  /** Shown beside the date. */
  label: string;
  /** The onboarding sample file's date. */
  sample: string;
  /** A renewal document uploaded on `day` (YYYY-MM-DD): the date it reads. */
  renewal: (day: string) => string;
}

function parse(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
const iso = (d: Date) => d.toISOString().slice(0, 10);
function plusDays(day: string, n: number): string {
  const d = parse(day);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
}
function plusMonths(day: string, n: number): string {
  const d = parse(day);
  return iso(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, d.getUTCDate())));
}

const certificate = (doc: string, date: string): OcrRead => ({ doc, date, kind: "done", label: "Completed on", sample: "2026-11-22", renewal: (d) => plusDays(d, -1) });

export const OCR_READS: OcrRead[] = [
  // Georgia licences run 8 years.
  { doc: "dl_front", date: "dl_expiration", kind: "expiry", label: "Licence expires", sample: "2029-05-14", renewal: (d) => plusMonths(d, 96) },
  { doc: "vehicle_registration_doc", date: "ocr_registration_expiration_date", kind: "expiry", label: "Registration expires", sample: "2027-08-31", renewal: (d) => plusMonths(d, 12) },
  { doc: "insurance_documents", date: "insurance_expiration", kind: "expiry", label: "Policy expires", sample: "2027-05-31", renewal: (d) => plusMonths(d, 6) },
  // The inspection report: the day of the inspection (the driver's appointment date is booking information only).
  { doc: "inspection_document", date: "inspection_date", kind: "done", label: "Inspected on", sample: "2026-11-23", renewal: (d) => plusDays(d, -1) },
  { doc: "hipaa_certificate", date: "hipaa_completed_at", kind: "done", label: "Completed on", sample: "2026-11-20", renewal: (d) => plusDays(d, -1) },
  // One D.Lawson report covers the background check and the MVR: the MVR card takes this date too (derived).
  { doc: "bgc_result_file", date: "bgc_completed_at", kind: "done", label: "Report date", sample: "2026-11-21", renewal: (d) => plusDays(d, -2) },
  { doc: "drug_screen_result", also: ["drug_screen_result_file"], date: "drug_screen_completed_at", kind: "done", label: "Screened on", sample: "2026-11-21", renewal: (d) => plusDays(d, -1) },
  certificate("gentech_pass_basic_certificate", "gentech_pass_basic_completed_at"),
  certificate("gentech_defensive_driving_certificate", "gentech_defensive_driving_completed_at"),
  certificate("gentech_first_aid_certificate", "gentech_first_aid_completed_at"),
];

export function ocrFor(slug: string): OcrRead | undefined {
  return OCR_READS.find((r) => r.doc === slug || r.also?.includes(slug));
}

/** The date fields OCR fills on upload (editable afterwards). */
export const OCR_DATE_FIELDS: ReadonlySet<string> = new Set(OCR_READS.map((r) => r.date));

/** An in-app renewal upload → the dated document it carries (requirements renewed by a photo of the document). */
export const OCR_DOC_BY_APP: Record<string, string> = {
  "drivers-license": "dl_front",
  "vehicle-registration": "vehicle_registration_doc",
  insurance: "insurance_documents",
  hipaa: "hipaa_certificate",
  "gentech-pass-basic": "gentech_pass_basic_certificate",
  "gentech-defensive-driving": "gentech_defensive_driving_certificate",
  "gentech-first-aid": "gentech_first_aid_certificate",
};

/** What a renewal upload on `day` reads, or undefined when the upload carries no dated document. */
export function renewalOcrDate(appSlug: string, day: string): string | undefined {
  const doc = OCR_DOC_BY_APP[appSlug];
  return doc ? ocrFor(doc)?.renewal(day) : undefined;
}

export const OCR_NOTE = "Read from the document (OCR)";

export function formatOcrDate(day: string): string {
  return parse(day).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** "Licence expires May 14, 2029" — the line shown under an upload. */
export function ocrLine(read: OcrRead, date: string): string {
  return `${read.label} ${formatOcrDate(date)}`;
}
