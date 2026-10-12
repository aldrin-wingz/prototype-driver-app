/**
 * Catalogue row 15 — self-service email / password / phone. 567 calls.
 *
 * ⭐ User direction, 2026-10-13: *"it must be allowed in both the sign in/login
 * and in the settings."* Two halves, and the driver is in a different state in
 * each — which is what decides what can be asked of them.
 *
 * Everything here is a RULE, not markup, so `verify-solutions.ts` §13 can reach
 * it. Copy that production already owns is quoted verbatim from the captures
 * named beside it; copy this slice PROPOSES is marked as proposed.
 */

/* -------------------------------------------------------------------------- */
/* Production's own copy — verbatim from `references/captures/INDEX.md` §07     */
/* -------------------------------------------------------------------------- */

/** CAP-122 / CAP-126 — one title across both sign-in variants. */
export const SIGN_IN_TITLE = "Sign in to Wingz";
/** CAP-122. */
export const SIGN_IN_PHONE_SUBTITLE =
  "Enter your phone number and we'll send you a verification code.";
/** CAP-126. */
export const SIGN_IN_EMAIL_SUBTITLE = "Enter your email and password to sign in.";
/** CAP-123. */
export const OTP_TITLE = "Enter verification code";
/** CAP-127. */
export const RESET_TITLE = "Reset Password";
/** CAP-127 — ⛔⛔ this sentence IS the dead end. See `recoveryRouteFor`. */
export const RESET_SUBTITLE =
  "Enter the email associated with your account and we'll send reset instructions.";

/**
 * ⛔ The two OTP failures are DISTINCT and production words them differently.
 * Copied exactly; a check asserts both still appear character for character,
 * because an error message is the one string a driver reads under pressure.
 */
export const OTP_ERROR_INVALID = "Invalid or expired OTP.";
export const OTP_ERROR_RATE_LIMIT =
  "You must wait 90 seconds to request an OTP again.";

/** CAP-123 — six boxes, and the countdown starts at 88 seconds. */
export const OTP_LENGTH = 6;
export const OTP_RESEND_SECONDS = 88;

/**
 * The code the prototype accepts.
 *
 * ⚠️ Fixed and printed on screen. There is no SMS here, so a random code would
 * make the OTP screens unreachable — and every demo would stall on the one
 * screen the slice exists to show.
 */
export const OTP_DEMO_CODE = "123456";

/* -------------------------------------------------------------------------- */
/* The account on file                                                         */
/* -------------------------------------------------------------------------- */

/**
 * ⛔ Fiction only. `555-01xx` is the range reserved for it, and the seeded
 * number must stay inside it. CAP-123's `+1 (111) 111-1111` is captured TEST
 * data and is not seeded here; CAP-122's `(555) 123-4567` is a placeholder, and
 * a placeholder may be replicated verbatim because nobody is reachable on it.
 */
export const PHONE_PLACEHOLDER = "(555) 123-4567";

export const ACCOUNT_ON_FILE = {
  name: "Dev Verida-GA Test Driver",
  email: "dev.verida.ga@example.com",
  phone: "(555) 0142",
} as const;

/** Never print a whole contact detail back at the driver. */
export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain || user.length === 0) return "•••";
  const head = user.slice(0, 2);
  return `${head}${"•".repeat(Math.max(3, user.length - 2))}@${domain}`;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "•••";
  return `••• ••• ${digits.slice(-4)}`;
}

/* -------------------------------------------------------------------------- */
/* ⛔⛔ The finding: three of the four lockouts already have a way in           */
/* -------------------------------------------------------------------------- */

export type AccountField = "email" | "password" | "phone";

/**
 * What a locked-out driver still has.
 *
 * ⚠️ "Can receive on the email" is NOT "knows the email address". A driver whose
 * work address was deactivated still knows what it was — they just cannot read
 * anything sent to it. Conflating the two is what makes the dead end look
 * unavoidable, because email+password sign-in never needed the inbox at all.
 */
