# Floating Button Icon Size Design

## Goal

Reduce the visual weight of the floating format button icon without changing the button hit area, drag behavior, snapping, or persistence.

## Decision

- Keep the circular floating button at its current `54px` size.
- Reduce only the embedded SVG icon from `20px` to `16px`.
- Preserve all current interaction behavior and layout math.

## Rationale

- The current request is purely visual.
- Keeping the outer button size preserves drag comfort and click target size.
- Reducing only the icon lowers the perceived density without risking interaction regressions.

## Scope

- Modify the inline SVG size in `src/content.js`
- Add a focused test that guards the icon size

## Out Of Scope

- Changing button diameter
- Changing colors, shadows, or drag logic
- Updating position persistence behavior
