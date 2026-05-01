"use client";

import { Suspense } from "react";
import { VariantsProvider, VariantsFallbackProvider } from "@/lib/variants-context";
import { IncentiveEarnedProvider } from "@/lib/incentive-earned-context";
import { VariantToggle } from "./variant-toggle";
import { IncentiveEarnedPopup } from "./incentive-earned-popup";

function VariantsContent({ children }: { children: React.ReactNode }) {
  return (
    <VariantsProvider>
      <IncentiveEarnedProvider>
        {children}
        <VariantToggle />
        <IncentiveEarnedPopup />
      </IncentiveEarnedProvider>
    </VariantsProvider>
  );
}

function VariantsFallback({ children }: { children: React.ReactNode }) {
  return (
    <VariantsFallbackProvider>
      <IncentiveEarnedProvider>
        {children}
        <IncentiveEarnedPopup />
      </IncentiveEarnedProvider>
    </VariantsFallbackProvider>
  );
}

export function VariantsWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<VariantsFallback>{children}</VariantsFallback>}>
      <VariantsContent>{children}</VariantsContent>
    </Suspense>
  );
}
