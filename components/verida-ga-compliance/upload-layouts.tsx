"use client";

/**
 * ⚠️ PROPOSED (Luis, V14 2026-11-20): two alternative layouts for the In-App Compliance photo upload, built side by side so
 * the feel can be compared before engineering decides. Neither is in driver app #353, whose upload screen goes through the
 * photos one at a time in a fixed order (see UploadScreen in screens.tsx).
 *   • PagerUpload     — one photo per page, with a page selector (‹ 3 / 9 ›, plus a strip of chips to jump to any photo).
 *   • ChecklistUpload — every photo on one screen; each row shows the guide image beside the driver's photo.
 * Both: the guide is the onboarding field's example image (metadata.example_image), any order, retake one photo, and
 * Submit for Review only once every photo is added. Photo capture is a placeholder, as in the PR.
 */
import { useState } from "react";

import type { UploadField } from "@/lib/verida-ga-compliance/catalog";
import type { ComplianceProvider } from "@/lib/verida-ga-compliance/types";
export { hasGuides } from "@/lib/verida-ga-compliance/catalog";
import { COMPLIANCE_ICON_PATHS } from "@/lib/verida-ga-compliance/view-model";

import { GREEN, INK, Icon, PAGE_BG, PrimaryButton, card } from "./parts";

/** COMPLIANCE_ICON_PATHS.camera plus a lens, so it reads as a camera at small sizes. */
const CAMERA = `${COMPLIANCE_ICON_PATHS.camera}M12 10.2a3.1 3.1 0 110 6.2 3.1 3.1 0 010-6.2z`;

export type UploadLayout = "built" | "guide" | "pager" | "checklist";

export const UPLOAD_LAYOUTS: { key: UploadLayout; label: string; note: string }[] = [
  { key: "built", label: "#353 as built", note: "One photo at a time, fixed order, an icon card for every photo." },
  { key: "guide", label: "One at a time + guide", note: "#353's flow with the guide image added (E19 as first proposed)." },
  { key: "pager", label: "Page selector", note: "One photo per page; ‹ 3 / 9 › and a chip strip to jump to any photo." },
  { key: "checklist", label: "Checklist", note: "Every photo on one screen; guide image beside the driver's photo in each row." },
];

function Guide({ field, size }: { field: UploadField; size: "large" | "small" }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- template-supplied path
    <img
      src={field.exampleImage}
      alt={`Example: ${field.label}`}
      className={`w-full rounded-lg bg-white object-contain ${size === "large" ? "h-[150px]" : "h-[96px]"}`}
    />
  );
}

/** The driver's photo once taken (capture is a placeholder, as in #353). */
function TakenPhoto({ size }: { size: "large" | "small" }) {
  return (
    <div
      className={`flex w-full flex-col items-center justify-center gap-1 rounded-lg ${size === "large" ? "h-[150px]" : "h-[96px]"}`}
      style={{ background: "#DDF2EC" }}
    >
      <Icon path={CAMERA} color="#00755A" size={size === "large" ? 30 : 22} strokeWidth={1.8} />
      <div className="text-[11px] font-bold text-[#00755A]">PHOTO ADDED</div>
    </div>
  );
}

function ChangeNote({ note }: { note: string }) {
  return (
    <div className="rounded-lg border border-[#FCD34D] bg-[#FFFBEB] p-3" data-testid="upload-change-note">
      <div className="font-bold" style={{ fontSize: 14, color: INK }}>
        Changes Requested
      </div>
      <div className="mt-1" style={{ fontSize: 13, lineHeight: "19px", color: "#92400E" }}>
        {note}
      </div>
    </div>
  );
}

function SubmitBar({ done, total, resubmit, onSubmit }: { done: number; total: number; resubmit: boolean; onSubmit: () => void }) {
  const left = total - done;
  return (
    <div className="pt-4">
      <PrimaryButton
        label={left === 0 ? (resubmit ? "Resubmit Changes" : "Submit for Review") : `Add ${left} more photo${left === 1 ? "" : "s"} to submit`}
        height={52}
        disabled={left > 0}
        testId="upload-submit"
        onClick={onSubmit}
      />
    </div>
  );
}

interface LayoutProps {
  fields: UploadField[];
  changeNote: string | null;
  onSubmit: () => void;
}

