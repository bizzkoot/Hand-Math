/**
 * In-app release update checker (GitHub Releases).
 *
 * Modeled on the native update flow of bizzkoot/lnreader: on app start and
 * periodically, compare the packaged app version against the latest GitHub
 * release tag. When a newer release exists, alert the user, show the
 * release notes, and offer to download the new APK (opened in the system
 * browser, where the OS handles the download/install).
 *
 * Design notes:
 * - Network failures are silent (console.warn only); an offline app must
 *   never be nagged by a broken check.
 * - A release the user dismissed is remembered (skip version) and no
 *   longer auto-alerts, but a manual check always overrides the skip.
 * - "Up to date" is a no-op for automatic checks.
 */
class UpdateChecker {
    constructor(app) {
        this.app = app;
        this.repo = 'bizzkoot/Hand-Math';
        this.currentVersion = (typeof window.HANDMATH_VERSION === 'string')
            ? window.HANDMATH_VERSION
            : '0.0.0';
        this.autoAttemptIntervalMs = 30 * 60 * 1000; // min gap between auto network attempts
        this.autoSuccessIntervalMs = 3 * 60 * 60 * 1000; // min gap between successful auto refreshes
        this.initialDelayMs = 3000;       // let the app settle before first check
        this._timer = 0;
        this._modal = null;
        this._checking = false;
    }

