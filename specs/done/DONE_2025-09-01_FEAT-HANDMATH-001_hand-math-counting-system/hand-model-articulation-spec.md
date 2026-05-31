# Hand Model Articulation Spec (Revised)

This document records our research into the vendor GLTF rig, the plan we proposed, the issues we found on integration, and the final technical solution that now animates both hands correctly. It is written to be actionable for engineering and QA.

Engineer’s Quick Start
- Core articulation: `js/handController.js:214` (applyQuaternionCurl)
- Debug panel wiring: `js/main.js:688` (setupDebugFingerAnimator)
- Pattern → targets (buttons/calculator): `js/main.js:988` (applyFingerPattern)
- Global closed capture at init: `js/handController.js:621` (forceAllFingersToClosedFist + captureClosedPoseForHand)

- Source models: `assets/models/hand_right.gltf`, `assets/models/hand_left.gltf`
- Binary variants: `assets/models/hand_right.glb`, `assets/models/hand_left.glb`
- Textures: `assets/models/textures/`
- Shared buffer: `assets/models/scene.bin`

## Clip Overview
- Duration: ~3.2083s (single animation clip present)
- Interpolation: `LINEAR`
- Channels: 61 (rotation-focused; some translation/scale keys on controls and tips)
- Rotation format: Quaternions (GLTF standard)

## Skeleton Summary (right hand)
- Skin root: node `12` named `_rootJoint`
- Joints list (skin order): nodes `12, 15–82`
- High-level hierarchy:
  - `_rootJoint` → `pulse.R_01` → `hand.R_02` → branches for thumb, a palm segment, and each finger base
  - Thumb chain under `thumb_base.R_03`
  - Index under `index_base.R_012`
  - Middle under `middle_base.R_020`
  - Ring under `ring_base.R_028`
  - Pinky under `pinky_base.R_036`
  - Each finger has both Ctrl segments and deform segments (`*_01`, `*_02`, `*_03`) ending with `*_end_*`

## Node → Channel Targets (right hand)
Only nodes listed here are keyed in the original clip. Properties are those animated in the GLTF.

- Wrist/Palm:
  - `hand.R.001_011`: rotation
  - `index_base.R_012`: rotation
  - `middle_base.R_020`: rotation
  - `ring_base.R_028`: rotation
  - `pinky_base.R_036`: rotation

- Thumb:
  - `thumb_base.R_03`: rotation
  - `thumb_Ctrl.R_04`: rotation
  - `thumb_Ctrl_01.R_05`: rotation
  - `thumb_Ctrl_02.R_06`: rotation, scale
  - `thumb_Ctrl_03.R_07`: rotation
  - `thumb_01.R_08`: rotation
  - `thumb_02.R_09`: rotation
  - `thumb_03.R_010`: rotation
  - `thumb_tip.R_048`: rotation, translation

- Index:
  - `index_Ctrl.R_013`: rotation
  - `index_Ctrl_01.R_014`: rotation
  - `index_Ctrl_02.R_015`: rotation
  - `index_Ctrl_03.R_016`: rotation, translation
  - `index_01.R_017`: rotation
  - `index_02.R_018`: rotation, translation
  - `index_03.R_019`: rotation, translation
  - `index_tip.R_044`: rotation, translation

- Middle:
  - `middle_Ctrl.R_021`: rotation
  - `middle_Ctrl_01.R_022`: rotation
  - `middle_Ctrl_02.R_023`: rotation
  - `middle_Ctrl_03.R_024`: rotation
  - `middle_01.R_025`: rotation
  - `middle_02.R_026`: rotation
  - `middle_03.R_027`: rotation
  - `middle_tip.R_045`: rotation, translation

