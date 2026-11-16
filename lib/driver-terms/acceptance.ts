/**
 * Driver Terms and Conditions (T&C) acceptance — FEATURE `prototype/driver-terms-acceptance`.
 *
 * ⚠️ NOT SHIPPED. Nothing here is production behaviour yet; it is the prototype of
 * PRD story 6 (T&C acceptance screen) and story 7 (Options → Driver Terms shows the
 * current version) of `Project - Driver Terms and Conditions Version Handling`.
 *
 * The rules mirror the real Driver App branch `feature/driver-terms-acceptance`
 * (`App/Services/DriverTerms/driverTermsGate.ts`, `scrollAcknowledgment.ts`) so the
 * prototype and the code engineers will read cannot disagree.
 */
import termsV1 from "./driver-terms-v1.json";

export interface DriverTermsVersion {
  version: number;
  /** Shown as "Effective <date>" on the Options destination. */
  effectiveDate: string;
  slug: string;
  label: string;
  helpText: string;
  content: string;
  contentSha256: string;
  /** Prototype only: later versions reuse the v1 text. */
  textNote?: string;
}

export interface DriverTermsAcceptanceRecord {
  driverId: string;
  version: string;
  contentSha256: string;
  acceptedAt: string;
  surface: "driver_app";
  appVersion: string;
}

/** Version 1 = today's onboarding T&C ("Last modified: 5/6/2025"). PRD story 1 seeds this. */
export const V1_EFFECTIVE_DATE = "May 6, 2025";

/** Copy shared with the Driver App branch. */
export const TERMS_SCREEN_TITLE = "Driver Terms and Conditions";
export const TERMS_SCREEN_INTRO =
  "We've updated the Wingz Driver Terms and Conditions. Please read them to the end and accept to keep using the Wingz Driver app.";
export const TERMS_AGREE_BUTTON = "Agree and continue";
export const TERMS_LOGOUT = "Log out";
export const TERMS_SCROLL_HINT = "Scroll to read all terms";
export const TERMS_FOOTER_HINT = "Please read the full terms above before accepting.";

/** The T&C a given version number resolves to (prototype: every version reuses the v1 text). */
export function termsForVersion(version: number, publishedOn?: string): DriverTermsVersion {
  return {
    version,
    effectiveDate: version === 1 ? V1_EFFECTIVE_DATE : publishedOn ?? V1_EFFECTIVE_DATE,
    slug: termsV1.slug,
    label: termsV1.label,
    helpText: termsV1.helpText,
    content: termsV1.content,
    contentSha256: termsV1.contentSha256,
    textNote: version === 1 ? undefined : "Prototype: same text as version 1",
  };
}

/** Never accepted, or accepted an older version → blocked. */
export function needsDriverTermsAcceptance(currentVersion: number | null, acceptedVersion: number | null): boolean {
  if (currentVersion == null) return false;
  return acceptedVersion !== currentVersion;
}

/**
 * Whether the screen blocks right now. The gate checks at login and on resume only, so
 * `checkedVersion` is the current version as of the last check (null = logged out / not
 * checked). Publishing while the app is open blocks nobody until their next check;
 * accepting the current version releases the screen immediately.
 */
export function gateBlocks(checkedVersion: number | null, acceptedVersion: number | null, currentVersion: number): boolean {
  if (checkedVersion == null) return false;
  if (acceptedVersion === currentVersion) return false;
  return needsDriverTermsAcceptance(checkedVersion, acceptedVersion);
}

/**
 * Same as the app's `resolveScrollAckChoices`: onboarding shows Agree and Disagree; the
 * logged-in screen passes `hideDisagree` (an activated driver accepts or logs out).
 */
export function scrollAckChoices(slug: string, opts: { hideDisagree?: boolean } = {}): Array<{ label: string; value: boolean }> {
  const tos = slug === "ack_tos";
  const choices = [{ label: tos ? "Yes, I have read and agree" : "Yes - I want to continue", value: true }];
  if (!opts.hideDisagree) {
    choices.push({ label: tos ? "No, I do not agree" : "No - I do not want to continue.", value: false });
  }
  return choices;
}

/** The read-to-the-end gate: within 8px of the bottom counts as read (app: SCROLL_BOTTOM_THRESHOLD). */
export function reachedEnd(scrollTop: number, clientHeight: number, scrollHeight: number, threshold = 8): boolean {
  return clientHeight + scrollTop >= scrollHeight - threshold;
}

/** Agree and continue is enabled only once the terms are read AND agree is chosen. */
export function canAcceptTerms(scrolledToEnd: boolean, agreed: boolean | undefined): boolean {
  return scrolledToEnd && agreed === true;
}

export function buildAcceptanceRecord(input: {
  driverId: string;
  terms: Pick<DriverTermsVersion, "version" | "contentSha256">;
  agreed: unknown;
  appVersion: string;
  now?: Date;
}): DriverTermsAcceptanceRecord | null {
  if (!input.driverId.trim() || input.agreed !== true) return null;
  return {
    driverId: input.driverId,
    version: String(input.terms.version),
    contentSha256: input.terms.contentSha256,
    acceptedAt: (input.now ?? new Date()).toISOString(),
    surface: "driver_app",
    appVersion: input.appVersion,
  };
}
