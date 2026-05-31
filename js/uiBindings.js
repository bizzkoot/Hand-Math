class SoundSynth {
    constructor() {
        this.ctx = null;
        this.muted = true; // Default muted per snapshot/spec
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setMuted(m) {
        this.muted = m;
    }

    playClick() {
        if (this.muted) return;
        this.init();
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.frequency.setValueAtTime(800, this.ctx.currentTime);
            gain.gain.setValueAtTime(0.02, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.04);
            osc.start();
            osc.stop(this.ctx.currentTime + 0.04);
        } catch (_) {}
    }

    playChime() {
        if (this.muted) return;
        this.init();
        try {
            const now = this.ctx.currentTime;
            const playNote = (freq, start, duration) => {
                const osc = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.frequency.setValueAtTime(freq, start);
                gain.gain.setValueAtTime(0.05, start);
                gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
                osc.start(start);
                osc.stop(start + duration);
            };
            playNote(523.25, now, 0.12); // C5
            playNote(659.25, now + 0.08, 0.12); // E5
            playNote(783.99, now + 0.16, 0.12); // G5
            playNote(1046.50, now + 0.24, 0.25); // C6
        } catch (_) {}
    }

    playBuzzer() {
        if (this.muted) return;
        this.init();
        try {
            const now = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.frequency.setValueAtTime(130, now);
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.linearRampToValueAtTime(0.06, now + 0.12);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
            osc.start();
            osc.stop(now + 0.25);
        } catch (_) {}
    }
}

const SPEED_MIN = 0.1;
const SPEED_MAX = 3.0;
const SPEED_STEP = 0.1;

class UiBindings {
    constructor(orchestrator) {
        this.o = orchestrator;
        this.soundSynth = new SoundSynth();
        this._speed = 1.0;
        this._ttsEnabled = false;
        this._wire();
        this._initChallenge();
        this._render();
        this._unsub = this.o.onChange(() => this._render());
    }