- Ring:
  - `ring_Ctrl.R_029`: rotation, translation
  - `ring_Ctrl_01.R_030`: rotation, translation
  - `ring_Ctrl_02.R_031`: rotation, translation
  - `ring_Ctrl_3.R_032` (a.k.a. `ring_Ctrl_03.R_032`): rotation
  - `ring_01.R_033`: rotation, translation
  - `ring_02.R_034`: rotation
  - `ring_03.R_035`: rotation, translation
  - `ring_tip.R_046`: rotation, translation

- Pinky:
  - `pinky_Ctrl.R_037`: rotation
  - `pinky_Ctrl_01.R_038`: rotation
  - `pinky_Ctrl_02.R_039`: rotation
  - `pinky_Ctrl_03.R_040`: rotation
  - `pinky_01.R_041`: rotation
  - `pinky_02.R_042`: rotation
  - `pinky_03.R_043`: rotation, translation
  - `pinky_tip.R_047`: rotation, translation

Notes:
- Several Ctrl nodes include translation keys (particularly `index_Ctrl_03`, `ring_*` chain, and all `*_tip` nodes). These may contribute to subtle fingertip offsets or squash/stretch effects in the original animation.
- Deformation bones are the `*_01`, `*_02`, `*_03` nodes; control curves are named `*_Ctrl*`. For programmatic open/close, prioritizing rotation on the deform bones yields predictable articulation.

## Full Right-Hand Skeleton (nodes 12–82)
Ordered by node index to reflect the skin joint order; indentation shows parent → children chain as present in GLTF:

- 12: `_rootJoint` → 15, 73, 75, 77, 79, 81
- 15: `pulse.R_01` → 16
- 16: `hand.R_02` → 17, 28
- 17: `thumb_base.R_03` → 18, 20, 24
  - 18: `thumb_Ctrl.R_04` → 19 (end)
  - 20: `thumb_Ctrl_01.R_05` → 21 → 22 → 23 (end)
  - 24: `thumb_01.R_08` → 25 → 26 → 27 (end)
- 28: `hand.R.001_011` → 29, 40, 51, 62
  - Index branch:
    - 29: `index_base.R_012` → 30, 32, 36
      - 30: `index_Ctrl.R_013` → 31 (end)
      - 32: `index_Ctrl_01.R_014` → 33 → 34 → 35 (end)
      - 36: `index_01.R_017` → 37 → 38 → 39 (end)
  - Middle branch:
    - 40: `middle_base.R_020` → 41, 43, 47
      - 41: `middle_Ctrl.R_021` → 42 (end)
      - 43: `middle_Ctrl_01.R_022` → 44 → 45 → 46 (end)
      - 47: `middle_01.R_025` → 48 → 49 → 50 (end)
  - Ring branch:
    - 51: `ring_base.R_028` → 52, 54, 58
      - 52: `ring_Ctrl.R_029` → 53 (end)
      - 54: `ring_Ctrl_01.R_030` → 55 → 56 → 57 (end)
      - 58: `ring_01.R_033` → 59 → 60 → 61 (end)
  - Pinky branch:
    - 62: `pinky_base.R_036` → 63, 65, 69
      - 63: `pinky_Ctrl.R_037` → 64 (end)
      - 65: `pinky_Ctrl_01.R_038` → 66 → 67 → 68 (end)
      - 69: `pinky_01.R_041` → 70 → 71 → 72 (end)
- Fingertip helpers (direct children of `_rootJoint`):
  - 73: `index_tip.R_044` → 74 (end)
  - 75: `middle_tip.R_045` → 76 (end)
  - 77: `ring_tip.R_046` → 78 (end)
  - 79: `pinky_tip.R_047` → 80 (end)
  - 81: `thumb_tip.R_048` → 82 (end)

## Practical Guidance: Driving Open/Close

- Primary rotation targets per finger (deform chain):
  - Thumb: `thumb_01.R_08`, `thumb_02.R_09`, `thumb_03.R_010`
  - Index: `index_01.R_017`, `index_02.R_018`, `index_03.R_019`
  - Middle: `middle_01.R_025`, `middle_02.R_026`, `middle_03.R_027`
  - Ring: `ring_01.R_033`, `ring_02.R_034`, `ring_03.R_035`
  - Pinky: `pinky_01.R_041`, `pinky_02.R_042`, `pinky_03.R_043`

