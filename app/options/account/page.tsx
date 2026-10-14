"use client";

import { useState } from "react";
import { ChevronRight, Mail, KeyRound, Smartphone } from "lucide-react";
import { Header } from "@/components/driver/header";
import { BottomNav } from "@/components/driver/bottom-nav";
import { useToast } from "@/hooks/use-toast";
import { AuthButton, AuthField, AuthInput, AuthPhoneInput } from "@/components/driver/auth/auth-shell";
import { MaskedPasswordInput } from "@/components/driver/auth/masked-password-input";
import { VerificationCodeScreen } from "@/components/driver/auth/verification-code-screen";
import {
  ACCOUNT_ON_FILE, changeRuleFor, CODE_PURPOSE_FOR, isEmailShaped, isPasswordShaped,
  isPhoneShaped, maskEmail, maskPhone, MIN_PASSWORD_CHARS, OTP_CHANNELS,
  OTP_LENGTH, PHONE_PLACEHOLDER, type AccountField,
} from "@/lib/driver-data/account-self-service";

/**
 * Catalogue row 16, half B — the post-auth half.
 *
 * Reached from the PROPOSED twelfth Options row, which only exists while row 16
 * is the focused solution. ⚠️ Nothing here is captured: the Options menu has no
 * account row and there is no settings screen for email, phone or password
 * anywhere in the vault. CAP-237/238 are named "Profile" and are the
 * **Onboarding Tool**, agent-side — not this app.
 *
 * ⛔⛔ **Each field's verification rule is the point of the field**, and the
 * rules live in `changeRuleFor`, not here. Identity and value are two different
 * questions: one proves the person, the other proves the new value, and they
 * are never the same factor. A code to a NEW contact proves the contact exists
 * and someone is holding it — nothing about who that is.
 *
 * ⭐ **One step per page**, user direction 2026-10-13: the channel picker and
 * the code screen are each their own page rather than sections growing inside a
 * card. The code screen is the SAME component the sign-in flow uses.
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

/**
 * ⛔ The draft lives at PAGE level, not inside each field's form.
 *
 * The code screen takes over the whole viewport, so a form holding its own
 * draft would unmount the moment the code was sent and come back empty when the
 * driver tapped Back. Lifting it is what makes "its own page" survivable.
 */
type Step = "form" | "channel" | "code";

