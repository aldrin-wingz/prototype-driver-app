# Smart-commit — examples (prototype-driver-app)

## Example A: Incentive data + UI (2–3 commits)

User changed mock incentives and dashboard cards.

| Order | Message |
|-------|---------|
| 1 | `feat(data): update incentive seed and progress helpers` — `lib/data/incentives.ts`, `incentive-utils.ts` |
| 2 | `feat(driver): refresh dashboard incentive section layout` — `components/driver/dashboard-incentive-section.tsx` |
| 3 | `docs: sync PROTOTYPE-TRACKER for App-MVP-2` — planning docs only |

**Why:** data helpers before components that read them.

---

## Example B: New rides view route

| Order | Message |
|-------|---------|
| 1 | `feat(incentives): add past-outcomes helper` — `lib/data/past-outcomes.ts` |
| 2 | `feat(incentives): add per-incentive rides view` — `components/driver/incentive-rides-view.tsx`, `app/incentives/[id]/rides/page.tsx` |
| 3 | `feat(incentives): redesign incentives list page` — `app/incentives/page.tsx` |

---

## Example C: Vercel / config fix (keep separate from UI)

| Order | Message |
|-------|---------|
| 1 | `fix(requests): wrap useSearchParams in Suspense for Vercel build` — `app/requests/page.tsx` only |
| 2 | `chore: align package.json and next.config with production build` — `package.json`, `next.config.mjs` |

Do not mix Suspense fix with unrelated UI tweaks.

---

## Example D: Cursor skills + guide

| Order | Message |
|-------|---------|
| 1 | `docs: add non-dev prototyping guide and Cursor skills` — `docs/NON_DEV_PROTOTYPING_GUIDE.MD`, `.cursor/skills/**` |

---

## Quick checklist before each smart-commit

- [ ] This commit could be reverted without breaking the next commit’s build
- [ ] Message matches repo style
- [ ] No secrets, no `node_modules`, no `.vercel`
- [ ] User asked for commits (or rule allows)
