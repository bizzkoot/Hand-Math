// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Teaching UI - Prev reverts finger state', () => {
  test('From sub-complement back to mental step restores right digit', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.handController && window.TEST_API, { timeout: 30000 });

    await page.click('#tabArithmetic');
    await page.evaluate(() => TEST_API.setProblem({ a: 47, b: 38, op: '+' }));

    // Step 1: show operands (4|7)
    await page.click('#btnNext');
    await page.evaluate(() => TEST_API.waitForSettled(2000));

    // Step 2: mental complement (no change)
    await page.click('#btnNext');
    await page.evaluate(() => TEST_API.waitForSettled(2000));

    // Step 3: sub-complement (right becomes 5)
    await page.click('#btnNext');
    await page.evaluate(() => TEST_API.waitForSettled(2000));
    let st = await page.evaluate(() => window.handMathApp.calculator.getCurrentState());
    expect(st.left).toBe(4);
    expect(st.right).toBe(5);

    // Prev → back to mental step target (4|7)
    await page.click('#btnPrev');
    await page.evaluate(() => TEST_API.waitForSettled(2000));
    st = await page.evaluate(() => window.handMathApp.calculator.getCurrentState());
    expect(st.left).toBe(4);
    expect(st.right).toBe(7);
  });
});
