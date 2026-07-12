// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Help UI - Recent Git Commits Modal', () => {
  test('Changelog modal opens and closes correctly from Help panel', async ({ page }) => {
    const local = process.env.HM_LOCAL_FILE === '1';
    await page.goto(local ? 'index.html' : '/index.html');
    await page.waitForFunction(() => window.__HM__ && window.handMathApp);

    // Switch to Help Mode/Tab
    await page.click('#tabHelp');
    
    // Verify the "View Recent Changes" button is visible
    const changelogBtn = page.locator('#btnHelpChangelog');
    await expect(changelogBtn).toBeVisible();

    // The modal should be hidden initially
    const modal = page.locator('#changelogModal');
    await expect(modal).toBeHidden();

    // Click to open the modal
    await changelogBtn.click();
    await expect(modal).toBeVisible();

    // Check that at least some commits were rendered in the list
    const commitItems = page.locator('.hm-commit-item');
    const count = await commitItems.count();
    expect(count).toBeGreaterThan(0);

    // Check that the first commit has a hash and subject
    const firstHash = commitItems.first().locator('.hm-commit-hash');
    await expect(firstHash).not.toBeEmpty();
    const firstSubject = commitItems.first().locator('.hm-commit-subject');
    await expect(firstSubject).not.toBeEmpty();

    // Click close button
    await page.click('#changelogCloseBtn');
    await expect(modal).toBeHidden();

    // Re-open and close with top 'X' button
    await changelogBtn.click();
    await expect(modal).toBeVisible();
    await page.click('#changelogClose');
    await expect(modal).toBeHidden();

    // Re-open and close with Escape key
    await changelogBtn.click();
    await expect(modal).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
  });
});
