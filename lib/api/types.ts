// ─── Rejection Info (attached to driver when rejected) ─────────
export interface DriverRejection {
  ruleId: string;
  type: "auto" | "manual";
  recoverable: boolean;
  reason: string;
  message: string;
  description: string;
  rejectedAt: string;
  /** Agent name for manual rejections */
  rejectedBy?: string;
  /** For vehicle-recoverable: which step to unlock */
  retryStepId?: string;
  /** CTA label for retry */
  retryCtaLabel?: string;
}