- Controls to optionally include (for matching original motion):
  - Thumb control chain: `thumb_Ctrl.R_04` → `thumb_Ctrl_01.R_05` → `thumb_Ctrl_02.R_06` → `thumb_Ctrl_03.R_07`
  - Index control chain: `index_Ctrl.R_013` → `index_Ctrl_01.R_014` → `index_Ctrl_02.R_015` → `index_Ctrl_03.R_016`
  - Middle: `middle_Ctrl.R_021` → `middle_Ctrl_01.R_022` → `middle_Ctrl_02.R_023` → `middle_Ctrl_03.R_024`
  - Ring: `ring_Ctrl.R_029` → `ring_Ctrl_01.R_030` → `ring_Ctrl_02.R_031` → `ring_Ctrl_03.R_032`
  - Pinky: `pinky_Ctrl.R_037` → `pinky_Ctrl_01.R_038` → `pinky_Ctrl_02.R_039` → `pinky_Ctrl_03.R_040`

- Programmatic approach (Three.js sketch):
  - Load `hand_right.gltf` using `GLTFLoader`.
  - Find `SkinnedMesh` and access `skeleton.bones` by name.
  - For deterministic open/close, animate quaternions of the deform bones listed above; optionally blend in the Ctrl bone rotations and small translations for tips to match the vendor clip.
  - The original clip’s timing curve is linear; reusing linear easing will produce the same feel.

## Left Hand
The left-hand GLTF mirrors the same structure and channels (node names in the provided file also use `.R` suffix, but the animated targets and hierarchy are equivalent). Apply the same articulation mapping and controls.

## References
- Model: `assets/models/hand_right.gltf:1`
- Model: `assets/models/hand_left.gltf:1`
- Buffer: `assets/models/scene.bin:1`

## 2) Proposed Approach (Next Steps)
Below is the concrete, step-by-step plan to integrate articulation into our app. We executed these tasks incrementally.

### Step-by-step Integration Plan
1) Bone Map Helper
- Build a helper that traverses the GLTF scene and resolves deform bones per finger to `{ base, middle, tip }` objects.
- Map (right hand):
  - thumb: `thumb_01.R_08`, `thumb_02.R_09`, `thumb_03.R_010`
  - index: `index_01.R_017`, `index_02.R_018`, `index_03.R_019`
  - middle: `middle_01.R_025`, `middle_02.R_026`, `middle_03.R_027`
  - ring: `ring_01.R_033`, `ring_02.R_034`, `ring_03.R_035`
  - pinky: `pinky_01.R_041`, `pinky_02.R_042`, `pinky_03.R_043`
- Do a tolerant lookup (exact name match first; warn if missing). Attach the result at `hand.userData.fingers`.

2) Bind In Controller
- In `HandController.setupGLTFCompatibility()`, if `hand.userData.fingers` is empty, call the Bone Map Helper to populate it.
- Preserve existing behavior (detect initial state, force closed fist) to keep app stable.

3) Calibrated Curl (Primary)
- Slerp per joint: `restQ.slerp(closedQ, 1 - position)` where position∈[0..1]. Base joint applies Y splay post-slerp.

4) Splay and Limits
- Apply splay as a small yaw/roll offset at the base joint only.
- Enforce per-joint limits (e.g., index: base ~90°, middle ~100°, tip ~80°; thumb slightly less) to prevent over-rotation.

5) Debug + Validation
- Expose `window.handDebug.setCurl(hand, finger, v)` for quick testing.
- Optional sliders in a small debug panel to sweep 0→1 for each finger.
- Quick checks: full open returns to rest; full close forms a clean fist; no mesh collapse.

