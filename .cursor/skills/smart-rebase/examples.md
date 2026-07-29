# Smart-rebase — examples (prototype-driver-app)

## Default: rebase onto main

User: “/smart-rebase” or “rebase onto main”

```bash
git fetch origin main
git rebase origin/main
# resolve conflicts if any
bun run build
git push --force-with-lease origin <branch>   # only if branch was already pushed
```

## Non-dev said “get latest” only

Do **not** rebase. Run **/prep-my-day** instead (`git pull` on current branch).

If their PR shows conflicts with `main`, tell them to ask engineering—or only run smart-rebase if they explicitly ask.

## Conflict: Suspense on requests vs PM UI edit

- Keep `Suspense` wrapper from `main` (needed for Vercel/`useSearchParams`).
- Keep PM copy/layout changes from the feature branch.
- Merge both; never drop Suspense just to keep a UI tweak.

## Conflict: Home page — WalletCard vs incentives section

- Keep `WalletCard` mount if the feature is wallet work.
- Keep incentive carousel / section changes from the other side if still valid.
- Ensure imports for both exist.

## After rebase

Plain language for the PM:

- “Your branch was replayed on top of latest `main`.”
- “If this branch was already on GitHub, we need a special push (`--force-with-lease`)—ask before doing it if you’re unsure.”
