# Piece Distances (Temporary Dimension Mode)

## Overview

The **↕ Dist** toggle in the toolbar shows dimension labels above each furniture piece indicating the distance to the nearest wall or neighbor piece. This is useful for checking clearances and planning layouts.

## Where it lives

| File | Role |
|---|---|
| `src/components/room/PieceDistances.tsx` | R3F component that renders distance labels above each piece |
| `src/store/useStore.ts` | `showDistances` state + `setShowDistances()` action |
| `src/components/ui/Toolbar.tsx` | ↕ Dist toggle button |
| `src/components/Scene.tsx` | Renders `<PieceDistances />` inside the Canvas |

## Usage

1. Add one or more furniture pieces to the scene.
2. Click the **↕ Dist** button in the toolbar (next to the ↔ Dims button).
3. Yellow dimension labels appear above each piece showing its distance to the nearest wall or neighbor.
4. Click the button again to hide the labels.

## Implementation notes

- **Bounding box calculation**: For each piece, an axis-aligned bounding box (AABB) is computed from all its components (panels, legs, hardware). Panel dimensions use width/height/thickness, leg dimensions use diameter/height.
- **Distance calculation**: The closest distance is computed among:
  - Distance to each of the 4 room walls (left, right, back, front)
  - Distance to each non-overlapping neighbor piece (2D gap in XZ plane)
- **Fixture filtering**: Fixture pieces (pillars, radiators, etc.) are excluded from distance display.
- **Rendering**: Uses drei's `<Text>` component with yellow color (`#ffdd00`) and black outline for readability against any background. Labels are positioned above each piece's bounding box center.
- **Performance**: Distance computation is O(n²) across pieces but only recalculated when `showDistances` changes (not on every frame).

## Testing

Visual regression test (`playwright/piece-distances/`) adds two pieces and enables the distance display, verifying the toggle button becomes active.

```bash
node playwright/run.cjs piece-distances
node playwright/run.cjs piece-distances --update
```
