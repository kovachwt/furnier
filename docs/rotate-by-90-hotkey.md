# Rotate-by-90° Hotkey

## Overview

Press **R** to rotate the currently selected furniture piece 90° around the Y (vertical) axis. All child components (panels, legs, hardware) are rotated together so the piece maintains its internal geometry.

## Where it lives

| File | Role |
|---|---|
| `src/store/useStore.ts` | `rotateSelectedPiece(angleDeg)` action — mutates `FurniturePiece.rotation[1]` and every `Component.rotation[1]` |
| `src/App.tsx` | `keydown` handler — listens for `r` / `R`, calls the store action |
| `src/components/ui/KeyboardShortcuts.tsx` | Documents the shortcut in the help overlay |

## Usage

1. Select a piece (click it in the 3D viewport or Tab through the piece list).
2. Press **R** — the piece snaps to the nearest 90° increment.
3. Press **R** again to rotate another 90°.
4. Each rotation is pushed to the undo/redo history (`Ctrl+Z` to undo).

## Implementation notes

- Rotation is around the Y axis only (vertical), matching how furniture is placed in a room.
- Angles are stored in radians and normalised to `[0, 2π)`.
- The action is blocked when the piece is locked (`piece.locked === true`).
- Child component rotations are updated in the same produce block so they stay in sync.

## Testing

A visual regression test (`playwright/rotate-piece/`) adds a cabinet and presses **R**, then diff-screenshots the viewport against a committed baseline.

```bash
node playwright/run.cjs rotate-piece   # run this test
node playwright/run.cjs rotate-piece --update  # re-record baseline
```
