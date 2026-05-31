// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Teaching UI - Help Tour', () => {
  test('Tour shows steps and can be skipped', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.__HM__ && window.handMathApp);

    await page.click('#tabHelp');
    await page.click('#btnStartTour');
    await expect(page.locator('#tourOverlay')).toBeVisible();
    await expect(page.locator('#tourTitle')).toBeVisible();

    // Next through a step
    await page.click('#tourNext');
    await expect(page.locator('#tourOverlay')).toBeVisible();

    // Skip
    await page.click('#tourSkip');
    await expect(page.locator('#tourOverlay')).toBeHidden();
  });
});

