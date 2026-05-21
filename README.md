# Wingz React Component Registry

Design system and reusable React components for Wingz projects. Use this repo as a **boilerplate** or **context** when creating new prototypes and projects with v0 or other tools.

> **If this repo is deployed:** The deployed site is for **viewing only**. Do not use the deployed page as context when building other projects. Use the **source code** from this repository instead.

## How to Use

| Use case | Action |
|----------|--------|
| **Copy components** into an existing project | Copy `globals.css`, `tailwind.config.ts`, and components from `components/` — see [docs/HOW-TO-USE.md](docs/HOW-TO-USE.md#1-copy-paste) |
| **Start a new project** | Clone this repo and remove what you don't need — see [docs/HOW-TO-USE.md](docs/HOW-TO-USE.md#2-use-as-template) |
| **v0 prototyping** | Add this repo to your workspace and reference files with `@`, or paste design tokens into prompts — see [docs/HOW-TO-USE.md](docs/HOW-TO-USE.md#3-v0-prototyping) |

Full guide: **[docs/HOW-TO-USE.md](docs/HOW-TO-USE.md)**

**Non-dev prototyping (PM/design):** **[docs/NON_DEV_PROTOTYPING_GUIDE.MD](docs/NON_DEV_PROTOTYPING_GUIDE.MD)** — daily workflow, local preview, Vercel link, Cursor skills (`/prep-my-day`, `/start-working`).

## Contents

| Area | Location | Description |
|------|----------|-------------|
| **Design System** | `app/globals.css`, `tailwind.config.ts` | Wingz brand tokens, colors, typography |
| **UI Components** | `components/ui/` | 50+ shadcn/ui primitives (Button, Card, Dialog, Table, etc.) |
| **Agent Portal** | `components/agent/` | Driver table, communications overlay, compose modal, pagination |
| **Dispatch Tool** | `components/dispatch-tool/` | DateSelector, TopNavTabs, ColorLegendModal, RidePreviewCard |
| **Post-Hire Compliance** | `components/post-hire-compliance/` | Header, Navigation, EmptyState |
| **In-App Announcements** | `components/in-app-announcements/` | PhonePreview, CollapsibleContent |
| **Onboarding** | `components/onboarding/` | Interview scheduler, rejection screen |
| **Theme** | `components/theme-provider.tsx` | Dark/light mode support |

## Design System

- **Primary**: Wingz green `#16CFA9` (hsl 164 81% 45%)
- **Destructive**: Wingz red `#E73536`
- **Warning**: Wingz yellow `#FBA711`
- **Font**: DM Sans (via `next/font`)

See [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md) for full token reference.

## Getting Started

```bash
# Clone the repo
git clone https://github.com/wingz-inc/wingz-react-component-registry.git
cd wingz-react-component-registry

# Install dependencies (uses legacy-peer-deps for React 19 compatibility)
npm install
# or
pnpm install
# or
bun install

# Run dev server (includes component showcase)
npm run dev
```

## Source Projects

Components and design system were transferred from:

- **wingz-driver-portal** – Customer-facing driver onboarding
- **wingz-cs-tool/agent-portal** – Agent portal (driver onboarding CS tool)

## Future

- wingz-cs-tool and wingz-driver-portal will be updated to consume components from this registry
- New prototypes should start from this repo for consistent design and reusability
