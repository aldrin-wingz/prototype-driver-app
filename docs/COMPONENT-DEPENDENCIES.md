# Component Dependencies

## Standalone (no extra deps)

- **components/ui/** – All UI primitives. Only need `@/lib/utils`, `@/components/ui/*`
- **components/onboarding/interview-scheduler.tsx** – Standalone
- **components/onboarding/rejection-screen.tsx** – Needs `DriverRejection` from `@/lib/api/types`
- **components/agent/driver-table.tsx** – Needs `MockDriver[]` from `@/lib/agent-mock/drivers-data`
- **components/agent/table-pagination.tsx** – Standalone
- **components/agent/sortable-header.tsx** – Standalone
- **components/agent/compose-message-modal.tsx** – Standalone
- **components/agent/submitted-fields-display.tsx** – Standalone
- **components/agent/comms-history.tsx** – Standalone

## Agent Portal – Communications Overlay

`components/agent/communications-overlay.tsx` requires:

- `@/lib/communications-context` – `CommunicationsProvider`, `useComms`
- `@/lib/agent-mock/drivers-data` – `STAGES_META`, `ALL_DRIVERS` (for demo)

Wire up your own `CommunicationsProvider` with real API for production.

## Driver Portal – Full Onboarding Flow

The full onboarding flow (OnboardingShell, StageSidebar, StepForm, DynamicField, etc.) lives in **wingz-driver-portal** and depends on:

- `lib/forms/*` – Form config, schema builder, JSON logic, adapters
- `lib/auth/*` – Auth context, useAuth
- `lib/store/*` – Redux store, onboarding slice, driver API
- `lib/api/*` – API client, types

To build a driver onboarding app, copy the full `lib/` from wingz-driver-portal or use wingz-driver-portal as the base.
