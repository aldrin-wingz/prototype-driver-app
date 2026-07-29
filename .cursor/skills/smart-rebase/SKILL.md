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

Parse from the user message or `/smart-rebase`:

| Parameter | Default | Examples |
|-----------|---------|----------|
| `base=<ref>` | `main` | `base=main`, `base=origin/main`, `base=92d66a77` |

**Resolve `base` before any git commands:**

1. If the user omits `base`, use `main`.
2. If `base` is a short branch name (`main`), use `origin/<name>` for fetch/rebase unless they already passed `origin/...`.
3. If `base` is a full ref (`origin/main`), use it as-is.
4. If `base` looks like a commit SHA (7+ hex chars), rebase onto that commit directly (still `git fetch` when possible).

**Examples:**

- `/smart-rebase` → `BASE=origin/main`
- `/smart-rebase base=main` → `BASE=origin/main`
- `Rebase onto 92d66a77` → `BASE=92d66a77`

Optional extras (no flag required): conflict file path(s), current branch name if unclear.

## Workflow

Copy and track progress:

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

After resolving `BASE` (see Parameters):

```bash
# If BASE is origin/<branch>:
git fetch origin <branch>

git status   # note branch; abort in-progress rebase if user wants a clean retry
git rebase <BASE>
```

Examples:

```bash
# default
git fetch origin main && git rebase origin/main

# base=92d66a77…
git rebase 92d66a770966e1e38d29aed547c1b3045fc98c27
```

**Git safety (required):**

- Do **not** change git config.
- Do **not** run `git push --force` to `main`.
- Do **not** use `--no-verify` unless the user explicitly asks.
- Prefer `git push --force-with-lease` over `--force` when updating a rebased remote branch.
- Only create commits when finishing conflict resolution via `git rebase --continue` (no extra commits mid-rebase unless user asks).

### 2. Find conflicts

```bash
git status
git diff --name-only --diff-filter=U
```

Search conflict markers in the repo:

```bash
rg '^<<<<<<<|^=======|^>>>>>>>' .
```

Read each conflicted region with enough context (imports, hooks, JSX siblings).

### 3. Resolve conflicts

**Default rule: merge both sides when they add different behavior.**

| Side | Typical meaning during rebase |
|------|-------------------------------|
| `HEAD` | Code already on the base branch (`main`) |
| Incoming (`>>>>>>> commit`) | Your branch’s commit being replayed |

Common patterns in this repo:

- **`main`** may have build/Suspense fixes (`app/requests/page.tsx`), `next.config.mjs`, or package bumps.
- **Feature / PM branch** may have wallet UI, incentive copy, mock data, or layout tweaks.

**Do not** pick only one side if both changes are still needed. Combine into one block.

Preserve prototype intent from the feature branch unless `main` has a deliberate fix (e.g. Suspense on `/requests`, Next config for Vercel).

### 4. Continue the rebase

After each file is clean (no conflict markers):

```bash
git add <resolved-files>
GIT_EDITOR=true git rebase --continue
```

Repeat until `Successfully rebased`. If a commit is empty or redundant, use `git rebase --skip` only when sure it adds nothing.

### 5. Verify

```bash
git log --oneline -8
git status
bun run build
```

### 6. Update remote

If the branch was pushed before:

```bash
git push --force-with-lease origin <branch>
```

Warn the user that history was rewritten and teammates must reset their local branch if they had checked it out.

## Conflict resolution checklist

For each `<<<<<<<` block:

1. Read **HEAD** and **incoming** hunks; list what each side adds or removes.
2. Decide: merge both, keep one (only if the other is truly obsolete), or rewrite.
3. Remove all markers (`<<<<<<<`, `=======`, `>>>>>>>`).
4. Ensure imports exist for any symbols you keep.
5. Match closing tags and element names — read the file, do not assume.
6. Re-read the surrounding function/component for duplicate hooks or dead code.

## Anti-patterns

- Auto-rebasing for a user who only asked to “get latest” (use **/prep-my-day**).
- Replacing conflict blocks with only base or only feature without reading both.
- Leaving conflict markers in the file.
- Amending or creating unrelated commits during an active rebase.
- Force-pushing `main`.

## When rebase is the wrong tool

Suggest **merge** `<BASE>` into the branch instead if:

- The branch is shared and others are actively committing on it.
- The user wants to preserve exact merge commit history on the remote.

## More examples

See [examples.md](examples.md).
