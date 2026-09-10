// @ts-check
// Demo Counting smoke: right hand counts 0→9, then left hand 0→9 (tens 0-90),
// ending on the closed "0" pose. Sanity-checks the animation sequencing
// end-to-end (QA checklist item).
const { test, expect } = require('@playwright/test');

const gotoApp = async (page) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.leftHand && window.handMathApp.rightHand, null, { timeout: 60000 });
    await page.waitForTimeout(1500); // let the intro settle animation finish
};

test.describe('Demo Counting sequence', () => {
  test('counts right 0-9 then left 0-9 and every finger pattern applies', async ({ page }) => {
    await gotoApp(page);

    // Collect the calculator state transitions driven by the demo
    await page.evaluate(() => {
        window.__demoSamples = [];
        const app = window.handMathApp;
        const origSet = app.calculator.setHandValue.bind(app.calculator);
        app.calculator.setHandValue = (hand, value) => {
            window.__demoSamples.push({ hand, value });
            return origSet(hand, value);
        };
        window.handMathApp.demoCountingSequence();
    });

    // 10 right steps + ~600ms gap + 10 left steps, 800ms each
    await page.waitForFunction(() => window.__demoSamples.length >= 20, null, { timeout: 20000 });

    const samples = await page.evaluate(() => window.__demoSamples);
    const right = samples.filter(s => s.hand === 'right').map(s => s.value);
    const left = samples.filter(s => s.hand === 'left').map(s => s.value);

    expect(right).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(left).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

    // Final state: both hands closed (0)
    await page.waitForTimeout(1000);
    const state = await page.evaluate(() => window.handMathApp.calculator.getCurrentState());
    expect(state.right).toBe(9);
    expect(state.left).toBe(9);
  });
});