6) Documentation
- Document the Bone Map Helper usage and curl API in `HAND_MODEL_SETUP.md` and reference this spec.
- Note any model-specific quirks (e.g., if Ctrl translations are later included).

### Tasks
- [x] Implement Bone Map Helper and wire it to `HandController` fallback
- [x] Implement calibrated slerp curl with per-joint limits
- [x] Add splay handling on base joints and expose debug controls
- [ ] Persist closed-pose presets per model

---

## 3) Debug Findings (from Finger Animator Summary)

Context: We ran the new Finger Animator on the right index finger and copied the Summary (see `console_log.txt:1`). This captures baseline and one open→close sweep with per-step samples aggregated into keyframes and anomaly stats.

Observed (right/index):
- Baseline (slider 0 = closed) Euler rotations:
  - baseDeg: x=0°, y=0°, z=144°
  - middleDeg: x=0°, y=0°, z=172.8°
  - tipDeg: x=0°, y=0°, z=115.2°
- Mid keyframe (slider 1, current≈0.785, target=1):
  - baseDeg: x≈-26.00°, y≈+26.04°, z≈-11.10°
  - middleDeg: x≈+2.11°, y≈-0.13°, z≈+10.06°
  - tipDeg: x≈+0.08°, y≈+0.13°, z≈+9.21°
- MinOpen (near slider 0.9):
  - baseDeg: x≈-24.69°, y≈+31.72°, z≈-11.73°

Anomaly statistics:
- totalSamples: 82
- anomalies: 59 (criteria: Δslider ≥ 0.02 with ΔprimaryDeg < 3°)

Interpretation:
- The “closed” baseline we forced earlier used a Z‑axis Euler curl (large positive Z on all three joints).
- During the “open” sweep, Z barely changes and the most motion happens on X and Y (base x≈-26°, y≈+26° at mid), producing many anomalies when comparing slider change vs. Z change.
- Conclusion: For non‑thumb fingers on this rig, the effective curl axis is primarily X (with a Y component), not Z. Our quaternion curl path, which used Z as primary for non‑thumb, is misaligned with the rig’s actual axes. Also, our closed reference (Euler Z‑based) does not match the quaternion rest/open reference, causing the “snap to open” and the “won’t fully close” symptoms after 99→0.

## 4) Fix Plan (current stage)

We will correct articulation in two incremental steps to minimize risk and enable validation after each:

Step A — Axis alignment (low‑risk, immediate feedback)
- For non‑thumb fingers, switch quaternion curl axes to primary X with a small Y blend, instead of primary Z.
- Keep base‑only splay as a small Y pre‑rotation.
- Re‑run the Finger Animator Summary on index/middle/ring/pinky to confirm anomalies drop substantially (ΔprimaryDeg tracks slider steadily).

Step B — Calibrated slerp between rest and measured closed (robust, model‑agnostic)
- On “Start Debug”, capture per‑joint closed quaternions as `closedQ` for the selected finger.
- Drive each joint by slerp(restQ → closedQ, 1 - position) for both debug and production paths. This guarantees the exact closed shape regardless of axis conventions, and makes open/close perfectly reversible.
- Persist per‑hand/finger `closedQ` at runtime once captured (or derive a default closed pose per model if we want immediate availability without the debug step).

Acceptance checks after Step A:
- Press 99 then 0: fingers animate open and return to a clearly more closed pose than before (no mere “twist”).
- Finger Animator Summary (right/index): anomalies drop from 59/82 to a small fraction; primaryDeg (now X) varies smoothly 0→peak→0.

Acceptance checks after Step B:
- “Closed” pose exactly matches baseline (within ≤1° per joint).
- Open/close is reversible and repeatable with no drift; no snapping to vendor bind.

Notes for implementation:
- Axis changes should be applied in `applyQuaternionCurl()` for non‑thumb fingers (use X as primary; small Y blend; optional base Y splay).
- The calibrated slerp path should store `restQuaternion` (already cached) and a new `closedQuaternion` per joint; then slerp by `1 - position`.

