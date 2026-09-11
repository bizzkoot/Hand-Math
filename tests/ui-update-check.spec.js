// @ts-check
// In-app release update checker: compares the packaged app version against
// the latest GitHub release tag; alerts with release notes when a newer
// release exists, offers the APK download, supports skipping a version, and
// handles network failures and the up-to-date case gracefully.
const { test, expect } = require('@playwright/test');

const RELEASES_URL = 'https://api.github.com/repos/bizzkoot/Hand-Math/releases/latest';
const LATEST_JSON_URL = 'https://raw.githubusercontent.com/bizzkoot/Hand-Math/main/latest.json';

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

  test('rate-limited API still alerts with installed-vs-latest versions from the tag file', async ({ page }) => {
    await page.route(RELEASES_URL, route => route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'API rate limit exceeded' })
    }));
    await page.route(LATEST_JSON_URL, route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ tag: 'v9.9.9' })
    }));

    await gotoApp(page);

    // Auto-check alerts without user action, with installed-vs-latest
    // versions plus a notice that GitHub is rate-limiting.
    const modal = page.locator('#updateModal');
    await expect(modal, { timeout: 20000 }).toBeVisible();
    await expect(modal).toContainText('v9.9.9');
    await expect(modal).toContainText('limiting');
    // No APK asset known from the tag file: download button points at the
    // releases/latest page
    const downloadLink = modal.locator('a', { hasText: 'Download update' });
    await expect(downloadLink).toHaveAttribute('href', /releases\/latest$/);
  });

  test('rate-limited API with an up-to-date tag stays silent on auto, errors on manual', async ({ page }) => {
    await page.route(RELEASES_URL, route => route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'API rate limit exceeded' })
    }));
    await page.route(LATEST_JSON_URL, route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ tag: 'v1.0.5' })
    }));

    await gotoApp(page);

    // Nothing newer: automatic path stays silent
    await page.waitForTimeout(6000);
    await expect(page.locator('#updateModal')).toBeHidden();

    // Manual check explains the rate limit
    await page.evaluate(() => window.handMathApp.updateChecker.checkForUpdate(true));
    await expect(page.locator('#updateModalTitle')).toContainText('failed');
    await expect(page.locator('#updateModal')).toContainText('limiting');
  });

  test('auto-checks are throttled: a recent successful check makes no network request', async ({ page }) => {
    let apiCalls = 0;
    await page.route(RELEASES_URL, route => { apiCalls += 1; route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(releasePayload('v1.0.5', 'Hand Math v1.0.5', 'notes', 'HandMath-v1.0.5.apk'))
    }); });

    await page.addInitScript(() => {
        // Pretend we successfully checked 5 minutes ago
        const now = Date.now();
        localStorage.setItem('hm-update-last-check', String(now - 5 * 60 * 1000));
        localStorage.setItem('hm-update-last-attempt', String(now - 5 * 60 * 1000));
    });

    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.handMathApp && window.handMathApp.updateChecker, null, { timeout: 60000 });

    // Past the initial 3s delay + a margin: the throttled auto-check must
    // not have hit the network.
    await page.waitForTimeout(6000);
    expect(apiCalls).toBe(0);

    // Manual check bypasses the throttle
    await page.evaluate(() => window.handMathApp.updateChecker.checkForUpdate(true));
    await page.waitForTimeout(1000);
    expect(apiCalls).toBe(1);
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
