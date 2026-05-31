// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Teaching UI - Challenge Mode & Sound Synthesizer', () => {
  test('Transitions to Challenge Mode, toggles sound, starts/submits challenge', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.handController && window.TEST_API, { timeout: 30000 });
    await page.waitForSelector('#teachingPanel');

    // 1. Switch to Challenge Tab and check UI elements
    await page.click('#tabChallenge');
    
    // Header tab should be active
    const tabClass = await page.locator('#tabChallenge').getAttribute('class');
    expect(tabClass).toContain('is-active');

    // Start screen visible, play screen hidden
    await expect(page.locator('#challengeStartScreen')).toBeVisible();
    await expect(page.locator('#challengePlayScreen')).toBeHidden();

    // 2. Test Sound Mute Toggle Button
    const soundBtn = page.locator('#btnSound');
    await expect(soundBtn).toBeVisible();
    // Default should be muted (aria-pressed=true, sound-off visible)
    await expect(soundBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(soundBtn.locator('.sound-off')).toBeVisible();
    await expect(soundBtn.locator('.sound-on')).toBeHidden();

    // Toggle sound on
    await soundBtn.click();
    await expect(soundBtn).toHaveAttribute('aria-pressed', 'false');
    await expect(soundBtn.locator('.sound-off')).toBeHidden();
    await expect(soundBtn.locator('.sound-on')).toBeVisible();

    // Toggle sound off again
    await soundBtn.click();
    await expect(soundBtn).toHaveAttribute('aria-pressed', 'true');

    // 3. Select difficulty and start challenge
    await page.selectOption('#challengeDiff', '2');
    await page.click('#btnChallengeStart');

    // Start screen hidden, play screen visible
    await expect(page.locator('#challengeStartScreen')).toBeHidden();
    await expect(page.locator('#challengePlayScreen')).toBeVisible();

    // Challenge HUD elements
    await expect(page.locator('#challengeTimer')).toContainText('s');
    await expect(page.locator('#challengeStreak')).toContainText('Streak: 0');
    await expect(page.locator('#challengeStars')).toContainText('0');
    
    const promptText = await page.locator('#challengePrompt').textContent();
    expect(promptText).toBeTruthy();
    expect(promptText?.length).toBeGreaterThan(0);

    // 4. Submit incorrect answer to verify buzzer/error state
    // Reset hands to 0|0 to ensure we have a different value than the target if target > 0
    await page.evaluate(() => {
        window.handMathApp.calculator.setTotalValue(0);
        window.handMathApp.updateAllDisplays();
    });
    
    // Click Submit
    await page.click('#btnChallengeSubmit');
    
    // Check error message (if prompt target was not 0)
    const promptTarget = await page.evaluate(() => window.__HM__.ui.challenge.target);
    if (promptTarget !== 0) {
        const msgText = await page.locator('#challengeMessage').textContent();
        expect(msgText).toContain('Try again');
    }

    // 5. Submit correct answer manually via API (simulating correct hand pose matching)
    if (promptTarget !== null) {
        await page.evaluate((target) => {
            window.handMathApp.calculator.setTotalValue(target);
            window.handMathApp.updateAllDisplays();
        }, promptTarget);

        // Success message should appear
        await expect(page.locator('#challengeMessage')).toHaveText(/Correct/i);
        const newStreak = await page.evaluate(() => window.__HM__.ui.challenge.streak);
        expect(newStreak).toBe(1);
    }

    // 6. Exit Challenge Mode
    await page.click('#btnChallengeExit');
    await expect(page.locator('#challengeStartScreen')).toBeVisible();
    await expect(page.locator('#challengePlayScreen')).toBeHidden();

    await page.screenshot({ path: 'test-results/ui-challenge-sounds-final.png', fullPage: true });
  });
});
