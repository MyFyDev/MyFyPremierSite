import { test, expect } from '@playwright/test';

/*
 * The contact form's submit button spins while the request is in flight and
 * stops when it settles -- however it settles.
 *
 * FormSubmit is always stubbed: a test run must never send a real enquiry.
 * Each stub holds its response until released, so the in-flight state can be
 * asserted without racing the network.
 */
const ENDPOINT = '**/formsubmit.co/ajax/**';

async function fill(page) {
  await page.goto('/contact-us.html');
  await page.getByLabel('First Name').fill('Test');
  await page.getByLabel('Last Name').fill('Visitor');
  await page.getByLabel('Phone').fill('5024984212');
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Message').fill('Hello');
}

// Stubs the endpoint and returns a function that lets the held response go.
async function stub(page, respond) {
  let release;
  const held = new Promise(resolve => { release = resolve; });
  await page.route(ENDPOINT, async route => {
    await held;
    await respond(route);
  });
  return release;
}

const outcomes = [
  {
    name: 'success',
    respond: route => route.fulfill({ json: { success: 'true', message: 'ok' } }),
    message: /Thank you/,
    error: false
  },
  {
    name: 'a rejected submission',
    respond: route => route.fulfill({ json: { success: 'false', message: 'nope' } }),
    message: /couldn’t send/,
    error: true
  },
  {
    name: 'a server error',
    respond: route => route.fulfill({ status: 500, body: 'oops' }),
    message: /couldn’t send/,
    error: true
  },
  {
    name: 'a network failure',
    respond: route => route.abort(),
    message: /couldn’t send/,
    error: true
  }
];

for (const outcome of outcomes) {
  test(`button spins until the request settles: ${outcome.name}`, async ({ page }) => {
    const release = await stub(page, outcome.respond);
    await fill(page);

    const button = page.getByRole('button', { name: 'Request Private Consultation' });
    const status = page.locator('.form-status');
    const width = (await button.boundingBox()).width;

    await button.click();

    await expect(button).toHaveClass(/is-loading/);
    await expect(button).toBeDisabled();
    await expect(status).toBeHidden();
    // The spinner replaces the label without resizing the button.
    expect((await button.boundingBox()).width).toBe(width);
    // Still on the page: the native POST to FormSubmit did not happen.
    await expect(page).toHaveURL(/contact-us/);

    release();

    await expect(button).not.toHaveClass(/is-loading/);
    await expect(button).toBeEnabled();
    await expect(status).toHaveText(outcome.message);
    if (outcome.error) {
      await expect(status).toHaveClass(/is-error/);
      // Nothing typed is lost on failure.
      await expect(page.getByLabel('Message')).toHaveValue('Hello');
    } else {
      await expect(page.getByLabel('Message')).toHaveValue('');
    }
  });
}