export interface RecoveryInputs {
  knowsPassword: boolean;
  canReceiveOnEmailOnFile: boolean;
  canReceiveOnPhoneOnFile: boolean;
}

export type RecoveryRoute =
  /** Email + password still works — the inbox is irrelevant to signing in. */
  | "sign-in-email"
  /** ⭐ The door production already has and does not point at. */
  | "sign-in-phone-otp"
  /** Production's reset, which only works if the inbox is reachable. */
  | "reset-by-email"
  /** ⛔ Nothing left in the account. No in-app evidence can settle this. */
  | "contact-support";

/**
 * ⛔⛔ **The slice's whole argument, executable.**
 *
 * Three of the four outcomes are reachable in production TODAY. Drivers call
 * Support anyway, because `Forgot password?` is the loud link on CAP-126 and it
 * leads into `RESET_SUBTITLE` — a reset sent to the inbox they just lost —
 * while `Sign in with phone instead` is a quiet green line under a greyed
 * button. The product has the exit; the screen does not point at it.
 *
 * Order matters and is deliberate: password first because it needs nothing
 * delivered, phone second because it needs only a handset, email reset last
 * because it is the one that strands people.
 */
export function recoveryRouteFor(inputs: RecoveryInputs): RecoveryRoute {
  if (inputs.knowsPassword) return "sign-in-email";
  if (inputs.canReceiveOnPhoneOnFile) return "sign-in-phone-otp";
  if (inputs.canReceiveOnEmailOnFile) return "reset-by-email";
  return "contact-support";
}

/* -------------------------------------------------------------------------- */
/* What proves what                                                            */
/* -------------------------------------------------------------------------- */

export type ProofFactor =
  /** They typed the current password. */
  | "current-password"
  /** They received a code on the contact ALREADY on file. */
  | "otp-to-contact-on-file"
  /** They are already signed in on this device. */
  | "signed-in-session"
  /** They received a code on the NEW contact. ⛔ Proves the NUMBER, not them. */
  | "otp-to-new-contact"
  /** They typed it twice and the two matched. ⛔ A typo guard, not a proof. */
  | "typed-twice";

/**
 * ⛔⛔ **Identity and value are two different questions, and only one of them is
 * about who is asking.**
 *
 * An OTP to a NEW phone proves that phone exists and someone is holding it. It
 * says nothing about whether that someone owns the account. A recovery flow
 * whose only check is "send a code to whatever number you give me" is an
 * account-takeover path in a product that pays people: an email address is not
 * a secret, so knowing one would be enough to redirect the account.
 *
 * So every change carries BOTH — something that proves the person, and
 * something that proves the new value. They are never the same factor.
 *
 * ⭐ User direction, 2026-10-13: *"for email and phone, after confirming, ask
 * for OTP."* That is the right shape and it is why `valueConfirmations` is a
 * list — the typo guard and the reachability proof are two different jobs, and
 * a contact detail needs both.
 */
export interface ChangeRule {
  field: AccountField;
  /**
   * Proves the person asking is the account holder, in order.
   *
   * ⛔ A LIST for the same reason the other one is: a change can need more than
   * one thing, and writing it as a single factor forced a choice that hid a
   * hole. Requiring the CURRENT password to change the password locked out the
   * only driver who needs that screen — the one who has forgotten it.
   */
  identityProofs: ProofFactor[];
  /**
   * Proves the new value is real — in order, each step run after the last.
   *
   * ⛔ A LIST, because typing twice is not enough on its own. Two fields that
   * match prove the driver typed the same thing twice; they do not prove the
   * thing exists. An email typed wrong twice is a lockout the app just
   * confirmed. So every contact detail ends in a code sent TO THE NEW ONE,
   * which is the only step that proves it can actually be reached.
   *
   * ⚠️ A password has no second step: there is nowhere to send a code, and the
   * driver is left holding the only copy either way.
   */
  valueConfirmations: ProofFactor[];
}

