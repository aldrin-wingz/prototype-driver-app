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
 * Seven visual treatments for surfacing incentive eligibility on list views.
 */
export type PillVariant = 
  | 'pill-named-bottom'      // Named pill row below card content
  | 'badge-corner-flag'      // Corner flag badge with Wingz logo
  | 'banner-wingz-hero'      // Full-width banner with hero styling
  | 'streak-flame'           // Animated flame icon showing streak progress
  | 'progress-ring'          // Circular gradient progress indicator
  | 'bonus-preview'          // Stacked bonus preview showing potential earnings
  | 'achievement-badge';     // Gold/silver/bronze achievement-style badge

/**
 * Dashboard incentive surfacing variants (I-3)
 * Three approaches for showing incentive progress on the home screen.
 */
export type DashboardVariant = 
  | 'dashboard-banner'           // Top banner with progress summary
  | 'dashboard-card-section'     // Dedicated card section for incentives
  | 'dashboard-widget-integrated'; // Integrated into existing earnings widget

/**
 * Ride detail callout variants (I-4)
 * Three ways to highlight incentive eligibility on the detail screen.
 */
export type DetailVariant = 
  | 'detail-inline-badge'    // Inline badge near trip info
  | 'detail-section-pill'    // Dedicated section with pill styling
  | 'detail-map-banner';     // Banner overlaid on map region

// -----------------------------------------------------------------------------
// VARIANT SELECTION
// -----------------------------------------------------------------------------

/**
 * Current variant selection state.
 * Persisted to localStorage and URL query params.
 */
export interface VariantSelection {
  pill: PillVariant;
  dashboard: DashboardVariant;
  detail: DetailVariant;
}

/**
 * Default variant selection.
 * Used on first load before user makes any changes.
 */
export const DEFAULT_VARIANTS: VariantSelection = {
  pill: 'pill-named-bottom',
  dashboard: 'dashboard-card-section',
  detail: 'detail-section-pill',
};

// -----------------------------------------------------------------------------
// VARIANT LABELS (Human-readable names for UI)
// -----------------------------------------------------------------------------

export const PILL_VARIANT_LABELS: Record<PillVariant, string> = {
  'pill-named-bottom': 'Pill Row (Bottom)',
  'badge-corner-flag': 'Corner Flag Badge',
  'banner-wingz-hero': 'Hero Banner',
  'streak-flame': 'Streak Flame',
  'progress-ring': 'Progress Ring',
  'bonus-preview': 'Bonus Preview',
  'achievement-badge': 'Achievement Badge',
};

export const DASHBOARD_VARIANT_LABELS: Record<DashboardVariant, string> = {
  'dashboard-banner': 'Top Banner',
  'dashboard-card-section': 'Card Section',
  'dashboard-widget-integrated': 'Integrated Widget',
};

export const DETAIL_VARIANT_LABELS: Record<DetailVariant, string> = {
  'detail-inline-badge': 'Inline Badge',
  'detail-section-pill': 'Section with Pill',
  'detail-map-banner': 'Map Banner',
};

/**
 * Combined labels map for programmatic access.
 */
export const VARIANT_LABELS = {
  pill: PILL_VARIANT_LABELS,
  dashboard: DASHBOARD_VARIANT_LABELS,
  detail: DETAIL_VARIANT_LABELS,
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
    value: 'badge-corner-flag',
    label: 'Corner Flag Badge',
    description: 'Wingz logo badge in the top-left corner of qualifying cards',
  },
  {
    value: 'banner-wingz-hero',
    label: 'Hero Banner',
    description: 'Full-width gradient banner with Wingz branding above card',
  },
  {
    value: 'streak-flame',
    label: 'Streak Flame',
    description: 'Animated flame icon that grows as you get closer to bonus completion',
  },
  {
    value: 'progress-ring',
    label: 'Progress Ring',
    description: 'Circular progress indicator showing completion percentage',
  },
  {
    value: 'bonus-preview',
    label: 'Bonus Preview',
    description: 'Shows potential bonus earnings directly on the card',
  },
  {
    value: 'achievement-badge',
    label: 'Achievement Badge',
    description: 'Gold/silver/bronze style badges based on incentive value',
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

export const DETAIL_VARIANT_OPTIONS: VariantOption<DetailVariant>[] = [
  {
    value: 'detail-inline-badge',
    label: 'Inline Badge',
    description: 'Small badge inline with trip metadata',
  },
  {
    value: 'detail-section-pill',
    label: 'Section with Pill',
    description: 'Dedicated section with incentive pill styling',
  },
  {
    value: 'detail-map-banner',
    label: 'Map Banner',
    description: 'Banner overlaid on the map preview region',
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
  detail: 'v_detail',
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
  
  const detailParam = searchParams.get(VARIANT_QUERY_PARAMS.detail);
  if (detailParam && isValidDetailVariant(detailParam)) {
    result.detail = detailParam;
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
  params.set(VARIANT_QUERY_PARAMS.detail, variants.detail);
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
  'badge-corner-flag', 
  'banner-wingz-hero',
  'streak-flame',
  'progress-ring',
  'bonus-preview',
  'achievement-badge',
];
const VALID_DASHBOARD_VARIANTS: DashboardVariant[] = ['dashboard-banner', 'dashboard-card-section', 'dashboard-widget-integrated'];
const VALID_DETAIL_VARIANTS: DetailVariant[] = ['detail-inline-badge', 'detail-section-pill', 'detail-map-banner'];

export function isValidPillVariant(value: string): value is PillVariant {
  return VALID_PILL_VARIANTS.includes(value as PillVariant);
}

export function isValidDashboardVariant(value: string): value is DashboardVariant {
  return VALID_DASHBOARD_VARIANTS.includes(value as DashboardVariant);
}

export function isValidDetailVariant(value: string): value is DetailVariant {
  return VALID_DETAIL_VARIANTS.includes(value as DetailVariant);
}

export function isValidVariantSelection(obj: unknown): obj is VariantSelection {
  if (typeof obj !== 'object' || obj === null) return false;
  
  const selection = obj as Record<string, unknown>;
  
  return (
    typeof selection.pill === 'string' && isValidPillVariant(selection.pill) &&
    typeof selection.dashboard === 'string' && isValidDashboardVariant(selection.dashboard) &&
    typeof selection.detail === 'string' && isValidDetailVariant(selection.detail)
  );
}
