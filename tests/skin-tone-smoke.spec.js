// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Skin Tone - Render continuity', () => {
  test('set color via API and frames continue', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.__HM__ && window.handMathApp && window.handMathApp.renderer);

    // Read initial frame count
    const startFrames = await page.evaluate(() => window.handMathApp.renderer.info.render.frame);

    // Change skin color via public API
    await page.evaluate(() => window.handMathApp.setSkinColor('#c79a6b'));
    await page.waitForTimeout(200);

    // Ensure frames progressed
    const midFrames = await page.evaluate(() => window.handMathApp.renderer.info.render.frame);
    expect(midFrames).toBeGreaterThan(startFrames);

    // Stress rapid changes using TEST_API helper (micro-batched under the hood)
    await page.evaluate(() => window.TEST_API && window.TEST_API.skinToneStress({ count: 20, delayMs: 20 }));
    await page.waitForTimeout(600);

    const endFrames = await page.evaluate(() => window.handMathApp.renderer.info.render.frame);
    expect(endFrames).toBeGreaterThan(midFrames);

    // Verify app remains responsive: try a quick step change
    await page.click('#btnAuto');
    await page.waitForTimeout(400);
    await page.click('#btnAuto');
    const idx = await page.evaluate(() => window.__HM__.orchestrator.state().index);
    expect(idx).toBeGreaterThanOrEqual(0);
  });
});