    _wire() {
        // Tabs
        this.tabTutorial = document.getElementById('tabTutorial');
        this.tabArithmetic = document.getElementById('tabArithmetic');
        this.tabChallenge = document.getElementById('tabChallenge');
        this.tabHelp = document.getElementById('tabHelp');

        this.tabTutorial.addEventListener('click', () => { this.soundSynth.playClick(); this.o.setMode('Tutorial'); });
        this.tabArithmetic.addEventListener('click', () => { this.soundSynth.playClick(); this.o.setMode('Arithmetic'); });
        this.tabChallenge?.addEventListener('click', () => { this.soundSynth.playClick(); this.o.setMode('Challenge'); });
        this.tabHelp.addEventListener('click', () => { this.soundSynth.playClick(); this.o.setMode('Help'); });

        // Buttons
        this.btnNext = document.getElementById('btnNext');
        this.btnPrev = document.getElementById('btnPrev');
        this.btnNew = document.getElementById('btnNew');
        this.btnReset = document.getElementById('btnReset');
        this.btnAuto = document.getElementById('btnAuto');
        this.btnFullscreen = document.getElementById('btnFullscreen');
        this.btnTheme = document.getElementById('btnTheme');
        this.btnSound = document.getElementById('btnSound');
        this.btnSettings = document.getElementById('btnSettings');
        this.configGroup = document.getElementById('configGroup');
        this.btnAdd = document.getElementById('btnAdd');
        this.btnSub = document.getElementById('btnSub');
        this.autoStatus = document.getElementById('autoStatus');
        this.speedGroup = document.getElementById('speedGroup');
        this.speedLabel = document.getElementById('speedLabel');
        this.btnSpeedDown = document.getElementById('btnSpeedDown');
        this.btnSpeedUp = document.getElementById('btnSpeedUp');
        this.btnNarrate = document.getElementById('btnNarrate');
        this.stepStatus = document.getElementById('stepStatus');
        this.infoModal = document.getElementById('infoModal');
        this.infoClose = document.getElementById('infoClose');
        this.infoGotIt = document.getElementById('infoGotIt');
        this.helpContent = document.getElementById('helpContent');

        // Practice selectors
        this.mfAdd = document.getElementById('mfAdd');
        this.mfSub = document.getElementById('mfSub');
        this.mfBoth = document.getElementById('mfBoth');
        this.levelSel = document.getElementById('levelSel');

        this.mfAdd?.addEventListener('click', () => { this.soundSynth.playClick(); this._setPracticeFilter('add'); });
        this.mfSub?.addEventListener('click', () => { this.soundSynth.playClick(); this._setPracticeFilter('sub'); });
        this.mfBoth?.addEventListener('click', () => { this.soundSynth.playClick(); this._setPracticeFilter('both'); });
        this.levelSel?.addEventListener('change', () => {
            this.soundSynth.playClick();
            this._practice = this._practice || { filter: 'both', level: 2 };
            this._practice.level = parseInt(this.levelSel.value) || 2;
        });

        // Tour elements
        this.tour = {
            overlay: document.getElementById('tourOverlay'),
            focus: document.getElementById('tourFocus'),
            pop: document.getElementById('tourPop'),
            title: document.getElementById('tourTitle'),
            text: document.getElementById('tourText'),
            next: document.getElementById('tourNext'),
            back: document.getElementById('tourBack'),
            skip: document.getElementById('tourSkip'),
            startBtn: document.getElementById('btnStartTour')
        };

        this.btnNext.addEventListener('click', async () => {
            this.soundSynth.playClick();
            await this.o.next();
            this._setStepStatus(window.i18n.t('stepStatus.advanced'));
        });
        this.btnPrev.addEventListener('click', async () => {
            this.soundSynth.playClick();
            await this.o.prev();
            this._setStepStatus(window.i18n.t('stepStatus.restored'));
        });
        this.btnNew.addEventListener('click', async () => {
            this.soundSynth.playClick();
            const prob = this._randomValidPractice();
            try { await this.o.engine?.adapter?.animateDigits({ left: 0, right: 0, mode: 'instant', durationMs: 0 }); } catch (_) {}
            this.o.setProblem(prob.a, prob.b, prob.op);
        });
        this.btnReset.addEventListener('click', () => { this.soundSynth.playClick(); this.o.reset(); });
        this.btnAuto.addEventListener('click', () => { this.soundSynth.playClick(); this._toggleAuto(); });
        this.btnSpeedDown?.addEventListener('click', () => { this.soundSynth.playClick(); this._adjustSpeed(-1); });
        this.btnSpeedUp?.addEventListener('click', () => { this.soundSynth.playClick(); this._adjustSpeed(1); });
        this.btnNarrate?.addEventListener('click', () => {
            this.soundSynth.playClick();
            this._ttsEnabled = !this._ttsEnabled;
            this.btnNarrate.setAttribute('aria-pressed', String(this._ttsEnabled));
            if (!this._ttsEnabled && 'speechSynthesis' in window) window.speechSynthesis.cancel();
        });
        this.btnFullscreen?.addEventListener('click', () => { this.soundSynth.playClick(); this._toggleFullscreen(); });
        
        this.btnSettings?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.soundSynth.playClick();
            const isOpen = this.configGroup?.classList.contains('is-open');
            this.configGroup?.classList.toggle('is-open', !isOpen);
            this.btnSettings.setAttribute('aria-expanded', String(!isOpen));
        });

        document.addEventListener('click', (e) => {
            if (this.configGroup?.classList.contains('is-open')) {
                if (!this.configGroup.contains(e.target) && e.target !== this.btnSettings && !this.btnSettings?.contains(e.target)) {
                    this.configGroup.classList.remove('is-open');
                    this.btnSettings?.setAttribute('aria-expanded', 'false');
                }
            }
        });
        
        this.btnTheme?.addEventListener('click', () => {
            this.soundSynth.playClick();
            const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', currentTheme);
            localStorage.setItem('hm-theme', currentTheme);
            window.handMathApp?.updateSceneBackgroundForTheme();
        });

        this.btnSound?.addEventListener('click', () => {
            const muted = this.soundSynth.muted;
            this.soundSynth.setMuted(!muted);
            this.btnSound.setAttribute('aria-pressed', String(!muted));
            const soundOnSvg = this.btnSound.querySelector('.sound-on');
            const soundOffSvg = this.btnSound.querySelector('.sound-off');
            if (soundOnSvg && soundOffSvg) {
                if (muted) {
                    soundOnSvg.style.display = 'block';
                    soundOffSvg.style.display = 'none';
                    this._announce(window.i18n.t('announce.soundsUnmuted'));
                } else {
                    soundOnSvg.style.display = 'none';
                    soundOffSvg.style.display = 'block';
                    this._announce(window.i18n.t('announce.soundsMuted'));
                }
            }
            // Play a soft confirmation click if just unmuted
            if (muted) {
                this.soundSynth.playClick();
            }
        });

        this.btnAdd.addEventListener('click', () => { this.soundSynth.playClick(); this.o.setOperation('+'); });
        this.btnSub.addEventListener('click', () => { this.soundSynth.playClick(); this.o.setOperation('-'); });

        // Info modal
        const toggleInfo = (open) => {
            if (!this.infoModal) return;
            this.infoModal.hidden = !open;
        };
        document.getElementById('btnInfo')?.addEventListener('click', () => { this.soundSynth.playClick(); toggleInfo(true); });
        this.infoClose?.addEventListener('click', () => { this.soundSynth.playClick(); toggleInfo(false); });
        this.infoGotIt?.addEventListener('click', () => { this.soundSynth.playClick(); toggleInfo(false); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') toggleInfo(false); });

        // Tour wiring
        this._tourIdx = -1;
        const tourSteps = () => ([
            { sel: '#scene-container', title: window.i18n.t('tour.step1Title'), text: window.i18n.t('tour.step1Text') },
            { sel: '#panelSteps', title: window.i18n.t('tour.step2Title'), text: window.i18n.t('tour.step2Text') },
            { sel: '#panelControls', title: window.i18n.t('tour.step3Title'), text: window.i18n.t('tour.step3Text') }
        ]);
        const positionTour = () => {
            if (this._tourIdx < 0) return;
            const step = tourSteps()[this._tourIdx];
            const el = document.querySelector(step.sel);
            if (!el) return this._endTour();
            const rect = el.getBoundingClientRect();
            Object.assign(this.tour.focus.style, {
                left: rect.left + 'px', top: rect.top + 'px', width: rect.width + 'px', height: rect.height + 'px'
            });
            const popX = Math.min(rect.right + 12, window.innerWidth - 320);
            const popY = Math.min(rect.top + rect.height + 12, window.innerHeight - 140);
            Object.assign(this.tour.pop.style, { left: popX + 'px', top: popY + 'px' });
            this.tour.title.textContent = step.title;
            this.tour.text.textContent = step.text;
            this.tour.next.textContent = (this._tourIdx >= tourSteps().length - 1) ? window.i18n.t('tour.done') : window.i18n.t('tour.next');
        };
        const nextTour = () => {
            this.soundSynth.playClick();
            this._tourIdx++;
            const steps = tourSteps();
            if (this._tourIdx >= steps.length) return this._endTour();
            this.tour.overlay.hidden = false;
            positionTour();
        };
        const prevTour = () => {
            this.soundSynth.playClick();
            if (this._tourIdx <= 0) { this._tourIdx = 0; return positionTour(); }
            this._tourIdx--;
            this.tour.overlay.hidden = false;
            positionTour();
        };
        this._endTour = () => { this._tourIdx = -1; if (this.tour.overlay) this.tour.overlay.hidden = true; };
        this._startTour = () => { this._endTour(); this._tourIdx = -1; nextTour(); };
        this.tour.startBtn?.addEventListener('click', this._startTour);
        this.tour.next?.addEventListener('click', nextTour);
        this.tour.back?.addEventListener('click', prevTour);
        this.tour.skip?.addEventListener('click', () => { this.soundSynth.playClick(); this._endTour(); });
        window.addEventListener('resize', positionTour);

        // Keyboard shortcuts
        window.addEventListener('keydown', (e) => {
            // Ignore shortcut when user is typing in skin hex color input
            if (document.activeElement?.id === 'hmSkinHex') return;
            
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.soundSynth.playClick(); this.o.next(); }
            if (e.key === 'A' || e.key === 'a') { this.soundSynth.playClick(); this._toggleAuto(); }
            if (e.key === 'R' || e.key === 'r') { this.soundSynth.playClick(); this.o.reset(); }
            if (e.key === '?') { this.soundSynth.playClick(); this.o.setMode('Help'); }
        });

        // Challenge Button Listeners
        document.getElementById('btnChallengeStart')?.addEventListener('click', () => this._startChallenge());
        document.getElementById('btnChallengeSubmit')?.addEventListener('click', () => this._onSubmitAnswer());
        document.getElementById('btnChallengeNext')?.addEventListener('click', () => {
            this.soundSynth.playClick();
            this._loadNextChallengeQuestion();
        });
        document.getElementById('btnChallengeExit')?.addEventListener('click', () => this._exitChallenge());
    }

    _initChallenge() {
        this.challenge = {
            active: false,
            target: null,
            timer: null,
            timeLeft: 15,
            score: 0,
            streak: 0,
            stars: 0,
            difficulty: 2
        };

        // Hook into hand state updates to auto-check answers
        window.onHandMathStateChange = (state) => {
            if (this.challenge && this.challenge.active && this.challenge.target !== null) {
                const currentTotal = state.total;
                const feedbackEl = document.getElementById('challengeProgressFeedback');
                if (feedbackEl) {
                    feedbackEl.textContent = window.i18n.t('challenge.yourHands', {value: currentTotal});
                }
                
                // Automatic success check
                if (currentTotal === this.challenge.target) {
                    this._onChallengeSuccess();
                }
            }
        };
    }

    _startChallenge() {
        this.soundSynth.playClick();
        const diffSel = document.getElementById('challengeDiff');
        const level = parseInt(diffSel?.value) || 2;

        this.challenge.active = true;
        this.challenge.score = 0;
        this.challenge.streak = 0;
        this.challenge.stars = 0;
        this.challenge.difficulty = level;

        document.getElementById('challengeStartScreen').hidden = true;
        document.getElementById('challengePlayScreen').hidden = false;

        this._loadNextChallengeQuestion();
    }

    _loadNextChallengeQuestion() {
        // Reset hands to closed fists instantly
        Promise.resolve().then(() => this.o.engine?.adapter?.animateDigits({ left: 0, right: 0, mode: 'instant', durationMs: 0 }));

        const problem = this._generateChallengeProblem(this.challenge.difficulty);
        this.challenge.target = problem.target;
        this.challenge.timeLeft = 15;

        // Update UI
        document.getElementById('challengePrompt').textContent = problem.prompt;
        document.getElementById('challengeProgressFeedback').textContent = window.i18n.t('challenge.yourHands', {value: 0});

        const msgEl = document.getElementById('challengeMessage');
        if (msgEl) {
            msgEl.className = 'challenge-msg';
            msgEl.textContent = '';
        }

        const timerEl = document.getElementById('challengeTimer');
        if (timerEl) {
            timerEl.textContent = `⏳ 15s`;
            timerEl.classList.remove('low-time');
        }

        document.getElementById('btnChallengeSubmit').hidden = false;
        document.getElementById('btnChallengeNext').hidden = true;

        this._updateChallengeStatsUI();

        // Start countdown
        if (this.challenge.timer) clearInterval(this.challenge.timer);
        this.challenge.timer = setInterval(() => {
            this.challenge.timeLeft--;
            const tEl = document.getElementById('challengeTimer');
            if (tEl) {
                tEl.textContent = `⏳ ${this.challenge.timeLeft}s`;
                if (this.challenge.timeLeft <= 4) {
                    tEl.classList.add('low-time');
                }
            }
            if (this.challenge.timeLeft <= 0) {
                this._onChallengeTimeout();
            }
        }, 1000);

        this._announce(window.i18n.t('challenge.newQuestion', {prompt: problem.prompt}));
    }

    _onChallengeSuccess() {
        if (this.challenge.timer) clearInterval(this.challenge.timer);
        this.challenge.timer = null;

        this.soundSynth.playChime();

        this.challenge.score += 10;
        this.challenge.streak++;

        // Award stars
        if (this.challenge.streak > 0 && this.challenge.streak % 3 === 0) {
            this.challenge.stars++;
            this._announce(window.i18n.t('announce.streak'));
        }

        const msgEl = document.getElementById('challengeMessage');
        if (msgEl) {
            msgEl.className = 'challenge-msg success';
            msgEl.textContent = window.i18n.t('challenge.correct');
        }

        this._updateChallengeStatsUI();

        // Hide submit button
        document.getElementById('btnChallengeSubmit').hidden = true;

        // Clear target to prevent double trigger
        this.challenge.target = null;

        // Auto-advance after 1.5s
        setTimeout(() => {
            if (this.o.mode === 'Challenge' && this.challenge.active && !this.challenge.target) {
                this._loadNextChallengeQuestion();
            }
        }, 1500);
    }

    _onChallengeTimeout() {
        if (this.challenge.timer) clearInterval(this.challenge.timer);
        this.challenge.timer = null;

        this.soundSynth.playBuzzer();
        this.challenge.streak = 0;

        const targetVal = this.challenge.target;
        this.challenge.target = null; // clear target

        const msgEl = document.getElementById('challengeMessage');
        if (msgEl) {
            msgEl.className = 'challenge-msg error';
            msgEl.textContent = window.i18n.t('challenge.timeUp');
        }

        // Show correct fingers on hands
        const left = Math.floor(targetVal / 10);
        const right = targetVal % 10;
        Promise.resolve().then(() => this.o.engine?.adapter?.animateDigits({ left, right, mode: 'instant', durationMs: 0 }));

        this._updateChallengeStatsUI();

        document.getElementById('btnChallengeSubmit').hidden = true;
        document.getElementById('btnChallengeNext').hidden = false;

        this._announce(window.i18n.t('challenge.timeUpAnnounce', {value: targetVal}));
    }

    _onSubmitAnswer() {
        if (!this.challenge.active || this.challenge.target === null) return;
        
        const currentTotal = window.handMathApp?.calculator?.calculateTotal(
            window.handMathApp.calculator.getCurrentState().left,
            window.handMathApp.calculator.getCurrentState().right
        ) || 0;

        if (currentTotal === this.challenge.target) {
            this._onChallengeSuccess();
        } else {
            this.soundSynth.playBuzzer();
            const msgEl = document.getElementById('challengeMessage');
            if (msgEl) {
                msgEl.className = 'challenge-msg error';
                msgEl.textContent = window.i18n.t('challenge.tryAgain', {value: currentTotal});
            }
            this._announce(window.i18n.t('challenge.incorrect', {value: currentTotal}));
        }
    }

    _exitChallenge() {
        if (this.challenge.timer) clearInterval(this.challenge.timer);
        this.challenge.timer = null;
        this.challenge.active = false;
        this.challenge.target = null;

        document.getElementById('challengeStartScreen').hidden = false;
        document.getElementById('challengePlayScreen').hidden = true;

        // Reset hands to 0
        Promise.resolve().then(() => this.o.engine?.adapter?.animateDigits({ left: 0, right: 0, mode: 'instant', durationMs: 0 }));
    }

    _updateChallengeStatsUI() {
        document.getElementById('challengeStreak').textContent = window.i18n.t('challenge.streak', {streak: this.challenge.streak});
        document.getElementById('challengeStars').textContent = `⭐ ${this.challenge.stars}`;
        
        this._announce(window.i18n.t('challenge.scoreAnnounce', {score: this.challenge.score, streak: this.challenge.streak, stars: this.challenge.stars}));
    }

    _generateChallengeProblem(level) {
        if (level === 1) {
            // Level 1: Single Hand only (Ones or Tens)
            if (Math.random() < 0.5) {
                // Ones only (0-9)
                const val = Math.floor(Math.random() * 10);
                return { prompt: window.i18n.t('challenge.promptShow', {value: val}), target: val };
            } else {
                // Tens only (10, 20, ..., 90)
                const val = (Math.floor(Math.random() * 9) + 1) * 10;
                return { prompt: window.i18n.t('challenge.promptShow', {value: val}), target: val };
            }
        } else if (level === 2) {
            // Level 2: Combined with no carry/borrow
            const val = Math.floor(Math.random() * 90) + 10; // 10 to 99
            return { prompt: window.i18n.t('challenge.promptShow', {value: val}), target: val };
        } else {
            // Level 3: Carry/Borrow Required
            const op = Math.random() < 0.5 ? '+' : '-';
            if (op === '+') {
                let a, b;
                for (let i = 0; i < 200; i++) {
                    a = Math.floor(Math.random() * 80) + 10; // 10 to 89
                    const maxB = 99 - a;
                    if (maxB < 5) continue;
                    b = Math.floor(Math.random() * (maxB - 4)) + 5;
                    const aR = a % 10, bR = b % 10;
                    if ((aR + bR) >= 10) {
                        return { prompt: window.i18n.t('challenge.promptAnswer', {a, op: '+', b}), target: a + b };
                    }
                }
                return { prompt: window.i18n.t('challenge.promptFallbackAdd'), target: 85 };
            } else {
                let a, b;
                for (let i = 0; i < 200; i++) {
                    a = Math.floor(Math.random() * 80) + 20; // 20 to 99
                    b = Math.floor(Math.random() * (a - 9)) + 10;
                    const aR = a % 10, bR = b % 10;
                    if (aR < bR) {
                        return { prompt: window.i18n.t('challenge.promptAnswer', {a, op: '−', b}), target: a - b };
                    }
                }
                return { prompt: window.i18n.t('challenge.promptFallbackSub'), target: 25 };
            }
        }
    }

    // Practice generator honoring filter (add/sub/both) and level
    _randomValidPractice() {
        if (!this._practice) this._practice = { filter: 'both', level: 2 };
        const level = this._practice.level || 2;
        const chooseOp = () => {
            if (this._practice.filter === 'add') return '+';
            if (this._practice.filter === 'sub') return '-';
            return Math.random() < 0.5 ? '+' : '-';
        };
        const op = chooseOp();
        if (op === '+') {
            let a, b;
            for (let i = 0; i < 500; i++) {
                if (level === 1) {
                    // Level 1: Single-hand operations only (Ones or Tens separately)
                    if (Math.random() < 0.5) {
                        // Ones only: A, B in 0-9, sum <= 9
                        a = Math.floor(Math.random() * 10);
                        b = Math.floor(Math.random() * (10 - a));
                    } else {
                        // Tens only: multiples of 10, sum <= 90
                        a = Math.floor(Math.random() * 10) * 10;
                        b = Math.floor(Math.random() * (10 - a / 10)) * 10;
                    }
                } else if (level === 2) {
                    // Level 2: Combined, no carry
                    a = Math.floor(Math.random() * 100);
                    const maxB = 99 - a;
                    b = Math.floor(Math.random() * (maxB + 1));
                    const aR = a % 10, bR = b % 10;
                    const carry = (aR + bR) >= 10;
                    if (carry) continue;
                } else {
                    // Level 3: Mixed carry (forces a carry)
                    a = Math.floor(Math.random() * 90) + 10;
                    const maxB = 99 - a;
                    if (maxB < 5) continue;
                    b = Math.floor(Math.random() * (maxB - 4)) + 5;
                    const aR = a % 10, bR = b % 10;
                    const carry = (aR + bR) >= 10;
                    if (!carry) continue;
                }
                return { a, b, op: '+' };
            }
            return level === 3 ? { a: 47, b: 38, op: '+' } : { a: 12, b: 15, op: '+' };
        } else {
            let a, b;
            for (let i = 0; i < 500; i++) {
                if (level === 1) {
                    // Level 1: Single-hand operations only (Ones or Tens separately)
                    if (Math.random() < 0.5) {
                        // Ones only: A in 0-9, B <= A
                        a = Math.floor(Math.random() * 10);
                        b = Math.floor(Math.random() * (a + 1));
                    } else {
                        // Tens only: A multiple of 10, B multiple of 10, B <= A
                        a = Math.floor(Math.random() * 10) * 10;
                        b = Math.floor(Math.random() * (a / 10 + 1)) * 10;
                    }
                } else if (level === 2) {
                    // Level 2: Combined, no borrow
                    a = Math.floor(Math.random() * 100);
                    b = Math.floor(Math.random() * (a + 1));
                    const aR = a % 10, bR = b % 10;
                    const borrow = aR < bR;
                    if (borrow) continue;
                } else {
                    // Level 3: Mixed borrow (forces a borrow)
                    a = Math.floor(Math.random() * 80) + 20;
                    b = Math.floor(Math.random() * (a - 9)) + 10;
                    const aR = a % 10, bR = b % 10;
                    const borrow = aR < bR;
                    if (!borrow) continue;
                }
                return { a, b, op: '-' };
            }
            return level === 3 ? { a: 42, b: 17, op: '-' } : { a: 45, b: 12, op: '-' };
        }
    }

    _setPracticeFilter(which) {
        this._practice = this._practice || { filter: 'both', level: 2 };
        this._practice.filter = which; // 'add'|'sub'|'both'
        this.mfAdd?.classList.toggle('is-active', which === 'add');
        this.mfSub?.classList.toggle('is-active', which === 'sub');
        this.mfBoth?.classList.toggle('is-active', which === 'both');
    }

    _toggleAuto() {
        const next = !this.o.engine.auto.enabled;
        this.o.setAuto(next);
        this.btnAuto.setAttribute('aria-pressed', String(next));
        this.autoStatus.hidden = !next;
        this.autoStatus.textContent = next ? window.i18n.t('auto.on') : window.i18n.t('auto.off');
        if (this.speedGroup) this.speedGroup.hidden = !next;
        if (this.btnNarrate) {
            this.btnNarrate.hidden = !next;
            if (next) {
                this._ttsEnabled = true;
                this.btnNarrate.setAttribute('aria-pressed', 'true');
            }
        }
        if (next) this._startAutoLoop(); else this._stopAutoLoop();
    }

    _adjustSpeed(dir) {
        const next = parseFloat((this._speed + dir * SPEED_STEP).toFixed(1));
        if (next < SPEED_MIN || next > SPEED_MAX) return;
        this._speed = next;
        if (this.speedLabel) this.speedLabel.textContent = next.toFixed(1) + '\u00d7';
    }

    _render() {
        const s = this.o.state();
        
        // Exiting challenge mode checks if switching tab
        if (s.mode !== 'Challenge' && this.challenge && this.challenge.active) {
            this._exitChallenge();
        }

        // Tabs active state
        this.tabTutorial.classList.toggle('is-active', s.mode === 'Tutorial');
        this.tabArithmetic.classList.toggle('is-active', s.mode === 'Arithmetic');
        this.tabHelp.classList.toggle('is-active', s.mode === 'Help');
        
        if (this.tabChallenge) {
            this.tabChallenge.classList.toggle('is-active', s.mode === 'Challenge');
        }

        const panelHeading = document.getElementById('panelHeading');
        const panelQuestion = document.getElementById('panelQuestion');
        const panelExplanation = document.getElementById('panelExplanation');
        const arithPrompt = document.getElementById('arithPrompt');
        const opSwitcher = document.querySelector('.hm-op-switch');
        const helpContent = document.getElementById('helpContent');
        const challengeContent = document.getElementById('challengeContent');
        const panelSteps = document.getElementById('panelSteps');
        const panelControls = document.getElementById('panelControls');

        this.btnNew.hidden = (s.mode !== 'Arithmetic');
        arithPrompt.hidden = (s.mode !== 'Arithmetic');
        opSwitcher.hidden = (s.mode !== 'Arithmetic');
        
        if (helpContent) helpContent.hidden = (s.mode !== 'Help');
        if (challengeContent) challengeContent.hidden = (s.mode !== 'Challenge');
        if (panelSteps) panelSteps.hidden = (s.mode === 'Challenge' || s.mode === 'Help');
        if (panelControls) panelControls.hidden = (s.mode === 'Challenge' || s.mode === 'Help');

        if (s.mode === 'Tutorial') {
            panelHeading.textContent = window.i18n.t('tab.tutorial');
            panelQuestion.textContent = window.i18n.t('panel.question', {a: s.problem.a});
            panelExplanation.textContent = window.i18n.t('panel.explanation');
        } else if (s.mode === 'Arithmetic') {
            panelHeading.textContent = window.i18n.t('tab.arithmetic');
            panelQuestion.textContent = window.i18n.t('panel.arithmeticTitle');
            document.getElementById('operandA').textContent = String(s.problem.a);
            document.getElementById('operator').textContent = s.problem.op;
            document.getElementById('operandB').textContent = String(s.problem.b);
            document.getElementById('answerSlot').textContent = '…';
            this.btnAdd.classList.toggle('is-active', s.problem.op === '+');
            this.btnSub.classList.toggle('is-active', s.problem.op === '-');

            // Guards and messaging
            const sum = s.problem.a + s.problem.b;
            const subInvalid = s.problem.op === '-' && s.problem.a < s.problem.b;
            const addOverflow = s.problem.op === '+' && sum > 99;
            if (subInvalid) {
                panelExplanation.textContent = window.i18n.t('panel.subInvalid');
            } else if (addOverflow) {
                panelExplanation.textContent = window.i18n.t('panel.addOverflow');
            } else {
                panelExplanation.textContent = window.i18n.t('panel.explanation');
            }
        } else if (s.mode === 'Challenge') {
            panelHeading.textContent = window.i18n.t('tab.challenge');
            panelQuestion.textContent = window.i18n.t('panel.challengeTitle');
            panelExplanation.textContent = window.i18n.t('panel.challengeExplanation');
        } else {
            panelHeading.textContent = window.i18n.t('tab.help');
            panelQuestion.textContent = window.i18n.t('panel.helpQuestion');
            panelExplanation.textContent = window.i18n.t('panel.helpExplanation');
            
            // Contextual help content for Tutorial vs Arithmetic
            if (helpContent) {
                const tourBtn = `<div class="hm-help-block" style="display:flex; justify-content:flex-end;"><button id="btnStartTour" class="hm-btn hm-btn-primary">${window.i18n.t('help.startTour')}</button></div>`;
                helpContent.innerHTML = tourBtn;
                helpContent.querySelector('#btnStartTour')?.addEventListener('click', () => { this._startTour(); });
            }
        }

        // Steps list
        if (panelSteps && !panelSteps.hidden) {
            panelSteps.innerHTML = '';
            s.steps.forEach((step, i) => {
                const li = document.createElement('li');
                li.className = 'hm-step' + (i < s.index ? ' is-complete' : i === s.index ? ' is-current' : '');
                li.setAttribute('role', 'listitem');
                if (i === s.index) li.setAttribute('aria-current', 'step');
                const title = document.createElement('div');
                title.style.fontWeight = '600';
                title.textContent = step.title || step.narration || step.id;
                li.appendChild(title);
                const sub = document.createElement('div');
                sub.textContent = step.narration || '';
                li.appendChild(sub);
                if (step.explain) {
                    const hint = document.createElement('div');
                    hint.className = 'hm-step-hint';
                    hint.style.color = 'var(--hm-muted)';
                    hint.style.fontSize = '12px';
                    hint.textContent = step.explain;
                    li.appendChild(hint);
                }
                if (Array.isArray(step.details)) {
                    const ulDetails = document.createElement('ul');
                    ulDetails.style.margin = '4px 0 0 18px';
                    ulDetails.style.padding = '0';
                    step.details.forEach(d => { const liD = document.createElement('li'); liD.textContent = d; ulDetails.appendChild(liD); });
                    li.appendChild(ulDetails);
                }
                panelSteps.appendChild(li);
            });
            const currentStepEl = panelSteps.querySelector('.is-current');
            if (currentStepEl) {
                currentStepEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }

        // Step controls
        if (panelControls && !panelControls.hidden) {
            const guardBlocked = (s.mode === 'Arithmetic') && (
                (s.problem.op === '-' && s.problem.a < s.problem.b) ||
                (s.problem.op === '+' && (s.problem.a + s.problem.b) > 99)
            );
            this.btnPrev.disabled = s.index === 0 || guardBlocked;
            this.btnNext.textContent = s.index >= s.steps.length ? window.i18n.t('btn.restart') : window.i18n.t('btn.next');
            this.btnNext.disabled = guardBlocked;
            if (s.index >= s.steps.length && s.mode === 'Arithmetic') {
                document.getElementById('answerSlot').textContent = String(s.steps.at(-1)?.target.left ?? '') + String(s.steps.at(-1)?.target.right ?? '');
            }
        }
    }

    _setStepStatus(text) {
        if (this.stepStatus) {
            this.stepStatus.textContent = text || '';
            this._announce(text || '');
            clearTimeout(this._statusTimer);
            this._statusTimer = setTimeout(() => { if (this.stepStatus) this.stepStatus.textContent = ''; }, 1800);
        }
    }

    _announce(text) {
        const live = document.getElementById('statusLive');
        if (live) {
            live.textContent = text || '';
        }
    }

    _speak(text) {
        if (!this._ttsEnabled) return Promise.resolve();
        if (!('speechSynthesis' in window)) return Promise.resolve();
        if (!text || !text.trim()) return Promise.resolve();
        window.speechSynthesis.cancel();
        let ttsText = text.trim();
        const isMs = window.i18n && window.i18n.currentLang === 'ms';
        if (isMs) {
            ttsText = ttsText.replace(/\s\u2212\s/g, ' tolak ');
            ttsText = ttsText.replace(/\s\u002d\s/g, ' tolak ');
            ttsText = ttsText.replace(/\s\+\s/g, ' tambah ');
            ttsText = ttsText.replace(/\s\=\s/g, ' sama dengan ');
        } else {
            ttsText = ttsText.replace(/\s\u2212\s/g, ' minus ');
            ttsText = ttsText.replace(/\s\u002d\s/g, ' minus ');
            ttsText = ttsText.replace(/\s\+\s/g, ' plus ');
            ttsText = ttsText.replace(/\s\=\s/g, ' equals ');
        }
        const utterance = new SpeechSynthesisUtterance(ttsText);
        utterance.lang = isMs ? 'ms-MY' : 'en-US';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        return new Promise(resolve => {
            const fallback = setTimeout(resolve, 10000);
            utterance.onend = () => { clearTimeout(fallback); resolve(); };
            utterance.onerror = () => { clearTimeout(fallback); resolve(); };
            window.speechSynthesis.speak(utterance);
        });
    }

    _startAutoLoop() {
        this._stopAutoLoop();
        const effectiveDelay = () => this.o.engine.auto.msPerStep / this._speed;
        const tick = async () => {
            const s = this.o.state();
            const guardBlocked = (s.mode === 'Arithmetic') && (
                (s.problem.op === '-' && s.problem.a < s.problem.b) ||
                (s.problem.op === '+' && (s.problem.a + s.problem.b) > 99)
            );
            if (!this.o.engine.auto.enabled || guardBlocked) return;
            if (s.index >= s.steps.length) {
                await new Promise(r => setTimeout(r, effectiveDelay()));
                if (s.mode === 'Arithmetic') {
                    const prob = this._randomValidPractice();
                    try { await this.o.engine?.adapter?.animateDigits({ left: 0, right: 0, mode: 'instant', durationMs: 0 }); } catch (_) {}
                    this.o.setProblem(prob.a, prob.b, prob.op);
                } else {
                    const newNum = Math.floor(Math.random() * 100);
                    try { await this.o.engine?.adapter?.animateDigits({ left: 0, right: 0, mode: 'instant', durationMs: 0 }); } catch (_) {}
                    this.o.setTutorialNumber(newNum);
                }
                this._autoTimer = setTimeout(tick, effectiveDelay());
                return;
            }
            const currentStep = s.steps[s.index];
            if (currentStep) {
                const parts = [];
                if (currentStep.narration) parts.push(currentStep.narration);
                if (currentStep.explain) parts.push(currentStep.explain);
                if (Array.isArray(currentStep.details)) parts.push(...currentStep.details);
                const text = parts.join('. ');
                if (text) await this._speak(text);
            }
            await this.o.next();
            this._autoTimer = setTimeout(tick, effectiveDelay());
        };
        this._autoTimer = setTimeout(tick, effectiveDelay());
    }
    _stopAutoLoop() { if (this._autoTimer) { clearTimeout(this._autoTimer); this._autoTimer = null; } }

    async _toggleFullscreen() {
        const root = document.documentElement;
        try {
            if (!document.fullscreenElement) {
                if (root.requestFullscreen) await root.requestFullscreen();
                document.body.dataset.fullscreen = '1';
            } else {
                if (document.exitFullscreen) await document.exitFullscreen();
                delete document.body.dataset.fullscreen;
            }
        } catch (_) {
            if (document.body.dataset.fullscreen) delete document.body.dataset.fullscreen; else document.body.dataset.fullscreen = '1';
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = UiBindings;
} else if (typeof window !== 'undefined') {
    window.UiBindings = UiBindings;
}
