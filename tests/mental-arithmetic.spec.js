// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Level 6 - Mental Arithmetic & Multi-Step', () => {
  test('Practice mode generates and shows multi-step guided steps', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.handMathApp && window.TEST_API, { timeout: 30000 });

    // Set Level 6
    await page.evaluate(() => TEST_API.setOperandLevel(6));
    
    // Switch to Arithmetic
    await page.click('#tabArithmetic');
    
    // Set a specific multi-step problem
    await page.evaluate(() => TEST_API.setMultiStepProblem([34, 33, 40], ['+', '-']));
    
    // Check if the prompt shows the full equation
    const text = await page.textContent('#arithPrompt');
    expect(text).toContain('34');
    expect(text).toContain('+');
    expect(text).toContain('33');
    expect(text).toContain('−');
    expect(text).toContain('40');
    expect(text).toContain('=');

    // Walk through steps
    await page.click('#btnNext');
    
    // Click until we reach the end of the steps
    let stepsLeft = true;
    for (let i = 0; i < 20; i++) {
        const state = await page.evaluate(() => TEST_API.getState());
        if (state.index >= state.steps.length) {
            stepsLeft = false;
            break;
        }
        await page.click('#btnNext');
        await page.waitForTimeout(50);
    }
    expect(stepsLeft).toBe(false);

    // Final answer Slot check
    const finalAnswer = await page.textContent('#answerSlot');
    expect(finalAnswer).toBe('27'); // 34 + 33 - 40 = 27
  });

  test('Challenge mode Level 6 displays multiple choice buttons and handles click', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.handMathApp && window.TEST_API, { timeout: 30000 });

    // Set Level 6
    await page.evaluate(() => TEST_API.setOperandLevel(6));

    // Switch to Challenge
    await page.click('#tabChallenge');

    // Click start challenge
    await page.click('#btnChallengeStart');

    // Verify multiple choice container is visible
    const container = page.locator('#mentalChoicesChallenge');
    await expect(container).toBeVisible();

    // Verify exactly 5 choice buttons are rendered
    const buttons = page.locator('#mentalChoicesChallenge .hm-mental-choice-btn');
    await expect(buttons).toHaveCount(5);

    // Find the correct button and click it
    const target = await page.evaluate(() => window.__HM__.ui.challenge.target);
    const correctBtn = page.locator(`#mentalChoicesChallenge .hm-mental-choice-btn`).filter({ hasText: new RegExp(`^${target}$`) }).first();
    await correctBtn.click();

    // Verify success class or feedback message
    const msg = page.locator('#challengeMessage');
    await expect(msg).toHaveClass(/success/);
  });
});
