"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import {
  AuthButton, AuthField, AuthInput, AuthLink, AuthPhoneInput,
  AuthShell, AuthSubtitle, AuthTitle,
} from "@/components/driver/auth/auth-shell";
import { VerificationCodeScreen } from "@/components/driver/auth/verification-code-screen";
import {
  DEMO_PASSWORD, isEmailShaped, isPhoneShaped, maskEmail, PHONE_PLACEHOLDER,
  RESET_SUBTITLE, RESET_TITLE, SIGN_IN_EMAIL_SUBTITLE, SIGN_IN_PHONE_SUBTITLE,
  SIGN_IN_TITLE, type LoginStep,
} from "@/lib/driver-data/account-self-service";

/**
 * The sign-in screens — **replication only**.
 *
 * ⏸️ Row 15's pre-auth proposal was built here and then removed on 2026-10-13
 * by user direction: *"lets remove the flow in the sign in for now."* What is
 * left is four screens copied from captures, carrying nothing of their own:
 * `signin-phone` (CAP-122), `signin-email` (CAP-126), `otp` (CAP-123/124/125)
 * and `reset` (CAP-127).
 *
 * ⛔ **So this route is no longer row 15's entry point.** It exists because the
 * CAPTURED Logout row lands on a sign-in screen in production, and until this
 * slice there was nowhere for it to go. That is replication catching up.
 *
 * ⚠️ It still reverses `references/captures/INDEX.md` §07, which records the
 * auth screens as deliberately not built into the base — on a thinner argument
 * now that the proposal is gone. The boundary §07 protected is kept by scope:
 * this route signs nobody in and gates nothing.
 *
 * ⛔⛔ CAP-127's dead end is therefore replicated WITHOUT its answer. Reset
 * Password still promises instructions sent to an inbox the driver may have
 * lost, and nothing on the screen offers a way round it. That is what
 * production does today, and it is where row 15's 567 calls start.
 */
export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState<LoginStep>("signin-phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | undefined>();

  function go(next: LoginStep) {
    setError(undefined);
    setStep(next);
  }

  function signedIn() {
    toast({
      title: "Welcome back",
      description: "Signed in — the prototype has no session; this is the demo landing.",
    });
    router.push("/");
  }

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
        <AuthButton disabled={!isPhoneShaped(phone)} onClick={() => go("otp")}>
          Send code
        </AuthButton>
        <AuthLink className="mt-6" onClick={() => go("signin-email")}>
          Sign in with email instead
        </AuthLink>
        <p className="mt-5 text-center text-[15px] text-gray-500">
          Not a driver yet? <span className="font-bold text-[#2FD98A]">Sign up</span>
        </p>
      </AuthShell>
    );
  }

  if (step === "signin-email") {
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
        {/* ⚠️ Production's plain eye toggle, kept exactly as CAP-126 shows it.
            The reveal-last-character field is a PROPOSAL and lives only on the
            settings password screen — a replicated screen cannot be improved
            quietly. */}
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
          disabled={!(isEmailShaped(email) && password.length > 0)}
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
          Not a driver yet? <span className="font-bold text-[#2FD98A]">Sign up</span>
        </p>
        <p className="mt-8 text-center text-xs text-gray-400">
          Password for this prototype: <b>{DEMO_PASSWORD}</b>
        </p>
      </AuthShell>
    );
  }

  if (step === "otp") {
    return (
      <VerificationCodeScreen
        purpose="sign-in"
        target={`+1 ${phone}`}
        secondaryLabel="Change phone number"
        onSecondary={() => go("signin-phone")}
        onVerified={signedIn}
      />
    );
  }

  // reset — CAP-127, replicated with the dead end intact.
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
      <AuthLink className="mt-6" onClick={() => go("signin-email")}>
        Sign in
      </AuthLink>
    </AuthShell>
  );
}
