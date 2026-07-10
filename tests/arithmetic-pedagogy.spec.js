// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Aloha-style pedagogy — 7 worked examples', () => {

  test.beforeEach(async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.handController && window.TEST_API, { timeout: 30000 });
    await page.waitForSelector('#teachingPanel');
    await page.click('#tabArithmetic');
  });

  const walkThrough = async (page, a, b, op, settleMs = 300) => {
    await page.evaluate(({ a, b, op }) => TEST_API.setProblem({ a, b, op }), { a, b, op });
    const steps = await page.evaluate(() => TEST_API.getState().steps.map(s => s.id));
    while (true) {
      const currentId = await page.evaluate(() => TEST_API.getState().step?.id || null);
      if (!currentId) break;
      await page.click('#btnNext');
      await page.evaluate(() => TEST_API.waitForSettled(300));
    }
    return { steps, target: await page.evaluate(() => TEST_API.getState().steps.at(-1).target) };
  };

  // ─── Addition examples ───

  test('26 + 12 → 38: direct add ones (6+2 lower beads have room)', async ({ page }) => {
    const result = await walkThrough(page, 26, 12, '+');
    expect(result.target.left).toBe(3);
    expect(result.target.right).toBe(8);
    expect(result.steps).toContain('a-ones-direct');
  });

  test('23 + 14 → 37: 5-complement on ones (lower+bR > 4), no carry', async ({ page }) => {
    await page.evaluate(() => TEST_API.setProblem({ a: 23, b: 14, op: '+' }));
    
    // 1. Verify step data in memory state
    const { steps, stepObj } = await page.evaluate(() => {
      const s = TEST_API.getState().steps;
      return {
        steps: s.map(x => x.id),
        stepObj: s.find(x => x.id === 'a-ones-five-comp')
      };
    });
    expect(steps).toContain('a-ones-five-comp');
    expect(stepObj.rule).toBeTruthy();
    expect(stepObj.running).toMatch(/value/);
    expect(stepObj.why).toBeTruthy();

    // 2. Advance to the 5-comp ones step (index 1) and check DOM
    for (let i = 0; i < 2; i++) {
      await page.click('#btnNext');
      await page.evaluate(() => TEST_API.waitForSettled(300));
    }
    const onesStep = page.locator('#panelSteps .hm-step').nth(1);
    await expect(onesStep.locator('.hm-step-rule')).toBeVisible();
    await expect(onesStep.locator('.hm-step-running')).toBeVisible();
    await expect(onesStep.locator('.hm-step-why')).toBeVisible();
    await expect(onesStep.locator('.hm-step-why')).not.toHaveAttribute('open');

    // 3. Complete and check target
    while (true) {
      const currentId = await page.evaluate(() => TEST_API.getState().step?.id || null);
      if (!currentId) break;
      await page.click('#btnNext');
      await page.evaluate(() => TEST_API.waitForSettled(150));
    }
    const final = await page.evaluate(() => TEST_API.getState().steps.at(-1).target);
    expect(final.left).toBe(3);
    expect(final.right).toBe(7);
  });

  test('4 + 3 → 7: 5-complement (Little Friend) on ones', async ({ page }) => {
    const result = await walkThrough(page, 4, 3, '+');
    expect(result.target.left).toBe(0);
    expect(result.target.right).toBe(7);
    expect(result.steps).toContain('a-ones-five-comp');
    
    const step = await page.evaluate(() => {
      const s = TEST_API.getState().steps;
      return s.find(x => x.id === 'a-ones-five-comp');
    });
    expect(step.rule).toMatch(/Little Friend|Kawan Kecil|Friend/);
    expect(step.running).toMatch(/7$/);
  });

  test('7 + 5 → 12: 10-complement (Big Friend) with carry overlay', async ({ page }) => {
    await page.evaluate(() => TEST_API.setProblem({ a: 7, b: 5, op: '+' }));
    
    const mentalStep = await page.evaluate(() => {
      return TEST_API.getState().steps.find(x => x.id === 'a-ones-mental-complement');
    });
    expect(mentalStep.why).toMatch(/Big Friend/);
    expect(mentalStep.rule).toMatch(/Big Friend/);

    // Advance until we reach the carry step, then assert cue immediately
    while (true) {
      const currentId = await page.evaluate(() => TEST_API.getState().step?.id || null);
      if (currentId === 'a-add-tens') {
        // Trigger the carry step
        await page.click('#btnNext');
        // Cue is transient (~800ms); assert quickly
        await expect(page.locator('#carryBorrowCue')).toHaveText('Carry 1 ten', { timeout: 1500 });
        await page.evaluate(() => TEST_API.waitForSettled(300));
        break;
      }
      await page.click('#btnNext');
      await page.evaluate(() => TEST_API.waitForSettled(300));
    }

    // Walk to the end
    while (true) {
      const currentId = await page.evaluate(() => TEST_API.getState().step?.id || null);
      if (!currentId) break;
      await page.click('#btnNext');
      await page.evaluate(() => TEST_API.waitForSettled(150));
    }
    const final = await page.evaluate(() => TEST_API.getState().steps.at(-1).target);
    expect(final.left).toBe(1);
    expect(final.right).toBe(2);
  });

  test('8 + 6 → 14: 10-complement with Big Friend', async ({ page }) => {
    const result = await walkThrough(page, 8, 6, '+');
    expect(result.target.left).toBe(1);
    expect(result.target.right).toBe(4);
    const step = await page.evaluate(() => {
      const s = TEST_API.getState().steps;
      return s.find(x => x.id === 'a-ones-mental-complement');
    });
    expect(step.rule).toMatch(/Big Friend|Kawan Besar/);
    expect(step.running).toMatch(/overflow/);
  });

  // ─── Subtraction examples ───

  test('33 − 21 → 12: direct subtract ones (3−1 enough lower beads)', async ({ page }) => {
    const result = await walkThrough(page, 33, 21, '-');
    expect(result.target.left).toBe(1);
    expect(result.target.right).toBe(2);
    expect(result.steps).toContain('s-sub-ones-direct');
  });

  test('5 − 3 → 2: 5-complement (Little Friend) subtraction', async ({ page }) => {
    const result = await walkThrough(page, 5, 3, '-');
    expect(result.target.left).toBe(0);
    expect(result.target.right).toBe(2);
    expect(result.steps).toContain('s-sub-ones-five-comp');
    const step = await page.evaluate(() => {
      const s = TEST_API.getState().steps;
      return s.find(x => x.id === 's-sub-ones-five-comp');
    });
    expect(step.rule).toMatch(/Little Friend|Kawan Kecil/);
    expect(step.running).toMatch(/value/);
  });

  test('13 − 5 → 8: Borrow + 10-complement, post-borrow tens fixed', async ({ page }) => {
    await page.evaluate(() => TEST_API.setProblem({ a: 13, b: 5, op: '-' }));
    
    const stepIds = await page.evaluate(() => TEST_API.getState().steps.map(s => s.id));
    expect(stepIds).toContain('s-borrow');

    const tensStep = await page.evaluate(() => {
      return TEST_API.getState().steps.find(x => x.id === 's-sub-tens');
    });
    expect(tensStep.narration).not.toMatch(/Tens remain 0/);
    expect(tensStep.narration).toMatch(/lost|stays|kekal|kehilangan/);
    expect(tensStep.why).toBeFalsy();

    // Advance until we reach the borrow step, then assert cue immediately
    while (true) {
      const currentId = await page.evaluate(() => TEST_API.getState().step?.id || null);
      if (currentId === 's-borrow') {
        // Trigger the borrow step
        await page.click('#btnNext');
        // Cue is transient (~800ms); assert quickly
        await expect(page.locator('#carryBorrowCue')).toHaveText('Borrow 1 ten', { timeout: 1500 });
        await page.evaluate(() => TEST_API.waitForSettled(300));
        break;
      }
      await page.click('#btnNext');
      await page.evaluate(() => TEST_API.waitForSettled(300));
    }

    while (true) {
      const currentId = await page.evaluate(() => TEST_API.getState().step?.id || null);
      if (!currentId) break;
      await page.click('#btnNext');
      await page.evaluate(() => TEST_API.waitForSettled(150));
    }
    const final = await page.evaluate(() => TEST_API.getState().steps.at(-1).target);
    expect(final.left).toBe(0);
    expect(final.right).toBe(8);
  });

  test('45 − 12 → 33: 5-comp subtract (thumb only, need Little Friend)', async ({ page }) => {
    const result = await walkThrough(page, 45, 12, '-');
    expect(result.target.left).toBe(3);
    expect(result.target.right).toBe(3);
    expect(result.steps).toContain('s-sub-ones-five-comp');
    const step = await page.evaluate(() => {
      const s = TEST_API.getState().steps;
      return s.find(x => x.id === 's-sub-ones-five-comp');
    });
    expect(step.rule).toBeTruthy();
    expect(step.running).toBeTruthy();
  });

  // ─── Language switch — verify Malay friends terminology ───

  test('4+3 shows Kawan Kecil in MS language', async ({ page }) => {
    await page.selectOption('#langSwitcher', 'ms');
    await page.waitForFunction(() => window.i18n.currentLang === 'ms');
    await page.evaluate(() => TEST_API.setProblem({ a: 4, b: 3, op: '+' }));
    const step = await page.evaluate(() => {
      const s = TEST_API.getState().steps;
      return s.find(x => x.id === 'a-ones-five-comp');
    });
    expect(step.rule).toMatch(/Kawan Kecil/);
    expect(step.why).toMatch(/Kawan Kecil/);
  });

  test('7+5 shows Kawan Besar in MS language', async ({ page }) => {
    await page.selectOption('#langSwitcher', 'ms');
    await page.waitForFunction(() => window.i18n.currentLang === 'ms');
    await page.evaluate(() => TEST_API.setProblem({ a: 7, b: 5, op: '+' }));
    const step = await page.evaluate(() => {
      const s = TEST_API.getState().steps;
      return s.find(x => x.id === 'a-ones-mental-complement');
    });
    expect(step.rule).toMatch(/Kawan Besar/);
    expect(step.why).toMatch(/Kawan Besar/);
  });
});
