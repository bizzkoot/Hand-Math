const { test, expect } = require('@playwright/test');

test.describe('Viewport-fit / layout clipping', () => {
    test.describe.configure({ mode: 'serial' });

    test('Verify layout fits without scrollbars or clipping at Honor Pad X8a landscape', async ({ page }) => {
        test.slow();
        await page.setViewportSize({ width: 1280, height: 800 });
        const local = process.env.HM_LOCAL_FILE === '1';
        await page.goto(local ? 'index.html' : '/index.html');
        await page.waitForFunction(
            () => window.handMathApp && window.handMathApp.handController && window.__HM__ && window.__HM__.ui,
            { timeout: 30000 }
        );

        const bodyScrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
        const windowHeight = await page.evaluate(() => window.innerHeight);
        expect(bodyScrollHeight).toBeLessThanOrEqual(windowHeight);

        const headerScroll = await page.evaluate(() => document.getElementById('header').scrollWidth);
        const headerClient = await page.evaluate(() => document.getElementById('header').clientWidth);
        expect(headerScroll).toBeLessThanOrEqual(headerClient + 1);

        await page.screenshot({
            path: 'test-results/viewport-fit-honor-pad.png',
            fullPage: false
        });
    });

    test('Verify layout fits at Honor Pad X8a portrait', async ({ page }) => {
        test.slow();
        await page.setViewportSize({ width: 800, height: 1280 });
        const local = process.env.HM_LOCAL_FILE === '1';
        await page.goto(local ? 'index.html' : '/index.html');
        await page.waitForFunction(
            () => window.handMathApp && window.handMathApp.handController && window.__HM__ && window.__HM__.ui,
            { timeout: 30000 }
        );

        const bodyScrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
        const windowHeight = await page.evaluate(() => window.innerHeight);
        expect(bodyScrollHeight).toBeLessThanOrEqual(windowHeight);
    });

    test('Verify layout fits at iPad 10th gen landscape', async ({ page }) => {
        test.slow();
        await page.setViewportSize({ width: 1180, height: 820 });
        const local = process.env.HM_LOCAL_FILE === '1';
        await page.goto(local ? 'index.html' : '/index.html');
        await page.waitForFunction(
            () => window.handMathApp && window.handMathApp.handController && window.__HM__ && window.__HM__.ui,
            { timeout: 30000 }
        );

        const bodyScrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
        const windowHeight = await page.evaluate(() => window.innerHeight);
        expect(bodyScrollHeight).toBeLessThanOrEqual(windowHeight);
    });

    test('Verify layout fits at iPhone 14 Pro', async ({ page }) => {
        test.slow();
        await page.setViewportSize({ width: 393, height: 852 });
        const local = process.env.HM_LOCAL_FILE === '1';
        await page.goto(local ? 'index.html' : '/index.html');
        await page.waitForFunction(
            () => window.handMathApp && window.handMathApp.handController && window.__HM__ && window.__HM__.ui,
            { timeout: 30000 }
        );

        const bodyScrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
        const windowHeight = await page.evaluate(() => window.innerHeight);
        expect(bodyScrollHeight).toBeLessThanOrEqual(windowHeight);
    });

    test('Verify layout fits at landscape-short phone', async ({ page }) => {
        test.slow();
        await page.setViewportSize({ width: 812, height: 375 });
        const local = process.env.HM_LOCAL_FILE === '1';
        await page.goto(local ? 'index.html' : '/index.html');
        await page.waitForFunction(
            () => window.handMathApp && window.handMathApp.handController && window.__HM__ && window.__HM__.ui,
            { timeout: 30000 }
        );

        const bodyScrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
        const windowHeight = await page.evaluate(() => window.innerHeight);
        expect(bodyScrollHeight).toBeLessThanOrEqual(windowHeight);
    });
});
