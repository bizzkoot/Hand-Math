# Hand Math Teaching UI Spec (Single‑Page, No Scrolling)

Purpose
- Teach users to count and compute 0–99 using two hands by treating thumbs as 5 and mapping left hand = tens place, right hand = ones place.
- Present crystal‑clear, step‑by‑step visual guidance with the existing 3D hands (unchanged animation logic).
- Add Arithmetic Practice for + / − on 0–99 with animated carries/borrows that map to left/right hands.

Core Principles
- Bold hands first: the 3D hands are the centerpiece (no scroll).
- Guided clarity: short copy, 3–4 steps max per problem, big labels.
- Progressive depth: Tutorial → Practice → Challenge without layout churn.
- Inclusive design: readable at a glance, keyboard‑friendly, color‑safe.

Scope & Constraints
- Single page, no vertical scrolling (fit 1280×800 and scale responsively).
- Keep current hand rig/animation code; remove/omit any debug/manual finger controls in the main UI.
- Keyboard/mouse only; no multi‑touch requirements.

High‑Level Layout (fixed page)

```
+--------------------------------------------------------------------------------------+
|  Header: “Hand Math — Count to 99 with Two Hands”   [Tutorial] [Arithmetic] [Help]  |
|                                                     [Info]  [Reset]  [Auto ▶] [□]   |
+--------------------------------------------------------------------------------------+
|                                                                                      |
|  3D Scene (Both Hands)                               |  Teaching Panel               |
|  ┌───────────────────────────────────────────────┐   |  ┌────────────────────────┐  |
|  |                                               |   |  | Question               |  |
|  |   [Left (tens)]        [Right (ones)]        |   |  |  ▷ 47 = ?              |  |
|  |   3D canvas centered; neutral camera.        |   |  |                        |  |
|  |   Hands large and readable.                  |   |  | Explanation            |  |
|  |                                               |   |  |  • Left = tens        |  |
|  └───────────────────────────────────────────────┘   |  |  • Right = ones        |  |
|                                                       |  |  • Thumb = five       |  |
|                                                       |  └────────────────────────┘  |
|                                                       |  Steps (Guided Playback)     |
|                                                       |  [1] Show tens (40)          |
|                                                       |  [2] Show ones (7)           |
|                                                       |  [3] Confirm total (47)      |
|                                                       |  Progress: ■■■□              |
|                                                       |  Controls: [Prev] [Next]     |
+--------------------------------------------------------------------------------------+
|  Number Pad (0–99):  [10] [20] [30] [40] [50] [60] [70] [80] [90]   [0]..[9]        |
|  Quick Tasks: [Demo 0→9] [Demo 10→90] [Random] [Practice Mode] [Challenge Mode]     |
+--------------------------------------------------------------------------------------+
```

Visual Design
- Color: calm pastel base (light neutral background), accent indigo/teal highlights; warm gold for success.
- Type: Inter/system‑UI; large step labels; math expressions bolded.
- Icons: outline icons with tooltips for Info/Reset/Auto/Help.
- Micro‑transitions: finger halo glow (100–150ms), badges fade (250ms), tasteful confetti on success.

Core Interactions
- Learn (default):
  - User selects a target (e.g., 47). UI decomposes into tens=40 (left), ones=7 (right).
  - Step 1: Animate left hand to 40. Highlight changed fingers and annotate (“40 = 4 fingers extended”).
  - Step 2: Animate right hand to 7. Highlight changed fingers and annotate (“7 = thumb+index+middle”).
  - Step 3: Show result (47) with a brief recap overlay; optional replay.

- Practice:
  - User enters a number (0–99). The panel shows the decomposition and guides through the same steps; user controls [Prev]/[Next].
  - Provide instant feedback (✓ Correct display; ✗ if user steps out of order when in manual step mode).

- Challenge:
  - Timed random questions. The animation demonstrates only after user attempts to answer. Score and streak shown at bottom.

