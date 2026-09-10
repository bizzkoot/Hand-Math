/**
 * Central localStorage-backed settings store.
 *
 * Every user-facing setting that should survive a reload/app restart goes
 * through here so save/restore semantics live in exactly one place.
 * All accessors are defensive: localStorage can throw in private mode or
 * when storage is full, and a failed write must never break the UI.
 */
(function () {
    const KEYS = {
        LANG: 'hm_lang',               // handled by I18n (kept for reference)
        THEME: 'hm-theme',             // light | dark
        SOUND_MUTED: 'hm-sound-muted', // 'true' | 'false'
        TTS_ENABLED: 'hm-tts-enabled', // 'true' | 'false' (narration toggle)
        SPEED: 'hm-speed',             // narration/auto speed multiplier
        SCREEN_WAKE: 'hm-screen-wake', // handled by _initScreenWake (kept for reference)
        OPERAND_LEVEL: 'hm_operand_level', // handled by operand badge (kept for reference)
        SKIN_HEX: 'hm-skin-hex',       // hand skin tone hex
        UPDATE_SKIP: 'hm-update-skip', // release tag the user chose to skip
        LAST_UPDATE_CHECK: 'hm-update-last-check', // epoch ms of last successful check
        UPDATE_LAST_ATTEMPT: 'hm-update-last-attempt' // epoch ms of last auto-check attempt (throttle)
    };

    const HMSettings = {
        KEYS: KEYS,
        get(key, fallback) {
            try {
                const v = localStorage.getItem(key);
                return v === null ? fallback : v;
            } catch (_) {
                return fallback;
            }
        },
        set(key, value) {
            try { localStorage.setItem(key, String(value)); } catch (_) {}
        },
        remove(key) {
            try { localStorage.removeItem(key); } catch (_) {}
        }
    };

    window.HMSettings = HMSettings;
})();
