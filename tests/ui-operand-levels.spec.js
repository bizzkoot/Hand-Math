// @ts-check
const { test, expect } = require('@playwright/test');

// Issue #1 (rebalanced): 5-level operand range system (1..5) covering
// 1-20, 1-40, 1-60, 1-80, 1-99. Lives in a top-center badge in the 3D scene.
// Tests below cover rendering, click-to-open menu, level change persistence,
// arithmetic generator range clamping, challenge generator range clamping,
// and bilingual labels.

test.describe('Teaching UI - Operand Range Levels (Issue #1, 5 levels)', () => {
  test('badge renders with default L1 (1-20) and is clickable', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.addInitScript(() => {
      try { localStorage.removeItem('hm_operand_level'); } catch (_) {}
    });
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.handController, { timeout: 30000 });
    await page.waitForSelector('#operandLevelBadge');

    // Default level = 1, range = 1-20
    await expect(page.locator('#operandLevelLabel')).toContainText('Level 1');
    await expect(page.locator('#operandLevelRange')).toHaveText('1\u201320');
    await expect(page.locator('#operandLevelBadge')).toHaveAttribute('data-level', '1');
    await expect(page.locator('#operandLevelBadge')).toHaveAttribute('aria-expanded', 'false');

    // Click to open menu
    await page.click('#operandLevelBadge');
    await expect(page.locator('#operandLevelBadge')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#operandLevelMenu')).toBeVisible();

    // 5 options
    const options = page.locator('#operandLevelMenu .hm-oplevel-option');
    await expect(options).toHaveCount(5);

    // First option active
    await expect(options.nth(0)).toHaveClass(/is-active/);
    await expect(options.nth(0)).toHaveAttribute('aria-selected', 'true');

    // Outside click closes
    await page.click('body', { position: { x: 600, y: 400 } });
    await expect(page.locator('#operandLevelMenu')).toBeHidden();
    await expect(page.locator('#operandLevelBadge')).toHaveAttribute('aria-expanded', 'false');
  });

  test('selecting a level updates badge, persists to localStorage, and reloads', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.addInitScript(() => {
      try { localStorage.removeItem('hm_operand_level'); } catch (_) {}
    });
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.handController, { timeout: 30000 });

    // Open menu, select L3 (1-60)
    await page.click('#operandLevelBadge');
    await page.click('#operandLevelMenu .hm-oplevel-option[data-level="3"]');

    await expect(page.locator('#operandLevelLabel')).toContainText('Level 3');
    await expect(page.locator('#operandLevelRange')).toHaveText('1\u201360');
    await expect(page.locator('#operandLevelBadge')).toHaveAttribute('data-level', '3');

    // localStorage persisted
    const stored = await page.evaluate(() => localStorage.getItem('hm_operand_level'));
    expect(stored).toBe('3');

    // Re-register the init script BEFORE reload so it re-runs and ensures
    // localStorage is still '3' (in case the click handler was a no-op).
    await page.addInitScript(() => {
      try { localStorage.setItem('hm_operand_level', '3'); } catch (_) {}
    });

    // Reload and assert the same level is restored
    await page.reload();
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.handController, { timeout: 30000 });
    await page.waitForSelector('#operandLevelBadge');
    await expect(page.locator('#operandLevelLabel')).toContainText('Level 3');
    await expect(page.locator('#operandLevelRange')).toHaveText('1\u201360');

    // Cleanup: reset to L1
    await page.evaluate(() => localStorage.removeItem('hm_operand_level'));
  });

  test('practice generator respects operand level 1 (max 20)', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.addInitScript(() => {
      try { localStorage.setItem('hm_operand_level', '1'); } catch (_) {}
    });
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.handController && window.TEST_API, { timeout: 30000 });
    await page.waitForSelector('#teachingPanel');

    await page.click('#tabArithmetic');

    // Sample 20 random problems; each operand must be <= 20, and sum <= 40
    const samples = await page.evaluate(() => {
      const out = [];
      for (let i = 0; i < 20; i++) {
        const prob = window.__HM__.ui._randomValidPractice();
        out.push(prob);
      }
      return out;
    });
    for (const p of samples) {
      expect(p.a).toBeGreaterThanOrEqual(1);
      expect(p.a).toBeLessThanOrEqual(20);
      expect(p.b).toBeGreaterThanOrEqual(1);
      expect(p.b).toBeLessThanOrEqual(20);
      if (p.op === '+') {
        expect(p.a + p.b).toBeLessThanOrEqual(40);
      } else {
        expect(p.a).toBeGreaterThan(p.b);
      }
    }

    await page.evaluate(() => localStorage.removeItem('hm_operand_level'));
  });

  test('practice generator respects operand level 5 (max 99)', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.addInitScript(() => {
      try { localStorage.setItem('hm_operand_level', '5'); } catch (_) {}
    });
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.handController && window.TEST_API, { timeout: 30000 });

    const samples = await page.evaluate(() => {
      const out = [];
      for (let i = 0; i < 20; i++) {
        const prob = window.__HM__.ui._randomValidPractice();
        out.push(prob);
      }
      return out;
    });
    for (const p of samples) {
      expect(p.a).toBeGreaterThanOrEqual(1);
      expect(p.a).toBeLessThanOrEqual(99);
      expect(p.b).toBeGreaterThanOrEqual(1);
      expect(p.b).toBeLessThanOrEqual(99);
      if (p.op === '+') {
        expect(p.a + p.b).toBeLessThanOrEqual(99);
      } else {
        expect(p.a).toBeGreaterThan(p.b);
      }
    }

    await page.evaluate(() => localStorage.removeItem('hm_operand_level'));
  });

  test('changing level resets current problem and clamps new operand range', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.addInitScript(() => {
      try { localStorage.setItem('hm_operand_level', '5'); } catch (_) {}
    });
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.handController && window.TEST_API, { timeout: 30000 });
    await page.waitForSelector('#teachingPanel');

    await page.click('#tabArithmetic');

    // At L5: set a high-number problem directly
    await page.evaluate(() => TEST_API.setProblem({ a: 87, b: 12, op: '+' }));
    const before = await page.evaluate(() => TEST_API.getState().problem);
    expect(before.a).toBe(87);
    expect(before.b).toBe(12);

    // Switch to L1
    await page.click('#operandLevelBadge');
    await page.click('#operandLevelMenu .hm-oplevel-option[data-level="1"]');

    // Problem should have been regenerated and is now within L1 range
    const after = await page.evaluate(() => TEST_API.getState().problem);
    expect(after.a).toBeLessThanOrEqual(20);
    expect(after.b).toBeLessThanOrEqual(20);

    await page.evaluate(() => localStorage.removeItem('hm_operand_level'));
  });

  test('escape key closes the operand-level menu', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.addInitScript(() => {
      try { localStorage.removeItem('hm_operand_level'); } catch (_) {}
    });
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.handController, { timeout: 30000 });
    await page.waitForSelector('#operandLevelBadge');

    await page.click('#operandLevelBadge');
    await expect(page.locator('#operandLevelMenu')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#operandLevelMenu')).toBeHidden();
  });

  test('bilingual labels: switching to Malay updates badge and menu text', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.addInitScript(() => {
      try { localStorage.removeItem('hm_operand_level'); } catch (_) {}
    });
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.handController && window.i18n, { timeout: 30000 });
    await page.waitForSelector('#operandLevelBadge');

    // English first
    await expect(page.locator('#operandLevelLabel')).toContainText(/Level 1/);
    await page.click('#operandLevelBadge');
    await expect(page.locator('#operandLevelMenu .hm-oplevel-option').nth(0)).toContainText(/Level 1/);
    await page.keyboard.press('Escape');

    // Switch to Malay
    await page.selectOption('#langSwitcher', 'ms');
    await page.waitForFunction(() => window.i18n.currentLang === 'ms');
    await expect(page.locator('#operandLevelLabel')).toContainText(/Tahap 1/);
    await page.click('#operandLevelBadge');
    await expect(page.locator('#operandLevelMenu .hm-oplevel-option').nth(0)).toContainText(/Tahap 1/);

    // Cleanup
    await page.evaluate(() => localStorage.removeItem('hm_operand_level'));
  });

  test('Challenge generator respects operand level 1 (target ≤ 20)', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.addInitScript(() => {
      try { localStorage.setItem('hm_operand_level', '1'); localStorage.setItem('hm_challenge_tier', '0'); } catch (_) {}
    });
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.handController && window.TEST_API, { timeout: 30000 });

    // Force the tier via the public challenge state
    await page.evaluate(() => { window.__HM__.ui.challenge.difficultyTier = 1; window.__HM__.ui._applyTierSettings(); });
    const samples = await page.evaluate(() => {
      const out = [];
      for (let i = 0; i < 20; i++) {
        const p = window.__HM__.ui._generateChallengeProblem(1);
        out.push(p);
      }
      return out;
    });
    // Tier 1 (two-hand, no carry/borrow) at L1: opMax=20, so target ∈ [10, 20]
    for (const p of samples) {
      expect(p.target).toBeGreaterThanOrEqual(10);
      expect(p.target).toBeLessThanOrEqual(20);
    }

    await page.evaluate(() => localStorage.removeItem('hm_operand_level'));
  });

  test('Challenge generator respects operand level 5 (full range)', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.addInitScript(() => {
      try { localStorage.setItem('hm_operand_level', '5'); } catch (_) {}
    });
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.handController && window.TEST_API, { timeout: 30000 });

    // Tier 2 (carry/borrow arithmetic)
    const samples = await page.evaluate(() => {
      const out = [];
      for (let i = 0; i < 30; i++) {
        const p = window.__HM__.ui._generateChallengeProblem(2);
        out.push(p);
      }
      return out;
    });
    for (const p of samples) {
      expect(p.target).toBeGreaterThanOrEqual(1);
      expect(p.target).toBeLessThanOrEqual(99);
    }

    await page.evaluate(() => localStorage.removeItem('hm_operand_level'));
  });

  test('respects the saved operand level on initial page load without reselection', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.addInitScript(() => {
      try { localStorage.setItem('hm_operand_level', '1'); } catch (_) {}
    });
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.handController && window.TEST_API, { timeout: 30000 });

    const initialNum = await page.evaluate(() => window.__HM__.orchestrator.problem.a);
    expect(initialNum).toBeGreaterThanOrEqual(1);
    expect(initialNum).toBeLessThanOrEqual(20);

    await page.evaluate(() => localStorage.removeItem('hm_operand_level'));
  });
});
