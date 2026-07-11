// @ts-check
const { test, expect } = require('@playwright/test');

// Phone-portrait layout: Tutorial and Arithmetic modes gain a step counter
// in the heading row, hide the long static rule text behind an info (i)
// button, and render the op-switch as a segmented pill under the equation.

const PHONE_SIZES = [
  { name: 'iphone-se', width: 375, height: 667 },
  { name: 'iphone-14', width: 390, height: 844 },
];

test.describe('Teaching UI - Phone-portrait panel layout (Tutorial / Arithmetic)', () => {
  for (const size of PHONE_SIZES) {
    test(`${size.name}: hides static rule text, shows step counter, merges controls`, async ({ page }) => {
      const local = process.env.HM_LOCAL_FILE === '1';
      await page.setViewportSize({ width: size.width, height: size.height });
      await page.goto(local ? 'index.html' : '/index.html');
      await page.waitForFunction(
        () => window.handMathApp && window.handMathApp.handController && window.__HM__ && window.__HM__.ui,
        { timeout: 30000 }
      );

      // --- Tutorial mode ---
      await page.click('#tabTutorial');
      await page.waitForTimeout(300);

      // (1) The static rule text (question + explanation) is hidden by default
      await expect(page.locator('#panelQuestion')).toBeHidden();
      await expect(page.locator('#panelExplanation')).toBeHidden();

      // (2) The step counter is visible and shows "Step 1 / N" (Tutorial has 4 steps)
      const counter = page.locator('#panelStepCounter');
      await expect(counter).toBeVisible();
      await expect(counter).toHaveText(/Step\s+1\s*\/\s*4/);

      // (3) The info button is visible
      await expect(page.locator('#panelInfoBtn')).toBeVisible();

      // (4) Tapping the info button reveals the static text
      await page.click('#panelInfoBtn');
      await expect(page.locator('#teachingPanel')).toHaveClass(/is-info-open/);
      await expect(page.locator('#panelQuestion')).toBeVisible();
      await expect(page.locator('#panelExplanation')).toBeVisible();
      await expect(page.locator('#panelInfoBtn')).toHaveAttribute('aria-expanded', 'true');

      // (5) Tapping outside (on the scene) hides it again
      await page.click('#scene', { position: { x: 150, y: 150 } });
      await expect(page.locator('#teachingPanel')).not.toHaveClass(/is-info-open/);
      await expect(page.locator('#panelQuestion')).toBeHidden();
      await expect(page.locator('#panelExplanation')).toBeHidden();

      // (6) The steps list has a meaningful height (was 50 px in the old design)
      const stepsBox = await page.locator('#panelSteps').boundingBox();
      expect(stepsBox?.height).toBeGreaterThanOrEqual(100);

      // (7) No [+] / [−] controls leak into the bottom controls row
      // (the op-switch is hidden in Tutorial mode, but verify it's not
      // sitting next to Back / Next / New on phone)
      const opSwitchVisible = await page.locator('.hm-op-switch').isVisible();
      expect(opSwitchVisible).toBe(false);

      // --- Arithmetic mode ---
      await page.click('#tabArithmetic');
      await page.waitForTimeout(400);

      // (8) The equation card is shown
      await expect(page.locator('#arithPrompt')).toBeVisible();

      // (9) The op-switch is rendered as a pill (rounded ends)
      const addBtn = page.locator('#btnAdd');
      const subBtn = page.locator('#btnSub');
      await expect(addBtn).toBeVisible();
      await expect(subBtn).toBeVisible();
      const addRadius = await addBtn.evaluate(el => getComputedStyle(el).borderRadius);
      const subRadius = await subBtn.evaluate(el => getComputedStyle(el).borderRadius);
      // Each button is a small segment of a pill, so its border-radius
      // should be a non-zero rounded value (the pill outer container is
      // 999px, but the active button is the fill so it inherits the pill
      // shape; on phone we set .hm-btn-tab { border-radius: 999px }).
      expect(parseFloat(addRadius)).toBeGreaterThan(8);
      expect(parseFloat(subRadius)).toBeGreaterThan(8);

      // (10) The op-switch now lives in the heading row, ABOVE the
      // equation. Visually, it should be in the same row as the title
      // (i.e. its y is within the heading row's bottom).
      const headBox  = await page.locator('.hm-panel-head').boundingBox();
      const opBox    = await page.locator('.hm-op-switch').boundingBox();
      const arithBox = await page.locator('#arithPrompt').boundingBox();
      const stepsBoxA = await page.locator('#panelSteps').boundingBox();
      // op-switch is in the heading row (above the equation)
      expect(opBox.y).toBeLessThan(arithBox.y);
      // and the heading row is above the equation
      expect(headBox.y).toBeLessThan(arithBox.y);
      // equation is above the steps
      expect(arithBox.y).toBeLessThan(stepsBoxA.y);
      // op-switch shares the heading row (its y is within the head box)
      expect(opBox.y).toBeGreaterThanOrEqual(headBox.y);
      expect(opBox.y + opBox.height).toBeLessThanOrEqual(headBox.y + headBox.height + 1);

      // (11) The step counter is visible in arithmetic too
      const counterA = page.locator('#panelStepCounter');
      await expect(counterA).toBeVisible();
      // Arithmetic steps vary by problem; just confirm the format.
      await expect(counterA).toHaveText(/Step\s+\d+\s*\/\s*\d+/);

      // (12) The steps list is now meaningfully tall
      expect(stepsBoxA?.height).toBeGreaterThanOrEqual(100);

      // (13) The controls row contains only Back / Next / New
      // (no [+] / [−] sitting next to them, since the op-switch was
      // moved to the heading row).
      const backBox  = await page.locator('#btnPrev').boundingBox();
      const nextBox  = await page.locator('#btnNext').boundingBox();
      const newBox   = await page.locator('#btnNew').boundingBox();
      // All three should be roughly on the same horizontal line (within 16 px)
      const ys = [backBox.y, nextBox.y, newBox.y];
      const yMin = Math.min(...ys);
      const yMax = Math.max(...ys);
      expect(yMax - yMin).toBeLessThanOrEqual(16);
      // The op-switch is NOT in the same row as Back/Next/New
      expect(opBox.y + opBox.height).toBeLessThan(backBox.y);

      // (14) Tapping the info button toggles the rule text in arithmetic too
      await page.click('#panelInfoBtn');
      await expect(page.locator('#teachingPanel')).toHaveClass(/is-info-open/);
      await expect(page.locator('#panelQuestion')).toBeVisible();

      // (15) Switching to a different mode auto-closes the info popover
      await page.click('#tabHelp');
      await page.waitForTimeout(200);
      await expect(page.locator('#teachingPanel')).not.toHaveClass(/is-info-open/);
    });
  }
});
