// @ts-check
// In-app release update checker: compares the packaged app version against
// the latest GitHub release tag; alerts with release notes when a newer
// release exists, offers the APK download, supports skipping a version, and
// handles network failures and the up-to-date case gracefully.
const { test, expect } = require('@playwright/test');

const RELEASES_URL = 'https://api.github.com/repos/bizzkoot/Hand-Math/releases/latest';

const releasePayload = (tag, name, notes, apkName) => ({
    tag_name: tag,
    name: name,
    body: notes,
    html_url: `https://github.com/bizzkoot/Hand-Math/releases/tag/${tag}`,
    draft: false,
    assets: apkName ? [{
        name: apkName,
        browser_download_url: `https://github.com/bizzkoot/Hand-Math/releases/download/${tag}/${apkName}`
    }] : []
});

const gotoApp = async (page) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.updateChecker, null, { timeout: 60000 });
};

test.describe('In-app update checker', () => {
  test('alerts with release notes and APK download when a newer release exists', async ({ page }) => {
    await page.route(RELEASES_URL, route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(releasePayload(
            'v9.9.9',
            'Hand Math v9.9.9 — Big improvements',
            '- New feature A\n- Bug fix B',
            'HandMath-v9.9.9.apk'))
    }));

    await gotoApp(page);

    // Manual forced check (same code path the periodic check uses)
    await page.evaluate(() => window.handMathApp.updateChecker.checkForUpdate(true));

    const modal = page.locator('#updateModal');
    await expect(modal).toBeVisible();
    await expect(modal).toContainText('v9.9.9');
    await expect(modal).toContainText('New feature A');
    await expect(modal).toContainText('Bug fix B');

    const downloadLink = modal.locator('a', { hasText: 'Download update' });
    await expect(downloadLink).toHaveAttribute('href', /HandMath-v9\.9\.9\.apk$/);
    await expect(downloadLink).toHaveAttribute('target', '_blank');
  });

  test('auto-check on startup alerts without user action', async ({ page }) => {
    test.setTimeout(60000);
    await page.route(RELEASES_URL, route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(releasePayload('v9.9.9', 'New release', 'notes', 'HandMath-v9.9.9.apk'))
    }));

    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    // The checker self-starts ~3s after init
    await expect(page.locator('#updateModal'), { timeout: 20000 }).toBeVisible();
  });

  test('no alert and up-to-date message when local version is the latest', async ({ page }) => {
    await page.route(RELEASES_URL, route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(releasePayload('v1.0.4', 'Hand Math v1.0.4', 'notes', 'HandMath-v1.0.4.apk'))
    }));

    await gotoApp(page);

    // Automatic check must stay silent when up to date
    await page.waitForTimeout(6000);
    await expect(page.locator('#updateModal')).toBeHidden();

    // Manual check reports up to date
    await page.evaluate(() => window.handMathApp.updateChecker.checkForUpdate(true));
    await expect(page.locator('#updateModal')).toBeVisible();
    await expect(page.locator('#updateModalTitle')).toContainText('up to date');
  });

  test('skipping a version suppresses the auto alert but not a manual check', async ({ page }) => {
    await page.route(RELEASES_URL, route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(releasePayload('v9.9.9', 'New release', 'notes', 'HandMath-v9.9.9.apk'))
    }));

    await gotoApp(page);
    await page.evaluate(() => window.handMathApp.updateChecker.checkForUpdate(true));
    await expect(page.locator('#updateModal')).toBeVisible();

    await page.locator('#updateModalFoot button', { hasText: 'Skip this version' }).click();
    await expect(page.locator('#updateModal')).toBeHidden();

    await page.reload();
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.updateChecker, null, { timeout: 60000 });

    // Auto check after reload stays silent (version skipped)
    await page.waitForTimeout(6000);
    await expect(page.locator('#updateModal')).toBeHidden();

    // Manual check ignores the skip and shows the release again
    await page.evaluate(() => window.handMathApp.updateChecker.checkForUpdate(true));
    await expect(page.locator('#updateModal')).toBeVisible();
  });

  test('network failure fails silently on auto-check and reports on manual check', async ({ page }) => {
    await page.route(RELEASES_URL, route => route.abort('connectionrefused'));

    await gotoApp(page);

    // Automatic path must not surface any UI on network failure
    await page.waitForTimeout(6000);
    await expect(page.locator('#updateModal')).toBeHidden();

    // Forced check explains the failure instead of hanging
    await page.evaluate(() => window.handMathApp.updateChecker.checkForUpdate(true));
    await expect(page.locator('#updateModalTitle')).toContainText('failed');
  });

  test('version comparison is numeric, not lexicographic', async ({ page }) => {
    await gotoApp(page);
    const cmp = await page.evaluate(() => {
        const C = window.UpdateChecker;
        return [
            C.compareVersions('v1.0.10', 'v1.0.9'), // 10 > 9 numerically
            C.compareVersions('v1.0.4', 'v1.0.4'),  // equal
            C.compareVersions('v1.1.0', 'v1.0.9'),  // minor wins
            C.compareVersions('1.0.4', 'v1.0.3'),   // v prefix tolerated
        ];
    });
    expect(cmp[0]).toBeGreaterThan(0);
    expect(cmp[1]).toBe(0);
    expect(cmp[2]).toBeGreaterThan(0);
    expect(cmp[3]).toBeGreaterThan(0);
  });
});
