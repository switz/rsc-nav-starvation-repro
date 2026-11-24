'use client';
import { useEffect, useSyncExternalStore } from 'react';
let frame = 0;
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => (listeners.add(l), () => { listeners.delete(l); });
export function Ticker() {
  const v = useSyncExternalStore(subscribe, () => frame, () => 0);
  useEffect(() => {
    if (new URLSearchParams(location.search).has('still')) return;
    let raf = 0;
    const tick = () => { frame++; listeners.forEach((l) => l()); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return <p id="ticker">frame {v}</p>;
}
