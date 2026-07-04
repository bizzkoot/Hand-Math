class ArithmeticBuilder {
    constructor() {
        this.fingersOrder = ['thumb','index','middle','ring','pinky'];
        this._i18n = () => window.i18n;
    }

    // --- Classification helpers ---

    _classifyOnesAdd(aR, bR) {
        const i = this._i18n();
        if (bR === 0) return { kind: 'tens-only', c5: 0, c10: 0, rule: i.t('rule.tensOnly'), why: null };
        const c5 = 5 - bR;
        const c10 = 10 - bR;
        const lowerBeads = aR % 5;
        const onesSum = aR + bR;
        if (onesSum < 10) {
            if (lowerBeads + bR <= 4) {
                return {
                    kind: 'direct', c5, c10,
                    rule: i.t('rule.directAdd'),
                    why: i.t('why.directAdd', {bR})
                };
            } else {
                return {
                    kind: 'five-comp', c5, c10,
                    rule: i.t('rule.fiveCompAdd', {bR, c5}),
                    why: i.t('why.fiveCompAdd', {bR, c5})
                };
            }
        } else {
            return {
                kind: 'ten-comp', c5, c10,
                rule: i.t('rule.tenCompAdd', {bR, c10}),
                why: i.t('why.tenCompAdd', {bR, c10})
            };
        }
    }

    _classifyOnesSub(aR, bR) {
        const i = this._i18n();
        if (bR === 0) return { kind: 'tens-only', c5: 0, c10: 0, rule: i.t('rule.tensOnly'), why: null };
        const c5 = 5 - bR;
        const c10 = 10 - bR;
        if (aR >= bR) {
            const lowerBeads = aR % 5;
            if (lowerBeads >= bR) {
                return {
                    kind: 'direct', c5, c10,
                    rule: i.t('rule.directSub'),
                    why: i.t('why.directSub', {bR})
                };
            } else {
                return {
                    kind: 'five-comp', c5, c10,
                    rule: i.t('rule.fiveCompSub', {c5}),
                    why: i.t('why.fiveCompSub', {bR, c5})
                };
            }
        } else {
            return {
                kind: 'borrow', c5, c10,
                rule: i.t('rule.tenCompSub', {c10}),
                why: i.t('why.tenCompSub', {bR, c10})
            };
        }
    }

    _runningValue(left, right) {
        return this._i18n().t('running.value', {value: left * 10 + right});
    }

    // --- Tutorial (extended with place-value intro) ---

    buildTutorial(number) {
        const i = this._i18n();
        const left = Math.floor(number / 10);
        const right = number % 10;
        return [
            {
                id: 't-place-value',
                title: i.t('tutorial.placeValueTitle'),
                narration: i.t('narration.number', {value: number}),
                rule: i.t('tutorial.placeValue'),
                target: { left: 0, right: 0 },
                animate: 'instant',
                cue: null
            },
            {
                id: 't-show-tens',
                title: i.t('step.tens'),
                target: { left, right: 0 },
                animate: 'step',
                cue: 'highlight-left',
                narration: i.t('narration.leftShows', {value: left * 10}),
                running: this._runningValue(left, 0)
            },
            {
                id: 't-show-ones',
                title: i.t('step.ones'),
                target: { left, right },
                animate: 'step',
                cue: 'highlight-right',
                narration: i.t('narration.rightShows', {value: right}),
                running: this._runningValue(left, right)
            },
            {
                id: 't-confirm',
                title: i.t('step.result'),
                target: { left, right },
                animate: 'instant',
                narration: i.t('narration.number', {value: number})
            }
        ];
    }

    // --- Addition ---

    buildAddition(a, b) {
        const i = this._i18n();
        const steps = [];
        const aL = Math.floor(a / 10), aR = a % 10;
        const bL = Math.floor(b / 10), bR = b % 10;

        steps.push({
            id: 'a-show-operands',
            title: i.t('step.setup'),
            target: { left: aL, right: aR },
            animate: 'instant',
            narration: i.t('narration.additionFormat', {a, b}),
            explain: i.t('explain.leftTensRightOnes')
        });

        const onesSum = aR + bR;

        if (onesSum < 10) {
            // Direct or 5-complement path (no carry)
            const cls = this._classifyOnesAdd(aR, bR);
            const rightAfter = aR + bR;

            if (cls.kind === 'tens-only') {
                steps.push({
                    id: 'a-ones-none',
                    title: i.t('step.addOnes'),
                    narration: i.t('narration.addOnes', {aR, bR, onesSum: aR}),
                    rule: cls.rule,
                    target: { left: aL, right: aR },
                    animate: 'instant',
                    cue: null,
                    running: this._runningValue(aL, aR)
                });
            } else if (cls.kind === 'direct') {
                const hint = this._deltaHint('right', aR, rightAfter, i.t('explain.addOnes', {bR}));
                steps.push({
                    id: 'a-ones-direct',
                    title: i.t('step.addOnes'),
                    narration: i.t('narration.addOnes', {aR, bR, onesSum: rightAfter}),
                    rule: cls.rule,
                    target: { left: aL, right: rightAfter },
                    animate: 'count-up',
                    cue: 'highlight-right',
                    explain: hint,
                    running: this._runningValue(aL, rightAfter),
                    why: cls.why
                });
            } else if (cls.kind === 'five-comp') {
                const hint = this._deltaHint('right', aR, rightAfter, i.t('explain.addOnes', {bR}));
                steps.push({
                    id: 'a-ones-five-comp',
                    title: i.t('step.addOnes'),
                    narration: i.t('narration.addOnes', {aR, bR, onesSum: rightAfter}),
                    rule: cls.rule,
                    target: { left: aL, right: rightAfter },
                    animate: 'step',
                    cue: 'highlight-right',
                    explain: hint,
                    running: this._runningValue(aL, rightAfter),
                    why: cls.why
                });
            }

            // Tens step (no carry)
            const tensTotal = aL + bL;
            const tensNarration = bL === 0 ? i.t('narration.addTensNone', {value: aL}) : i.t('narration.addTens', {bL});
            const tensExplain = bL === 0 ? i.t('explain.addTensNone', {value: aL}) : this._deltaHint('left', aL, tensTotal, i.t('explain.openTens', {bL}));
            steps.push({
                id: 'a-add-tens',
                title: i.t('step.addTens'),
                target: { left: tensTotal, right: rightAfter },
                animate: 'count-up',
                cue: 'highlight-left',
                narration: tensNarration,
                explain: tensExplain,
                running: this._runningValue(tensTotal, rightAfter)
            });
            steps.push({
                id: 'a-confirm',
                title: i.t('step.final'),
                target: { left: tensTotal, right: rightAfter },
                animate: 'instant',
                narration: i.t('narration.confirmAdd', {a, b, result: a + b})
            });
            return steps;
        }

        // 10-complement / carry path
        const c10 = 10 - bR;
        const rightAfter = aR - c10;

        steps.push({
            id: 'a-ones-mental-complement',
            title: i.t('step.mentalComplement'),
            target: { left: aL, right: aR },
            animate: 'instant',
            cue: null,
            narration: i.t('narration.mentalComplement', {aR, bR, complement: c10}),
            rule: i.t('rule.tenCompAdd', {bR, c10}),
            details: [
                i.t('narration.trickComplement', {bR, complement: c10}),
                i.t('narration.removeComplement', {complement: c10})
            ],
            why: i.t('why.tenCompAdd', {bR, c10}),
            running: this._runningValue(aL, aR) + ' ' + i.t('running.overflow')
        });

        const hintSub = this._deltaHint('right', aR, rightAfter, i.t('explain.rightSubComplement', {aR, complement: c10, rightAfter}));
        steps.push({
            id: 'a-ones-sub-complement',
            title: i.t('narration.rightBecomes', {rightAfter}),
            target: { left: aL, right: rightAfter },
            animate: 'step',
            cue: 'highlight-right',
            narration: i.t('narration.rightBecomes', {rightAfter}),
            explain: hintSub,
            running: this._runningValue(aL, rightAfter)
        });

        // Tens step with carry — now emits cue:'carry' for the overlay
        const tensTotal = aL + bL + 1;
        steps.push({
            id: 'a-add-tens',
            title: i.t('step.addTens'),
            target: { left: tensTotal, right: rightAfter },
            animate: 'count-up',
            cue: 'carry',
            narration: i.t('narration.addTensCarry', {bL}),
            explain: this._deltaHint('left', aL, tensTotal, i.t('explain.openTensCarry', {count: bL + 1})),
            running: this._runningValue(tensTotal, rightAfter)
        });

        steps.push({
            id: 'a-confirm',
            title: i.t('step.final'),
            target: { left: tensTotal, right: rightAfter },
            animate: 'instant',
            narration: i.t('narration.confirmAdd', {a, b, result: a + b})
        });
        return steps;
    }

    // --- Subtraction ---

    buildSubtraction(a, b) {
        const i = this._i18n();
        const steps = [];
        const aL = Math.floor(a / 10), aR = a % 10;
        const bL = Math.floor(b / 10), bR = b % 10;

        steps.push({
            id: 's-show-operands',
            target: { left: aL, right: aR },
            animate: 'instant',
            narration: i.t('narration.subtractionFormat', {a, b})
        });

        let left = aL, right = aR;
        let newLeft;

        if (right < bR) {
            // Borrow path
            const c10 = 10 - bR;
            steps.push({
                id: 's-setup',
                title: i.t('step.setupSub'),
                target: { left, right },
                animate: 'instant',
                narration: i.t('narration.subtractionFormat', {a, b}),
                explain: i.t('explain.leftTensRightOnes')
            });

            steps.push({
                id: 's-borrow',
                title: i.t('step.borrow'),
                target: { left: left - 1, right },
                animate: 'instant',
                cue: 'borrow',
                narration: i.t('narration.borrow'),
                rule: i.t('rule.tenCompSub', {c10}),
                why: i.t('why.tenCompSub', {bR, c10})
            });

            const newRight = right + c10;
            const hintRight = this._deltaHint('right', right, newRight, i.t('explain.rightBorrow', {right, bR, newRight}));
            steps.push({
                id: 's-ones-after-borrow',
                title: i.t('step.afterBorrow'),
                target: { left: left - 1, right: newRight },
                animate: 'count-up',
                cue: 'highlight-right',
                narration: i.t('narration.rightBecomesBorrow', {newRight}),
                explain: hintRight,
                running: this._runningValue(left - 1, newRight)
            });
            left = left - 1;
            right = newRight;

            // Tens step after borrow — fixed: explain what actually happened
            newLeft = left - bL;
            const subTensNarration = bL === 0
                ? i.t('explain.subTensAfterBorrow', {leftAfterBorrow: left})
                : i.t('narration.leftBecomesTens', {newLeft});
            const hintL = bL === 0
                ? i.t('explain.subTensAfterBorrowHint')
                : this._deltaHint('left', left, newLeft, i.t('explain.subtractTens', {bL}));
            steps.push({
                id: 's-sub-tens',
                title: i.t('step.subTens'),
                target: { left: newLeft, right },
                animate: 'count-down',
                cue: 'highlight-left',
                narration: subTensNarration,
                explain: hintL,
                running: this._runningValue(newLeft, right)
            });
        } else {
            // No borrow — direct or 5-comp subtraction
            const cls = this._classifyOnesSub(aR, bR);
            const newRight = aR - bR;

            if (cls.kind === 'tens-only') {
                steps.push({
                    id: 's-ones-none',
                    title: i.t('step.subOnes'),
                    narration: i.t('narration.subOnes', {right: aR, bR, newRight: aR}),
                    rule: cls.rule,
                    target: { left, right: aR },
                    animate: 'instant',
                    cue: null
                });
            } else if (cls.kind === 'direct') {
                const hint = this._deltaHint('right', aR, newRight, i.t('explain.subtractOnes', {bR}));
                steps.push({
                    id: 's-sub-ones-direct',
                    title: i.t('step.subOnes'),
                    narration: i.t('narration.subOnes', {right: aR, bR, newRight}),
                    rule: cls.rule,
                    target: { left, right: newRight },
                    animate: 'count-down',
                    cue: 'highlight-right',
                    explain: hint,
                    running: this._runningValue(left, newRight),
                    why: cls.why
                });
            } else if (cls.kind === 'five-comp') {
                const hint = this._deltaHint('right', aR, newRight, i.t('explain.subtractOnes', {bR}));
                steps.push({
                    id: 's-sub-ones-five-comp',
                    title: i.t('step.subOnes'),
                    narration: i.t('narration.subOnes', {right: aR, bR, newRight}),
                    rule: cls.rule,
                    target: { left, right: newRight },
                    animate: 'count-down',
                    cue: 'highlight-right',
                    explain: hint,
                    running: this._runningValue(left, newRight),
                    why: cls.why
                });
            }
            right = newRight;

            // Tens step (no borrow)
            newLeft = left - bL;
            const subTensNarration = bL === 0
                ? i.t('narration.subTensNone', {value: left})
                : i.t('narration.leftBecomesTens', {newLeft});
            const hintL = bL === 0
                ? i.t('explain.subTensNone', {value: left})
                : this._deltaHint('left', left, newLeft, i.t('explain.subtractTens', {bL}));
            steps.push({
                id: 's-sub-tens',
                title: i.t('step.subTens'),
                target: { left: newLeft, right },
                animate: 'count-down',
                cue: 'highlight-left',
                narration: subTensNarration,
                explain: hintL,
                running: this._runningValue(newLeft, right)
            });
        }

        steps.push({
            id: 's-confirm',
            title: i.t('step.final'),
            target: { left: newLeft, right },
            animate: 'instant',
            narration: i.t('narration.confirmSub', {a, b, result: a - b})
        });
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
        const mapFingers = (names) => names.map(f => this._i18n().t('finger.' + f)).join('+');
        const parts = [];
        if (open.length) parts.push(this._i18n().t('explain.openFingers', {fingers: mapFingers(open)}));
        if (close.length) parts.push(this._i18n().t('explain.closeFingers', {fingers: mapFingers(close)}));
        const text = parts.length ? `${prefix}: ${parts.join(', ')}` : prefix;
        return hand === 'right' ? this._i18n().t('explain.rightPrefix', {text}) : this._i18n().t('explain.leftPrefix', {text});
    }
}
