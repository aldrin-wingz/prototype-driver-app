# /start-working — examples (prototype-driver-app)

## Example A: Typical non-dev morning

User: “/start-working” or “start working”

```bash
cd /path/to/prototype-driver-app
bun install
bun run dev   # background
```

**Tell user:**

```text
Dev server is starting. When it's ready, open http://localhost:3000/ (Home).
Other screens: /incentives, /requests, /my-rides — see docs/NON_DEV_PROTOTYPING_GUIDE.MD.
Press Ctrl+C in the terminal to stop.
Deployed preview: https://prototype-driver-app.vercel.app/
```

---

## Example B: Zip import — broken SWC

User copied project from zip; dev fails with `turbo.createProject` or code signature error.

```bash
rm -rf node_modules .next
bun install
bun run dev
```

**Tell user:** “Dependencies were reinstalled—don't copy node_modules from zips.”

---

## Example C: After /prep-my-day changed lockfile

```bash
bun install
bun run dev
```

**Tell user:** “Dependencies updated after your pull—I reinstalled and restarted the preview.”

---

## Example D: Dev already running

**Tell user:** “A dev server may already be running—try http://localhost:3000/ first (or the port in the terminal). To restart, stop the old server (Ctrl+C) and run **/start-working** again.”

---

## Example E: Install only

User: “start-working install only”

```bash
bun install
```

Skip `bun run dev` unless they ask to start the server.