/** Page selector: one photo per page, ‹ n / N › arrows plus a chip per photo to jump; taking a photo moves to the next missing one. */
export function PagerUpload({ fields, changeNote, onSubmit }: LayoutProps) {
  const [index, setIndex] = useState(0);
  const [taken, setTaken] = useState<Record<string, boolean>>({});
  const field = fields[index];
  const done = fields.filter((f) => taken[f.slug]).length;
  const take = () => {
    const next = { ...taken, [field.slug]: true };
    setTaken(next);
    const after = [...fields.slice(index + 1), ...fields.slice(0, index)].find((f) => !next[f.slug]);
    if (after) setIndex(fields.indexOf(after));
  };
  const multi = fields.length > 1;
  return (
    <div className="flex flex-1 flex-col overflow-y-auto bg-white px-4 pb-6 pt-4" data-testid="upload-pager">
      {!!changeNote && <div className="mb-4"><ChangeNote note={changeNote} /></div>}
      {multi && (
        <>
          <div className="flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous photo"
              data-testid="pager-prev"
              disabled={index === 0}
              onClick={() => setIndex(index - 1)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#DDE3E1] disabled:opacity-30"
            >
              <span className="rotate-180">
                <Icon path={COMPLIANCE_ICON_PATHS.chevron} color={INK} size={14} strokeWidth={2.4} />
              </span>
            </button>
            <div className="text-center">
              <div className="font-bold" style={{ fontSize: 15, color: INK }} data-testid="pager-position">
                {index + 1} / {fields.length}
              </div>
              <div style={{ fontSize: 12, color: "#6B7280" }}>{done} of {fields.length} added</div>
            </div>
            <button
              type="button"
              aria-label="Next photo"
              data-testid="pager-next"
              disabled={index === fields.length - 1}
              onClick={() => setIndex(index + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#DDE3E1] disabled:opacity-30"
            >
              <Icon path={COMPLIANCE_ICON_PATHS.chevron} color={INK} size={14} strokeWidth={2.4} />
            </button>
          </div>
          <div className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1" data-testid="pager-chips">
            {fields.map((f, i) => (
              <button
                key={f.slug}
                type="button"
                data-testid={`pager-chip-${i + 1}`}
                title={f.label}
                onClick={() => setIndex(i)}
                className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full border px-2 text-[12px] font-bold"
                style={{
                  borderColor: i === index ? INK : taken[f.slug] ? GREEN : "#DDE3E1",
                  background: taken[f.slug] ? "#E8FAF4" : "#fff",
                  color: taken[f.slug] ? "#00966F" : INK,
                }}
              >
                {taken[f.slug] ? <Icon path={COMPLIANCE_ICON_PATHS.check} color="#00966F" size={13} strokeWidth={2.6} /> : i + 1}
              </button>
            ))}
          </div>
        </>
      )}
      <div className="mt-4 font-bold" style={{ fontSize: 18, lineHeight: "24px", color: INK }} data-testid="pager-label">
        {field.label}
      </div>
      <div className="mt-3 rounded-2xl border-2 border-dashed border-[#9FE3D3] bg-[#F1FCF8] p-3" data-testid="upload-example">
        <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#00966F]">Guide</div>
        <Guide field={field} size="large" />
      </div>
      {taken[field.slug] ? (
        <div className="mt-3">
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-[#6B7280]">Your photo</div>
          <TakenPhoto size="large" />
          <button
            type="button"
            data-testid="pager-retake"
            onClick={() => setTaken((t) => ({ ...t, [field.slug]: false }))}
            className="mt-2 w-full text-center text-[14px] font-bold text-[#00966F]"
          >
            Retake
          </button>
        </div>
      ) : (
        <div className="mt-4 space-y-2.5">
          <PrimaryButton label="Take Photo" height={52} testId="upload-take-photo" onClick={take} />
          <button
            type="button"
            onClick={take}
            className="h-[52px] w-full rounded-xl border-[1.5px] border-[#DDE3E1] font-bold"
            style={{ fontSize: 16, color: INK }}
          >
            Choose from Library
          </button>
        </div>
      )}
      <div className="mt-auto">
        <SubmitBar done={done} total={fields.length} resubmit={!!changeNote} onSubmit={onSubmit} />
      </div>
    </div>
  );
}

/**
 * ⚠️ PROPOSED (Luis, 2026-11-20): the onboarding step's instructions on the upload screen (Trade Dress, Signage). The
 * download button stays visible; the print / placement lists fold away, since the driver has done this once before.
 */
function StepInstructions({ instructions }: { instructions: ComplianceProvider }) {
  const [open, setOpen] = useState(false);
  const links = instructions.blocks.filter((b) => b.kind === "link" && b.url);
  const rest = instructions.blocks.filter((b) => b.kind !== "link");
  return (
    <div className="mb-3 flex flex-col gap-2.5 p-3.5" style={card} data-testid="upload-instructions">
      {!!instructions.description && (
        <div style={{ fontSize: 13.5, lineHeight: "20px", color: "#4B5452" }}>{instructions.description}</div>
      )}
      {links.map((b) => (
        <div key={b.url}>
          <a
            href={b.url!}
            target="_blank"
            rel="noreferrer"
            download={b.download || undefined}
            data-testid="upload-download"
            className="flex h-11 items-center justify-center gap-2 rounded-xl font-bold text-white"
            style={{ background: GREEN, fontSize: 14.5 }}
          >
            <span className="rotate-180">
              <Icon path={COMPLIANCE_ICON_PATHS.upload} color="#fff" size={16} strokeWidth={2.2} />
            </span>
            {b.button_label}
          </a>
          {b.download && <div className="mt-1 text-center text-[11px] text-[#6B7280]">Downloads the file</div>}
        </div>
      ))}
      {rest.length > 0 && (
        <>
          <button
            type="button"
            data-testid="upload-instructions-toggle"
            onClick={() => setOpen((o) => !o)}
            className="flex items-center justify-between pt-0.5 text-left font-bold"
            style={{ fontSize: 14, color: "#00966F" }}
          >
            {open ? "Hide instructions" : "How to print and display it"}
            <span className={open ? "-rotate-90" : "rotate-90"}>
              <Icon path={COMPLIANCE_ICON_PATHS.chevron} color="#00966F" size={13} strokeWidth={2.4} />
            </span>
          </button>
          {open &&
            rest.map((b, i) => (
              <div key={i} data-testid="upload-instructions-block">
                {!!b.label && (
                  <div className="mb-1 font-bold" style={{ fontSize: 13.5, color: INK }}>
                    {b.label}
                  </div>
                )}
                {b.kind === "list" ? (
                  <ul className="list-disc space-y-0.5 pl-5" style={{ fontSize: 13, lineHeight: "19px", color: "#4B5452" }}>
                    {(b.text ?? "").split("\n").filter((l) => l.trim()).map((l) => (
                      <li key={l}>{l.replace(/^\d+\.\s*/, "")}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="whitespace-pre-line" style={{ fontSize: 13, lineHeight: "19px", color: "#4B5452" }}>
                    {b.text}
                  </div>
                )}
              </div>
            ))}
        </>
      )}
    </div>
  );
}

/**
 * Checklist: every photo on one screen, guide image beside the driver's photo; tap a slot to add, Retake to redo one.
 * ⚠️ PROPOSED (Luis, 2026-11-20): the Submit bar floats at the bottom, and photos can be sent in batches ("Submit 2
 * photos"). Sent photos are kept; the requirement goes to Compliance for review only once every photo is in.
 */
export function ChecklistUpload({
  fields,
  changeNote,
  onSubmit,
  submitted = [],
  onPartialSubmit,
  instructions,
}: LayoutProps & { submitted?: string[]; onPartialSubmit?: (slugs: string[]) => void; instructions?: ComplianceProvider | null }) {
  const [taken, setTaken] = useState<Record<string, boolean>>({});
  const [justSent, setJustSent] = useState<number | null>(null);
  const sent = new Set(submitted);
  const added = fields.filter((f) => taken[f.slug] && !sent.has(f.slug)).map((f) => f.slug);
  const total = fields.length;
  const left = total - sent.size - added.length;
  const label =
    added.length === 0
      ? sent.size === 0
        ? "Add a photo to submit"
        : `${sent.size} of ${total} submitted · add the rest`
      : left === 0
        ? changeNote
          ? "Resubmit Changes"
          : "Submit for Review"
        : `Submit ${added.length} photo${added.length === 1 ? "" : "s"}`;
  const submit = () => {
    if (left === 0) return onSubmit();
    onPartialSubmit?.(added);
    setTaken({});
    setJustSent(added.length);
  };
  return (
    <div className="flex min-h-0 flex-1 flex-col" style={{ background: PAGE_BG }} data-testid="upload-checklist">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4" data-testid="checklist-scroll">
        {!!changeNote && <div className="mb-3"><ChangeNote note={changeNote} /></div>}
        {!!instructions && <StepInstructions instructions={instructions} />}
        <div className="mb-1 font-bold" style={{ fontSize: 17, color: INK }}>
          {total > 1 ? "Add a photo of each item" : "Add your photo"}
        </div>
        <div className="mb-3" style={{ fontSize: 13, lineHeight: "19px", color: "#4B5452" }}>
          {total > 1
            ? `Match the guide on the left. Do them in any order, and send a few at a time if you like. We review once all ${total} are in.`
            : "Match the guide on the left."}
        </div>
        {total > 1 && (
          <div className="mb-3" data-testid="upload-count">
            <div className="flex items-center justify-between" style={{ fontSize: 13 }}>
              <span className="font-semibold" style={{ color: INK }}>
                {sent.size} of {total} submitted
              </span>
              {added.length > 0 && <span className="font-semibold text-[#00966F]">{added.length} ready to send</span>}
            </div>
            <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-[#E3E7E5]">
              <div className="h-full" style={{ width: `${(sent.size / total) * 100}%`, background: GREEN }} />
              <div className="h-full" style={{ width: `${(added.length / total) * 100}%`, background: "#9FE3D3" }} />
            </div>
          </div>
        )}
        {justSent !== null && left > 0 && (
          <div className="mb-3 rounded-lg border border-[#9FE3D3] bg-[#F1FCF8] p-3" style={{ fontSize: 13, lineHeight: "19px", color: "#00755A" }} data-testid="checklist-sent-note">
            {justSent} photo{justSent === 1 ? "" : "s"} sent. Add the other {left} and we&apos;ll review them all together.
          </div>
        )}
        <div className="space-y-2.5">
          {fields.map((f) => {
            const isSent = sent.has(f.slug);
            return (
              <div key={f.slug} className="p-3" style={card} data-testid={`checklist-row-${f.slug}`}>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-bold" style={{ fontSize: 14, color: INK }}>
                      {f.label}
                    </div>
                    {!!f.hint && (
                      <div className="mt-0.5" style={{ fontSize: 12, lineHeight: "17px", color: "#6B7280" }} data-testid={`checklist-hint-${f.slug}`}>
                        {f.hint}
                      </div>
                    )}
                  </div>
                  {isSent ? (
                    <span className="rounded-md bg-[#E8FAF4] px-2 py-0.5 text-[11.5px] font-bold text-[#00966F]" data-testid={`checklist-sent-${f.slug}`}>
                      Submitted
                    </span>
                  ) : (
                    taken[f.slug] && <Icon path={COMPLIANCE_ICON_PATHS.check} color="#00966F" size={18} strokeWidth={2.6} />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-[#00966F]">Guide</div>
                    <div className="rounded-lg border border-[#E5E7EA] p-1">
                      <Guide field={f} size="small" />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 text-[10.5px] font-bold uppercase tracking-wide text-[#6B7280]">Your photo</div>
                    {isSent ? (
                      <div className="rounded-lg border border-[#E5E7EA] p-1">
                        <TakenPhoto size="small" />
                        <div className="mt-1 text-center text-[12px] font-semibold text-[#6B7280]">Sent</div>
                      </div>
                    ) : taken[f.slug] ? (
                      <button
                        type="button"
                        data-testid={`checklist-retake-${f.slug}`}
                        onClick={() => setTaken((t) => ({ ...t, [f.slug]: false }))}
                        className="block w-full rounded-lg border border-[#9FE3D3] p-1 text-left"
                      >
                        <TakenPhoto size="small" />
                        <div className="mt-1 text-center text-[12px] font-bold text-[#00966F]">Retake</div>
                      </button>
                    ) : (
                      <button
                        type="button"
                        data-testid={`checklist-add-${f.slug}`}
                        onClick={() => {
                          setJustSent(null);
                          setTaken((t) => ({ ...t, [f.slug]: true }));
                        }}
                        className="flex h-[106px] w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-[#9FE3D3] bg-[#F1FCF8]"
                      >
                        <Icon path={CAMERA} color="#00966F" size={22} strokeWidth={1.8} />
                        <span className="text-[12.5px] font-bold text-[#00966F]">Add photo</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="shrink-0 border-t border-[#E3E7E5] bg-white px-4 pb-4 pt-3 shadow-[0_-4px_12px_rgba(19,26,27,0.06)]" data-testid="checklist-submit-bar">
        <PrimaryButton label={label} height={52} disabled={added.length === 0} testId="upload-submit" onClick={submit} />
      </div>
    </div>
  );
}
