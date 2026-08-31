import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/*
 * Every page loads, says who it is, and links to pages that exist.
 *
 * The pages are read off disk rather than listed here, so a new .html file is
 * covered the moment it is added -- the same way server.js builds its own
 * allowlist from readdirSync.
 */
const ROOT = path.resolve(import.meta.dirname, '..');
const PAGES = fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).sort();

test('there are pages to test', () => {
  // A floor, so a glob that silently matched nothing cannot report success.
  expect(PAGES.length).toBeGreaterThanOrEqual(5);
});

for (const page_ of PAGES) {
  test.describe(page_, () => {
    test('loads, titles itself, and renders a single h1', async ({ page }) => {
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

      const response = await page.goto(`/${page_}`);
      expect(response?.status()).toBe(200);

      // Every page is a distinct marketing page; a shared or empty title is a
      // copy-paste slip that also costs search ranking.
      await expect(page).toHaveTitle(/MyFy Premier/);

      // Exactly one h1 -- the document outline is the first thing a screen
      // reader announces, and duplicates are the usual regression.
      await expect(page.locator('h1')).toHaveCount(1);

      expect(errors, `console/page errors on /${page_}`).toEqual([]);
    });

    test('every internal link resolves', async ({ page, request }) => {
      await page.goto(`/${page_}`);

      const hrefs = await page.locator('a[href]').evaluateAll(anchors =>
        anchors.map(a => a.getAttribute('href'))
      );

      /*
       * Only same-site page links. External hosts, mailto:, tel: and #anchors
       * are somebody else's uptime or not a request at all -- checking them
       * would make this suite fail for reasons that have nothing to do with
       * this repo.
       */
      const internal = [...new Set(hrefs.filter(h =>
        h && !/^(https?:)?\/\//.test(h) && !h.startsWith('#') &&
        !h.startsWith('mailto:') && !h.startsWith('tel:')
      ))];

      expect(internal.length, `no internal links found on /${page_}`).toBeGreaterThan(0);

      const broken = [];
      for (const href of internal) {
        const response = await request.get(new URL(href, `${page.url()}`).toString());
        if (response.status() !== 200) broken.push(`${href} -> ${response.status()}`);
      }

      expect(broken, `broken links on /${page_}`).toEqual([]);
    });
  });
}

test('the home page is served at /', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Luxury RV & Yacht Loans/);
});

test('extensionless links resolve to their .html page', async ({ page }) => {
  // server.js tolerates /yacht-financing even though the markup and sitemap
  // both use the explicit .html. Worth pinning: it is a deliberate kindness
  // that is easy to drop when resolve() is next touched.
  const response = await page.goto('/yacht-financing');
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/Yacht Financing/);
});

test('every sitemap URL resolves on this server', async ({ request, baseURL }) => {
  const sitemap = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);

  expect(locs.length, 'no <loc> entries in sitemap.xml').toBeGreaterThan(0);

  const broken = [];
  for (const loc of locs) {
    // The sitemap names the production origin; only the path is testable here.
    const url = new URL(new URL(loc).pathname, baseURL).toString();
    const response = await request.get(url);
    if (response.status() !== 200) broken.push(`${loc} -> ${response.status()}`);
  }

  expect(broken, 'sitemap entries that do not resolve').toEqual([]);
});
