"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSolution } from "@/lib/solutions/solution-context";
import { useToast } from "@/hooks/use-toast";
import {
  AuthButton, AuthCodeBoxes, AuthField, AuthInput, AuthLink, AuthPhoneInput,
  AuthShell, AuthSubtitle, AuthTitle,
} from "@/components/driver/auth/auth-shell";
import {
  ACCOUNT_ON_FILE, DEMO_PASSWORD, isEmailShaped, isPasswordShaped, isPhoneShaped,
  maskEmail, maskPhone, OTP_DEMO_CODE, OTP_ERROR_INVALID, OTP_ERROR_RATE_LIMIT,
  OTP_LENGTH, OTP_RESEND_SECONDS, OTP_TITLE, PHONE_PLACEHOLDER,
  RECOVERY_FLOOR_LABEL, RECOVERY_FLOOR_PROMPT, RECOVERY_LINK_LABEL,
  RECOVERY_LINK_PROMPT, RESET_SUBTITLE, RESET_TITLE, showsAccountProposals,
  SIGN_IN_EMAIL_SUBTITLE, SIGN_IN_PHONE_SUBTITLE, SIGN_IN_TITLE,
  type LoginStep,
} from "@/lib/driver-data/account-self-service";

/**
 * Catalogue row 15, half A — the pre-auth half.
 *
 * ⛔ `references/captures/INDEX.md` §07 says the auth screens were *"shipped,
 * captured, and deliberately NOT built into the base"*. Building them here
 * REVERSES that decision knowingly, because row 15's 567 calls start on them.
 * The boundary it was protecting is kept instead by scope: this route signs
 * nobody in and gates nothing. Every other route stays reachable without it.
 *
 * Four of the seven steps are replicated from captures and are not the proposal
 * — `signin-phone` (CAP-122), `signin-email` (CAP-126), `otp` (CAP-123/124/125)
 * and `reset` (CAP-127). The proposal is the three `recover-*` steps and the one
 * link that reaches them, and that link is gated to the focused solution.
 *
 * ⚠️ One route, not seven. There is no session to carry a half-finished
 * recovery across a navigation, and a reload that dumped the driver back on
 * step 1 would read as the flow failing rather than as the prototype having no
 * backend.
 */

/**
 * Why the code screen is open. The same six boxes serve four purposes.
 *
 * ⛔ `recover-prove` sends to the contact ALREADY ON FILE and proves identity.
 * The other two `recover-new-*` send to the contact being SET and prove only
 * that it can be reached. Same screen, opposite jobs — which is exactly why the
 * rules keep them as different factors.
 */
type OtpPurpose =
  | "sign-in" | "recover-prove" | "recover-new-phone" | "recover-new-email";

