# Smart Guides (Figma-style Center Alignment)

## Overview

When a furniture piece is selected, **magenta guide lines** appear through its center axes (X and Z), extending across the entire room. Neighbor pieces whose centers align with these axes within a 10mm threshold are also highlighted with fainter magenta lines. This helps quickly identify and achieve center-alignment between pieces — similar to Figma's smart guides.

## Where it lives

| File | Role |
|---|---|
| `src/components/Scene.tsx` | `SmartGuides` R3F component + `getPieceCenter()` helper |

## Usage

1. Click on any furniture piece in the 3D viewport to select it.
2. Magenta center lines appear:
   - One vertical line through the piece's X-center (back wall + floor)
   - One horizontal line through the piece's Z-center (floor + left wall)
3. If any neighbor piece's center aligns with these axes (within 10mm), that neighbor's center lines are also shown in a fainter magenta.
4. Click elsewhere or press Escape to deselect and hide the guides.

## Implementation notes

- **Center calculation**: The center is computed as the average of all component positions within a piece (not a full AABB, since component positions are relative to the piece origin).
- **Alignment threshold**: 10mm — close enough for practical alignment while avoiding false positives.
- **Rendering**: Uses drei's `<Line>` component with magenta color (`#ff00ff`). Selected piece lines are at 50% opacity, aligned neighbors at 30% opacity.
- **Performance**: O(n) across pieces per frame, but only computed when a piece is selected (not on every render).
- **No state**: Smart guides are purely visual — they don't affect snapping, positioning, or any store state.
- **Fixture exclusion**: Fixture pieces are excluded from alignment checks (pillars, radiators, etc. shouldn't trigger smart guides).

## Testing

The smart guides are rendered in the 3D scene whenever a piece is selected. Existing tests that select pieces (e.g., `piece-search`, `rotate-piece`) implicitly exercise the guide rendering. Since the guides are subtle and don't change the UI structure, no dedicated visual regression test was added.

```bash
# Visual regression tests exercise the guides indirectly
node playwright/run.cjs piece-search
node playwright/run.cjs rotate-piece
```
