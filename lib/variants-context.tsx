"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  type VariantSelection,
  type PillVariant,
  type DashboardVariant,
  DEFAULT_VARIANTS,
  VARIANT_QUERY_PARAMS,
  parseVariantsFromUrl,
  loadVariantsFromStorage,
  saveVariantsToStorage,
  clearVariantsFromStorage,
} from "./variants";

// -----------------------------------------------------------------------------
// CONTEXT TYPE
// -----------------------------------------------------------------------------

interface VariantsContextValue {
  variants: VariantSelection;
  setVariants: (variants: VariantSelection) => void;
  setPillVariant: (variant: PillVariant) => void;
  setDashboardVariant: (variant: DashboardVariant) => void;
  resetToDefaults: () => void;
  isLoaded: boolean;
}

const VariantsContext = createContext<VariantsContextValue | null>(null);

// -----------------------------------------------------------------------------
// PROVIDER COMPONENT
// -----------------------------------------------------------------------------

export function VariantsProvider({ children }: { children: React.ReactNode }) {
  const [variants, setVariantsState] = useState<VariantSelection>(DEFAULT_VARIANTS);
  const [isLoaded, setIsLoaded] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Initialize variants from URL (priority) or localStorage on mount
  useEffect(() => {
    const urlVariants = parseVariantsFromUrl(searchParams);
    const storedVariants = loadVariantsFromStorage();

    // Merge: URL params take precedence, then localStorage, then defaults
    const merged: VariantSelection = {
      ...DEFAULT_VARIANTS,
      ...storedVariants,
      ...urlVariants,
    };

    setVariantsState(merged);
    saveVariantsToStorage(merged);
    setIsLoaded(true);
  }, []); // Only run once on mount

  // Update URL query params when variants change
  const updateUrl = useCallback(
    (newVariants: VariantSelection) => {
      const params = new URLSearchParams();
      params.set(VARIANT_QUERY_PARAMS.pill, newVariants.pill);
      params.set(VARIANT_QUERY_PARAMS.dashboard, newVariants.dashboard);
      
      // Use replace to avoid adding to history stack
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname]
  );

  // Set all variants at once
  const setVariants = useCallback(
    (newVariants: VariantSelection) => {
      setVariantsState(newVariants);
      saveVariantsToStorage(newVariants);
      updateUrl(newVariants);
    },
    [updateUrl]
  );

  // Set individual variant types
  const setPillVariant = useCallback(
    (variant: PillVariant) => {
      setVariants({ ...variants, pill: variant });
    },
    [variants, setVariants]
  );

  const setDashboardVariant = useCallback(
    (variant: DashboardVariant) => {
      setVariants({ ...variants, dashboard: variant });
    },
    [variants, setVariants]
  );

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    clearVariantsFromStorage();
    setVariantsState(DEFAULT_VARIANTS);
    
    // Clear URL and go to base path
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  return (
    <VariantsContext.Provider
      value={{
        variants,
        setVariants,
        setPillVariant,
        setDashboardVariant,
        resetToDefaults,
        isLoaded,
      }}
    >
      {children}
    </VariantsContext.Provider>
  );
}

// -----------------------------------------------------------------------------
// FALLBACK PROVIDER (for Suspense fallback - no useSearchParams)
// -----------------------------------------------------------------------------

export function VariantsFallbackProvider({ children }: { children: React.ReactNode }) {
  // Provide default variants with isLoaded=false during suspense
  const fallbackValue: VariantsContextValue = {
    variants: DEFAULT_VARIANTS,
    setVariants: () => {},
    setPillVariant: () => {},
    setDashboardVariant: () => {},
    resetToDefaults: () => {},
    isLoaded: false,
  };

  return (
    <VariantsContext.Provider value={fallbackValue}>
      {children}
    </VariantsContext.Provider>
  );
}

// -----------------------------------------------------------------------------
// HOOK
// -----------------------------------------------------------------------------

export function useVariants(): VariantsContextValue {
  const context = useContext(VariantsContext);
  if (!context) {
    throw new Error("useVariants must be used within a VariantsProvider");
  }
  return context;
}
