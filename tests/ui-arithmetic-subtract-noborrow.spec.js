// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Teaching UI - Arithmetic (− no borrow)', () => {
  test('73 − 21 → 52 without borrow cue', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.addInitScript(() => {
      try { localStorage.setItem('hm_operand_level', '5'); } catch (_) {}
    });
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.handController && window.TEST_API, { timeout: 30000 });
    await page.waitForSelector('#teachingPanel');

    // Switch to Arithmetic and subtraction
    await page.click('#tabArithmetic');
    await page.click('#btnSub');
    await page.evaluate(() => TEST_API.setProblem({ a: 73, b: 21, op: '-' }));

    const steps = await page.evaluate(() => TEST_API.getState().steps.map(s => s.id));
    expect(steps).not.toContain('s-borrow');

    // Step through all planned steps deterministically
    for (let i = 0; i < steps.length; i++) {
      await page.click('#btnNext');
      await page.evaluate(() => TEST_API.waitForSettled(2000));
    }

    // Final digits 5|2 (52)
    const final = await page.evaluate(() => TEST_API.getState().steps.at(-1).target);
    expect(final.left).toBe(5);
    expect(final.right).toBe(2);

    // Ensure borrow banner did not show lingering text
    const bannerText = await page.locator('#carryBorrowCue').textContent();
    expect(bannerText || '').not.toMatch(/Borrow 1 ten/i);

    await page.screenshot({ path: 'test-results/ui-arith-sub-noborrow-final.png', fullPage: true });
    await page.evaluate(() => localStorage.removeItem('hm_operand_level'));
  });
});
