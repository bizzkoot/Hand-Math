/**
 * HandMathCalculator - Mathematical State Management for Hand Counting System
 * 
 * Implements the finger sequence patterns and calculations as specified in:
 * REQ-HANDMATH-002: Right hand counting (0-9)
 * REQ-HANDMATH-003: Left hand counting (0-90 in tens)
 * REQ-HANDMATH-004: Combined total calculation (0-99)
 */

class HandMathCalculator {
    constructor() {
        // Initialize finger sequence patterns per requirements specification
        this.fingerPatterns = this.initializeFingerPatterns();
        this.currentState = { left: 0, right: 0 };
    }

    /**
     * Initialize finger sequence patterns as specified in requirements
     * REQ-HANDMATH-002 & REQ-HANDMATH-003
     */
    initializeFingerPatterns() {
        return {
            // AC-HANDMATH-002-01 through AC-HANDMATH-002-10
            rightHand: {
                0: { thumb: false, index: false, middle: false, ring: false, pinky: false }, // AC-HANDMATH-002-01
                1: { thumb: false, index: true, middle: false, ring: false, pinky: false },  // AC-HANDMATH-002-02
                2: { thumb: false, index: true, middle: true, ring: false, pinky: false },   // AC-HANDMATH-002-03
                3: { thumb: false, index: true, middle: true, ring: true, pinky: false },    // AC-HANDMATH-002-04
                4: { thumb: false, index: true, middle: true, ring: true, pinky: true },     // AC-HANDMATH-002-05
                5: { thumb: true, index: false, middle: false, ring: false, pinky: false },  // AC-HANDMATH-002-06
                6: { thumb: true, index: true, middle: false, ring: false, pinky: false },   // AC-HANDMATH-002-07
                7: { thumb: true, index: true, middle: true, ring: false, pinky: false },    // AC-HANDMATH-002-08
                8: { thumb: true, index: true, middle: true, ring: true, pinky: false },     // AC-HANDMATH-002-09
                9: { thumb: true, index: true, middle: true, ring: true, pinky: true }       // AC-HANDMATH-002-10
            },
            
            // AC-HANDMATH-003-01 through AC-HANDMATH-003-10 (same patterns, different values)
            leftHand: {
                0: { thumb: false, index: false, middle: false, ring: false, pinky: false }, // AC-HANDMATH-003-01 → 0
                1: { thumb: false, index: true, middle: false, ring: false, pinky: false },  // AC-HANDMATH-003-02 → 10
                2: { thumb: false, index: true, middle: true, ring: false, pinky: false },   // AC-HANDMATH-003-03 → 20
                3: { thumb: false, index: true, middle: true, ring: true, pinky: false },    // AC-HANDMATH-003-04 → 30
                4: { thumb: false, index: true, middle: true, ring: true, pinky: true },     // AC-HANDMATH-003-05 → 40
                5: { thumb: true, index: false, middle: false, ring: false, pinky: false },  // AC-HANDMATH-003-06 → 50
                6: { thumb: true, index: true, middle: false, ring: false, pinky: false },   // AC-HANDMATH-003-07 → 60
                7: { thumb: true, index: true, middle: true, ring: false, pinky: false },    // AC-HANDMATH-003-08 → 70
                8: { thumb: true, index: true, middle: true, ring: true, pinky: false },     // AC-HANDMATH-003-09 → 80
                9: { thumb: true, index: true, middle: true, ring: true, pinky: true }       // AC-HANDMATH-003-10 → 90
            }
        };
    }

    /**
     * Calculate total value from both hands
     * AC-HANDMATH-004-01: WHEN fingers change, SHALL calculate total = (left_value + right_value)
     * 
     * @param {number} leftPattern - Left hand pattern (0-9, represents tens)
     * @param {number} rightPattern - Right hand pattern (0-9, represents ones)
     * @returns {number} Total value (0-99)
     */
    calculateTotal(leftPattern, rightPattern) {
        // Validate inputs
        if (leftPattern < 0 || leftPattern > 9 || rightPattern < 0 || rightPattern > 9) {
            console.warn('Invalid finger patterns:', { leftPattern, rightPattern });
            return 0;
        }

        // Calculate total per AC-HANDMATH-004-01
        const leftValue = leftPattern * 10; // Left hand represents tens
        const rightValue = rightPattern;     // Right hand represents ones
        const total = leftValue + rightValue;

        // Update current state
        this.currentState = { left: leftPattern, right: rightPattern };
        
        console.log(`🧮 Calculation: ${leftValue} + ${rightValue} = ${total}`);
        return total;
    }

