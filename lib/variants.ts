// =============================================================================
// VARIANT CONFIGURATION
// =============================================================================
// This file defines all variant types and constants for the Driver Incentives
// A/B testing overlay. Stakeholders can switch between variants using the
// floating toggle UI to compare different UI treatments.
// =============================================================================

// -----------------------------------------------------------------------------
// VARIANT TYPES
// -----------------------------------------------------------------------------

/**
 * Pill/Badge/Banner variants for ride cards (I-2)
 * Three visual treatments for surfacing incentive eligibility on list views.
 */
export type PillVariant = 
  | 'pill-named-bottom'      // Named pill row below card content
  | 'banner-wingz-hero'      // Full-width banner with hero styling (black/green)
  | 'achievement-banner';    // Full-width tiered banner (gold/silver/bronze)

/**
 * Dashboard incentive surfacing variants (I-3)
 * Three approaches for showing incentive progress on the home screen.
 */
export type DashboardVariant = 
  | 'dashboard-banner'           // Top banner with progress summary
  | 'dashboard-card-section'     // Dedicated card section for incentives
  | 'dashboard-widget-integrated'; // Integrated into existing earnings widget

/**
 * `/payout` summary section variants (I-4.4)
 * Two layouts for the merged summary card whose 3 metric cells double
 * as the tab triggers (Earned / Upcoming / Incentives). The variant
 * difference is the OUTER card's relationship to the viewport.
 */
export type PayoutSummaryVariant = 
  | 'boxed-tabs'             // Outer card sits inside standard horizontal page padding
  | 'edge-to-edge-tabs';     // Outer card extends flush to viewport horizontal edges

// -----------------------------------------------------------------------------
// VARIANT SELECTION
// -----------------------------------------------------------------------------

/**
 * Current variant selection state.
 * Persisted to localStorage and URL query params.
 * Note: Ride Details inherits the active pill variant - no separate detail variant.
 */
export interface VariantSelection {
  pill: PillVariant;
  dashboard: DashboardVariant;
  payoutSummary: PayoutSummaryVariant;
}

/**
 * Default variant selection.
 * Used on first load before user makes any changes.
 */
export const DEFAULT_VARIANTS: VariantSelection = {
  pill: 'pill-named-bottom',
  dashboard: 'dashboard-card-section',
  payoutSummary: 'boxed-tabs',
};

// -----------------------------------------------------------------------------
// VARIANT LABELS (Human-readable names for UI)
// -----------------------------------------------------------------------------

export const PILL_VARIANT_LABELS: Record<PillVariant, string> = {
  'pill-named-bottom': 'Pill Row (Bottom)',
  'banner-wingz-hero': 'Hero Banner',
  'achievement-banner': 'Achievement Banner',
};

export const DASHBOARD_VARIANT_LABELS: Record<DashboardVariant, string> = {
  'dashboard-banner': 'Top Banner',
  'dashboard-card-section': 'Card Section',
  'dashboard-widget-integrated': 'Integrated Widget',
};

export const PAYOUT_SUMMARY_VARIANT_LABELS: Record<PayoutSummaryVariant, string> = {
  'boxed-tabs': 'Boxed Tabs',
  'edge-to-edge-tabs': 'Edge-to-Edge Tabs',
};

/**
 * Combined labels map for programmatic access.
 */
export const VARIANT_LABELS = {
  pill: PILL_VARIANT_LABELS,
  dashboard: DASHBOARD_VARIANT_LABELS,
  payoutSummary: PAYOUT_SUMMARY_VARIANT_LABELS,
} as const;

// -----------------------------------------------------------------------------
// VARIANT METADATA (for UI display)
// -----------------------------------------------------------------------------

export interface VariantOption<T extends string> {
  value: T;
  label: string;
  description: string;
}

export const PILL_VARIANT_OPTIONS: VariantOption<PillVariant>[] = [
  {
    value: 'pill-named-bottom',
    label: 'Pill Row (Bottom)',
    description: 'Incentive pills appear in the existing pill row below card content',
  },
  {
    value: 'banner-wingz-hero',
    label: 'Hero Banner',
    description: 'Full-width black banner with progress bar and bonus earnings',
  },
  {
    value: 'achievement-banner',
    label: 'Achievement Banner',
    description: 'Full-width tiered banner (gold/silver/bronze) with progress and earnings',
  },
];

export const DASHBOARD_VARIANT_OPTIONS: VariantOption<DashboardVariant>[] = [
  {
    value: 'dashboard-banner',
    label: 'Top Banner',
    description: 'Promotional banner at the top of the dashboard',
  },
  {
    value: 'dashboard-card-section',
    label: 'Card Section',
    description: 'Dedicated incentive progress cards in their own section',
  },
  {
    value: 'dashboard-widget-integrated',
    label: 'Integrated Widget',
    description: 'Progress indicators integrated into the earnings widget',
  },
];

