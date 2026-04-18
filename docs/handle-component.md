# Handles / Pulls / Knobs (Hardware Component)

## Overview

Handles are a new hardware component type that can be added to any furniture piece. They come in two variants:

- **Knob** — rendered as a sphere, sized by radius
- **Pull** — rendered as an elongated box, sized by width

Handles are visible in the 3D viewport, selectable, independently editable, and counted in the bill of materials (BOM).

## Where it lives

| File | Role |
|---|---|
| `src/types/index.ts` | `Handle` interface added to the `Component` union |
| `src/components/furniture/HardwareMesh.tsx` | Renders knobs as spheres, pulls as boxes |
| `src/components/ui/PieceEditor.tsx` | `+ Handle` button + type/size editor fields |
| `src/utils/cutlist.ts` | Handle counting in `generateBOM()` |
| `src/utils/templates.ts` | Door cabinet and dresser auto-generate handles |
| `src/components/furniture/FurniturePieceMesh.tsx` | Handles included in scaling |

## Usage

### Adding handles manually
1. Select a piece in the 3D viewport.
2. In the sidebar, click **+ Handle** to add a new handle component.
3. Adjust position, type (knob/pull), diameter, and height in the component editor.

### Auto-generated handles
- **Door Cabinet** — automatically generates knobs on each door (right side of single door, inner edges of two doors).
- **Dresser** — automatically generates pulls centered on each drawer front.

### In the BOM
Handles appear in the Hardware section of the cut list / BOM, grouped by type and diameter:
- `Knob 25mm` — for 25mm radius knobs
- `Pull 128mm` — for 128mm wide pulls

## Implementation notes

- **Rendering**: Knobs use `sphereGeometry` (12×8 segments), pulls use `boxGeometry`. Both use a metallic material (`metalness: 0.85, roughness: 0.25`).
- **Selection**: Handles are clickable in the 3D viewport with double-click to select individually.
- **Scaling**: Handles are included in `getScalableDims()` so they scale with the piece during drag.
- **Position**: Handles are positioned in the component's local coordinate space, same as other hardware.
- **Fixture exclusion**: Handles on fixture pieces are excluded from cut lists and BOM (inherited from the piece's `isFixture` flag).

## Testing

Visual regression test (`playwright/handle-component/`) adds a door-cabinet and verifies handles appear in the component list.

```bash
node playwright/run.cjs handle-component
node playwright/run.cjs handle-component --update
```
