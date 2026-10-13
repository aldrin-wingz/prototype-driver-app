import type { DemoFocus } from "@/lib/solutions/demo-mode";
import { showsAccountProposals } from "./account-self-service";

/**
 * The Options menu, replicated from capture shoot `DAB-2026-10-01`
 * (`05-01` … `05-04`), app build v6.0.537.
 *
 * ⛔ The previous stub listed four invented rows — Ride History, Settings,
 * Help & Support, Log Out — and only the first exists. Production has ELEVEN
 * rows, no row called "Settings", and no row called "Help & Support". This is
 * the section the base got most wrong, and it stayed wrong until it was
 * photographed.
 *
 * Rules live here rather than in the page so a test can reach them.
 */

export type OptionsRowId =
  | "ride-history" | "driver-dashboard" | "id-badge" | "contact-support"
  | "driver-notes" | "default-map-service" | "location" | "privacy-policy"
  | "driver-terms" | "check-for-updates" | "logout"
  /** ⚠️ PROPOSED — catalogue row 15. Not in the capture. See `ACCOUNT_ROW`. */
  | "account";

export interface OptionsRow {
  id: OptionsRowId;
  label: string;
  /** Sub-line under the label. Logout is the only row without one. */
  description?: string;
  /** Where the row goes in this prototype. Absent = not wired; it toasts. */
  href?: string;
  /** Logout's chevron is red; every other row's is green. Capture `05-04`. */
  destructive?: boolean;
  /** ⚠️ Not in `DAB-2026-10-01`. Rendered only when its solution is focused. */
  proposed?: boolean;
}

/** Order is exactly as captured, top to bottom. */
export const OPTIONS_ROWS: OptionsRow[] = [
  { id: "ride-history", label: "Ride History", description: "View all your Ride History", href: "/ride-history" },
  { id: "driver-dashboard", label: "Driver Dashboard", description: "View your Driver Dashboard" },
  { id: "id-badge", label: "ID Badge", description: "View your ID Badge", href: "/id-badge" },
  { id: "contact-support", label: "Contact Support", description: "Contact Support for any issues" },
  { id: "driver-notes", label: "Driver Notes", description: "Leave notes for trip routing and dispatch" },
  { id: "default-map-service", label: "Default Map Service", description: "Manage default map service" },
  { id: "location", label: "Location", description: "Checks current location" },
  { id: "privacy-policy", label: "Privacy Policy", description: "How we collect, use, and share data for the driver app." },
  { id: "driver-terms", label: "Driver Terms and Conditions", description: "Use of this application constitutes acceptance of the Driver Terms and Conditions." },
  { id: "check-for-updates", label: "Check for updates", description: "Get the latest app content without reinstalling again" },
  { id: "logout", label: "Logout", destructive: true },
];

/**
 * The driver identity block above the list (capture `05-01`).
 *
 * ⚠️ Seeded. The captured account is `Dev Verida-GA Test Driver` and its ID
 * Badge carries a real person's photograph — never replicate the portrait, and
 * never copy the install UUID from the version footer.
 */
export const DRIVER_NAME = "Dev Verida-GA Test Driver";

/**
 * Version footer, bottom of the list (capture `05-04`).
 * ⛔ The real footer appends an install UUID. It is a device identifier, so the
 * prototype prints a fixed placeholder instead of a copied one.
 */
export const APP_VERSION = "v6.0.537 (6.0.537)";
export const INSTALL_ID_PLACEHOLDER = "00000000-0000-0000-0000-000000000000";

/**
 * Driver Notes opens a modal, not a page (capture `05-05`).
 * Send is disabled until the note has content.
 */
export const DRIVER_NOTES_COPY = {
  title: "Driver Notes",
  body: "Share trip preferences or routing instructions for the operations team.",
  placeholder: "Type your note...",
  cancel: "Cancel",
  send: "Send",
} as const;

/* -------------------------------------------------------------------------- */
/* Catalogue row 15 — the proposed twelfth row                                 */
/* -------------------------------------------------------------------------- */

/**
 * ⚠️ **A twelfth row on a screen that is capture-locked at eleven.**
 *
 * The captured menu has no account row of any kind, so this is an addition, not
 * a correction. Fourth instance of the capture-lock question; the user answered
 * "gated to the focused solution" on 2026-10-13, which is the same answer the
 * two proposed More Options tiles got — an unfocused run still renders the
 * captured screen row for row.
 */
export const ACCOUNT_ROW: OptionsRow & { after: OptionsRowId } = {
  id: "account",
  label: "Account",
  description: "Change your email, password or phone number",
  href: "/options/account",
  proposed: true,
  after: "driver-dashboard",
};

/**
 * The rows to render right now.
 *
 * ⛔ Exported so `verify-solutions.ts` can read the DATA rather than grep the
 * page for a label. The More Options grid taught this one the hard way: a check
 * that matched source text passed while the array it claimed to describe said
 * something else.
 */
export function buildOptionsRows(focus: DemoFocus): OptionsRow[] {
  if (!showsAccountProposals(focus)) return OPTIONS_ROWS;
  return OPTIONS_ROWS.flatMap((row) =>
    row.id === ACCOUNT_ROW.after ? [row, ACCOUNT_ROW] : [row],
  );
}
