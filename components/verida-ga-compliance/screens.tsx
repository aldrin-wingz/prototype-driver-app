"use client";

/**
 * PORT — In-App Compliance screens, from driver app #353 @ d690c4af (fix/in-app-compliance-needs-discussion).
 *   real: App/Containers/ComplianceScreen.tsx          → CompliancePage
 *   real: App/Containers/ComplianceRenewScreen.tsx     → RenewScreen
 *   real: App/Containers/ComplianceProviderScreen.tsx  → ProviderScreen
 *   real: App/Containers/ComplianceUploadScreen.tsx    → UploadScreen (photo capture is a placeholder, as in the PR's stub)
 *   real: App/Components/Compliance/RequestsPausedView.tsx → RequestsPaused
 * Copy is verbatim. The DEV mock panel of ComplianceScreen is left out (the prototype controls replace it).
 */
import { useState } from "react";

import type { UploadField } from "@/lib/verida-ga-compliance/catalog";
import type { ComplianceProvider, ComplianceProviderBlock } from "@/lib/verida-ga-compliance/types";
import {
  COMPLIANCE_ICON_PATHS,
  COMPLIANCE_THEMES,
  changeRequestBody,
  type ComplianceRow,
  type ComplianceViewModel,
} from "@/lib/verida-ga-compliance/view-model";

import { Banner, DoneView, GREEN, INK, Icon, PAGE_BG, PrimaryButton, ScreenHeader, StatusPill, card } from "./parts";
import { ChecklistUpload, PagerUpload, hasGuides, type UploadLayout } from "./upload-layouts";

const sectionLabel = "px-1 text-[12px] font-bold tracking-[0.08em] text-[#9AA5A0]";

function DueCard({ row, onRenew, partial }: { row: ComplianceRow; onRenew: () => void; partial?: { sent: number; total: number } }) {
  return (
    <div data-testid={`due-${row.slug}`} className="flex flex-col gap-3 p-3.5" style={card}>
      <div className="flex items-center gap-3">
        <div className="relative flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] border border-[#E5E7EA]">
          <Icon path={COMPLIANCE_ICON_PATHS.optionsRow} color={INK} strokeWidth={1.7} />
          <div className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-[1.5px] border-white" style={{ background: row.dot }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold" style={{ fontSize: 14.5, color: INK }}>
            {row.title}
          </div>
          <div style={{ fontSize: 12.5, color: row.textColor, marginTop: 2 }} data-testid={`due-text-${row.slug}`}>
            {row.text}
          </div>
          {!!partial && (
            // ⚠️ PROPOSED (checklist batches): not in #353.
            <div style={{ fontSize: 12.5, color: "#00966F", marginTop: 2, fontWeight: 600 }} data-testid={`due-partial-${row.slug}`}>
              {partial.sent} of {partial.total} photos submitted · add {partial.total - partial.sent} more for review
            </div>
          )}
        </div>
        {row.inReview && <StatusPill kind={row.pending ? "pending" : "review"} />}
        {row.changes && <StatusPill kind="changes" />}
      </div>
      {row.changes && (
        <div className="flex flex-col gap-2.5 rounded-lg border border-[#FCD34D] bg-[#FFFBEB] p-3">
          {!!row.agentNote && <div style={{ fontSize: 13, lineHeight: "19px", color: "#92400E" }}>{row.agentNote}</div>}
        </div>
      )}
      {row.canUpload && (
        <PrimaryButton
          label={row.uploadCta}
          height={44}
          onClick={onRenew}
          testId={`renew-${row.slug}`}
          icon={(row.renewKind === "upload" || row.changes) && <Icon path={COMPLIANCE_ICON_PATHS.upload} color="#fff" size={16} strokeWidth={2.2} />}
        />
      )}
    </div>
  );
}

