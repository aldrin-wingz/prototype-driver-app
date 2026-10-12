"use client";

import { useState } from "react";
import { ChevronRight, Mail, KeyRound, Smartphone } from "lucide-react";
import { Header } from "@/components/driver/header";
import { BottomNav } from "@/components/driver/bottom-nav";
import { useToast } from "@/hooks/use-toast";
import {
  AuthButton, AuthCodeBoxes, AuthField, AuthInput, AuthPhoneInput,
} from "@/components/driver/auth/auth-shell";
import {
  ACCOUNT_ON_FILE, changeRuleFor, isEmailShaped, isPasswordShaped,
  isPhoneShaped, maskEmail, maskPhone, MIN_PASSWORD_CHARS, OTP_CHANNELS,
  OTP_DEMO_CODE, OTP_ERROR_INVALID, OTP_LENGTH, PHONE_PLACEHOLDER,
  type AccountField,
} from "@/lib/driver-data/account-self-service";

/**
 * Catalogue row 15, half B — the post-auth half.
 *
 * Reached from the PROPOSED twelfth Options row, which only exists while row 15
 * is the focused solution. ⚠️ Nothing on this screen is captured: the Options
 * menu has no account row and there is no settings screen for email, phone or
 * password anywhere in the vault. CAP-237/238 are named "Profile" and are the
 * **Onboarding Tool**, agent-side — not this app.
 *
 * ⛔⛔ **Each row's verification rule is the point of the row**, and the rules
 * live in `changeRuleFor`, not here. Identity and value are two different
 * questions: something proves the person, something else proves the new value,
 * and they are never the same factor. An OTP to a NEW number proves the number
 * exists and someone is holding it — it says nothing about who that is.
 */

const FIELDS: Array<{
  field: AccountField;
  label: string;
  icon: typeof Mail;
  current: string;
}> = [
  { field: "email", label: "Email", icon: Mail, current: maskEmail(ACCOUNT_ON_FILE.email) },
  { field: "password", label: "Password", icon: KeyRound, current: "••••••••" },
  { field: "phone", label: "Phone number", icon: Smartphone, current: maskPhone(ACCOUNT_ON_FILE.phone) },
];