export default function LoginPage() {
  const router = useRouter();
  const { active } = useSolution();
  const { toast } = useToast();

  const showProposals = showsAccountProposals(active?.id ?? null);

  const [step, setStep] = useState<LoginStep>("signin-phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | undefined>();

  // OTP
  const [otpPurpose, setOtpPurpose] = useState<OtpPurpose>("sign-in");
  const [code, setCode] = useState("");
  const [resendIn, setResendIn] = useState(OTP_RESEND_SECONDS);
  const [otpError, setOtpError] = useState<string | undefined>();

  // Recovery
  const [newEmail, setNewEmail] = useState("");
  const [newEmailAgain, setNewEmailAgain] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [updating, setUpdating] = useState<"email" | "phone">("email");

  /** CAP-123's countdown. Only runs while the code screen is actually open. */
  useEffect(() => {
    if (step !== "otp" || resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [step, resendIn]);

  function go(next: LoginStep) {
    setError(undefined);
    setOtpError(undefined);
    setStep(next);
  }

  function openOtp(purpose: OtpPurpose) {
    setOtpPurpose(purpose);
    setCode("");
    setResendIn(OTP_RESEND_SECONDS);
    go("otp");
  }

  /**
   * ⛔⛔ ONE toast, carrying what changed.
   *
   * `TOAST_LIMIT` is 1 (`hooks/use-toast.ts`), so a handler that fired "Email
   * updated" and then "Welcome back" showed only the second — the driver
   * reached the end of a recovery flow and was never told the thing they came
   * for had happened. Two correct calls, one of them invisible. Found by
   * walking; nothing anywhere reports a dropped toast.
   */
  function signedIn(changed?: string) {
    toast({
      title: changed ?? "Welcome back",
      description: changed
        ? "Signed in with your new details."
        : "Signed in — the prototype has no session; this is the demo landing.",
    });
    router.push("/");
  }

  /* ---------------------------------------------------------------- steps */

  if (step === "signin-phone") {
    return (
      <AuthShell>
        <AuthTitle>{SIGN_IN_TITLE}</AuthTitle>
        <AuthSubtitle>{SIGN_IN_PHONE_SUBTITLE}</AuthSubtitle>
        <AuthField label="Phone number">
          <AuthPhoneInput
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={PHONE_PLACEHOLDER}
            inputMode="tel"
          />
        </AuthField>
        <AuthButton disabled={!isPhoneShaped(phone)} onClick={() => openOtp("sign-in")}>
          Send code
        </AuthButton>
        <AuthLink className="mt-6" onClick={() => go("signin-email")}>
          Sign in with email instead
        </AuthLink>
        <p className="mt-5 text-center text-[15px] text-gray-500">
          Not a driver yet?{" "}
          <span className="font-bold text-[#2FD98A]">Sign up</span>
        </p>
      </AuthShell>
    );
  }

  if (step === "signin-email") {
    const ready = isEmailShaped(email) && password.length > 0;
    return (
      <AuthShell>
        <AuthTitle>{SIGN_IN_TITLE}</AuthTitle>
        <AuthSubtitle>{SIGN_IN_EMAIL_SUBTITLE}</AuthSubtitle>
        <AuthField label="Email">
          <AuthInput
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            inputMode="email"
            autoComplete="username"
          />
        </AuthField>
        <AuthField label="Password" error={error}>
          <div className="relative">
            <AuthInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              className="pr-12"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {/* CAP-126's show/hide eye. */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
        </AuthField>
        <div className="mt-3 flex justify-end">
          <AuthLink onClick={() => go("reset")}>Forgot password?</AuthLink>
        </div>
        <AuthButton
          disabled={!ready}
          onClick={() => {
            if (password !== DEMO_PASSWORD) {
              setError("That password is not correct.");
              return;
            }
            signedIn();
          }}
        >
          Sign in
        </AuthButton>
        <AuthLink className="mt-6" onClick={() => go("signin-phone")}>
          Sign in with phone instead
        </AuthLink>
        <p className="mt-5 text-center text-[15px] text-gray-500">
          Not a driver yet?{" "}
          <span className="font-bold text-[#2FD98A]">Sign up</span>
        </p>
        <DemoHint>Password for this prototype: <b>{DEMO_PASSWORD}</b></DemoHint>
      </AuthShell>
    );
  }

  if (step === "otp") {
    const target =
      otpPurpose === "recover-new-email"
        ? newEmail.trim()
        : otpPurpose === "recover-new-phone"
          ? `+1 ${newPhone}`
          : otpPurpose === "recover-prove"
            ? `+1 ${maskPhone(ACCOUNT_ON_FILE.phone)}`
            : `+1 ${phone}`;
    return (
      <AuthShell>
        <AuthTitle>{OTP_TITLE}</AuthTitle>
        <AuthSubtitle>
          We sent a {OTP_LENGTH}-digit code to {target}
        </AuthSubtitle>
        <AuthCodeBoxes
          value={code}
          onChange={(v) => { setCode(v); setOtpError(undefined); }}
          length={OTP_LENGTH}
          invalid={otpError === OTP_ERROR_INVALID}
        />
        {/* ⛔ Both captured errors are red text under the thing they belong to.
            CAP-124's sits under the boxes; CAP-125's sits under the number
            field. Here the number field is a screen back, so the rate-limit
            message goes under the resend control that provoked it. */}
        {otpError === OTP_ERROR_INVALID && (
          <p className="mt-3 text-sm text-[#E5484D]">{OTP_ERROR_INVALID}</p>
        )}
        <AuthButton
          disabled={code.length < OTP_LENGTH}
          onClick={() => {
            if (code !== OTP_DEMO_CODE) {
              setOtpError(OTP_ERROR_INVALID);
              return;
            }
            if (otpPurpose === "sign-in") { signedIn(); return; }
            if (otpPurpose === "recover-prove") { go("recover-update"); return; }
            if (otpPurpose === "recover-new-email") {
              signedIn(`Email updated to ${newEmail.trim()}`);
              return;
            }
            signedIn(`Phone number updated to +1 ${newPhone}`);
          }}
        >
          Verify
        </AuthButton>
        <button
          type="button"
          onClick={() => {
            if (resendIn > 0) { setOtpError(OTP_ERROR_RATE_LIMIT); return; }
            setResendIn(OTP_RESEND_SECONDS);
            setOtpError(undefined);
          }}
          className="mx-auto mt-6 block text-[15px] text-gray-500"
        >
          {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
        </button>
        {otpError === OTP_ERROR_RATE_LIMIT && (
          <p className="mt-2 text-center text-sm text-[#E5484D]">{OTP_ERROR_RATE_LIMIT}</p>
        )}
        <AuthLink
          className="mt-5"
          onClick={() =>
            go(
              otpPurpose === "sign-in"
                ? "signin-phone"
                : otpPurpose === "recover-prove"
                  ? "recover-identify"
                  : "recover-update",
            )
          }
        >
          {otpPurpose === "sign-in" ? "Change phone number" : "Back"}
        </AuthLink>
        <DemoHint>Code for this prototype: <b>{OTP_DEMO_CODE}</b></DemoHint>
      </AuthShell>
    );
  }

  if (step === "reset") {
    return (
      <AuthShell>
        <AuthTitle>{RESET_TITLE}</AuthTitle>
        <AuthSubtitle>{RESET_SUBTITLE}</AuthSubtitle>
        <AuthField label="Email">
          <AuthInput
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            inputMode="email"
          />
        </AuthField>
        <AuthButton
          disabled={!isEmailShaped(email)}
          onClick={() =>
            toast({
              title: "Reset instructions sent",
              description: `Check ${maskEmail(email)} for a link.`,
            })
          }
        >
          Reset Password
        </AuthButton>

        {/* ⭐⭐ THE PROPOSAL. Two lines of copy on an otherwise replicated
            screen, and they are the whole of half A's change to production.
            This is the screen where a driver without their inbox has just run
            out of road: the sentence above promises a link they cannot read.

            ⛔ Gated — a new feature must not appear in another prototype. */}
        {showProposals ? (
          <div className="mt-8 rounded-2xl border border-[#2FD98A] bg-[#F2FDF8] p-4 text-center">
            <p className="text-[15px] text-gray-700">{RECOVERY_LINK_PROMPT}</p>
            <AuthLink className="mt-2" onClick={() => go("recover-identify")}>
              {RECOVERY_LINK_LABEL}
            </AuthLink>
          </div>
        ) : null}

        <AuthLink className="mt-6" onClick={() => go("signin-email")}>
          Sign in
        </AuthLink>
      </AuthShell>
    );
  }

  if (step === "recover-identify") {
    /* Either contact identifies the account — the driver knows what it was,
       they simply cannot receive on it any more. */
    const identified = isEmailShaped(email) || isPhoneShaped(email);
    return (
      <AuthShell>
        <AuthTitle>Recover your account</AuthTitle>
        <AuthSubtitle>
          Tell us which account this is, then prove it is yours one of two ways.
        </AuthSubtitle>

        <AuthField label="Email or phone number on file">
          <AuthInput
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="The one you can no longer use"
            inputMode="email"
          />
        </AuthField>
        {/* ⚠️ "Can no longer use" is NOT "cannot remember". A driver whose work
            address was deactivated still knows what it was — that distinction is
            why this screen can ask for it at all. */}

        {/* ⛔ Both choices stay disabled until the account has been named.
            The subtitle promises "tell us which account this is, THEN prove it
            is yours" — and the first build let you skip straight to the proof
            with the field empty, which is the screen contradicting its own
            instruction. Found by walking; no gate can see it. */}
        <div className="mt-8 space-y-3">
          <ProofChoice
            title="I know my password"
            body="Fastest. Nothing has to be delivered anywhere."
            disabled={!identified}
            onClick={() => go("recover-password")}
          />
          <ProofChoice
            title={`Send a code to ${maskPhone(ACCOUNT_ON_FILE.phone)}`}
            body="The number already on your account — not a new one."
            disabled={!identified}
            onClick={() => openOtp("recover-prove")}
          />
        </div>

        {/* ⛔ The floor, and it is honest. Someone with no password, no inbox
            and no handset has produced nothing the app can check. An OTP to a
            NEW number would prove that number exists, not that they own the
            account — and an email address is not a secret, so accepting it
            would hand anyone who knows one a driver account that gets paid. */}
        <p className="mt-8 text-center text-[15px] text-gray-500">
          {RECOVERY_FLOOR_PROMPT}
        </p>
        <AuthLink
          className="mt-1"
          onClick={() => toast({ title: "Contact Support", description: RECOVERY_FLOOR_LABEL })}
        >
          Contact Support
        </AuthLink>

        <AuthLink className="mt-6" onClick={() => go("reset")}>
          Back
        </AuthLink>
      </AuthShell>
    );
  }

  if (step === "recover-password") {
    return (
      <AuthShell>
        <AuthTitle>Confirm your password</AuthTitle>
        <AuthSubtitle>
          This is what tells us the account is yours, so we can change what you
          have lost access to.
        </AuthSubtitle>
        <AuthField label="Current password" error={error}>
          <AuthInput
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(undefined); }}
            placeholder="Enter your password"
            type="password"
            autoComplete="current-password"
          />
        </AuthField>
        <AuthButton
          disabled={password.length === 0}
          onClick={() => {
            if (password !== DEMO_PASSWORD) {
              setError("That password is not correct.");
              return;
            }
            go("recover-update");
          }}
        >
          Continue
        </AuthButton>
        <AuthLink className="mt-6" onClick={() => go("recover-identify")}>
          Back
        </AuthLink>
        <DemoHint>Password for this prototype: <b>{DEMO_PASSWORD}</b></DemoHint>
      </AuthShell>
    );
  }

  // recover-update
  const emailReady =
    isEmailShaped(newEmail) && newEmail.trim() === newEmailAgain.trim();
  return (
    <AuthShell>
      <AuthTitle>What should we change?</AuthTitle>
      <AuthSubtitle>
        You are verified. Set the detail you have lost access to and we will sign
        you in with it.
      </AuthSubtitle>

      <div className="mt-7 flex gap-2 rounded-xl bg-gray-100 p-1">
        {(["email", "phone"] as const).map((which) => (
          <button
            key={which}
            type="button"
            onClick={() => { setUpdating(which); setError(undefined); }}
            className={
              updating === which
                ? "flex-1 rounded-lg bg-white py-2.5 text-[15px] font-bold text-gray-900 shadow-sm"
                : "flex-1 rounded-lg py-2.5 text-[15px] font-semibold text-gray-500"
            }
          >
            {which === "email" ? "Email" : "Phone number"}
          </button>
        ))}
      </div>

      {updating === "email" ? (
        <>
          <p className="mt-6 text-[15px] text-gray-500">
            Currently {maskEmail(ACCOUNT_ON_FILE.email)}
          </p>
          <AuthField label="New email">
            <AuthInput
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Enter your new email"
              inputMode="email"
            />
          </AuthField>
          {/* ⛔ Typed twice is a TYPO GUARD, not a proof of anything. There is
              no inbox here to confirm against, so the second field is the only
              thing standing between a slip of the thumb and a new lockout. */}
          <AuthField
            label="Confirm new email"
            error={
              newEmailAgain.length > 0 && newEmail.trim() !== newEmailAgain.trim()
                ? "These do not match."
                : undefined
            }
          >
            <AuthInput
              value={newEmailAgain}
              onChange={(e) => setNewEmailAgain(e.target.value)}
              placeholder="Type it again"
              inputMode="email"
            />
          </AuthField>
          {/* ⛔ Typed twice proves the driver typed the same thing twice. It
              does not prove the address exists — and an address mistyped the
              same way twice is a lockout the app confirmed on its way out. The
              code sent TO IT is the only step that proves it can be reached. */}
          <AuthButton disabled={!emailReady} onClick={() => openOtp("recover-new-email")}>
            Send code
          </AuthButton>
        </>
      ) : (
        <>
          <p className="mt-6 text-[15px] text-gray-500">
            Currently {maskPhone(ACCOUNT_ON_FILE.phone)}
          </p>
          <AuthField label="New phone number">
            <AuthPhoneInput
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder={PHONE_PLACEHOLDER}
              inputMode="tel"
            />
          </AuthField>
          <AuthButton
            disabled={!isPhoneShaped(newPhone)}
            onClick={() => openOtp("recover-new-phone")}
          >
            Send code
          </AuthButton>
        </>
      )}

      <AuthLink className="mt-6" onClick={() => go("recover-identify")}>
        Back
      </AuthLink>
    </AuthShell>
  );
}

function ProofChoice({
  title, body, disabled, onClick,
}: {
  title: string;
  body: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={
        disabled
          ? "w-full rounded-2xl border border-gray-200 bg-gray-50 p-4 text-left"
          : "w-full rounded-2xl border border-gray-300 bg-white p-4 text-left"
      }
    >
      <p className={disabled ? "text-[16px] font-bold text-gray-400" : "text-[16px] font-bold text-gray-900"}>
        {title}
      </p>
      <p className={disabled ? "mt-1 text-sm text-gray-400" : "mt-1 text-sm text-gray-500"}>
        {body}
      </p>
    </button>
  );
}

/**
 * ⚠️ Says out loud that a value is a demo stand-in. The alternative is a screen
 * that silently cannot be got past, which reads as the prototype being broken.
 */
function DemoHint({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-8 text-center text-xs text-gray-400">{children}</p>
  );
}
