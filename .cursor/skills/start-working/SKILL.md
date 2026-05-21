---
name: start-working
description: >-
  Start-of-day: bun install and bun run dev for local preview. Use for
  /start-working, start-working, start working, run the app, start dev server,
  bun install, preview locally, localhost:3000, or legacy day-dev / smart-dev
  for prototype-driver-app.
---

# /start-working (prototype-driver-app)

**Start working** installs dependencies (if needed) and starts the local preview server. Run after **/prep-my-day** when beginning a prototyping session.

Target users include **non-dev prototypers**—explain results in plain language.

## Preconditions

- Run from the **repository root** (directory containing `package.json`).
- **Do not** read or print `.env` contents in chat.
- **Do not** commit secrets.
- **Do not** change git config.
- If `bun` is missing, tell the user to install Bun (see `docs/NON_DEV_PROTOTYPING_GUIDE.MD`) or ask engineering.

## What the user should provide

- Optional: skip install if they only want `bun run dev` and `node_modules` already exists
- Optional: which screen to open (default: Home)

## Start-working workflow

Copy and track progress:

```
Start-working progress:
- [ ] Confirm repo root
- [ ] bun install (unless user skipped)
- [ ] Start bun run dev (background)
- [ ] Share preview URLs and how to stop
```

### 1. Confirm location

```bash
pwd
test -f package.json && echo "ok" || echo "missing package.json"
```

If not repo root, `cd` to `prototype-driver-app` root (ask user for path if unclear).

### 2. Install dependencies

```bash
bun install
```

| Failure | Action |
|---------|--------|
| **bun: command not found** | Install Bun: `curl -fsSL https://bun.sh/install \| bash` (see `docs/NON_DEV_PROTOTYPING_GUIDE.MD`) or ask engineering. |
| **SWC / code signature / `turbo.createProject`** | Zip `node_modules` likely copied in. Run `rm -rf node_modules .next && bun install` then retry. |
| **401 / 403 on @wingz-inc** | Not expected for this repo. If it appears, ask engineering—this project has no private npm packages. |

### 3. Start dev server

Run in the **background** so the user can keep chatting:

```bash
bun run dev
```

Wait until output shows the app is ready (e.g. `Ready`, `localhost:3000`, or Next.js started).

If port 3000 is busy, report the port from the log (often **3002**)—do not kill arbitrary processes without user consent.

### 4. Tell the user what to open

Default URLs (local preview only):

| Screen | URL |
|--------|-----|
| Home | http://localhost:3000/ |
| Requests | http://localhost:3000/requests |
| Planner | http://localhost:3000/planner |
| My Rides | http://localhost:3000/my-rides |
| Options | http://localhost:3000/options |
| Incentives | http://localhost:3000/incentives |
| Ride history | http://localhost:3000/ride-history |

Use the port from the terminal if not 3000.

Remind them:

- Mock data only—no live backend; `.env` usually not required.
- This is **not** the production driver app—only on their Mac.
- **Deployed preview:** https://prototype-driver-app.vercel.app/
- **Stop server:** focus the terminal running dev and press `Ctrl+C`, or stop the background job in Cursor.

### 5. After /prep-my-day

If `package.json` or `bun.lock` changed recently, **always** run `bun install` before `bun run dev`.

## Anti-patterns

- Running `npm install` / `pnpm install` unless user explicitly wants a different package manager.
- Printing `.env` or tokens in the terminal output to the user in chat.
- Running deploy scripts for a “preview” request.
- Starting multiple dev servers without noting port conflicts.
- Using `node_modules` copied from a zip without `bun install`.

## When to suggest something else

| User intent | Suggest |
|-------------|---------|
| Get latest code on current branch | **/prep-my-day** |
| Save prototype work | **smart-commit** |
| Sync with `main` / fix PR conflicts | Engineering or **smart-rebase** (not default for non-dev) |
| Production/staging deploy | Vercel auto-deploy from `main`; settings issues → engineering |

## More examples

See [examples.md](examples.md).
