// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Teaching UI - Info, Fullscreen, Auto', () => {
  test('Info modal opens and closes', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.__HM__ && window.handMathApp);
    await page.click('#btnInfo');
    await expect(page.locator('#infoModal')).toBeVisible();
    await page.click('#infoGotIt');
    await expect(page.locator('#infoModal')).toBeHidden();
  });

  test('Fullscreen toggles data attribute', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.__HM__ && window.handMathApp);
    await page.click('#btnFullscreen');
    await expect(page.locator('body')).toHaveAttribute('data-fullscreen', '1');
    await page.click('#btnFullscreen');
    await expect(page.locator('body')).not.toHaveAttribute('data-fullscreen', '1');
  });

  test('Auto advances through tutorial steps', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.__HM__ && window.handMathApp);
    await page.click('#tabTutorial');
    // Enable auto (also enables TTS by default)
    await page.click('#btnAuto');
    // Disable TTS for headless (speechSynthesis onend may never fire)
    await page.evaluate(() => { window.__HM__.ui._ttsEnabled = false; });
    // Wait for at least one advancement
    await page.waitForTimeout(4000);
    const idx = await page.evaluate(() => window.__HM__.orchestrator.state().index);
    expect(idx).toBeGreaterThan(0);
    // Turn off auto to avoid stray progression
    await page.click('#btnAuto');
  });
});
