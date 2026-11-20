/**
 * PROTOTYPE — side-by-side: the Verida GA changes since the 2026-11-20 reviews, applied on top of
 * the production-based payload. Nothing here is approved story text; every change is listed in
 * `PROPOSALS` (the Coverage panel). The app shows them untagged (Luis, 2026-11-20).
 *
 * Sources (vault, Project - Driver Onboarding/Verida GA/References/):
 *   Onboarding Team Review 2026-11-20 - Verida GA In-App Onboarding.md (C1–C9, §6 Luis's decisions)
 *   Verida GA - Scenario Inventory.md (stage rows, S-65–S-70)
 *
 * ⛔ Copied byte for byte into the driver app (lib/side-by-side/proposals.ts) with a sha256 beside it,
 * exactly like contract.ts. No imports, so it runs unchanged in both repos.
 */

export interface ProposalField {
  slug: string;
  label?: string | null;
  field_type: string;
  content?: string | null;
  help_text?: string | null;
  required?: boolean;
  visibility?: string;
  options?: unknown;
  metadata?: Record<string, unknown> | null;
  items?: { text: string; image?: string; highlight?: string | boolean }[];
  visibility_rule?: unknown;
  [key: string]: unknown;
}

export interface ProposalStep {
  id: number | string;
  title: string;
  field_definitions: ProposalField[];
  [key: string]: unknown;
}

export interface ProposalStage {
  id: string;
  title: string;
  layout: "linear" | "accordion";
  advancement: "auto" | "manual";
  stepIds: string[];
  proposed?: string;
}

export interface Proposal {
  id: string;
  title: string;
  source: string;
}

export const PROPOSALS: Proposal[] = [
  { id: "P-SS-CARD", title: "\"SSN Document\" becomes \"Social Security Card\"; the SSA document is not accepted", source: "Onboarding review C1" },
  { id: "P-PD-VERIFY", title: "Profile & Documents is verified before the Info Call opens", source: "Anj, 2026-11-20 (replaces C2's fee auto-advance; the fee keeps production's verification)" },
  { id: "P-FEE-WAIVER", title: "Fee step: the $15 fee, then the waiver option, then one choice — pay (instructions, link, receipt) or waive (photos of at least 2 safety items, the same fields as the Safety Equipment step)", source: "Onboarding review C3 (Mae); layout Luis, 2026-11-20" },
  { id: "P-CONSENT-GATE", title: "Background Check verifies the signed consent; the result is not awaited", source: "Onboarding review C4" },
  { id: "P-PASS3", title: "Verida Training opens once D.Lawson marks BGC, MVR and drug test PASS", source: "Onboarding review C5" },
  { id: "P-EPASSPORT", title: "Onboarding uploads the EPassport; the driver views it", source: "Onboarding review C6" },
  { id: "P-LINKS", title: "Amazon / Walmart link per safety item", source: "Onboarding review C7 + Luis's links" },
  { id: "P-LEASE-ASK", title: "Vehicle Insurance & Registration asks whether the driver's name is on both documents; No makes the auto-lease agreement required", source: "Luis, 2026-11-20" },
  { id: "P-FLAG-EMPTY", title: "The tool lists every driver-facing field, empty optional uploads too, and can request changes on them; the driver must upload a flagged field to resubmit", source: "Luis, 2026-11-20 (production cannot flag an empty field)" },
  { id: "P-FLAG-DEPENDENTS", title: "When the agent flags a question, the fields its answer shows (instructions, link, upload) can be used during the change request — production disables every unflagged field", source: "Luis, 2026-11-20 (waiver → pay instead)" },
  { id: "P-RSM", title: "Inspection copy names Rideshare Mechanic", source: "Luis, 2026-11-20 (C8)" },
  { id: "P-LINK-ORDER", title: "Every step that sends the driver elsewhere reads intro → warnings → instructions → link → upload → Need help (the app's field order)", source: "Luis, 2026-11-21" },
  { id: "P-BTT-GATE", title: "Benefits Trafficking: read the browser and save-your-certificate rules and answer Yes before the instructions and Start Training appear (the Vehicle Inspection pattern)", source: "Luis, 2026-11-21" },
  { id: "P-ACK-YES-ONLY", title: "The two read-first agreements (Vehicle Inspection, Benefits Trafficking) offer Yes only: no No, no rejection. What appears after Yes (date and time, certificate) is what Submit needs", source: "Luis, 2026-11-21 (declining on one tap is too easy a rejection)" },
  { id: "P-WITHDREW", title: "No on Welcome to Wingz / About our driver standards keeps production's rejection, but the tool and reports show it as Withdrew, not Rejected", source: "Luis, 2026-11-21 (Q-ACK-1)" },
  { id: "P-EPASSPORT-STEP", title: "The EPassport sits in Schedule Drug Screening, after the instructions and before the Schedule link: shown on the card with Download. The required appointment date gates the step (no 'downloaded' box). No EPassport stage (15 stages)", source: "Luis, 2026-11-21 (D22, replaces the EPassport stage)" },
  { id: "P-EPASSPORT-CONSENT", title: "Onboarding uploads the EPassport into a required staff-only field on the D.Lawson consent (Verify waits for it); the backend copies it to the driver's EPassport step, so the stage opens ready", source: "Luis, 2026-11-21 (comment 20)" },
  { id: "P-WAIVER-COPY", title: "The fee waiver has its own photo fields (optional, at least 2); when Onboarding verifies the fee step they are copied into the matching Safety Equipment fields. Pre-Gentech certificates are copied into GenTech Training the same way (on verify)", source: "Luis, 2026-11-21 (D21, F5)" },
  { id: "P-BGC-RESULTS-COMPLIANCE", title: "The D.Lawson results (result upload, External Results, Reason, Wingz Background Check Decision) leave the onboarding consent step; the compliance team records them in the Compliance Tool's Background Check / MVR / Drug Screening requirements", source: "Luis, 2026-11-21 (D23)" },
  { id: "P-VERIDA-ITEMS", title: "Onboarding can't verify Schedule Drug Screening until D.Lawson's Background Check & MVR Report and Drug Screen Result are uploaded (staff-only, required); verifying Pre-Verida Training Check opens Verida Training — no separate PASS switch. On verify the reports are copied to the Compliance Tool", source: "Luis, 2026-11-21 (D25, replaces P-PASS3's gate)" },
  { id: "P-INSPECTION-GATE", title: "Vehicle Inspection: 'What to Expect' and 'Important' are hidden until the requirements are read and answered Yes, with the instructions, the booking link and the date and time", source: "Luis, 2026-11-21" },
  { id: "P-MERGE-15", title: "Pre-activation Training joins Payment & Tax Setup; 15 stages", source: "Luis, 2026-11-20 (C9)" },
];

