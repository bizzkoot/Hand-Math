class TeachingOrchestrator {
    constructor(stepEngine, arithmeticBuilder) {
        this.engine = stepEngine;
        this.builder = arithmeticBuilder;
        this.mode = 'Tutorial'; // 'Tutorial' | 'Arithmetic' | 'Help'
        this.steps = [];
        this.index = 0;
        this.problem = { a: TeachingOrchestrator._randomNonZero(), b: 25, op: '+' };
        this.listeners = new Set();
        this._buildInitial();
    }

    static _randomNonZero() {
        return Math.floor(Math.random() * 99) + 1;
    }

    onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
    _emit() { this.listeners.forEach(fn => fn(this.state())); }

    state() {
        return {
            mode: this.mode,
            index: this.index,
            step: this.steps[this.index] || null,
            steps: this.steps,
            problem: this.problem,
            auto: { enabled: this.engine.auto.enabled, msPerStep: this.engine.auto.msPerStep }
        };
    }

    setMode(mode) {
        if (this.mode === mode) return;
        this.mode = mode;
        this.index = 0;
        this._rebuild();
        // Always reset hands to closed fists when changing modes to ensure a clean baseline
        Promise.resolve().then(() => this.engine?.adapter?.animateDigits({ left: 0, right: 0, mode: 'instant', durationMs: 0 }));
        this._emit();
    }

    setAuto(enabled) { this.engine.setAuto(enabled); this._emit(); }
    setOperation(op) { this.problem.op = op; this._rebuild(); this._emit(); }
    setProblem(a, b, op = this.problem.op) { this.problem = { a, b, op }; this._rebuild(); this._emit(); }
    setMultiStepProblem(operands, operators) { this.problem = { operands, operators, isMultiStep: true }; this._rebuild(); this._emit(); }
    setTutorialNumber(n) { this.problem = { a: n, b: 0, op: '+' }; this._rebuildTutorial(); this._emit(); }

    async next() {
        if (this.index >= this.steps.length) {
            if (this.mode === 'Tutorial') {
                this.setTutorialNumber(TeachingOrchestrator._randomNonZero());
            }
            return;
        }
        const current = this.steps[this.index];
        await this.engine.runStep(current);
        this.index = Math.min(this.index + 1, this.steps.length);
        this._emit();
    }

    async prev() {
        const nextIndex = Math.max(0, this.index - 1);
        this.index = nextIndex;
        // Determine the target state representing "one step earlier than current"
        const backIndex = Math.max(0, this.index - 1);
        const backStep = this.steps[backIndex];
        const target = backStep?.target ?? { left: 0, right: 0 };
        // Animate back to the prior state's target for reversible sequencing
        if (this.engine?.adapter && target) {
            await this.engine.adapter.animateDigits({
                left: target.left,
                right: target.right,
                mode: 'step',
                durationMs: 300,
                highlight: backStep?.cue === 'highlight-left' ? 'left' : backStep?.cue === 'highlight-right' ? 'right' : null
            });
        }
        this._emit();
    }

    reset() {
        this.index = 0;
        this._rebuild();
        this._emit();
        // Also reset hands to closed (0|0) for visual consistency
        Promise.resolve().then(() => this.engine.adapter.animateDigits({ left: 0, right: 0, mode: 'instant', durationMs: 0 }));
    }

    _buildInitial() {
        this._rebuildTutorial();
    }

    _rebuild() {
        if (this.mode === 'Tutorial') this._rebuildTutorial();
        else if (this.mode === 'Arithmetic') this._rebuildArithmetic();
        else if (this.mode === 'Challenge') {
            this.steps = [];
            this.index = 0;
        } else this.steps = [];
    }

    _rebuildTutorial() {
        const n = this.problem.a;
        this.steps = this.builder.buildTutorial(n);
        this.index = 0;
    }

    _rebuildArithmetic() {
        const p = this.problem;
        if (p.isMultiStep) {
            this.steps = this.builder.buildMultiStep(p.operands, p.operators);
        } else {
            const { a, b, op } = p;
            // Guards at orchestrator level to ensure solvable within 0–99
            const invalidAdd = (op === '+') && (a + b > 99);
            const invalidSub = (op === '-') && (a < b);
            if (invalidAdd || invalidSub) {
                this.steps = [];
            } else {
                this.steps = op === '+' ? this.builder.buildAddition(a, b) : this.builder.buildSubtraction(a, b);
            }
        }
        this.index = 0;
    }
}