export const PAYOUT_SUMMARY_VARIANT_OPTIONS: VariantOption<PayoutSummaryVariant>[] = [
  {
    value: 'boxed-tabs',
    label: 'Boxed Tabs',
    description: 'Summary card sits inside standard horizontal page padding. Active cell uses full Wingz green bg with white text.',
  },
  {
    value: 'edge-to-edge-tabs',
    label: 'Edge-to-Edge Tabs',
    description: 'Summary card extends flush to the viewport edges. Active cell uses a subtle green tint with a green underline.',
  },
];

// -----------------------------------------------------------------------------
// STORAGE KEYS
// -----------------------------------------------------------------------------

/** localStorage key for persisting variant selection */
export const VARIANTS_STORAGE_KEY = 'driver-incentives-variants';

/** URL query param keys */
export const VARIANT_QUERY_PARAMS = {
  pill: 'v_pill',
  dashboard: 'v_dash',
  payoutSummary: 'payoutSummary',
} as const;

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Parse variant selection from URL query string.
 * Returns partial selection (only params that exist in URL).
 */
export function parseVariantsFromUrl(searchParams: URLSearchParams): Partial<VariantSelection> {
  const result: Partial<VariantSelection> = {};
  
  const pillParam = searchParams.get(VARIANT_QUERY_PARAMS.pill);
  if (pillParam && isValidPillVariant(pillParam)) {
    result.pill = pillParam;
  }
  
  const dashParam = searchParams.get(VARIANT_QUERY_PARAMS.dashboard);
  if (dashParam && isValidDashboardVariant(dashParam)) {
    result.dashboard = dashParam;
  }
  
  const payoutSummaryParam = searchParams.get(VARIANT_QUERY_PARAMS.payoutSummary);
  if (payoutSummaryParam && isValidPayoutSummaryVariant(payoutSummaryParam)) {
    result.payoutSummary = payoutSummaryParam;
  }
  
  return result;
}

/**
 * Serialize variant selection to URL query string.
 */
export function serializeVariantsToUrl(variants: VariantSelection): string {
  const params = new URLSearchParams();
  params.set(VARIANT_QUERY_PARAMS.pill, variants.pill);
  params.set(VARIANT_QUERY_PARAMS.dashboard, variants.dashboard);
  params.set(VARIANT_QUERY_PARAMS.payoutSummary, variants.payoutSummary);
  return params.toString();
}

/**
 * Load variant selection from localStorage.
 */
export function loadVariantsFromStorage(): VariantSelection | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(VARIANTS_STORAGE_KEY);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    if (isValidVariantSelection(parsed)) {
      return parsed;
    }
  } catch {
    // Invalid JSON or storage error
  }
  
  return null;
}

/**
 * Save variant selection to localStorage.
 */
export function saveVariantsToStorage(variants: VariantSelection): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(VARIANTS_STORAGE_KEY, JSON.stringify(variants));
  } catch {
    // Storage error (quota exceeded, etc.)
  }
}

/**
 * Clear variant selection from localStorage.
 */
export function clearVariantsFromStorage(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(VARIANTS_STORAGE_KEY);
  } catch {
    // Storage error
  }
}

// -----------------------------------------------------------------------------
// VALIDATION HELPERS
// -----------------------------------------------------------------------------

const VALID_PILL_VARIANTS: PillVariant[] = [
  'pill-named-bottom', 
  'banner-wingz-hero',
  'achievement-banner',
];
const VALID_DASHBOARD_VARIANTS: DashboardVariant[] = ['dashboard-banner', 'dashboard-card-section', 'dashboard-widget-integrated'];
const VALID_PAYOUT_SUMMARY_VARIANTS: PayoutSummaryVariant[] = ['boxed-tabs', 'edge-to-edge-tabs'];

export function isValidPillVariant(value: string): value is PillVariant {
  return VALID_PILL_VARIANTS.includes(value as PillVariant);
}

export function isValidDashboardVariant(value: string): value is DashboardVariant {
  return VALID_DASHBOARD_VARIANTS.includes(value as DashboardVariant);
}

export function isValidPayoutSummaryVariant(value: string): value is PayoutSummaryVariant {
  return VALID_PAYOUT_SUMMARY_VARIANTS.includes(value as PayoutSummaryVariant);
}

export function isValidVariantSelection(obj: unknown): obj is VariantSelection {
  if (typeof obj !== 'object' || obj === null) return false;
  
  const selection = obj as Record<string, unknown>;
  
  return (
    typeof selection.pill === 'string' && isValidPillVariant(selection.pill) &&
    typeof selection.dashboard === 'string' && isValidDashboardVariant(selection.dashboard) &&
    typeof selection.payoutSummary === 'string' && isValidPayoutSummaryVariant(selection.payoutSummary)
  );
}
