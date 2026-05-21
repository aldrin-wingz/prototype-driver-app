# /prep-my-day — examples (prototype-driver-app)

## Example A: Start of day on a prototype branch

User on `pm/incentives-copy`, has no uncommitted changes.

```bash
git status
git fetch --all --prune
git pull
git status
```

**Tell user:** “Your branch `pm/incentives-copy` is up to date with GitHub. Run **/start-working** to open the preview.”

---

## Example B: Pull brought new commits

After `git pull`:

```text
Updating abc1234..def5678
Fast-forward
 lib/data/incentives.ts | 12 +++----
```

**Tell user:** “GitHub had updates on your branch. Data files changed—run **/start-working** in case dependencies changed too.”

---

## Example C: Uncommitted work — ask first

`git status` shows modified files.

**Do not pull blindly.** Tell user:

```text
You have uncommitted changes. Options:
1) smart-commit first, then /prep-my-day
2) stash (I can stash, pull, then restore)—only if you want
3) discard local changes—only if you're sure
```

---

## Example D: User said “get latest” but meant main

User: “Get the latest from main.”

**Clarify:** Prep-my-day only updates **your current branch**. To put `main`’s changes into a feature branch, that’s **rebase/merge** (engineering or **smart-rebase**). Do not silently rebase.

---

## Example E: Merge conflict on pull

**Stop.** Message user: ask engineering; do not auto-merge for non-dev prototype flows.
