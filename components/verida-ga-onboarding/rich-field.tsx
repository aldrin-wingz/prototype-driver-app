"use client";

/**
 * FEATURE (verida-ga-onboarding) — how a step's fields read on the phone: full copy, real links,
 * and the images the September Verida GA prototype carried.
 *
 * Ported from the portal renderer the September prototype used, not from the native app:
 *   real: wingz-driver-portal components/onboarding/dynamic-field.tsx:533-640 (rich text: markdown
 *         links, bare URLs, **bold**, `code`, newlines) and :860-960 (info_list with item images,
 *         `image_layout: "wide"`, `highlight: "row"`, ordered vs bullet) @ luis/onboarding-new-stages.
 * ⚠️ Images inside information lists are the PRD 2 story "Add images to information list items" —
 * proposed, not in the production app (develop cb752e402 renders info_list as text only).
 * Links open in a new tab. Nothing is submitted.
 *
 * Revised 2026-11-18 to production's controls (android prod 39b403b78):
 *   - scroll ack → terms panel + "Scroll to read all terms" + Yes/No, muted until read
 *     (ScrollAckPollField.tsx, scrollAcknowledgment.ts:57-75)
 *   - select → dropdown with "Choose one" (DynamicFormRenderer.tsx:607-640)
 *   - checkboxes → bordered rows with a green box (DynamicFormRenderer.tsx:707-760)
 *   - file / photo → 140px dashed drop zone, icon, "Click to upload a photo", hint inside
 *     (DynamicFilePhotoField.tsx:142-205, filePhotoFieldCopy.ts)
 * Values live in the wizard keyed by slug, so a certificate uploaded on one step shows as uploaded
 * on any later step that shares the slug.
 */
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Calendar, Camera, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronsDown, Clock, ExternalLink, FileText, PlayCircle } from "lucide-react";

import { resolveFieldLink, type FieldDef } from "@/lib/verida-ga-onboarding/market-flow";
import { OCR_NOTE, ocrFor, ocrLine } from "@/lib/verida-ga-compliance/ocr";
import {
  ESIGN_ACK_SLUG,
  ESIGN_SIGNATURE_SLUG,
  ESIGN_SIGNED_BODY,
  ESIGN_SIGNED_TITLE,
  PROTOTYPE_SIGNATURE_ID,
  STRIPE_SIGNED_BODY,
  STRIPE_SIGNED_TITLE,
  STRIPE_SYNC_SLUG,
  stripeCompletion,
  choiceOptions,
  isScrollAck,
  sampleUploadName,
  scrollAckLabels,
  toggleChoice,
  type Values,
} from "@/lib/verida-ga-onboarding/field-logic";

const GREEN = "#16CFA9";
const GRAY_3 = "#9B9B9B";
const GRAY_7 = "#D9D9D9";
const TEXT = "#3A3A3A";

const MARKDOWN_LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
const BARE_URL_RE = /(https?:\/\/[^\s)]+[^\s).,;])/g;

/** The live template stores some newlines as the two characters "\n". */
function withNewlines(s: string): string {
  return s.replace(/\\n/g, "\n");
}

function A({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2" style={{ color: GREEN }}>
      {children}
    </a>
  );
}

