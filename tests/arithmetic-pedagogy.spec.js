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

  const walkThrough = async (page, a, b, op) => {
    await page.evaluate(({ a, b, op }) => TEST_API.setProblem({ a, b, op }), { a, b, op });
    const steps = await page.evaluate(() => TEST_API.getState().steps.map(s => s.id));
    while (true) {
      const currentId = await page.evaluate(() => TEST_API.getState().step?.id || null);
      if (!currentId) break;
      await page.click('#btnNext');
      await page.evaluate(() => TEST_API.waitForSettled(500));
    }
    return { steps, target: await page.evaluate(() => TEST_API.getState().steps.at(-1).target) };
  };

  const expectStepFields = async (page, { hasRule, hasRunning, hasWhy }) => {
    const step = await page.evaluate(() => TEST_API.getState().step);
    if (!step) return;
    const check = await page.evaluate(({hasRule, hasRunning, hasWhy}) => {
      // Re-fetch the current step inside the browser
      const s = TEST_API.getState().step;
      if (!s) return null;
      const issues = [];
      if (hasRule && !s.rule) issues.push('missing rule');
      if (!hasRule && s.rule) issues.push('unexpected rule: ' + s.rule);
      if (hasRunning && !s.running) issues.push('missing running');
      if (!hasRunning && s.running) issues.push('unexpected running');
      if (hasWhy && !s.why) issues.push('missing why');
      if (!hasWhy && s.why) issues.push('unexpected why');
      return issues.length ? issues : null;
    }, {hasRule, hasRunning, hasWhy});
    expect(check).toBeNull();
  };

  // ─── Addition examples ───

  // eslint-disable-next-line max-len
  test('26 + 12 → 38: direct add ones (6+2 lower beads have room)', async ({ page }) => {
    const result = await walkThrough(page, 26, 12, '+');
    expect(result.target.left).toBe(3);
    expect(result.target.right).toBe(8);
    expect(result.steps).toContain('a-ones-direct');
  });

  // eslint-disable-next-line max-len
  test('23 + 14 → 37: 5-complement on ones (lower+bR > 4), no carry', async ({ page }) => {
    const result = await walkThrough(page, 23, 14, '+');
    expect(result.target.left).toBe(3);
    expect(result.target.right).toBe(7);
    // 3+4: lowerBeads(3)+bR(4)=7>4 → 5-comp path (need to add 5, remove 1)
    expect(result.steps).toContain('a-ones-five-comp');
    // Verify rule/running/why on the five-comp ones step
    await page.evaluate(() => TEST_API.setProblem({ a: 23, b: 14, op: '+' }));
    const step = await page.evaluate(() => {
      const s = TEST_API.getState().steps;
      return s.find(x => x.id === 'a-ones-five-comp');
    });
    expect(step.rule).toBeTruthy();
    expect(step.running).toMatch(/value/);
    expect(step.why).toBeTruthy();
    // DOM check
    await page.click('#tabArithmetic');
    await page.evaluate(({a,b,op}) => TEST_API.setProblem({a,b,op}), {a:23,b:14,op:'+'});
    await page.waitForTimeout(100);
    // Advance to the 5-comp step (setup + ones, then check the ones step DOM)
    for (let i = 0; i < 2; i++) {
      await page.click('#btnNext');
      await page.evaluate(() => TEST_API.waitForSettled(500));
    }
    // Step at index 1 (a-ones-five-comp) is now complete but still in DOM
    const stepEls = await page.locator('#panelSteps .hm-step');
    const onesStep = stepEls.nth(1);
    await expect(onesStep.locator('.hm-step-rule')).toBeVisible();
    await expect(onesStep.locator('.hm-step-running')).toBeVisible();
    await expect(onesStep.locator('.hm-step-why')).toBeVisible();
    // Why is collapsed by default
    await expect(onesStep.locator('.hm-step-why')).not.toHaveAttribute('open');
  });

  // eslint-disable-next-line max-len
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

  // eslint-disable-next-line max-len
  test('7 + 5 → 12: 10-complement (Big Friend) with carry overlay', async ({ page }) => {
    const result = await walkThrough(page, 7, 5, '+');
    expect(result.target.left).toBe(1);
    expect(result.target.right).toBe(2);
    expect(result.steps).toContain('a-ones-mental-complement');
    // Check that the carry overlay cue fires
    await page.evaluate(() => TEST_API.setProblem({ a: 7, b: 5, op: '+' }));
    await page.evaluate(() => TEST_API.waitForSettled(200));
    // Advance step-by-step to the carry step (index 3 = a-add-tens)
    const stepIds = await page.evaluate(() => TEST_API.getState().steps.map(s => s.id));
    const carryIdx = stepIds.indexOf('a-add-tens');
    expect(carryIdx).toBeGreaterThanOrEqual(0);
    for (let i = 0; i < carryIdx; i++) {
      await page.click('#btnNext');
      await page.evaluate(() => TEST_API.waitForSettled(500));
    }
    // Now at the carry step — click it and check overlay immediately
    await page.click('#btnNext');
    await page.waitForTimeout(100);
    // Check the overlay text was set (the 'on' class may have expired if
    // the count-up animation took >800ms; the textContent persists).
    const overlayText = await page.evaluate(() => {
      return document.getElementById('carryBorrowCue')?.textContent || '';
    });
    expect(overlayText).toBe('Carry 1 ten');
    await page.evaluate(() => TEST_API.waitForSettled(1000));
    // Verify why on the mental-complement step
    await page.evaluate(() => TEST_API.setProblem({ a: 7, b: 5, op: '+' }));
    const step = await page.evaluate(() => {
      const s = TEST_API.getState().steps;
      return s.find(x => x.id === 'a-ones-mental-complement');
    });
    expect(step.why).toMatch(/Big Friend/);
    expect(step.rule).toMatch(/Big Friend/);
  });

  // eslint-disable-next-line max-len
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

  // eslint-disable-next-line max-len
  test('33 − 21 → 12: direct subtract ones (3−1 enough lower beads)', async ({ page }) => {
    const result = await walkThrough(page, 33, 21, '-');
    expect(result.target.left).toBe(1);
    expect(result.target.right).toBe(2);
    expect(result.steps).toContain('s-sub-ones-direct');
  });

  // eslint-disable-next-line max-len
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

  // eslint-disable-next-line max-len
  test('13 − 5 → 8: Borrow + 10-complement, post-borrow tens fixed', async ({ page }) => {
    const result = await walkThrough(page, 13, 5, '-');
    expect(result.target.left).toBe(0);
    expect(result.target.right).toBe(8);
    expect(result.steps).toContain('s-borrow');
    // Check the tens step no longer says "Tens remain 0, no change"
    const tensStep = await page.evaluate(() => {
      const s = TEST_API.getState().steps;
      return s.find(x => x.id === 's-sub-tens');
    });
    expect(tensStep.narration).not.toMatch(/Tens remain 0/);
    // Check for the new post-borrow explanation
    expect(tensStep.narration).toMatch(/lost|stays|kekal|kehilangan/);
    expect(tensStep.why).toBeFalsy(); // tens why is null — no why on tens
    // Verify borrow overlay fires
    await page.evaluate(() => TEST_API.setProblem({ a: 13, b: 5, op: '-' }));
    await page.evaluate(() => TEST_API.waitForSettled(200));
    const borrowIds = await page.evaluate(() => TEST_API.getState().steps.map(s => s.id));
    const borrowIdx = borrowIds.indexOf('s-borrow');
    expect(borrowIdx).toBeGreaterThanOrEqual(0);
    for (let i = 0; i < borrowIdx; i++) {
      await page.click('#btnNext');
      await page.evaluate(() => TEST_API.waitForSettled(500));
    }
    await page.click('#btnNext');
    await page.waitForTimeout(50);
    const borrowOverlay = await page.evaluate(() => {
      const el = document.getElementById('carryBorrowCue');
      return el && el.classList.contains('on') ? el.textContent : null;
    });
    expect(borrowOverlay).toBe('Borrow 1 ten');
    await page.evaluate(() => TEST_API.waitForSettled(1000));
  });

  // eslint-disable-next-line max-len
  test('45 − 12 → 33: 5-comp subtract (thumb only, need Little Friend)', async ({ page }) => {
    const result = await walkThrough(page, 45, 12, '-');
    expect(result.target.left).toBe(3);
    expect(result.target.right).toBe(3);
    // 5-2: lowerBeads(0)+bR(2)=2>0? Actually lowerBeads(0)<bR(2) → five-comp
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

  // eslint-disable-next-line max-len
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
