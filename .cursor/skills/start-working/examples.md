# /start-working — examples (prototype-driver-app)

## Happy path

User: “start working” / “/start-working”

1. Confirm repo root (`package.json` present)
2. `bun install`
3. `bun run dev` in background
4. Share Home URL + note wallet/incentives screens if relevant
5. Remind how to stop (`Ctrl+C`)

## Port already in use

Dev log shows `Local: http://localhost:3002`.

Tell the user to open **3002**, not 3000. Do not kill other apps unless they ask.

## Broken zip / SWC error

```bash
rm -rf node_modules .next
bun install
bun run dev
```

Explain: never copy `node_modules` from a zip—always reinstall on their Mac.

## After prep-my-day changed lockfile

Always run `bun install` before `bun run dev` when `package.json` or `bun.lock` changed on pull.

## User only wants preview (skip install)

If `node_modules` exists and they asked to skip install, start `bun run dev` only. If it fails missing modules, run install then retry.
