// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Teaching UI - Arithmetic (−) A≥B guard', () => {
  test('12 − 45 is blocked (A < B)', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.addInitScript(() => {
      try { localStorage.setItem('hm_operand_level', '5'); } catch (_) {}
    });
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.handController && window.TEST_API, { timeout: 30000 });
    await page.waitForSelector('#teachingPanel');

    await page.click('#tabArithmetic');
    await page.click('#btnSub');
    await page.evaluate(() => TEST_API.setProblem({ a: 12, b: 45, op: '-' }));

    // Explanation should show guard message and Next disabled
    await expect(page.locator('#panelExplanation')).toContainText(/A must be ≥ B|swap numbers/i);
    await expect(page.locator('#btnNext')).toBeDisabled();
    await page.evaluate(() => localStorage.removeItem('hm_operand_level'));
  });
});