/** Options › Compliance — every requirement, due ones first, each with its own button. */
export function CompliancePage({
  vm,
  onBack,
  onRenew,
  partial = {},
}: {
  vm: ComplianceViewModel;
  onBack: () => void;
  onRenew: (row: ComplianceRow) => void;
  partial?: Record<string, { sent: number; total: number }>;
}) {
  const page = vm.page;
  return (
    <>
      <ScreenHeader title="Compliance" onBack={onBack} />
      <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto p-4 pb-8" style={{ background: PAGE_BG }} data-testid="compliance-page">
        <div className="flex items-start gap-3 p-4" style={{ background: page.theme.bg, border: `1px solid ${page.theme.border}`, borderRadius: 16 }}>
          <div className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full" style={{ background: page.theme.iconBg }}>
            <Icon path={page.iconPath} color={page.theme.iconFg} size={19} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-bold" style={{ fontSize: 16, lineHeight: "21px", color: INK }} data-testid="page-title">
              {page.title}
            </div>
            <div className="mt-1" style={{ fontSize: 13.5, lineHeight: "20px", color: "#4B5452" }}>
              {page.body}
            </div>
          </div>
        </div>
        {page.due.length > 0 && (
          <>
            <div className={sectionLabel}>NEEDS ATTENTION</div>
            {page.due.map((row) => (
              <DueCard key={row.slug} row={row} onRenew={() => onRenew(row)} partial={partial[row.slug]} />
            ))}
          </>
        )}
        {page.ok.length > 0 && (
          <>
            <div className={sectionLabel}>UP TO DATE</div>
            <div className="overflow-hidden" style={card}>
              {page.ok.map((row, idx) => (
                <div
                  key={row.slug}
                  data-testid={`ok-${row.slug}`}
                  className="flex items-center gap-3 px-3.5 py-[13px]"
                  style={{ borderTop: idx === 0 ? "none" : "1px solid #F0F2F1" }}
                >
                  <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full" style={{ background: COMPLIANCE_THEMES.ok.iconBg }}>
                    <Icon path={COMPLIANCE_ICON_PATHS.check} color={COMPLIANCE_THEMES.ok.iconFg} size={14} strokeWidth={2.6} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold" style={{ fontSize: 14, color: INK }}>
                      {row.title}
                    </div>
                    <div style={{ fontSize: 12.5, color: "#9AA5A0", marginTop: 1 }}>{row.text}</div>
                  </div>
                  {row.approved && <StatusPill kind="approved" />}
                </div>
              ))}
            </div>
          </>
        )}
        {!!page.note && <div className="px-1" style={{ fontSize: 12.5, lineHeight: "19px", color: "#9AA5A0" }}>{page.note}</div>}
      </div>
    </>
  );
}

