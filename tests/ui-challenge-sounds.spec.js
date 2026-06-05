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

    // Start screen visible, play/end screens hidden
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

    // 3. Start challenge (no difficulty selector in new design)
    await page.click('#btnChallengeStart');

    // Start screen hidden, play screen visible
    await expect(page.locator('#challengeStartScreen')).toBeHidden();
    await expect(page.locator('#challengePlayScreen')).toBeVisible();

    // Challenge HUD elements (new gem-based design)
    await expect(page.locator('#challengeRound')).toContainText('Round');
    await expect(page.locator('#challengeGemCount')).toBeVisible();
    await expect(page.locator('#challengeTierBadge')).toBeVisible();
    
    const promptText = await page.locator('#challengePrompt').textContent();
    expect(promptText).toBeTruthy();
    expect(promptText?.length).toBeGreaterThan(0);

    // 4. Capture target, then submit a wrong answer to verify buzzer/error state
    const promptTarget = await page.evaluate(() => window.__HM__.ui.challenge.target);
    
    if (promptTarget !== null) {
        // Set a deliberately wrong value (different from target)
        const wrongVal = promptTarget === 0 ? 5 : 0;
        await page.evaluate((val) => {
            window.handMathApp.calculator.setTotalValue(val);
            window.handMathApp.updateAllDisplays();
        }, wrongVal);
        
        // Click Submit
        await page.click('#btnChallengeSubmit');
        
        // Should see error message
        await expect(page.locator('#challengeMessage')).not.toBeEmpty();
        
        // 5. Now submit correct answer
        await page.evaluate((target) => {
            window.handMathApp.calculator.setTotalValue(target);
            window.handMathApp.updateAllDisplays();
        }, promptTarget);

        // Click Submit to trigger the answer check (no auto-submit)
        await page.click('#btnChallengeSubmit');

        // Success message should appear (one of the tier feedback messages)
        await expect(page.locator('#challengeMessage')).not.toBeEmpty();
        // Gem count should have increased
        const gemCount = await page.evaluate(() => window.__HM__.ui.challenge.gems.length);
        expect(gemCount).toBe(1);
    }

    // 6. Exit Challenge Mode
    await page.click('#btnChallengeExit');
    await expect(page.locator('#challengeStartScreen')).toBeVisible();
    await expect(page.locator('#challengePlayScreen')).toBeHidden();

    await page.screenshot({ path: 'test-results/ui-challenge-sounds-final.png', fullPage: true });
  });
});
