class I18n {
    constructor() {
        this._locale = {};
        this._lang = localStorage.getItem('hm_lang') || 'en';
        this._fallback = LOCALES.en;
        this._listeners = [];
    }

    async init() {
        this._fallback = LOCALES.en;
        try {
            const resp = await fetch(`locales/${this._lang}.json`);
            if (resp.ok) {
                this._locale = await resp.json();
            } else {
                this._locale = this._fallback;
            }
        } catch (_) {
            this._locale = this._fallback;
        }
        this._updateDOM();
        this._updateHtmlLang();
        this._emitChange();
    }

    t(key, vars) {
        let text = this._locale[key] || this._fallback[key] || key;
        if (vars) {
            Object.keys(vars).forEach(k => {
                text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), vars[k]);
            });
        }
        return text;
    }

    get currentLang() {
        return this._lang;
    }

    async setLang(lang) {
        if (lang === this._lang) return;
        this._lang = lang;
        localStorage.setItem('hm_lang', lang);
        try {
            const resp = await fetch(`locales/${lang}.json`);
            if (resp.ok) {
                this._locale = await resp.json();
            } else {
                this._locale = this._fallback;
            }
        } catch (_) {
            this._locale = this._fallback;
        }
        this._updateDOM();
        this._updateHtmlLang();
        this._emitChange();
    }

    onChange(fn) {
        this._listeners.push(fn);
    }

    _updateDOM() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            const text = this.t(key);
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = text;
            } else if (el.tagName === 'OPTION') {
                el.textContent = text;
            } else {
                el.textContent = text;
            }
        });
        document.querySelectorAll('[data-i18n-title]').forEach(el => {
            const key = el.dataset.i18nTitle;
            const vars = el.dataset.i18nTitleVars
                ? this._safeParse(el.dataset.i18nTitleVars) : null;
            el.title = this.t(key, vars);
        });
        document.querySelectorAll('[data-i18n-aria]').forEach(el => {
            const key = el.dataset.i18nAria;
            const vars = el.dataset.i18nAriaVars
                ? this._safeParse(el.dataset.i18nAriaVars) : null;
            el.setAttribute('aria-label', this.t(key, vars));
        });
    }

    _safeParse(s) {
        try { return JSON.parse(s); } catch (_) { return null; }
    }

    _updateHtmlLang() {
        document.documentElement.lang = this._lang === 'ms' ? 'ms-MY' : 'en';
        this._updateDocumentMeta();
    }

    _updateDocumentMeta() {
        const title = this.t('meta.title');
        if (title && title !== 'meta.title') {
            document.title = title;
        }
        const desc = this.t('meta.description');
        if (desc && desc !== 'meta.description') {
            const meta = document.querySelector('meta[name="description"]');
            if (meta) meta.setAttribute('content', desc);
        }
    }

    _emitChange() {
        this._listeners.forEach(fn => fn(this._lang));
    }
}

