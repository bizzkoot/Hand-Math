document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('hand-canvas');
    const renderer = new CanvasHandRenderer(canvas);

    const numberInput = document.getElementById('number-input');
    const showNumberButton = document.getElementById('show-number');

    function updateHands() {
        const total = parseInt(numberInput.value, 10);
        if (isNaN(total) || total < 0 || total > 99) {
            alert("Please enter a number between 0 and 99.");
            return;
        }

        const tens = Math.floor(total / 10);
        const ones = total % 10;

        renderer.render(tens, ones);
    }

    showNumberButton.addEventListener('click', updateHands);

    // Initial render
    updateHands();
});
