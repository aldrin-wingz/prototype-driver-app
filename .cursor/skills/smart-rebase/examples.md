# Smart rebase — examples (prototype-driver-app)

**Default base:** `origin/main` (not `develop`).

## Example A: Feature branch behind main

User on `pm/incentives-tweaks`, main has Vercel/Suspense fixes.

```bash
git fetch origin main
git rebase origin/main
```

If `app/requests/page.tsx` conflicts:

- **Keep** the `Suspense` wrapper from `main` (required for Vercel build).
- Merge in the user’s filter/UI changes from the feature branch inside `RequestsPageContent`.

```bash
git add app/requests/page.tsx
git rebase --continue
bun run build
git push --force-with-lease origin pm/incentives-tweaks
```

---

## Example B: Non-dev — do not rebase

User: “GitHub says my branch has conflicts.”

**Tell user:** Ask engineering, or confirm they want **smart-rebase** explicitly. Default for PMs: **/prep-my-day** only updates their branch from remote, not merge `main` in.

---

## Example C: Rebase onto a specific commit

User: `smart-rebase base=339efa8`

```bash
git fetch origin
git rebase 339efa8
```

Use when they name a known good commit on `main`.