const LOCALES = {
    en: {
        'header.title': 'Hand Math — Count to 99',
        'tab.tutorial': 'Tutorial',
        'tab.arithmetic': 'Arithmetic',
        'tab.challenge': 'Challenge',
        'tab.help': 'Help',
        'btn.reset': 'Reset',
        'btn.auto': 'Auto \u25b6',
        'btn.speedDownLabel': 'Slower',
        'btn.speedUpLabel': 'Faster',
        'btn.narrateTitle': 'Narrate steps aloud',
        'btn.narrateLabel': 'Toggle narration',
        'btn.fullscreenLabel': 'Fullscreen',
        'lang.en': 'English',
        'lang.ms': 'Bahasa Melayu',
        'lang.selectTitle': 'Language / Bahasa',
        'aria.modes': 'Modes',
        'aria.settings': 'Settings',
        'aria.skinTone': 'Skin tone picker',
        'aria.skinToneNum': 'Skin tone {{n}}',
        'aria.customHex': 'Custom hex',
        'aria.toggleTheme': 'Toggle Theme',
        'aria.muteSounds': 'Mute Sounds',
        'aria.unmuteSounds': 'Unmute Sounds',
        'aria.info': 'Info',
        'aria.threeDScene': '3D hands',
        'aria.modelAttribution': 'Model attribution',
        'aria.handLeftDec': 'Left hand decrement',
        'aria.handLeftInc': 'Left hand increment',
        'aria.handRightDec': 'Right hand decrement',
        'aria.handRightInc': 'Right hand increment',
        'aria.operation': 'Operation',
        'aria.showRules': 'Show rules',
        'aria.practiceOptions': 'Practice options',
        'aria.level': 'Level',
        'aria.close': 'Close',
        'loading.text': 'Loading 3D Scene...',
        'credit.handModel': 'Hand model:',
        'scene.resetCamera': 'Reset Camera',
        'scene.toggleWireframe': 'Toggle Wireframe',
        'panel.tutorialHeading': 'Tutorial',
        'panel.explanation': 'Left = tens, Right = ones. Thumb = five.',
        'panel.prevTitle': 'Back: restore previous finger state',
        'panel.prevLabel': 'Back (restore previous finger state)',
        'btn.prev': '\u2190 Back',
        'btn.nextTitle': 'Next: run current step',
        'btn.nextLabel': 'Next (run current step)',
        'btn.next': 'Next \u2192',
        'btn.restart': 'Restart',
        'btn.newProblem': 'New Problem',
        'auto.on': 'Auto: On',
        'auto.off': 'Auto: Off',
        'practice.label': 'Practice:',
        'level.1': 'Level 1 (no carry/borrow)',
        'level.2': 'Level 2 (mixed)',
        'level.3': 'Level 3 (hard)',
        'challenge.title': 'Math Challenge Mode',
        'challenge.desc': 'Test your hand math skills! Show the requested number on the hands or solve the arithmetic problem before the timer runs out.',
        'challenge.difficulty': 'Difficulty:',
        'challenge.level1': 'Level 1 (Single Hand)',
        'challenge.level2': 'Level 2 (No Carry/Borrow)',
        'challenge.level3': 'Level 3 (Carry/Borrow)',
        'challenge.startBtn': 'Start Challenge',
        'challenge.submitBtn': 'Submit Answer',
        'challenge.nextBtn': 'Next Challenge',
        'challenge.exitBtn': 'Exit',
        'challenge.yourHands': 'Your Hands: {{value}}',
        'challenge.correct': '\uD83C\uDF89 Correct! +10 points!',
        'challenge.timeUp': '\u23F3 Time\'s Up! Showing correct configuration.',
        'challenge.tryAgain': '\u274C Try again! Current hand value is {{value}}',
        'modal.infoTitle': 'How to read Hand Math',
        'modal.infoBody1': 'Thumb counts as five. Left hand = tens (0\u201390). Right hand = ones (0\u20139).',
        'modal.infoBody2': 'Addition: for ones overflow, think \u201c+10\u201d mentally, remove the complement on the right, then add tens including carry.',
        'modal.infoBody3': 'Subtraction: borrow 10 from the left if ones are smaller; a cue will appear.',
        'modal.gotIt': 'Got it',
        'tour.step1Title': '3D Scene',
        'tour.step1Text': 'Watch both hands animate. Highlights guide your focus.',
        'tour.step2Title': 'Steps Panel',
        'tour.step2Text': 'Follow concise steps. Back restores, Next advances.',
        'tour.step3Title': 'Controls',
        'tour.step3Text': 'Auto \u25b6 plays steps; New creates a bounded problem.',
        'tour.next': 'Next',
        'tour.done': 'Done',
        'tour.back': 'Back',
        'tour.skip': 'Skip',
        'help.startTour': 'Start Tour',
        'panel.question': '\u25b7 {{a}} = ?',
        'panel.stepCounter': 'Step {{current}} / {{total}}',
        'panel.arithmeticTitle': 'Add or subtract with carries/borrows',
        'panel.challengeTitle': 'Test your counting speed',
        'panel.challengeExplanation': 'Use the 3D hands directly to input numbers!',
        'meta.title': '3D Hand Math Visualization',
        'meta.description': '3D Hand Math - Interactive hand-based arithmetic visualization',
        'panel.helpQuestion': 'Use tabs to switch modes. Enter advances steps.',
        'panel.helpExplanation': 'A: Auto, R: Reset, ? : Help.',
        'panel.subInvalid': 'A must be \u2265 B for subtraction. Tip: swap numbers or use addition.',
        'panel.addOverflow': 'Result exceeds 99. Choose smaller numbers or try subtraction.',
        'stepStatus.advanced': 'Advanced to next step',
        'stepStatus.restored': 'Restored previous step',
        'announce.soundsUnmuted': 'Sounds unmuted',
        'announce.soundsMuted': 'Sounds muted',
        'announce.streak': 'Awesome! 3 correct in a row! Awarded a star!',
        'challenge.newQuestion': 'New challenge question: {{prompt}}. You have 15 seconds.',
        'challenge.timeUpAnnounce': 'Time\'s up. The correct answer was {{value}}. Press Next Challenge to continue.',
        'challenge.incorrect': 'Incorrect. Current hand value is {{value}}. Try again.',
        'challenge.scoreAnnounce': 'Score: {{score}}, Streak: {{streak}}, Stars: {{stars}}',
        'challenge.promptShow': 'Show {{value}} on your hands',
        'challenge.promptAnswer': 'Show the answer to: {{a}} {{op}} {{b}}',
        'challenge.promptFallbackAdd': 'Show the answer to: 47 + 38',
        'challenge.promptFallbackSub': 'Show the answer to: 42 \u2212 17',
        'step.tens': 'Tens',
        'step.ones': 'Ones',
        'step.result': 'Result',
        'step.setup': 'Setup',
        'step.addOnes': 'Step 1: Add ones',
        'step.addTens': 'Step 2: Add tens',
        'step.final': 'Final',
        'step.mentalComplement': 'Step 1: Add the ones (mental)',
        'step.setupSub': 'Step 1: Set up',
        'step.borrow': 'Borrow 10',
        'step.afterBorrow': 'Ones after borrow',
        'step.subOnes': 'Step 1: Subtract ones',
        'step.subTens': 'Step 2: Subtract tens',
        'narration.leftShows': 'Left shows {{value}}',
        'narration.rightShows': 'Right shows {{value}}',
        'narration.number': '{{value}}',
        'narration.additionFormat': '{{a}} + {{b}}',
        'narration.addOnes': '{{aR}} + {{bR}} = {{onesSum}}',
        'narration.addTens': 'Add {{bL}} tens',
        'narration.addTensNone': 'Tens remain {{value}}',
        'narration.confirmAdd': '{{a}} + {{b}} = {{result}}',
        'narration.mentalComplement': '{{aR}} + {{bR}} is easier as 10 \u2212 {{complement}}',
        'narration.trickComplement': 'Trick: 10 \u2212 {{bR}} = {{complement}}',
        'narration.removeComplement': 'We will remove {{complement}} on the right',
        'narration.rightBecomes': 'Right becomes {{rightAfter}}',
        'narration.addTensCarry': 'Add {{bL}} tens + carry 1',
        'narration.subtractionFormat': '{{a}} \u2212 {{b}}',
        'narration.borrow': 'Close one finger on left (borrow 10)',
        'narration.rightBecomesBorrow': 'Right becomes {{newRight}}',
        'narration.subOnes': '{{right}} \u2212 {{bR}} = {{newRight}}',
        'narration.leftBecomesTens': 'Left becomes {{newLeft}} tens',
        'narration.subTensNone': 'Tens remain {{value}}',
        'narration.confirmSub': '{{a}} \u2212 {{b}} = {{result}}',
        'explain.leftTensRightOnes': 'Left = tens, Right = ones',
        'explain.addOnes': 'Add {{bR}} on the right',
        'explain.addOnesNone': 'Ones remain {{value}}, no change',
        'explain.openTens': 'Open {{bL}} tens',
        'explain.addTensNone': 'Tens remain {{value}}, no change',
        'explain.openTensCarry': 'Open {{count}} tens',
        'explain.rightSubComplement': '{{aR}} \u2212 {{complement}} = {{rightAfter}}',
        'explain.subtractOnes': 'Subtract {{bR}} on the right',
        'explain.subOnesNone': 'Ones remain {{value}}, no change',
        'explain.subtractTens': 'Subtract {{bL}} tens',
        'explain.subTensNone': 'Tens remain {{value}}, no change',
        'explain.rightBorrow': '{{right}} + (10 \u2212 {{bR}}) = {{newRight}}',
        'explain.rightPrefix': 'Right: {{text}}',
        'explain.leftPrefix': 'Left: {{text}}',
        'explain.openFingers': 'open {{fingers}}',
        'explain.closeFingers': 'close {{fingers}}',
        'carry.text': 'Carry 1 ten',
        'carry.announce': 'Carry 1 ten to the left hand',
        'borrow.text': 'Borrow 1 ten',
        'borrow.announce': 'Borrow 1 ten from the left hand',
        'status.ready': 'Ready',
        'status.animating': 'Moving...',
        'status.valid': 'Valid',
        'status.invalid': 'Invalid',
        'status.unknown': 'Unknown',
        'status.positionValid': 'Valid Position',
        'status.positionInvalid': 'Invalid Position',
        'pwa.updateAvailable': 'New version available',
        'pwa.refresh': 'Refresh',
        'error.loadFailed': 'Failed to load 3D scene. Please refresh the page.',
        'error.btnRetry': 'Retry',
        'finger.thumb': 'thumb',
        'finger.index': 'index',
        'finger.middle': 'middle',
        'finger.ring': 'ring',
        'finger.pinky': 'pinky',
        'challenge.streak': '\uD83D\uDD25 Streak: {{streak}}',
        'challenge.timer': '\u23F3 {{time}}s',
        'challenge.round': 'Round {{current}}/{{total}}',
        'challenge.gems': '\uD83D\uDC8E {{count}}',
        'challenge.tierGold': 'Gold',
        'challenge.tierSilver': 'Silver',
        'challenge.tierBronze': 'Bronze',
        'challenge.hintBtn': 'Hint',
        'challenge.hintUsed': 'Hint used - tier dropped!',
        'challenge.attempts': '{{left}} tries left',
        'challenge.lastAttempt': 'Last try!',
        'challenge.skipped': 'No correct answer this round',
        'challenge.showAnswer': 'Answer: {{value}}',
        'challenge.endTitle': 'Challenge Complete!',
        'challenge.endGemsCollected': 'Gems collected:',
        'challenge.endUnlock': 'Next Level Unlocked! \uD83C\uDFC6',
        'challenge.endPerfect': 'Perfect! All gems collected! \uD83C\uDF1F',
        'challenge.playAgain': 'Play Again',
        'challenge.returnMenu': 'Return to Menu',
        'challenge.notEnoughGems': 'Need {{needed}} gems to unlock next level. Try again!',
        'challenge.unlockMeter': 'Unlock progress: {{current}}/{{needed}}',
        'challenge.gemEarnGold': 'Gold gem earned!',
        'challenge.gemEarnSilver': 'Silver gem earned!',
        'challenge.gemEarnBronze': 'Bronze gem earned!',
        'challenge.gemNone': 'No bonus this round',
        'challenge.greatJob': 'Great job!',
        'challenge.keepGoing': 'Keep going!',
        'challenge.fastAnswer': 'Lightning fast!',
        'challenge.goodAnswer': 'Good answer!',
        'challenge.slowAnswer': 'You got it!',
        'challenge.hintTitle': 'Hint: target is between {{low}} and {{high}}',
        'challenge.unlockCurrent': 'Level {{level}}',
        'challenge.endGemBreakdown': 'Gold: {{gold}}  Silver: {{silver}}  Bronze: {{bronze}}',
    },
    ms: {
        'header.title': 'Hand Math — Kira hingga 99',
        'tab.tutorial': 'Tutorial',
        'tab.arithmetic': 'Aritmetik',
        'tab.challenge': 'Cabaran',
        'tab.help': 'Bantuan',
        'btn.reset': 'Set Semula',
        'btn.auto': 'Auto \u25b6',
        'btn.speedDownLabel': 'Perlahan',
        'btn.speedUpLabel': 'Cepat',
        'btn.narrateTitle': 'Bacakan langkah dengan kuat',
        'btn.narrateLabel': 'Togol bacaan',
        'btn.fullscreenLabel': 'Skrin Penuh',
        'lang.en': 'English',
        'lang.ms': 'Bahasa Melayu',
        'lang.selectTitle': 'Bahasa / Language',
        'aria.modes': 'Mod',
        'aria.settings': 'Tetapan',
        'aria.skinTone': 'Pemilih warna kulit',
        'aria.skinToneNum': 'Warna kulit {{n}}',
        'aria.customHex': 'Hex tersuai',
        'aria.toggleTheme': 'Togol Tema',
        'aria.muteSounds': 'Senyapkan Bunyi',
        'aria.unmuteSounds': 'Bunyikan Bunyi',
        'aria.info': 'Info',
        'aria.threeDScene': 'Tangan 3D',
        'aria.modelAttribution': 'Atribusi model',
        'aria.handLeftDec': 'Kurangi tangan kiri',
        'aria.handLeftInc': 'Tambah tangan kiri',
        'aria.handRightDec': 'Kurangi tangan kanan',
        'aria.handRightInc': 'Tambah tangan kanan',
        'aria.operation': 'Operasi',
        'aria.showRules': 'Tunjuk peraturan',
        'aria.practiceOptions': 'Pilihan latihan',
        'aria.level': 'Tahap',
        'aria.close': 'Tutup',
        'loading.text': 'Memuatkan Pemandangan 3D...',
        'credit.handModel': 'Model tangan:',
        'scene.resetCamera': 'Set Semula Kamera',
        'scene.toggleWireframe': 'Togol Rangka',
        'panel.tutorialHeading': 'Tutorial',
        'panel.explanation': 'Kiri = puluh, Kanan = sa. Ibu jari = lima.',
        'panel.prevTitle': 'Kembali: pulihkan keadaan jari sebelumnya',
        'panel.prevLabel': 'Kembali (pulihkan keadaan jari sebelumnya)',
        'btn.prev': '\u2190 Kembali',
        'btn.nextTitle': 'Seterusnya: jalankan langkah semasa',
        'btn.nextLabel': 'Seterusnya (jalankan langkah semasa)',
        'btn.next': 'Seterusnya \u2192',
        'btn.restart': 'Mula Semula',
        'btn.newProblem': 'Masalah Baru',
        'auto.on': 'Auto: Hidup',
        'auto.off': 'Auto: Mati',
        'practice.label': 'Latihan:',
        'level.1': 'Tahap 1 (tanpa bawa/pinjam)',
        'level.2': 'Tahap 2 (campuran)',
        'level.3': 'Tahap 3 (sukar)',
        'challenge.title': 'Mod Cabaran Matematik',
        'challenge.desc': 'Uji kemahiran matematik tangan anda! Tunjukkan nombor yang diminta pada tangan atau selesaikan masalah aritmetik sebelum masa tamat.',
        'challenge.difficulty': 'Kesukaran:',
        'challenge.level1': 'Tahap 1 (Satu Tangan)',
        'challenge.level2': 'Tahap 2 (Tanpa Bawa/Pinjam)',
        'challenge.level3': 'Tahap 3 (Bawa/Pinjam)',
        'challenge.startBtn': 'Mulakan Cabaran',
        'challenge.submitBtn': 'Hantar Jawapan',
        'challenge.nextBtn': 'Cabaran Seterusnya',
        'challenge.exitBtn': 'Keluar',
        'challenge.yourHands': 'Tangan Anda: {{value}}',
        'challenge.correct': '\uD83C\uDF89 Betul! +10 mata!',
        'challenge.timeUp': '\u23F3 Masa Tamat! Menunjukkan konfigurasi yang betul.',
        'challenge.tryAgain': '\u274C Cuba lagi! Nilai tangan semasa ialah {{value}}',
        'modal.infoTitle': 'Cara Membaca Hand Math',
        'modal.infoBody1': 'Ibu jari dikira sebagai lima. Tangan kiri = puluh (0\u201390). Tangan kanan = sa (0\u20139).',
        'modal.infoBody2': 'Penambahan: untuk lebihan sa, fikir \u201c+10\u201d secara mental, keluarkan pelengkap di kanan, kemudian tambah puluh termasuk bawa.',
        'modal.infoBody3': 'Penolakan: pinjam 10 dari kiri jika sa lebih kecil; isyarat akan muncul.',
        'modal.gotIt': 'Faham',
        'tour.step1Title': 'Pemandangan 3D',
        'tour.step1Text': 'Tonton kedua-dua tangan bergerak. Sorotan memandu fokus anda.',
        'tour.step2Title': 'Panel Langkah',
        'tour.step2Text': 'Ikuti langkah ringkas. Kembali memulihkan, Seterusnya maju.',
        'tour.step3Title': 'Kawalan',
        'tour.step3Text': 'Auto \u25b6 main langkah; Baru cipta masalah yang terhad.',
        'tour.next': 'Seterusnya',
        'tour.done': 'Selesai',
        'tour.back': 'Kembali',
        'tour.skip': 'Langkau',
        'help.startTour': 'Mulakan Tour',
        'panel.question': '\u25b7 {{a}} = ?',
        'panel.stepCounter': 'Langkah {{current}} / {{total}}',
        'panel.arithmeticTitle': 'Tambah atau tolak dengan bawa/pinjam',
        'panel.challengeTitle': 'Uji kelajuan mengira anda',
        'panel.challengeExplanation': 'Guna tangan 3D terus untuk memasukkan nombor!',
        'meta.title': 'Visualisasi Matematik Tangan 3D',
        'meta.description': 'Matematik Tangan 3D - Visualisasi aritmetik interaktif berasaskan tangan',
        'panel.helpQuestion': 'Guna tab untuk tukar mod. Enter majukan langkah.',
        'panel.helpExplanation': 'A: Auto, R: Set Semula, ? : Bantuan.',
        'panel.subInvalid': 'A mesti \u2265 B untuk penolakan. Tip: tukar nombor atau guna penambahan.',
        'panel.addOverflow': 'Hasil melebihi 99. Pilih nombor lebih kecil atau cuba penolakan.',
        'stepStatus.advanced': 'Maju ke langkah seterusnya',
        'stepStatus.restored': 'Kembali ke langkah sebelumnya',
        'announce.soundsUnmuted': 'Bunyi dihidupkan',
        'announce.soundsMuted': 'Bunyi dimatikan',
        'announce.streak': 'Hebat! 3 betul berturut-turut! Dapat bintang!',
        'challenge.newQuestion': 'Soalan cabaran baru: {{prompt}}. Anda ada 15 saat.',
        'challenge.timeUpAnnounce': 'Masa tamat. Jawapan yang betul ialah {{value}}. Tekan Cabaran Seterusnya untuk teruskan.',
        'challenge.incorrect': 'Salah. Nilai tangan semasa ialah {{value}}. Cuba lagi.',
        'challenge.scoreAnnounce': 'Skor: {{score}}, Rekaan: {{streak}}, Bintang: {{stars}}',
        'challenge.promptShow': 'Tunjukkan {{value}} pada tangan anda',
        'challenge.promptAnswer': 'Tunjukkan jawapan untuk: {{a}} {{op}} {{b}}',
        'challenge.promptFallbackAdd': 'Tunjukkan jawapan untuk: 47 + 38',
        'challenge.promptFallbackSub': 'Tunjukkan jawapan untuk: 42 \u2212 17',
        'step.tens': 'Puluh',
        'step.ones': 'Sa',
        'step.result': 'Hasil',
        'step.setup': 'Sedia',
        'step.addOnes': 'Langkah 1: Tambah sa',
        'step.addTens': 'Langkah 2: Tambah puluh',
        'step.final': 'Akhir',
        'step.mentalComplement': 'Langkah 1: Tambah sa (mental)',
        'step.setupSub': 'Langkah 1: Sedia',
        'step.borrow': 'Pinjam 10',
        'step.afterBorrow': 'Sa selepas pinjam',
        'step.subOnes': 'Langkah 1: Tolak sa',
        'step.subTens': 'Langkah 2: Tolak puluh',
        'narration.leftShows': 'Kiri menunjukkan {{value}}',
        'narration.rightShows': 'Kanan menunjukkan {{value}}',
        'narration.number': '{{value}}',
        'narration.additionFormat': '{{a}} + {{b}}',
        'narration.addOnes': '{{aR}} + {{bR}} = {{onesSum}}',
        'narration.addTens': 'Tambah {{bL}} puluh',
        'narration.addTensNone': 'Puluh kekal {{value}}',
        'narration.confirmAdd': '{{a}} + {{b}} = {{result}}',
        'narration.mentalComplement': '{{aR}} + {{bR}} lebih mudah sebagai 10 \u2212 {{complement}}',
        'narration.trickComplement': 'Tip: 10 \u2212 {{bR}} = {{complement}}',
        'narration.removeComplement': 'Kita akan keluarkan {{complement}} di kanan',
        'narration.rightBecomes': 'Kanan menjadi {{rightAfter}}',
        'narration.addTensCarry': 'Tambah {{bL}} puluh + bawa 1',
        'narration.subtractionFormat': '{{a}} \u2212 {{b}}',
        'narration.borrow': 'Tutup satu jari di kiri (pinjam 10)',
        'narration.rightBecomesBorrow': 'Kanan menjadi {{newRight}}',
        'narration.subOnes': '{{right}} \u2212 {{bR}} = {{newRight}}',
        'narration.leftBecomesTens': 'Kiri menjadi {{newLeft}} puluh',
        'narration.subTensNone': 'Puluh kekal {{value}}',
        'narration.confirmSub': '{{a}} \u2212 {{b}} = {{result}}',
        'explain.leftTensRightOnes': 'Kiri = puluh, Kanan = sa',
        'explain.addOnes': 'Tambah {{bR}} di kanan',
        'explain.addOnesNone': 'Sa kekal {{value}}, tiada perubahan',
        'explain.openTens': 'Buka {{bL}} puluh',
        'explain.addTensNone': 'Puluh kekal {{value}}, tiada perubahan',
        'explain.openTensCarry': 'Buka {{count}} puluh',
        'explain.rightSubComplement': '{{aR}} \u2212 {{complement}} = {{rightAfter}}',
        'explain.subtractOnes': 'Tolak {{bR}} di kanan',
        'explain.subOnesNone': 'Sa kekal {{value}}, tiada perubahan',
        'explain.subtractTens': 'Tolak {{bL}} puluh',
        'explain.subTensNone': 'Puluh kekal {{value}}, tiada perubahan',
        'explain.rightBorrow': '{{right}} + (10 \u2212 {{bR}}) = {{newRight}}',
        'explain.rightPrefix': 'Kanan: {{text}}',
        'explain.leftPrefix': 'Kiri: {{text}}',
        'explain.openFingers': 'buka {{fingers}}',
        'explain.closeFingers': 'tutup {{fingers}}',
        'carry.text': 'Bawa 1 puluh',
        'carry.announce': 'Bawa 1 puluh ke tangan kiri',
        'borrow.text': 'Pinjam 1 puluh',
        'borrow.announce': 'Pinjam 1 puluh dari tangan kiri',
        'status.ready': 'Sedia',
        'status.animating': 'Bergerak...',
        'status.valid': 'Sah',
        'status.invalid': 'Tidak Sah',
        'status.unknown': 'Tidak Diketahui',
        'status.positionValid': 'Kedudukan Sah',
        'status.positionInvalid': 'Kedudukan Tidak Sah',
        'pwa.updateAvailable': 'Versi baru tersedia',
        'pwa.refresh': 'Muat Semula',
        'error.loadFailed': 'Gagal memuatkan pemandangan 3D. Sila muat semula halaman.',
        'error.btnRetry': 'Cuba Semula',
        'finger.thumb': 'ibu jari',
        'finger.index': 'telunjuk',
        'finger.middle': 'jari tengah',
        'finger.ring': 'jari manis',
        'finger.pinky': 'kelingking',
        'challenge.streak': '\uD83D\uDD25 Rekaan: {{streak}}',
        'challenge.timer': '\u23F3 {{time}}s',
        'challenge.round': 'Pusingan {{current}}/{{total}}',
        'challenge.gems': '\uD83D\uDC8E {{count}}',
        'challenge.tierGold': 'Emas',
        'challenge.tierSilver': 'Perak',
        'challenge.tierBronze': 'Gangsa',
        'challenge.hintBtn': 'Petunjuk',
        'challenge.hintUsed': 'Petunjuk digunakan - tahap turun!',
        'challenge.attempts': '{{left}} percubaan lagi',
        'challenge.lastAttempt': 'Percubaan terakhir!',
        'challenge.skipped': 'Tiada jawapan betul pusingan ini',
        'challenge.showAnswer': 'Jawapan: {{value}}',
        'challenge.endTitle': 'Cabaran Selesai!',
        'challenge.endGemsCollected': 'Permata dikumpul:',
        'challenge.endUnlock': 'Tahap Seterusnya Dibuka! \uD83C\uDFC6',
        'challenge.endPerfect': 'Sempurna! Semua permata dikumpul! \uD83C\uDF1F',
        'challenge.playAgain': 'Main Semula',
        'challenge.returnMenu': 'Kembali ke Menu',
        'challenge.notEnoughGems': 'Perlukan {{needed}} permata untuk buka tahap seterusnya. Cuba lagi!',
        'challenge.unlockMeter': 'Kemajuan buka kunci: {{current}}/{{needed}}',
        'challenge.gemEarnGold': 'Permata emas diperoleh!',
        'challenge.gemEarnSilver': 'Permata perak diperoleh!',
        'challenge.gemEarnBronze': 'Permata gangsa diperoleh!',
        'challenge.gemNone': 'Tiada bonus pusingan ini',
        'challenge.greatJob': 'Bagus!',
        'challenge.keepGoing': 'Teruskan!',
        'challenge.fastAnswer': 'Cepat sekali!',
        'challenge.goodAnswer': 'Jawapan bagus!',
        'challenge.slowAnswer': 'Berjaya!',
        'challenge.hintTitle': 'Petunjuk: jawapan antara {{low}} dan {{high}}',
        'challenge.unlockCurrent': 'Tahap {{level}}',
        'challenge.endGemBreakdown': 'Emas: {{gold}}  Perak: {{silver}}  Gangsa: {{bronze}}',
    }
};

window.i18n = new I18n();
