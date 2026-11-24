# Navigation starvation under a per-frame store (Next.js repro)

A `<Link>` into an expensive page commits about **5 s** after the click while a
`useSyncExternalStore` store emits every animation frame, against ~150 ms
without it.

Each store emit is a SyncLane update. react-dom discards the in-progress
transition render to handle it (`prepareFreshStack`) and restarts from the
root instead of resuming. A destination that takes longer than one frame to
render never finishes, and commits only when React expires the transition
lane: `transitionLaneExpirationMs = 5000` in
`packages/shared/ReactFeatureFlags.js`, applied by `computeExpirationTime` in
`packages/react-reconciler/src/ReactFiberLane.js`.

## The app

- `app/ticker.tsx`: a store that emits every `requestAnimationFrame`, read
  with `useSyncExternalStore`. Add `?still` to the URL to stop it.
- `app/layout.tsx`: renders the ticker above every page, like a media
  player's scrubber.
- `app/row.tsx`: a client row with a fixed 0.15 ms render cost.
- `app/heavy/page.tsx`: 400 rows, so ~60 ms of render work, more than a frame.
- `app/heavy-loading/`: the same page with a `loading.tsx`.

## Run

```bash
npm install
npx playwright install chromium   # if Playwright has no browser yet
npm run build
npm run start &
npm run measure
```

`NODE_ENV=production` is set in the scripts because `next build` fails when
the shell exports `NODE_ENV=development`.

## Results (Chromium, Next 16.4.6, React 19.3.1, three runs each)

| Case | click → commit |
|---|---|
| ticker off, `<Link>` | 137–166 ms |
| ticker on, `<Link>` | 5126–5132 ms |
| ticker on, `<Link>` + `loading.tsx` | 5129–5141 ms (the page was prefetched, so the skeleton never showed) |
| ticker on, cached forward | 86–89 ms |

Cached back/forward escapes because Next restores it from its `popstate`
handler, and React renders a transition started during a `popstate` event
synchronously (`shouldAttemptEagerTransition` in react-dom).

## `react-standalone-repro.md`

A draft upstream report with a framework-free HTML repro. The HTML has not
been run.
