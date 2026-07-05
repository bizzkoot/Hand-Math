// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Teaching UI - Controls & Layout', () => {
  test('keyboard shortcuts and no vertical scroll', async ({ page }) => {
    await page.goto('/index.html');
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.handController, { timeout: 30000 });
    await page.waitForSelector('#teachingPanel');

    // No vertical scroll
    const scrollTop = await page.evaluate(() => document.scrollingElement.scrollTop);
    expect(scrollTop).toBe(0);

    // Focus cycle and shortcuts
    await page.focus('#btnNext');
    await page.keyboard.press('Enter');
    await page.evaluate(() => TEST_API.waitForSettled(2000));
    await page.keyboard.press('KeyA'); // toggle auto
    const auto = await page.evaluate(() => TEST_API.getState().auto.enabled);
    expect(auto).toBeTruthy();
    await page.keyboard.press('KeyR'); // reset
    await page.evaluate(() => TEST_API.waitForSettled(2000));
  });
});