## 5) Implemented Solution & Current Behavior (Success)

Status (applied)
- [x] Step A: non‑thumb uses X primary with Y blend; splay at base Y
- [x] Step B: after initialization we force both hands to a closed fist and immediately capture those joint quaternions as `closedQ` per finger. All subsequent motions (buttons, calculator, sliders) slerp rest→closed using `1‑position`, ensuring the fingers close to the exact captured shape and reopen cleanly to rest

Implementation Summary
- Quaternion articulation: restQ cache; closedQ capture (startup + debug); calibrated slerp per joint; base-Y splay post-slerp
- Axis fallback: non-thumb X+Y; thumb X+Z; caps applied
- Pattern application: direct targets from calculator patterns (fixed 6–8)
- Demo: right 0→9 then left tens 0→90; statuses/highlights update
- Debug: Finger Animator (collapsible), X-primary analyzer, settle sample, low-noise logs
- UI: Buttons moved to top; debug panel hidden by default

Acceptance Checklist
- [x] Buttons 0–9 (right) and 0–90 (left) animate correctly (including 6–8)
- [x] 99 then 0 returns to exact closed shapes (no snap/twist-only)
- [x] Debug summary shows clean X-primary curl and final settle near target
- [x] Task 1 visibility/positioning remains compliant

## 6) Operational Notes
- Startup: Forces closed fists and captures `closedQ` for all fingers
- Re-calibration: Use Start Debug at slider 0 to refresh `closedQ` for a finger
- Animation speed: Adjustable via `handController.setAnimationSpeed(v)`
- Logging: Set `window.HANDMATH_LOG_LEVEL = 'info'|'debug'` for more detail; default is `warn`

## 7) Future Work & Risks
- [ ] Persist `closedQ` presets per model/hand to avoid re-capture on load
- [ ] Add Playwright specs: trigger 99→0 and assert current→target convergence ≤ tolerance
- [ ] Optionally blend tip translations for extra subtle realism
- [ ] Validate across additional rigs and add tolerant mapping if names/axes vary

## Implementation Summary (current build)

What changed in code (high level):
- Quaternion articulation:
  - Cache `restQuaternion` for base/middle/tip on load (unchanged behavior).
  - Capture `closedQ` (base/middle/tip) per finger after we programmatically force a closed fist at startup and when the debug panel’s Start Debug is pressed.
  - Drive articulation via calibrated slerp: for each joint, set `bone.quaternion = restQ.clone().slerp(closedQ, 1 - position)`. Base joint applies an additional small Y splay after slerp.
- Axis alignment fallback:
  - When `closedQ` is missing, non‑thumb fingers use X‑primary with a small Y blend; thumb blends X+Z as opposition/flexion.
- Pattern application:
  - Number buttons and calculator now set per‑finger target positions directly from the boolean pattern (no intermediate “signature integer” translation). This fixed cases like 6–8 not moving.
- Demo enhancements:
  - Demo counts right hand 0→9, then left hand tens 0→90 (0→9 pattern indices) with status/highlight updates.
- Debug + logging:
  - Added a compact Finger Animator (collapsible) to capture baseline and run a single open→close cycle; copies small summaries with anomaly detection aligned to X as primary for non‑thumb.
  - Introduced log levels via `HANDMATH_LOG_LEVEL` (default `warn`) and gated high‑volume logs accordingly.
- UI layout:
  - Moved Right/Left number buttons and Quick Calculator to the top of the control panel so finger motion is visible while interacting.

Affected files (key):
- `js/handController.js`: calibrated slerp path, Step A axis alignment fallback, closed pose capture, global closed capture post‑init.
- `js/main.js`: direct target application for patterns, demo sequence (right then left), debug panel capture and analyzer (X‑primary), logging helpers, collapsible panel behavior.
- `index.html`: controls reordered; debug panel collapsible and hidden by default.

