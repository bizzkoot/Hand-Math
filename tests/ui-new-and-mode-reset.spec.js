// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Teaching UI - Resets on New and Mode Change', () => {
  test('New problem resets hands to 0|0 before building steps', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.handController && window.TEST_API, { timeout: 30000 });

    await page.click('#tabArithmetic');
    await page.evaluate(() => TEST_API.setProblem({ a: 47, b: 38, op: '+' }));
    // Click New and verify calculator returns to 0|0 immediately
    await page.click('#btnNew');
    await page.waitForTimeout(100); // allow immediate reset microtask
    const state = await page.evaluate(() => window.handMathApp.calculator.getCurrentState());
    expect(state.left).toBe(0);
    expect(state.right).toBe(0);
  });

  test('Switching to Arithmetic from Tutorial resets to 0|0', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.handController && window.TEST_API, { timeout: 30000 });

    await page.click('#tabTutorial');
    // Move a step to ensure non-zero might have been set earlier
    await page.click('#btnNext');
    await page.evaluate(() => TEST_API.waitForSettled(2000));

    await page.click('#tabArithmetic');
    await page.waitForTimeout(50);
    const state = await page.evaluate(() => window.handMathApp.calculator.getCurrentState());
    expect(state.left).toBe(0);
    expect(state.right).toBe(0);
  });
});

