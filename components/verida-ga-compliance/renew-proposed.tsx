"use client";

/**
 * ⚠️ PROPOSED (Luis, 2026-11-20): two renewal methods #353 does not have. Built so they can be seen next to the build's
 * three (photo upload, provider + "I've completed it", Yardstik).
 *   • DateRenewScreen  ("date")  — Drug Screening: the provider as in onboarding, then the screening date from the
 *     onboarding step instead of the tick; or upload a photo of the result instead.
 *   • EsignRenewScreen ("esign") — D.Lawson background check + MVR: the onboarding consent form, signed in the app
 *     (HelloSign, as in onboarding). Signing is the submission.
 */
import { useState } from "react";

import { COMPLIANCE_ICON_PATHS } from "@/lib/verida-ga-compliance/view-model";

import { DoneView, GREEN, INK, Icon, PAGE_BG, PrimaryButton, ScreenHeader, card } from "./parts";

function Or() {
  return (
    <div className="flex items-center gap-2.5 px-1">
      <div className="h-px flex-1 bg-[#E3E7E5]" />
      <span className="text-[12px] font-semibold text-[#9AA5A0]">OR</span>
      <div className="h-px flex-1 bg-[#E3E7E5]" />
    </div>
  );
}

function fmt(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function DateRenewScreen({
  title,
  description,
  dateLabel,
  today,
  canUploadInstead,
  untilLine,
  epassport,
  agreement,
  doneBody,
  onBack,
  onInstructions,
  onUploadInstead,
  onSubmit,
}: {
  title: string;
  description: string;
  dateLabel: string;
  today: string;
  canUploadInstead: boolean;
  untilLine: string;
  /** ⚠️ PROPOSED (drug screening): the EPassport Compliance put on file for this round, with the onboarding step's text. */
  epassport?: { url: string; info: string | null } | null;
  /** D15 at renewal: read-first requirements answered with a single Yes before the link and the date appear. */
  agreement?: string | null;
  /** What the done screen says after the date (D32: the drug screening asks for the receipt next). */
  doneBody?: (date: string) => string;
  onBack: () => void;
  onInstructions: () => void;
  onUploadInstead: () => void;
  onSubmit: (date: string) => void;
}) {
  const [date, setDate] = useState("");
  const [done, setDone] = useState(false);
  const [agreed, setAgreed] = useState(!agreement);
  if (done) {
    return (
      <DoneView
        title="Thanks, we'll take it from here"
        body={doneBody ? doneBody(date) : `Your ${title} is booked for ${fmt(date)}. Compliance will confirm the result with the provider after that.`}
        note={untilLine}
        onDone={onBack}
      />
    );
  }
  if (!agreed) {
    return (
      <>
        <ScreenHeader title={`Renew ${title}`} onBack={onBack} />
        <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto p-4 pb-8" style={{ background: PAGE_BG }} data-testid="renew-agreement">
          <div className="flex flex-col gap-3 p-4" style={card}>
            <div className="font-bold" style={{ fontSize: 16, color: INK }}>
              Before you book
            </div>
            <div className="max-h-[320px] overflow-y-auto whitespace-pre-line rounded-lg bg-[#F7F9F8] p-3" style={{ fontSize: 13.5, lineHeight: "20px", color: "#4B5452" }}>
              {agreement}
            </div>
            <PrimaryButton label="Yes" testId="renew-agree" onClick={() => setAgreed(true)} />
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      <ScreenHeader title={`Renew ${title}`} onBack={onBack} />
      <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto p-4 pb-8" style={{ background: PAGE_BG }} data-testid="renew-date-screen">
        <div className="flex flex-col gap-3 p-4" style={card}>
          <div className="font-bold" style={{ fontSize: 16, color: INK }}>
            Book it with the provider
          </div>
          <div style={{ fontSize: 13.5, lineHeight: "20px", color: "#4B5452" }}>{description}</div>
          {!!epassport && (
            // D22: the EPassport shown on the card itself (no View voucher button), with Download.
            <div className="flex flex-col gap-2 rounded-lg bg-[#F1FCF8] p-2.5" data-testid="epassport-inline">
              <div className="flex items-center gap-2 font-semibold" style={{ fontSize: 13, color: "#00755A" }}>
                <Icon path={COMPLIANCE_ICON_PATHS.check} color="#00966F" size={15} strokeWidth={2.6} />
                Your EPassport
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={epassport.url} alt="Your EPassport" className="w-full rounded-md border border-[#DDE3E1] bg-white" />
              <a href={epassport.url} download className="text-center font-semibold underline" style={{ fontSize: 13, color: "#00755A" }}>
                Download
              </a>
            </div>
          )}
          <PrimaryButton
            label="See how to book it"
            outline
            onClick={onInstructions}
            testId="renew-instructions"
            icon={<span className="order-last"><Icon path={COMPLIANCE_ICON_PATHS.chevron} color="#00966F" size={14} strokeWidth={2.4} /></span>}
          />
          <label className="flex flex-col gap-1.5" style={{ fontSize: 14, color: INK }}>
            <span className="font-semibold">{dateLabel}</span>
            <input
              type="date"
              data-testid="renew-date"
              value={date}
              min={today}
              onChange={(e) => setDate(e.target.value)}
              className="h-12 rounded-xl border-[1.5px] border-[#DDE3E1] px-3"
              style={{ fontSize: 15, color: INK }}
            />
          </label>
          <PrimaryButton
            label="Let Compliance know"
            disabled={!date}
            testId="renew-submit"
            onClick={() => {
              onSubmit(date);
              setDone(true);
            }}
          />
        </div>
        {canUploadInstead && (
          <>
            <Or />
            <div className="flex flex-col gap-3 p-4" style={card} data-testid="renew-upload-card">
              <div className="font-bold" style={{ fontSize: 16, color: INK }}>
                Upload it yourself
              </div>
              <div style={{ fontSize: 13.5, lineHeight: "20px", color: "#4B5452" }}>
                Already tested? Upload a photo of your result and we&apos;ll review it.
              </div>
              <button
                type="button"
                data-testid="renew-upload-instead"
                onClick={onUploadInstead}
                className="flex h-12 items-center justify-center gap-2 rounded-xl border-[1.5px] border-[#DDE3E1] font-bold"
                style={{ fontSize: 15, color: INK }}
              >
                <Icon path={COMPLIANCE_ICON_PATHS.upload} color={INK} size={16} strokeWidth={2.2} />
                Upload {title} result
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export function EsignRenewScreen({
  title,
  text,
  formLabel,
  alsoRenews,
  untilLine,
  onBack,
  onSubmit,
}: {
  title: string;
  text: string | null;
  formLabel: string;
  alsoRenews: string | null;
  untilLine: string;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const [signing, setSigning] = useState(false);
  const [done, setDone] = useState(false);
  if (done) {
    return (
      <DoneView
        title="Consent signed"
        body={`D.Lawson will run your ${alsoRenews ? `${title} and ${alsoRenews}` : title} again. Compliance will confirm the result with them.`}
        note={untilLine}
        onDone={onBack}
      />
    );
  }
  return (
    <>
      <ScreenHeader title={`Renew ${title}`} onBack={onBack} />
      <div className="relative flex flex-1 flex-col gap-3.5 overflow-y-auto p-4 pb-8" style={{ background: PAGE_BG }} data-testid="renew-esign-screen">
        <div className="flex flex-col gap-3 p-4" style={card}>
          <div className="font-bold" style={{ fontSize: 16, color: INK }}>
            Sign the consent form
          </div>
          {!!text && (
            <div className="whitespace-pre-line" style={{ fontSize: 13.5, lineHeight: "20px", color: "#4B5452" }} data-testid="esign-text">
              {text}
            </div>
          )}
          {!!alsoRenews && (
            <div className="rounded-lg bg-[#F1FCF8] p-2.5" style={{ fontSize: 13, color: "#00755A" }}>
              One signature renews both your {title} and your {alsoRenews}.
            </div>
          )}
          <PrimaryButton label={formLabel} testId="esign-open" onClick={() => setSigning(true)} icon={<Icon path={COMPLIANCE_ICON_PATHS.pencil} color="#fff" size={16} strokeWidth={2.2} />} />
          <div className="text-center text-[11.5px] text-[#6B7280]">Opens the form in HelloSign, as when you signed up. Signing sends it.</div>
        </div>
        {signing && (
          // Stand-in for the HelloSign web view onboarding opens; the real form is the provider's.
          <div className="absolute inset-0 z-10 flex flex-col bg-white" data-testid="esign-sheet">
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-[#EEF2F0] px-4">
              <span className="text-[14px] font-bold" style={{ color: INK }}>
                HelloSign
              </span>
              <button type="button" onClick={() => setSigning(false)} aria-label="Close" data-testid="esign-close">
                <Icon path={COMPLIANCE_ICON_PATHS.close} color={INK} size={18} />
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
              <div className="text-[15px] font-bold" style={{ color: INK }}>
                Background check and MVR consent
              </div>
              {[90, 100, 85, 95, 70, 100, 60].map((w, i) => (
                <div key={i} className="h-2 rounded bg-[#E5E7EA]" style={{ width: `${w}%` }} />
              ))}
              <div className="mt-2 text-[11px] font-bold uppercase tracking-wide text-[#6B7280]">Signature</div>
              <div className="flex h-20 items-center justify-center rounded-lg border-2 border-dashed border-[#DDE3E1] text-[13px] text-[#9AA5A0]">
                Tap to sign
              </div>
              <div className="mt-auto text-center text-[11px] text-[#9AA5A0]">Provider form placeholder — the real consent form comes from HelloSign</div>
            </div>
            <div className="shrink-0 border-t border-[#EEF2F0] p-4">
              <button
                type="button"
                data-testid="esign-sign"
                onClick={() => {
                  setSigning(false);
                  onSubmit();
                  setDone(true);
                }}
                className="h-12 w-full rounded-xl font-bold text-white"
                style={{ background: GREEN, fontSize: 15 }}
              >
                Sign and send
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/**
 * ⚠️ PROPOSED (Luis, 2026-11-20): a credential program switch asks for the new program's requirements straight away, on
 * Home, Requests and the Compliance page.
 */
export function SwitchBanner({ to, count, onPress }: { to: "fc" | "tnc"; count: number; onPress: () => void }) {
  const title = to === "fc" ? "You're now Verida Fully Credentialled" : "Your credential program is now TNC+";
  const body =
    to === "fc"
      ? `Upload ${count} new requirement${count === 1 ? "" : "s"} to get Verida trips again. Your TCI trips aren't affected.`
      : `Complete ${count} requirement${count === 1 ? "" : "s"} for TNC+. Until they're approved, your trips follow your Verida Fully Credentialled documents.`;
  return (
    <button
      type="button"
      onClick={onPress}
      data-testid="switch-banner"
      className="flex w-full items-start gap-3 rounded-[14px] border border-[#FCD34D] bg-[#FFFBEB] p-3.5 text-left"
    >
      <Icon path={COMPLIANCE_ICON_PATHS.upload} color="#B45309" size={20} strokeWidth={2.2} />
      <div className="min-w-0 flex-1">
        <div className="font-bold" style={{ fontSize: 14.5, color: INK }}>
          {title}
        </div>
        <div className="mt-0.5" style={{ fontSize: 13, lineHeight: "19px", color: "#92400E" }}>
          {body}
        </div>
        <div className="mt-1.5 font-bold" style={{ fontSize: 13, color: "#B45309" }}>
          Upload now ›
        </div>
      </div>
    </button>
  );
}

/** TNC+ renews the background check, MVR and drug screening in Yardstik (#353's "yardstik" method opens its web view). */
export function YardstikScreen({ title, untilLine, onBack, onSubmit }: { title: string; untilLine: string; onBack: () => void; onSubmit: () => void }) {
  const [done, setDone] = useState(false);
  if (done) {
    return <DoneView title="Thanks, we'll take it from here" body={`Yardstik will run your ${title} again.`} note={untilLine} onDone={onBack} />;
  }
  return (
    <>
      <ScreenHeader title={`Renew ${title}`} onBack={onBack} />
      <div className="flex flex-1 flex-col gap-3.5 overflow-y-auto p-4 pb-8" style={{ background: PAGE_BG }} data-testid="yardstik-screen">
        <div className="flex flex-col gap-3 p-4" style={card}>
          <div className="font-bold" style={{ fontSize: 16, color: INK }}>
            Complete it in Yardstik
          </div>
          <div style={{ fontSize: 13.5, lineHeight: "20px", color: "#4B5452" }}>
            You&apos;ll go through the same Yardstik steps as when you signed up. (Stand-in for #353&apos;s Yardstik web view.)
          </div>
          <PrimaryButton
            label="I've finished in Yardstik"
            testId="yardstik-done"
            onClick={() => {
              onSubmit();
              setDone(true);
            }}
          />
        </div>
      </div>
    </>
  );
}