Motivational Layer
- Practice: untimed, step‑by‑step; small hints when idle (“Try thumb + index for 6”).
- Challenge: timed random sets; streaks, stars; subtle sounds (muted by default).
- Achievements: small badges (“Tens Pro”, “Ones Ninja”, “Carry Master”) shown near header.

Visual Guidance
- Finger Highlights: draw subtle halos over newly extended fingers per step (CSS overlay anchored to finger tips/knuckles via screen‑space projection).
- Text Cues: concise explanations on right panel; per step, show “What changed” bullet.
- Badges: small badges near hands (“Tens: 40”, “Ones: 7”) fade in/out with steps.
- Progress: 3‑step progress indicator; optional micro‑steps when needed (e.g., 5→6 illustrates “thumb + index”).

Animation Rules (reuse existing controller)
- Use current calibrated slerp (rest→closed) and target setting via HandController.
- Step sequencing must be discrete and reversible; on Prev, animate back to the prior state.
- No manual sliders or debug in this UI.

Arithmetic Practice (Addition / Subtraction)
- Mode Switch: top bar tabs [Tutorial] [Arithmetic]. Switching modes preserves hands but resets panel state.

Addition (+)
- Inputs: A (00–99), B (00–99). Button: [Solve].
- Decomposition: A = (At, Ao), B = (Bt, Bo), where t=tens, o=ones.
- Step sequence:
  1) Show A: animate left to At×10, right to Ao; badges “Tens: At×10”, “Ones: Ao”.
  2) Add ones: increment right from Ao → Ao+Bo; if Ao+Bo ≥ 10, flash “Carry +1”, wrap right to (Ao+Bo−10) and increment left by +1.
  3) Add tens: left increments by Bt (plus any carry from step 2). Badge “+Bt tens”.
  4) Confirm: show final result R = A+B with recap.
- Visual Cues: 
  - Carry badge near left hand (“Carry +1”), brief glow on left base knuckles when carry applies.
  - Changed fingers halo on right during ones increments.

Subtraction (−)
- Inputs: A (minuend, 00–99), B (subtrahend, 00–A). If B>A, show “Swap or choose + instead”.
- Decomposition: A = (At, Ao), B = (Bt, Bo).
- Step sequence:
  1) Show A: animate left to At×10, right to Ao.
  2) Subtract ones: if Ao ≥ Bo, decrement right to Ao−Bo. Else perform borrow: flash “Borrow 10”, decrement left by −1, set right to Ao+10, then decrement right by Bo.
  3) Subtract tens: decrement left by Bt (and the extra 1 already removed if borrow occurred). Badge “−Bt tens”.
  4) Confirm: show final result R = A−B with recap.
- Visual Cues:
  - Borrow badge near left hand (“Borrow 10”), left base knuckles glow when borrowing.
  - Halo on changed right fingers during decrements.

Guidance & Help
- Info Card: very short, illustrated overview of “Thumb=5; Left=tens place; Right=ones place; Tens first, then ones”.
- Guided Tour: 2–3 tooltips (Scene, Steps Panel, Number Pad) with “Got it”.
- Autoplay (Auto ▶): animate current step sequence automatically; pauses at end.

Arithmetic Panel (Right)
- Inputs row: [A: 00] [Op: + | −] [B: 00]  [Solve]
- Step list: textual steps mirroring the above, with a dynamic checkmark as each completes.
- Progress: ■■■■ across 4 steps; [Prev] [Next] and [Replay].
- Result: large “A op B = R” with tens/ones breakdown (e.g., “47 = 40 + 7”).

Modes & Controls
- Top Controls:
  - Tabs: [Tutorial] | [Arithmetic]
  - Info: non‑modal card (overview of the 99 method; link to “How addition/subtraction maps to hands”).
  - Reset: return both hands to 0; clear panel state.
  - Auto ▶: autoplay steps (toggle).
  - Help ▶: short, skippable guided tour (tooltips over scene and panel).
