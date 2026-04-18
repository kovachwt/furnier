# Clash Detection

## Overview

When enabled, clash detection highlights furniture pieces that overlap with each other using **red translucent bounding boxes**. The toolbar button shows the number of detected clash pairs in parentheses.

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

- **AABB computation**: For each piece, the bounding box is computed by iterating all components (panels, legs, handles, etc.), extracting their local extents, and transforming corners by the piece's Y-axis rotation.
- **Overlap check**: Every pair of AABBs is tested for intersection (including touching surfaces). The check is O(n²) across all pieces.
- **Reactive updates**: A `useEffect` hook in the visualization component recomputes clashes whenever `project.pieces` or `showClashDetection` changes. This avoids Immer Proxy issues that would occur in a Zustand subscription.
- **Merged AABB**: If a piece clashes with multiple others, all overlapping AABBs are merged into one bounding box for a clean outline.

## Performance

- For typical projects (< 50 pieces), the O(n²) check runs in a few milliseconds.
- The AABB computation is cached per render cycle — no redundant work when the same piece is checked against multiple neighbors.
- Disabled by default (off) so there's zero overhead when not in use.

## Testing

Visual regression test in `playwright/clash-detection/` adds two overlapping cabinets and verifies the clash overlay renders.

```bash
node playwright/run.cjs clash-detection
```
