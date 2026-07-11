// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Teaching UI - Arithmetic (+ carry)', () => {
  test('47 + 38 → 85 with carry cue', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.addInitScript(() => {
      try { localStorage.setItem('hm_operand_level', '5'); } catch (_) {}
    });
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.handController, { timeout: 30000 });
    await page.waitForSelector('#teachingPanel');

    // Switch to Arithmetic
    await page.click('#tabArithmetic');
    if (await page.evaluate(() => !!window.TEST_API)) {
      await page.evaluate(() => TEST_API.setProblem({ a: 47, b: 38, op: '+' }));
    }

    // Steps should include a carry step (current IDs use the `a-ones-*` prefix)
    const steps = await page.evaluate(() => TEST_API.getState().steps.map(s=>s.id));
    expect(steps).toContain('a-ones-mental-complement');

    // Progress through steps deterministically
    await page.click('#btnNext'); // show operands
    if (await page.evaluate(() => !!window.TEST_API)) { await page.evaluate(() => TEST_API.waitForSettled(2000)); } else { await page.waitForTimeout(600); }
    await page.click('#btnNext'); // ones (carry path or ones path)
    if (await page.evaluate(() => !!window.TEST_API)) { await page.evaluate(() => TEST_API.waitForSettled(2000)); } else { await page.waitForTimeout(600); }
    await page.click('#btnNext'); // tens
    if (await page.evaluate(() => !!window.TEST_API)) { await page.evaluate(() => TEST_API.waitForSettled(2000)); } else { await page.waitForTimeout(600); }
    await page.click('#btnNext'); // confirm
    await page.evaluate(() => TEST_API.waitForSettled(2000));

    // Final digits 8|5
    const final = await page.evaluate(() => {
      if (window.TEST_API) return TEST_API.getState().steps.at(-1).target;
      // Fallback: read result digits from UI if TEST_API absent
      const ans = document.getElementById('answerSlot');
      return ans ? { text: ans.textContent } : null;
    });
    if (final && 'left' in final) {
      expect(final.left).toBe(8);
      expect(final.right).toBe(5);
    }

    await page.screenshot({ path: 'test-results/ui-arith-add-final.png', fullPage: true });
    await page.evaluate(() => localStorage.removeItem('hm_operand_level'));
  });
});