/** Renew a requirement an outside provider handles: Continue → provider page; tick; "Let Compliance know". Or upload. */
export function RenewScreen({
  title,
  description,
  canUploadInstead,
  untilLine,
  onBack,
  onContinue,
  onUploadInstead,
  onSubmit,
}: {
  title: string;
  description: string;
  canUploadInstead: boolean;
  untilLine: string;
  onBack: () => void;
  onContinue: () => void;
  onUploadInstead: () => void;
  onSubmit: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  if (done !== null) {
    return (
      <DoneView
        title="Thanks, we'll take it from here"
        body={`Compliance will confirm your ${title} with the provider soon.`}
        note={done}
        onDone={onBack}
      />
    );
  }
  return (
    <>
      <ScreenHeader title={`Renew ${title}`} onBack={onBack} />
      <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto p-4 pb-8" style={{ background: PAGE_BG }} data-testid="renew-screen">
        <div className="flex flex-col gap-3 p-4" style={card}>
          <div className="font-bold" style={{ fontSize: 16, color: INK }}>
            Complete it with the provider
          </div>
          <div style={{ fontSize: 13.5, lineHeight: "20px", color: "#4B5452" }} data-testid="renew-description">
            {description}
          </div>
          <PrimaryButton
            label="Continue"
            outline
            onClick={onContinue}
            testId="renew-continue"
            icon={<span className="order-last"><Icon path={COMPLIANCE_ICON_PATHS.chevron} color="#00966F" size={14} strokeWidth={2.4} /></span>}
          />
          <label className="flex cursor-pointer items-center gap-2.5 py-1" style={{ fontSize: 14, color: INK }}>
            <input
              type="checkbox"
              data-testid="renew-confirm"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="h-5 w-5"
              style={{ accentColor: GREEN }}
            />
            I&apos;ve completed my {title}
          </label>
          <PrimaryButton
            label="Let Compliance know"
            disabled={!confirmed}
            testId="renew-submit"
            onClick={() => {
              onSubmit();
              setDone(untilLine);
            }}
          />
        </div>
        {canUploadInstead && (
          <>
            <div className="flex items-center gap-2.5 px-1">
              <div className="h-px flex-1 bg-[#E3E7E5]" />
              <span className="text-[12px] font-semibold text-[#9AA5A0]">OR</span>
              <div className="h-px flex-1 bg-[#E3E7E5]" />
            </div>
            <div className="flex flex-col gap-3 p-4" style={card} data-testid="renew-upload-card">
              <div className="font-bold" style={{ fontSize: 16, color: INK }}>
                Upload it yourself
              </div>
              <div style={{ fontSize: 13.5, lineHeight: "20px", color: "#4B5452" }}>
                Already have the certificate or report? Upload a photo of it and we&apos;ll review it.
              </div>
              <button
                type="button"
                data-testid="renew-upload-instead"
                onClick={onUploadInstead}
                className="flex h-12 items-center justify-center gap-2 rounded-xl border-[1.5px] border-[#DDE3E1] font-bold"
                style={{ fontSize: 15, color: INK }}
              >
                <Icon path={COMPLIANCE_ICON_PATHS.upload} color={INK} size={16} strokeWidth={2.2} />
                Upload {title}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

function ProviderBlock({ block }: { block: ComplianceProviderBlock }) {
  const lines = block.kind === "list" ? (block.text ?? "").split("\n").filter((l) => l.trim()) : [];
  return (
    <div className="flex flex-col gap-2.5 p-4" style={card}>
      {!!block.label && (
        <div className="font-bold" style={{ fontSize: 15, color: INK }}>
          {block.label}
        </div>
      )}
      {block.kind === "list"
        ? lines.map((line, i) => (
            <div key={i} style={{ fontSize: 14, lineHeight: "21px", color: "#4B5452" }}>
              {line.trim()}
            </div>
          ))
        : !!block.text && <div className="whitespace-pre-line" style={{ fontSize: 14, lineHeight: "21px", color: "#4B5452" }}>{block.text}</div>}
      {block.kind === "link" && !!block.url && (
        <a
          href={block.url}
          target="_blank"
          rel="noreferrer"
          data-testid="provider-link"
          className="mt-1 flex h-12 items-center justify-center gap-2 rounded-xl font-bold text-white"
          style={{ background: GREEN, fontSize: 15 }}
        >
          {block.button_label || "Open"}
          <Icon path={COMPLIANCE_ICON_PATHS.chevron} color="#fff" size={14} strokeWidth={2.4} />
        </a>
      )}
    </div>
  );
}

/** Continue: the instructions and link of the Verida Fully Credentialled onboarding step for the driver's market. */
export function ProviderScreen({ title, provider, onBack }: { title: string; provider: ComplianceProvider | null; onBack: () => void }) {
  return (
    <>
      <ScreenHeader title={provider?.title || title} onBack={onBack} />
      <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto p-4 pb-8" style={{ background: PAGE_BG }} data-testid="provider-screen">
        {!provider && (
          <div className="flex flex-col gap-2.5 p-4" style={card} data-testid="provider-none">
            <div className="font-bold" style={{ fontSize: 16, color: INK }}>
              Contact support to renew it
            </div>
            <div style={{ fontSize: 14, lineHeight: "21px", color: "#4B5452" }}>
              We don&apos;t have a provider for your {title} in your market yet. Contact support and we&apos;ll help you renew it.
            </div>
          </div>
        )}
        {!!provider && (
          <>
            {!!provider.description && <div className="px-1" style={{ fontSize: 14, lineHeight: "21px", color: "#4B5452" }}>{provider.description}</div>}
            {provider.blocks.map((b, i) => (
              <ProviderBlock key={i} block={b} />
            ))}
            <div className="px-1 font-semibold" style={{ fontSize: 13, lineHeight: "19px", color: "#6B7280" }}>
              Finished with the provider? Go back and tick &quot;I&apos;ve completed my {title}&quot; to let Compliance know.
            </div>
          </>
        )}
      </div>
    </>
  );
}

const TIPS = ["All four corners in the frame", "Expiration date clearly readable", "No glare, blur or fingers"];

function PhotoPlaceholder() {
  return (
    <div className="flex gap-3.5 p-4" style={{ aspectRatio: "1.58", borderRadius: 16, background: "#DDF2EC" }}>
      <div className="w-[30%] rounded-lg bg-white/70" />
      <div className="flex flex-1 flex-col gap-2 pt-1.5">
        <div className="h-2.5 w-[70%] rounded bg-[rgba(19,26,27,0.25)]" />
        <div className="h-2 w-[90%] rounded bg-[rgba(19,26,27,0.15)]" />
        <div className="h-2 w-[60%] rounded bg-[rgba(19,26,27,0.15)]" />
        <div className="mt-auto text-[11px] font-bold text-[#00755A]">PHOTO PLACEHOLDER</div>
      </div>
    </div>
  );
}

/** Upload: one photo per screen (Photo n of N · label), then review and Submit for Review. A change request shows the note first. */
export function UploadScreen({
  title,
  fields,
  changeNote,
  untilLine,
  layout = "guide",
  submitted,
  onPartialSubmit,
  instructions,
  onReplace,
  onBack,
  onSubmit,
}: {
  title: string;
  fields: UploadField[];
  changeNote: string | null;
  untilLine: string;
  /** ⚠️ PROPOSED (V14): "built" = #353 unchanged; the others are the alternatives in upload-layouts.tsx. */
  layout?: UploadLayout;
  /** ⚠️ PROPOSED (checklist only): photos already sent in an earlier batch, and the batch send. */
  submitted?: string[];
  onPartialSubmit?: (slugs: string[]) => void;
  /** ⚠️ PROPOSED (checklist): the onboarding step's instructions + download (Trade Dress, Signage). */
  instructions?: ComplianceProvider | null;
  onReplace?: (slug: string) => void;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState<"capture" | "review" | "done">("capture");
  const field = fields[index];
  if (step === "done") {
    return (
      <DoneView
        title="Submitted for review"
        body={`We'll review your ${title}, usually within 1 business day.`}
        note={untilLine}
        onDone={onBack}
      />
    );
  }
  if ((layout === "pager" || layout === "checklist") && hasGuides(fields)) {
    const submit = () => {
      onSubmit();
      setStep("done");
    };
    return (
      <>
        <ScreenHeader title={changeNote ? title : `Upload ${title}`} onBack={onBack} />
        {layout === "pager" ? (
          <PagerUpload fields={fields} changeNote={changeNote} onSubmit={submit} />
        ) : (
          <ChecklistUpload fields={fields} changeNote={changeNote} onSubmit={submit} submitted={submitted} onPartialSubmit={onPartialSubmit} instructions={instructions} onReplace={onReplace} />
        )}
      </>
    );
  }
  return (
    <>
      <ScreenHeader title={changeNote ? title : `Upload ${title}`} onBack={onBack} />
      <div className="flex flex-1 flex-col overflow-y-auto bg-white px-4 pb-6 pt-4" data-testid="upload-screen">
        {!!changeNote && (
          <div className="mb-4 rounded-lg border border-[#FCD34D] bg-[#FFFBEB] p-3" data-testid="upload-change-note">
            <div className="font-bold" style={{ fontSize: 14, color: INK }}>
              Changes Requested
            </div>
            <div className="mt-1" style={{ fontSize: 13, lineHeight: "19px", color: "#92400E" }}>
              {changeNote}
            </div>
          </div>
        )}
        {step === "capture" && field && (
          <>
            {field.exampleImage && layout !== "built" ? (
              // ⚠️ PROPOSED (Luis, V14 2026-11-19): not in #353. The build shows the icon card below for every photo; this
              // shows the onboarding field's guide image (metadata.example_image) instead, as onboarding does.
              <div
                className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#9FE3D3] bg-[#F1FCF8] p-3"
                style={{ aspectRatio: "1.58" }}
                data-testid="upload-example"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- template-supplied path */}
                <img src={field.exampleImage} alt={`Example: ${field.label}`} className="min-h-0 w-full flex-1 rounded-lg object-contain" />
                <div className="font-semibold" style={{ fontSize: 12.5, color: "#00966F" }}>
                  Example: {field.label}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-[#9FE3D3] bg-[#F1FCF8]" style={{ aspectRatio: "1.58" }}>
                <Icon path={`M2.5 5h19v14h-19z${COMPLIANCE_ICON_PATHS.idCard}`} color={GREEN} size={40} strokeWidth={1.6} />
                <div className="font-semibold" style={{ fontSize: 13.5, color: "#00966F" }}>
                  Photo of your {title}
                </div>
              </div>
            )}
            <div className="mt-4 font-semibold" style={{ fontSize: 13, color: "#6B7280" }} data-testid="upload-progress">
              {fields.length > 1 ? `Photo ${index + 1} of ${fields.length} · ${field.label}` : field.label}
            </div>
            <div className="mt-5 font-bold" style={{ fontSize: 20, lineHeight: "26px", color: INK }}>
              Take a photo of your new {title}
            </div>
            <ul className="mt-3 space-y-1.5">
              {TIPS.map((tip) => (
                <li key={tip} className="flex items-center gap-2" style={{ fontSize: 14.5, color: "#374151" }}>
                  <Icon path={COMPLIANCE_ICON_PATHS.check} color={GREEN} size={16} strokeWidth={2.4} />
                  {tip}
                </li>
              ))}
            </ul>
            <div className="mt-auto space-y-2.5 pt-6">
              <PrimaryButton
                label="Take Photo"
                height={52}
                testId="upload-take-photo"
                onClick={() => (index + 1 < fields.length ? setIndex(index + 1) : setStep("review"))}
              />
              <button
                type="button"
                onClick={() => (index + 1 < fields.length ? setIndex(index + 1) : setStep("review"))}
                className="h-[52px] w-full rounded-xl border-[1.5px] border-[#DDE3E1] font-bold"
                style={{ fontSize: 16, color: INK }}
              >
                Choose from Library
              </button>
            </div>
          </>
        )}
        {step === "review" && (
          <>
            <div className="space-y-4">
              {fields.map((f) => (
                <div key={f.slug}>
                  <div className="mb-2 font-semibold" style={{ fontSize: 13, color: INK }}>
                    {f.label}
                  </div>
                  <PhotoPlaceholder />
                </div>
              ))}
            </div>
            <div className="mt-6">
              <PrimaryButton
                label={changeNote ? "Resubmit Changes" : "Submit for Review"}
                height={52}
                testId="upload-submit"
                onClick={() => {
                  onSubmit();
                  setStep("done");
                }}
              />
            </div>
          </>
        )}
      </div>
    </>
  );
}

/** Replaces the Requests list while an expired requirement has requests paused. */
export function RequestsPaused({ vm, onBanner, onCta }: { vm: ComplianceViewModel; onBanner: () => void; onCta: () => void }) {
  return (
    <div className="flex-1 overflow-y-auto pb-8" data-testid="requests-paused">
      <div className="px-3 pt-3">
        <Banner vm={vm} variant="detail" onPress={onBanner} />
      </div>
      <div className="flex flex-col items-center px-6 pt-11 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#FDECEC]">
          <Icon path={COMPLIANCE_ICON_PATHS.paused} color="#B91C1C" size={24} strokeWidth={1.9} />
        </div>
        <div className="mt-4 font-bold" style={{ fontSize: 17, color: INK }}>
          Requests are paused
        </div>
        <div className="mt-1.5 max-w-[290px]" style={{ fontSize: 14, lineHeight: "21px", color: "#6B7280" }}>
          New trip requests will show up again once your requirements are renewed and approved.
        </div>
        <div className="mt-5">
          <button
            type="button"
            data-testid="paused-cta"
            onClick={onCta}
            className="h-12 rounded-xl px-6 font-bold text-white"
            style={{ background: GREEN, fontSize: 15 }}
          >
            {vm.pausedCta}
          </button>
        </div>
      </div>
    </div>
  );
}

export { changeRequestBody };
