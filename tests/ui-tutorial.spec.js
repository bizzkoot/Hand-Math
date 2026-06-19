// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Teaching UI - Tutorial', () => {
  test('step progression and narration', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');

    // Wait for app (GLTF + HandController)
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.handController, { timeout: 30000 });
    // Teaching UI present
    await page.waitForSelector('#teachingPanel');

    // Switch to Tutorial explicitly
    await page.click('#tabTutorial');

    // Ensure four steps rendered (place-value intro + tens + ones + result)
    await expect(page.locator('#panelSteps .hm-step')).toHaveCount(4);

    // Step 1 current
    await expect(page.locator('#panelSteps .hm-step').first()).toHaveAttribute('aria-current', 'step');
    await expect(page.locator('#panelQuestion')).toContainText('▷');

    // Next → Step 2
    await page.click('#btnNext');
    // If TEST_API is present, use it for determinism
    if (await page.evaluate(() => !!window.TEST_API)) {
      await page.evaluate(() => TEST_API.waitForSettled(2000));
    } else {
      await page.waitForTimeout(600);
    }
    await expect(page.locator('#panelSteps .hm-step').nth(1)).toHaveClass(/is-current/);

    // Next → Step 3
    await page.click('#btnNext');
    if (await page.evaluate(() => !!window.TEST_API)) {
      await page.evaluate(() => TEST_API.waitForSettled(2000));
    } else {
      await page.waitForTimeout(600);
    }
    await expect(page.locator('#panelSteps .hm-step').nth(2)).toHaveClass(/is-current/);

    // Screenshot for artifacts
    await page.screenshot({ path: 'test-results/ui-tutorial-final.png', fullPage: true });
  });
});
