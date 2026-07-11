// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Teaching UI - Arithmetic (+) result limit guard', () => {
  test('89 + 83 is blocked (exceeds 99)', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.addInitScript(() => {
      try { localStorage.setItem('hm_operand_level', '5'); } catch (_) {}
    });
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.handController && window.TEST_API, { timeout: 30000 });
    await page.waitForSelector('#teachingPanel');

    await page.click('#tabArithmetic');
    await page.evaluate(() => TEST_API.setProblem({ a: 89, b: 83, op: '+' }));

    // Explanation should show a limit guard message and Next should be disabled
    await expect(page.locator('#panelExplanation')).toContainText(/exceeds 99|choose smaller/i);
    await expect(page.locator('#btnNext')).toBeDisabled();
    await page.evaluate(() => localStorage.removeItem('hm_operand_level'));
  });
});

