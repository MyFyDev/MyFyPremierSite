import { test, expect } from '@playwright/test';

/*
 * The mobile menu is the only interactive JavaScript on the site, and most of
 * what it does is accessibility behaviour that is invisible when it breaks:
 * inert backgrounds, a focus trap, Escape, and a force-close when the viewport
 * grows. Nobody notices any of that regressing by looking at the page.
 *
 * Mobile only. The hamburger and overlay exist only below the 751px breakpoint,
 * so on a desktop viewport every assertion here would pass by finding nothing.
 */
test.describe('mobile menu', () => {
  test.skip(({ isMobile }) => !isMobile, 'the hamburger only exists below the 751px breakpoint');

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  const hamburger = (page) => page.locator('.hamburger');
  const overlay = (page) => page.locator('#mobile-overlay');

  test('starts closed and announces itself as collapsed', async ({ page }) => {
    await expect(hamburger(page)).toBeVisible();
    await expect(hamburger(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(overlay(page)).not.toHaveClass(/open/);
  });

  test('opens, and hides the background from assistive tech', async ({ page }) => {
    await hamburger(page).click();

    await expect(overlay(page)).toHaveClass(/open/);
    await expect(hamburger(page)).toHaveAttribute('aria-expanded', 'true');

    /*
     * inert and aria-hidden together: aria-hidden removes the region from the
     * accessibility tree, inert also stops it taking focus or clicks. The
     * overlay claims aria-modal="true", and this is what makes that claim true.
     */
    for (const selector of ['#main-content', '.site-footer']) {
      await expect(page.locator(selector)).toHaveAttribute('inert', '');
      await expect(page.locator(selector)).toHaveAttribute('aria-hidden', 'true');
    }

    // The header is deliberately NOT inert -- it holds the hamburger, which is
    // the menu's only close control and has to stay operable.
    await expect(page.locator('header')).not.toHaveAttribute('inert', '');
  });

  test('moves focus into the overlay on open, and back to the button on close', async ({ page }) => {
    await hamburger(page).click();

    const first = overlay(page).locator('a, button').first();
    await expect(first).toBeFocused();

    await hamburger(page).click();
    await expect(hamburger(page)).toBeFocused();
  });

  test('restores the background when closed', async ({ page }) => {
    await hamburger(page).click();
    await hamburger(page).click();

    await expect(overlay(page)).not.toHaveClass(/open/);
    await expect(hamburger(page)).toHaveAttribute('aria-expanded', 'false');

    for (const selector of ['#main-content', '.site-footer']) {
      await expect(page.locator(selector)).not.toHaveAttribute('inert', '');
      await expect(page.locator(selector)).not.toHaveAttribute('aria-hidden', 'true');
    }
  });

  test('closes on Escape', async ({ page }) => {
    await hamburger(page).click();
    await expect(overlay(page)).toHaveClass(/open/);

    await page.keyboard.press('Escape');

    await expect(overlay(page)).not.toHaveClass(/open/);
    await expect(hamburger(page)).toBeFocused();
  });

  test('traps Tab inside the overlay', async ({ page }) => {
    await hamburger(page).click();

    const items = overlay(page).locator('a, button');
    const count = await items.count();
    expect(count, 'the overlay has nothing focusable to trap').toBeGreaterThan(0);

    // Forward off the end wraps to the start.
    await items.last().focus();
    await page.keyboard.press('Tab');
    await expect(items.first()).toBeFocused();

    // And backward off the start wraps to the end.
    await page.keyboard.press('Shift+Tab');
    await expect(items.last()).toBeFocused();
  });

  test('closes when a menu link is followed', async ({ page }) => {
    await hamburger(page).click();

    const link = overlay(page).locator('a[href$=".html"]').first();
    await link.click();

    // Whether it navigated or not, the menu must not still be open over the
    // destination with the scroll lock on.
    await expect(overlay(page)).not.toHaveClass(/open/);
    await expect(page.locator('body')).not.toHaveClass(/menu-open/);
  });

  test('force-closes when the viewport grows past the breakpoint', async ({ page }) => {
    /*
     * The bug this guards: past 751px the CSS hides the hamburger -- the only
     * visible control -- so an overlay left open would sit over the desktop
     * layout with body scroll still locked and no way to dismiss it.
     */
    await hamburger(page).click();
    await expect(overlay(page)).toHaveClass(/open/);
    await expect(page.locator('body')).toHaveClass(/menu-open/);

    await page.setViewportSize({ width: 1200, height: 900 });

    await expect(overlay(page)).not.toHaveClass(/open/);
    await expect(page.locator('body')).not.toHaveClass(/menu-open/);
    for (const selector of ['#main-content', '.site-footer']) {
      await expect(page.locator(selector)).not.toHaveAttribute('inert', '');
    }
  });
});

test.describe('reduced motion', () => {
  /*
   * WCAG 2.2.2. The hero video autoplays and loops purely for decoration, so a
   * user who has asked their OS for less motion gets the poster frame instead.
   */
  test('the hero video is paused when the user asks for reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    const video = page.locator('video.hero-media');
    await expect(video).toHaveCount(1);

    await expect.poll(() => video.evaluate(v => v.paused)).toBe(true);
    expect(await video.evaluate(v => v.hasAttribute('autoplay'))).toBe(false);
    expect(await video.evaluate(v => v.hasAttribute('loop'))).toBe(false);
  });

  test('the hero video plays by default', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');

    const video = page.locator('video.hero-media');
    // The attributes are what the page asked for; whether the codec actually
    // decodes in a headless browser is not this suite's business.
    expect(await video.evaluate(v => v.hasAttribute('autoplay'))).toBe(true);
    expect(await video.evaluate(v => v.hasAttribute('loop'))).toBe(true);
  });
});
