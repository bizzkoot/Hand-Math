// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Teaching UI - Arithmetic (− borrow)', () => {
  test('42 − 17 → 25 with borrow cue', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.handController && window.TEST_API, { timeout: 30000 });
    await page.waitForSelector('#teachingPanel');

    // Switch to Arithmetic and subtraction
    await page.click('#tabArithmetic');
    await page.click('#btnSub');
    await page.evaluate(() => TEST_API.setProblem({ a: 42, b: 17, op: '-' }));

    const steps = await page.evaluate(() => TEST_API.getState().steps.map(s => s.id));
    expect(steps).toContain('s-borrow');

    // Advance until we reach the borrow step, then assert cue immediately
    // TeachingOrchestrator increments index after running, so we must check before clicking Next.
    while (true) {
      const currentId = await page.evaluate(() => TEST_API.getState().step?.id || null);
      if (currentId === 's-borrow') {
        // Trigger the borrow step
        await page.click('#btnNext');
        // Cue is transient (~800ms); assert quickly
        await expect(page.locator('#carryBorrowCue')).toHaveText('Borrow 1 ten', { timeout: 1200 });
        await page.evaluate(() => TEST_API.waitForSettled(2000));
        break;
      }
      await page.click('#btnNext');
      await page.evaluate(() => TEST_API.waitForSettled(2000));
    }

    // Complete remaining steps
    while (true) {
      const currentId = await page.evaluate(() => TEST_API.getState().step?.id || null);
      if (!currentId) break;
      await page.click('#btnNext');
      await page.evaluate(() => TEST_API.waitForSettled(2000));
    }

    // Final digits 2|5 (25)
    const final = await page.evaluate(() => TEST_API.getState().steps.at(-1).target);
    expect(final.left).toBe(2);
    expect(final.right).toBe(5);

    await page.screenshot({ path: 'test-results/ui-arith-sub-borrow-final.png', fullPage: true });
  });
});