export default function AccountPage() {
  const { toast } = useToast();

  const [field, setField] = useState<AccountField | null>(null);
  const [step, setStep] = useState<Step>("form");
  const [channel, setChannel] = useState<AccountField | null>(null);

  const [email, setEmail] = useState("");
  const [emailAgain, setEmailAgain] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [passwordAgain, setPasswordAgain] = useState("");

  function openField(next: AccountField) {
    setField(next);
    setStep("form");
    setChannel(null);
    setEmail(""); setEmailAgain(""); setPhone("");
    setPassword(""); setPasswordAgain("");
  }

  function finish(title: string, description: string) {
    toast({ title, description });
    setField(null);
    setStep("form");
  }

  /* ------------------------------------------------------------- the code */

  if (field !== null && step === "code") {
    const target =
      field === "email" ? email.trim()
      : field === "phone" ? `+1 ${phone}`
      : channel === "phone" ? maskPhone(ACCOUNT_ON_FILE.phone)
      : maskEmail(ACCOUNT_ON_FILE.email);

    return (
      <VerificationCodeScreen
        purpose={CODE_PURPOSE_FOR[field]}
        target={target}
        actionLabel="Verify and save"
        secondaryLabel="Back"
        onSecondary={() => setStep(field === "password" ? "channel" : "form")}
        onVerified={() => {
          if (field === "email") {
            finish("Email updated", `You will sign in with ${email.trim()} from now on.`);
          } else if (field === "phone") {
            finish("Phone number updated", `Your number is now +1 ${phone}.`);
          } else {
            finish("Password updated", "Use the new one next time you sign in.");
          }
        }}
      />
    );
  }

  /* -------------------------------------------------------- the app screen */

  const title =
    field === null ? "Account"
    : step === "channel" ? "Verify it's you"
    : FIELDS.find((f) => f.field === field)!.label;

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F6F8] pb-20">
      <Header title={title} showBack showMessages={false} showFilter={false} showRefresh={false} />

      <main className="flex-1 px-4 pt-4">
        {field === null ? (
          <>
            <p className="pb-4 text-[15px] text-gray-600">
              Change these yourself. You will not need to call Support.
            </p>
            <div className="space-y-3">
              {FIELDS.map(({ field: id, label, icon: Icon, current }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => openField(id)}
                  className="flex w-full items-center gap-4 rounded-2xl bg-white p-4 text-left shadow-sm"
                >
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-gray-200">
                    <Icon className="h-6 w-6 text-gray-900" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[17px] font-semibold text-gray-900">{label}</p>
                    {/* ⛔ Masked. A settings screen that prints a whole contact
                        detail back hands it to anyone holding an unlocked
                        handset — the exact threat the code step exists for. */}
                    <p className="text-sm text-gray-600">{current}</p>
                  </div>
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-[#34D399] text-[#34D399]">
                    <ChevronRight className="h-5 w-5" />
                  </span>
                </button>
              ))}
            </div>
            <p className="py-8 text-center text-sm text-gray-500">
              Signed in as {ACCOUNT_ON_FILE.name}
            </p>
          </>
        ) : (
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            {step === "channel" ? (
              <ChannelPage onPick={(pick) => { setChannel(pick); setStep("code"); }} />
            ) : field === "email" ? (
              <EmailForm
                value={email} again={emailAgain}
                onValue={setEmail} onAgain={setEmailAgain}
                onContinue={() => setStep("code")}
              />
            ) : field === "phone" ? (
              <PhoneForm value={phone} onValue={setPhone} onContinue={() => setStep("code")} />
            ) : (
              <PasswordForm
                value={password} again={passwordAgain}
                onValue={setPassword} onAgain={setPasswordAgain}
                onContinue={() => setStep("channel")}
              />
            )}
            <button
              type="button"
              onClick={() =>
                step === "channel" ? setStep("form") : setField(null)
              }
              className="mx-auto mt-6 block text-[15px] font-bold text-[#2FD98A]"
            >
              {step === "channel" ? "Back" : "Cancel"}
            </button>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

/* ---------------------------------------------------------------- the forms */

/**
 * ⛔⛔ Module scope, and that is not a style choice. Declared inside the page
 * these were re-created on every render, so React saw a new component type each
 * keystroke, unmounted the subtree and remounted it — the field lost focus and
 * its own state after a single character. It type-checked, built and rendered
 * perfectly; it was simply unusable, and no gate here can see it.
 */
function EmailForm({
  value, again, onValue, onAgain, onContinue,
}: {
  value: string; again: string;
  onValue: (v: string) => void; onAgain: (v: string) => void;
  onContinue: () => void;
}) {
  const rule = changeRuleFor("email");
  const matches = value.trim() === again.trim();
  return (
    <>
      <p className="text-[15px] text-gray-600">
        Currently {maskEmail(ACCOUNT_ON_FILE.email)}
      </p>
      <AuthField label="New email">
        <AuthInput
          value={value}
          onChange={(e) => onValue(e.target.value)}
          placeholder="Enter your new email"
          inputMode="email"
        />
      </AuthField>
      {/* ⛔ Typed twice is a TYPO GUARD and nothing more. The code step is what
          proves the address exists — without it, an address mistyped the same
          way twice is a lockout the app confirmed on its way out. */}
      <AuthField
        label="Confirm new email"
        error={again.length > 0 && !matches ? "These do not match." : undefined}
      >
        <AuthInput
          value={again}
          onChange={(e) => onAgain(e.target.value)}
          placeholder="Type it again"
          inputMode="email"
        />
      </AuthField>
      <AuthButton disabled={!(isEmailShaped(value) && matches)} onClick={onContinue}>
        Continue
      </AuthButton>
      <RuleNote identity={rule.identityProofs} values={rule.valueConfirmations} />
    </>
  );
}

function PhoneForm({
  value, onValue, onContinue,
}: {
  value: string; onValue: (v: string) => void; onContinue: () => void;
}) {
  const rule = changeRuleFor("phone");
  return (
    <>
      <p className="text-[15px] text-gray-600">
        Currently {maskPhone(ACCOUNT_ON_FILE.phone)}
      </p>
      <AuthField label="New phone number">
        <AuthPhoneInput
          value={value}
          onChange={(e) => onValue(e.target.value)}
          placeholder={PHONE_PLACEHOLDER}
          inputMode="tel"
        />
      </AuthField>
      <AuthButton disabled={!isPhoneShaped(value)} onClick={onContinue}>
        Continue
      </AuthButton>
      <RuleNote identity={rule.identityProofs} values={rule.valueConfirmations} />
    </>
  );
}

/**
 * ⭐ User direction: *"if I change password confirm with Phone OTP or email
 * OTP."* So this asks for neither the session nor the current password.
 *
 * ⛔⛔ Asking for the CURRENT password was the first build, and it was wrong in
 * a way worth keeping written down: it locked out the only driver who needs
 * this screen. Someone who remembers their password does not need to reset it;
 * someone who has forgotten it cannot answer. It read as security and worked as
 * a wall in front of the use case.
 */
function PasswordForm({
  value, again, onValue, onAgain, onContinue,
}: {
  value: string; again: string;
  onValue: (v: string) => void; onAgain: (v: string) => void;
  onContinue: () => void;
}) {
  const rule = changeRuleFor("password");
  const matches = value === again;
  return (
    <>
      <AuthField label="New password">
        <MaskedPasswordInput
          value={value}
          onChange={onValue}
          placeholder={`At least ${MIN_PASSWORD_CHARS} characters`}
          autoComplete="new-password"
        />
      </AuthField>
      <AuthField
        label="Confirm new password"
        error={again.length > 0 && !matches ? "These do not match." : undefined}
      >
        <MaskedPasswordInput
          value={again}
          onChange={onAgain}
          placeholder="Type it again"
          autoComplete="new-password"
        />
      </AuthField>
      <AuthButton disabled={!(isPasswordShaped(value) && matches)} onClick={onContinue}>
        Continue
      </AuthButton>
      <RuleNote identity={rule.identityProofs} values={rule.valueConfirmations} />
    </>
  );
}

/**
 * ⭐ Its own page, after Continue — user direction 2026-10-13, and the pick is
 * a SELECTION followed by Continue rather than a tap that fires.
 *
 * ⛔ The first build sent the code on tap. A code cannot be un-sent: a mis-tap
 * put the driver on a screen waiting for something delivered to the wrong
 * place, with the rate limit (CAP-125) between them and a second try. Two taps
 * to do something irreversible is the cheap fix.
 *
 * Both options are contacts ALREADY ON FILE. Neither is a contact being set: a
 * code to something just typed would prove that thing exists, not that the
 * account is theirs. The email sits beside the phone because a code to the
 * phone on file arrives on the same handset a thief is already holding.
 */
function ChannelPage({ onPick }: { onPick: (channel: AccountField) => void }) {
  const [chosen, setChosen] = useState<AccountField | null>(null);
  return (
    <>
      <p className="text-[15px] text-gray-600">
        We&apos;ll send a {OTP_LENGTH}-digit code to one of the contacts already
        on your account. Pick where.
      </p>
      <div className="mt-5 space-y-3">
        {OTP_CHANNELS.map((option) => {
          const selected = chosen === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => setChosen(option)}
              aria-pressed={selected}
              className={
                selected
                  ? "flex w-full items-center gap-3 rounded-2xl border-2 border-[#2FD98A] bg-[#F2FDF8] p-4 text-left"
                  : "flex w-full items-center gap-3 rounded-2xl border-2 border-gray-200 bg-white p-4 text-left"
              }
            >
              <span
                className={
                  selected
                    ? "mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-[6px] border-[#2FD98A]"
                    : "mt-0.5 h-5 w-5 flex-shrink-0 rounded-full border-2 border-gray-300"
                }
              />
              <span className="min-w-0">
                <span className="block text-[16px] font-bold text-gray-900">
                  {option === "phone" ? "Text message" : "Email"}
                </span>
                <span className="mt-1 block text-sm text-gray-500">
                  {option === "phone"
                    ? maskPhone(ACCOUNT_ON_FILE.phone)
                    : maskEmail(ACCOUNT_ON_FILE.email)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <AuthButton disabled={chosen === null} onClick={() => onPick(chosen!)}>
        Send code
      </AuthButton>
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
  return factors.map((factor) => PROOF_WORDS[factor]).join(", then ");
}

function RuleNote({ identity, values }: { identity: string[]; values: string[] }) {
  return (
    <p className="mt-4 border-t border-gray-100 pt-4 text-xs leading-relaxed text-gray-500">
      <b>Who you are</b> is checked by {words(identity)}. <b>The new value</b>{" "}
      is checked by {words(values)}.
    </p>
  );
}
