# /prep-my-day — examples (prototype-driver-app)

## Happy path

User: “prep my day” / “/prep-my-day”

1. `git status` + current branch (`pm/wallet-copy` or similar)
2. `git fetch --all --prune`
3. `git pull`
4. Report: “You’re on `pm/wallet-copy`. Pulled 2 commits from GitHub.” or “Already up to date.”
5. Suggest **/start-working** next.

## Uncommitted work

User has local edits.

1. Warn: pull may conflict or mix with uncommitted work.
2. Offer: **smart-commit** first, or stash → pull → stash pop (only if they agree).
3. Do not discard their prototype work.

## They said “get latest develop / main into my branch”

That is **not** prep-my-day alone. Explain:

- **/prep-my-day** = update the branch you’re on with its own remote.
- Catching up with shared `main` = **smart-rebase** or ask engineering.

## Pull conflict

Stop. Plain language: “Git couldn’t combine your branch with GitHub. Ask engineering—don’t guess.”