- Bottom Controls:
  - Number Pad: tens buttons (10..90) and ones buttons (0..9). Also an input field (00–99) for direct entry.
  - Quick Tasks: demo sequences and modes.

Copy Guidelines (explainer text)
- Core idea: “Left hand = tens place · Right hand = ones place · Thumb = 5”
- Examples:
  - “47 = 40 (left: index+middle+ring+pinky) + 7 (right: thumb+index+middle).”
  - “35 = 30 (left: index+middle+ring) + 5 (right: thumb).”

Accessibility & Responsiveness
- Keyboard: arrows/Enter to advance steps; numeric entry for 00–99.
- High‑contrast theme option; avoid color‑only cues; provide labels for highlights.
- Fit in 1280×800 without scroll; scale elements at smaller sizes while keeping both hands readable.

Micro‑copy Examples
- Tutorial steps show the arithmetic value: “Left shows: 4 tens = 40” → “Right shows: 7 ones = 7” → “40 + 7 = 47”.
- Addition: “Carry 1 to tens when ones ≥ 10.”
- Subtraction: “Borrow 10 from tens if ones can’t subtract.”

Interaction Details
- Button targets ≥ 44px; generous spacing; clear pressed states.
- Next is enabled only after animation settles; progress increments with a tick.
- Prev reverses previous animation cleanly (symmetric timing).

State & Events (tech outline)
- State machine per lesson:
  - Tutorial: idle → step_tens → step_ones → step_confirm → done
  - Arithmetic (+): idle → show_A → add_ones → add_tens → confirm → done
  - Arithmetic (−): idle → show_A → sub_ones(±borrow) → sub_tens → confirm → done
  - Actions: selectNumber(n), setProblem(A, op, B), next(), prev(), replay(), demo(mode)
- Controller integration:
  - setLeftHandPattern(tens), setRightHandPattern(ones) (via calculator → direct targets)
  - step transitions call HandController methods; await settle before enabling Next.
- UI components (ids/classes to define):
  - #scene-container (existing), #teach-panel, #question, #explain, #steps, #progress, #controls

Engineering Notes
- Keep current calibrated slerp and direct target setting; never expose debug sliders here.
- Step engine as small FSM with settle waits before enabling Next/Prev.
- Finger highlights: overlay anchored by projecting fingertip/knuckle into screen space.
- Localization‑ready strings; keep copy concise and tokenizable.

Acceptance Criteria (checklist)
- [ ] No vertical scrolling at 1280×800; both hands visible at all times.
- [ ] Selecting a 2‑digit number shows 3 steps and animates correctly (tens first, then ones).
- [ ] Demo 0→9 (right), 10→90 (left) work and do not regress hand articulation.
- [ ] Highlights correctly indicate changed fingers per step.
- [ ] Progress and text cues sync with animation state.
- [ ] Reset returns to closed fists and clears UI state.
- [ ] Works in two modern browsers per browserslist.

Arithmetic Acceptance
- [ ] Addition: carry is indicated and left tens increments correctly when ones overflow.
- [ ] Subtraction: borrow is indicated and right ones increase by 10 after left tens decrements.
- [ ] For A < B in subtraction, UI asks to swap or use addition.
- [ ] Step navigation (Prev/Next) reverses animations cleanly (no drift). 

Implementation Plan (phased)
- Phase 1: Static layout & panel (HTML/CSS); relocate current buttons to match the layout; hide debug.
- Phase 2: Step engine (idle/step_tens/step_ones/confirm) wired to current calculator/controller; add settle waits.
- Phase 3: Overlays/highlights for changed fingers; badges; progress indicator.
- Phase 4: Add Arithmetic engine (+/−) with carry/borrow visuals; Learn/Practice/Challenge switching; randomizer and scoring (Challenge).
- Phase 5: A11y pass; keyboard support; contrast check; resize sanity.