/* ── Shopping links (Luis, 2026-11-20). Search pages, not single products. ─────── */

const AMAZON = (q: string) => `https://www.amazon.com/s?k=${q}`;
const WALMART = (q: string) => `https://www.walmart.com/search?q=${q}`;

export const SHOPPING_LINKS: Record<string, string> = {
  safety_seat_belt_extenders_photo: "[Seat Belt Extender Pros](https://www.seatbeltextenderpros.com)",
  safety_first_aid_kit_photo: `[Amazon](${AMAZON("First+Aid+Kit")}) · [Walmart](${WALMART("First+Aid+Kit")})`,
  safety_cleanup_kit_photo: `[Amazon](${AMAZON("Cleanup+Kit+for+Bloodborne+Pathogen+or+Biohazard+Spill+Kit")}) · [Walmart](${WALMART("Cleanup+Kit++for+Bloodborne+Pathogen+or+Biohazard+Spill+Kit")})`,
  safety_seat_belt_cutter_photo: `[Amazon](${AMAZON("Seat+belt+Cutter")}) · [Walmart](${WALMART("Seat+belt+Cutter")})`,
  safety_fire_extinguisher_photo: `[Amazon](${AMAZON("5+lbs+Fire+Extinguisher")}) · [Walmart](${WALMART("5+lbs+Fire+Extinguisher")})`,
  safety_reflective_triangles_photo: `[Amazon](${AMAZON("3+Reflective+Triangles")}) · [Walmart](${WALMART("3+Reflective+Triangles")})`,
  safety_phone_mount_photo: `[Amazon](${AMAZON("vehicle+phone+mount")}) · [Walmart](${WALMART("vehicle+phone+mount")})`,
  safety_temperature_gauge_photo: `[Amazon](${AMAZON("indoor+Temperature+Gauge")}) · [Walmart](${WALMART("indoor+Temperature+Gauge")})`,
  safety_step_stool_photo: `[Amazon](${AMAZON("Heavy-Duty+METAL+Step+Stool")}) · [Walmart](${WALMART("Heavy-Duty+METAL+Step+Stool")})`,
};

/** The Welcome list names items by title; map each to its photo slug. */
const ITEM_TO_SLUG: [RegExp, string][] = [
  [/Seat Belt Extenders/i, "safety_seat_belt_extenders_photo"],
  [/Fire Extinguisher/i, "safety_fire_extinguisher_photo"],
  [/First Aid Kit/i, "safety_first_aid_kit_photo"],
  [/Cleanup Kit/i, "safety_cleanup_kit_photo"],
  [/Seat Belt Cutter/i, "safety_seat_belt_cutter_photo"],
  [/Reflective Triangles/i, "safety_reflective_triangles_photo"],
  [/Step Stool/i, "safety_step_stool_photo"],
  [/Phone Mount/i, "safety_phone_mount_photo"],
  [/Temperature Gauge|Thermometer/i, "safety_temperature_gauge_photo"],
];

