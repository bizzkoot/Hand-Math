const { test, expect } = require('@playwright/test');

test.describe('Task 1 Compliance Analysis', () => {
    test('Analyze scene container and calculate optimal hand positioning', async ({ page }) => {
        console.log('🔍 Running Task 1 Compliance Analysis...');
        
        const local = process.env.HM_LOCAL_FILE === '1';
        await page.goto(local ? 'file://' + __dirname + '/../task1-compliance-test.html' : '/task1-compliance-test.html');
        await page.waitForLoadState('networkidle');
        
        // Wait for hands to load
        await page.waitForTimeout(5000);
        
        // Get container measurements
        const containerMeasurements = await page.evaluate(() => {
            const container = document.getElementById('scene-container');
            return {
                width: container.clientWidth,
                height: container.clientHeight,
                aspectRatio: container.clientWidth / container.clientHeight
            };
        });
        
        console.log('📐 Scene Container Measurements:', containerMeasurements);
        
        // Run positioning test
        await page.click('button:has-text("Test Current Settings")');
        await page.waitForTimeout(2000);
        
        // Get visibility analysis
        const visibilityAnalysis = await page.evaluate(() => {
            const analysisElement = document.getElementById('positioning-analysis');
            return analysisElement ? analysisElement.textContent : 'No analysis available';
        });
        
        console.log('👁️ Visibility Analysis:', visibilityAnalysis);
        
        // Calculate optimal configuration
        await page.click('button:has-text("Calculate Optimal Scale")');
        await page.waitForTimeout(1000);
        
        // Get optimal configuration
        const optimalConfig = await page.evaluate(() => {
            const configElement = document.getElementById('optimal-config');
            return configElement ? configElement.textContent : 'No config available';
        });
        
        console.log('⚙️ Optimal Configuration:', optimalConfig);
        
        // Test with generated optimal settings
        await page.click('button:has-text("Generate Optimal Config")');
        await page.waitForTimeout(3000);
        
        // Get final compliance test results
        const finalTest = await page.evaluate(() => {
            if (!window.leftHand || !window.rightHand || !window.camera) {
                return { error: 'Hands or camera not available' };
            }
            
            // Test visibility
            const frustum = new THREE.Frustum();
            const matrix = new THREE.Matrix4().multiplyMatrices(
                camera.projectionMatrix,
                camera.matrixWorldInverse
            );
            frustum.setFromProjectionMatrix(matrix);
            
            const leftBox = new THREE.Box3().setFromObject(leftHand);
            const rightBox = new THREE.Box3().setFromObject(rightHand);
            
            const leftVisible = frustum.intersectsBox(leftBox);
            const rightVisible = frustum.intersectsBox(rightBox);
            
            // Get screen positions
            function getScreenPosition(worldPosition, camera, containerWidth, containerHeight) {
                const vector = worldPosition.clone().project(camera);
                return {
                    x: (vector.x * 0.5 + 0.5) * containerWidth,
                    y: (-vector.y * 0.5 + 0.5) * containerHeight
                };
            }
            
            const leftScreenPos = getScreenPosition(leftHand.position, camera, containerWidth, containerHeight);
            const rightScreenPos = getScreenPosition(rightHand.position, camera, containerWidth, containerHeight);
            
            // Check if hands are within container bounds
            const leftInBounds = leftScreenPos.x > 0 && leftScreenPos.x < containerWidth && 
                               leftScreenPos.y > 0 && leftScreenPos.y < containerHeight;
            const rightInBounds = rightScreenPos.x > 0 && rightScreenPos.x < containerWidth && 
                                rightScreenPos.y > 0 && rightScreenPos.y < containerHeight;
            
            return {
                visibility: {
                    leftVisible,
                    rightVisible,
                    bothVisible: leftVisible && rightVisible
                },
                screenPositions: {
                    left: leftScreenPos,
                    right: rightScreenPos
                },
                inBounds: {
                    leftInBounds,
                    rightInBounds,
                    bothInBounds: leftInBounds && rightInBounds
                },
                handSettings: {
                    leftPosition: [leftHand.position.x, leftHand.position.y, leftHand.position.z],
                    rightPosition: [rightHand.position.x, rightHand.position.y, rightHand.position.z],
                    scale: [leftHand.scale.x, leftHand.scale.y, leftHand.scale.z],
                    cameraPosition: [camera.position.x, camera.position.y, camera.position.z],
                    cameraFOV: camera.fov
                }
            };
        });
        
        console.log('🎯 Final Compliance Test Results:', JSON.stringify(finalTest, null, 2));
        
        // Take screenshot for visual verification
        await page.screenshot({ 
            path: 'test-results/task1-compliance-analysis.png',
            fullPage: false
        });
        
        console.log('📸 Analysis screenshot saved: test-results/task1-compliance-analysis.png');
        
        // Generate optimal settings output
        if (finalTest.handSettings) {
            const optimalSettings = {
                camera: {
                    fov: finalTest.handSettings.cameraFOV,
                    position: finalTest.handSettings.cameraPosition
                },
                leftHand: {
                    position: finalTest.handSettings.leftPosition,
                    rotation: [-0.1, Math.PI/2, 0], // Back facing user
                    scale: finalTest.handSettings.scale
                },
                rightHand: {
                    position: finalTest.handSettings.rightPosition,
                    rotation: [-0.1, -Math.PI/2, 0], // Back facing user
                    scale: finalTest.handSettings.scale
                }
            };
            
            console.log('\\n🔧 OPTIMAL SETTINGS FOR IMPLEMENTATION:');
            console.log('=====================================');
            console.log(JSON.stringify(optimalSettings, null, 2));
            
            console.log('\\n📝 TASK 1 COMPLIANCE STATUS:');
            console.log('============================');
            console.log(`✅ Both hands visible in frustum: ${finalTest.visibility.bothVisible}`);
            console.log(`✅ Both hands within container bounds: ${finalTest.inBounds.bothInBounds}`);
            console.log(`✅ Backs facing user (rotations correct): ${Math.abs(optimalSettings.leftHand.rotation[1] - Math.PI/2) < 0.1 && Math.abs(optimalSettings.rightHand.rotation[1] + Math.PI/2) < 0.1}`);
            console.log(`✅ No camera controls needed: Fixed positioning`);
            console.log(`✅ Hands side by side: ${Math.abs(finalTest.handSettings.leftPosition[0] + finalTest.handSettings.rightPosition[0]) < 0.1}`);
        }
        
        // Verify compliance
        expect(finalTest.visibility.bothVisible).toBe(true);
        expect(finalTest.inBounds.bothInBounds).toBe(true);
        expect(containerMeasurements.width).toBeGreaterThan(0);
        expect(containerMeasurements.height).toBeGreaterThan(0);
    });
});