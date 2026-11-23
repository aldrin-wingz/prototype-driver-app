/**
 * ⚠️ PROPOSED (Luis, 2026-11-20): two renewal methods #353 does not have, kept out of view-model.ts so that file stays
 * the PR's complianceViewModel.ts byte for byte (verify check 1).
 *   "date"  — provider, then the onboarding step's date instead of the "I've completed it" tick (Drug Screening).
 *   "esign" — the onboarding consent form signed in the app is the submission (D.Lawson background check + MVR).
 * The build's view model is fed "attest" in their place (its nearest method), and the rows' button copy is then patched.
 */
import type { ComplianceExpiryResponse, ComplianceItem, ComplianceRenewalMethod } from "./types";
import { renewKindFor, type ComplianceRenewKind, type ComplianceRow, type ComplianceViewModel } from "./view-model";

export type RenewKind = ComplianceRenewKind | "date" | "esign";

export function proposedKindFor(item: Pick<ComplianceItem, "item_slug" | "renewal_methods" | "upload">): RenewKind {
  const methods = item.renewal_methods ?? [];
  // D32: a booked drug screening (date given) renews by uploading the facility receipt.
  if (item.item_slug === "drug-screening" && item.upload?.status === "pending") return "upload";
  if (item.upload?.status === "change_requested" && methods.includes("upload")) return "upload";
  if (methods.includes("esign")) return "esign";
  if (methods.includes("date")) return "date";
  return renewKindFor(item);
}

/** What the build understands: the proposed methods stand in as "attest". */
export function asBuildResponse(r: ComplianceExpiryResponse): ComplianceExpiryResponse {
  const map = (m: ComplianceRenewalMethod): ComplianceRenewalMethod => (m === "date" || m === "esign" ? "attest" : m);
  return {
    ...r,
    items: r.items.map((i) => (i.renewal_methods ? { ...i, renewal_methods: [...new Set(i.renewal_methods.map(map))] } : i)),
  };
}

/** The button copy for a row whose requirement uses a proposed method. */
export function withProposedRows(vm: ComplianceViewModel, r: ComplianceExpiryResponse, locks: Record<string, string> = {}): ComplianceViewModel {
  const patch = (row: ComplianceRow): ComplianceRow => {
    // ⚠️ PROPOSED: a requirement waiting on an earlier step of its round has no button yet (the page shows why).
    if (locks[row.slug] && !row.changes) row = { ...row, canUpload: false };
    const switchItem = r.items.find((i) => i.item_slug === row.slug)?.program_switch_request;
    if (switchItem) {
      // ⚠️ PROPOSED (program switch): requested, no date of its own yet.
      row = {
        ...row,
        text: switchItem === "fc" ? "New for Verida Fully Credentialled" : "Needed for TNC+",
        textColor: "#B45309",
        isDue: true,
        canUpload: row.canUpload && !locks[row.slug],
        uploadCta: row.inReview ? row.uploadCta : `Upload ${row.title}`,
      };
      if (locks[row.slug]) return { ...row, canUpload: false };
    }
    const item = r.items.find((i) => i.item_slug === row.slug);
    // D32: booked → the receipt is the next thing to send (the build would show it as "pending" with no button).
    if (row.slug === "drug-screening" && item?.upload?.status === "pending" && !row.changes) {
      return { ...row, canUpload: true, text: "Booked · upload the facility receipt after your screening", uploadLabel: "Upload receipt", uploadCta: "Upload your drug screening receipt" };
    }
    const kind = item ? proposedKindFor(item) : row.renewKind;
    if (row.slug === "background-check-fee" && !row.changes) return { ...row, uploadLabel: "Pay", uploadCta: "Pay the renewal fee" };
    if (row.changes || (kind !== "date" && kind !== "esign")) return row;
    return kind === "esign"
      ? { ...row, uploadLabel: "Sign", uploadCta: `Sign the ${row.title} consent` }
      : { ...row, uploadLabel: "Renew", uploadCta: `Renew ${row.title}` };
  };
  return {
    ...vm,
    page: { ...vm.page, due: vm.page.due.map(patch), ok: vm.page.ok.map(patch) },
    sheetRows: vm.sheetRows.map(patch),
  };
}
