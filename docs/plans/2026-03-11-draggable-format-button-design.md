# Draggable Floating Format Button Design

## Goal

Upgrade the current in-page `Format` button into a more polished floating action button for Overleaf. The new button should feel like a tool-style floating control, start in the bottom-left corner, support drag-and-drop repositioning, snap to the left or right edge on release, and restore its last saved position after reload.

## Constraints

- Keep the existing formatting execution flow unchanged.
- Limit behavior changes to the content script UI layer.
- Use browser-local persistence only.
- Avoid new dependencies and keep the project runnable as an unpacked Chrome extension.

## User Experience

### Visual Direction

- Replace the current text button with a circular floating action button.
- Show an icon only, not the `Format` label.
- Use a more refined green visual treatment with subtle gradient, outline, and softer shadow.
- Keep the button visually distinct from Overleaf’s native controls so it reads as a movable tool.
- Show a compact tooltip on hover with the text `Format LaTeX`.

### Initial Placement

- Default position is bottom-left.
- The button should start with a `20px` margin from the left and bottom edges.
- The button should use a fixed size suitable for pointer dragging, approximately `54px`.

### Drag Behavior

- Pointer movement below a small threshold remains a click.
- Once dragging starts, the button follows the pointer inside the viewport.
- While dragging, apply a small pressed-state transform and slightly reduced opacity.
- On pointer release, snap horizontally to the nearest side.
- Preserve the current vertical position when snapping.

### Persistence

- Save the snapped position in `chrome.storage.local`.
- Persist minimal state only:
  - `side`: `left` or `right`
  - `top`: the stored vertical offset from the top edge
- On page load, restore the saved position if present.
- If the viewport is smaller than the saved coordinates allow, clamp the button back into the visible area.

## Technical Design

### Files

- Modify `manifest.json` to add the `storage` permission.
- Modify `src/content.js` to:
  - replace the existing text-button rendering
  - manage drag state and pointer events
  - restore and persist button position
  - maintain the existing format trigger behavior
- Add `src/floating-button-position.js` for pure geometry and persistence-shape helpers.
- Add tests for the new helper module.
- Extend manifest tests for the new permission.

### Position Model

Use a pure helper module to keep geometry testable without DOM integration:

- `getDefaultFloatingButtonState(viewport, buttonSize, margin)`
- `clampFloatingButtonState(state, viewport, buttonSize, margin)`
- `snapFloatingButtonState(position, viewport, buttonSize, margin)`
- `resolveStoredFloatingButtonState(rawValue, viewport, buttonSize, margin)`

This keeps drag math separate from DOM code and gives the project a stable place to test edge snapping and viewport clamping.

### Data Flow

1. `content.js` creates the floating button.
2. On startup it reads stored state from `chrome.storage.local`.
3. A helper resolves that state into a safe on-screen position.
4. Pointer events update the element’s `left` and `top` styles.
5. On release, the helper computes the snapped side and clamped coordinates.
6. The resolved state is saved back to storage.
7. Clicks that never cross the drag threshold still call `requestTabBroadcast('button')`.

## Error Handling

- If `chrome.storage.local` is unavailable, fall back to the default left-bottom position.
- If stored data is malformed, ignore it and use the default position.
- If resizing would push the button off-screen, clamp it back into view immediately.

## Testing

- Add pure unit tests for position helpers:
  - default left-bottom placement
  - snapping to left edge
  - snapping to right edge
  - clamping when restored position exceeds viewport bounds
- Extend manifest tests to assert the `storage` permission exists.
- Keep existing formatter, shortcut, and editor-target tests unchanged.

## Out of Scope

- Integrating the button into Overleaf’s native toolbar
- Advanced spring or physics animation
- Multi-button menus or expanded action panels
- Cross-browser storage abstractions