Roadmap (UI)
- Phase A: Layout, tabs, number pad, panel, Info/Help.
- Phase B: Tutorial steps wired; highlights + badges; autoplay.
- Phase C: Arithmetic (+/−) with carry/borrow visuals and result recap.
- Phase D: Practice/Challenge flows, streaks; sounds toggle; high contrast option.

Non‑Goals (for now)
- Tip translation blending or mesh deformation beyond current rig.
- Persistence of closed poses; cloud profiles; audio narration.

Notes
- Keep existing camera/scene setup; only change UI scaffolding.
- Reuse current HandMathCalculator to convert 00–99 into left/right patterns.
- Do not reintroduce any debug sliders or developer logs into the teaching UI.

## Implementation Snapshot (2025‑09‑01)

This snapshot records the current implemented behavior so we don’t lose parity while continuing work. It reflects the shipping code paths and step IDs in `js/` at commit time 2025‑09‑01.

### State & Orchestration
- Modes: `Tutorial` | `Arithmetic` | `Help` handled by `teachingOrchestrator.js`.
- Orchestrator exposes `next()`, `prev()`, `reset()`, `setProblem(a,b,op)`, `setOperation(op)`; steps are arrays of plain objects consumed by `stepEngine.js`.
- `stepEngine.js` executes a step (`animate: 'instant'|'step'|'count-up'|'count-down'`) and delegates to `handAdapter.js` for animation, highlighting, and carry/borrow cues; it waits for settle before advancing (used by tests via `TEST_API.waitForSettled`).
- `uiBindings.js` renders the right‑panel list (title, narration, explain, details), tabs, op switch (+/−), and fills the answer when the last step completes.

### Implemented Step Sequences (IDs)
- Tutorial (`arithmeticBuilder.buildTutorial(n)`):
  - `t-show-tens` → `t-show-ones` → `t-confirm`.

- Addition (`arithmeticBuilder.buildAddition(a,b)`):
  - No‑carry path (when `(a % 10) + (b % 10) < 10`):
    - `a-ones-add` → `a-add-tens` → `a-confirm`.
  - Carry path (mental complement when ones ≥ 10):
    - `a-ones-mental-complement` (narration only, no finger change)
    - `a-ones-sub-complement` (single decisive right‑hand change)
    - `a-add-tens` (adds `bL + 1` tens; carry applied here) → `a-confirm`.
  - Visual cues: right‑hand highlight during ones; `carry` cue flashes “Carry 1 ten”.
  - Per‑finger halos: during `a-ones-sub-complement`, overlay exposes changed fingers via data attributes.

- Subtraction (`arithmeticBuilder.buildSubtraction(a,b)`):
  - No‑borrow path (when `a % 10 ≥ b % 10`):
    - `s-sub-ones` → `s-sub-tens` → `s-confirm`.
  - Borrow path (when `a % 10 < b % 10`):
    - `s-borrow` → `s-ones-after-borrow` → `s-sub-tens` → `s-confirm`.
  - Visual cues: right‑hand highlight during ones; `borrow` cue flashes “Borrow 1 ten”.

### Visual Cues & Overlays
- Hand highlights: `highlight-left` / `highlight-right` toggle overlays `#overlayLeft` / `#overlayRight`.
- Carry/Borrow banner: `#carryBorrowCue` shows transient text (“Carry 1 ten” / “Borrow 1 ten”).
- Per‑finger halos: removed for simplicity (no per‑finger badges/dots).

### Current Acceptance Status (as implemented)
- [x] No vertical scrolling at 1280×800; both hands readable.
- [x] Tutorial: tens → ones → confirm sequence.
- [x] Addition: mental‑carry (narration only) + decisive right change; tens applies carry.
- [x] Subtraction: no‑borrow and borrow sequences animated; cue shown on borrow.
- [x] Guards active: Addition enforces a+b ≤ 99; Subtraction enforces A ≥ B (navigation disabled with guidance).
- [x] Finger‑level halos removed (design simplification).
- [x] Deterministic step progression with settle waits (used in Playwright via `TEST_API`).
- [x] Reversible navigation: Back restores prior step target; status line updates.
- [x] Resets on New Problem and on mode switch (both hands 0|0 before building steps).
- [x] Info modal, Fullscreen toggle (fallback), and Auto advance wired and working.
- [x] Help tour overlay with Start/Next/Back/Skip.
- [x] Practice Controls in Arithmetic: filter (+/−/±) and Levels (1/2/3) affect New Problem generation.

