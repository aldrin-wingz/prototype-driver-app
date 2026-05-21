---
name: prep-my-day
description: >-
  Start-of-day: git fetch --all and pull the current branch only (no rebase
  onto main). Use for /prep-my-day, prep-my-day, prep my day, sync my
  branch, git pull, get latest code, update from GitHub, or legacy day-sync /
  smart-sync—especially non-dev prototypers who should not rebase without
  engineering.
---

# /prep-my-day (prototype-driver-app)

**Prep my day** updates **the branch you are already on** with the latest from GitHub. It does **not** rebase onto `main` and does **not** rewrite history.

Use at the start of a prototyping day, before **/start-working**. For **rebase onto `main`** or PR conflicts with `main`, engineering should help—or the user must explicitly ask for **smart-rebase**.

## Preconditions

- **Do not** change git config.
- **Do not** `git push --force` to `main`.
- **Do not** run `git rebase`, `git merge main`, or **smart-rebase** unless the user **explicitly** asks to rebase.
- If `git pull` fails with conflicts, **stop** and tell the user to ask engineering (do not auto-resolve for non-dev flows).

## What the user should provide

- Optional: branch name (default: stay on current branch)
- Optional: remote name (default: `origin`)

## Prep-my-day workflow

Copy and track progress:

```
Prep-my-day progress:
- [ ] Confirm current branch and clean enough state to pull
- [ ] git fetch --all
- [ ] git pull on current branch
- [ ] Report status and what changed
```

### 1. Inspect before syncing

```bash
git status
git branch --show-current
```

| Situation | Action |
|-----------|--------|
| Uncommitted changes user cares about | Warn; offer to **stash** only if user agrees, then pull, then stash pop—or ask them to **smart-commit** first |
| Detached HEAD / no branch | Stop; ask user or engineering which branch to check out |
| On `main` | OK for small teams; warn that shared `main` affects everyone—prefer `pm/...` branches for day-to-day work |

### 2. Fetch everything

```bash
git fetch --all --prune
```

This downloads new commits from GitHub **without** changing local files yet.

### 3. Pull current branch only

```bash
git pull
```

If the branch has no upstream set:

```bash
git branch -vv   # see tracking
# If needed and user confirmed:
git pull origin $(git branch --show-current)
```

**Do not** run:

- `git pull --rebase` (unless user explicitly asked for rebase behavior)
- `git rebase origin/main`
- `git merge origin/main`

Those are **smart-rebase** / engineering tasks.

### 4. Report results

```bash
git status
git log -3 --oneline
```

Tell the user in plain language:

- Which branch was updated
- Whether pull was already up to date or brought new commits
- Reminder to run **/start-working** if dependencies may have changed (`package.json` / lockfile changed on pull)

### 5. If pull fails

| Error | Action |
|-------|--------|
| **Merge conflict** | Stop. Do not resolve unless user is an engineer or explicitly asked. Tell them to ask engineering or use **smart-rebase** only if they insist. |
| **Divergent branches** | Stop. Explain local and remote both have different commits; engineering should help. Do not force-pull. |
| **Authentication failed** | GitHub SSH setup—same as `wingz-driver-portal`; ask engineering. |
| **No tracking information** | Set upstream only if user confirms: `git branch -u origin/<branch>` then pull again. |

## Anti-patterns

- Rebasing onto `main` during a routine “get latest” request.
- Force-pushing after a failed pull.
- Discarding uncommitted prototype work without asking.
- Running prep-my-day with no network without telling the user.

## When to suggest something else

| User intent | Suggest |
|-------------|---------|
| “Catch up with main” / PR conflicts with main | **smart-rebase** or ask engineering |
| “Save my work” | **smart-commit** |
| “Run the app” | **/start-working** |
| “Start new feature branch from main” | Checkout `main`, /prep-my-day, `git checkout -b pm/...` (user or eng confirms name) |

## More examples

See [examples.md](examples.md).
