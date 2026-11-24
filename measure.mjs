// Click -> commit timing for a Next.js app with a per-frame uSES ticker.
import { chromium } from '@playwright/test';
const BASE = 'http://localhost:3911';

const watch = () => {
  const w = window;
  w.__t = {};
  new MutationObserver(() => {
    const now = performance.now();
    if (!w.__t.loading && document.getElementById('loading')) w.__t.loading = now;
    if (!w.__t.dest && document.getElementById('dest')) w.__t.dest = now;
  }).observe(document.body, { childList: true, subtree: true });
};

async function run(browser, { search, link, forward }) {
  const page = await browser.newPage();
  await page.goto(`${BASE}/${search}`);
  await page.waitForTimeout(1500); // hydrate + let <Link> prefetch finish
  if (forward) {
    await page.click(`#${link}`);
    await page.waitForSelector('#dest', { timeout: 15000 });
    await page.goBack();
    await page.waitForSelector('#home');
    await page.waitForTimeout(500);
  }
  await page.evaluate(watch);
  await page.evaluate(() => (window.__t.start = performance.now()));
  if (forward) await page.evaluate(() => history.forward());
  else await page.click(`#${link}`);
  await page.waitForSelector('#dest', { timeout: 15000 });
  const t = await page.evaluate(() => window.__t);
  await page.close();
  return {
    dest: Math.round(t.dest - t.start),
    loading: t.loading ? Math.round(t.loading - t.start) : null,
  };
}

const browser = await chromium.launch();
const cases = [
  ['ticker off, <Link>', { search: '?still', link: 'to-heavy' }],
  ['ticker on,  <Link>', { search: '', link: 'to-heavy' }],
  ['ticker on,  <Link> + loading.tsx', { search: '', link: 'to-heavy-loading' }],
  ['ticker on,  cached forward', { search: '', link: 'to-heavy', forward: true }],
];
for (const [name, c] of cases) {
  const runs = [];
  for (let i = 0; i < 3; i++) runs.push(await run(browser, c));
  console.log(
    name.padEnd(36),
    'commit ms:', runs.map((r) => r.dest).join(', ').padEnd(18),
    runs[0].loading !== null ? `skeleton ms: ${runs.map((r) => r.loading).join(', ')}` : ''
  );
}
await browser.close();