## Validation Protocol (as executed)
- Visual checks:
  - Buttons 0–9 (right) and 0–90 (left) animate to expected finger configurations. Specifically verified 6–8 (thumb+index…ring) open and close properly.
  - Demo Counting animates right 0→9, then left 0→90 tens; statuses update and positions validate.
- Debug summary (right/index):
  - Baseline captured at slider 0 (closed); Animate Once shows X‑primary motion; final “settle” sample returns current≈target (≈0), confirming closed pose reached.
  - Anomalies computed against X‑primary are low and reflect only small per‑frame changes above a 0.2° threshold.

## Operational Notes
- Startup: The app forces a closed fist on both hands and immediately snapshots `closedQ` per finger, so all subsequent interactions slerp rest→closed consistently without requiring the debug panel.
- Re‑calibration: If needed, use the Debug panel’s Start Debug at slider 0 for a given finger to refresh its `closedQ` from the current pose.
- Logging: Set `window.HANDMATH_LOG_LEVEL = 'info'` (or `'debug'`) to temporarily surface additional details; default remains `'warn'` to keep console light.

## Next Opportunities
- Persistence: Store per‑model `closedQ` presets to avoid re‑capturing on every load and to support multiple rigs.
- Left‑hand demo parity: Already included; we can add combined (left+right) synchronized demos if desired.
- Fine‑tune splay: Expose small task‑specific presets or auto‑fit by camera framing.
- Additional QA: Add Playwright specs that assert the DOM state after triggering 99→0 and verify that target/current converge within tolerance.

- Task 4: Update docs and record model-specific notes.

### Implementation Status
- Task 1: DONE — `js/handBoneMap.js`, wired in `index.html`; controller auto-builds the map when missing.
- Task 2: DONE — Quaternion curl implemented in `HandController.applyQuaternionCurl()` with rest quaternion caching and caps.
- Task 3: DONE — Splay applied at base joint (pre-multiplied yaw); `window.handDebug` exposes quick controls.
- Task 4: PARTIAL — This spec updated with usage; further doc notes can go into `HAND_MODEL_SETUP.md` if needed.

### Usage Notes
- Console debug API: `window.handDebug`
  - `setCurl(hand, finger, v)`: set curl in [0..1], e.g., `handDebug.setCurl('right','index',0.7)`
  - `setSplay(hand, finger, deg)`: set splay in degrees, e.g., `handDebug.setSplay('right','index',8)`
  - `open(hand)`: fully open one hand
  - `fist(hand)`: fully close one hand
  - `pose(left,right)`: set a full pose via objects, e.g., `handDebug.pose({thumb:1,index:1},{index:0.5,middle:1})`
  - `info()`: quick introspection (available fingers, splay config)
- The UI sliders in `index.html` still work; splay UI uses `setSplayDegrees()` under the hood.
- Quaternion path is preferred when GLTF rest quaternions are available; otherwise Euler fallback is used.

Axis/sign mapping (implementation)
- Non-thumb: primary curl axis = local Z, positive angles curl; 0 angle = fully open (rest/bind). Small Y blend for realism.
- Thumb: blend X (opposition) and Z (flexion), positive angles curl; 0 angle = fully open (rest/bind).
- Splay: base-joint Y rotation, scaled by openness.

## Field Notes: What Went Well, Difficulties, Pending

### What Went Well
- Bone mapping: Successfully resolved deform chains (`*_01R_*`, `*_02R_*`, `*_03R_*`) and attached them to `hand.userData.fingers` used by the app.
- Open pose: Setting fingers to fully open (position=1) now matches the model’s bind/open pose and looks correct; base splay is applied and scales with openness.
- Quaternion path: Immediate and anatomical paths can both use rest-relative quaternions; logs confirm “QPATH” is active when rest quaternions are present.
- Splay: Base-joint yaw pre-multiplied before curl, providing a natural spread when extended.