/* ── Stages ─────────────────────────────────────────────────────────────────── */

const FEE_STAGE = "Background Check Fee";
const PROFILE_DOCS_STAGE = "Profile & Documents";
const PAYMENT_STAGE = "Payment & Tax Setup";
const PRE_ACTIVATION_STAGE = "Pre-activation Training";
export const PASS3_STAGE = "Pre-Verida Training Check";
export const FINAL_REVIEW_STAGE = "Final Review";

export const EPASSPORT_STEP = "EPassport (Voucher)";
export const SCHEDULE_DRUG_STEP = "Schedule Drug Screening";

/* ── P-EPASSPORT-STEP (D22) ────────────────────────────────────────────────── */
export const EPASSPORT_VOUCHER = "drug_screen_epassport_voucher";

/** Schedule Drug Screening copy that assumed the voucher might not have arrived yet (template text, `\\n` as stored). */
const EPASSPORT_COPY: [string, string][] = [
  ["You can schedule your appointment now even if your EPassport (voucher) is not yet available.", "Your EPassport (voucher) is below: download it and bring it to your appointment."],
  ["1. Schedule your appointment now, even if you are still waiting for your EPassport (voucher)", "1. Schedule your appointment now"],
  ["3. If you receive your voucher on Friday,", "3. If your EPassport arrived on a Friday,"],
  ["\\n5. Return to the next step to download your EPassport once it is available", ""],
  ["to your appointment once it becomes available", "to your appointment"],
  // GA uploads no Donor Completion Form at onboarding (date only) — Luis, 2026-11-21 (F4)
  ["\\n• The clinic will give you a Donor Completion Form after your test\\n• You will upload that form in the final step", ""],
];

/** P-EPASSPORT-CONSENT: the staff-only upload on the D.Lawson consent. */
export const EPASSPORT_UPLOAD = "bgc_epassport_upload";
const CONSENT_STEP = "Background Check by D.Lawson";


/**
 * Required staff-only fields still empty — the real tool disables Verify while any is empty
 * ("Required staff-only fields are not finished yet", cs-tool driver-detail-content.tsx:2762). The prototype applies
 * it to the fields this review added (`metadata.agent_verify_required`).
 */
export function agentVerifyBlockers(fields: ProposalField[], values: Record<string, unknown>): string[] {
  return fields
    .filter((f) => (f.metadata as { agent_verify_required?: boolean } | null | undefined)?.agent_verify_required && isBlankValue(values[f.slug]))
    .map((f) => f.label ?? f.slug);
}

/** For Schedule Drug Screening: true while no appointment date is entered (the field that gates the step). */
export function drugScreenDateMissing(values: Record<string, unknown>): boolean {
  return isBlankValue(values.drug_screen_date);
}

/** For Schedule Drug Screening: true while the step has no EPassport (fallback — the consent Verify waits for it). */
export function epassportMissing(values: Record<string, unknown>): boolean {
  return isBlankValue(values[EPASSPORT_VOUCHER]);
}

/** Stage-list proposals. Only the Verida Fully Credentialled list changes (it is the only one with these stages). */
export function proposeStages(stages: ProposalStage[], titleOf?: (stepId: string) => string | undefined): ProposalStage[] {
  const pre = stages.find((s) => s.title === PRE_ACTIVATION_STAGE);
  const out: ProposalStage[] = [];
  for (const s of stages) {
    if (s.title === PRE_ACTIVATION_STAGE) continue; // P-MERGE-15
    if (s.title === FEE_STAGE) {
      // Anj, 2026-11-20: the fee is verified before the driver moves on (production's setting, kept).
      out.push({ ...s, advancement: "manual", proposed: "A waiver photo can replace the receipt; verified before Initial Training opens (P-FEE-WAIVER)" });
    } else if (s.title === PROFILE_DOCS_STAGE) {
      out.push({ ...s, advancement: "manual", proposed: "All four verified before the Info Call opens (P-PD-VERIFY)" });
    } else if (s.title === PAYMENT_STAGE && pre) {
      out.push({
        ...s,
        layout: "accordion",
        advancement: "auto",
        stepIds: [...s.stepIds, ...pre.stepIds],
        proposed: "Pre-activation Training joined here, any order, no gate (P-MERGE-15)",
      });
    } else if (s.title === PASS3_STAGE) {
      // P-EPASSPORT-STEP — the voucher moves into Schedule Drug Screening; its own step goes
      const eid = titleOf ? s.stepIds.find((id) => titleOf(id) === EPASSPORT_STEP) : undefined;
      out.push({ ...s, stepIds: s.stepIds.filter((id) => id !== eid), proposed: "Verida Training opens only once D.Lawson marks BGC, MVR and drug test PASS (P-PASS3)" });
    } else if (s.title === "Background Check") {
      out.push({ ...s, proposed: "Verify the signed consent; the result arrives later (P-CONSENT-GATE)" });
    } else {
      out.push(s);
    }
  }
  return out;
}

