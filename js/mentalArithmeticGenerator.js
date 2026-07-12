class MentalArithmeticGenerator {
    /**
     * Generates a multi-step expression with intermediate sums clamped to [0, 99].
     * @param {number} stepCount - Number of operands (e.g., 3 means A + B - C)
     * @returns {{operands: number[], operators: string[]}}
     */
    static generate(stepCount = 3) {
        for (let attempt = 0; attempt < 1000; attempt++) {
            const operands = [];
            const operators = [];
            
            // First operand
            let currentSum = Math.floor(Math.random() * 80) + 10; // start with a reasonable double digit number [10, 89]
            operands.push(currentSum);
            
            let valid = true;
            for (let i = 1; i < stepCount; i++) {
                const op = Math.random() < 0.5 ? '+' : '-';
                operators.push(op);
                
                let nextVal;
                if (op === '+') {
                    // Maximum we can add is 99 - currentSum
                    const maxAdd = 99 - currentSum;
                    if (maxAdd < 1) {
                        valid = false;
                        break;
                    }
                    nextVal = Math.floor(Math.random() * Math.min(40, maxAdd)) + 1;
                    currentSum += nextVal;
                } else {
                    // Maximum we can subtract is currentSum
                    if (currentSum < 1) {
                        valid = false;
                        break;
                    }
                    nextVal = Math.floor(Math.random() * Math.min(40, currentSum)) + 1;
                    currentSum -= nextVal;
                }
                operands.push(nextVal);
            }
            
            // Avoid trivial loops (e.g., +10 -10 or +5 -5 consecutively)
            if (valid && stepCount >= 3) {
                let duplicateLoop = false;
                for (let i = 0; i < operators.length - 1; i++) {
                    if (operators[i] !== operators[i+1] && operands[i+1] === operands[i+2]) {
                        duplicateLoop = true;
                        break;
                    }
                }
                if (duplicateLoop) continue;
            }
            
            if (valid) {
                return { operands, operators };
            }
        }
        
        // Safe fallback
        return { operands: [34, 33, 40], operators: ['+', '-'] };
    }

    /**
     * Generates 5 unique multiple choice options, shuffling them.
     * @param {number} target - The correct answer
     * @returns {number[]} - Array of 5 numbers, including correct answer
     */
    static generateChoices(target) {
        const choicesSet = new Set();
        choicesSet.add(target);
        
        const candidateGenerators = [
            () => target + 10,
            () => target - 10,
            () => target + 5,
            () => target - 5,
            () => target + 1,
            () => target - 1,
            () => {
                // Transposition error (e.g. 27 -> 72)
                const tens = Math.floor(target / 10);
                const ones = target % 10;
                if (tens !== ones) {
                    return ones * 10 + tens;
                }
                return target + 20; // fallback if transposition is not possible
            }
        ];

        // Shuffle generators to introduce variety in distractors
        candidateGenerators.sort(() => Math.random() - 0.5);

        for (const gen of candidateGenerators) {
            if (choicesSet.size >= 5) break;
            const val = gen();
            if (val >= 0 && val <= 99 && val !== target) {
                choicesSet.add(val);
            }
        }

        // Fill remainder with random choices if needed
        while (choicesSet.size < 5) {
            const randomVal = Math.floor(Math.random() * 100);
            choicesSet.add(randomVal);
        }

        // Convert to array and shuffle
        const choices = Array.from(choicesSet);
        return choices.sort(() => Math.random() - 0.5);
    }
}

// Export for ES6/browser usage
if (typeof window !== 'undefined') {
    window.MentalArithmeticGenerator = MentalArithmeticGenerator;
}