export default function AccountPage() {
  const { toast } = useToast();
  const [open, setOpen] = useState<AccountField | null>(null);

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F6F8] pb-20">
      <Header
        title={open ? FIELDS.find((f) => f.field === open)!.label : "Account"}
        showBack
        showMessages={false}
        showFilter={false}
        showRefresh={false}
      />

      <main className="flex-1 px-4 pt-4">
        {open === null ? (
          <>
            <p className="pb-4 text-[15px] text-gray-600">
              Change these yourself. You will not need to call Support.
            </p>
            <div className="space-y-3">
              {FIELDS.map(({ field, label, icon: Icon, current }) => (
                <button
                  key={field}
                  type="button"
                  onClick={() => setOpen(field)}
                  className="flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-sm"
                >
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-gray-200">
                    <Icon className="h-6 w-6 text-gray-900" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[17px] font-semibold text-gray-900">{label}</p>
                    {/* ⛔ Masked. A settings screen that prints a whole contact
                        detail back hands it to anyone holding an unlocked
                        handset, which is the exact threat the password rule
                        below exists for. */}
                    <p className="text-sm text-gray-600">{current}</p>
                  </div>
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[#34D399] text-[#34D399]">
                    <ChevronRight className="h-5 w-5" />
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            {open === "email" && <ChangeEmail onDone={() => setOpen(null)} />}
            {open === "password" && <ChangePassword onDone={() => setOpen(null)} />}
            {open === "phone" && <ChangePhone onDone={() => setOpen(null)} />}
            <button
              type="button"
              onClick={() => setOpen(null)}
              className="mx-auto mt-6 block text-[15px] font-bold text-[#2FD98A]"
            >
              Cancel
            </button>
          </div>
        )}

        {open === null && (
          <p className="py-8 text-center text-sm text-gray-500">
            Signed in as {ACCOUNT_ON_FILE.name}
          </p>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

/* ---------------------------------------------------------------- changes */

/**
 * ⛔⛔ These three live at MODULE scope, and that is not a style choice.
 *
 * Declared inside `AccountPage` they were re-created on every render, so React
 * saw a new component type each keystroke, unmounted the subtree and remounted
 * it — the field lost focus and its own state after a single character. The
 * screen type-checked, built and rendered perfectly; it was simply unusable.
 * No gate here can see it. Caught by reading the diff before walking it.
 */

/**
 * ⚠️ Identity proof is the signed-in session. The second field is a TYPO
 * GUARD, not a proof — there is no inbox to confirm against, so it is the
 * only thing between a slip of the thumb and a self-inflicted lockout.
 */
function ChangeEmail({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const rule = changeRuleFor("email", "settings");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [sent, setSent] = useState(false);
  const matches = next.trim() === again.trim();
  return (
    <>
      <p className="text-[15px] text-gray-600">
        Currently {maskEmail(ACCOUNT_ON_FILE.email)}
      </p>
      <AuthField label="New email">
        <AuthInput
          value={next}
          onChange={(e) => { setNext(e.target.value); setSent(false); }}
          placeholder="Enter your new email"
          inputMode="email"
        />
      </AuthField>
      {/* ⛔ Typed twice is a TYPO GUARD and nothing more. The code step below is
          what proves the address exists — without it, an address mistyped the
          same way twice is a lockout the app confirmed on its way out. */}
      <AuthField
        label="Confirm new email"
        error={again.length > 0 && !matches ? "These do not match." : undefined}
      >
        <AuthInput
          value={again}
          onChange={(e) => { setAgain(e.target.value); setSent(false); }}
          placeholder="Type it again"
          inputMode="email"
        />
      </AuthField>

      {!sent ? (
        <AuthButton
          disabled={!(isEmailShaped(next) && matches)}
          onClick={() => setSent(true)}
        >
          Send code
        </AuthButton>
      ) : (
        <VerifyNewContact
          target={next.trim()}
          actionLabel="Verify and save"
          onVerified={() => {
            toast({
              title: "Email updated",
              description: `You will sign in with ${next.trim()} from now on.`,
            });
            onDone();
          }}
        />
      )}
      <RuleNote identity={rule.identityProofs} values={rule.valueConfirmations} />
    </>
  );
}

/**
 * ⭐ User direction: *"if I change password confirm with Phone OTP or email
 * OTP."* So this row asks for neither the session nor the current password.
 *
 * ⛔⛔ Asking for the CURRENT password was the first build, and it was wrong in
 * a way worth keeping written down: it locked out the only driver who needs
 * this screen. Someone who remembers their password does not need to reset it;
 * someone who has forgotten it cannot answer. It read as security and worked as
 * a wall in front of the use case.
 */
function ChangePassword({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const rule = changeRuleFor("password", "settings");
  const [next, setNext] = useState("");
  const [again, setAgain] = useState("");
  const [channel, setChannel] = useState<AccountField | null>(null);
  const matches = next === again;
  const ready = isPasswordShaped(next) && matches;
  return (
    <>
      <AuthField label="New password">
        <AuthInput
          value={next}
          onChange={(e) => { setNext(e.target.value); setChannel(null); }}
          type="password"
          placeholder={`At least ${MIN_PASSWORD_CHARS} characters`}
          autoComplete="new-password"
        />
      </AuthField>
      <AuthField
        label="Confirm new password"
        error={again.length > 0 && !matches ? "These do not match." : undefined}
      >
        <AuthInput
          value={again}
          onChange={(e) => { setAgain(e.target.value); setChannel(null); }}
          type="password"
          placeholder="Type it again"
          autoComplete="new-password"
        />
      </AuthField>

      {channel === null ? (
        <>
          {/* ⛔ A contact ALREADY ON FILE, never one being set. Both options,
              because a code to the phone arrives on the same handset a thief is
              already holding — the email does not. */}
          <p className="mt-7 text-[15px] font-bold text-gray-900">
            Where should we send your code?
          </p>
          <div className="mt-2 space-y-2">
            {OTP_CHANNELS.map((option) => (
              <button
                key={option}
                type="button"
                disabled={!ready}
                onClick={() => setChannel(option)}
                className={
                  ready
                    ? "w-full rounded-xl border border-gray-300 bg-white px-4 py-3.5 text-left text-[16px] text-gray-900"
                    : "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3.5 text-left text-[16px] text-gray-400"
                }
              >
                {option === "phone"
                  ? `Text ${maskPhone(ACCOUNT_ON_FILE.phone)}`
                  : `Email ${maskEmail(ACCOUNT_ON_FILE.email)}`}
              </button>
            ))}
          </div>
        </>
      ) : (
        <VerifyNewContact
          target={
            channel === "phone"
              ? maskPhone(ACCOUNT_ON_FILE.phone)
              : maskEmail(ACCOUNT_ON_FILE.email)
          }
          actionLabel="Verify and save"
          onVerified={() => {
            toast({ title: "Password updated", description: "Use the new one next time you sign in." });
            onDone();
          }}
        />
      )}
      <RuleNote identity={rule.identityProofs} values={rule.valueConfirmations} />
    </>
  );
}

/**
 * ⭐ The same code step as the email path, from the same component. That is
 * what makes the user's *"in both the sign in/login and in the settings"*
 * literal rather than two builds that merely look alike.
 */
function ChangePhone({ onDone }: { onDone: () => void }) {
  const { toast } = useToast();
  const rule = changeRuleFor("phone", "settings");
  const [next, setNext] = useState("");
  const [sent, setSent] = useState(false);
  return (
    <>
      <p className="text-[15px] text-gray-600">
        Currently {maskPhone(ACCOUNT_ON_FILE.phone)}
      </p>
      <AuthField label="New phone number">
        <AuthPhoneInput
          value={next}
          onChange={(e) => { setNext(e.target.value); setSent(false); }}
          placeholder={PHONE_PLACEHOLDER}
          inputMode="tel"
        />
      </AuthField>
      {!sent ? (
        <AuthButton disabled={!isPhoneShaped(next)} onClick={() => setSent(true)}>
          Send code
        </AuthButton>
      ) : (
        <VerifyNewContact
          target={`+1 ${next}`}
          actionLabel="Verify and save"
          onVerified={() => {
            toast({ title: "Phone number updated", description: `Your number is now +1 ${next}.` });
            onDone();
          }}
        />
      )}
      <RuleNote identity={rule.identityProofs} values={rule.valueConfirmations} />
    </>
  );
}

/**
 * Prints the rule the screen is obeying, in words.
 *
 * ⚠️ Reviewer-facing, and deliberately so: the verification rule is the
 * decision being proposed here, and a screen that just works gives a reviewer
 * nothing to agree or disagree with.
 */
const PROOF_WORDS: Record<string, string> = {
  "current-password": "your current password",
  "otp-to-contact-on-file": "a code sent to the contact already on your account",
  "signed-in-session": "you are already signed in on this device",
  "otp-to-new-contact": "a code sent to the new one",
  "typed-twice": "you typed it twice and they matched",
};

function words(factors: string[]): string {
  return factors.map((f) => PROOF_WORDS[f]).join(", then ");
}

function RuleNote({ identity, values }: { identity: string[]; values: string[] }) {
  return (
    <p className="mt-4 border-t border-gray-100 pt-4 text-xs leading-relaxed text-gray-500">
      <b>Who you are</b> is checked by {words(identity)}. <b>The new value</b>{" "}
      is checked by {words(values)}.
    </p>
  );
}

/**
 * ⛔ The last step of every CONTACT change, in both halves and on both fields.
 *
 * Typing an address twice proves the driver typed the same thing twice — it
 * does not prove the address exists. An email mistyped identically twice is a
 * lockout the app just confirmed on its way out. A code sent to the new value
 * is the only step that proves it can be reached.
 *
 * ⭐ One component, so the email and phone paths cannot drift apart.
 */
function VerifyNewContact({
  target, actionLabel, onVerified,
}: {
  target: string;
  actionLabel: string;
  onVerified: () => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | undefined>();
  return (
    <>
      <p className="mt-6 text-[15px] text-gray-600">
        Enter the {OTP_LENGTH}-digit code we sent to {target}
      </p>
      <AuthCodeBoxes
        value={code}
        onChange={(v) => { setCode(v); setError(undefined); }}
        length={OTP_LENGTH}
        invalid={Boolean(error)}
      />
      {error && <p className="mt-3 text-sm text-[#E5484D]">{error}</p>}
      <AuthButton
        disabled={code.length < OTP_LENGTH}
        onClick={() => {
          if (code !== OTP_DEMO_CODE) { setError(OTP_ERROR_INVALID); return; }
          onVerified();
        }}
      >
        {actionLabel}
      </AuthButton>
      <p className="mt-6 text-center text-xs text-gray-400">
        Code for this prototype: <b>{OTP_DEMO_CODE}</b>
      </p>
    </>
  );
}
