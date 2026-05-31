class StepEngine {
    constructor(adapter) {
        this.adapter = adapter;
        this.auto = { enabled: false, msPerStep: 1800 };
        this._onComplete = null;
    }

    setAuto(enabled, msPerStep = 1800) {
        this.auto.enabled = !!enabled;
        this.auto.msPerStep = msPerStep;
    }

    async runStep(step) {
        // step: { id, target:{left,right}, animate, cue, narration, durationMs }
        if (step.cue) this.adapter.emphasize(step.cue === 'highlight-left' ? 'left' : step.cue === 'highlight-right' ? 'right' : 'left', step.cue.includes('carry') ? 'carry' : step.cue.includes('borrow') ? 'borrow' : 'highlight');

        // Per-finger halos removed for simplicity

        // Determine action
        if (step.id && step.id.includes('a-carry')) {
            // explicit carry step
            await this.adapter.animateDigits({ left: step.target.left, right: step.target.right, mode: 'instant', durationMs: step.durationMs ?? 200, highlight: null });
            await this.adapter.awaitSettled({ timeoutMs: 600 });
            return;
        }

        if (step.animate === 'count-up' || step.animate === 'count-down') {
            // Prefer ones hand for count in arithmetic; fall back to direct target
            const hand = step.cue === 'highlight-left' ? 'left' : 'right';
            const current = this._currentDigit(hand);
            const delta = (step.animate === 'count-up') ? (step.target[hand] - current) : (current - step.target[hand]);
            if (delta !== 0) await this.adapter.playCount({ hand, by: Math.sign(delta) * Math.abs(delta) });
        }

        await this.adapter.animateDigits({
            left: step.target.left,
            right: step.target.right,
            mode: step.animate === 'instant' ? 'instant' : 'step',
            durationMs: step.durationMs ?? 450,
            highlight: step.cue === 'highlight-left' ? 'left' : step.cue === 'highlight-right' ? 'right' : null
        });
    }

    _currentDigit(hand) {
        return this.adapter._currentDigit(hand);
    }
}
