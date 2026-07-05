// @ts-check
const { test, expect } = require('@playwright/test');

// Auto-submit countdown: when the user's hands match the challenge target, the
// Submit button shows a short countdown and accepts automatically. The user
// can still submit manually (which cancels the countdown) or move their hands
// away to cancel.
test.describe('Teaching UI - Challenge auto-submit countdown', () => {
  test('counts down inside Submit button then auto-accepts the correct answer', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(
      () => window.handMathApp && window.handMathApp.handController && window.__HM__ && window.__HM__.ui,
      { timeout: 30000 }
    );
    await page.waitForSelector('#teachingPanel');

    // Start challenge
    await page.click('#tabChallenge');
    await page.click('#btnChallengeStart');
    await expect(page.locator('#challengePlayScreen')).toBeVisible();

    // Capture target
    const target = await page.evaluate(() => window.__HM__.ui.challenge.target);
    expect(target).not.toBeNull();

    // Initial submit button text (i18n "Submit Answer")
    const initialText = (await page.locator('#btnChallengeSubmit').textContent())?.trim();
    expect(initialText).toBeTruthy();

    // Set the hands to match the target — this should kick off the countdown
    await page.evaluate((t) => {
      window.handMathApp.calculator.setTotalValue(t);
      window.handMathApp.updateAllDisplays();
    }, target);

    // Countdown shows in the Submit button as "✓ N"
    await expect(page.locator('#btnChallengeSubmit')).toHaveText(/✓\s*3/, { timeout: 1000 });
    await page.waitForTimeout(1100);
    await expect(page.locator('#btnChallengeSubmit')).toHaveText(/✓\s*2/);
    await page.waitForTimeout(1100);
    await expect(page.locator('#btnChallengeSubmit')).toHaveText(/✓\s*1/);

    // After the last tick the answer is auto-accepted: a gem is recorded and
    // a new question is loaded (Round 1/10 → Round 2/10). The auto-advance
    // happens after a 1.5s delay, so wait for the round counter to advance.
    await page.waitForFunction(
      () => window.__HM__.ui.challenge.gems.length === 1,
      null,
      { timeout: 3000 }
    );
    await page.waitForFunction(
      () => window.__HM__.ui.challenge.currentRound >= 2 && window.__HM__.ui.challenge.target !== null,
      null,
      { timeout: 3000 }
    );

    // The new question may itself start a fresh countdown (if its target
    // happens to match the just-reset hands), so first move the hands to a
    // non-matching value to make the button text deterministic.
    const newTarget = await page.evaluate(() => window.__HM__.ui.challenge.target);
    const safeValue = (newTarget + 1) % 100;
    await page.evaluate((v) => {
      window.handMathApp.calculator.setTotalValue(v);
      window.handMathApp.updateAllDisplays();
    }, safeValue);
    await expect(page.locator('#btnChallengeSubmit')).toHaveText(/Submit/, { timeout: 2000 });

    // Clean up
    await page.click('#btnChallengeExit');
  });

  test('moving hands away from target cancels the countdown', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(
      () => window.handMathApp && window.handMathApp.handController && window.__HM__ && window.__HM__.ui,
      { timeout: 30000 }
    );
    await page.click('#tabChallenge');
    await page.click('#btnChallengeStart');
    await expect(page.locator('#challengePlayScreen')).toBeVisible();

    const target = await page.evaluate(() => window.__HM__.ui.challenge.target);
    const originalText = (await page.locator('#btnChallengeSubmit').textContent())?.trim();

    // Match the target → countdown starts
    await page.evaluate((t) => {
      window.handMathApp.calculator.setTotalValue(t);
      window.handMathApp.updateAllDisplays();
    }, target);
    await expect(page.locator('#btnChallengeSubmit')).toHaveText(/✓\s*3/, { timeout: 1000 });

    // Now move hands away from the target → countdown should be cancelled and
    // the button text restored to the default.
    const away = target === 0 ? 5 : (target + 1) % 100;
    await page.evaluate((v) => {
      window.handMathApp.calculator.setTotalValue(v);
      window.handMathApp.updateAllDisplays();
    }, away);
    await expect(page.locator('#btnChallengeSubmit')).toHaveText(originalText ?? 'Submit Answer', { timeout: 1000 });

    // Gem count should still be 0
    const gems = await page.evaluate(() => window.__HM__.ui.challenge.gems.length);
    expect(gems).toBe(0);

    await page.click('#btnChallengeExit');
  });

  test('clicking Submit during the countdown accepts immediately', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(
      () => window.handMathApp && window.handMathApp.handController && window.__HM__ && window.__HM__.ui,
      { timeout: 30000 }
    );
    await page.click('#tabChallenge');
    await page.click('#btnChallengeStart');
    await expect(page.locator('#challengePlayScreen')).toBeVisible();

    const target = await page.evaluate(() => window.__HM__.ui.challenge.target);
    await page.evaluate((t) => {
      window.handMathApp.calculator.setTotalValue(t);
      window.handMathApp.updateAllDisplays();
    }, target);
    await expect(page.locator('#btnChallengeSubmit')).toHaveText(/✓\s*3/, { timeout: 1000 });

    // Manual submit cancels the wait and accepts now
    await page.click('#btnChallengeSubmit');
    await page.waitForFunction(
      () => window.__HM__.ui.challenge.gems.length === 1,
      null,
      { timeout: 1500 }
    );
    await page.click('#btnChallengeExit');
  });

  test('using Hint cancels the auto-submit countdown', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(
      () => window.handMathApp && window.handMathApp.handController && window.__HM__ && window.__HM__.ui,
      { timeout: 30000 }
    );
    await page.click('#tabChallenge');
    await page.click('#btnChallengeStart');
    await expect(page.locator('#challengePlayScreen')).toBeVisible();

    // Stretch the auto-submit window so the test is not racing with the
    // 3-second timer. The point of this test is to verify the cancel
    // behaviour, not the auto-accept behaviour.
    await page.evaluate(() => {
      window.__HM__.ui.challenge.autoSubmitSeconds = 60;
    });

    const target = await page.evaluate(() => window.__HM__.ui.challenge.target);

    // Match the target → countdown starts
    await page.evaluate((t) => {
      window.handMathApp.calculator.setTotalValue(t);
      window.handMathApp.updateAllDisplays();
    }, target);
    await expect(page.locator('#btnChallengeSubmit')).toHaveText(/✓\s*60/, { timeout: 1000 });

    // Use hint — countdown should be cancelled
    await page.click('#btnChallengeHint');
    await expect(page.locator('#btnChallengeSubmit')).toHaveText(/Submit/, { timeout: 1000 });

    // After the hint, the timer and counter must be cleared and no further
    // auto-accept should fire even if the hands still match the target.
    const justAfterHint = await page.evaluate(() => ({
      gems: window.__HM__.ui.challenge.gems.length,
      timer: !!window.__HM__.ui.challenge.autoSubmitTimer,
      countdown: window.__HM__.ui.challenge.autoSubmitCountdown,
      hintUsed: window.__HM__.ui.challenge.hintUsed,
      target: window.__HM__.ui.challenge.target,
    }));
    expect(justAfterHint.gems).toBe(0);
    expect(justAfterHint.timer).toBe(false);
    expect(justAfterHint.countdown).toBe(0);
    expect(justAfterHint.hintUsed).toBe(true);
    expect(justAfterHint.target).toBe(target);

    await page.click('#btnChallengeExit');
  });
});
