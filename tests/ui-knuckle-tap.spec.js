// @ts-check
// Knuckle tap: tapping a finger/knuckle region on the 3D hands toggles that
// finger. Regression spec for the double-fire bug where a single touch
// gesture fired BOTH pointerdown and touchstart, toggling the same finger
// twice (net zero), which made taps on touch devices look dead for BOTH
// hands (right hand especially).
const { test, expect } = require('@playwright/test');

test.use({ hasTouch: true });

test.describe('Knuckle tap finger toggling', () => {
  /**
   * Project the given hand's index-finger tip to page coordinates, waiting
   * until the hands have finished their initial settle animation (position
   * stable across 300ms) so the tap lands on the finger.
   */
  async function tipPosition(page, side) {
    await page.waitForFunction((handSide) => {
        const app = window.handMathApp;
        if (!app.leftHand || !app.rightHand || !app.camera) return false;
        const hand = handSide === 'left' ? app.leftHand : app.rightHand;
        const tip = hand.userData.fingers.index.userData.tip;
        const v = new THREE.Vector3();
        tip.getWorldPosition(v);
        const prev = window.__tipProbe;
        const key = `${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)}`;
        if (prev === key) { window.__tipStable = true; return true; }
        window.__tipProbe = key;
        return false;
    }, side, { timeout: 30000, polling: 300 }).catch(() => {});
    return page.evaluate((handSide) => {
        const app = window.handMathApp;
        const rect = app.canvas.getBoundingClientRect();
        const hand = handSide === 'left' ? app.leftHand : app.rightHand;
        const tip = hand.userData.fingers.index.userData.tip;
        const v = new THREE.Vector3();
        tip.getWorldPosition(v);
        v.project(app.camera);
        return {
            x: (v.x * 0.5 + 0.5) * rect.width + rect.left,
            y: (-v.y * 0.5 + 0.5) * rect.height + rect.top,
        };
    }, side);
  }

  async function readState(page) {
    return page.evaluate(() => {
        const app = window.handMathApp;
        return {
            left: app.calculator.getCurrentState().left,
            right: app.calculator.getCurrentState().right,
            rightIndex: app.handController.targetPositions.right.index,
            leftIndex: app.handController.targetPositions.left.index,
        };
    });
  }

  /** Wait for the app to finish booting: hands loaded AND scene settled. */
  async function gotoApp(page) {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.leftHand && window.handMathApp.rightHand, null, { timeout: 60000 });
    await page.waitForFunction(() => {
        const app = window.handMathApp;
        return app.leftHand && app.rightHand
            && document.getElementById('loading-overlay')?.hidden !== false;
    }, null, { timeout: 60000 });
    // Give the intro settle/pose capture time to finish
    await page.waitForTimeout(1500);
  }

  test('tapping the right-hand (ones) index finger toggles it once', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.leftHand && window.handMathApp.rightHand, null, { timeout: 60000 });

    const tip = await tipPosition(page, 'right');
    const before = await readState(page);
    expect(before.right).toBe(0);

    // A touch tap must produce exactly ONE toggle (not two).
    await page.touchscreen.tap(tip.x, tip.y);
    await page.waitForTimeout(900); // allow finger animation to settle

    const after = await readState(page);
    expect(after.right).toBe(1);
    expect(after.rightIndex).toBeGreaterThan(0.5);
    expect(after.left).toBe(0);
  });

  test('tapping the left-hand (tens) index finger toggles it once', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.leftHand && window.handMathApp.rightHand, null, { timeout: 60000 });

    const tip = await tipPosition(page, 'left');
    const before = await readState(page);
    expect(before.left).toBe(0);

    await page.touchscreen.tap(tip.x, tip.y);
    await page.waitForTimeout(900);

    // The calculator stores the left hand as a finger count (0-9); the tens
    // display layer multiplies by 10.
    const after = await readState(page);
    expect(after.left).toBe(1);
    expect(after.leftIndex).toBeGreaterThan(0.5);
    expect(after.right).toBe(0);
  });

  test('tapping an extended right-hand finger folds it back (toggle both ways)', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.leftHand && window.handMathApp.rightHand, null, { timeout: 60000 });

    const tip = await tipPosition(page, 'right');
    await page.touchscreen.tap(tip.x, tip.y);
    await page.waitForTimeout(900);
    expect((await readState(page)).right).toBe(1);

    await page.touchscreen.tap(tip.x, tip.y);
    await page.waitForTimeout(900);
    expect((await readState(page)).right).toBe(0);
  });
});
