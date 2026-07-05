const { test, expect } = require('@playwright/test');

test.describe('Hand Sizing and Visibility Analysis', () => {
    test.beforeEach(async ({ page }) => {
        const local = process.env.HM_LOCAL_FILE === '1';
        await page.goto(local ? 'file://' + __dirname + '/../index.html' : '/index.html');
        await page.waitForLoadState('networkidle');
        
        // Wait for hand models to load
        await page.waitForTimeout(3000);
    });

    test('Analyze current hand sizing and visibility issues', async ({ page }) => {
        console.log('🔍 Analyzing Hand Sizing and Visibility Issues');
        
        // Check if scene container is properly sized
        const sceneContainer = await page.locator('#scene-container').boundingBox();
        console.log('Scene container dimensions:', sceneContainer);
        
        // Check WebGL canvas
        const canvas = await page.locator('#three-canvas').boundingBox();
        console.log('Canvas dimensions:', canvas);
        
        // Test camera position and field of view
        const cameraInfo = await page.evaluate(() => {
            if (window.handMathApp && window.handMathApp.camera) {
                const camera = window.handMathApp.camera;
                return {
                    position: [camera.position.x, camera.position.y, camera.position.z],
                    fov: camera.fov,
                    near: camera.near,
                    far: camera.far,
                    aspect: camera.aspect
                };
            }
            return null;
        });
        console.log('Current camera settings:', cameraInfo);
        
        // Test hand positions and scales
        const handInfo = await page.evaluate(() => {
            if (window.handMathApp && window.handMathApp.leftHand && window.handMathApp.rightHand) {
                return {
                    leftHand: {
                        position: [
                            window.handMathApp.leftHand.position.x,
                            window.handMathApp.leftHand.position.y,
                            window.handMathApp.leftHand.position.z
                        ],
                        rotation: [
                            window.handMathApp.leftHand.rotation.x,
                            window.handMathApp.leftHand.rotation.y,
                            window.handMathApp.leftHand.rotation.z
                        ],
                        scale: [
                            window.handMathApp.leftHand.scale.x,
                            window.handMathApp.leftHand.scale.y,
                            window.handMathApp.leftHand.scale.z
                        ]
                    },
                    rightHand: {
                        position: [
                            window.handMathApp.rightHand.position.x,
                            window.handMathApp.rightHand.position.y,
                            window.handMathApp.rightHand.position.z
                        ],
                        rotation: [
                            window.handMathApp.rightHand.rotation.x,
                            window.handMathApp.rightHand.rotation.y,
                            window.handMathApp.rightHand.rotation.z
                        ],
                        scale: [
                            window.handMathApp.rightHand.scale.x,
                            window.handMathApp.rightHand.scale.y,
                            window.handMathApp.rightHand.scale.z
                        ]
                    }
                };
            }
            return null;
        });
        console.log('Current hand positioning:', JSON.stringify(handInfo, null, 2));
        
        // Calculate if both hands are within view frustum
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
                bothVisible: leftVisible && rightVisible
            };
        });
        console.log('Hand visibility in camera frustum:', visibilityInfo);
        
        // Take screenshot for visual analysis
        const screenshotPath = 'test-results/current-hand-sizing.png';
        await page.screenshot({ 
            path: screenshotPath,
            fullPage: false,
            clip: sceneContainer 
        });
        console.log('📸 Screenshot saved:', screenshotPath);
        
        // Analysis results
        console.log('\n🎯 ANALYSIS RESULTS:');
        console.log('===================');
        console.log('Issue: Hands too big and not both visible');
        
        if (handInfo) {
            console.log('\nCurrent Problems Identified:');
            
            // Check if hands are positioned too far apart
            const handDistance = Math.abs(handInfo.leftHand.position[0] - handInfo.rightHand.position[0]);
            if (handDistance > 1.2) {
                console.log('❌ Hands positioned too far apart:', handDistance, '(should be ~0.8-1.0)');
            }
            
            // Check hand scale
            const leftScale = handInfo.leftHand.scale[0];
            const rightScale = handInfo.rightHand.scale[0];
            if (leftScale > 0.5 || rightScale > 0.5) {
                console.log('❌ Hands scaled too large:', { leftScale, rightScale }, '(should be ~0.3-0.4)');
            }
            
            // Check camera distance
            if (cameraInfo && cameraInfo.position[2] < 3) {
                console.log('❌ Camera too close:', cameraInfo.position[2], '(should be ~3.5-4.0)');
            }
        }
        
        console.log('\n🔧 RECOMMENDED FIXES:');
        console.log('- Reduce hand scale to 0.3-0.4');
        console.log('- Position hands closer: left at -0.6, right at +0.6');
        console.log('- Move camera back to Z=3.5-4.0');
        console.log('- Adjust camera FOV to 45-50 degrees');
        
        // Verify both hands exist
        expect(handInfo).not.toBeNull();
        expect(handInfo.leftHand).toBeDefined();
        expect(handInfo.rightHand).toBeDefined();
        
        // Report the main issue
        if (visibilityInfo && !visibilityInfo.bothVisible) {
            console.log('\n⚠️  CONFIRMED: Both hands are NOT visible in current camera view');
        }
    });

    test('Test optimal camera and hand positioning', async ({ page }) => {
        console.log('🎯 Testing Optimal Positioning Solutions');
        
        // Apply optimal settings directly through JavaScript
        const optimizationResult = await page.evaluate(() => {
            if (!window.handMathApp || !window.handMathApp.leftHand || !window.handMathApp.rightHand) {
                return { success: false, message: 'Hands not loaded' };
            }
            
            // Apply optimal camera position
            const camera = window.handMathApp.camera;
            camera.position.set(0, 0.2, 3.5); // Moved back from 2 to 3.5
            camera.fov = 45; // Reduced from 50 to 45
            camera.updateProjectionMatrix();
            camera.lookAt(0, 0, 0);
            
            // Apply optimal hand positioning and scaling
            const leftHand = window.handMathApp.leftHand;
            const rightHand = window.handMathApp.rightHand;
            
            // Left hand - closer position, smaller scale
            leftHand.position.set(-0.6, -0.1, 0); // Moved from -0.5 to -0.6
            leftHand.scale.set(0.4, 0.4, 0.4);    // Reduced from 0.7 to 0.4
            leftHand.rotation.y = Math.PI / 2;     // +90° for proper orientation
            
            // Right hand - closer position, smaller scale 
            rightHand.position.set(0.6, -0.1, 0); // Moved from 0.5 to 0.6
            rightHand.scale.set(0.4, 0.4, 0.4);   // Reduced from 0.7 to 0.4
            rightHand.rotation.y = -Math.PI / 2;   // -90° for proper orientation
            
            return { 
                success: true, 
                newPositions: {
                    camera: [camera.position.x, camera.position.y, camera.position.z],
                    leftHand: [leftHand.position.x, leftHand.position.y, leftHand.position.z],
                    rightHand: [rightHand.position.x, rightHand.position.y, rightHand.position.z]
                }
            };
        });
        
        console.log('Applied optimal positioning:', optimizationResult);
        
        // Wait for changes to render
        await page.waitForTimeout(1000);
        
        // Check visibility with new settings
        const newVisibility = await page.evaluate(() => {
            const camera = window.handMathApp.camera;
            const frustum = new THREE.Frustum();
            const matrix = new THREE.Matrix4().multiplyMatrices(
                camera.projectionMatrix,
                camera.matrixWorldInverse
            );
            frustum.setFromProjectionMatrix(matrix);
            
            const leftVisible = frustum.intersectsBox(new THREE.Box3().setFromObject(window.handMathApp.leftHand));
            const rightVisible = frustum.intersectsBox(new THREE.Box3().setFromObject(window.handMathApp.rightHand));
            
            return {
                leftVisible,
                rightVisible,
                bothVisible: leftVisible && rightVisible
            };
        });
        
        console.log('New visibility status:', newVisibility);
        
        // Take screenshot with optimized settings
        const sceneContainer = await page.locator('#scene-container').boundingBox();
        await page.screenshot({ 
            path: 'test-results/optimized-hand-sizing.png',
            fullPage: false,
            clip: sceneContainer 
        });
        console.log('📸 Optimized screenshot saved: test-results/optimized-hand-sizing.png');
        
        // Test hand controls still work
        await page.click('[data-hand="right"][data-value="5"]');
        await page.waitForTimeout(500);
        
        const rightHandValue = await page.textContent('#right-hand-value');
        console.log('Right hand test value:', rightHandValue);
        
        // Verify improvement
        expect(newVisibility.bothVisible).toBe(true);
        console.log('✅ OPTIMIZATION SUCCESSFUL: Both hands are now visible!');
    });
});