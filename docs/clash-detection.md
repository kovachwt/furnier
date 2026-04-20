# Clash Detection

## Overview

When enabled, clash detection highlights **furniture pieces** that interpenetrate each other using red translucent bounding boxes. The toolbar button shows the number of detected clash pairs in parentheses.

## Where it lives

| File | Role |
|---|---|
| `src/utils/clashDetection.ts` | AABB computation + overlap checking |
| `src/hooks/useClashDetection.ts` | React hook that recomputes clashes on piece/toggle changes |
| `src/components/ClashVisualization.tsx` | R3F component rendering red overlays |
| `src/store/useStore.ts` | `showClashDetection` + `clashPairs` state |
| `src/components/ui/Toolbar.tsx` | Toggle button |

## Usage

1. Place two or more furniture pieces in the scene.
2. Position them so they overlap (drag, nudge with arrow keys, or set X/Y/Z values in the editor).
3. Click the **⚠ Clash** button in the toolbar.
4. Red translucent bounding boxes appear around any piece involved in a clash.
5. The button label shows the clash count, e.g. `⚠ Clash (2)`.
6. Click the button again to disable clash detection.

## How it works

- **AABB computation**: For each piece, the bounding box is computed by iterating all components (panels, legs, handles, hinges, etc.), extracting their local half-extents, transforming all 8 corners through the full transform hierarchy (component rotation → component translation → piece rotation → piece translation), and finding the min/max extents. This correctly handles rotated panels (e.g. cabinet side panels rotated 90° around Y).
- **Overlap check**: Every pair of furniture AABBs is tested for interpenetration using strict inequalities — touching surfaces are **not** counted as clashes (furniture placed flush against each other is valid).
- **Fixtures excluded**: Room fixtures (pillars, radiators, etc.) are filtered out of the furniture-vs-furniture pass. Fixture proximity is a separate concern tracked in PLAN.md.
- **Reactive updates**: A `useEffect` hook in the visualization component recomputes clashes whenever `project.pieces` or `showClashDetection` changes.
- **Per-piece rendering**: Each clashing piece gets its own red bounding box overlay. If a piece clashes with multiple others, it's still rendered once.

## Performance

- For typical projects (< 50 pieces), the O(n²) check runs in a few milliseconds.
- Disabled by default (off) so there's zero overhead when not in use.

## Testing

Visual regression test in `playwright/clash-detection/` adds two overlapping cabinets and verifies the clash overlay renders.

```bash
node playwright/run.cjs clash-detection
```
