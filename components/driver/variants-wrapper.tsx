"use client";

import { Suspense } from "react";
import { VariantsProvider, VariantsFallbackProvider } from "@/lib/variants-context";
import { VariantToggle } from "./variant-toggle";

function VariantsContent({ children }: { children: React.ReactNode }) {
  return (
    <VariantsProvider>
      {children}
      <VariantToggle />
    </VariantsProvider>
  );
}

function VariantsFallback({ children }: { children: React.ReactNode }) {
  return (
    <VariantsFallbackProvider>
      {children}
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
