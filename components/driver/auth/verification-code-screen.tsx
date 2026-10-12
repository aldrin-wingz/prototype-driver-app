"use client";

import { useEffect, useState } from "react";
import {
  AuthButton, AuthCodeBoxes, AuthLink, AuthShell, AuthSubtitle, AuthTitle,
} from "./auth-shell";
import {
  OTP_DEMO_CODE, OTP_ERROR_INVALID, OTP_ERROR_RATE_LIMIT, OTP_LENGTH,
  OTP_RESEND_SECONDS, OTP_TITLE,
} from "@/lib/driver-data/account-self-service";

/**
 * CAP-123 / CAP-124 / CAP-125 — **the** verification code screen.
 *
 * ⭐ User direction, 2026-10-13: *"All cases the OTP should copy what we have in
 * sign up and be its own page with a resend option."* So this is one component
 * rendering one full page, and every path that needs a code uses it — signing
 * in, proving a recovery, confirming a new email, confirming a new phone, and
 * confirming a password change. Five entry points, one screen.
 *
 * ⛔ It owns the code check, the countdown and BOTH captured errors rather than
 * taking them as props. The alternative — each caller doing its own comparison
 * — is how the invalid-code message ends up worded five slightly different
 * ways, and how one path quietly forgets the rate limit altogether.
 *
 * ⚠️ It renders `AuthShell`, so it takes over the viewport even inside the
 * signed-in app. That is the point of "its own page": a code screen folded into
 * a settings card is a different screen that happens to look similar.
 */
export function VerificationCodeScreen({
  target, actionLabel = "Verify", secondaryLabel, onSecondary, onVerified,
}: {
  /** Printed in the subtitle — already masked or formatted by the caller. */
  target: string;
  actionLabel?: string;
  secondaryLabel: string;
  onSecondary: () => void;
  onVerified: () => void;
}) {
  const [code, setCode] = useState("");
  const [resendIn, setResendIn] = useState(OTP_RESEND_SECONDS);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  return (
    <AuthShell>
      <AuthTitle>{OTP_TITLE}</AuthTitle>
      <AuthSubtitle>
        We sent a {OTP_LENGTH}-digit code to {target}
      </AuthSubtitle>

      <AuthCodeBoxes
        value={code}
        onChange={(next) => { setCode(next); setError(undefined); }}
        length={OTP_LENGTH}
        invalid={error === OTP_ERROR_INVALID}
      />
      {/* CAP-124 — red, under the boxes it belongs to. */}
      {error === OTP_ERROR_INVALID && (
        <p className="mt-3 text-sm text-[#E5484D]">{OTP_ERROR_INVALID}</p>
      )}

      <AuthButton
        disabled={code.length < OTP_LENGTH}
        onClick={() => {
          if (code !== OTP_DEMO_CODE) { setError(OTP_ERROR_INVALID); return; }
          onVerified();
        }}
      >
        {actionLabel}
      </AuthButton>

      {/* ⛔ The resend is part of the screen, not an optional extra. Without it
          a driver whose code never arrives has no move but to start again. */}
      <button
        type="button"
        onClick={() => {
          if (resendIn > 0) { setError(OTP_ERROR_RATE_LIMIT); return; }
          setResendIn(OTP_RESEND_SECONDS);
          setError(undefined);
        }}
        className="mx-auto mt-6 block text-[15px] text-gray-500"
      >
        {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
      </button>
      {/* CAP-125 — a SECOND, distinct failure, worded differently by production
          and shown against the control that provoked it. */}
      {error === OTP_ERROR_RATE_LIMIT && (
        <p className="mt-2 text-center text-sm text-[#E5484D]">{OTP_ERROR_RATE_LIMIT}</p>
      )}

      <AuthLink className="mt-5" onClick={onSecondary}>
        {secondaryLabel}
      </AuthLink>

      <p className="mt-8 text-center text-xs text-gray-400">
        Code for this prototype: <b>{OTP_DEMO_CODE}</b>
      </p>
    </AuthShell>
  );
}
