import { showsProposal, type DemoFocus } from "@/lib/solutions/demo-mode";

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
/**
 * CAP-127 — ⛔⛔ this sentence IS the dead end: reset instructions go to the
 * inbox the driver has just lost. Replicated as production words it; the
 * proposal that answered it is parked, see `PRE_AUTH_RECOVERY_PARKED`.
 */
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
/* ⏸️ The pre-auth half is PARKED                                              */
/* -------------------------------------------------------------------------- */

/**
 * ⏸️ **Account recovery from the sign-in screen was built and then removed**,
 * by user direction on 2026-10-13: *"lets remove the flow in the sign in for
 * now. Lets keep the changing pw and email or phone when they have already
 * logged in."*
 *
 * What went with it: a `recoveryRouteFor` truth table over the eight ways a
 * driver can be locked out, a `RECOVERY_RULES` proof table, and three screens
 * reached from a link on CAP-127. It is all in commit `accd40c` if it comes
 * back.
 *
 * ⛔ It was removed rather than left behind a flag. Nothing called it, and an
 * eight-row truth table over a function no screen reaches is the exact shape of
 * a check that has stopped testing anything — it would have stayed green
 * forever while the product it described did not exist.
 *
 * ⭐ **The finding it encoded is still true and is kept as prose**, in
 * `References/Phase 8 Spec - Account Self-Service.md` §2: production already
 * trusts the phone, so three of the four lockouts are already solvable today —
 * drivers call Support because `Forgot password?` is the loud link into
 * CAP-127's dead end, and `Sign in with phone instead` is a quiet green line
 * under a greyed button.
 */
export const PRE_AUTH_RECOVERY_PARKED = true;

/* -------------------------------------------------------------------------- */
/* What proves what                                                            */
/* -------------------------------------------------------------------------- */

export type AccountField = "email" | "password" | "phone";

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
 * ⚠️ No `where` argument any more. It took `"settings" | "recovery"` while both
 * halves existed; with the pre-auth half parked there is one table, and a
 * parameter with one legal value is a parameter that reads as a choice nobody
 * can make.
 */
export function changeRuleFor(field: AccountField): ChangeRule {
  const rule = SETTINGS_RULES.find((r) => r.field === field);
  if (!rule) throw new Error(`No rule for ${field}`);
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
/**
 * ⛔ **Every step here is REPLICATED. None is a proposal.**
 *
 * With the recovery flow parked, `/login` carries nothing of row 15's — it
 * exists because the captured Logout row lands on it, which is what production
 * does. That is replication catching up, not a feature, and it is why the route
 * is not row 15's entry point any more.
 */
export type LoginStep =
  /** CAP-122. */
  | "signin-phone"
  /** CAP-126. */
  | "signin-email"
  /** CAP-123 / 124 / 125, both errors. */
  | "otp"
  /** CAP-127. */
  | "reset";

export const PRODUCTION_LOGIN_STEPS: readonly LoginStep[] = [
  "signin-phone", "signin-email", "otp", "reset",
];

/**
 * ⭐ What a code screen is CONFIRMING, said on the screen.
 *
 * User direction, 2026-10-13: *"for these verification codes be explicit what
 * we are confirming — whether it is changing pw or changing email."* The six
 * boxes look identical whatever brought the driver there, and a code that
 * arrives while three things are half-changed is a code with no referent.
 *
 * ⛔ `VerificationCodeScreen` takes this as a REQUIRED prop, so a new caller
 * that forgets to say what it is confirming does not compile. A check cannot
 * make that guarantee; a type can.
 */
export type CodePurpose =
  | "sign-in" | "change-email" | "change-password" | "change-phone";

export const CODE_PURPOSE_LABEL: Record<CodePurpose, string> = {
  "sign-in": "Signing in",
  "change-email": "Changing your email",
  "change-password": "Changing your password",
  "change-phone": "Changing your phone number",
};

/** The purpose for each field's change. Keeps the mapping out of the JSX. */
export const CODE_PURPOSE_FOR: Record<AccountField, CodePurpose> = {
  email: "change-email",
  password: "change-password",
  phone: "change-phone",
};

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
export const ACCOUNT_SOLUTIONS: readonly string[] = [ACCOUNT_SOLUTION_ID];

/**
 * ⛔⛔ **The one guard where the plain mirror shows NOTHING**, hence
 * `inPlainMirror: false`. The Options menu is capture-locked at eleven rows, so
 * an unfocused run has to render the captured screen row for row — the opposite
 * reading of `null` from the other four guards.
 *
 * ⭐ That exception used to be invisible: it was a differently-spelled
 * predicate (`=== ACCOUNT_SOLUTION_ID`, with no `null` clause) sitting beside
 * four that all read `null || includes`. Two of those four nearly drifted
 * apart once already. It is now a named flag on one shared rule, so the
 * difference is declared rather than inferred from how someone wrote an `if`.
 */
export function showsAccountProposals(focus: DemoFocus): boolean {
  return showsProposal(focus, ACCOUNT_SOLUTIONS, { inPlainMirror: false });
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
