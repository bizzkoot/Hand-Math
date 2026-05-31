class ArithmeticBuilder {
    constructor() {
        this.fingersOrder = ['thumb','index','middle','ring','pinky'];
    }

    buildTutorial(number) {
        const left = Math.floor(number / 10);
        const right = number % 10;
        return [
            { id: 't-show-tens', title: 'Tens', target: { left, right: 0 }, animate: 'step', cue: 'highlight-left', narration: `Left shows ${left * 10}` },
            { id: 't-show-ones', title: 'Ones', target: { left, right }, animate: 'step', cue: 'highlight-right', narration: `Right shows ${right}` },
            { id: 't-confirm', title: 'Result', target: { left, right }, animate: 'instant', narration: `${number}` }
        ];
    }

    buildAddition(a, b) {
        const steps = [];
        const aL = Math.floor(a / 10), aR = a % 10;
        const bL = Math.floor(b / 10), bR = b % 10;
        steps.push({ id: 'a-show-operands', title: 'Setup', target: { left: aL, right: aR }, animate: 'instant', narration: `${a} + ${b}`, explain: 'Left = tens, Right = ones' });

        const onesSum = aR + bR;
        if (onesSum < 10) {
            const hint = this._deltaHint('right', aR, onesSum, `Add ${bR} on the right`);
            steps.push({ id: 'a-ones-add', title: 'Step 1: Add ones', target: { left: aL, right: onesSum }, animate: 'count-up', cue: 'highlight-right', narration: `${aR} + ${bR} = ${onesSum}`, explain: hint });
            const tensTotal = aL + bL;
            steps.push({ id: 'a-add-tens', title: 'Step 2: Add tens', target: { left: tensTotal, right: onesSum }, animate: 'count-up', cue: 'highlight-left', narration: `Add ${bL} tens`, explain: this._deltaHint('left', aL, tensTotal, `Open ${bL} tens`) });
            steps.push({ id: 'a-confirm', title: 'Final', target: { left: tensTotal, right: onesSum }, animate: 'instant', narration: `${a} + ${b} = ${a + b}` });
            return steps;
        }

        // New mental-carry pedagogy: do not move fingers for +10; only show subtract complement on right,
        // and apply carry during the tens step (bL + 1).
        const complement = 10 - bR; // e.g., for adding 3, complement = 7
        const rightAfter = aR - complement; // final ones after removing complement from 9..aR

        steps.push({
            id: 'a-ones-mental-complement',
            title: 'Step 1: Add the ones (mental)',
            target: { left: aL, right: aR }, // no finger movement
            animate: 'instant',
            cue: null,
            narration: `${aR} + ${bR} is easier as 10 - ${complement}`,
            details: [
                `Trick: 10 - ${bR} = ${complement}`,
                `We will remove ${complement} on the right`
            ]
        });
        // Subtract complement on right in one decisive motion
        const diff = this._diffFingers(aR, rightAfter);
        const hintSub = this._deltaHint('right', aR, rightAfter, `Right: ${aR} - ${complement} = ${rightAfter}`);
        steps.push({
            id: 'a-ones-sub-complement',
            title: `Remove ${complement} on right`,
            target: { left: aL, right: rightAfter },
            animate: 'step',
            cue: 'highlight-right',
            narration: `Right becomes ${rightAfter}`,
            explain: hintSub
        });
        // Add tens with carry applied here
        const tensTotal = aL + bL + 1;
        steps.push({ id: 'a-add-tens', title: 'Step 2: Add the tens', target: { left: tensTotal, right: rightAfter }, animate: 'count-up', cue: 'highlight-left', narration: `Add ${bL} tens + carry 1`, explain: this._deltaHint('left', aL, tensTotal, `Open ${bL + 1} tens`) });
        steps.push({ id: 'a-confirm', title: 'Final', target: { left: tensTotal, right: rightAfter }, animate: 'instant', narration: `${a} + ${b} = ${a + b}` });
        return steps;
    }

    buildSubtraction(a, b) {
        const steps = [];
        const aL = Math.floor(a / 10), aR = a % 10;
        const bL = Math.floor(b / 10), bR = b % 10;
        steps.push({ id: 's-show-operands', target: { left: aL, right: aR }, animate: 'instant', narration: `${a} - ${b}` });

        let left = aL, right = aR;
        if (right < bR) {
            // Borrow path with mental math: right ← aR + (10 - bR)
            const complement = 10 - bR; // e.g., for 7, complement = 3
            steps.push({ id: 's-setup', title: 'Step 1: Set up', target: { left, right }, animate: 'instant', narration: `${a} - ${b}`, explain: 'Left = tens, Right = ones' });
            steps.push({ id: 's-borrow', title: 'Borrow 10', target: { left: left - 1, right }, animate: 'instant', cue: 'borrow', narration: 'Close one finger on left (borrow 10)' });
            const newRight = right + complement; // effectively aR + (10 - bR)
            const hintRight = this._deltaHint('right', right, newRight, `Right: ${right} + (10 - ${bR}) = ${newRight}`);
            steps.push({ id: 's-ones-after-borrow', title: `Ones after borrow`, target: { left: left - 1, right: newRight }, animate: 'count-up', cue: 'highlight-right', narration: `Right becomes ${newRight}`, explain: hintRight });
            left = left - 1; right = newRight; // update
        } else {
            // No borrow needed
            const newRight = right - bR;
            const hint = this._deltaHint('right', right, newRight, `Subtract ${bR} on the right`);
            steps.push({ id: 's-sub-ones', title: 'Step 1: Subtract ones', target: { left, right: newRight }, animate: 'count-down', cue: 'highlight-right', narration: `${right} - ${bR} = ${newRight}`, explain: hint });
            right = newRight;
        }
        // Subtract tens
        const newLeft = left - bL;
        const hintL = this._deltaHint('left', left, newLeft, `Subtract ${bL} tens`);
        steps.push({ id: 's-sub-tens', title: 'Step 2: Subtract tens', target: { left: newLeft, right }, animate: 'count-down', cue: 'highlight-left', narration: `Left becomes ${newLeft} tens`, explain: hintL });
        steps.push({ id: 's-confirm', title: 'Final', target: { left: newLeft, right }, animate: 'instant', narration: `${a} - ${b} = ${a - b}` });
        return steps;
    }

    // --- Helpers for finger explanations ---
    _digitPattern(d) {
        const map = [
            { thumb:false,index:false,middle:false,ring:false,pinky:false },
            { thumb:false,index:true ,middle:false,ring:false,pinky:false },
            { thumb:false,index:true ,middle:true ,ring:false,pinky:false },
            { thumb:false,index:true ,middle:true ,ring:true ,pinky:false },
            { thumb:false,index:true ,middle:true ,ring:true ,pinky:true  },
            { thumb:true ,index:false,middle:false,ring:false,pinky:false },
            { thumb:true ,index:true ,middle:false,ring:false,pinky:false },
            { thumb:true ,index:true ,middle:true ,ring:false,pinky:false },
            { thumb:true ,index:true ,middle:true ,ring:true ,pinky:false },
            { thumb:true ,index:true ,middle:true ,ring:true ,pinky:true  }
        ];
        return map[Math.max(0, Math.min(9, d|0))];
    }
    _diffFingers(from, to) {
        const a = this._digitPattern(from);
        const b = this._digitPattern(to % 10);
        const open = [];
        const close = [];
        this.fingersOrder.forEach(f => {
            if (!a[f] && b[f]) open.push(f);
            if (a[f] && !b[f]) close.push(f);
        });
        return { open, close };
    }
    _deltaHint(hand, from, to, prefix) {
        const a = this._digitPattern(from);
        const b = this._digitPattern(to % 10);
        const open = [];
        const close = [];
        this.fingersOrder.forEach(f => {
            if (!a[f] && b[f]) open.push(f);
            if (a[f] && !b[f]) close.push(f);
        });
        const parts = [];
        if (open.length) parts.push(`open ${open.join('+')}`);
        if (close.length) parts.push(`close ${close.join('+')}`);
        const text = parts.length ? `${prefix}: ${parts.join(', ')}` : prefix;
        return hand === 'right' ? `Right: ${text}` : `Left: ${text}`;
    }
}
