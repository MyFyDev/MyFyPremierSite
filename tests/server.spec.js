import { test, expect } from '@playwright/test';

/*
 * server.js itself: what it will and will not serve, and the response
 * behaviours the site depends on.
 *
 * No browser -- these are HTTP assertions, made through the request fixture.
 * They run identically in both projects, which is harmless and means a mobile
 * -only run still checks them.
 */

test.describe('the allowlist', () => {
  /*
   * The repo root doubles as the web root, so reachability is an allowlist:
   * .env, package.json, server.js and node_modules/ all sit beside the pages
   * and must never be served.
   *
   * This is also the test that catches an ESM port going wrong. Every decision
   * in resolve() is made against ROOT, which became import.meta.dirname when
   * __dirname went away -- if that resolved anywhere else, either the site
   * 404s wholesale or these paths start returning 200.
   */
  const forbidden = [
    '/package.json',
    '/package-lock.json',
    '/server.js',
    '/.env',
    '/deployment/Dockerfile',
    '/node_modules/utilities/package.json',
    '/start.sh',
    // Traversal, in the shapes normalization has to survive.
    '/../package.json',
    '/assets/../package.json',
    '/%2e%2e/package.json',
    '/assets/%2e%2e/%2e%2e/package.json'
  ];

  for (const url of forbidden) {
    test(`refuses ${url}`, async ({ request }) => {
      const response = await request.get(url, { maxRedirects: 0 });
      expect(response.status(), `${url} should not be servable`).toBe(404);
    });
  }

  test('a null byte in the path is refused', async ({ request }) => {
    const response = await request.get('/index.html%00.png', { maxRedirects: 0 });
    expect(response.status()).toBe(404);
  });

  const allowed = ['/', '/index.html', '/robots.txt', '/sitemap.xml', '/assets/js/site.js'];

  for (const url of allowed) {
    test(`serves ${url}`, async ({ request }) => {
      const response = await request.get(url);
      expect(response.status()).toBe(200);
    });
  }
});

test.describe('response behaviour', () => {
  test('compresses text and marks it as a distinct entity', async ({ request }) => {
    const response = await request.get('/assets/js/site.js', {
      headers: { 'accept-encoding': 'gzip' }
    });

    expect(response.status()).toBe(200);
    expect(response.headers()['content-encoding']).toBe('gzip');
    // Without Vary, a shared cache can hand a gzipped body to a client that
    // did not ask for one.
    expect(response.headers()['vary']).toMatch(/accept-encoding/i);
    // The gzipped body is a different entity from the identity one, so it needs
    // its own etag or a revalidation can match across encodings.
    expect(response.headers()['etag']).toMatch(/-gz"$/);
  });

  test('does not compress an already-compressed type', async ({ request }) => {
    const response = await request.get('/assets/video/hero.mp4', {
      headers: { 'accept-encoding': 'gzip' }
    });

    expect(response.status()).toBe(200);
    expect(response.headers()['content-encoding']).toBeUndefined();
  });

  test('revalidates with an etag', async ({ request }) => {
    const first = await request.get('/robots.txt');
    const etag = first.headers()['etag'];
    expect(etag).toBeTruthy();

    const second = await request.get('/robots.txt', { headers: { 'if-none-match': etag } });
    expect(second.status()).toBe(304);
  });

  test('serves a byte range', async ({ request }) => {
    /*
     * Safari will not play a video whose server ignores Range -- it needs the
     * 206 to begin playback at all, so the hero video on the home page depends
     * on this.
     */
    const response = await request.get('/assets/video/hero.mp4', {
      headers: { range: 'bytes=0-1023' }
    });

    expect(response.status()).toBe(206);
    expect(response.headers()['content-length']).toBe('1024');
    expect(response.headers()['content-range']).toMatch(/^bytes 0-1023\/\d+$/);
  });

  test('rejects an unsatisfiable range', async ({ request }) => {
    const response = await request.get('/robots.txt', {
      headers: { range: 'bytes=99999999-' }
    });

    expect(response.status()).toBe(416);
    expect(response.headers()['content-range']).toMatch(/^bytes \*\/\d+$/);
  });

  test('HTML revalidates while assets may be cached', async ({ request }) => {
    // site.css and site.js are unfingerprinted, so a long max-age on HTML would
    // pin a stale page to the old asset URLs after a deploy.
    const html = await request.get('/index.html');
    expect(html.headers()['cache-control']).toBe('no-cache');

    const asset = await request.get('/assets/js/site.js');
    expect(asset.headers()['cache-control']).toMatch(/^public, max-age=\d+$/);
  });

  test('sends nosniff', async ({ request }) => {
    const response = await request.get('/index.html');
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
  });

  test('answers HEAD without a body', async ({ request }) => {
    const response = await request.fetch('/index.html', { method: 'HEAD' });
    expect(response.status()).toBe(200);
    expect((await response.body()).length).toBe(0);
  });

  test('refuses a method it does not implement', async ({ request }) => {
    const response = await request.post('/');
    expect(response.status()).toBe(405);
    expect(response.headers()['allow']).toBe('GET, HEAD');
  });
});
