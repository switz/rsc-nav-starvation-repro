# Draft — React issue: a transition is restarted from scratch by every urgent update, so a per-frame `useSyncExternalStore` store starves it until the 5 s expiry

**React version:** 19.3.1 (react-dom/client)

## Summary

A transition render that takes longer than one frame never completes while a `useSyncExternalStore` store emits every `requestAnimationFrame`. Each store emit is a SyncLane update; `renderRootConcurrent`/`renderRootSync` see different lanes and call `prepareFreshStack`, discarding the transition's work in progress. After the sync commit the transition starts over from the root. It commits only when `computeExpirationTime` (transition lanes: `currentTime + 5000`) marks the lane expired and it renders synchronously.

The result is a ~5 s delay on any expensive transition (router navigations in particular) in any app with a 60 fps store: media players, timers, cursors, scroll-linked state. Nothing in DevTools explains it apart from a run of "Interrupted Render" blocks on the Scheduler track.

## Repro (no framework)

```html
<!doctype html>
<div id="root"></div>
<script type="module">
  import React, { useSyncExternalStore, startTransition, useState } from 'https://esm.sh/react@19.3.1';
  import { createRoot } from 'https://esm.sh/react-dom@19.3.1/client';
  const h = React.createElement;

  // A store that emits every frame.
  let frame = 0;
  const listeners = new Set();
  (function tick() { frame++; listeners.forEach((l) => l()); requestAnimationFrame(tick); })();
  const subscribe = (l) => (listeners.add(l), () => listeners.delete(l));

  function Ticker() {
    return h('p', null, 'frame ', useSyncExternalStore(subscribe, () => frame));
  }

  // ~60 ms of render work: never fits between two frames.
  function Row({ i }) {
    const end = performance.now() + 0.15;
    while (performance.now() < end);
    return h('li', null, 'Row ', i);
  }
  const Heavy = () => h('ol', null, Array.from({ length: 400 }, (_, i) => h(Row, { key: i, i })));

  function App() {
    const [show, setShow] = useState(false);
    return h('div', null,
      h(Ticker),
      h('button', {
        onClick: () => {
          const t0 = performance.now();
          window.__t0 = t0;
          startTransition(() => setShow(true));
        },
      }, 'Show heavy list'),
      show && h(Committed),
      show && h(Heavy));
  }
  function Committed() {
    React.useLayoutEffect(() => {
      document.title = `committed after ${Math.round(performance.now() - window.__t0)} ms`;
    }, []);
    return null;
  }
  createRoot(document.getElementById('root')).render(h(App));
</script>
```

Click the button. The title reads ~5000 ms. Comment out `h(Ticker)` and it reads ~60–100 ms.

## Expected

Some way for an interrupted transition to make progress: resume the work-in-progress tree when the interrupting update didn't touch it (here the ticker is a sibling, and nothing above `Heavy` changed), or stop urgent updates from starving a transition past a frame budget well before 5 s. Failing that, an API to raise a pending transition's priority once the caller knows its data is complete.

## Notes

- `enableSiblingPrerendering` doesn't apply: the transition isn't suspended.
- Rendering the transition into a separate root doesn't help, since `workInProgressRoot` is global.
- Re-rendering at DefaultLane avoids the starvation, but loses transition semantics: already-visible boundaries reveal fallbacks.
