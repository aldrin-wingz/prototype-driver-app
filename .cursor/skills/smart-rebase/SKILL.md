---
name: smart-rebase
description: >-
  Rebase a feature branch onto a target base branch (default main), resolve
  merge conflicts with AI, and finish the rebase safely. Use for /smart-rebase,
  when the user asks to rebase onto main, passes base=<branch>, fix
  rebase conflicts, update a branch with latest main, or mentions conflict
  markers (<<<<<<<) during a rebase.
---

# Smart rebase (prototype-driver-app)

Guide for rebasing `pm/*` or `feature/*` branches onto a **base branch** (default: `main`) and resolving conflicts without losing either side’s intent.

**Non-dev / PM prototypers:** Prefer **/prep-my-day** (fetch + pull on the current branch only). Use **smart-rebase** only when the user is an engineer or explicitly asks to rebase onto `main`. If a non-dev reports PR conflicts, suggest asking engineering instead of auto-rebasing.

## Parameters (optional)

| Parameter | Default | Examples |
|-----------|---------|----------|
| `base=<ref>` | `main` | `base=main`, `base=origin/main` |

**Resolve `base` before any git commands:**

1. If the user omits `base`, use `main`.
2. If `base` is a short branch name (`main`), use `origin/main` for fetch/rebase unless they already passed `origin/...`.
3. If `base` is a commit SHA (7+ hex chars), rebase onto that commit directly.

## Workflow

```
Rebase progress:
- [ ] Resolve base (default: origin/main)
- [ ] Fetch latest base
- [ ] Start rebase
- [ ] Resolve each conflicted file
- [ ] git add + rebase --continue (repeat until done)
- [ ] Verify bun run build
- [ ] Tell user about force-push if branch was published
```

### 1. Fetch and start

```bash
git fetch origin main
git status   # note branch; abort in-progress rebase if user wants a clean retry
git rebase origin/main
```

**Git safety (required):**

- Never change git config.
- Never `git push --force` to `main`.
- Warn before `git push --force-with-lease` on a shared branch.

### 2. Resolve conflicts

For each conflicted file:

- Read both sides; preserve prototype intent from the feature branch unless `main` has a deliberate fix (e.g. Suspense on `/requests`, `next.config.mjs`).
- Remove all `<<<<<<<`, `=======`, `>>>>>>>` markers.
- `git add <file>` then `git rebase --continue`.

### 3. Verify

```bash
bun run build
```

### 4. Finish

If the branch was already pushed:

```bash
git push --force-with-lease
```

Tell the user why force-with-lease was needed.

## Anti-patterns

- Auto-rebasing for a user who only asked to “get latest” (use **/prep-my-day**).
- Force-pushing `main`.
- Leaving conflict markers in files.

## More examples

See [examples.md](examples.md).