    /**
     * Get finger pattern for a specific value and hand
     * 
     * @param {number} value - The value to get pattern for (0-9)
     * @param {string} hand - 'left' or 'right'
     * @returns {object} Finger pattern object
     */
    getFingerPattern(value, hand) {
        if (value < 0 || value > 9) {
            console.warn(`Invalid value for ${hand} hand: ${value}`);
            return this.fingerPatterns[hand + 'Hand'][0]; // Return closed fist
        }

        const patterns = hand === 'left' ? this.fingerPatterns.leftHand : this.fingerPatterns.rightHand;
        return patterns[value] || patterns[0];
    }

    /**
     * Validate finger pattern matches expected counting sequence
     * 
     * @param {object} fingerState - Current finger states
     * @param {number} expectedValue - Expected value for this pattern
     * @param {string} hand - 'left' or 'right'
     * @returns {boolean} True if pattern is valid
     */
    validatePattern(fingerState, expectedValue, hand) {
        if (expectedValue < 0 || expectedValue > 9) return false;
        
        const expectedPattern = this.getFingerPattern(expectedValue, hand);
        const fingers = ['thumb', 'index', 'middle', 'ring', 'pinky'];
        
        return fingers.every(finger => 
            Boolean(fingerState[finger]) === Boolean(expectedPattern[finger])
        );
    }

    /**
     * Get current state values
     * @returns {object} Current left and right hand values
     */
    getCurrentState() {
        return { ...this.currentState };
    }

    /**
     * Set hand to specific number pattern
     * 
     * @param {string} hand - 'left' or 'right'
     * @param {number} value - Value to set (0-9)
     * @returns {object} Finger pattern for the value
     */
    setHandValue(hand, value) {
        if (value < 0 || value > 9) {
            console.warn(`Invalid value for ${hand} hand: ${value}`);
            return this.getFingerPattern(0, hand);
        }

        const pattern = this.getFingerPattern(value, hand);
        
        // Update current state
        if (hand === 'left') {
            this.currentState.left = value;
        } else {
            this.currentState.right = value;
        }

        console.log(`🖐️ ${hand.toUpperCase()} hand set to ${value}:`, pattern);
        return pattern;
    }

    /**
     * Set total value by decomposing into tens and ones
     * 
     * @param {number} totalValue - Total value (0-99)
     * @returns {object} Both hand patterns
     */
    setTotalValue(totalValue) {
        if (totalValue < 0 || totalValue > 99) {
            console.warn(`Total value out of range: ${totalValue}`);
            return {
                left: this.getFingerPattern(0, 'left'),
                right: this.getFingerPattern(0, 'right')
            };
        }

        const tens = Math.floor(totalValue / 10);
        const ones = totalValue % 10;

        const leftPattern = this.setHandValue('left', tens);
        const rightPattern = this.setHandValue('right', ones);

        console.log(`🎯 Total ${totalValue} set: ${tens * 10} + ${ones}`);
        
        return {
            left: leftPattern,
            right: rightPattern
        };
    }

    /**
     * Reset both hands to closed fist (value 0)
     */
    reset() {
        this.currentState = { left: 0, right: 0 };
        console.log('🤲 Hands reset to closed fists');
        
        return {
            left: this.getFingerPattern(0, 'left'),
            right: this.getFingerPattern(0, 'right')
        };
    }

    /**
     * Get all possible patterns for testing/validation
     * @returns {object} All finger patterns
     */
    getAllPatterns() {
        return this.fingerPatterns;
    }

    /**
     * Get verbose description of current state for debugging
     * @returns {string} Description of current finger positions
     */
    getStateDescription() {
        const leftPattern = this.getFingerPattern(this.currentState.left, 'left');
        const rightPattern = this.getFingerPattern(this.currentState.right, 'right');
        const total = this.calculateTotal(this.currentState.left, this.currentState.right);

        const describePattern = (pattern) => {
            const extended = Object.entries(pattern)
                .filter(([finger, extended]) => extended)
                .map(([finger]) => finger);
            return extended.length > 0 ? extended.join(', ') : 'closed fist';
        };

        return `Left Hand (${this.currentState.left * 10}): ${describePattern(leftPattern)} | ` +
               `Right Hand (${this.currentState.right}): ${describePattern(rightPattern)} | ` +
               `Total: ${total}`;
    }
}

// Export for use in main application
if (typeof module !== 'undefined' && module.exports) {
    module.exports = HandMathCalculator;
} else if (typeof window !== 'undefined') {
    window.HandMathCalculator = HandMathCalculator;
}