    start() {
        if (this._timer) return;
        setTimeout(() => this.checkForUpdate(false), this.initialDelayMs);
        // Re-check periodically; checkForUpdate's throttle decides whether
        // each tick actually hits the network.
        this._timer = setInterval(() => this.checkForUpdate(false), this.autoAttemptIntervalMs);
        // Re-check when returning to a long-lived app (e.g. Android APK)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') this.checkForUpdate(false);
        });
    }

    stop() {
        if (this._timer) clearInterval(this._timer);
        this._timer = 0;
    }

    static compareVersions(a, b) {
        const parse = (v) => String(v).trim().replace(/^v/i, '').split(/[.\-+]/)
            .map(part => (/^\d+$/.test(part) ? parseInt(part, 10) : part));
        const pa = parse(a);
        const pb = parse(b);
        const len = Math.max(pa.length, pb.length);
        for (let i = 0; i < len; i++) {
            const x = pa[i] !== undefined ? pa[i] : 0;
            const y = pb[i] !== undefined ? pb[i] : 0;
            if (typeof x === 'number' && typeof y === 'number') {
                if (x !== y) return x - y;
            } else {
                const xs = String(x);
                const ys = String(y);
                if (xs !== ys) return xs < ys ? -1 : 1;
            }
        }
        return 0;
    }

    static _t(key, fallback, vars) {
        try {
            let text = window.i18n ? window.i18n.t(key) : key;
            // I18n.t returns the key itself when no translation exists.
            if (!text || text === key) text = fallback;
            if (vars) {
                Object.keys(vars).forEach(k => {
                    text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), vars[k]);
                });
            }
            return text;
        } catch (_) {
            return fallback;
        }
    }

    async checkForUpdate(force) {
        if (this._checking) return;
        // GitHub's unauthenticated API allows only 60 requests/hour PER IP,
        // which shared networks (home/school NAT, mobile carriers) exhaust
        // quickly. Auto-checks are therefore throttled: at most one network
        // attempt every 30 minutes, and at most one *successful* refresh
        // every 3 hours. Manual checks always bypass the throttle.
        const now = Date.now();
        if (!force) {
            const lastAttempt = parseInt(window.HMSettings.get(window.HMSettings.KEYS.UPDATE_LAST_ATTEMPT, '0'), 10) || 0;
            const lastSuccess = parseInt(window.HMSettings.get(window.HMSettings.KEYS.LAST_UPDATE_CHECK, '0'), 10) || 0;
            if (now - lastAttempt < this.autoAttemptIntervalMs) return;
            if (now - lastSuccess < this.autoSuccessIntervalMs) return;
        }
        this._checking = true;
        try {
            window.HMSettings.set(window.HMSettings.KEYS.UPDATE_LAST_ATTEMPT, now);
            const release = await this._fetchLatestRelease();
            if (!release || !release.tag) {
                window.HMSettings.set(window.HMSettings.KEYS.LAST_UPDATE_CHECK, now);
                if (force) this._showUpToDate(null);
                return;
            }
            const isNewer = UpdateChecker.compareVersions(release.tag, this.currentVersion) > 0;
            if (!isNewer) {
                window.HMSettings.set(window.HMSettings.KEYS.LAST_UPDATE_CHECK, now);
                if (force) this._showUpToDate(release);
                return;
            }
            // A successful check found a newer release — record the time so
            // the throttle counts from now even if the user skips it.
            window.HMSettings.set(window.HMSettings.KEYS.LAST_UPDATE_CHECK, now);
            const skipped = window.HMSettings.get(window.HMSettings.KEYS.UPDATE_SKIP, null);
            if (!force && skipped && UpdateChecker.compareVersions(release.tag, skipped) <= 0) {
                return; // user already dismissed this release
            }
            this._showUpdateModal(release);
        } catch (err) {
            try { console.warn('[UpdateChecker] check failed:', err && err.message ? err.message : err); } catch (_) {}
            if (force) this._showError(UpdateChecker._isRateLimit(err));
        } finally {
            this._checking = false;
        }
    }

    static _isRateLimit(err) {
        const msg = String(err && err.message || err || '');
        return /\b(403|429)\b/.test(msg);
    }

    async _fetchLatestRelease() {
        // Primary: GitHub REST API (rich data: exact APK asset URL).
        try {
            return await this._fetchLatestReleaseFromApi();
        } catch (err) {
            // Fallback: the unauthenticated API allows only 60 requests/hour
            // per IP (shared NAT/carrier networks exhaust it), so fall back
            // to a tiny latest.json committed next to the release. It is
            // served by raw.githubusercontent.com, which is NOT subject to
            // the API rate limit and sends CORS headers (github.com pages do
            // not, so the releases.atom feed cannot be fetched from JS).
            try { console.warn('[UpdateChecker] API unavailable, trying latest.json fallback:', err && err.message); } catch (_) {}
            return await this._fetchLatestReleaseFromLatestJson();
        }
    }

    async _fetchLatestReleaseFromApi() {
        const url = `https://api.github.com/repos/${this.repo}/releases/latest`;
        const resp = await fetch(url, {
            headers: { 'Accept': 'application/vnd.github+json' },
            cache: 'no-store'
        });
        if (!resp.ok) throw new Error(`GitHub API ${resp.status}`);
        const data = await resp.json();
        if (!data || !data.tag_name || (data.draft || false) === true) return null;
        const apkAsset = (data.assets || []).find(a => a && typeof a.browser_download_url === 'string'
            && /\.apk$/i.test(a.name || ''));
        return {
            tag: data.tag_name,
            name: data.name || '',
            notes: data.body || '',
            htmlUrl: data.html_url || `https://github.com/${this.repo}/releases/latest`,
            apkUrl: apkAsset ? apkAsset.browser_download_url : null
        };
    }

    /**
     * Fallback: parse latest.json from the repo (served by
     * raw.githubusercontent.com — CORS-enabled and NOT API-rate-limited):
     * { "tag": "v1.0.5" }. No APK asset URL or notes here; the modal falls
     * back to the release page for the download.
     */
    async _fetchLatestReleaseFromLatestJson() {
        const resp = await fetch(`https://raw.githubusercontent.com/${this.repo}/main/latest.json`, {
            cache: 'no-store'
        });
        if (!resp.ok) throw new Error(`latest.json ${resp.status}`);
        const data = await resp.json();
        if (!data || typeof data.tag !== 'string' || !/^v?[\d]/.test(data.tag)) return null;
        return {
            tag: data.tag,
            name: '',
            notes: '',
            htmlUrl: `https://github.com/${this.repo}/releases/latest`,
            apkUrl: null
        };
    }

    _ensureModal() {
        if (this._modal) return this._modal;
        const modal = document.createElement('div');
        modal.className = 'hm-modal hm-update-modal';
        modal.id = 'updateModal';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.hidden = true;

        const card = document.createElement('div');
        card.className = 'hm-modal-card';

        const head = document.createElement('div');
        head.className = 'hm-modal-head';
        const title = document.createElement('h3');
        title.id = 'updateModalTitle';
        head.appendChild(title);

        const body = document.createElement('div');
        body.className = 'hm-modal-body';
        body.id = 'updateModalBody';

        const foot = document.createElement('div');
        foot.className = 'hm-modal-foot';
        foot.id = 'updateModalFoot';

        card.appendChild(head);
        card.appendChild(body);
        card.appendChild(foot);
        modal.appendChild(card);
        document.body.appendChild(modal);
        this._modal = modal;
        return modal;
    }

    _close() {
        if (this._modal) this._modal.hidden = true;
    }

    _showUpToDate(release) {
        const modal = this._ensureModal();
        modal.querySelector('#updateModalTitle').textContent =
            UpdateChecker._t('update.upToDateTitle', 'You are up to date');
        const body = modal.querySelector('#updateModalBody');
        body.innerHTML = '';
        const p = document.createElement('p');
        p.textContent = UpdateChecker._t('update.upToDateText',
            `Hand Math v${this.currentVersion} is the latest version.`,
            { current: this.currentVersion });
        body.appendChild(p);

        const foot = modal.querySelector('#updateModalFoot');
        foot.innerHTML = '';
        foot.appendChild(this._button(UpdateChecker._t('changelog.close', 'Close'), () => this._close(), 'hm-btn hm-btn-primary'));
        modal.hidden = false;
    }

    _showError(rateLimited) {
        const modal = this._ensureModal();
        modal.querySelector('#updateModalTitle').textContent =
            UpdateChecker._t('update.checkFailedTitle', 'Update check failed');
        const body = modal.querySelector('#updateModalBody');
        body.innerHTML = '';
        const p = document.createElement('p');
        p.textContent = rateLimited
            ? UpdateChecker._t('update.rateLimitedText',
                'GitHub is limiting update checks from your network right now. Please try again in a little while.')
            : UpdateChecker._t('update.checkFailedText',
                'Could not reach GitHub. Check your internet connection and try again.');
        body.appendChild(p);
        const foot = modal.querySelector('#updateModalFoot');
        foot.innerHTML = '';
        const retry = this._button(UpdateChecker._t('update.retry', 'Retry'), () => {
            this._close();
            this.checkForUpdate(true);
        }, 'hm-btn hm-btn-primary');
        foot.appendChild(retry);
        foot.appendChild(this._button(UpdateChecker._t('changelog.close', 'Close'), () => this._close(), 'hm-btn'));
        modal.hidden = false;
    }

    _button(label, onClick, className) {
        const b = document.createElement('button');
        b.className = className;
        b.textContent = label;
        b.addEventListener('click', onClick);
        return b;
    }

    _linkButton(label, href, className) {
        const a = document.createElement('a');
        a.className = className;
        a.textContent = label;
        a.href = href;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        return a;
    }

    _showUpdateModal(release) {
        const modal = this._ensureModal();
        modal.querySelector('#updateModalTitle').textContent =
            UpdateChecker._t('update.availableTitle', 'Update available');

        const body = modal.querySelector('#updateModalBody');
        body.innerHTML = '';

        const versions = document.createElement('p');
        versions.className = 'hm-update-versions';
        versions.textContent = UpdateChecker._t('update.versions',
            `Installed: v${this.currentVersion} · Latest: ${release.tag}`,
            { current: this.currentVersion, latest: release.tag });
        body.appendChild(versions);

        const notesTitle = document.createElement('h4');
        notesTitle.textContent = UpdateChecker._t('update.releaseNotes', 'Release notes');
        body.appendChild(notesTitle);

        const notes = document.createElement('div');
        notes.className = 'hm-update-notes';
        notes.textContent = release.notes || UpdateChecker._t('update.noNotes', 'No release notes provided.');
        body.appendChild(notes);

        const foot = modal.querySelector('#updateModalFoot');
        foot.innerHTML = '';

        const downloadUrl = release.apkUrl || release.htmlUrl;
        const download = this._linkButton(
            UpdateChecker._t('update.download', 'Download update'),
            downloadUrl,
            'hm-btn hm-btn-primary');
        download.addEventListener('click', () => this._close());
        foot.appendChild(download);

        const page = this._linkButton(
            UpdateChecker._t('update.releasePage', 'Release page'),
            release.htmlUrl,
            'hm-btn');
        page.addEventListener('click', () => this._close());
        foot.appendChild(page);

        const skip = this._button(UpdateChecker._t('update.skip', 'Skip this version'), () => {
            window.HMSettings.set(window.HMSettings.KEYS.UPDATE_SKIP, release.tag);
            this._close();
        }, 'hm-btn');
        foot.appendChild(skip);

        modal.hidden = false;
    }
}

window.UpdateChecker = UpdateChecker;
