/**
 * Generate Android launcher icons, adaptive-icon foregrounds and splash
 * screens from assets/icons/icon.svg.
 *
 * Replaces `@capacitor/assets generate` (whose sharp dependency fails under
 * some Node versions) with Playwright rasterization — Playwright is already
 * a devDependency, so this adds no new packages.
 *
 * Usage:  node scripts/generate-android-icons.js
 * Requires the android platform:  npx cap add android
 */
const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SVG_PATH = path.join(ROOT, 'assets', 'icons', 'icon.svg');
const RES = path.join(ROOT, 'android', 'app', 'src', 'main', 'res');

// Background of the brand splash (matches the icon's dark slate base).
const SPLASH_BG = '#0f172a';

// density name -> launcher icon px (48dp baseline)
const LAUNCHER_SIZES = {
    mdpi: 48,
    hdpi: 72,
    xhdpi: 96,
    xxhdpi: 144,
    xxxhdpi: 192
};

// Adaptive-icon foreground canvas is 108dp; the artwork must fit the inner
// 72dp safe circle, so the logo is scaled to 66% of the canvas.
const FG_SCALE = 0.66;

// density name -> [portrait, landscape] splash px
const SPLASH_SIZES = {
    mdpi: [[320, 480], [480, 320]],
    hdpi: [[480, 800], [800, 480]],
    xhdpi: [[720, 960], [960, 720]],
    xxhdpi: [[960, 1600], [1600, 960]],
    xxxhdpi: [[1280, 1920], [1920, 1280]]
};

function svgForSize(svg, size) {
    return svg.replace(/width="\d+" height="\d+"/, `width="${size}" height="${size}"`);
}

async function rasterize(page, width, height, bodyHtml, outPath) {
    await page.setViewportSize({ width, height });
    await page.setContent(
        `<body style="margin:0;background:transparent;">${bodyHtml}</body>`
    );
    await page.screenshot({ path: outPath, omitBackground: true });
}

async function main() {
    const svg = fs.readFileSync(SVG_PATH, 'utf8');
    const browser = await chromium.launch();
    const page = await browser.newPage();
    let count = 0;

    for (const [density, size] of Object.entries(LAUNCHER_SIZES)) {
        const dir = path.join(RES, `mipmap-${density}`);
        fs.mkdirSync(dir, { recursive: true });

        // Square launcher icon (artwork has its own rounded background).
        await rasterize(page, size, size, svgForSize(svg, size), path.join(dir, 'ic_launcher.png'));

        // Circular launcher icon (corners clipped to a circle).
        await rasterize(
            page, size, size,
            `<div style="width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;">${svgForSize(svg, size)}</div>`,
            path.join(dir, 'ic_launcher_round.png')
        );

        // Adaptive-icon foreground: logo centred in the safe zone on
        // transparent canvas; background colour comes from
        // values/ic_launcher_background.xml.
        const canvas = Math.round(size * (108 / 48));
        const artSize = Math.round(canvas * FG_SCALE);
        await rasterize(
            page, canvas, canvas,
            `<div style="width:${canvas}px;height:${canvas}px;display:flex;align-items:center;justify-content:center;">${svgForSize(svg, artSize)}</div>`,
            path.join(dir, 'ic_launcher_foreground.png')
        );
        count += 3;
    }

    for (const [density, sizes] of Object.entries(SPLASH_SIZES)) {
        for (let i = 0; i < sizes.length; i += 1) {
            const [w, h] = sizes[i];
            const dirName = i === 0 ? `drawable-port-${density}` : `drawable-land-${density}`;
            const dir = path.join(RES, dirName);
            fs.mkdirSync(dir, { recursive: true });
            const artSize = Math.round(Math.min(w, h) * 0.3);
            await rasterize(
                page, w, h,
                `<div style="width:${w}px;height:${h}px;background:${SPLASH_BG};display:flex;align-items:center;justify-content:center;">${svgForSize(svg, artSize)}</div>`,
                path.join(dir, 'splash.png')
            );
            count += 1;
        }
    }

    await browser.close();
    console.log(`generate-android-icons: wrote ${count} resources under android/app/src/main/res`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
