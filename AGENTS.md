# Repository Guidelines

## Project Structure & Module Organization
- Root: static HTML entry points (`index.html`, task pages). 
- Source: JavaScript in `js/` (e.g., `handController.js`, `main.js`); styles in `styles/`; assets in `assets/`.
- Tests: Playwright specs in `tests/*.spec.js`; artifacts in `test-results/`.
- Specs: design and requirements under `specs/`.
- Vendor: third‑party bundles in `vendor/`.

## Build, Test, and Development Commands
- `npm run start`: serve via `http-server` at `http://localhost:8080/` (opens a browser — for dev only).
- `npm run dev`: same as start with CORS enabled.
- `npm run serve` (alt): Python `http.server` on port 8080 (no Node needed).
- `npm run test:server`: **the test webServer** — `http-server -p 8080 -s -c-1` (silent, no browser, no cache). See [Test WebServer](#test-webserver) below.
- `npm test` (alias for `playwright test`): run all Playwright tests in `tests/`.
  - Examples: `npx playwright test tests/hand-sizing-analysis.spec.js`, `npx playwright test --headed`.
  - Local-file mode (no server): `HM_LOCAL_FILE=1 npx playwright test`.
  - Parallel mode (override the safe default): `HM_WORKERS=4 npm test`.

## Coding Style & Naming Conventions
- Language: ES6+ JavaScript; use classes for core controllers (e.g., `HandController`).
- Indentation: 4 spaces; include semicolons; prefer single quotes.
- Naming: camelCase for variables/functions, PascalCase for classes, file names in lowerCamelCase (e.g., `handMathCalculator.js`).
- Organization: rendering/controls in `js/`; keep HTML thin and DOM‑oriented.

## Testing Guidelines
- Framework: `@playwright/test`; place specs in `tests/` with `*.spec.js` suffix.
- Tests default to a local server; to force local-file runs use env `HM_LOCAL_FILE=1` (baseURL becomes `file://...`).
- Store screenshots and diagnostics in `test-results/` (see existing specs for patterns).
- Run: `npm test` (headless, serial — the safe default) or `--headed` for debugging.
- Parallel runs: see [Test WebServer](#test-webserver) for `HM_WORKERS`.

### Test WebServer

Playwright's `webServer` config (`playwright.config.js:48`) uses `npm run test:server`, **not** `npm run start`. The reason matters:

`npm run start` → `http-server -p 8080 -o`. The `-o` flag opens a real browser (Safari/Chrome) the moment the server starts. That browser hits the same single-threaded server with its own asset requests, steals bandwidth and CPU from Playwright workers, and can leave a hung browser process if the test run is aborted. We've seen this surface as the cryptic "http-server conflicts with reuseExistingServer: true" symptom on this repo.

`npm run test:server` → `http-server -p 8080 -s -c-1`:
- `-s` — silent (no log noise; Playwright pipes stderr to the report)
- `-c-1` — disable HTTP caching so source/model changes are picked up between runs
- **no** `-o` — does not open a browser

**Worker count.** Default is serial (`workers: 1`, `fullyParallel: false`). `http-server` is single-threaded, and each worker boots a Chromium that fetches `hand_left.glb` (3.6 MB) + `hand_right.glb` (2.1 MB) + `scene.bin` (1.4 MB) + textures. With 4 workers the single-threaded server falls behind and `handController` initialization times out before the 3D scene is ready — Playwright then reports a click on `#tabArithmetic` or `#btnNext` timing out. If you want to experiment with parallel, override with `HM_WORKERS=4 npm test` (or `npm run test:parallel`); expect 3-4 of the heavier 3D tests to flake.

`reuseExistingServer: true` is still on, so a developer can keep `npm run test:server` running in one terminal and re-run `npm test` cheaply in another.

## Commit & Pull Request Guidelines
- Commits: use Conventional Commits style (`feat:`, `fix:`, `docs:`, `test:`) with a short imperative summary and optional scope (`feat(js): ...`).
- PRs must include: concise description, linked issues, test plan, and screenshots for visual changes (before/after from `index.html` or task pages).
- Keep PRs focused; update or add tests for changed behavior.

## Third-Party Attribution (Legal)
- The 3D hand model **"Rigged Hand" by Elena FF** is licensed under **CC BY-SA 4.0** and **must be credited** wherever the asset is used. Credit is shown live at `#assetCredits` in `index.html` and documented in `assets/license.txt`.
- Three.js and its addons (`vendor/threejs/`) are MIT-licensed.

## i18n System
- `I18n` class in `js/i18n.js` with 240+ keys each for English and Bahasa Melayu.
- Static fallback strings in JS; dynamic overrides in `locales/en.json` and `locales/ms.json`.
- HTML attributes `data-i18n="key"` and `data-i18n-title="key"` are replaced on language switch.
- Language persisted to `localStorage` key `hm-lang`.

## Security & Configuration Tips
- Do not commit secrets to `.env`; this is a static client app.
- Large binary assets belong in `assets/` and should be optimized; prefer links over embedding when feasible.
- Browser support per `browserslist` in `package.json`; verify critical flows in two modern browsers.

## Dev Tips: Hand Articulation (Engineers)
- Logging level: set before app init via `window.HANDMATH_LOG_LEVEL = 'info'|'debug'` (default `warn`). Do this in the console and reload, or add a script tag before `js/main.js`.
- Closed-pose calibration: app forces closed fists then captures closed pose on init. Re-capture from console: `handMathApp.handController.captureClosedPoseForHand('left'|'right')` or per finger: `captureClosedPose('left','index')`.
- Debug panel: not mounted by default. If you add elements with IDs (`debug-finger-header`, `debug-finger-content`, `anim-start-debug`, `anim-once`, `anim-copy-summary`, `anim-curl`, etc.), `setupDebugFingerAnimator()` will wire them. Otherwise use the console helpers (see above) to inspect and re-capture.
- Demo Counting: helper exists (`handMathApp.demoCountingSequence()`), but no UI button ships by default; invoke from console to sanity-check sequencing.
- Teaching UI: primary controls are the Tutorial/Arithmetic tabs, step Next/Back, Auto, Reset, and Info/Fullscreen. Number pads and Quick Calculator UI are not included by default.

### Code Pointers (Quick Nav)
- Core articulation slerp path (rest→closed) with fallback axes alignment:
  - `js/handController.js:214` (applyQuaternionCurl)
- Global closed capture at init (after forcing closed fists):
  - `js/handController.js:621` (forceAllFingersToClosedFist + captureClosedPoseForHand)
- Debug panel wiring (capture baseline, animate once, summaries):
  - `js/main.js:699` (setupDebugFingerAnimator)
- Pattern application (direct targets):
  - `js/main.js:999` (applyFingerPattern)

## PWA & Service Worker
- `manifest.json` enables install-to-home-screen (standalone mode).
- `sw.js` service worker: HTML is network-first (always fresh), static assets cache-first, models/images cache-first.
- `js/main.js:1773` registers the SW and shows an update banner when a new version is detected.
- SW checks for updates every 30 minutes automatically.

### Ensuring deployed updates reach users
When you deploy changes that users must receive, bump the version in `sw.js:8`:
```js
const CACHE_NAME = 'hand-math-v1.0.0';  // → v1.0.1, v1.0.2, etc.
```
This invalidates old caches and triggers the "New version available" banner in all active clients.

### Manual QA Checklist
- [ ] No vertical page scroll; keyboard shortcuts A (Auto) and R (Reset) work
- [ ] Info modal opens/closes; Fullscreen toggles the app data attribute
- [ ] Tutorial Auto advances steps; tabs switch modes without layout shift
- [ ] Arithmetic: carry/borrow cues show; invalid sums >99 and A<B subtraction are blocked
- [ ] Reset returns hands to 0|0; switching modes resets state appropriately