/**
 * Half B — changing a detail while SIGNED IN.
 *
 * ⭐ User direction, 2026-10-13: *"if I change password confirm with Phone OTP
 * or email OTP."* The password row therefore does NOT rest on the session, and
 * does not ask for the current password either — a code to a contact already on
 * file, the driver choosing which.
 *
 * ⛔⛔ Asking for the CURRENT password was the first build and it was wrong in
 * a way worth keeping written down: it locked out the only driver who needs
 * that screen. Someone who remembers their password does not need to reset it;
 * someone who has forgotten it cannot answer. The requirement read as security
 * and functioned as a wall in front of the use case.
 *
 * ⚠️ The honest cost: a code to the PHONE on file arrives on the same handset a
 * thief is already holding. `OTP_CHANNELS` offers the email as well, which does
 * not — and a driver who still knows their password has no reason to be here.
 */
export const SETTINGS_RULES: readonly ChangeRule[] = [
  { field: "email", identityProofs: ["signed-in-session"], valueConfirmations: ["typed-twice", "otp-to-new-contact"] },
  { field: "password", identityProofs: ["otp-to-contact-on-file"], valueConfirmations: ["typed-twice"] },
  { field: "phone", identityProofs: ["signed-in-session"], valueConfirmations: ["otp-to-new-contact"] },
];

/**
 * Half A — changing a detail while LOCKED OUT.
 *
 * Same value confirmations, but the session no longer exists, so identity has
 * to come from one of the two things a locked-out owner can still produce.
 * ⛔ `otp-to-new-contact` appears ONLY as a value confirmation here, never as
 * the identity proof — that is the whole guard.
 */
export const RECOVERY_RULES: readonly ChangeRule[] = [
  { field: "email", identityProofs: ["current-password"], valueConfirmations: ["typed-twice", "otp-to-new-contact"] },
  { field: "password", identityProofs: ["otp-to-contact-on-file"], valueConfirmations: ["typed-twice"] },
  { field: "phone", identityProofs: ["current-password"], valueConfirmations: ["otp-to-new-contact"] },
];

/** ⛔ There is no new contact to send a code to when the password changes. */
export const PASSWORD_HAS_NO_NEW_CONTACT = true;

export function changeRuleFor(
  field: AccountField,
  where: "settings" | "recovery",
): ChangeRule {
  const rules = where === "settings" ? SETTINGS_RULES : RECOVERY_RULES;
  const rule = rules.find((r) => r.field === field);
  if (!rule) throw new Error(`No ${where} rule for ${field}`);
  return rule;
}

/**
 * Where a code can be sent to prove the account is yours. The driver picks.
 *
 * ⛔ Both are contacts ALREADY ON FILE. Neither is a contact being set — that
 * distinction is the whole guard and it is why this list is separate from
 * `CONTACT_FIELDS` below, which is about what is being CHANGED.
 */
export const OTP_CHANNELS: readonly AccountField[] = ["phone", "email"];

/**
 * ⛔ Email and phone are CONTACT details: the account reaches the driver
 * through them, so a wrong one is a lockout the app itself created. Both must
 * end in a code sent to the new value. A password is not a contact detail and
 * has nowhere to send one.
 */
export const CONTACT_FIELDS: readonly AccountField[] = ["email", "phone"];

/** The two factors a locked-out driver may offer. Nothing else counts. */
export const RECOVERY_IDENTITY_PROOFS: readonly ProofFactor[] = [
  "current-password",
  "otp-to-contact-on-file",
];

/* -------------------------------------------------------------------------- */
/* Screens                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The pre-auth step machine. One route, because there is no session to carry a
 * half-finished recovery across a navigation, and a reload that dropped the
 * driver back to step 1 would read as the flow failing.
 */
