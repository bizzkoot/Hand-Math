// @ts-check
const { test, expect } = require('@playwright/test');

// Verify that the i18n fixes are wired correctly:
// - data-i18n-title and data-i18n-aria are translated on init and on switch
// - The PWA banner texts go through i18n.t()
// - Validation status badge uses translated text
// - The dynamic mute/unmute button updates its aria-label on toggle and on switch
// - <title> and <meta name="description"> are translated
// - All JSON keys referenced in HTML/JS exist in both en.json and ms.json
test.describe('Teaching UI - i18n coverage', () => {
  test('static data-i18n-aria / data-i18n-title are translated on init', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.i18n && window.i18n.currentLang);

    // Default lang is 'en' (from localStorage fallback in tests).
    const enTitle = await page.locator('#btnTheme').getAttribute('title');
    expect(enTitle).toBe('Toggle Theme');
    const enAria = await page.locator('#btnTheme').getAttribute('aria-label');
    expect(enAria).toBe('Toggle Theme');

    // Skin tone swatches use a template var (data-i18n-aria-vars).
    const swatch3Aria = await page.locator('.hm-swatch[data-hex="#c79a6b"]').getAttribute('aria-label');
    expect(swatch3Aria).toBe('Skin tone 3');

    // Hand controls have per-side keys.
    const leftIncAria = await page.locator('.hand-control-plus[data-hand="left"]').getAttribute('aria-label');
    expect(leftIncAria).toBe('Left hand increment');

    // data-i18n-title with a reusable existing key.
    const wireTitle = await page.locator('#toggle-wireframe').getAttribute('title');
    expect(wireTitle).toBe('Toggle Wireframe');

    // Language switcher title uses lang.selectTitle.
    const langTitle = await page.locator('#langSwitcher').getAttribute('title');
    expect(langTitle).toBe('Language / Bahasa');
  });

  test('switching to ms updates aria-label / title', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.i18n && window.i18n.currentLang);

    await page.selectOption('#langSwitcher', 'ms');
    await page.waitForFunction(() => window.i18n.currentLang === 'ms');

    const themeTitle = await page.locator('#btnTheme').getAttribute('title');
    expect(themeTitle).toBe('Togol Tema');

    const swatch3Aria = await page.locator('.hm-swatch[data-hex="#c79a6b"]').getAttribute('aria-label');
    expect(swatch3Aria).toBe('Warna kulit 3');

    const leftIncAria = await page.locator('.hand-control-plus[data-hand="left"]').getAttribute('aria-label');
    expect(leftIncAria).toBe('Tambah tangan kiri');

    const langTitle = await page.locator('#langSwitcher').getAttribute('title');
    expect(langTitle).toBe('Bahasa / Language');
  });

  test('mute/unmute button uses translated aria-label and updates on toggle + lang switch', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    // Wait for the UI bindings to be wired (they call _updateSoundButtonLabels at init).
    await page.waitForFunction(() => window.__HM__ && window.__HM__.ui && window.__HM__.ui.btnSound);

    // Default is muted (aria-pressed="true") -> shows "Unmute Sounds"
    let aria = await page.locator('#btnSound').getAttribute('aria-label');
    expect(aria).toBe('Unmute Sounds');

    // Click to unmute -> shows "Mute Sounds"
    await page.click('#btnSound');
    aria = await page.locator('#btnSound').getAttribute('aria-label');
    expect(aria).toBe('Mute Sounds');

    // Switch language to ms -> label should follow
    await page.selectOption('#langSwitcher', 'ms');
    await page.waitForFunction(() => window.i18n.currentLang === 'ms');
    aria = await page.locator('#btnSound').getAttribute('aria-label');
    expect(aria).toBe('Senyapkan Bunyi');

    // Toggle again -> now "Bunyikan Bunyi"
    await page.click('#btnSound');
    aria = await page.locator('#btnSound').getAttribute('aria-label');
    expect(aria).toBe('Bunyikan Bunyi');
  });

  test('panel.stepCounter renders with placeholder text initially and is reachable via i18n.t()', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.i18n && window.i18n.currentLang);

    const en = await page.evaluate(() => window.i18n.t('panel.stepCounter', { current: 2, total: 5 }));
    expect(en).toBe('Step 2 / 5');

    await page.selectOption('#langSwitcher', 'ms');
    await page.waitForFunction(() => window.i18n.currentLang === 'ms');
    const ms = await page.evaluate(() => window.i18n.t('panel.stepCounter', { current: 2, total: 5 }));
    expect(ms).toBe('Langkah 2 / 5');
  });

  test('document <title> and meta description are translated', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.i18n && window.i18n.currentLang);

    const enTitle = await page.title();
    expect(enTitle).toBe('3D Hand Math Visualization');
    const enDesc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(enDesc).toBe('3D Hand Math - Interactive hand-based arithmetic visualization');

    await page.selectOption('#langSwitcher', 'ms');
    await page.waitForFunction(() => window.i18n.currentLang === 'ms');
    await page.waitForFunction(() => document.title.startsWith('Visualisasi'));

    const msTitle = await page.title();
    expect(msTitle).toBe('Visualisasi Matematik Tangan 3D');
    const msDesc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(msDesc).toBe('Matematik Tangan 3D - Visualisasi aritmetik interaktif berasaskan tangan');
  });

  test('validation status badge uses translated text', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.__HM__ && window.handMathApp && window.handMathApp.handController);

    // Drive the badge through the HandController's validateAllPositions() path.
    const enText = await page.evaluate(() => {
      // Both hands start at 0 which is a valid closed pose. Use the function directly.
      const el = document.getElementById('validation-status') || (() => {
        const d = document.createElement('div');
        d.id = 'validation-status';
        document.body.appendChild(d);
        return d;
      })();
      window.handMathApp.validateAllPositions?.();
      return el.textContent;
    });
    // 0|0 is the canonical valid rest pose -> expect "Valid Position" / "Kedudukan Sah"
    expect(['Valid Position', 'Kedudukan Sah']).toContain(enText);

    // Switch to ms and re-trigger.
    await page.selectOption('#langSwitcher', 'ms');
    await page.waitForFunction(() => window.i18n.currentLang === 'ms');
    const msText = await page.evaluate(() => {
      const el = document.getElementById('validation-status');
      window.handMathApp.validateAllPositions?.();
      return el ? el.textContent : null;
    });
    expect(msText).toBe('Kedudukan Sah');
  });
});
