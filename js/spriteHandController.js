class SpriteHandController {
    constructor(leftHandElement, rightHandElement) {
        this.leftHand = leftHandElement;
        this.rightHand = rightHandElement;
        this.currentLeft = 0;
        this.currentRight = 0;
    }
    
    setNumber(total) {
        const tens = Math.floor(total / 10);
        const ones = total % 10;
        
        this.setHandState(this.leftHand, tens);
        this.setHandState(this.rightHand, ones);
        
        this.currentLeft = tens;
        this.currentRight = ones;
    }
    
    setHandState(handElement, state) {
        // Remove all state classes
        for (let i = 0; i <= 9; i++) {
            handElement.classList.remove(`state-${i}`);
        }
        
        // Add the new state class
        handElement.classList.add(`state-${state}`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const leftHand = document.getElementById('left-hand');
    const rightHand = document.getElementById('right-hand');
    const numberInput = document.getElementById('number-input');
    const showNumberButton = document.getElementById('show-number');

    const controller = new SpriteHandController(leftHand, rightHand);

    function updateHands() {
        const total = parseInt(numberInput.value, 10);
        if (isNaN(total) || total < 0 || total > 99) {
            alert("Please enter a number between 0 and 99.");
            return;
        }
        controller.setNumber(total);
    }

    showNumberButton.addEventListener('click', updateHands);

    // Initial render
    updateHands();
});
