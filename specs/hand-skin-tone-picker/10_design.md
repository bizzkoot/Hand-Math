# Design: Hand Skin Tone Picker

## Components
- SkinToneService: central runtime module to set/get current skin color and notify listeners.
- UI Control: compact “Skin Tone” presets (≥5) plus hex input; keyboard accessible.
- App Hook: `handMathApp.setSkinColor(hex)` delegates to SkinToneService.

## Integration Points
- Material update path:
  - On app init, traverse left/right hand root groups once; collect unique `THREE.Material` references from `THREE.Mesh` and `mesh.material` arrays.
  - Cache these references in SkinToneService for O(k) updates.
  - Update via `material.color.set(hex)`; set `material.needsUpdate = true` only if renderer/material flags require.
- Initialization defaults:
  - Read initial color from first cached material to seed service state (no mutation) to satisfy AC-SKIN-001.
- Public API:
  - `handMathApp.setSkinColor(hex: string): void` → validates hex, applies to cached materials, returns silently on invalid.
- Optional debug:
  - Console helper mirrors the public API.

## Risks & Mitigations
- Mixed material types (single/array): normalize to array; deduplicate by object identity (Set).
- GLTF and procedural meshes: filter by `THREE.Mesh` and ensure `material` is `THREE.Material` or array thereof.
- Performance spikes on rapid changes: batch multiple set requests in a microtask using a pending flag; last-write-wins.
- Layout shift / scroll: mount control within existing toolbar container; fixed-height row, prevent wrap via CSS (`white-space: nowrap`).

## Sequence
- App init → hands ready → SkinToneService caches materials → UI shows presets → user selects color → service updates materials in-place.

## Non-Goals
- Persisting user choice across sessions.
- Sprite-hand CSS theming.

## Acceptance Mapping
- AC-SKIN-001: No mutation at boot; derive default from existing material state.
- AC-SKIN-002: In-place color updates; no mesh reload.
- AC-SKIN-003: Preset list drives validated hex codes.
- AC-SKIN-004: Hex validator; reject invalids without side effects.
- AC-SKIN-005: No interaction with articulation logic; materials only.
- AC-SKIN-006: Batched updates; no cloning → avoids leaks.
- AC-SKIN-007: Labeled, focusable controls with keyboard activation.
- AC-SKIN-008: Toolbar integration with fixed height; no vertical scroll.

