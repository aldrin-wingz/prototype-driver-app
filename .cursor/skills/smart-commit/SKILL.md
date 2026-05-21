---
name: smart-commit
description: >-
  Smart-commit: split staged or unstaged changes into logical, reviewable git
  commits with conventional messages and dependency-safe order. Use when the
  user asks for smart-commit, smart commits, meaningful commits, commit
  separation, split staged files, or organizing commits for a PR.
---

# Smart-commit (prototype-driver-app)

**Smart-commit** turns a large diff into **small, reviewable commits**—one concern per commit, ordered so each step stays coherent and revertible.

## Preconditions

- **Only commit when the user asks** (or their rule explicitly allows it). If unclear, ask first.
- Never change git config; never `--no-verify` unless asked; never force-push `main`.
- Use **HEREDOC** for commit messages (see below).
- Do not commit secrets (`.env`, credentials).

## What the user should provide

- Scope: all staged files, whole working tree, or named paths
- Base branch context (optional): e.g. “smart-commit for PR against `main`”
- Preference: fewer larger commits vs. more granular (default: **granular but buildable**)

## Smart-commit workflow

Copy and track progress:

```
Smart-commit progress:
- [ ] Inspect full diff (staged + unstaged)
- [ ] Plan commit groups and order (dependencies first)
- [ ] Unstage everything (`git reset HEAD`)
- [ ] Smart-commit group 1 … N (add paths → commit → repeat)
- [ ] `git status` clean; `git log --oneline` matches plan
- [ ] Optional: `bun run build` on touched areas
```

### 1. Inspect before splitting

Run in parallel:

```bash
git status
git diff --cached --stat    # if anything staged
git diff --stat             # unstaged
git log -8 --oneline        # match repo message style
```

Read enough of the diff to label **themes** (data, driver UI, incentives page, docs). Skim imports: later commits must not depend on files not committed yet.

### 2. Plan groups (rules)

| Rule | Guidance |
|------|----------|
| **One concern** | Each commit answers one review question (“what broke if I revert this?”). |
| **Dependency order** | Mock data / types → utils → components → pages → docs. |
| **Feature vertical slice** | `lib/data/*` → driver components → `app/*` route |
| **Avoid drive-by** | Unrelated refactors stay out of feature commits. |
| **Planning docs** | `PROTOTYPE-BIBLE.md` / `PROTOTYPE-TRACKER.md` in dedicated `docs:` or `chore:` commits when changed |

**Typical prototype-driver-app layers** (use only what applies):

1. `chore(deps)` — `package.json`, `bun.lock`
2. `feat(data)` / `fix(data)` — `lib/data/incentives.ts`, `incentive-utils.ts`, `past-outcomes.ts`
3. `feat(driver)` — `components/driver/*`
4. `feat(incentives)` — `app/incentives/*`, rides view
5. `feat(requests)` / `fix(requests)` — `app/requests/*` (keep Suspense wrapper if touching page)
6. `docs` — `PROTOTYPE-*.md`, `docs/*`
7. `chore(cursor)` — `.cursor/skills/*` (only when user wants skills in repo)

### 3. Unstage and smart-commit in order

```bash
git reset HEAD   # unstage all; working tree keeps changes
```

Per planned group:

```bash
git add <paths>   # or git add -p <file> for partial
git commit -m "$(cat <<'EOF'
<type>(<scope>): short imperative summary

Optional body: why, not a file list.
EOF
)"
```

After the last group:

```bash
git status
git log --oneline -15
```

### 4. Commit message format

Match recent history on this repo (e.g. `App-MVP-2 ✅ …` or conventional):

- **Type**: `feat`, `fix`, `refactor`, `chore`, `docs`
- **Scope**: `incentives`, `driver`, `data`, `requests`
- **Subject**: imperative, ≤72 chars; **body** explains why when non-obvious.
- Do **not** amend unless user rules allow and HEAD is yours unpushed.

### 5. Verify

```bash
bun run build
```

## When to combine vs. split

| Situation | Prefer |
|-----------|--------|
| Data + UI for one incentive feature | 2 commits: data → UI |
| Multiple unrelated pages | Separate commits per page/flow |
| `.cursor/skills` + app code | Separate `chore(cursor)` commit |

## When to suggest something else

| User intent | Suggest |
|-------------|---------|
| Get latest on current branch | **/prep-my-day** |
| Run / preview the app | **/start-working** |
| Rebase onto main / fix PR vs main | **smart-rebase** or engineering (not default for non-dev) |

## Anti-patterns

- One commit titled “WIP” or “misc updates” with 30 files.
- Committing UI before data/types it imports.
- Amending after a failed hook—**new commit** instead.
- Creating commits without user request.
- Committing `.env`, `.vercel`, `node_modules`.

## More examples

See [examples.md](examples.md).