### Problem Generation Constraints (Random/New)
- Arithmetic New/Random problems must always be solvable within 0–99.
  - For addition: generate `a ∈ [0,99]`, then `b ∈ [0, 99−a]` so `a+b ≤ 99`.
  - For subtraction: generate `a ∈ [0,99]`, then `b ∈ [0, a]` so `a ≥ b`.

### Practice Controls (Arithmetic)
- Practice Filter: `+` (Addition only), `−` (Subtraction only), `±` (Mixed). Affects New Problem generation only.
- Carry/borrow filter (internal 3-level axis, exposed via `#levelSel`):
  - Level 1: no carry (Addition) / no borrow (Subtraction).
  - Level 2: mixed (default).
  - Level 3: prefer carry/borrow examples.
- Operand range filter (user-facing 5-level axis, **Issue #1 rebalanced**): a top-left badge inside the 3D scene (`#operandLevelBadge`) that opens a popover menu with 5 options. The selection limits the range of operands used by Practice, Challenge, and Tutorial generators.
  - L1: 1–20
  - L2: 1–40
  - L3: 1–60
  - L4: 1–80
  - L5: 1–99 (full range)
  - Formula: `Level N = 1 to min(N × 20, 99)`. Default: L1. Persists to `localStorage['hm_operand_level']`. Changing levels resets the current problem and announces the new range via the screen-reader live region.

## Open Items & Next Steps
- High: Implement subtraction guard for `A < B` — block progression, show guidance (“Swap numbers or choose +”).
- Medium: Add Playwright subtraction coverage (borrow and no‑borrow), including assertions for cue text and final digits.
- Low: Refine addition carry narration/details to be learner‑first ("Add 10, then take 1 away").
- Consistency: Align step ID naming with tests (code currently uses `a-ones-add`; tests should not expect `a-add-ones`).
- A11y: Announce carry/borrow via `#statusLive[aria-live=polite]` when cues appear.

---

## Behavioral Rules (2025‑09‑01 Update)

- Back/Next semantics:
  - Next: executes current step, advances index after animation settles.
  - Back: animates hands back to the previous step’s target (reversible sequencing), reapplies halos/highlights for that previous step; updates a panel status line.

- Resets:
  - Mode change (Tutorial ↔ Arithmetic): hands reset to closed fists (0|0) instantly before building steps.
  - New Problem: hands reset to 0|0 before setting the new problem.

- Result guards (hard limits):
  - Addition: must satisfy `a + b ≤ 99`. Otherwise: show guidance in panel, disable Next/Prev, and do not build steps.
  - Subtraction: must satisfy `a ≥ b`. Otherwise: show guidance, disable Next/Prev, and do not build steps.

- Mental‑carry pedagogy (Addition, ones overflow):
  - Treat “+10” as mental only (no finger movement at that step).
  - Perform a single decisive removal on the right equal to the complement (10 − Bo), then apply carry during the tens step (`+ (Bt + 1)` tens on left).

- Halos (per‑finger): Removed for simplicity in this iteration.

## UI Messaging & A11y

- Step Controls:
  - Back: tooltip/aria “Back: restore previous finger state”.
  - Next: tooltip/aria “Next: run current step”.

- Step Status line:
  - Element: `#stepStatus` (polite live region). Values: “Advanced to next step”, “Restored previous step”. Auto‑clears after ~1.8s.

- Carry/Borrow announcements:
  - When cue shown, also write an announcement to `#statusLive` (polite) for screen readers.

## Halos Styling Contract (CSS Hook)

- Elements: `#overlayLeft`, `#overlayRight`.
- Attributes:
  - `data-open` — comma‑separated list of fingers to open (e.g., `index,middle`).
  - `data-close` — comma‑separated list of fingers to close (e.g., `thumb,ring,pinky`).
- Intent: CSS (or future canvas overlay) may visualize these as badges or highlights near fingertips.

## Step ID Catalog (Authoritative)

- Tutorial: `t-show-tens` → `t-show-ones` → `t-confirm`.
- Addition (no carry): `a-ones-add` → `a-add-tens` → `a-confirm`.
- Addition (carry): `a-ones-mental-complement` → `a-ones-sub-complement` → `a-add-tens` → `a-confirm`.
- Subtraction (no borrow): `s-sub-ones` → `s-sub-tens` → `s-confirm`.
- Subtraction (borrow): `s-borrow` → `s-ones-after-borrow` → `s-sub-tens` → `s-confirm`.

## Test Plan (Current Coverage)

- [x] Tutorial progression and narration (3 steps, settle waits).
- [x] Addition (+ carry) end‑to‑end and mental‑carry variant (no right reset to 0).
- [x] Addition limit guard (sum > 99 → blocked).
- [x] Subtraction borrow path and no‑borrow path.
- [x] Subtraction A≥B guard (A < B → blocked).
- [x] Back reverts state to previous step’s target.
- [x] Resets on New Problem and on mode switch (both hands 0|0).
- [x] Info/Fullscreen/Auto behaviors.
- [x] Help tour overlay start/next/back/skip.

## Acceptance Criteria (Expanded)

- [x] Back animates to prior step target; panel shows “Restored previous step”.
- [x] New Problem and mode switch reset hands to 0|0 before steps build.
- [x] Addition carry uses mental step (no right reset to 0) and decisive complement removal; carry applied in tens step.
- [x] Random generation respects 0–99 solvability for +/−.
- [x] Guards show friendly guidance and disable navigation when violated.
- [x] Practice Controls in Arithmetic mode: filter (+/−/±) and levels (1/2/3) affect New Problem.
- [x] Carry/Borrow cues are announced via `#statusLive`.

## Roadmap — Next Milestones

1) Visual Halos: implement CSS dots/badges anchored to fingertips using screen‑space projection; keep attribute contract intact.
2) Guided Tour: tooltip tour (Scene, Steps Panel, Number Pad) with “Got it”.
3) Copy polish: refine mental‑carry explanations with illustrations/examples.
4) Performance: budgeted frame time under load (animations + overlays), add trace baseline.
5) Cross‑browser QA: run in two modern browsers; verify a11y announcements and overlays.
6) Challenge mode: timed sets with streaks and sounds toggle (muted by default).

---

## Changelog (2025‑09‑01)

- Added Implementation Snapshot capturing current step IDs and wiring.
- Switched Addition carry to mental‑carry pedagogy: narration‑only + decisive right‑hand change; carry applied in tens.
- Enforced guards in Arithmetic: Addition a+b ≤ 99; Subtraction A ≥ B, with disabled navigation and friendly guidance.
- Added reversible navigation: Back now animates to the previous step’s target and updates a status line.
- Standardized resets: New Problem and mode switch reset hands to 0|0 before building steps.
- Introduced Practice Controls in Arithmetic: mode filter (+/−/±) and Levels (1/2/3) that influence New Problem generation.
- Implemented Info modal, Fullscreen toggle (with fallback), Auto advance, and a Help tour overlay (Start/Next/Back/Skip).
- Removed per‑finger halos and fingertip dots to simplify visuals; Help card content removed.
- Adopted a light, learner‑friendly theme for the Teaching UI panels and overlays.
- Updated Test Plan and Acceptance Criteria to reflect all completed items (marked with checkmarks).