### Difficulties Encountered
- Finger structure shape: The app builds `hand.userData.fingers` with `userData.{root,base,middle,tip}` while earlier helpers expected `{base,middle,tip}` at the top level. Rest-caching and drivers were adjusted to read the nested shape.
- Rest quaternion timing: Caching rest quats before calling `skeleton.pose()` caused “open” to be relative to the import frame, not the bind/open pose. Fixed by posing the skeleton first, then caching rest.
- Dual init overrides: Both `HandController` and `main.js` force closed fists at startup; this is harmless but adds console noise and complicates tracing.
- Immediate path vs animated path: Number buttons route through the “immediate” controller path; ensuring this used the quaternion articulation required explicit checks and fallback guards.

### Current Behavior (Fresh Load → 99 → 0)
- Fresh load + 99: Open pose is correct (bind/open + splay). Console shows QPATH at initialization with position 0 for forced fist, then at actions with position 1 for open.
- 99 → 0: Fingers remain mostly straight (only slight motion) even though button handler routes correctly. This indicates curl isn’t taking effect after the first full open.
  - Observed (from console): number button press logs appear, rest quaternions are present, QPATH is selected, yet visually the curl does not engage.
  - Hypotheses:
    - Rotation frame mismatch: local-axis quaternion application not matching the rig’s effective curl frame (premultiply/postmultiply order or parent rotation interaction).
    - Bone influence mismatch: we rotate deform bones, but mesh weights may still be driven by adjacent control bones in the imported rig for closed poses.
    - Post-apply override: a later pass (render/update/pose re-application) may reset or neutralize the curl for the 0 state.
    - Target mapping drift: after open, the immediate path sets current/target to 0, but another system may restore targets back to 1.

### Pending Tasks
- P1: Trace number-button flow (99 → 0), verify per-finger path
  - Add one-time action logs on number-button click to confirm the controller is called with pos=0 and QPATH is selected.
  - After applying curl, validate no subsequent code resets bones (e.g., a late skeleton.pose or UI sync).
- P1: Ensure rest quats are only cached once (post-pose) and never overwritten mid-session.
- P1: Add pre-apply safeguard for closed
  - On 99 → 0, call a `resetPose(hand)` to reassert rest quaternions, then apply the closed pose, to rule out residual transforms affecting curl.
- P1: Validate mesh influence chain
  - Confirm `*_01R_*, *_02R_*, *_03R_*` deform bones are the weighted influences for the visible skinned mesh (and not solely the `*_Ctrl*` chain) when creating the fist.
- P2: Add optional vendor-clip sampling for “closed” reference
  - Sample first/last keyframes from the GLTF animation to compute joint-specific closed offsets (better than generic caps) and store as `closedQuaternion` per joint.
  - Use slerp between `restQuaternion` (open) and `closedQuaternion` for precise matching.
- P2: Expose a `resetPose()` utility that reapplies bind/open rest to all joints before setting new targets; useful as a safety net.
- P3: Simplify startup
  - Remove duplicate “force closed fist” (choose either `main.js` or `HandController`) and keep one source of truth for initial state.
- P3: Tighten limits/tuning
  - Review per-joint caps for thumb and ring/pinky to improve curl silhouette.

### Success Criteria for Closure
- Pressing 99 results in correct open pose; pressing 0 immediately curls to a consistent fist with no residual straightness; repeated toggling between 0 and 9 yields stable, repeatable articulation with no drift.

### Action Plan Snapshot (for this issue)
- Instrument: keep QPATH/EULER logs; add per-bone quaternion delta debug (optional temporary).
- Safeguard: apply `resetPose(hand)` immediately before closed pattern application.
- Confirm influence: inspect `SkinnedMesh.skeleton.boneInverses` and `skinIndices/skinWeights` to verify deform chain influences; adjust if Ctrl bones are required in the closed pose.
- If needed, switch to slerp open ↔ vendor-closed reference per joint.
