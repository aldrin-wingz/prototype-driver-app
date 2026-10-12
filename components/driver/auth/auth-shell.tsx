"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The visual language shared by every screen in `references/captures/INDEX.md`
 * §07 — CAP-121 … CAP-128, CAP-143/144.
 *
 * White ground · centred emblem over wordmark · bold black title · grey
 * one-line subtitle · bold black field labels · rounded grey-bordered inputs ·
 * a full-width mint button that is PALE AND DISABLED until the field is valid ·
 * green text links beneath. Errors are red text under the field they belong to,
 * never a toast and never a banner.
 *
 * ⛔ Written as literal class strings, never built by concatenation. A Tailwind
 * colour utility assembled at runtime compiles to nothing, with no build error
 * — `reference_tailwind_dead_utilities` records ~9 such sites shipped before.
 */

/** Sampled from CAP-122's enabled/disabled Send code button and its links. */
const MINT = "bg-[#2FD98A]";
const MINT_MUTED = "bg-[#A8EDD0]";
const LINK = "text-[#2FD98A]";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white px-6">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
        <div className="mb-8 flex flex-col items-center gap-2">
          <Image src="/wingz-emblem.svg" alt="" width={64} height={64} priority />
          {/* ⛔⛔ `-ink`, NOT `-dark`. "Dark" in that filename means FOR a dark
            background: its six letter paths are `fill="white"`, so on this white
            ground the word is invisible and only the emblem's green paths show —
            the screen renders two emblems stacked and says nothing. It throws
            nothing, logs nothing and passes every gate.

            ⚠️ And `-ink` alone was still wrong: that asset bakes the emblem in
            BESIDE the word, so the screen showed an emblem above an emblem-plus-
            word. CAP-122/126/127 put the emblem ABOVE the word, so the letters
            need their own asset. */}
        <Image src="/wingz-wordmark-text.svg" alt="Wingz" width={140} height={56} priority />
        </div>
        {children}
      </div>
    </div>
  );
}

export function AuthTitle({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="text-center text-[28px] font-bold leading-tight text-gray-900">
      {children}
    </h1>
  );
}

export function AuthSubtitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-3 text-center text-[15px] leading-snug text-gray-500">
      {children}
    </p>
  );
}

export function AuthField({
  label, error, children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-7">
      <label className="block text-[15px] font-bold text-gray-900">{label}</label>
      <div className="mt-2">{children}</div>
      {/* Red text under the field it belongs to — CAP-124 and CAP-125 both. */}
      {error && <p className="mt-2 text-sm text-[#E5484D]">{error}</p>}
    </div>
  );
}

const INPUT_CLASS =
  "w-full rounded-xl border border-gray-300 bg-white px-4 py-3.5 text-[16px] text-gray-900 placeholder:text-gray-400 focus:border-[#2FD98A] focus:outline-none";

export function AuthInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(INPUT_CLASS, props.className)} />;
}

/** CAP-122 — the field carries a bold `+1` inside it, left of the number. */
export function AuthPhoneInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3.5 focus-within:border-[#2FD98A]">
      <span className="text-[16px] font-bold text-gray-900">+1</span>
      <input
        {...props}
        className="min-w-0 flex-1 bg-transparent text-[16px] text-gray-900 placeholder:text-gray-400 focus:outline-none"
      />
    </div>
  );
}

/**
 * The full-width CTA. ⚠️ Pale until valid — in the browser pane a pale button
 * reads as broken rather than disabled, so `disabled` is set as well as styled
 * and the check reads the attribute, not the colour.
 */
export function AuthButton({
  children, disabled, onClick, type = "button",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "mt-8 w-full rounded-xl py-4 text-[17px] font-bold",
        disabled ? `${MINT_MUTED} text-white` : `${MINT} text-white`,
      )}
    >
      {children}
    </button>
  );
}

export function AuthLink({
  children, onClick, className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("mx-auto block text-[15px] font-bold", LINK, className)}
    >
      {children}
    </button>
  );
}

/**
 * CAP-123's six boxes. One real input behind them so typing, pasting and the
 * on-screen keyboard all behave; the boxes are presentation.
 */
export function AuthCodeBoxes({
  value, onChange, length, invalid,
}: {
  value: string;
  onChange: (next: string) => void;
  length: number;
  invalid?: boolean;
}) {
  return (
    <div className="relative mt-7">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, length))}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="Verification code"
        className="absolute inset-0 h-full w-full opacity-0"
      />
      <div className="pointer-events-none flex justify-between gap-2">
        {Array.from({ length }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "flex h-14 flex-1 items-center justify-center rounded-xl border text-[20px] font-bold text-gray-900",
              invalid
                ? "border-[#E5484D]"
                : i === value.length
                  ? "border-[#2FD98A]"
                  : "border-gray-300",
            )}
          >
            {value[i] ?? ""}
          </div>
        ))}
      </div>
    </div>
  );
}
