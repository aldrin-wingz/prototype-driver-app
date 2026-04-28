# How to Use the Component Registry

A straightforward guide for using this registry in your projects.

---

## Quick reference

| Use case | Go to |
|----------|--------|
| Copy components into a project | [Copy-paste](#1-copy-paste) |
| Start a new project from scratch | [Use as template](#2-use-as-template) |
| Prototype with v0 | [v0 prototyping](#3-v0-prototyping) |
| Publish as npm package | [npm package](#4-npm-package-future) |

---

## 1. Copy-paste

**When:** You have an existing project and want to add registry components.

**Steps:**

1. Copy `app/globals.css` and `tailwind.config.ts` into your project.
2. Copy the components you need from `components/ui/`, `components/agent/`, `components/dispatch-tool/`, `components/post-hire-compliance/`, `components/in-app-announcements/`, or `components/onboarding/`.
3. Copy `lib/utils.ts` (required by most UI components).
4. Copy `lib/utils/phone.ts` if you use `PhoneNumberInput`.
5. Update imports so `@/` points to your project structure.

**Example:** To add the Button and Card:

```
Your project/
├── components/ui/
│   ├── button.tsx    ← copy from registry
│   └── card.tsx     ← copy from registry
├── lib/
│   └── utils.ts     ← copy from registry
└── app/globals.css  ← copy from registry (or merge tokens)
```

---

## 2. Use as template

**When:** Starting a new prototype or app.

**Steps:**

1. Clone this repo: `git clone https://github.com/wingz-inc/wingz-react-component-registry.git my-new-project`
2. `cd my-new-project`
3. `npm install`
4. Rename the project in `package.json` if needed.
5. Add your routes, pages, and logic.
6. Remove components you don't need.

You get the design system and components pre-wired.

---

## 3. v0 prototyping

**When:** Using v0 (or similar AI tools) to generate UI.

### Option A: Reference the registry in Cursor

1. Add this repo to your Cursor workspace (e.g. clone it or add as a folder).
2. When prompting, reference registry files with `@`:
   - *"Create a driver table like @wingz-react-component-registry/components/agent/driver-table.tsx"*
   - *"Use the Wingz design tokens from @wingz-react-component-registry/app/globals.css"*

### Option B: Paste this into your v0 prompt

```
Wingz design system:
- Primary: #16CFA9 (green)
- Destructive: #E73536 (red)
- Warning: #FBA711 (yellow)
- Font: DM Sans
- Use shadcn/ui with these CSS variables
- Status badges: in_progress (primary/10), pending_review (amber), on_hold (orange), change_requested (violet), completed (emerald), rejected (red)
```

### Option C: After v0 generates

1. Copy `app/globals.css` and `tailwind.config.ts` from the registry into the v0 project.
2. Replace v0's generic components with registry versions where needed.
3. Adjust colors and classes to match Wingz tokens.

### Important

- **Do not** use the deployed showcase site as context. Use the **source code** from this repo.
- The deployed site is view-only for visual reference.

---

## 4. npm package (future)

**When:** You want to install the registry as a dependency.

```bash
npm install @wingz/react-component-registry
```

```tsx
import { Button, Card } from "@wingz/react-component-registry";
```

This requires publishing the package. Not set up yet.

---

## 5. Git submodule

**When:** You want the registry as a live reference in your repo.

```bash
git submodule add https://github.com/wingz-inc/wingz-react-component-registry.git packages/registry
```

Then import from the submodule path. You'll need to configure your build to resolve it.

---

## What's in the registry

| Folder | Contents |
|--------|----------|
| `components/ui/` | 50+ shadcn primitives + RidePreviewCard |
| `components/agent/` | Agent portal (DriverTable, ComposeMessageModal, etc.) |
| `components/dispatch-tool/` | DateSelector, TopNavTabs, ColorLegendModal |
| `components/post-hire-compliance/` | Header, Navigation, EmptyState |
| `components/in-app-announcements/` | PhonePreview, CollapsibleContent |
| `components/onboarding/` | InterviewScheduler, RejectionScreen |
| `app/globals.css` | Wingz design tokens |
| `tailwind.config.ts` | Tailwind config with tokens |
| `lib/` | utils, phone helpers, dayjs |
| `docs/COMPONENT-SOURCES.md` | Source project for each component |

---

## Troubleshooting

**Path errors:** Ensure your `tsconfig.json` has `"@/*": ["./*"]` (or equivalent) so `@/components` resolves.

**Tailwind not applying:** Copy `tailwind.config.ts` and `globals.css` from the registry. Ensure `content` includes your component paths.

**Missing dependencies:** Check `package.json` for Radix UI, tailwind-merge, clsx, etc. Install what's missing.
