class ArithmeticBuilder {
    constructor() {
        this.fingersOrder = ['thumb','index','middle','ring','pinky'];
    }

    buildTutorial(number) {
        const left = Math.floor(number / 10);
        const right = number % 10;
        return [
            { id: 't-show-tens', title: window.i18n.t('step.tens'), target: { left, right: 0 }, animate: 'step', cue: 'highlight-left', narration: window.i18n.t('narration.leftShows', {value: left * 10}) },
            { id: 't-show-ones', title: window.i18n.t('step.ones'), target: { left, right }, animate: 'step', cue: 'highlight-right', narration: window.i18n.t('narration.rightShows', {value: right}) },
            { id: 't-confirm', title: window.i18n.t('step.result'), target: { left, right }, animate: 'instant', narration: window.i18n.t('narration.number', {value: number}) }
        ];
    }

    buildAddition(a, b) {
        const steps = [];
        const aL = Math.floor(a / 10), aR = a % 10;
        const bL = Math.floor(b / 10), bR = b % 10;
        steps.push({ id: 'a-show-operands', title: window.i18n.t('step.setup'), target: { left: aL, right: aR }, animate: 'instant', narration: window.i18n.t('narration.additionFormat', {a, b}), explain: window.i18n.t('explain.leftTensRightOnes') });

        const onesSum = aR + bR;
        if (onesSum < 10) {
            const hint = this._deltaHint('right', aR, onesSum, window.i18n.t('explain.addOnes', {bR}));
            steps.push({ id: 'a-ones-add', title: window.i18n.t('step.addOnes'), target: { left: aL, right: onesSum }, animate: 'count-up', cue: 'highlight-right', narration: window.i18n.t('narration.addOnes', {aR, bR, onesSum}), explain: hint });
            const tensTotal = aL + bL;
            steps.push({ id: 'a-add-tens', title: window.i18n.t('step.addTens'), target: { left: tensTotal, right: onesSum }, animate: 'count-up', cue: 'highlight-left', narration: window.i18n.t('narration.addTens', {bL}), explain: this._deltaHint('left', aL, tensTotal, window.i18n.t('explain.openTens', {bL})) });
            steps.push({ id: 'a-confirm', title: window.i18n.t('step.final'), target: { left: tensTotal, right: onesSum }, animate: 'instant', narration: window.i18n.t('narration.confirmAdd', {a, b, result: a + b}) });
            return steps;
        }

        // New mental-carry pedagogy: do not move fingers for +10; only show subtract complement on right,
        // and apply carry during the tens step (bL + 1).
        const complement = 10 - bR; // e.g., for adding 3, complement = 7
        const rightAfter = aR - complement; // final ones after removing complement from 9..aR

        steps.push({
            id: 'a-ones-mental-complement',
            title: window.i18n.t('step.mentalComplement'),
            target: { left: aL, right: aR }, // no finger movement
            animate: 'instant',
            cue: null,
            narration: window.i18n.t('narration.mentalComplement', {aR, bR, complement}),
            details: [
                window.i18n.t('narration.trickComplement', {bR, complement}),
                window.i18n.t('narration.removeComplement', {complement})
            ]
        });
        // Subtract complement on right in one decisive motion
        const diff = this._diffFingers(aR, rightAfter);
        const hintSub = this._deltaHint('right', aR, rightAfter, window.i18n.t('explain.rightSubComplement', {aR, complement, rightAfter}));
        steps.push({
            id: 'a-ones-sub-complement',
            title: window.i18n.t('narration.rightBecomes', {rightAfter}),
            target: { left: aL, right: rightAfter },
            animate: 'step',
            cue: 'highlight-right',
            narration: window.i18n.t('narration.rightBecomes', {rightAfter}),
            explain: hintSub
        });
        // Add tens with carry applied here
        const tensTotal = aL + bL + 1;
        steps.push({ id: 'a-add-tens', title: window.i18n.t('step.addTens'), target: { left: tensTotal, right: rightAfter }, animate: 'count-up', cue: 'highlight-left', narration: window.i18n.t('narration.addTensCarry', {bL}), explain: this._deltaHint('left', aL, tensTotal, window.i18n.t('explain.openTensCarry', {count: bL + 1})) });
        steps.push({ id: 'a-confirm', title: window.i18n.t('step.final'), target: { left: tensTotal, right: rightAfter }, animate: 'instant', narration: window.i18n.t('narration.confirmAdd', {a, b, result: a + b}) });
        return steps;
    }

