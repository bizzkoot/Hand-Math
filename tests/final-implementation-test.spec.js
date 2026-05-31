const { test, expect } = require('@playwright/test');

test.describe('Final Hand Math Implementation - Complete System Test', () => {
    test.beforeEach(async ({ page }) => {
        const local = process.env.HM_LOCAL_FILE === '1';
        await page.goto(local ? 'file://' + __dirname + '/../index.html' : '/index.html');
        await page.waitForLoadState('networkidle');
        
        // Wait for hand models to load and mathematical calculator to initialize
        await page.waitForTimeout(4000);
    });

    test('Complete hand visibility and mathematical functionality test', async ({ page }) => {
        console.log('🎯 Testing Complete Hand Math Implementation');
        
        // Test 1: Verify both hands are now visible
        console.log('📋 Test 1: Hand Visibility');
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
                leftHandPosition: window.handMathApp.leftHand ? 
                    [window.handMathApp.leftHand.position.x, window.handMathApp.leftHand.position.y, window.handMathApp.leftHand.position.z] : null,
                rightHandPosition: window.handMathApp.rightHand ?
                    [window.handMathApp.rightHand.position.x, window.handMathApp.rightHand.position.y, window.handMathApp.rightHand.position.z] : null
            };
        });
        
        console.log('Hand visibility results:', visibilityInfo);
        expect(visibilityInfo).not.toBeNull();
        expect(visibilityInfo.bothVisible).toBe(true);
        console.log('✅ Both hands are now visible!');

        // Test 2: Mathematical Calculator Integration
        console.log('\\n📋 Test 2: Mathematical Calculator');
        const calculatorTest = await page.evaluate(() => {
            if (!window.handMathApp || !window.handMathApp.calculator) return null;
            
            const calc = window.handMathApp.calculator;
            
            // Test basic calculations
            const test1 = calc.calculateTotal(0, 0); // Should be 0
            const test2 = calc.calculateTotal(3, 7); // Should be 37
            const test3 = calc.calculateTotal(9, 9); // Should be 99
            
            // Test finger patterns
            const rightPattern5 = calc.getFingerPattern(5, 'right');
            const leftPattern3 = calc.getFingerPattern(3, 'left');
            
            return {
                calculations: { test1, test2, test3 },
                patterns: {
                    right5: rightPattern5,
                    left3: leftPattern3
                },
                calculatorAvailable: true
            };
        });
        
        console.log('Calculator test results:', calculatorTest);
        expect(calculatorTest).not.toBeNull();
        expect(calculatorTest.calculatorAvailable).toBe(true);
        expect(calculatorTest.calculations.test1).toBe(0);
        expect(calculatorTest.calculations.test2).toBe(37);
        expect(calculatorTest.calculations.test3).toBe(99);
        console.log('✅ Mathematical calculator working correctly!');

        // Test 3: UI Button Integration
        console.log('\\n📋 Test 3: UI Button Interaction');
        
        // Test right hand number 5
        await page.click('[data-hand=\"right\"][data-value=\"5\"]');
        await page.waitForTimeout(1000);
        
        let rightHandValue = await page.textContent('#right-hand-value');
        console.log('Right hand value after clicking 5:', rightHandValue);
        expect(rightHandValue).toBe('5');
        
        // Test left hand number 30 (tens)
        await page.click('[data-hand=\"left\"][data-value=\"30\"]');
        await page.waitForTimeout(1000);
        
        let leftHandValue = await page.textContent('#left-hand-value');
        let totalValue = await page.textContent('#total-value');
        console.log('Left hand value after clicking 30:', leftHandValue);
        console.log('Total value:', totalValue);
        
        expect(leftHandValue).toBe('3'); // Pattern index for 30
        expect(totalValue).toBe('35'); // 30 + 5 = 35
        
        // Test calculator button for total 42
        await page.click('[data-total=\"42\"]');
        await page.waitForTimeout(1000);
        
        leftHandValue = await page.textContent('#left-hand-value');
        rightHandValue = await page.textContent('#right-hand-value');
        totalValue = await page.textContent('#total-value');
        
        console.log('After clicking total 42:', { leftHandValue, rightHandValue, totalValue });
        expect(leftHandValue).toBe('4'); // Pattern for 40
        expect(rightHandValue).toBe('2'); // Pattern for 2
        expect(totalValue).toBe('42');
        
        console.log('✅ UI button integration working correctly!');

        // Test 4: Reset Functionality
        console.log('\\n📋 Test 4: Reset Functionality');
        
        await page.click('#reset-hands');
        await page.waitForTimeout(1000);
        
        leftHandValue = await page.textContent('#left-hand-value');
        rightHandValue = await page.textContent('#right-hand-value');
        totalValue = await page.textContent('#total-value');
        
        console.log('After reset:', { leftHandValue, rightHandValue, totalValue });
        expect(leftHandValue).toBe('0');
        expect(rightHandValue).toBe('0');
        expect(totalValue).toBe('0');
        
        console.log('✅ Reset functionality working correctly!');

        // Test 5: Edge Cases
        console.log('\\n📋 Test 5: Edge Cases');
        
        // Test maximum values
        await page.click('[data-hand=\"left\"][data-value=\"90\"]');
        await page.click('[data-hand=\"right\"][data-value=\"9\"]');
        await page.waitForTimeout(1000);
        
        leftHandValue = await page.textContent('#left-hand-value');
        rightHandValue = await page.textContent('#right-hand-value');
        totalValue = await page.textContent('#total-value');
        
        console.log('Maximum values test:', { leftHandValue, rightHandValue, totalValue });
        expect(leftHandValue).toBe('9'); // Pattern for 90
        expect(rightHandValue).toBe('9'); // Pattern for 9
        expect(totalValue).toBe('99');
        
        console.log('✅ Edge cases working correctly!');

        // Final screenshot
        const sceneContainer = await page.locator('#scene-container').boundingBox();
        await page.screenshot({ 
            path: 'test-results/final-implementation-success.png',
            fullPage: false,
            clip: sceneContainer 
        });
        
        console.log('\\n🎉 ALL TESTS PASSED! Final implementation complete.');
        console.log('📸 Final screenshot saved: test-results/final-implementation-success.png');
    });

    test('Performance and console error check', async ({ page }) => {
        console.log('⚡ Testing Performance and Error-free Operation');
        
        // Capture console logs
        const consoleMessages = [];
        const errors = [];
        
        page.on('console', msg => {
            consoleMessages.push({
                type: msg.type(),
                text: msg.text()
            });
        });
        
        page.on('pageerror', error => {
            errors.push(error.message);
        });
        
        // Force log level to info before reload to capture GLTF load messages
        await page.addInitScript(() => {
            window.HANDMATH_LOG_LEVEL = 'info';
        });
        
        // Reload to capture initialization console logs
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(4000);
        
        // Perform rapid button clicking to test performance
        for (let i = 0; i <= 9; i++) {
            await page.click(`[data-hand="right"][data-value="${i}"]`);
            await page.waitForTimeout(100);
        }
        
        // Check for errors
        expect(errors).toHaveLength(0);
        console.log('✅ No JavaScript errors detected');
        
        // Check that hand models loaded successfully
        const successMessages = consoleMessages.filter(msg => 
            msg.text.includes('Left hand GLTF loaded successfully') || 
            msg.text.includes('Right hand GLTF loaded successfully')
        );
        
        console.log(`Found ${successMessages.length} successful hand loading messages`);
        expect(successMessages.length).toBeGreaterThanOrEqual(1); // At least one hand should load
        
        console.log('✅ Performance test completed successfully');
    });
});