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
  { id: "P-RSM", title: "Inspection copy names Rideshare Mechanic", source: "Luis, 2026-11-20 (C8)" },
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

/** Stage-list proposals. Only the Verida Fully Credentialled list changes (it is the only one with these stages). */
export function proposeStages(stages: ProposalStage[]): ProposalStage[] {
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
      out.push({ ...s, proposed: "Verida Training opens only once D.Lawson marks BGC, MVR and drug test PASS (P-PASS3)" });
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

/** The safety-equipment photo slugs (shared by the fee waiver and the Safety Equipment step). */
export function isSafetyPhotoSlug(slug: string): boolean {
  return /^safety_.+_photo$/.test(slug);
}

/** How many more item photos a waiver needs (0 when paying or when enough are uploaded). */
export function feeWaiverShortfall(values: Record<string, unknown>): number {
  if (values[FEE_METHOD] !== "waiver") return 0;
  const n = Object.entries(values).filter(([k, v]) => isSafetyPhotoSlug(k) && !isBlankValue(v)).length;
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
    ...safety.map((f) => withMeta({ ...withLinks(f), required: false, visibility_rule: WAIVE }, note)),
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

/** Field-level proposals for one step. Returns the step unchanged when nothing applies. */
export function proposeStep<T extends ProposalStep>(step: T, lookup?: StepLookup): T {
  let changed = false;
  const fields: ProposalField[] = [];
  for (const f of step.field_definitions) {
    let g = f;
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
    // P-CONSENT-GATE — results are filed later, so they cannot block the consent verify
    if (["bgc_result_file", "bgc_results", "bgc_results_reason", "bgc_decision"].includes(f.slug)) {
      g = withMeta({ ...g, required: false }, "P-CONSENT-GATE");
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
  // P-FEE-WAIVER — rebuild the fee step in the reviewed order.
  const fee = proposeFeeStep(fields, lookup);
  if (fee) return { ...step, field_definitions: fee };
  return changed ? { ...step, field_definitions: fields } : step;
}

/* ── Rules the engine applies (production behaviour, confirmed 2026-11-20) ────── */

/** A driver answer that ends the application on submit, with the reason the tool records. */
export function autoRejectReason(values: Record<string, unknown>): string | null {
  const dob = values.date_of_birth;
  if (typeof dob === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    const age = ageOn(dob, "2026-11-20");
    if (age >= 14 && age < 25) return "Under 25 (age requirement)";
  }
  if (values.ack_tos === false) return "Declined the Driver Terms & Conditions";
  if (values.ack_intro_aggreement === false) return "Chose not to continue (Welcome to Wingz)";
  if (values.ack_bgc_information === false) return "Chose not to continue (driver standards)";
  if (values.ack_inspection_requirements === false) return "Declined vehicle inspection requirements";
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
