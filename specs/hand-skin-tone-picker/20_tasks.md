1. [x] Add SkinToneService to cache unique materials for both hands (AC-SKIN-002, AC-SKIN-006) — done: 2025-09-12T20:28:48.018910+08:00 by Bear
2. [x] Expose `handMathApp.setSkinColor(hex)` delegating to service (AC-SKIN-004, AC-SKIN-005) — done: 2025-09-12T20:28:48.018910+08:00 by Bear
3. [x] Validate hex input and ignore invalid values safely (AC-SKIN-004) — done: 2025-09-12T20:28:48.018910+08:00 by Bear
4. [x] Implement micro-batched apply to prevent stutter/leaks (AC-SKIN-006) — done: 2025-09-12T21:04:17.818577+08:00 by Bear
5. [x] Wire init to capture default from existing materials (AC-SKIN-001) — done: 2025-09-12T20:28:48.018910+08:00 by Bear
6. [x] Add UI control with 5+ presets and hex input (AC-SKIN-003, AC-SKIN-007, AC-SKIN-008) — done: 2025-09-12T21:04:17.818577+08:00 by Bear
7. [x] Ensure no layout shift or vertical scroll after control mounts (AC-SKIN-008) — done: 2025-09-12T21:04:17.818577+08:00 by Bear
8. [x] Manual QA script: rapid color changes; articulation and math unaffected (AC-SKIN-005, AC-SKIN-006) — done: 2025-09-12T21:04:17.818577+08:00 by Bear
9. [x] Playwright smoke: set color via API and assert canvas frames continue (AC-SKIN-002, AC-SKIN-005) — done: 2025-09-12T21:05:57.965122+08:00 by Bear
10. [x] Update docs: usage `handMathApp.setSkinColor('#c79a6b')` (AC-SKIN-004) — done: 2025-09-12T21:01:00.328296+08:00 by Bear
11. [ ] Robust, texture‑preserving skin tone (exclude nails; preserve albedo/normal details). Current shader tint still affects entire model and can wash nail/skin details. Explore per‑submesh masks or material tags, and/or lighting/SSS exposure controls to shift perceived light/dark without destroying texture fidelity (AC‑SKIN‑009).
    - Implemented: HSV tint with outgoingLight ratio, plus heuristic material filtering (exclude nails/accessories by name/props; allow userData.isSkin). Needs validation on real GLTF and potential mask texture for precise boundaries.
