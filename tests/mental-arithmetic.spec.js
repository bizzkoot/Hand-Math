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

test.describe('Levels 1-5 - Challenge with arithmetic + 5 choices + hand controls', () => {
  // Regression: previously Challenge for L1-5 only showed "Show X on your hands"
  // prompts and never gave an addition/subtraction problem. The 5-choice grid
  // was scoped to L6 only. Now: arithmetic + choices + hand controls all
  // appear together, and the user can answer with either method.
  test('Level 1 challenge: prompt is arithmetic, both hand controls and 5 choices visible', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.addInitScript(() => {
      try { localStorage.setItem('hm_operand_level', '1'); localStorage.setItem('hm_challenge_tier', '0'); } catch (_) {}
    });
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.handMathApp && window.TEST_API, { timeout: 30000 });

    await page.click('#tabChallenge');
    await page.click('#btnChallengeStart');

    // The prompt should be arithmetic, not "Show X" - must contain + or −
    const prompt = (await page.textContent('#challengePrompt')) || '';
    expect(prompt).toMatch(/[+−]/);

    // 5 choice buttons should be visible
    const buttons = page.locator('#mentalChoicesChallenge .hm-mental-choice-btn');
    await expect(buttons).toHaveCount(5);

    // Hand-based controls (submit button + feedback) should still be visible
    await expect(page.locator('#btnChallengeSubmit')).toBeVisible();
    await expect(page.locator('#challengeFeedback')).toBeVisible();

    // The operand level cap (L1 = max 20) must be respected: each operand
    // appears in the prompt and must be <= 20. target = a ± b must be <= 40
    // for addition or a > b for subtraction.
    const target = await page.evaluate(() => window.__HM__.ui.challenge.target);
    const sample = await page.evaluate(() => {
      const out = [];
      for (let i = 0; i < 10; i++) {
        const ui = window.__HM__.ui;
        // Force a new question by simulating the next() call path
        ui.challenge.currentRound--;
        ui._loadNextChallengeQuestion();
        const p = (document.getElementById('challengePrompt').textContent || '').trim();
        const t = ui.challenge.target;
        out.push({ prompt: p, target: t });
      }
      return out;
    });
    for (const s of sample) {
      const m = s.prompt.match(/(\d+)\s*([+−])\s*(\d+)/);
      expect(m).not.toBeNull();
      const a = parseInt(m[1], 10);
      const b = parseInt(m[3], 10);
      const op = m[2];
      expect(a).toBeLessThanOrEqual(20);
      expect(b).toBeLessThanOrEqual(20);
      if (op === '+') {
        expect(a + b).toBe(s.target);
        expect(a + b).toBeLessThanOrEqual(40);
      } else {
        expect(a - b).toBe(s.target);
        expect(a).toBeGreaterThan(b);
      }
    }

    await page.evaluate(() => { try { localStorage.removeItem('hm_operand_level'); localStorage.removeItem('hm_challenge_tier'); } catch (_) {} });
  });

  test('Level 5 challenge: full 0-99 range, both answer methods available', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.addInitScript(() => {
      try { localStorage.setItem('hm_operand_level', '5'); localStorage.setItem('hm_challenge_tier', '2'); } catch (_) {}
    });
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.handMathApp && window.TEST_API, { timeout: 30000 });

    await page.click('#tabChallenge');
    await page.click('#btnChallengeStart');

    // The prompt must be arithmetic regardless of saved tier
    const prompt = (await page.textContent('#challengePrompt')) || '';
    expect(prompt).toMatch(/[+−]/);

    // 5 choice buttons visible
    await expect(page.locator('#mentalChoicesChallenge .hm-mental-choice-btn')).toHaveCount(5);

    // Click correct answer advances to next question
    const target = await page.evaluate(() => window.__HM__.ui.challenge.target);
    const correctBtn = page.locator('#mentalChoicesChallenge .hm-mental-choice-btn').filter({ hasText: new RegExp(`^${target}$`) }).first();
    await correctBtn.click();

    await expect(page.locator('#challengeMessage')).toHaveClass(/success/);

    // Wait for next question
    await page.waitForFunction(
      (prevTarget) => window.__HM__.ui.challenge.target !== prevTarget && window.__HM__.ui.challenge.target !== null,
      target,
      { timeout: 3000 }
    );

    await page.evaluate(() => { try { localStorage.removeItem('hm_operand_level'); localStorage.removeItem('hm_challenge_tier'); } catch (_) {} });
  });

  test('Level 1-5 challenge: clicking a wrong choice decrements attempts and lets user try again', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.addInitScript(() => {
      try { localStorage.setItem('hm_operand_level', '1'); localStorage.setItem('hm_challenge_tier', '0'); } catch (_) {}
    });
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.handMathApp && window.TEST_API, { timeout: 30000 });

    await page.click('#tabChallenge');
    await page.click('#btnChallengeStart');

    // Pick a definitely-wrong button (one that isn't the target)
    const incorrectVal = await page.evaluate(() => {
      const ui = window.__HM__.ui;
      const target = ui.challenge.target;
      const buttons = Array.from(document.querySelectorAll('#mentalChoicesChallenge .hm-mental-choice-btn'));
      const wrong = buttons.find(b => parseInt(b.textContent, 10) !== target);
      if (!wrong) return null;
      wrong.click();
      return parseInt(wrong.textContent, 10);
    });
    expect(incorrectVal).not.toBeNull();

    // The error feedback should appear
    await expect(page.locator('#challengeMessage')).toHaveClass(/error/);
    // Attempts counter should now show 2 (3 - 1 wrong)
    await expect(page.locator('#challengeAttempts')).toContainText(/2/);

    // Verify correct button is still enabled
    const targetVal = await page.evaluate(() => window.__HM__.ui.challenge.target);
    const correctBtn = page.locator('#mentalChoicesChallenge .hm-mental-choice-btn').filter({ hasText: new RegExp(`^${targetVal}$`) }).first();
    await expect(correctBtn).not.toBeDisabled();

    // Clicking the correct button should now succeed
    await correctBtn.click();
    await expect(page.locator('#challengeMessage')).toHaveClass(/success/);

    await page.evaluate(() => { try { localStorage.removeItem('hm_operand_level'); localStorage.removeItem('hm_challenge_tier'); } catch (_) {} });
  });

  // End-to-end stress test: actually click through the Challenge UI (not
  // just call internal APIs) and verify operand range for every level. This
  // is the regression guard for "Challenge operands don't respect the
  // Global Level" — whether the bug is in the generator or in a stale
  // service worker cache, this test will fail.
  for (const level of [1, 2, 3, 4, 5]) {
    const opMax = level * 20; // L1=20, L2=40, L3=60, L4=80, L5=99 (clamped)
    const expectedOpMax = Math.min(opMax, 99);

    test(`Level ${level} challenge (E2E): operands respect opMax=${expectedOpMax}`, async ({ page }) => {
      const local = process.env.HM_LOCAL_FILE === '1';
      await page.addInitScript((lvl) => {
        try {
          localStorage.setItem('hm_operand_level', String(lvl));
          localStorage.setItem('hm_challenge_tier', '0');
          // Clear any prior session so start is clean
          localStorage.removeItem('hm_challenge_unlock_progress');
          localStorage.removeItem('hm_challenge_total_gems');
        } catch (_) {}
      }, level);
      await page.goto(local ? 'index.html' : '/index.html');
      await page.waitForFunction(() => window.handMathApp && window.TEST_API, { timeout: 30000 });

      await page.click('#tabChallenge');
      await page.click('#btnChallengeStart');

      // Click through up to 20 questions (or until session ends) by
      // picking the correct multiple-choice button each time.
      const samples = [];
      for (let i = 0; i < 20; i++) {
        const target = await page.evaluate(() => window.__HM__.ui.challenge.target);
        if (target === null) break; // session ended
        const prompt = (await page.textContent('#challengePrompt')) || '';
        samples.push({ prompt, target });
        // Click the correct button
        const correctBtn = page
          .locator('#mentalChoicesChallenge .hm-mental-choice-btn')
          .filter({ hasText: new RegExp(`^${target}$`) })
          .first();
        await correctBtn.click().catch(() => {});
        // Wait for the next question (target changes) or end screen
        await page.waitForFunction(
          (prev) => window.__HM__.ui.challenge.target !== prev || document.getElementById('challengeEndScreen') && !document.getElementById('challengeEndScreen').hidden,
          target,
          { timeout: 3000 }
        ).catch(() => {});
        // If end screen appears, click "Play Again" to keep going
        const endVisible = await page.evaluate(() => {
          const e = document.getElementById('challengeEndScreen');
          return e && !e.hidden;
        });
        if (endVisible) {
          await page.click('#btnChallengePlayAgain').catch(() => {});
          await page.waitForTimeout(200);
        }
      }

      expect(samples.length).toBeGreaterThan(0);
      for (const s of samples) {
        // Every prompt must be arithmetic, never "Show X"
        expect(s.prompt).toMatch(/[+−]/);
        const m = s.prompt.match(/(\d+)\s*([+−])\s*(\d+)/);
        expect(m).not.toBeNull();
        const a = parseInt(m[1], 10);
        const b = parseInt(m[3], 10);
        const op = m[2];
        // Operands must be within the level's opMax
        expect(a).toBeLessThanOrEqual(expectedOpMax);
        expect(b).toBeLessThanOrEqual(expectedOpMax);
        expect(s.target).toBeLessThanOrEqual(expectedOpMax);
        // And the target must actually equal a ± b
        if (op === '+') {
          expect(a + b).toBe(s.target);
        } else {
          expect(a - b).toBe(s.target);
        }
      }

      await page.evaluate(() => { try { localStorage.removeItem('hm_operand_level'); localStorage.removeItem('hm_challenge_tier'); } catch (_) {} });
    });
  }
});
