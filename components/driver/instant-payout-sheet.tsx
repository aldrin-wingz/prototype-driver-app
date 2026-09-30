"use client";

import { useEffect, useState } from "react";
import { Check, Landmark, Zap } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { BANK_ACCOUNTS } from "@/lib/data/wallet";
import { WingzWalletMark } from "./wingz-wallet-mark";

type Step = "account" | "amount" | "success";

interface InstantPayoutSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: number;
  /** Called when the payout is confirmed, with the cashed-out amount. */
  onPaid?: (amount: number) => void;
}

const DEFAULT_ACCOUNT_ID =
  BANK_ACCOUNTS.find((a) => a.isDefault)?.id ?? BANK_ACCOUNTS[0]?.id ?? "";

/**
 * Instant Payout flow (mock, Wingz brand dark theme): pick a bank account →
 * set the amount → confirm → success. On confirm it calls `onPaid(amount)` so
 * the caller can draw down the wallet balance. No cash-out fee.
 */
export function InstantPayoutSheet({
  open,
  onOpenChange,
  balance,
  onPaid,
}: InstantPayoutSheetProps) {
  const [step, setStep] = useState<Step>("account");
  const [accountId, setAccountId] = useState(DEFAULT_ACCOUNT_ID);
  const [amountStr, setAmountStr] = useState(balance.toFixed(2));
  const [paidAmount, setPaidAmount] = useState(0);

  // Reset the flow each time the sheet OPENS. We intentionally exclude
  // `balance` from the deps: the payout draws the balance down while the sheet
  // is still open, and re-running this on that change would bounce the user off
  // the success screen back to the account step.
  useEffect(() => {
    if (open) {
      setStep("account");
      setAccountId(DEFAULT_ACCOUNT_ID);
      setAmountStr(balance.toFixed(2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const account = BANK_ACCOUNTS.find((a) => a.id === accountId);
  const amount = Math.max(0, Math.min(parseFloat(amountStr) || 0, balance));
  const amountValid = amount > 0 && amount <= balance;

  const handleConfirm = () => {
    setPaidAmount(amount);
    onPaid?.(amount);
    setStep("success");
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto max-w-md border-white/10 bg-[#131A1B] text-[#E7F3F3]">
        {step === "account" && (
          <>
            <DrawerHeader className="text-left">
              <div className="flex items-center gap-2">
                <WingzWalletMark size={28} />
                <DrawerTitle className="text-[#E7F3F3]">Instant Payout</DrawerTitle>
              </div>
              <DrawerDescription className="text-[#E7F3F3]/60">
                Choose where to send your ${balance.toFixed(2)}.
              </DrawerDescription>
            </DrawerHeader>

            <div className="space-y-2 px-4">
              {BANK_ACCOUNTS.map((a) => {
                const selected = a.id === accountId;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAccountId(a.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
                      selected
                        ? "border-[#00F9B8] bg-[#00F9B8]/10"
                        : "border-white/15 bg-white/5 hover:bg-white/10"
                    )}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                      <Landmark className="h-5 w-5 text-[#E7F3F3]/70" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[#E7F3F3]">{a.bankName}</p>
                      <p className="text-xs text-[#E7F3F3]/50">
                        •••• {a.last4}
                        {a.isDefault ? " · Default" : ""}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full border-2",
                        selected ? "border-[#00F9B8] bg-[#00F9B8]" : "border-white/30"
                      )}
                    >
                      {selected && <Check className="h-3 w-3 text-[#131A1B]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <DrawerFooter>
              <Button
                className="bg-[#00F9B8] text-[#131A1B] hover:bg-[#00B692]"
                onClick={() => setStep("amount")}
                disabled={!account}
              >
                Continue
              </Button>
            </DrawerFooter>
          </>
        )}

        {step === "amount" && (
          <>
            <DrawerHeader className="text-left">
              <DrawerTitle className="text-[#E7F3F3]">Payout amount</DrawerTitle>
              <DrawerDescription className="text-[#E7F3F3]/60">
                To {account?.bankName} •••• {account?.last4}
              </DrawerDescription>
            </DrawerHeader>

            <div className="px-4">
              <label className="text-xs font-medium uppercase tracking-wide text-[#E7F3F3]/60">
                Amount
              </label>
              <div className="mt-1 flex items-center rounded-xl border border-white/15 px-3">
                <span className="text-2xl font-bold text-[#E7F3F3]/40">$</span>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  className="border-0 bg-transparent text-2xl font-bold text-[#E7F3F3] shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-[#E7F3F3]/60">Available: ${balance.toFixed(2)}</span>
                <button
                  type="button"
                  className="font-semibold text-[#00F9B8]"
                  onClick={() => setAmountStr(balance.toFixed(2))}
                >
                  Max
                </button>
              </div>
              {!amountValid && (
                <p className="mt-2 text-xs text-[#F87171]">
                  Enter an amount up to ${balance.toFixed(2)}.
                </p>
              )}
            </div>

            <DrawerFooter>
              <Button
                className="bg-[#00F9B8] text-[#131A1B] hover:bg-[#00B692]"
                disabled={!amountValid}
                onClick={handleConfirm}
              >
                <Zap className="mr-1.5 h-4 w-4" />
                Cash Out ${amount.toFixed(2)}
              </Button>
              <Button
                variant="ghost"
                className="text-[#E7F3F3] hover:bg-white/5 hover:text-[#E7F3F3]"
                onClick={() => setStep("account")}
              >
                Back
              </Button>
            </DrawerFooter>
          </>
        )}

        {step === "success" && (
          <>
            <div className="flex flex-col items-center px-4 pt-8 pb-2 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#00F9B8]/15">
                <Check className="h-8 w-8 text-[#00F9B8]" />
              </div>
              <p className="mt-4 text-xl font-bold text-[#E7F3F3]">
                ${paidAmount.toFixed(2)} sent
              </p>
              <p className="mt-1 text-sm text-[#E7F3F3]/60">
                to {account?.bankName} •••• {account?.last4}. Arrives in minutes.
              </p>
            </div>
            <DrawerFooter>
              <Button
                className="bg-[#00F9B8] text-[#131A1B] hover:bg-[#00B692]"
                onClick={() => onOpenChange(false)}
              >
                Done
              </Button>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
