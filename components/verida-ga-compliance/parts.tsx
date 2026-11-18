"use client";

/**
 * PORT — In-App Compliance building blocks, from driver app #353 @ d690c4af (fix/in-app-compliance-needs-discussion).
 *   real: App/Components/Compliance/ComplianceIcon.tsx, ComplianceStatusPill.tsx, ComplianceBanner.tsx,
 *         ComplianceSheet.tsx, ComplianceDoneView.tsx, CompliancePrimaryButton.tsx
 * React Native → DOM: same sizes, colours and copy; inline styles for every colour that comes from the
 * view model (a Tailwind class built from a variable would compile to nothing).
 */
import type { CSSProperties, ReactNode } from "react";

import { COMPLIANCE_ICON_PATHS, type ComplianceRow, type ComplianceViewModel } from "@/lib/verida-ga-compliance/view-model";

export const GREEN = "#16CFA9"; // real: App/Themes/Colors.ts green._1
export const PAGE_BG = "#F5F7F8"; // gray._11
export const INK = "#131A1B";

export const card: CSSProperties = { background: "#fff", borderRadius: 14, boxShadow: "0 1px 3px rgba(19,26,27,0.06)" };

export function Icon({ path, color, size = 18, strokeWidth = 2 }: { path: string; color: string; size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d={path} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const PILLS = {
  review: { label: "In review", bg: "#EEF4FF", fg: "#2F5FD0" },
  pending: { label: "Pending", bg: "#EEF4FF", fg: "#2F5FD0" },
  changes: { label: "Changes requested", bg: "#FEF3C7", fg: "#D97706" },
  approved: { label: "Approved", bg: "#E8F6F2", fg: "#00966F" },
};

export function StatusPill({ kind }: { kind: keyof typeof PILLS }) {
  const p = PILLS[kind];
  return (
    <span
      data-testid={`pill-${kind}`}
      className="shrink-0 whitespace-nowrap font-bold"
      style={{ fontSize: 12, color: p.fg, background: p.bg, padding: "5px 10px", borderRadius: 8 }}
    >
      {p.label}
    </span>
  );
}

export function PrimaryButton({
  label,
  onClick,
  disabled,
  testId,
  outline,
  height = 48,
  icon,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  testId?: string;
  outline?: boolean;
  height?: number;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 px-3 text-center font-bold leading-tight active:scale-[0.98] disabled:opacity-40"
      style={{
        minHeight: height,
        borderRadius: 12,
        fontSize: 15,
        background: outline ? "#fff" : GREEN,
        color: outline ? "#00966F" : "#fff",
        border: outline ? `1.5px solid ${GREEN}` : "none",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

/** App header: back chevron, centred title (real: App/Components/Header with hideMessaging). */
export function ScreenHeader({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <div className="relative flex h-12 shrink-0 items-center justify-center border-b border-[#EEF2F0] bg-white px-12">
      {onBack && (
        <button type="button" aria-label="Back" data-testid="header-back" onClick={onBack} className="absolute left-2 flex h-10 w-10 items-center justify-center">
          <span style={{ display: "inline-block", transform: "scaleX(-1)" }}>
            <Icon path={COMPLIANCE_ICON_PATHS.chevron} color={INK} size={20} strokeWidth={2.2} />
          </span>
        </button>
      )}
      <div className="truncate text-[16px] font-bold" style={{ color: INK }} data-testid="header-title">
        {title}
      </div>
    </div>
  );
}

/** real: ComplianceBanner.tsx — "home" (title + short line, dismissible at 30 days), "compact", "detail". */
export function Banner({
  vm,
  variant = "home",
  onPress,
  onDismiss,
}: {
  vm: ComplianceViewModel;
  variant?: "home" | "compact" | "detail";
  onPress: () => void;
  onDismiss?: () => void;
}) {
  if (!vm.showBanner) return null;
  const t = vm.theme;
  const compact = variant === "compact";
  const showDismiss = variant === "home" && vm.dismissible && !!onDismiss;
  const box = compact ? 30 : 32;
  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={`compliance-banner-${variant}`}
      onClick={onPress}
      onKeyDown={(e) => e.key === "Enter" && onPress()}
      className="flex cursor-pointer items-center gap-2.5 active:scale-[0.985]"
      style={{ background: t.bg, border: `1px solid ${t.border}`, borderRadius: 14, padding: compact ? "12px 14px" : "11px 12px" }}
    >
      <div className="flex shrink-0 items-center justify-center" style={{ width: box, height: box, borderRadius: box / 2, background: t.iconBg }}>
        <Icon path={vm.iconPath} color={t.iconFg} size={compact ? 16 : 19} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-bold" style={{ fontSize: compact ? 13.5 : 14.5, lineHeight: compact ? "18px" : "19px", color: INK }} data-testid="banner-title">
          {vm.title}
        </div>
        {!compact && !!vm.shortLine && (
          <div style={{ fontSize: 12, color: t.bodyColor, marginTop: 1 }} data-testid="banner-short-line">
            {vm.shortLine}
          </div>
        )}
      </div>
      {showDismiss ? (
        <button
          type="button"
          aria-label="Dismiss"
          data-testid="banner-dismiss"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss?.();
          }}
          className="-mr-1.5 -mt-1.5 flex h-[30px] w-[30px] items-center justify-center self-start"
        >
          <Icon path={COMPLIANCE_ICON_PATHS.close} color={t.chevronColor} size={14} strokeWidth={2.4} />
        </button>
      ) : (
        <Icon path={COMPLIANCE_ICON_PATHS.chevron} color={t.chevronColor} size={compact ? 14 : 16} strokeWidth={2.4} />
      )}
    </div>
  );
}

/** real: ComplianceSheet.tsx — only the requirements that need attention, each with its own button. */
export function Sheet({
  vm,
  open,
  onClose,
  onRenew,
  onViewPage,
}: {
  vm: ComplianceViewModel;
  open: boolean;
  onClose: () => void;
  onRenew: (row: ComplianceRow) => void;
  onViewPage: () => void;
}) {
  if (!open) return null;
  return (
    <div className="absolute inset-0 z-40 flex flex-col justify-end bg-black/40" onClick={onClose} data-testid="compliance-sheet">
      <div
        className="max-h-[88%] overflow-y-auto bg-white px-5 pb-6 pt-4"
        style={{ borderTopLeftRadius: 22, borderTopRightRadius: 22 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" aria-label="Close" onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F0F2F1]">
          <Icon path={COMPLIANCE_ICON_PATHS.close} color={INK} size={12} strokeWidth={2.6} />
        </button>
        <div className="mt-3.5 font-bold" style={{ fontSize: 19, lineHeight: "25px", color: INK }} data-testid="sheet-title">
          {vm.sheetTitle}
        </div>
        <div className="mt-2" style={{ fontSize: 14.5, lineHeight: "22px", color: "#6B7280" }}>
          {vm.sheetBody}
        </div>
        {vm.sheetRows.length > 0 && (
          <div className="mt-3.5 overflow-hidden" style={{ borderRadius: 14, border: "1px solid #EEF2F0" }}>
            {vm.sheetRows.map((r, idx) => (
              <div
                key={r.slug}
                data-testid={`sheet-row-${r.slug}`}
                className="flex items-center gap-2.5 p-3"
                style={{ borderTop: idx === 0 ? "none" : "1px solid #F0F2F1" }}
              >
                <div className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.dot }} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold" style={{ fontSize: 14, color: INK }}>
                    {r.title}
                  </div>
                  <div style={{ fontSize: 12.5, color: r.textColor, marginTop: 1 }}>{r.text}</div>
                </div>
                {r.canUpload && (
                  <button
                    type="button"
                    data-testid={`sheet-renew-${r.slug}`}
                    onClick={() => onRenew(r)}
                    className="h-8 shrink-0 rounded-lg px-3.5 text-[13px] font-bold text-white"
                    style={{ background: GREEN }}
                  >
                    {r.uploadLabel}
                  </button>
                )}
                {r.inReview && <StatusPill kind={r.pending ? "pending" : "review"} />}
                {r.approved && <StatusPill kind="approved" />}
              </div>
            ))}
          </div>
        )}
        {!!vm.uploadNote && <div className="mt-2.5" style={{ fontSize: 13, lineHeight: "19px", color: "#9AA5A0" }}>{vm.uploadNote}</div>}
        <div className="mt-4">
          <PrimaryButton label="View Compliance" height={52} onClick={onViewPage} testId="sheet-view-page" />
        </div>
      </div>
    </div>
  );
}

/** real: ComplianceDoneView.tsx */
export function DoneView({ title, body, note, onDone }: { title: string; body: string; note?: string; onDone: () => void }) {
  return (
    <div className="flex flex-1 flex-col bg-white" data-testid="done-view">
      <div className="flex flex-1 flex-col items-center px-7 pt-14 text-center">
        <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-[#E8F6F2]">
          <Icon path={COMPLIANCE_ICON_PATHS.check} color={GREEN} size={32} strokeWidth={2.4} />
        </div>
        <div className="mt-4 font-bold" style={{ fontSize: 22, color: INK }}>
          {title}
        </div>
        <div className="mt-2" style={{ fontSize: 14.5, lineHeight: "22px", color: "#6B7280" }}>
          {body}
        </div>
        {!!note && (
          <div className="mt-5 self-stretch rounded-[14px] bg-[#F5F7F8] px-4 py-3.5 text-left" style={{ fontSize: 13.5, lineHeight: "20px", color: "#4B5452" }}>
            {note}
          </div>
        )}
      </div>
      <div className="px-4 pb-5 pt-3">
        <PrimaryButton label="Done" height={52} onClick={onDone} testId="done-button" />
      </div>
    </div>
  );
}
