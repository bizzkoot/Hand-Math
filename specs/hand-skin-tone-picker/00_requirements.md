# Feature: Hand Skin Tone Picker

## Scope
- Add a user-facing control to change the 3D hand material skin color at runtime.
- Apply to both hands simultaneously; default remains the current color.
- Non-breaking: no changes to math logic, articulation, patterns, or UI layout.
- Out of scope: sprite hand mode (CSS sprite sheet) and external theming.

## Constraints
- Performance: no measurable FPS regression; update material color only (no reload).
- Compatibility: preserve initialization flow and closed-pose calibration.
- Defaults: app loads with existing skin color if user does nothing.
- A11y: control labeled and keyboard operable; no vertical scroll introduced.
- Persistence: not required for MVP.

## Acceptance Criteria (EARS)
- AC-SKIN-001 (Default Preservation): When the app loads, the hand skin color shall be the current default until the user selects a color.
- AC-SKIN-002 (Global Apply): When the user selects a skin color, the color shall apply to both left and right 3D hands within 100 ms without reloading.
- AC-SKIN-003 (Predefined Options): Given a set of predefined tones (min 5), when the user clicks a preset, the hands shall update to that tone exactly.
- AC-SKIN-004 (Custom Input): When the user enters a valid hex color (e.g., #c79a6b), the hands shall update to that color; invalid input shall be rejected with no change.
- AC-SKIN-005 (No Breakage): When the user changes skin color, finger articulation, pattern switching, and math totals shall continue to function without regression.
- AC-SKIN-006 (Performance Guard): When repeatedly changing colors (10 changes in <5s), frame rate shall not visibly stutter and no material leak shall occur.
- AC-SKIN-007 (A11y Control): The color control shall be focusable via keyboard, labeled “Skin Tone,” and operable via Enter/Space.
- AC-SKIN-008 (Layout Stability): When toggling presets or custom color, the page shall not introduce vertical scroll or layout shifts in the header/toolbar.