/* ── Fields ─────────────────────────────────────────────────────────────────── */

const PROPOSED = (note: string) => ({ proposed: note });

function withMeta(f: ProposalField, note: string): ProposalField {
  return { ...f, metadata: { ...(f.metadata ?? {}), ...PROPOSED(note) } };
}

function rsm(text: string | null | undefined): string | null | undefined {
  return typeof text === "string" ? text.replace(/Bright Inspect/g, "Rideshare Mechanic") : text;
}

const LEASE_QUESTION = "auto_lease_name_on_both";

/** Another step of the same flow, by title (the fee step borrows the Safety Equipment step's photo fields). */
export type StepLookup = (title: string) => ProposalStep | undefined;

export const FEE_METHOD = "bgc_fee_method";
export const SAFETY_STEP = "Safety Equipment";
/** A waiver needs photos of at least this many safety-equipment items. */
export const FEE_WAIVER_MIN = 2;
const PAY = { "==": [{ var: FEE_METHOD }, "pay"] };
const WAIVE = { "==": [{ var: FEE_METHOD }, "waiver"] };

/** The Safety Equipment step's photo slugs. */
export function isSafetyPhotoSlug(slug: string): boolean {
  return /^safety_.+_photo$/.test(slug);
}

/**
 * P-WAIVER-COPY (D21): the waiver's own photo fields. One field definition has one required / position / label in
 * every step (backend FormFieldDefinition), and most Safety Equipment photos are required — so the waiver can't
 * reuse them. `fee_waiver_<item>_photo` ↔ `safety_<item>_photo`.
 */
const WAIVER_PREFIX = "fee_waiver_";
export function isFeeWaiverPhotoSlug(slug: string): boolean {
  return slug.startsWith(WAIVER_PREFIX) && slug.endsWith("_photo");
}
export const waiverSlugFor = (safetySlug: string) => safetySlug.replace(/^safety_/, WAIVER_PREFIX);
export const safetySlugFor = (waiverSlug: string) => waiverSlug.replace(new RegExp(`^${WAIVER_PREFIX}`), "safety_");

const PRE_GENTECH_STEP = "Pre-Gentech Training Check";
/** Copy target meaning "the Compliance Tool's requirement record", not an onboarding step. */
export const COMPLIANCE_TOOL = "Compliance Tool";
const GENTECH_STEP = "GenTech Training";

/**
 * Proposed backend capability (D20/D21): when Onboarding verifies a step, copy its accepted values into another
 * step's field. Only a later step not yet submitted takes them, and never over something already there.
 * Waiver photos → Safety Equipment; Pre-Gentech certificates → GenTech Training (same fields, values are per step).
 */
export function copyOnVerify(stepTitle: string, slug: string): { stepTitle: string; slug: string } | null {
  if (stepTitle === "Background Check Fee" && isFeeWaiverPhotoSlug(slug)) return { stepTitle: SAFETY_STEP, slug: safetySlugFor(slug) };
  if (stepTitle === PRE_GENTECH_STEP && /^gentech_.+_certificate$/.test(slug)) return { stepTitle: GENTECH_STEP, slug };
  // D22: the EPassport Onboarding uploaded on the consent reaches the driver when the consent is verified
  if (stepTitle === CONSENT_STEP && slug === EPASSPORT_UPLOAD) return { stepTitle: SCHEDULE_DRUG_STEP, slug: EPASSPORT_VOUCHER };
  // D25: the D.Lawson reports go to the Compliance Tool's D.Lawson requirements (outside the onboarding steps)
  if (stepTitle === SCHEDULE_DRUG_STEP && (slug === "bgc_result_file" || slug === "drug_screen_result")) return { stepTitle: COMPLIANCE_TOOL, slug };
  return null;
}

