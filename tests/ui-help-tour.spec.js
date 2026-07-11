// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Teaching UI - Help Tour', () => {
  test('Tour shows 8 steps, saves/restores mode, and can be skipped', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.__HM__ && window.handMathApp);

    // Initial mode should be Tutorial or similar, let's switch to Help
    await page.click('#tabHelp');
    
    // Check initial mode
    const getMode = () => page.evaluate(() => window.__HM__.orchestrator.mode);
    expect(await getMode()).toBe('Help');

    await page.click('#btnStartTour');
    await expect(page.locator('#tourOverlay')).toBeVisible();

    // Starting the tour switches mode to Tutorial so elements are visible
    expect(await getMode()).toBe('Tutorial');

    // Go through all 8 steps
    for (let i = 0; i < 7; i++) {
      await page.click('#tourNext');
      await expect(page.locator('#tourOverlay')).toBeVisible();
    }

    // On the last step, clicking next/done completes the tour and restores mode to Help
    await page.click('#tourNext');
    await expect(page.locator('#tourOverlay')).toBeHidden();
    expect(await getMode()).toBe('Help');
  });

  test('Tour can be exited using the Escape key', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.__HM__ && window.handMathApp);

    await page.click('#tabHelp');
    await page.click('#btnStartTour');
    await expect(page.locator('#tourOverlay')).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');
    await expect(page.locator('#tourOverlay')).toBeHidden();
    
    // Mode should be restored to Help
    const getMode = () => page.evaluate(() => window.__HM__.orchestrator.mode);
    expect(await getMode()).toBe('Help');
  });

  test('Tour can be exited by clicking on the overlay backdrop', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.__HM__ && window.handMathApp);

    await page.click('#tabHelp');
    await page.click('#btnStartTour');
    await expect(page.locator('#tourOverlay')).toBeVisible();

    // Click the mask backdrop (click at 10, 10 viewport location, which is outside the popover)
    await page.mouse.click(10, 10);
    await expect(page.locator('#tourOverlay')).toBeHidden();

    // Mode should be restored to Help
    const getMode = () => page.evaluate(() => window.__HM__.orchestrator.mode);
    expect(await getMode()).toBe('Help');
  });
  test('Tour can navigate forward and backward using Arrow keys', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.__HM__ && window.handMathApp);

    await page.click('#tabHelp');
    await page.click('#btnStartTour');
    await expect(page.locator('#tourOverlay')).toBeVisible();

    // Initial step (Step 1)
    await expect(page.locator('#tourTitle')).toHaveText(/3D Hands|Tangan 3D/);

    // Press ArrowRight to go to Step 2 (Operand Level)
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#tourTitle')).toHaveText(/Operand Level|Tahap Operan/);

    // Press ArrowRight again to go to Step 3 (Navigation Tabs)
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('#tourTitle')).toHaveText(/Navigation Tabs|Tab Navigasi/);

    // Press ArrowLeft to go back to Step 2 (Operand Level)
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#tourTitle')).toHaveText(/Operand Level|Tahap Operan/);

    // Press ArrowLeft to go back to Step 1
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('#tourTitle')).toHaveText(/3D Hands|Tangan 3D/);
  });

  test('Settings step highlights #configGroup on desktop when #btnSettings is hidden', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.__HM__ && window.handMathApp);

    // Ensure we are on a desktop width (already set to 1280 in config)
    // #btnSettings should be hidden (display: none)
    const btnVisible = await page.locator('#btnSettings').isVisible();
    expect(btnVisible).toBeFalsy();

    await page.click('#tabHelp');
    await page.click('#btnStartTour');
    
    // Go to step 8 (Settings step)
    for (let i = 0; i < 7; i++) {
      await page.keyboard.press('ArrowRight');
    }

    await expect(page.locator('#tourTitle')).toHaveText(/Settings Menu|Menu Tetapan/);

    // Check that the spotlight width and height are non-zero (highlighting #configGroup)
    const focusStyle = await page.locator('#tourFocus').getAttribute('style');
    expect(focusStyle).toContain('width:');
    expect(focusStyle).not.toContain('width: 0px');
  });
});