/** **bold**, `code` and newlines. */
function highlights(text: string): ReactNode {
  const out: ReactNode[] = [];
  const re = /`([^`]*)`|\*\*([^*]*)\*\*|\r?\n/g;
  let last = 0;
  let k = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(<Fragment key={k++}>{text.slice(last, m.index)}</Fragment>);
    if (m[1] !== undefined) out.push(<code key={k++} className="rounded bg-[#F0F0F0] px-1 font-semibold">{m[1]}</code>);
    else if (m[2] !== undefined) out.push(<strong key={k++} className="font-semibold text-black">{m[2]}</strong>);
    else out.push(<br key={k++} />);
    last = re.lastIndex;
  }
  if (last < text.length) out.push(<Fragment key={k++}>{text.slice(last)}</Fragment>);
  return <>{out}</>;
}

function bareUrls(text: string): ReactNode {
  const parts = text.split(BARE_URL_RE);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <A key={i} href={p}>
            {p}
          </A>
        ) : (
          <Fragment key={i}>{highlights(p)}</Fragment>
        ),
      )}
    </>
  );
}

/** Markdown links first, then bare URLs, then highlights. */
export function RichText({ text }: { text: string }) {
  const s = withNewlines(text);
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of s.matchAll(MARKDOWN_LINK_RE)) {
    const i = m.index ?? 0;
    if (i > last) out.push(<Fragment key={k++}>{bareUrls(s.slice(last, i))}</Fragment>);
    out.push(
      <A key={k++} href={m[2]}>
        {highlights(m[1])}
      </A>,
    );
    last = i + m[0].length;
  }
  if (last < s.length) out.push(<Fragment key={k++}>{bareUrls(s.slice(last))}</Fragment>);
  return <>{out}</>;
}

function Label({ field }: { field: FieldDef }) {
  return (
    <div className="text-[14px] font-semibold">
      {field.label}
      {field.required ? <span className="text-red-500"> *</span> : null}
    </div>
  );
}

function InfoList({ field }: { field: FieldDef }) {
  const items = field.items ?? [];
  const wide = (field.metadata as { image_layout?: string } | null | undefined)?.image_layout === "wide";
  const ordered = field.list_type === "ordered";
  const hasImages = items.some((i) => i.image);
  const hasText = items.some((i) => i.text?.trim());
  const paragraphs = withNewlines(field.content ?? "")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const ListTag = ordered ? "ol" : "ul";
  return (
    <div className="rounded-lg border border-[#ECECEC] bg-[#FAFAFA] p-3">
      <div className="mb-2 text-[14px] font-semibold">{field.label}</div>
      {items.length ? (
        <ListTag
          className={[
            "space-y-2 text-[13px] leading-relaxed",
            ordered ? "list-decimal pl-5" : "list-disc pl-5",
            hasImages && !wide ? "list-none pl-0" : "",
            hasImages && !hasText ? "list-none pl-0" : "",
          ].join(" ")}
          style={{ color: TEXT }}
        >
          {items.map((item, idx) => (
            <li
              key={idx}
              className={[
                item.highlight === "row" ? "rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-black" : "",
                item.highlight === "row" && !ordered ? "list-none" : "",
                item.image && !wide ? "flex items-start gap-3" : "",
              ].join(" ")}
            >
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- template-supplied path
                <img
                  src={item.image}
                  alt=""
                  loading="lazy"
                  className={wide ? "mb-2 block h-auto w-full rounded-md border border-[#E5E5E5]" : "h-14 w-14 shrink-0 rounded-md border border-[#E5E5E5] object-cover"}
                />
              ) : null}
              <span className={item.image && !wide ? "min-w-0 flex-1 pt-0.5" : ""}>
                <RichText text={item.text ?? ""} />
              </span>
            </li>
          ))}
        </ListTag>
      ) : (
        <div className="space-y-2 text-[13px] leading-relaxed" style={{ color: TEXT }}>
          {paragraphs.map((p, i) => (
            <div key={i}>
              <RichText text={p} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LinkButton({ field, href, video }: { field: FieldDef; href: string | null; video?: boolean }) {
  const label = (video ? field.content || field.label : field.label) || "Open";
  if (!href) {
    return (
      <div className="rounded-lg border py-2.5 text-center text-[14px] font-medium" style={{ borderColor: GRAY_7, color: GRAY_3 }}>
        {label} <span className="text-[11px]">(no link for this market)</span>
      </div>
    );
  }
  const download = Boolean((field.metadata as { download?: boolean } | null | undefined)?.download);
  let host = "";
  try {
    host = href.startsWith("/") ? "" : new URL(href).host.replace(/^www\./, "");
  } catch {
    host = "";
  }
  return (
    <div>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        download={download || undefined}
        className="flex items-center justify-center gap-1.5 rounded-lg py-2.5 text-center text-[14px] font-semibold text-white"
        style={{ backgroundColor: GREEN }}
      >
        {video ? <PlayCircle className="h-4 w-4" /> : null}
        {label}
        <ExternalLink className="h-3.5 w-3.5 opacity-80" />
      </a>
      {host || download ? (
        <div className="mt-1 text-center text-[11px]" style={{ color: GRAY_3 }}>
          {download ? "Downloads the file" : `Opens ${host}`}
        </div>
      ) : null}
    </div>
  );
}

const GREEN_TINT = "#E8FAF4";
const MUTED = "#C9C9C9";

type OnValue = (slug: string, value: unknown) => void;
type OnPatch = (patch: Record<string, unknown>) => void;

/**
 * real: DynamicFormRenderer.tsx:1006 (esign_action) + ActionSuccessCard.tsx. Before signing: the sign button.
 * After: a disabled success card. The prototype signs instantly instead of opening HelloSign, and records what the
 * backend webhook records (signature id + the internal consent box). It never submits the step.
 */
/** real: ActionSuccessCard.tsx — the disabled "done" card an e-sign / Stripe button turns into. */
function ActionDoneCard({ title, body, testId }: { title: string; body: string; testId: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border p-3" style={{ borderColor: GREEN, backgroundColor: GREEN_TINT }} data-testid={testId}>
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: GREEN }}>
        <Check className="h-3 w-3 text-white" />
      </span>
      <div>
        <div className="text-[14px] font-semibold">{title}</div>
        <div className="text-[12px]" style={{ color: GRAY_3 }}>
          {body}
        </div>
      </div>
    </div>
  );
}

/**
 * real: DynamicFormRenderer.tsx (stripe_onboarding_action) + the backend's completed override. The prototype completes
 * Stripe instantly instead of opening it, writing what Stripe's confirmation writes. It never submits the step.
 */
function StripeField({ field, synced, onPatch, readOnly }: { field: FieldDef; synced: boolean; onPatch: OnPatch; readOnly: boolean }) {
  if (synced) return <ActionDoneCard title={STRIPE_SIGNED_TITLE} body={STRIPE_SIGNED_BODY} testId="stripe-done" />;
  return (
    <div>
      <button
        type="button"
        disabled={readOnly}
        data-testid="stripe-setup"
        onClick={() => onPatch(stripeCompletion(new Date().toISOString()))}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-center text-[14px] font-semibold text-white disabled:opacity-60"
        style={{ backgroundColor: GREEN }}
      >
        {field.label || "Set up with Stripe"}
      </button>
      <div className="mt-1 text-[11px]" style={{ color: GRAY_3 }}>
        Opens Stripe to add your bank and tax details. Prototype: completes instantly.
      </div>
    </div>
  );
}

function EsignField({ field, value, onPatch, readOnly }: { field: FieldDef; value: unknown; onPatch: OnPatch; readOnly: boolean }) {
  const signed = typeof value === "string" ? value.trim() !== "" : value != null && value !== false;
  if (signed) return <ActionDoneCard title={ESIGN_SIGNED_TITLE} body={ESIGN_SIGNED_BODY} testId="esign-signed" />;
  return (
    <div>
      <button
        type="button"
        disabled={readOnly}
        data-testid="esign-sign"
        onClick={() => onPatch({ [field.slug]: PROTOTYPE_SIGNATURE_ID, [ESIGN_SIGNATURE_SLUG]: PROTOTYPE_SIGNATURE_ID, [ESIGN_ACK_SLUG]: true })}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2.5 text-center text-[14px] font-semibold text-white disabled:opacity-60"
        style={{ backgroundColor: GREEN }}
      >
        <FileText className="h-4 w-4" />
        {field.content?.trim() || field.label || "Review & sign"}
      </button>
      {field.help_text?.trim() ? (
        <div className="mt-1 text-[11px]" style={{ color: GRAY_3 }}>
          {field.help_text.trim()}
        </div>
      ) : null}
    </div>
  );
}

function Required({ field }: { field: FieldDef }) {
  return field.required ? <span className="text-red-500"> *</span> : null;
}

/** real: ScrollAckPollField.tsx — terms panel, fade + bouncing chevrons, Yes/No muted until read. */
function ScrollAck({ field, value, onChange }: { field: FieldDef; value: unknown; onChange: OnValue }) {
  const panel = useRef<HTMLDivElement>(null);
  const [read, setRead] = useState(false);
  const { yes, no } = scrollAckLabels(field.slug);
  const question = field.help_text?.trim() || field.label;
  useEffect(() => {
    const el = panel.current;
    if (el && el.scrollHeight <= el.clientHeight + 8) setRead(true); // short text fits: nothing to scroll
  }, [field.content]);
  return (
    <div>
      <div className="relative rounded-lg border border-[#ECECEC] bg-[#FAFAFA]">
        <div
          ref={panel}
          onScroll={(e) => {
            const el = e.currentTarget;
            if (el.scrollTop + el.clientHeight >= el.scrollHeight - 8) setRead(true);
          }}
          className="max-h-60 overflow-y-auto whitespace-pre-line p-3 text-[12px] leading-relaxed"
          style={{ color: TEXT }}
          data-testid={`terms-${field.slug}`}
        >
          {String(field.content ?? "").replace(/\\n/g, "\n")}
        </div>
        {!read ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-[72px] flex-col items-center justify-end rounded-b-lg bg-gradient-to-b from-transparent via-white/60 to-white pb-1.5">
            <span className="text-[11px] font-semibold" style={{ color: GRAY_3 }}>
              Scroll to read all terms
            </span>
            <ChevronsDown className="h-5 w-5 animate-bounce" style={{ color: GRAY_3 }} />
          </div>
        ) : null}
      </div>
      <div className="mt-2.5 rounded-lg border p-3" style={{ borderColor: read ? GRAY_7 : "#EFEFEF" }}>
        <div className="text-[14px] font-semibold" style={{ color: read ? undefined : MUTED }}>
          {question}
          <Required field={field} />
        </div>
        {[
          { lbl: yes, val: true },
          // `metadata.yes_only` (Verida GA read-first agreements): no No, so no decline / rejection
          ...(field.metadata?.yes_only ? [] : [{ lbl: no, val: false }]),
        ].map(({ lbl, val }) => {
          const on = value === val;
          return (
            <button
              key={String(val)}
              type="button"
              disabled={!read}
              data-testid={`poll-${field.slug}-${val ? "yes" : "no"}`}
              onClick={() => onChange(field.slug, val)}
              className="mt-2 flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-[13px] disabled:cursor-not-allowed"
              style={{ borderColor: on ? GREEN : GRAY_7, backgroundColor: on ? GREEN_TINT : "#FFF", color: read ? TEXT : MUTED }}
            >
              <span
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2"
                style={{ borderColor: read ? GREEN : MUTED }}
              >
                {on ? <span className="h-2 w-2 rounded-full" style={{ backgroundColor: GREEN }} /> : null}
              </span>
              {lbl}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** real: DynamicFilePhotoField.tsx:142-205 — dashed 140px drop zone; filled state on green tint. */
function Upload({ field, value, onChange }: { field: FieldDef; value: unknown; onChange: OnValue }) {
  const isPhoto = field.field_type === "photo";
  const filled = typeof value === "string" && value.trim() !== "";
  const Icon = isPhoto ? Camera : FileText;
  const cta = field.placeholder?.trim() || (isPhoto ? "Click to upload a photo" : "Click to upload a file");
  const example = (field.metadata as { example_image?: string } | null | undefined)?.example_image;
  // PROTOTYPE (Luis 2026-11-24): a dated document fills its date on upload, as an OCR read (lib/verida-ga-compliance/ocr.ts).
  const ocr = filled ? ocrFor(field.slug) : undefined;
  return (
    <div>
      <div className="text-[14px] font-semibold">
        {field.label}
        <Required field={field} />
      </div>
      {example ? (
        <a href={example} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element -- template-supplied path */}
          <img src={example} alt={`Example: ${field.label}`} className="h-24 w-24 rounded-md border border-[#E5E5E5] object-contain" />
        </a>
      ) : null}
      <button
        type="button"
        data-testid={`upload-${field.slug}`}
        onClick={() => onChange(field.slug, filled ? "" : sampleUploadName(field))}
        className="mt-1.5 flex min-h-[140px] w-full flex-col items-center justify-center rounded-lg border border-dashed p-4 text-center"
        style={{ borderColor: filled ? GREEN : GRAY_7, backgroundColor: filled ? GREEN_TINT : "#FFF" }}
      >
        <Icon className="h-7 w-7" style={{ color: filled ? GREEN : GRAY_3 }} />
        {filled ? (
          <>
            <span className="mt-2 text-[13px] font-semibold" style={{ color: TEXT }}>
              {String(value)}
            </span>
            <span className="mt-1 text-[12px]" style={{ color: GREEN }}>
              Click to change
            </span>
          </>
        ) : (
          <>
            <span className="mt-2 text-[12px]" style={{ color: "#4A4A4A" }}>
              {cta}
            </span>
            {field.content?.trim() ? (
              <span className="mt-1.5 px-2 text-[12px] leading-[18px]" style={{ color: GRAY_3 }}>
                <RichText text={field.content} />
              </span>
            ) : null}
          </>
        )}
      </button>
      {ocr ? (
        <div className="mt-1.5 flex items-center justify-between rounded-md bg-[#F2FBF8] px-3 py-2 text-[12.5px]" data-testid={`ocr-${field.slug}`}>
          <span className="font-semibold" style={{ color: TEXT }}>
            {ocrLine(ocr, ocr.sample)}
          </span>
          <span style={{ color: GRAY_3 }}>{OCR_NOTE}</span>
        </div>
      ) : null}
    </div>
  );
}

/** One field, as the driver reads it. `marketId` resolves per-market links (inspection booking). */
export function RichField({
  field,
  marketId,
  value,
  onChange,
  onPatch,
  values,
  readOnly = false,
}: {
  field: FieldDef;
  marketId: number | null;
  value?: unknown;
  /** The step's other values (the Stripe card reads the sync value Stripe's confirmation writes). */
  values?: Record<string, unknown>;
  onChange?: OnValue;
  /** Several values at once (the e-sign webhook's writes). Falls back to one onChange per value. */
  onPatch?: OnPatch;
  /** The step is submitted (pending review / verified): fields that have a summary form show it. */
  readOnly?: boolean;
}) {
  const set: OnValue = onChange ?? (() => undefined);
  const t = field.field_type;
  const meta = (field.metadata ?? {}) as { hide_on_mobile?: boolean };
  if (meta.hide_on_mobile) return null;
  if (t === "async_value" || t === "hidden" || t === "northpass_webhook") return null;

  if (t === "heading") return <div className="pt-2 text-[15px] font-semibold">{field.label}</div>;

  if (t === "info" || t === "age_gate") {
    return (
      <div className="rounded-lg border border-[#ECECEC] bg-[#FAFAFA] p-3">
        <div className="text-[14px] font-semibold">{field.label}</div>
        {field.content ? (
          <div className="mt-1 text-[13px] leading-relaxed" style={{ color: TEXT }}>
            <RichText text={field.content} />
          </div>
        ) : null}
      </div>
    );
  }

  if (t === "info_list") return <InfoList field={field} />;

  if (t === "esign_action") {
    const patch: OnPatch = onPatch ?? ((p) => Object.entries(p).forEach(([k, v]) => set(k, v)));
    return <EsignField field={field} value={value} onPatch={patch} readOnly={readOnly} />;
  }
  if (t === "stripe_onboarding_action") {
    const patch: OnPatch = onPatch ?? ((p) => Object.entries(p).forEach(([k, v]) => set(k, v)));
    return <StripeField field={field} synced={Boolean(values?.[STRIPE_SYNC_SLUG])} onPatch={patch} readOnly={readOnly} />;
  }
  if (t === "button") {
    return <LinkButton field={field} href={resolveFieldLink(field, marketId)} />;
  }
  if (t === "video") return <LinkButton field={field} href={resolveFieldLink(field, marketId)} video />;

  if (t === "calendar") return <CalendarField field={field} value={value} onChange={set} readOnly={readOnly} />;
  if (t === "photo" || t === "file" || t === "additional_file" || t === "signature") {
    return <Upload field={field} value={value} onChange={set} />;
  }

  if (isScrollAck(field)) return <ScrollAck field={field} value={value} onChange={set} />;

  if (t === "acknowledgment" || t === "acknowledgement") {
    const on = value === true;
    return (
      <button type="button" onClick={() => set(field.slug, !on)} className="flex w-full items-start gap-2.5 text-left text-[14px]" data-testid={`ack-${field.slug}`}>
        <span
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2"
          style={{ borderColor: GREEN, backgroundColor: on ? GREEN : "transparent" }}
        >
          {on ? <Check className="h-3 w-3 text-white" /> : null}
        </span>
        <span>
          {field.label}
          <Required field={field} />
        </span>
      </button>
    );
  }

  if (t === "checkboxes" || t === "multi_checkbox" || t === "multi_select_checkbox") {
    const options = choiceOptions(field);
    const selected = Array.isArray(value) ? value.map(String) : [];
    return (
      <div>
        <div className="mb-1.5 text-[14px] font-semibold">
          {field.label}
          <Required field={field} />
        </div>
        {options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              data-testid={`choice-${field.slug}-${o.value}`}
              onClick={() => set(field.slug, toggleChoice(selected, o, options))}
              className="mb-2 flex w-full items-center gap-2.5 rounded-lg border bg-white p-3 text-left"
              style={{ borderColor: on ? GREEN : GRAY_7 }}
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2"
                style={{ borderColor: GREEN, backgroundColor: on ? GREEN : "transparent" }}
              >
                {on ? <Check className="h-3 w-3 text-white" /> : null}
              </span>
              <span className="text-[14px] font-semibold">{o.label}</span>
            </button>
          );
        })}
        {field.help_text ? (
          <div className="text-[12px]" style={{ color: GRAY_3 }}>
            {field.help_text}
          </div>
        ) : null}
      </div>
    );
  }

  if (t === "select" || t === "dropdown" || t === "radio") {
    const options = choiceOptions(field);
    return (
      <label className="block">
        <span className="text-[14px] font-semibold">
          {field.label}
          <Required field={field} />
        </span>
        <span className="relative mt-1.5 block">
          <select
            value={typeof value === "string" ? value : ""}
            onChange={(e) => set(field.slug, e.target.value)}
            className="w-full appearance-none rounded-lg border bg-white px-3 py-2.5 pr-9 text-[14px]"
            style={{ borderColor: GRAY_7, color: value ? TEXT : GRAY_3, minHeight: 44 }}
          >
            <option value="" disabled>
              {field.placeholder?.trim() || "Choose one"}
            </option>
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: GRAY_3 }} />
        </span>
        {field.help_text ? (
          <span className="mt-1 block text-[12px]" style={{ color: GRAY_3 }}>
            {field.help_text}
          </span>
        ) : null}
      </label>
    );
  }

  const inputType = t === "date" ? "date" : t === "time" ? "time" : t === "number" ? "number" : t === "email" ? "email" : "text";
  return (
    <label className="block">
      <span className="text-[14px] font-semibold">
        {field.label}
        <Required field={field} />
      </span>
      {t === "textarea" ? (
        <textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => set(field.slug, e.target.value)}
          placeholder={field.placeholder ?? field.help_text ?? ""}
          className="mt-1.5 min-h-[88px] w-full rounded-lg border px-3 py-2.5 text-[14px]"
          style={{ borderColor: GRAY_7 }}
        />
      ) : (
        <input
          type={inputType}
          value={typeof value === "string" || typeof value === "number" ? String(value) : ""}
          onChange={(e) => set(field.slug, e.target.value)}
          placeholder={field.placeholder ?? field.help_text ?? ""}
          className="mt-1.5 w-full rounded-lg border px-3 py-2.5 text-[14px]"
          style={{ borderColor: GRAY_7, minHeight: 44 }}
        />
      )}
    </label>
  );
}

/* ── Info Call calendar ─────────────────────────────────────────────────────────
 * real: App/Components/DynamicForm/DynamicCalendarField.tsx + calendarSlots.ts (v6.0.538-production-ios):
 * "Select a Date" with a 3-day pager, day chips (weekday, date, month, "N slots"), "Available Times for
 * <day> (Eastern)" in a two-column grid, and a green "Info Call Scheduled" card with Change. Submitted
 * (pending review / verified) shows the card alone. The value is the slot's ISO start (what Cal.com books).
 * Slots are synthetic: production loads them from Cal.com availability for the market's event.
 */
const CAL_TZ = "America/New_York";
const CAL_DAYS_PER_PAGE = 3;
const CAL_GREEN_2 = "#00B692";
const CAL_GREEN_4 = "#EEFBF5";
const CAL_GREEN_6 = "#99E5D1";

interface CalSlot {
  id: string;
}
interface CalDay {
  iso: string;
  slots: CalSlot[];
}

/** Six business days from Mon 23 Nov 2026, Eastern (UTC-5); a different set of times each day. */
const CAL_DAYS: CalDay[] = (() => {
  const days = ["2026-11-23", "2026-11-24", "2026-11-25", "2026-11-27", "2026-11-30", "2026-12-01"];
  const times = ["14:00", "14:30", "15:00", "15:30", "16:00", "18:00", "18:30", "19:00", "19:30", "20:00"];
  return days.map((iso, i) => ({
    iso,
    slots: times.filter((_, k) => (k + i) % 3 !== 0 || k === 2).map((hm) => ({ id: `${iso}T${hm}:00Z` })),
  }));
})();

function calFmt(iso: string, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", { timeZone: CAL_TZ, ...opts }).format(new Date(iso));
}
function calChip(dayIso: string) {
  const noon = `${dayIso}T17:00:00Z`;
  return { dow: calFmt(noon, { weekday: "short" }).toUpperCase(), dom: calFmt(noon, { day: "numeric" }), mon: calFmt(noon, { month: "short" }) };
}
function calDayHeading(dayIso: string) {
  return calFmt(`${dayIso}T17:00:00Z`, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}
function calTime(slotIso: string) {
  return calFmt(slotIso, { hour: "numeric", minute: "2-digit" });
}
function calSummary(slotIso: string) {
  const zone = calFmt(slotIso, { timeZoneName: "short" }).split(" ").pop();
  return `${calFmt(slotIso, { month: "short", day: "numeric", year: "numeric" })}, ${calTime(slotIso)} (${zone})`;
}
function calDayOf(slotIso: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: CAL_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(slotIso));
}

function CalendarField({ field, value, onChange, readOnly }: { field: FieldDef; value: unknown; onChange: OnValue; readOnly: boolean }) {
  const selected = typeof value === "string" && !Number.isNaN(new Date(value).getTime()) ? value : null;
  const selectedDay = selected ? calDayOf(selected) : null;
  const [activeDay, setActiveDay] = useState<string | null>(selectedDay);
  const [start, setStart] = useState(() => {
    const idx = CAL_DAYS.findIndex((d) => d.iso === selectedDay);
    return idx >= 0 ? Math.min(idx, CAL_DAYS.length - CAL_DAYS_PER_PAGE) : 0;
  });
  useEffect(() => {
    if (selectedDay) setActiveDay(selectedDay);
  }, [selectedDay]);

  const label = (
    <div className="mb-2 text-[14px] font-semibold">
      {field.label}
      <Required field={field} />
    </div>
  );
  const card = selected ? (
    <ScheduledCard slotIso={selected} onChangePress={readOnly ? undefined : () => { onChange(field.slug, ""); setActiveDay(null); }} />
  ) : null;

  if (readOnly) {
    return (
      <div data-testid="calendar-field" data-mode="summary">
        {label}
        {card ?? <div className="text-[13px]" style={{ color: GRAY_3 }}>No time booked.</div>}
      </div>
    );
  }

  const visible = CAL_DAYS.slice(start, start + CAL_DAYS_PER_PAGE);
  const day = activeDay ? CAL_DAYS.find((d) => d.iso === activeDay) : undefined;
  const canBack = start > 0;
  const canFwd = start + CAL_DAYS_PER_PAGE < CAL_DAYS.length;

  return (
    <div data-testid="calendar-field" data-mode="picker">
      {label}
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[12px] font-medium" style={{ color: TEXT }}>
          <Calendar className="h-[18px] w-[18px]" style={{ color: GRAY_3 }} /> Select a Date
        </div>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Previous dates" disabled={!canBack} onClick={() => setStart((x) => Math.max(0, x - CAL_DAYS_PER_PAGE))} className="p-1 disabled:opacity-50">
            <ChevronLeft className="h-5 w-5" style={{ color: canBack ? GRAY_3 : GRAY_7 }} />
          </button>
          <button type="button" aria-label="Next dates" disabled={!canFwd} onClick={() => setStart((x) => Math.min(CAL_DAYS.length - CAL_DAYS_PER_PAGE, x + CAL_DAYS_PER_PAGE))} className="p-1 disabled:opacity-50">
            <ChevronRight className="h-5 w-5" style={{ color: canFwd ? GRAY_3 : GRAY_7 }} />
          </button>
        </div>
      </div>
      <div className="flex gap-2 pb-1">
        {visible.map((d) => {
          const c = calChip(d.iso);
          const on = d.iso === activeDay;
          return (
            <button
              key={d.iso}
              type="button"
              data-testid="calendar-day"
              onClick={() => {
                setActiveDay(d.iso);
                if (selected && selectedDay !== d.iso) onChange(field.slug, "");
              }}
              className="flex min-h-[100px] min-w-0 flex-1 flex-col items-center justify-center rounded-lg bg-white px-1 py-3"
              style={{ border: on ? `2px solid ${GREEN}` : `1px solid ${GRAY_7}`, backgroundColor: on ? CAL_GREEN_4 : "#FFF" }}
            >
              <span className="text-[11px] tracking-[0.3px]" style={{ color: on ? CAL_GREEN_2 : GRAY_3 }}>{c.dow}</span>
              <span className="text-[18px] font-medium" style={{ color: on ? CAL_GREEN_2 : TEXT }}>{c.dom}</span>
              <span className="text-[11px]" style={{ color: GRAY_3 }}>{c.mon}</span>
              <span className="mt-1.5 text-[12px] font-medium" style={{ color: on ? CAL_GREEN_2 : GREEN }}>
                {d.slots.length} slot{d.slots.length === 1 ? "" : "s"}
              </span>
            </button>
          );
        })}
      </div>
      {!day ? (
        <p className="mt-4 text-center text-[12px] leading-[18px]" style={{ color: GRAY_3 }}>
          Select a date above to see available info call times.
        </p>
      ) : (
        <div className="mt-4">
          <div className="mb-2.5 flex items-start gap-2 text-[12px] font-medium leading-[18px]" style={{ color: TEXT }}>
            <Clock className="h-[18px] w-[18px] shrink-0" style={{ color: GRAY_3 }} />
            Available Times for {calDayHeading(day.iso)} (Eastern)
          </div>
          <div className="grid grid-cols-2 gap-2">
            {day.slots.map((slot) => {
              const on = slot.id === selected;
              return (
                <button
                  key={slot.id}
                  type="button"
                  data-testid="calendar-slot"
                  onClick={() => onChange(field.slug, slot.id)}
                  className="flex min-h-[44px] items-center justify-center rounded-lg px-2 py-2.5 text-[14px] font-medium"
                  style={{ border: `1px solid ${on ? GREEN : GRAY_7}`, backgroundColor: on ? GREEN : "#FFF", color: on ? "#FFF" : TEXT }}
                >
                  {calTime(slot.id)}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {card ? <div className="mt-6">{card}</div> : null}
    </div>
  );
}

function ScheduledCard({ slotIso, onChangePress }: { slotIso: string; onChangePress?: () => void }) {
  return (
    <div className="rounded-lg border p-3.5" style={{ borderColor: CAL_GREEN_6, backgroundColor: CAL_GREEN_4 }} data-testid="calendar-scheduled">
      <div className="flex items-center gap-3">
        <Check className="h-5 w-5 shrink-0" style={{ color: GREEN }} />
        <div className="min-w-0 flex-1 text-[12px]">
          <div className="mb-1 font-medium" style={{ color: TEXT }}>Info Call Scheduled</div>
          <div className="mb-1 font-medium" style={{ color: TEXT }}>{calSummary(slotIso)}</div>
          <div className="leading-[18px]" style={{ color: GRAY_3 }}>You&apos;ll receive a Google Meet invite by email.</div>
        </div>
        {onChangePress ? (
          <button type="button" onClick={onChangePress} className="self-center pl-1 text-[12px] font-semibold" style={{ color: GREEN }} data-testid="calendar-change">
            Change
          </button>
        ) : null}
      </div>
    </div>
  );
}
