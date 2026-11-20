/**
 * FEATURE (verida-ga-onboarding) — the field rules the wizard needs to be walkable: visibility,
 * the scroll-to-read gate, multi-choice ticking, and stand-in uploads. Pure functions, so the verify
 * script tests the same code the screen runs.
 *
 *   real: App/Data/onboarding/fieldVisibility.ts (json-logic-js `apply` on `visibility_rule`)
 *         App/Components/DynamicForm/scrollAcknowledgment.ts:57-75 (gate + Yes/No labels)
 *         App/Components/DynamicForm/DynamicFormRenderer.tsx:707-760 (checkboxes_multi toggle)
 *   all @ android production 39b403b78.
 */
import type { FieldDef } from "./market-flow";

export type Values = Record<string, unknown>;

/**
 * D.Lawson consent (HelloSign / Dropbox Sign). Production: signing does NOT submit the step. The signed webhook
 * saves the signature id and ticks the internal consent box (backend driver_onboarding/utils.py:970–1027 @ prod_19.5.32),
 * the sign button turns into a disabled "signed" card (api/serializers/driver_onboarding.py:493, macros :397–398),
 * and Submit stays blocked until the required signature id is there (app formUtils.ts:217; portal step-form.tsx:660).
 */
export const ESIGN_SIGNATURE_SLUG = "bgc_esign_signature_id";
export const ESIGN_ACK_SLUG = "ack_bgc_consent";
export const ESIGN_SIGNED_TITLE = "Consent Form Signed";
export const ESIGN_SIGNED_BODY = "Your consent form has been signed successfully.";
/** Synthetic signature request id the prototype records on "signing". */
export const PROTOTYPE_SIGNATURE_ID = "prototype-signature-request";

/** Required async values still empty (e.g. the signature id before the webhook) — each one blocks Submit. */
export function missingAsyncValues(fields: FieldDef[], values: Values): string[] {
  const blank = (v: unknown) => v == null || (typeof v === "string" && v.trim() === "");
  return fields.filter((f) => f.field_type === "async_value" && f.required && blank(values[f.slug])).map((f) => f.slug);
}

/**
 * The JSON Logic subset the templates use (`var`, `==`, `===`, `!=`, `!`, `in`, `and`, `or`).
 * Production runs json-logic-js; anything outside this subset is treated as visible, which is
 * also what the app does when a rule throws.
 */
export function evaluateRule(rule: unknown, values: Values): unknown {
  if (rule === null || typeof rule !== "object" || Array.isArray(rule)) return rule;
  const [op, rawArgs] = Object.entries(rule as Record<string, unknown>)[0] ?? [];
  const args = Array.isArray(rawArgs) ? rawArgs : [rawArgs];
  const ev = (x: unknown) => evaluateRule(x, values);
  switch (op) {
    case "var": {
      const key = String(args[0] ?? "");
      return key in values ? values[key] : (args[1] ?? null);
    }
    case "==":
      // json-logic `==` is loose; a boolean ack stored as true must equal true.
      // eslint-disable-next-line eqeqeq
      return ev(args[0]) == ev(args[1]);
    case "===":
      return ev(args[0]) === ev(args[1]);
    case "!=":
      // eslint-disable-next-line eqeqeq
      return ev(args[0]) != ev(args[1]);
    case "!":
      return !ev(args[0]);
    case "in": {
      const needle = ev(args[0]);
      const hay = ev(args[1]);
      if (Array.isArray(hay)) return hay.map(String).includes(String(needle));
      if (typeof hay === "string") return hay.includes(String(needle));
      return false;
    }
    case "and":
      return args.every((a) => Boolean(ev(a)));
    case "or":
      return args.some((a) => Boolean(ev(a)));
    default:
      return true;
  }
}

export function isFieldVisible(field: FieldDef, values: Values): boolean {
  const rule = (field as FieldDef & { visibility_rule?: unknown }).visibility_rule ?? field.metadata?.visibility_rule;
  if (rule == null || typeof rule !== "object") return true;
  return Boolean(evaluateRule(rule, values));
}

/** A scroll-gated acknowledgment needs BOTH flags — the app and the portal agree. */
export function isScrollAck(field: FieldDef): boolean {
  const t = field.field_type;
  return (t === "acknowledgment" || t === "acknowledgement") && Boolean(field.scroll_required) && Boolean(field.content?.trim());
}

/** Production's Yes/No wording: legal for the Terms, "continue" for every other scroll ack. */
export function scrollAckLabels(slug: string): { yes: string; no: string } {
  return slug === "ack_tos"
    ? { yes: "Yes, I have read and agree", no: "No, I do not agree" }
    : { yes: "Yes - I want to continue", no: "No - I do not want to continue." };
}

export interface ChoiceOption {
  label: string;
  value: string;
  exclusive?: boolean;
}

export function choiceOptions(field: FieldDef): ChoiceOption[] {
  const raw = Array.isArray(field.options) ? (field.options as unknown[]) : [];
  return raw.map((o) =>
    typeof o === "string"
      ? { label: o, value: o }
      : {
          label: String((o as { label?: unknown }).label ?? (o as { value?: unknown }).value ?? ""),
          value: String((o as { value?: unknown }).value ?? (o as { label?: unknown }).label ?? ""),
          exclusive: Boolean((o as { exclusive?: unknown }).exclusive),
        },
  );
}

/**
 * Tick or untick one option. An `exclusive` option ("I have not completed any …") clears the
 * others, and ticking any other option clears it. ⚠️ Exclusivity is NEW — neither production
 * renderer has it (DynamicFormRenderer.tsx:707 toggles independently).
 */
export function toggleChoice(selected: readonly string[], option: ChoiceOption, options: readonly ChoiceOption[]): string[] {
  const on = selected.includes(option.value);
  if (on) return selected.filter((v) => v !== option.value);
  if (option.exclusive) return [option.value];
  const exclusive = new Set(options.filter((o) => o.exclusive).map((o) => o.value));
  return [...selected.filter((v) => !exclusive.has(v)), option.value];
}

/** What a prototype "upload" stores: a file name, so the next step that shares the slug shows it. */
export function sampleUploadName(field: FieldDef): string {
  return `${field.slug}${field.field_type === "photo" ? ".jpg" : ".pdf"}`;
}

/**
 * The step button's label, as production decides it — NOT the template's `action_button_text`,
 * which neither renderer reads (real: App/Data/onboarding/onboardingStepPresentation.ts:183-206
 * @ android prod 39b403b78; the portal only declares the field, backend-types.ts:121).
 * Production shows "Save & Return" on steps opened from a checklist hub (stage layout `parallel`
 * or `accordion`); this prototype walks steps in sequence with no hub screen, so it uses the
 * sequential labels: "Continue", and "Submit Application" on the last step.
 */
export function continueLabel(isLastStep: boolean): string {
  return isLastStep ? "Submit Application" : "Continue";
}
