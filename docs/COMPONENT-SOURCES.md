# Component Sources

Components are labeled by their source project. Each component file includes a JSDoc comment at the top, e.g. `/** Source: dispatch-tool (wingz-cs-tool) */`.

---

## Reused across projects

These components are shared by multiple projects. Prefer using them from the registry to avoid duplication.

| Component | Source | Also used in |
|-----------|--------|--------------|
| ColorLegendModal | dispatch-tool | post-hire-compliance (PostHireComplianceHeader) |
| TopNavTabs | dispatch-tool | Shared nav between Dispatch and Post-Hire Compliance views |
| DateSelector | dispatch-tool | Header, alivi-otp, driver-availability-exception-modal |
| RidePreviewCard | dispatch-tool | Calendar day view, main dispatch page |
| CollapsibleContent | in-app-announcements | DriverStatusModal, ArchiveConfirmationModal, ConfirmationModal (internal) |
| TablePagination | agent-portal | **Standard pagination** for all projects. Same UI pattern used in agent-portal, in-app-announcements, post-hire-compliance (ComplianceTable). Use `itemLabel` for context (drivers, announcements, etc.). |

---

## Pagination

**TablePagination** is the design system standard. The basic shadcn `Pagination` (link-based) is deprecated for table/list pagination; use TablePagination instead.

---

## dispatch-tool (main)

The primary NEMT scheduling/dispatch application. **In registry:** DateSelector, TopNavTabs, ColorLegendModal, RidePreviewCard. Others listed below exist in wingz-cs-tool source only.

| Component | Path | Notes |
|-----------|------|-------|
| DateSelector | `components/dispatch-tool/date-selector.tsx` | Date picker with calendar popover. **Reused:** Header, alivi-otp, driver-availability-exception-modal |
| TopNavTabs | `components/dispatch-tool/top-nav-tabs.tsx` | Tab navigation (Dispatch, Post-Hire Compliance). **Reused:** Shared nav between both views |
| ColorLegendModal | `components/dispatch-tool/color-legend-modal.tsx` | Color legend for compliance table. **Reused:** post-hire-compliance (PostHireComplianceHeader) |
| RidePreviewCard | `components/ui/ride-preview-card.tsx` | Ride card for planner (PlannerEntry, ApiRide). **Reused:** Calendar day view, main dispatch page |
| Header | `components/dispatch-tool/header.tsx` | Main header with date selector, market select |
| MapLegend | `components/dispatch-tool/map-legend.tsx` | Map legend |
| CalendarDayView | `components/dispatch-tool/calendar-day-view.tsx` | Day view with rides (needs types) |
| MemberPanel | `components/dispatch-tool/member-panel.tsx` | Driver member panel (needs types) |
| TripsListPanel | `components/dispatch-tool/trips-list-panel.tsx` | Trips list (needs store, types) |
| RideMap | `components/dispatch-tool/ride-map.tsx` | Google Maps ride map (needs @vis.gl, store) |
| RideMapFilterControls | `components/dispatch-tool/ride-map-filter-controls.tsx` | Map filters |
| DriverListPanel | `components/dispatch-tool/driver-list-panel.tsx` | Driver list (needs store) |
| DriverDetailsPanel | `components/dispatch-tool/driver-details-panel.tsx` | Driver details (needs store, APIs) |
| DriverAvailabilityModal | `components/dispatch-tool/driver-availability-modal.tsx` | Availability modal |
| DriverAvailabilitySummary | `components/dispatch-tool/driver-availability-summary.tsx` | Availability summary |
| DriverAvailabilityExceptionModal | `components/dispatch-tool/driver-availability-exception-modal.tsx` | Exception modal |
| DriverAvailabilityExceptionSummary | `components/dispatch-tool/driver-availability-exception-summary.tsx` | Exception summary |
| DriverMileageCappingModal | `components/dispatch-tool/driver-mileage-capping-modal.tsx` | Mileage capping |
| ConflictItem | `components/dispatch-tool/conflict-item.tsx` | Conflict display |
| AuthGuard | `components/dispatch-tool/auth-guard.tsx` | Auth wrapper |
| AliviTimeInput | `components/dispatch-tool/alivi-time-input.tsx` | Time input variant |

---

## post-hire-compliance

Post-hire compliance table and navigation. **In registry:** PostHireComplianceHeader, PostHireComplianceNavigation, PostHireComplianceEmptyState.

| Component | Path | Notes |
|-----------|------|-------|
| PostHireComplianceHeader | `components/post-hire-compliance/post-hire-compliance-header.tsx` | Header with color legend button (uses ColorLegendModal from dispatch-tool) |
| PostHireComplianceNavigation | `components/post-hire-compliance/post-hire-compliance-navigation.tsx` | Breadcrumb-style nav |
| PostHireComplianceEmptyState | `components/post-hire-compliance/post-hire-compliance-empty-state.tsx` | Empty state placeholder |
| ComplianceTable | `components/post-hire-compliance/compliance-table.tsx` | Main compliance table (complex, needs store) |

---

## in-app-announcements

In-app announcement creation and management. **In registry:** PhonePreview, CollapsibleContent.

| Component | Path | Notes |
|-----------|------|-------|
| InAppAnnouncementsPage | `components/in-app-announcements/in-app-announcements-page.tsx` | Main page (needs store, APIs) |
| PhonePreview | `components/in-app-announcements/phone-preview.tsx` | iPhone-style announcement preview |
| CollapsibleContent | `components/in-app-announcements/collapsible-content.tsx` | Expandable content with "Show more". **Reused:** DriverStatusModal, ArchiveConfirmationModal, ConfirmationModal |
| LinkBuilder | `components/in-app-announcements/link-builder.tsx` | Link builder dialog |
| ArchiveConfirmationModal | `components/in-app-announcements/archive-confirmation-modal.tsx` | Archive confirmation |
| ConfirmationModal | `components/in-app-announcements/confirmation-modal.tsx` | Generic confirmation |
| DriverStatusModal | `components/in-app-announcements/driver-status-modal.tsx` | Driver status (needs API) |
| ActionButtonSummary | `components/in-app-announcements/action-button-summary.tsx` | Action button summary |

---

## agent-portal

Agent portal for driver onboarding. See `components/agent/`.

| Component | Path | Notes |
|-----------|------|-------|
| TablePagination | `components/agent/table-pagination.tsx` | **Standard pagination.** Reused: in-app-announcements, post-hire-compliance (ComplianceTable). Use `itemLabel` prop. |

---

## driver-portal (wingz-driver-portal)

Driver onboarding. See `components/onboarding/` and wingz-driver-portal repo for full flow.

---

## ui (shared)

Base shadcn/ui primitives. See `components/ui/`. The basic `Pagination` component exists but is not the design system standard; use **TablePagination** for table/list pagination.
