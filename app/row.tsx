'use client';
export function Row({ i }: { i: number }) {
  const end = performance.now() + 0.15;
  while (performance.now() < end) {}
  return <li>Track {i + 1}</li>;
}
