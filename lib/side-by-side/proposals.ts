/**
 * PROTOTYPE — side-by-side: the PROPOSED changes from the 2026-11-20 reviews, applied on top of
 * the production-based payload. Nothing here is approved story text; every change is listed in
 * `PROPOSALS` and tagged "Proposed" wherever it renders.
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
  { id: "P-FEE-WAIVER", title: "Fee waiver: a photo of 2 safety-equipment items instead of the receipt", source: "Onboarding review C3 (Mae)" },
  { id: "P-CONSENT-GATE", title: "Background Check verifies the signed consent; the result is not awaited", source: "Onboarding review C4" },
  { id: "P-PASS3", title: "Verida Training opens once D.Lawson marks BGC, MVR and drug test PASS", source: "Onboarding review C5" },
  { id: "P-EPASSPORT", title: "Onboarding uploads the EPassport; the driver views it", source: "Onboarding review C6" },
  { id: "P-LINKS", title: "Amazon / Walmart link per safety item", source: "Onboarding review C7 + Luis's links" },
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

/** Field-level proposals for one step. Returns the step unchanged when nothing applies. */
export function proposeStep<T extends ProposalStep>(step: T): T {
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
    // P-FEE-WAIVER — the receipt shows only when paying
    if (f.slug === "background_check_fee_receipt") {
      g = withMeta({ ...g, visibility_rule: { "==": [{ var: "bgc_fee_method" }, "pay"] } }, "P-FEE-WAIVER");
    }
    if (g !== f) changed = true;
    fields.push(g);
    // P-FEE-WAIVER — the choice goes right before the receipt
    if (f.slug === "bgc_fee_payment_steps") {
      changed = true;
      fields.push({
        slug: "bgc_fee_method",
        label: "How are you covering the background check fee?",
        field_type: "radio",
        required: true,
        visibility: "external",
        options: [
          { label: "I'll pay the $15 fee", value: "pay" },
          { label: "I already have 2 safety equipment items (fee waived)", value: "waiver" },
        ],
        metadata: PROPOSED("P-FEE-WAIVER"),
      });
    }
    if (f.slug === "background_check_fee_receipt") {
      fields.push({
        slug: "bgc_fee_waiver_photo",
        label: "Photo of your 2 safety equipment items",
        field_type: "photo",
        required: true,
        visibility: "external",
        content: "Any 2 items from the required safety equipment list, together in one clear photo.",
        visibility_rule: { "==": [{ var: "bgc_fee_method" }, "waiver"] },
        metadata: PROPOSED("P-FEE-WAIVER"),
      });
    }
  }
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