/** P-FLAG-DEPENDENTS: whether a field's show-rule reads one of these slugs (it depends on a flagged answer). */
export function dependsOnAny(field: { visibility_rule?: unknown }, slugs: Iterable<string>): boolean {
  const rule = field.visibility_rule;
  if (!rule || typeof rule !== "object") return false;
  const text = JSON.stringify(rule);
  for (const slug of slugs) if (text.includes(`{"var":"${slug}"}`)) return true;
  return false;
}

/** How many more item photos a waiver needs (0 when paying or when enough are uploaded). */
export function feeWaiverShortfall(values: Record<string, unknown>): number {
  if (values[FEE_METHOD] !== "waiver") return 0;
  const n = Object.entries(values).filter(([k, v]) => isFeeWaiverPhotoSlug(k) && !isBlankValue(v)).length;
  return Math.max(0, FEE_WAIVER_MIN - n);
}

function withLinks(f: ProposalField): ProposalField {
  return SHOPPING_LINKS[f.slug] ? { ...f, content: `${f.content ?? ""}\n\nWhere to buy: ${SHOPPING_LINKS[f.slug]}`.trim() } : f;
}

/**
 * The fee step, in the order reviewed with Luis on 2026-11-20:
 *   1. the fee ($15, what it covers)          2. the waiver option (2 safety items)
 *   3. the choice                             4a. pay: instructions → link → receipt
 *                                             4b. waive: how-to → the Safety Equipment photo fields
 * The waiver photos ARE the Safety Equipment fields (same slugs), so they are already on file there.
 */
function proposeFeeStep(fields: ProposalField[], lookup?: StepLookup): ProposalField[] | null {
  const by = new Map(fields.map((f) => [f.slug, f]));
  const intro = by.get("bgc_fee_info");
  const steps = by.get("bgc_fee_payment_steps");
  const button = by.get("pay_background_check_fee_button");
  const receipt = by.get("background_check_fee_receipt");
  if (!intro || !steps || !button || !receipt) return null;
  const note = "P-FEE-WAIVER";
  const safety = (lookup?.(SAFETY_STEP)?.field_definitions ?? []).filter((f) => isSafetyPhotoSlug(f.slug));
  const introText = (intro.content ?? "")
    .replace("Process the Background Check fee payment that we discussed during the Info Call. Please follow the link below.", "")
    .trim();
  const used = new Set(["bgc_fee_info", "bgc_fee_payment_steps", "pay_background_check_fee_button", "background_check_fee_receipt"]);
  return [
    withMeta({ ...intro, content: introText }, note),
    {
      slug: "bgc_fee_waiver_info",
      label: "Already have 2 safety equipment items?",
      field_type: "info",
      required: false,
      visibility: "external",
      content:
        "If you already have at least 2 of the safety equipment items required for your vehicle, the $15 fee is waived. Choose that option below and upload a photo of each item. Those photos also count for your Safety Equipment step later, so you won't upload them twice.",
      metadata: { proposed: note },
    },
    {
      slug: FEE_METHOD,
      label: "How are you covering the background check fee?",
      field_type: "radio",
      required: true,
      visibility: "external",
      options: [
        { label: "I'll pay the $15 fee", value: "pay" },
        { label: "I already have 2 safety equipment items (fee waived)", value: "waiver" },
      ],
      metadata: { proposed: note },
    },
    withMeta({ ...steps, visibility_rule: PAY }, note),
    withMeta({ ...button, visibility_rule: PAY }, note),
    withMeta({ ...receipt, visibility_rule: PAY }, note),
    {
      slug: "bgc_fee_waiver_steps",
      label: "Fee waiver: upload at least 2 items",
      field_type: "info_list",
      required: false,
      visibility: "external",
      content:
        "1. Pick any 2 or more items from the list below\n2. Photograph each one clearly — the whole item in frame\n3. Upload one photo per item\n4. Onboarding checks the photos before your Initial Training opens",
      visibility_rule: WAIVE,
      metadata: { proposed: note },
    },
    // D21: the waiver's own fields, modelled on the Safety Equipment ones (copied there when Onboarding verifies)
    ...safety.map((f) =>
      withMeta(
        { ...withLinks(f), slug: waiverSlugFor(f.slug), required: false, visibility_rule: WAIVE, metadata: { ...(f.metadata ?? {}), copies_to: f.slug } },
        "P-WAIVER-COPY",
      ),
    ),
    ...fields.filter((f) => !used.has(f.slug)),
  ];
}

