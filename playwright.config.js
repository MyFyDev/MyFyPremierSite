import { defineConfig, devices } from '@playwright/test';

/*
 * The suite starts the site's own server, so `npm run test:e2e` needs nothing
 * running first.
 *
 * Port 8090 rather than the server's defaults (80/443): those need privileges,
 * and the point of this suite is that it runs unattended. SSL_KEY and SSL_CERT
 * are deliberately absent, which makes server.js skip its HTTPS listener and
 * serve plain HTTP -- what is under test here is the site, not TLS termination.
 */
const PORT = process.env.E2E_PORT || 8090;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },

  webServer: {
    // node directly, not `npm start`: that wraps the server in dotenvx, which
    // would load a .env whose HOST/ports point somewhere else entirely.
    command: 'node server.js',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    env: {
      HOST: 'localhost',
      HTTP_PORT: String(PORT),
      // Quiet: the server logs a line per request, and a full suite of them
      // buries a real failure.
      LOG_LEVEL: 'warn'
    }
  },

  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      /*
       * A real mobile viewport, not just a narrow window. The hamburger and the
       * overlay it controls only exist below the 751px breakpoint, so every
       * menu test would silently pass against a desktop viewport by finding
       * nothing to click.
       */
      name: 'mobile',
      use: { ...devices['iPhone 13'] }
    }
  ]
});
