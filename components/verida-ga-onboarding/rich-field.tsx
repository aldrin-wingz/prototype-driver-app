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
 */
import { Fragment, type ReactNode } from "react";
import { ExternalLink, PlayCircle } from "lucide-react";

import { resolveFieldLink, type FieldDef } from "@/lib/verida-ga-onboarding/market-flow";

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

/** One field, as the driver reads it. `marketId` resolves per-market links (inspection booking). */
export function RichField({ field, marketId }: { field: FieldDef; marketId: number | null }) {
  const t = field.field_type;
  const meta = (field.metadata ?? {}) as { hide_on_mobile?: boolean; example_image?: string };
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

  if (t === "button" || t === "esign_action" || t === "stripe_onboarding_action") {
    return <LinkButton field={field} href={resolveFieldLink(field, marketId)} />;
  }
  if (t === "video") return <LinkButton field={field} href={resolveFieldLink(field, marketId)} video />;

  if (t === "photo" || t === "file" || t === "additional_file" || t === "signature") {
    return (
      <div>
        <Label field={field} />
        {field.content ? (
          <div className="mt-0.5 text-[12px] leading-relaxed" style={{ color: GRAY_3 }}>
            <RichText text={field.content} />
          </div>
        ) : null}
        {meta.example_image ? (
          <a href={meta.example_image} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element -- template-supplied path */}
            <img src={meta.example_image} alt={`Reference photo of ${field.label}`} className="h-24 w-24 rounded-md border border-[#E5E5E5] object-contain" />
          </a>
        ) : null}
        <div className="mt-1.5 rounded-lg border border-dashed border-[#D9D9D9] py-5 text-center text-[13px]" style={{ color: GRAY_3 }}>
          {t === "photo" ? "Take a photo or choose one" : t === "signature" ? "Sign here" : "Upload a file"}
        </div>
      </div>
    );
  }

  if (t === "acknowledgment" || t === "acknowledgement") {
    return (
      <div>
        {field.content ? (
          <div
            className="mb-2 max-h-48 overflow-y-auto rounded-lg border border-[#ECECEC] bg-[#FAFAFA] p-3 text-[13px] leading-relaxed"
            style={{ color: TEXT }}
          >
            <RichText text={field.content} />
          </div>
        ) : null}
        <label className="flex items-start gap-2 text-[14px]">
          <input type="checkbox" className="mt-1" readOnly />
          <span>
            {field.label}
            {field.required ? <span className="text-red-500"> *</span> : null}
          </span>
        </label>
      </div>
    );
  }

  const options = Array.isArray(field.options)
    ? (field.options as unknown[]).map((o) => (typeof o === "string" ? o : String((o as { label?: string }).label ?? "")))
    : [];
  return (
    <div>
      <Label field={field} />
      <div className="mt-1.5 rounded-lg border px-3 py-3 text-[14px]" style={{ borderColor: GRAY_7, color: GRAY_3 }}>
        {t === "radio" || t === "select" ? options.join(" / ") || " " : field.help_text || " "}
      </div>
    </div>
  );
}