export type LoginStep =
  /** CAP-122 — replicated. */
  | "signin-phone"
  /** CAP-126 — replicated. */
  | "signin-email"
  /** CAP-123 / 124 / 125 — replicated, both errors. */
  | "otp"
  /** CAP-127 — replicated, plus ONE proposed link. */
  | "reset"
  /** Proposed — which account, and which proof they can offer. */
  | "recover-identify"
  /** Proposed — the current password. The code branch reuses `otp`. */
  | "recover-password"
  /** Proposed — the new email or the new phone. */
  | "recover-update";

export const PRODUCTION_LOGIN_STEPS: readonly LoginStep[] = [
  "signin-phone", "signin-email", "otp", "reset",
];
export const PROPOSED_LOGIN_STEPS: readonly LoginStep[] = [
  "recover-identify", "recover-password", "recover-update",
];

/**
 * ⭐ The whole of half A's change to production, in two lines of copy.
 *
 * PROPOSED — not captured. It sits under the Reset Password button, because
 * that is the screen where a driver without their inbox has just run out of
 * road.
 */
export const RECOVERY_LINK_PROMPT = "No longer have access to this email?";
export const RECOVERY_LINK_LABEL = "Recover your account another way";

/**
 * ⛔ The floor, and it is honest. A driver with no password, no inbox and no
 * handset has produced nothing the app can check, and no screen should pretend
 * otherwise. PROPOSED copy.
 */
export const RECOVERY_FLOOR_PROMPT = "Lost all three?";
export const RECOVERY_FLOOR_LABEL = "Contact Support — we'll verify you another way";

/* -------------------------------------------------------------------------- */
/* The twelfth Options row                                                     */
/* -------------------------------------------------------------------------- */

/**
 * ⚠️ The twelfth row itself lives in `options-menu.ts`, which owns the captured
 * eleven — one file decides what the menu is, so a proposed row cannot drift
 * away from the list it is inserted into. Only the GATE lives here.
 *
 * The Options menu is capture-locked at ELEVEN rows (`DAB-2026-10-01`,
 * `05-01`–`05-04`) and none of them is an account row. This is a twelfth, so it
 * is gated to the focused solution exactly like the two proposed More Options
 * tiles — an unfocused run still renders the captured screen row for row.
 *
 * Fourth instance of the capture-lock question; user answered "gated" on
 * 2026-10-13.
 */
export const ACCOUNT_SOLUTION_ID = "account-self-service";

/**
 * ⛔ Gates EVERY proposed addition in this slice, not just the Options row —
 * the twelfth row, and the recovery link this slice adds to CAP-127's otherwise
 * replicated Reset Password screen.
 *
 * ⚠️ User rule, 2026-10-12: *"if there is a new feature it should not show up in
 * another prototype."* One predicate rather than two, because two call sites
 * agreeing by coincidence is exactly how the proposed More Options tiles nearly
 * drifted apart.
 */
export function showsAccountProposals(activeSolutionId: string | null): boolean {
  return activeSolutionId === ACCOUNT_SOLUTION_ID;
}

/* -------------------------------------------------------------------------- */
/* Validation — plain, and in one place                                        */
/* -------------------------------------------------------------------------- */

/** Loose on purpose: this gates a demo button, it is not a security control. */
export function isEmailShaped(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

/** Ten digits, which is what the `+1` prefix on CAP-122 implies. */
export function isPhoneShaped(value: string): boolean {
  return value.replace(/\D/g, "").length === 10;
}

export const MIN_PASSWORD_CHARS = 8;

/**
 * The password the prototype accepts, printed on screen beside the field.
 *
 * ⚠️ Same reasoning as `OTP_DEMO_CODE`: there is no account store here, so a
 * secret nobody can be told would make the recovery branch unreachable — and
 * the recovery branch is the slice. ⛔ It is a demo string, not a credential;
 * nothing real is behind it.
 */
export const DEMO_PASSWORD = "wingz1234";

export function isPasswordShaped(value: string): boolean {
  return value.length >= MIN_PASSWORD_CHARS;
}
