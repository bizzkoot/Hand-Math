class HandAdapter {
    constructor(app) {
        this.app = app; // HandMathApp instance
        this.handController = app.handController;
        this.calculator = app.calculator;
        this._epsilon = 0.005;
    }

    // Show specific digits on left (tens) and right (ones)
    async animateDigits(opts) {
        const { left, right, mode = 'instant', durationMs = 450, highlight = null } = opts;
        if (!this.handController || !this.calculator) return;

        const leftPattern = this.calculator.setHandValue('left', Math.max(0, Math.min(9, left|0)));
        const rightPattern = this.calculator.setHandValue('right', Math.max(0, Math.min(9, right|0)));

        const apply = () => {
            this._applyPattern('left', leftPattern);
            this._applyPattern('right', rightPattern);
        };

        switch (mode) {
            case 'instant':
                apply();
                break;
            case 'step':
            default:
                apply();
                break;
        }

        if (highlight === 'left') this._setOverlay('left', true);
        if (highlight === 'right') this._setOverlay('right', true);
        if (!highlight) this._clearOverlays();

        return this.awaitSettled({ timeoutMs: durationMs + 400 });
    }

    // Count up/down on a given hand by N ticks (used for ones/tens operations)
    async playCount({ hand, by }) {
        const step = by >= 0 ? 1 : -1;
        const ticks = Math.abs(by);
        let current = this._currentDigit(hand);
        for (let i = 0; i < ticks; i++) {
            current += step;
            if (hand === 'right' && current > 9) current = 0;
            if (hand === 'right' && current < 0) current = 9;
            if (hand === 'left' && current > 9) current = 0;
            if (hand === 'left' && current < 0) current = 9;
            const left = hand === 'left' ? current : this._currentDigit('left');
            const right = hand === 'right' ? current : this._currentDigit('right');
            await this.animateDigits({ left, right, mode: 'step', durationMs: 250, highlight: hand });
        }
    }

    emphasize(hand, cue) {
        if (cue === 'highlight') {
            this._setOverlay(hand, true);
        } else if (cue === 'carry') {
            this._setCarryBorrow('Carry 1 ten');
            this._announce('Carry 1 ten to the left hand');
        } else if (cue === 'borrow') {
            this._setCarryBorrow('Borrow 1 ten');
            this._announce('Borrow 1 ten from the left hand');
        }
    }

    async awaitSettled({ timeoutMs = 2000 } = {}) {
        const start = performance.now();
        return new Promise(resolve => {
            const check = () => {
                const ok = this._isSettled('left') && this._isSettled('right');
                const expired = performance.now() - start > timeoutMs;
                if (ok || expired) return resolve(ok);
                requestAnimationFrame(check);
            };
            check();
        });
    }

    // Internal helpers
    _applyPattern(hand, pattern) {
        const side = hand === 'left' ? 'left' : 'right';
        
        // Phase 2.2: Track opening and closing fingers for halos contract
        const prevTargets = { ...this.handController.targetPositions[side] };
        const openFingers = [];
        const closeFingers = [];

        ['thumb','index','middle','ring','pinky'].forEach(f => {
            const pos = pattern[f] ? 1 : 0;
            this.handController.setFingerPosition(side, f, pos);
            
            const prevVal = prevTargets[f] ?? 0;
            if (prevVal < 0.5 && pos >= 0.5) {
                openFingers.push(f);
            } else if (prevVal >= 0.5 && pos < 0.5) {
                closeFingers.push(f);
            }
        });

        const el = document.getElementById(side === 'left' ? 'overlayLeft' : 'overlayRight');
        if (el) {
            if (openFingers.length > 0) {
                el.setAttribute('data-open', openFingers.join(','));
            } else {
                el.removeAttribute('data-open');
            }
            if (closeFingers.length > 0) {
                el.setAttribute('data-close', closeFingers.join(','));
            } else {
                el.removeAttribute('data-close');
            }
        }
    }

    _currentDigit(hand) {
        // Infer via calculator based on targetPositions → crude, but stable for step engine
        const tp = this.handController?.targetPositions?.[hand];
        if (!tp) return 0;
        const pattern = {
            thumb: tp.thumb >= 0.5,
            index: tp.index >= 0.5,
            middle: tp.middle >= 0.5,
            ring: tp.ring >= 0.5,
            pinky: tp.pinky >= 0.5
        };
        // Use calculator to decode pattern if supported; fallback count
        if (this.calculator?.patternToDigit) {
            try { return this.calculator.patternToDigit(hand, pattern) ?? 0; } catch (_) {}
        }
        // Fallback: simple sum as rough estimate (thumb=5 others=1)
        return (pattern.thumb ? 5 : 0) + ['index','middle','ring','pinky'].reduce((s,f)=>s+(pattern[f]?1:0),0);
    }

    _isSettled(hand) {
        const curr = this.handController?.currentPositions?.[hand];
        const targ = this.handController?.targetPositions?.[hand];
        if (!curr || !targ) return true;
        return ['thumb','index','middle','ring','pinky'].every(f => Math.abs((curr[f]??0) - (targ[f]??0)) < this._epsilon);
    }

    _setOverlay(which, on) {
        const el = document.getElementById(which === 'left' ? 'overlayLeft' : 'overlayRight');
        if (!el) return;
        el.classList.toggle('on', !!on);
    }

    _clearOverlays() {
        this._setOverlay('left', false);
        this._setOverlay('right', false);
    }

    _setCarryBorrow(text) {
        const el = document.getElementById('carryBorrowCue');
        if (!el) return;
        el.textContent = text;
        el.classList.add('on');
        setTimeout(() => el.classList.remove('on'), 800);
    }

    setFingerHalos() { /* removed per simplification */ }

    _announce(text) {
        const live = document.getElementById('statusLive');
        if (!live) return;
        live.textContent = text;
    }
}
