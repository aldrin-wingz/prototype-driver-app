"use client";

import { Switch } from "@/components/ui/switch";
import { SHOW_CANCELLED_LABEL } from "@/lib/driver-data/client-cancellation";

/**
 * Catalogue row 19's control — **"Show cancelled trips"**, default on.
 *
 * ⛔⛔ **This replaces a seven-filter sheet (D162).** The approved solution is a
 * toggle rather than a filter, and the difference is not cosmetic: a filter
 * offers a set of states the driver has to read to understand, while a toggle
 * has one off-state and its label says what turning it off does. The thing the
 * driver was calling Support about is a ride they cannot find, so the control
 * that fixes it should not itself be something to work out.
 *
 * ⛔ **Told, never asks.** Whether this renders at all is the page's call via
 * `showsCancelledToggle`, and whether the setting applies is
 * `applicableShowCancelled`. A control that read the demo focus itself would be
 * a second reader of the gate the list already uses, and the two could
 * disagree — which is how row 10 shipped a feed narrowed by a filter nobody
 * could see.
 *
 * ⛔ **Ours, not production's.** Production has no such control; the label is
 * proposed copy and `CLIENT_CANCELLATION_PROVENANCE` is where that is recorded.
 *
 * ⚠️ The driver app's **first real `Switch`** — the Radix primitive existed but
 * had only ever been used in the component gallery. The label is a `<label>`
 * wrapping both halves so the text is a tap target too; a 44px-wide switch
 * alone is a small target on a phone.
 */
export function ShowCancelledToggle({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-2.5">
      <label
        htmlFor="show-cancelled"
        className="text-[13px] font-medium text-gray-700"
      >
        {SHOW_CANCELLED_LABEL}
      </label>
      <Switch
        id="show-cancelled"
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={SHOW_CANCELLED_LABEL}
        className="data-[state=checked]:bg-[#10B981] data-[state=unchecked]:bg-gray-200"
      />
    </div>
  );
}
