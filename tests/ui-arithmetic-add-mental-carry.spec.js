// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Teaching UI - Arithmetic (+ mental carry)', () => {
  test('47 + 38 → 85 uses mental carry (no right reset to 0)', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.handController && window.TEST_API, { timeout: 30000 });
    await page.waitForSelector('#teachingPanel');

    await page.click('#tabArithmetic');
    await page.evaluate(() => TEST_API.setProblem({ a: 47, b: 38, op: '+' }));

    // Expect mental complement step present, and the old add10 step absent
    const stepIds = await page.evaluate(() => TEST_API.getState().steps.map(s => s.id));
    expect(stepIds).toContain('a-ones-mental-complement');
    expect(stepIds).not.toContain('a-ones-add10');

    // Walk to completion
    while (true) {
      const current = await page.evaluate(() => TEST_API.getState().step?.id || null);
      if (!current) break;
      await page.click('#btnNext');
      await page.evaluate(() => TEST_API.waitForSettled(2000));
    }

    // Final digits: 8|5
    const finalTarget = await page.evaluate(() => TEST_API.getState().steps.at(-1).target);
    expect(finalTarget.left).toBe(8);
    expect(finalTarget.right).toBe(5);
  });
});