/** Empty the way the app treats an answer: nothing, blank text, an empty list (app formUtils isEmpty / isEmptyFileValue). */
export function isBlankValue(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

/**
 * The app shows a step's fields by `display_order` (production App/Data/onboarding/backendConfigAdapter.ts:209,
 * missing = 0; the sort is stable). The payload stores some GA steps out of that order (the link second), so every
 * step is put in position order before anything else happens.
 */
function byPosition(fields: ProposalField[]): ProposalField[] {
  const pos = (f: ProposalField) => (typeof f.display_order === "number" ? f.display_order : 0);
  return fields.map((f, i) => [f, i] as const).sort((a, b) => pos(a[0]) - pos(b[0]) || a[1] - b[1]).map(([f]) => f);
}

/** Moves `slugs` (in that order) to right after `anchor`. */
function keepAfter(fields: ProposalField[], anchor: string, slugs: string[]): ProposalField[] {
  const moving = slugs.map((s) => fields.find((f) => f.slug === s)).filter((f): f is ProposalField => Boolean(f));
  const rest = fields.filter((f) => !slugs.includes(f.slug));
  const at = rest.findIndex((f) => f.slug === anchor);
  return at < 0 ? fields : [...rest.slice(0, at + 1), ...moving, ...rest.slice(at + 1)];
}

/* ── P-BTT-GATE: the Vehicle Inspection pattern on Benefits Trafficking ───────── */
const BTT_STEP = "Benefits Trafficking Training";
export const BTT_ACK = "ack_btt_requirements";
const BTT_WARNINGS = ["benefits_trafficking_browser_warning", "benefits_trafficking_save_warning"];
const BTT_GATED = ["benefits_trafficking_steps", "benefits_trafficking_training_button", "benefits_trafficking_certificate"];

/** P-ACK-YES-ONLY: a scroll-to-read agreement that only offers Yes (`metadata.yes_only`). */
export const YES_ONLY_ACKS = ["ack_inspection_requirements", "ack_btt_requirements"];

function bttAck(fields: ProposalField[]): ProposalField {
  const text = (slug: string) => (fields.find((f) => f.slug === slug)?.content ?? "").split(/\n\n+/).map((p) => `• ${p.trim()}`).join("\n");
  return {
    slug: BTT_ACK,
    label: "I have read the training requirements, and I understand I must save my certificate before closing the course page.",
    field_type: "acknowledgment",
    required: true,
    visibility: "external",
    scroll_required: true,
    content: `BEFORE YOU START — CHECK YOUR BROWSER\n${text(BTT_WARNINGS[0])}\n\nSAVE YOUR CERTIFICATE BEFORE CLOSING THE PAGE\n${text(BTT_WARNINGS[1])}`,
    metadata: { ...PROPOSED("P-BTT-GATE"), yes_only: true },
  };
}

/**
 * The Onboarding Tool lists a step's fields by `display_order` (missing = last). Added and borrowed fields
 * would land out of place, so a changed step is renumbered in the order the app shows it.
 */
function inScreenOrder(fields: ProposalField[]): ProposalField[] {
  return fields.map((f, i) => ({ ...f, display_order: i + 1 }));
}

/** Field-level proposals for one step. Returns the step unchanged when nothing applies. */
export function proposeStep<T extends ProposalStep>(step: T, lookup?: StepLookup): T {
  // P-LINK-ORDER — the app's order first, so the link sits after its instructions
  const ordered = byPosition(step.field_definitions);
  let changed = ordered.some((f, i) => f !== step.field_definitions[i]);
  let fields: ProposalField[] = [];
  const btt = step.title === BTT_STEP;
  for (const f of ordered) {
    let g = f;
    // P-BTT-GATE — the two warnings move into the scroll-to-read agreement; instructions and link wait for Yes
    if (btt && BTT_WARNINGS.includes(f.slug)) {
      changed = true;
      continue;
    }
    if (btt && f.slug === "benefits_trafficking_info") {
      g = withMeta(
        { ...g, content: (g.content ?? "").replace("Follow the instructions below to complete the course and upload your certificate.", "Read the requirements below and answer Yes to see the training instructions. Then complete the course and upload your certificate.") },
        "P-BTT-GATE",
      );
    }
    // P-EPASSPORT-STEP — the driver gets the EPassport in this step
    if (step.title === SCHEDULE_DRUG_STEP && typeof g.content === "string") {
      const next = EPASSPORT_COPY.reduce((c, [from, to]) => c.split(from).join(to), g.content);
      if (next !== g.content) g = withMeta({ ...g, content: next }, "P-EPASSPORT-STEP");
    }
    // P-INSPECTION-GATE — "What to Expect" and "Important" wait for the Yes too, like the instructions and the link
    if (step.title === "Vehicle Inspection" && (f.slug === "vehicle_inspection_what_to_expect" || f.slug === "vehicle_inspection_important_note")) {
      g = withMeta({ ...g, visibility_rule: { "==": [{ var: "ack_inspection_requirements" }, true] } }, "P-INSPECTION-GATE");
    }
    // P-ACK-YES-ONLY — the inspection agreement drops its No (and with it the GA-only rejection)
    if (f.slug === "ack_inspection_requirements") {
      g = withMeta({ ...g, metadata: { ...(g.metadata ?? {}), yes_only: true } }, "P-ACK-YES-ONLY");
    }
    if (btt && BTT_GATED.includes(f.slug)) {
      g = withMeta({ ...g, visibility_rule: { "==": [{ var: BTT_ACK }, true] } }, "P-BTT-GATE");
    }
    // P-SS-CARD
    if (f.slug === "ssn_upload") {
      g = withMeta(
        {
          ...g,
          label: "Social Security Card",
          content: "Upload a clear photo of your Social Security card. The document from the SSA website, or a screenshot of it, is not accepted.",
          help_text: "Upload a photo of your Social Security card.",
        },
        "P-SS-CARD",
      );
    }
    // P-RSM — every inspection text
    if (step.title === "Vehicle Inspection") {
      const items = g.items?.map((it) => ({ ...it, text: rsm(it.text) ?? it.text }));
      const next = { ...g, label: rsm(g.label), content: rsm(g.content), help_text: rsm(g.help_text), ...(items ? { items } : {}) };
      if (JSON.stringify(next) !== JSON.stringify(g)) g = withMeta(next, "P-RSM");
    }
    // P-LINKS — the photo fields
    if (SHOPPING_LINKS[f.slug]) {
      g = withMeta({ ...g, content: `${g.content ?? ""}\n\nWhere to buy: ${SHOPPING_LINKS[f.slug]}`.trim() }, "P-LINKS");
    }
    // P-LINKS — the Welcome list
    if (f.slug === "wingz_intro_safety_equipment" && g.items) {
      g = withMeta(
        {
          ...g,
          items: g.items.map((it) => {
            const slug = ITEM_TO_SLUG.find(([re]) => re.test(it.text))?.[1];
            return slug ? { ...it, text: `${it.text} — ${SHOPPING_LINKS[slug]}` } : it;
          }),
        },
        "P-LINKS",
      );
    }
    // P-BGC-RESULTS-COMPLIANCE (D23) — the results belong to the Compliance Tool, not the consent step
    if (["bgc_result_file", "bgc_results", "bgc_results_reason", "bgc_decision"].includes(f.slug)) {
      changed = true;
      continue;
    }
    // P-LEASE-ASK — the notice and the upload follow the driver's answer; the upload is required on No
    if (f.slug === "auto_lease_required_notice") {
      g = withMeta({ ...g, visibility_rule: { "==": [{ var: LEASE_QUESTION }, "no"] } }, "P-LEASE-ASK");
    }
    if (f.slug === "auto_lease_agreement") {
      g = withMeta(
        { ...g, required: true, visibility_rule: { "==": [{ var: LEASE_QUESTION }, "no"] }, metadata: { ...(g.metadata ?? {}), agent_can_flag_when_hidden: true } },
        "P-LEASE-ASK",
      );
    }
    if (g !== f) changed = true;
    fields.push(g);
    // P-EPASSPORT-CONSENT — the staff-only EPassport upload sits with the consent's other staff fields
    if (step.title === CONSENT_STEP && f.slug === "bgc_esign_signature_id") {
      changed = true;
      fields.push({
        slug: EPASSPORT_UPLOAD,
        label: "EPassport (from D.Lawson)",
        field_type: "file",
        required: true,
        visibility: "internal",
        content: "Upload the EPassport D.Lawson issued for this driver. It is copied to the driver's EPassport step; Verify waits for it.",
        metadata: { ...PROPOSED("P-EPASSPORT-CONSENT"), agent_verify_required: true },
      });
    }
    if (btt && f.slug === "benefits_trafficking_info") {
      changed = true;
      fields.push(bttAck(ordered));
    }
    // P-LEASE-ASK — the question goes right under the Auto-Lease heading
    if (f.slug === "auto_lease_heading") {
      changed = true;
      fields.push({
        slug: LEASE_QUESTION,
        label: "Is your name on both your vehicle registration and your insurance card?",
        field_type: "radio",
        required: true,
        visibility: "external",
        options: [
          { label: "Yes", value: "yes" },
          { label: "No", value: "no" },
        ],
        metadata: PROPOSED("P-LEASE-ASK"),
      });
    }
  }
  // P-LEASE-ASK — the notice and the upload stay with their question (position order would drop them among the OCR fields)
  fields = keepAfter(fields, LEASE_QUESTION, ["auto_lease_required_notice", "auto_lease_agreement"]);
  // P-EPASSPORT-STEP (D22) — intro → instructions → the EPassport (on the card) + Download → Schedule link → date (required)
  if (step.title === SCHEDULE_DRUG_STEP) {
    const note = "P-EPASSPORT-STEP";
    const source = (lookup?.(EPASSPORT_STEP)?.field_definitions ?? []).find((f) => f.slug === EPASSPORT_VOUCHER);
    const voucher: ProposalField = withMeta(
      {
        ...(source ?? { slug: EPASSPORT_VOUCHER, field_type: "voucher", visibility: "external" }),
        label: "Your EPassport",
        help_text: "Bring it to your drug screening appointment. A printed or digital copy is accepted.",
        required: true,
        validation_rules: { required: true, requiredMessage: "Your EPassport isn't here yet. We'll message you as soon as Onboarding adds it." },
      },
      note,
    );
    const by = (slug: string) => fields.find((f) => f.slug === slug);
    const placed = new Set(["drug_screen_info", "drug_screen_schedule_steps", "drug_screen_schedule_notes"]);
    // No "I have downloaded" box (Luis, 2026-11-21): the required appointment date is what gates the step
    // P-VERIDA-ITEMS (D25): the Verida items we don't have yet — D.Lawson's reports — staff-only, required for Verify
    const consentResult = (lookup?.(CONSENT_STEP)?.field_definitions ?? []).find((f) => f.slug === "bgc_result_file");
    const reports: ProposalField[] = [
      {
        ...(consentResult ?? { slug: "bgc_result_file", field_type: "file" }),
        label: "Background Check & MVR Report (D.Lawson)",
        content: "Upload D.Lawson's background check and MVR report. Verify waits for it; it goes to Verida and the Compliance Tool.",
        required: true,
        visibility: "internal",
        visibility_rule: undefined,
        metadata: { ...PROPOSED("P-VERIDA-ITEMS"), agent_verify_required: true },
      },
      {
        slug: "drug_screen_result",
        label: "Drug Screen Result (D.Lawson)",
        field_type: "file",
        content: "Upload D.Lawson's drug screen result. Verify waits for it; it goes to Verida and the Compliance Tool.",
        required: true,
        visibility: "internal",
        metadata: { ...PROPOSED("P-VERIDA-ITEMS"), agent_verify_required: true },
      },
    ];
    // The date is the gate: marked so the app checks it (the prototype checks only the fields this review touched)
    const rest = fields.filter((f) => !placed.has(f.slug)).map((f) => (f.slug === "drug_screen_date" ? withMeta({ ...f, required: true }, note) : f));
    const ordered = [by("drug_screen_info"), by("drug_screen_schedule_steps"), voucher, ...rest, ...reports].filter(
      (f): f is ProposalField => Boolean(f),
    );
    return {
      ...step,
      description: "Download your EPassport, then schedule your drug screening and enter the date.",
      field_definitions: inScreenOrder(ordered),
    };
  }
  // P-FEE-WAIVER — rebuild the fee step in the reviewed order.
  const fee = proposeFeeStep(fields, lookup);
  if (fee) {
    return {
      ...step,
      description: "Pay the one-time $15 background check fee, or have it waived if you already have 2 of the required safety equipment items.",
      field_definitions: inScreenOrder(fee),
    };
  }
  return changed ? { ...step, field_definitions: inScreenOrder(fields) } : step;
}

/* ── Rules the engine applies (production behaviour, confirmed 2026-11-20) ────── */

/** P-WITHDREW: the reason label for the two "Do you wish to continue?" declines (production codes declined_welcome_info, declined_bgc_info). */
export const WITHDREW = "Withdrew";

/** A driver answer that ends the application on submit, with the reason the tool records. */
export function autoRejectReason(values: Record<string, unknown>): string | null {
  const dob = values.date_of_birth;
  if (typeof dob === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    const age = ageOn(dob, "2026-11-20");
    if (age >= 14 && age < 25) return "Under 25 (age requirement)";
  }
  if (values.ack_tos === false) return "Declined the Driver Terms & Conditions";
  // P-WITHDREW — still production's auto-reject; counted and labelled as the driver withdrawing
  if (values.ack_intro_aggreement === false) return `${WITHDREW} — chose not to continue (Welcome to Wingz)`;
  if (values.ack_bgc_information === false) return `${WITHDREW} — chose not to continue (driver standards)`;
  return null;
}

/** Under 14 is treated as a mistype: the driver cannot continue, nothing is rejected. */
export function blockedAsMistype(values: Record<string, unknown>): boolean {
  const dob = values.date_of_birth;
  return typeof dob === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dob) && ageOn(dob, "2026-11-20") < 14;
}

function ageOn(dob: string, today: string): number {
  const [y, m, d] = dob.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  return ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
}
