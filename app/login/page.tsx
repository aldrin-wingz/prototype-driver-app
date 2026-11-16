"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { driverTermsActions } from "@/lib/driver-terms/session";

/**
 * Sign in — FEATURE `prototype/driver-terms-acceptance`, built only so the T&C screen
 * has a login to follow. Replicated from captures `CAP-122` (phone number) and
 * `CAP-123` (verification code), shoot MRV-B2.
 *
 * ⚠️ Login is shipped but deliberately NOT in the base (base contract). This is a
 * demo: the number and code are prefilled, nothing is sent, and any code works.
 * "Sign in with email instead" and "Sign up" are not wired.
 */
const DEMO_PHONE = "(555) 010-0100";
const DEMO_CODE = "123456";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState(DEMO_PHONE);
  const [code, setCode] = useState(DEMO_CODE);

  const signIn = () => {
    driverTermsActions.logIn();
    router.replace("/");
  };

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-24">
        <div className="mb-8 flex flex-col items-center gap-3">
          {/* Emblem over lettering, as in CAP-122. The repo's wordmark has WHITE lettering (for
              dark backgrounds), so the lettering is a recoloured copy in public/driver-terms/. */}
          <Image src="/wingz-emblem.svg" alt="" width={84} height={84} />
          <Image src="/driver-terms/wingz-lettering.svg" alt="Wingz" width={128} height={50} className="-mt-4" />
        </div>

        {step === "phone" ? (
          <>
            <h1 className="mb-2 text-center text-[26px] font-bold text-[#111111]">Sign in to Wingz</h1>
            <p className="mb-8 text-center text-[15px] text-[#6B7280]">Enter your phone number and we&apos;ll send you a verification code.</p>
            <label htmlFor="phone" className="mb-2 text-[15px] font-semibold text-[#111111]">Phone number</label>
            <div className="mb-6 flex items-center gap-3 rounded-xl border border-[#D9D9D9] px-4 py-3.5">
              <span className="font-semibold text-[#111111]">+1</span>
              <input
                id="phone"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-transparent text-[16px] text-[#111111] outline-none"
              />
            </div>
            <button
              type="button"
              disabled={!phone.trim()}
              onClick={() => setStep("code")}
              className="min-h-[52px] rounded-xl bg-[#16CFA9] text-[17px] font-semibold text-white disabled:bg-[#00ECAF]/30"
            >
              Send code
            </button>
            <p className="mt-6 text-center text-[15px] font-semibold text-[#16CFA9]">Sign in with email instead</p>
            <p className="mt-4 text-center text-[15px] text-[#6B7280]">Not a driver yet? <span className="font-semibold text-[#16CFA9]">Sign up</span></p>
          </>
        ) : (
          <>
            <h1 className="mb-2 text-center text-[26px] font-bold text-[#111111]">Enter verification code</h1>
            <p className="mb-8 text-center text-[15px] text-[#6B7280]">We sent a 6-digit code to +1 {phone}</p>
            <label htmlFor="code" className="sr-only">Verification code</label>
            <input
              id="code"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="mb-6 w-full rounded-xl border border-[#16CFA9] px-4 py-3.5 text-center font-mono text-[22px] tracking-[0.6em] text-[#111111] outline-none"
            />
            <button
              type="button"
              disabled={code.length !== 6}
              onClick={signIn}
              data-testid="login-verify"
              className="min-h-[52px] rounded-xl bg-[#16CFA9] text-[17px] font-semibold text-white disabled:bg-[#00ECAF]/30"
            >
              Verify
            </button>
            <button type="button" onClick={() => setStep("phone")} className="mt-6 text-center text-[15px] font-semibold text-[#16CFA9]">
              Change phone number
            </button>
          </>
        )}

        <p className="mt-10 rounded-lg border border-dashed border-[#D9D9D9] bg-[#F5F7F8] p-3 text-center text-[12px] text-[#5D5D5D]">
          Prototype sign-in: the number and code are prefilled and nothing is sent.
        </p>
      </main>
    </div>
  );
}
