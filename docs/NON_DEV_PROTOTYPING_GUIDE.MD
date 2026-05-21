# Non-dev prototyping guide — Driver App (`prototype-driver-app`)

Plain-language guide for PMs and designers prototyping the **Wingz Driver Incentives v1** app in Cursor. No terminal expertise required—use the **Cursor skills** listed below and ask the agent to run commands for you.

---

## What this repo is

| Item | Detail |
|------|--------|
| **Repo** | [github.com/aldrin-wingz/prototype-driver-app](https://github.com/aldrin-wingz/prototype-driver-app) |
| **Default branch** | `main` |
| **Stack** | Next.js 16, React 19, Bun, Tailwind, shadcn/ui |
| **Data** | Mock data in `lib/data/` and `lib/driver-data/` — no live backend in the prototype |
| **Live preview (deployed)** | https://prototype-driver-app.vercel.app/ |
| **Planning docs** | `PROTOTYPE-BIBLE.md`, `PROTOTYPE-TRACKER.md` |

This is **not** production `wingz-driver-portal`. It is a focused prototype for driver incentives UX.

---

## Cursor skills (use these in chat)

| Skill | When to use |
|-------|-------------|
| **/prep-my-day** | Start of day — get latest code on your **current branch** (`git pull`) |
| **/start-working** | Install deps + run local preview (`bun install`, `bun run dev`) |
| **smart-commit** | Save work as clean, reviewable git commits (ask explicitly) |
| **smart-rebase** | Engineers only — rebase onto `main` / fix PR conflicts |

Say the skill name in Cursor chat (e.g. “/prep-my-day” or “start working”).

---

## First-time setup (once per Mac)

### 1. Install Bun

```bash
curl -fsSL https://bun.sh/install | bash
```

Restart the terminal, then check:

```bash
bun --version
```

### 2. Clone the repo

```bash
cd ~/Documents/workspace   # or your preferred folder
git clone git@github.com-aldrin_wingz:aldrin-wingz/prototype-driver-app.git
cd prototype-driver-app
```

If clone fails with “Permission denied”, ask engineering to set up your SSH key for GitHub (same as `wingz-driver-portal`).

### 3. Install dependencies

**Always** install locally—do not copy `node_modules` from a zip.

```bash
bun install
```

### 4. Open in Cursor

Open the `prototype-driver-app` folder as the workspace root (the folder that contains `package.json`).

---

## Daily workflow

### Morning

1. **/prep-my-day** — sync your branch with GitHub  
2. **/start-working** — install (if needed) and start the dev server  

### While prototyping

- Edit UI in `app/`, `components/driver/`, or mock data in `lib/data/`
- Refresh the browser to see changes (dev server hot-reloads most edits)

### End of day

Ask for **smart-commit** when you want work saved to git, then push (or ask the agent to push if you have access).

---

## Local preview URLs

After **/start-working**, open:

| Screen | URL |
|--------|-----|
| **Home (dashboard)** | http://localhost:3000/ |
| **Requests** | http://localhost:3000/requests |
| **Planner** | http://localhost:3000/planner |
| **My Rides** | http://localhost:3000/my-rides |
| **Options** | http://localhost:3000/options |
| **Incentives** | http://localhost:3000/incentives |
| **Ride history** | http://localhost:3000/ride-history |
| **Component showcase** | http://localhost:3000/components |

If port **3000** is busy, Next.js may use **3002** (or another port)—check the terminal output for `Local: http://localhost:XXXX`.

**Stop the server:** focus the terminal running dev and press `Ctrl+C`.

---

## Deployed preview (Vercel)

- **Production URL:** https://prototype-driver-app.vercel.app/
- Deploys automatically when `main` is pushed to GitHub (if the Vercel project is connected).

**If the link shows NOT_FOUND or only images:**

- Vercel **Framework Preset** must be **Next.js** (not “Other”).  
  Settings → Build & Deployment → Framework Preset → **Next.js** → Save → Redeploy.

**If the link asks you to log in (Vercel Authentication):**

- That is team **Deployment Protection**, not a broken app. Log in with your Wingz Vercel account, or ask an admin to allow your email / share a bypass link.

---

## Git branches (simple rules)

| Branch | Use |
|--------|-----|
| `main` | Shared prototype line; deploys to Vercel |
| `pm/your-feature` | Your day-to-day work (recommended naming) |

- **/prep-my-day** only updates the branch you are on—it does **not** merge `main` into your branch automatically.  
- To put latest `main` into your branch, ask **engineering** or use **smart-rebase** (not default for non-dev).

---

## What you should **not** do

- Commit `.env` files or paste secrets in chat  
- Copy `node_modules` from a zip (breaks the Mac build)  
- Change Vercel **Output Directory** to `public` or `out` (breaks routing)  
- Force-push `main`  
- Run **smart-rebase** unless engineering asks you to  

---

## Troubleshooting

### `bun: command not found`

Install Bun (see [First-time setup](#1-install-bun)) or ask engineering.

### Dev server error: SWC / `turbo.createProject` / code signature

You opened a **zip** without reinstalling deps. Fix:

```bash
rm -rf node_modules .next
bun install
bun run dev
```

### `useSearchParams` / build failed on Vercel

Engineering fix is already on `main` (`/requests` uses Suspense). Pull latest with **/prep-my-day** and redeploy.

### Port 3000 in use

Another app is using the port. Use the port shown in the terminal (e.g. 3002), or stop the other app and run **/start-working** again.

### Git pull conflicts

Stop and ask engineering—do not guess merge resolutions.

### Login / `.env`

This prototype uses **mock data**. You usually do **not** need `.env` for local preview. If something asks for env vars, ask engineering—never paste values in chat.

---

## Private npm packages?

**No.** This repo does not use `@wingz-inc` GitHub Packages. You do **not** need a `GIT_NPM_TOKEN` in `~/.npmrc` for this project.

---

## Where to edit common things

| Goal | Location |
|------|----------|
| Incentive cards / dashboard | `components/driver/dashboard-incentive-section.tsx`, `app/page.tsx` |
| Incentives list page | `app/incentives/page.tsx` |
| Per-incentive rides view | `app/incentives/[id]/rides/page.tsx`, `components/driver/incentive-rides-view.tsx` |
| Mock incentive data | `lib/data/incentives.ts`, `lib/data/incentive-utils.ts` |
| Past outcomes | `lib/data/past-outcomes.ts` |
| Bottom navigation | `components/driver/bottom-nav.tsx` |

---

## Getting help

- **Git / GitHub access:** engineering (same SSH setup as `wingz-driver-portal`)  
- **Vercel / deploy / NOT_FOUND:** engineering or whoever owns the `wingz-team` Vercel project  
- **Product / scope:** see `PROTOTYPE-BIBLE.md` and `PROTOTYPE-TRACKER.md`  

---

## Quick reference card

```text
Start of day:     /prep-my-day  →  /start-working
Preview:          http://localhost:3000/
Deployed:         https://prototype-driver-app.vercel.app/
Save work:        smart-commit (then git push)
Stuck on git:     ask engineering
```
