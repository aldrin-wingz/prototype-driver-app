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

Read enough of the diff to label **themes** (data, driver UI, incentives page, wallet/payouts, docs). Skim imports: later commits must not depend on files not committed yet.

### 2. Plan groups (rules)

| Rule | Guidance |
|------|----------|
| **One concern** | Each commit answers one review question (“what broke if I revert this?”). |
| **Dependency order** | Mock data / types → utils → components → pages → docs. |
| **Feature vertical slice** | `lib/data/*` → driver components → `app/*` route |
| **Avoid drive-by** | Unrelated refactors stay out of feature commits. |
| **Planning docs** | `PROTOTYPE-BIBLE.md` / `PROTOTYPE-TRACKER.md` in dedicated `docs:` or `chore:` commits when changed |
| **Same file, two concerns** | Use `git add -p <file>` or note combined concerns in the message body. |

**Typical prototype-driver-app layers** (use only what applies):

1. `feat(data)` / `fix(data)` — `lib/data/*`, `lib/driver-data/*`
2. `feat(driver)` — shared `components/driver/*` (cards, sheets, pills)
3. `feat(incentives)` — `/incentives` pages + rides view
4. `feat(wallet)` / `feat(payouts)` — wallet card, `/wallet`, `/weekly-earnings`, `/payouts`, `/earnings-activity`
5. `feat(rides)` — ride card / ride detail / my-rides / requests
6. `docs:` — `PROTOTYPE-*`, `docs/NON_DEV_PROTOTYPING_GUIDE.MD`, `.cursor/skills/**`
7. `chore:` — `package.json`, `next.config.mjs`, Vercel-related build fixes

### 3. Unstage and smart-commit in order

```bash
git reset HEAD   # unstage all; working tree keeps changes
```

Per planned group:

```bash
git add <paths>   # or git add -p <file> for partial
git commit -m "$(cat <<'EOF'
<type>(<scope>): short imperative summary

Optional body: why, not a file list. Note combined concerns if one
file spans topics.
EOF
)"
```

After the last group:

```bash
git status
git log --oneline -15
```

### 4. Commit message format

- **Type**: `feat`, `fix`, `refactor`, `chore`, `docs`, `test` (match recent history on the branch).
- **Scope**: area (`data`, `driver`, `incentives`, `wallet`, `payouts`, `rides`).
- **Subject**: imperative, ≤72 chars; **body** explains why when non-obvious.
- Do **not** amend unless user rules allow and HEAD is yours unpushed.

### 5. Verify

Run what the commits touched:

```bash
bun run build
```

## When to combine vs. split

| Situation | Prefer |
|-----------|--------|
| New wallet data + WalletCard + Home mount | 2–3 commits: data → component → page |
| Tracker + bible only | One `docs:` commit |
| Suspense / build fix + unrelated UI | Split — keep build fix alone |
| 10 files all “rename RIDES label” | One `refactor(driver)` commit |

## When to suggest something else

| User intent | Suggest |
|-------------|---------|
| Get latest on current branch | **/prep-my-day** |
| Run / preview the app | **/start-working** |
| Rebase onto main / fix PR vs main | **smart-rebase** or engineering (not default for non-dev) |

## Anti-patterns

- One commit titled “WIP” or “misc updates” with 30 files.
- Committing UI before mock data / helpers it imports.
- Splitting only by directory (`app/` vs `components/`) when themes cross folders.
- Amending after a failed hook—**new commit** instead.
- Creating commits without user request.
- Committing `node_modules`, `.next`, or `.env`.

## More examples

See [examples.md](examples.md).
