"use client";

import { useEffect, useRef, useState } from "react";
import { AuthInput } from "./auth-shell";

/**
 * A password field you can actually type into on a phone.
 *
 * ⭐ User direction, 2026-10-13: *"have a show password to type. And even if
 * hidden show briefly the latest character typed."* Both, because they solve
 * different halves of the same problem — the eye is for checking the whole
 * thing before you commit, the flash is for catching a thumb slip as it
 * happens, on a field whose whole job is to be typed blind and twice.
 *
 * ⛔ `type="password"` cannot do the flash: the browser decides what a masked
 * field shows. So the field is `type="text"` with a MASKED DISPLAY value, and
 * the real password is held here and never rendered while hidden.
 */
const BULLET = "•";

/** How long the last character stays legible. Long enough to read, short
 *  enough that a shoulder-surfer gets one character, not the password. */
const REVEAL_MS = 900;

export function MaskedPasswordInput({
  value, onChange, placeholder, autoComplete, id,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  autoComplete?: string;
  id?: string;
}) {
  const [shown, setShown] = useState(false);
  const [revealIndex, setRevealIndex] = useState(-1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const display = shown
    ? value
    : value
        .split("")
        .map((char, i) => (i === revealIndex ? char : BULLET))
        .join("");

  /**
   * ⛔⛔ The real value is rebuilt from the CARET, not from the text.
   *
   * Two wrong versions came before this one, and the second is the instructive
   * one. "Whatever is longer than before is the new character" breaks on any
   * edit that is not an append. Diffing a common prefix and suffix fixes that
   * for insertions — but **not for deletions**, because every masked character
   * is the same glyph: deleting the 4th bullet of eight produces exactly the
   * string that deleting the 8th would, so the prefix match runs to the end and
   * the diff removes the LAST character instead of the one under the caret.
   *
   * No diff can tell those apart. The browser can: `selectionStart` says where
   * the edit landed. Found by walking the field, not by any gate — the screen
   * looked perfect and quietly held a different password than it showed.
   */
  function handle(nextDisplay: string, caret: number) {
    const delta = nextDisplay.length - display.length;

    if (delta > 0) {
      // Insertion (typing or paste): it ends at the caret.
      const at = caret - delta;
      const inserted = nextDisplay.slice(at, caret);
      onChange(value.slice(0, at) + inserted + value.slice(at));
      flash(inserted.length > 0 ? caret - 1 : -1);
      return;
    }

    if (delta < 0) {
      // Deletion: the removed run ended where the caret now sits.
      onChange(value.slice(0, caret) + value.slice(caret - delta));
      flash(-1);
      return;
    }

    /*
      Same length — a selection replaced by exactly as many characters. Rare,
      and the caret still bounds it: everything before `caret` that is not in
      the old display at the same place was just typed. Taking the whole visible
      tail is wrong, so fall back to replacing one character at the caret.
    */
    if (caret > 0) {
      onChange(value.slice(0, caret - 1) + nextDisplay[caret - 1] + value.slice(caret));
      flash(caret - 1);
    }
  }

  function flash(index: number) {
    if (timer.current) clearTimeout(timer.current);
    if (index < 0 || shown) { setRevealIndex(-1); return; }
    setRevealIndex(index);
    timer.current = setTimeout(() => setRevealIndex(-1), REVEAL_MS);
  }

  return (
    <div className="relative">
      <AuthInput
        id={id}
        value={display}
        onChange={(e) => handle(e.target.value, e.target.selectionStart ?? e.target.value.length)}
        placeholder={placeholder}
        className="pr-12"
        /* ⛔ Never `password`: the browser would mask the already-masked
           display, and the flash would show a bullet. Autofill and password
           managers are told to stay out rather than fight it. */
        type="text"
        autoComplete={autoComplete ?? "off"}
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        data-masked-password={!shown}
      />
      <button
        type="button"
        aria-label={shown ? "Hide password" : "Show password"}
        onClick={() => { setShown((v) => !v); setRevealIndex(-1); }}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
      >
        {/* CAP-126's eye, and its struck-through twin when the field is open. */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" />
          <circle cx="12" cy="12" r="3" />
          {shown && <path d="M3 3l18 18" />}
        </svg>
      </button>
    </div>
  );
}
