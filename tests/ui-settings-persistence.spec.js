// @ts-check
// Settings save & restore: every user-facing setting must be recalled on the
// next app open exactly as the user left it. Regression spec for missing
// persistence of sound mute, skin tone, narration speed and the explicit
// narration toggle (theme, language, operand level and screen wake were
// already persisted before this).
const { test, expect } = require('@playwright/test');

test.use({ hasTouch: true });

const gotoApp = async (page) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.leftHand && window.handMathApp.rightHand, null, { timeout: 60000 });
};

test.describe('Settings persistence', () => {
  test('sound mute state is restored after reload', async ({ page }) => {
    await gotoApp(page);

    // Default is muted (aria-pressed=true). Unmute, then reload.
    await page.click('#btnSound');
    await expect(page.locator('#btnSound')).toHaveAttribute('aria-pressed', 'false');

    await page.reload();
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.leftHand && window.handMathApp.rightHand, null, { timeout: 60000 });

    await expect(page.locator('#btnSound')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#btnSound .sound-on')).toBeVisible();
    await expect(page.locator('#btnSound .sound-off')).toBeHidden();
    const muted = await page.evaluate(() => window.__HM__.ui.soundSynth.muted);
    expect(muted).toBe(false);
  });

  test('muted default is kept when user re-mutes before reload', async ({ page }) => {
    await gotoApp(page);
    // Unmute then mute again — the saved value must reflect the final choice.
    await page.click('#btnSound');
    await page.click('#btnSound');
    await expect(page.locator('#btnSound')).toHaveAttribute('aria-pressed', 'true');

    await page.reload();
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.leftHand && window.handMathApp.rightHand, null, { timeout: 60000 });

    await expect(page.locator('#btnSound')).toHaveAttribute('aria-pressed', 'true');
    expect(await page.evaluate(() => window.__HM__.ui.soundSynth.muted)).toBe(true);
  });

  test('skin tone choice is restored after reload', async ({ page }) => {
    await gotoApp(page);

    // Pick the 3rd swatch (#c79a6b). On wide viewports the settings group is
    // inline; on compact/mobile it's a dropdown behind #btnSettings.
    const gear = page.locator('#btnSettings');
    if (await gear.isVisible()) await gear.click();
    await page.click('.hm-swatch[data-hex="#c79a6b"]');

    // Applied to materials
    await page.waitForFunction(() => {
        const svc = window.handMathApp?.skinToneService;
        return svc && svc.currentHex === '#c79a6b';
    }, null, { timeout: 5000 });
    // Swatch is highlighted as active
    await expect(page.locator('.hm-swatch[data-hex="#c79a6b"]')).toHaveClass(/is-active/);

    await page.reload();
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.leftHand && window.handMathApp.rightHand, null, { timeout: 60000 });

    // Restored and applied on startup without any user action
    await page.waitForFunction(() => {
        const svc = window.handMathApp?.skinToneService;
        return svc && svc.currentHex === '#c79a6b';
    }, null, { timeout: 5000 });
    await expect(page.locator('#hmSkinHex')).toHaveValue('#c79a6b');
    await expect(page.locator('.hm-swatch[data-hex="#c79a6b"]')).toHaveClass(/is-active/);
  });

  test('narration speed is restored after reload', async ({ page }) => {
    await gotoApp(page);

    // Speed controls live next to Auto; bump speed twice (1.0 -> 1.2)
    await page.click('#btnAuto');
    await page.click('#btnSpeedUp');
    await page.click('#btnSpeedUp');
    await expect(page.locator('#speedLabel')).toHaveText('1.2\u00d7');

    await page.reload();
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.leftHand && window.handMathApp.rightHand, null, { timeout: 60000 });

    expect(await page.evaluate(() => window.__HM__.ui._speed)).toBeCloseTo(1.2);
    // The label reflects the restored speed once Auto reveals the controls
    await page.click('#btnAuto');
    await expect(page.locator('#speedLabel')).toHaveText('1.2\u00d7');
  });

  test('explicitly disabled narration stays off when Auto re-enables', async ({ page }) => {
    await gotoApp(page);

    // Enable Auto (legacy default: narration on), then explicitly disable it.
    await page.click('#btnAuto');
    await page.click('#btnNarrate');
    await expect(page.locator('#btnNarrate')).toHaveAttribute('aria-pressed', 'false');

    await page.reload();
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.leftHand && window.handMathApp.rightHand, null, { timeout: 60000 });

    // Turning Auto on again must respect the user's explicit "off" choice.
    await page.click('#btnAuto');
    await expect(page.locator('#btnNarrate')).toHaveAttribute('aria-pressed', 'false');
    expect(await page.evaluate(() => window.__HM__.ui._ttsEnabled)).toBe(false);
  });
});
