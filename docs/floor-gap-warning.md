# Floor-Gap Warning (Validation)

## Overview

The **⚠ Gap** toggle in the toolbar enables a validation feature that warns when furniture pieces are floating unintentionally above the floor. This catches common mistakes where a piece is accidentally elevated instead of sitting on the ground.

## Where it lives

| File | Role |
|---|---|
| `src/utils/floorGap.ts` | `getFloorGap()` and `isPieceFloating()` helpers |
| `src/store/useStore.ts` | `showFloorGapWarnings` state + `setShowFloorGapWarnings()` action |
| `src/components/ui/PieceList.tsx` | Renders ⚠ icon and orange highlight for floating pieces |
| `src/components/ui/Toolbar.tsx` | ⚠ Gap toggle button |
| `src/index.css` | `.piece-item.floating` orange border/background styling |

## Usage

1. The feature is enabled by default (toggle persists in localStorage via Zustand).
2. When a piece's Y position is > 5mm above the floor, it gets:
   - An orange border and background highlight in the piece list
   - A ⚠ icon prefix in the piece name
   - A tooltip showing the exact gap: `⚠ Floating: 200mm above floor`
3. Click the **⚠ Gap** button in the toolbar to toggle the feature on/off.
4. Fix the issue by selecting the piece and setting its Y position to 0 (or the desired elevation).

## Implementation notes

- **Threshold**: 5mm — pieces with position Y ≤ 5mm are considered "on the floor". This accounts for minor numerical imprecision while catching intentional elevations.
- **Fixture exclusion**: Fixture pieces (pillars, radiators, etc.) are excluded from the check since they may legitimately sit above the floor.
- **Simple heuristic**: Uses the piece's Y position directly rather than computing a full AABB, since component positions are relative to the piece and complex to resolve for rotated panels.
- **Performance**: The check is O(n) across pieces and only runs when the piece list re-renders (on selection or position change).

## Testing

Visual regression test (`playwright/floor-gap-warning/`) adds a cabinet, lifts it to Y=200mm via the editor, and verifies:
- The `.floating` CSS class is applied
- The ⚠ icon appears in the piece name
- The tooltip shows the correct gap value (200mm)

```bash
node playwright/run.cjs floor-gap-warning
node playwright/run.cjs floor-gap-warning --update
```
