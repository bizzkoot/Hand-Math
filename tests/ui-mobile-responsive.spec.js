const { test, expect } = require('@playwright/test');

test.describe('Teaching UI - Mobile Responsiveness', () => {
    test('Verify portrait mobile layout and 3D hand visibility', async ({ page }) => {
        console.log('📱 Testing Mobile Portrait Layout (375x667)...');
        
        // Emulate iPhone viewport in portrait
        await page.setViewportSize({ width: 375, height: 667 });
        
        const local = process.env.HM_LOCAL_FILE === '1';
        await page.goto(local ? 'file://' + __dirname + '/../index.html' : '/index.html');
        await page.waitForLoadState('networkidle');
        
        // Wait for hand models to load
        await page.waitForTimeout(4000);

        // 1. Verify layout stacking
        const layoutFlexDirection = await page.evaluate(() => {
            const content = document.getElementById('content');
            return window.getComputedStyle(content).flexDirection;
        });
        console.log('Portrait content flex direction:', layoutFlexDirection);
        expect(layoutFlexDirection).toBe('column');

        // 2. Verify Settings Cog visibility and toggle functionality
        const settingsBtn = page.locator('#btnSettings');
        await expect(settingsBtn).toBeVisible();

        const configGroup = page.locator('#configGroup');
        await expect(configGroup).not.toBeVisible(); // Hidden by default

        // Click settings cog to open
        await settingsBtn.click();
        await expect(configGroup).toBeVisible(); // Visible when toggled

        // Click outside to close settings (click top-left to avoid overlapping dropdown card)
        // On mobile, the open config group card is wide (width 365px, height 156px) and covers the top part of #scene.
        // We click near the bottom of #scene (y: 220) to ensure we hit outside the dropdown.
        await page.click('#scene', { position: { x: 20, y: 220 } });
        await page.waitForTimeout(500);
        await expect(configGroup).not.toBeVisible(); // Closed on outside click

        // 3. Verify both hands are visible in the 3D scene
        const visibilityInfo = await page.evaluate(() => {
            if (!window.handMathApp || !window.handMathApp.camera) return null;
            
            const camera = window.handMathApp.camera;
            const frustum = new THREE.Frustum();
            const matrix = new THREE.Matrix4().multiplyMatrices(
                camera.projectionMatrix,
                camera.matrixWorldInverse
            );
            frustum.setFromProjectionMatrix(matrix);
            
            const leftVisible = window.handMathApp.leftHand ? 
                frustum.intersectsBox(new THREE.Box3().setFromObject(window.handMathApp.leftHand)) : false;
            const rightVisible = window.handMathApp.rightHand ? 
                frustum.intersectsBox(new THREE.Box3().setFromObject(window.handMathApp.rightHand)) : false;
            
            return {
                leftVisible,
                rightVisible,
                bothVisible: leftVisible && rightVisible,
                cameraPosition: [camera.position.x, camera.position.y, camera.position.z],
                cameraFOV: camera.fov,
                leftHandScale: window.handMathApp.leftHand ? window.handMathApp.leftHand.scale.x : null
            };
        });
        
        console.log('Mobile portrait visibility details:', visibilityInfo);
        expect(visibilityInfo).not.toBeNull();
        expect(visibilityInfo.bothVisible).toBe(true);
        expect(visibilityInfo.leftHandScale).toBeLessThan(0); // Mirrored left hand scale should be negative

        // Save a screenshot for manual verification
        await page.screenshot({ 
            path: 'test-results/mobile-portrait-success.png',
            fullPage: false
        });
        console.log('📸 Mobile portrait screenshot saved: test-results/mobile-portrait-success.png');
    });

    test('Verify landscape mobile layout and 3D hand visibility', async ({ page }) => {
        console.log('📱 Testing Mobile Landscape Layout (736x414)...');
        
        // Emulate iPhone viewport in landscape
        await page.setViewportSize({ width: 736, height: 414 });
        
        const local = process.env.HM_LOCAL_FILE === '1';
        await page.goto(local ? 'file://' + __dirname + '/../index.html' : '/index.html');
        await page.waitForLoadState('networkidle');
        
        // Wait for hand models to load
        await page.waitForTimeout(4000);

        // 1. Verify layout remains side-by-side
        const layoutFlexDirection = await page.evaluate(() => {
            const content = document.getElementById('content');
            return window.getComputedStyle(content).flexDirection;
        });
        console.log('Landscape content flex direction:', layoutFlexDirection);
        expect(layoutFlexDirection).toBe('row');

        // 2. Verify Settings Cog visibility
        const settingsBtn = page.locator('#btnSettings');
        await expect(settingsBtn).toBeVisible();

        // 3. Verify both hands are visible in the 3D scene
        const visibilityInfo = await page.evaluate(() => {
            if (!window.handMathApp || !window.handMathApp.camera) return null;
            
            const camera = window.handMathApp.camera;
            const frustum = new THREE.Frustum();
            const matrix = new THREE.Matrix4().multiplyMatrices(
                camera.projectionMatrix,
                camera.matrixWorldInverse
            );
            frustum.setFromProjectionMatrix(matrix);
            
            const leftVisible = window.handMathApp.leftHand ? 
                frustum.intersectsBox(new THREE.Box3().setFromObject(window.handMathApp.leftHand)) : false;
            const rightVisible = window.handMathApp.rightHand ? 
                frustum.intersectsBox(new THREE.Box3().setFromObject(window.handMathApp.rightHand)) : false;
            
            return {
                leftVisible,
                rightVisible,
                bothVisible: leftVisible && rightVisible,
                cameraPosition: [camera.position.x, camera.position.y, camera.position.z],
                cameraFOV: camera.fov,
                leftHandScale: window.handMathApp.leftHand ? window.handMathApp.leftHand.scale.x : null
            };
        });
        
        console.log('Mobile landscape visibility details:', visibilityInfo);
        expect(visibilityInfo).not.toBeNull();
        expect(visibilityInfo.bothVisible).toBe(true);

        // Save a screenshot for manual verification
        await page.screenshot({ 
            path: 'test-results/mobile-landscape-success.png',
            fullPage: false
        });
        console.log('📸 Mobile landscape screenshot saved: test-results/mobile-landscape-success.png');
    });
});