    buildSubtraction(a, b) {
        const steps = [];
        const aL = Math.floor(a / 10), aR = a % 10;
        const bL = Math.floor(b / 10), bR = b % 10;
        steps.push({ id: 's-show-operands', target: { left: aL, right: aR }, animate: 'instant', narration: window.i18n.t('narration.subtractionFormat', {a, b}) });

        let left = aL, right = aR;
        if (right < bR) {
            // Borrow path with mental math: right ← aR + (10 - bR)
            const complement = 10 - bR; // e.g., for 7, complement = 3
            steps.push({ id: 's-setup', title: window.i18n.t('step.setupSub'), target: { left, right }, animate: 'instant', narration: window.i18n.t('narration.subtractionFormat', {a, b}), explain: window.i18n.t('explain.leftTensRightOnes') });
            steps.push({ id: 's-borrow', title: window.i18n.t('step.borrow'), target: { left: left - 1, right }, animate: 'instant', cue: 'borrow', narration: window.i18n.t('narration.borrow') });
            const newRight = right + complement; // effectively aR + (10 - bR)
            const hintRight = this._deltaHint('right', right, newRight, window.i18n.t('explain.rightBorrow', {right, bR, newRight}));
            steps.push({ id: 's-ones-after-borrow', title: window.i18n.t('step.afterBorrow'), target: { left: left - 1, right: newRight }, animate: 'count-up', cue: 'highlight-right', narration: window.i18n.t('narration.rightBecomesBorrow', {newRight}), explain: hintRight });
            left = left - 1; right = newRight; // update
        } else {
            // No borrow needed
            const newRight = right - bR;
            const hint = this._deltaHint('right', right, newRight, window.i18n.t('explain.subtractOnes', {bR}));
            steps.push({ id: 's-sub-ones', title: window.i18n.t('step.subOnes'), target: { left, right: newRight }, animate: 'count-down', cue: 'highlight-right', narration: window.i18n.t('narration.subOnes', {right, bR, newRight}), explain: hint });
            right = newRight;
        }
        // Subtract tens
        const newLeft = left - bL;
        const hintL = this._deltaHint('left', left, newLeft, window.i18n.t('explain.subtractTens', {bL}));
        steps.push({ id: 's-sub-tens', title: window.i18n.t('step.subTens'), target: { left: newLeft, right }, animate: 'count-down', cue: 'highlight-left', narration: window.i18n.t('narration.leftBecomesTens', {newLeft}), explain: hintL });
        steps.push({ id: 's-confirm', title: window.i18n.t('step.final'), target: { left: newLeft, right }, animate: 'instant', narration: window.i18n.t('narration.confirmSub', {a, b, result: a - b}) });
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
        const mapFingers = (names) => names.map(f => window.i18n.t('finger.' + f)).join('+');
        const parts = [];
        if (open.length) parts.push(window.i18n.t('explain.openFingers', {fingers: mapFingers(open)}));
        if (close.length) parts.push(window.i18n.t('explain.closeFingers', {fingers: mapFingers(close)}));
        const text = parts.length ? `${prefix}: ${parts.join(', ')}` : prefix;
        return hand === 'right' ? window.i18n.t('explain.rightPrefix', {text}) : window.i18n.t('explain.leftPrefix', {text});
    }
}
