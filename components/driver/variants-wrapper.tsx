"use client";

import { Suspense } from "react";
import { VariantsProvider } from "@/lib/variants-context";
import { VariantToggle } from "./variant-toggle";

function VariantsContent({ children }: { children: React.ReactNode }) {
  return (
    <VariantsProvider>
      {children}
      <VariantToggle />
    </VariantsProvider>
  );
}

export function VariantsWrapper({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<>{children}</>}>
      <VariantsContent>{children}</VariantsContent>
    </Suspense>
  );
}
