# Wingz Design System

Unified design tokens for driver portal, agent portal, and new prototypes.

## Brand Colors

| Token | Hex | HSL | Usage |
|-------|-----|-----|-------|
| Primary | `#16CFA9` | 164 81% 45% | Buttons, links, focus ring |
| Destructive | `#E73536` | 0 78% 55% | Errors, delete actions |
| Warning | `#FBA711` | 38 96% 52% | Warnings, caution states |
| Accent (muted) | `#EEFBF5` | 155 76% 96% | Hover backgrounds, highlights |

## CSS Variables

All tokens are defined in `app/globals.css` under `:root`:

```css
--primary: 164 81% 45%;
--primary-foreground: 0 0% 100%;
--destructive: 0 78% 55%;
--warning: 38 96% 52%;
--accent: 155 76% 96%;
--radius: 0.5rem;
/* ...sidebar, chart, etc. */
```

## Tailwind Usage

```tsx
<Button className="bg-primary text-primary-foreground">Submit</Button>
<div className="rounded-lg border border-border bg-card" />
<p className="text-muted-foreground">Secondary text</p>
```

## Typography

- **Font**: DM Sans (`--font-dm-sans`)
- **Base**: `font-sans` (system fallback)

## Dark Mode

Tokens support `class`-based dark mode. Wrap your app with `ThemeProvider` from `components/theme-provider.tsx`.

## CS Tool Extensions

For agent portal / CS tool screens, additional tokens:

- `leg.a`, `leg.b`, `leg.c`, `leg.d` – Ride leg colors
- `badge.red`, `badge.yellow`, `badge.blue` – Status badge variants
- `green.1`–`green.8` – Green palette extensions
