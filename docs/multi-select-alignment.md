# Multi-select & Alignment

## Overview

The Editor supports selecting multiple pieces at once and aligning /
distributing them as a group. The behaviour mirrors conventions from
CAD tools (Figma, SketchUp, AutoCAD): select a primary piece, then
shift-click to add more, then apply a transform to all of them at
once.

## Where it lives

| File | Role |
|---|---|
| `src/utils/alignment.ts` | AABB helpers, alignment / distribution math, wall plane lookup |
| `src/store/useStore.ts` | `selectedPieceIds` state + all multi-piece actions |
| `src/components/ui/AlignmentPanel.tsx` | Sidebar panel with the 3×3 align grid + To-Wall + Distribute |
| `src/components/ui/PieceList.tsx` | Multi-select via shift+click + All / None buttons |
| `src/components/ui/PieceEditor.tsx` | Multi-select summary when no single piece is the primary |
| `src/components/furniture/FurniturePieceMesh.tsx` | Group drag (gizmo on primary moves all selected) |
| `src/components/Scene.tsx` | `MultiSelectBounds` wireframe around the group |
| `src/components/furniture/PanelMesh.tsx` / `LegMesh.tsx` / `HardwareMesh.tsx` | Shift+click handling for 3D selection |

## Usage

### Building a multi-selection

* **In the 3D viewport**: shift+click a piece to toggle it in/out of
  the selection. A plain click still selects a single piece and
  clears any prior multi-selection.
* **In the piece list** (sidebar): the same shift+click rule. A
  plain click selects that one piece.
* **Select all**: `Ctrl+A` or the `☑ All` button in the piece list.
* **Clear**: `Esc`, the `✕ None` button, or click on empty viewport.
* **Primary piece**: the first piece you select owns the gizmo and
  is the one shown in the per-piece editor. The piece list shows
  the primary with a solid accent border; other selected pieces get
  a dashed border.

### Moving multiple pieces

* **Drag the gizmo** on the primary piece. The same drag delta is
  applied to every selected piece. Snap-to-face still works on the
  primary.
* **Arrow keys / PageUp / PageDown** nudge the entire selection by
  one grid step (or 1 mm with Shift).
* **`R`** rotates every selected piece 90° around the Y axis.
* **`Ctrl+D`** duplicates all selected pieces.
* **`Delete`** / **`Backspace`** removes all selected pieces (the
  mobile delete button does the same).

### Aligning pieces

Open the Edit tab in the sidebar. When 2+ pieces are selected, the
**Align & Distribute** panel appears. The badge in the panel header
shows the current selection count.

* **3×3 align grid** — one row per axis (X/Y/Z), one column per mode
  (min / center / max). Clicking a button sets every selected
  piece's position so that its AABB edge (min/center/max) along
  the chosen axis lines up with the combined AABB of the
  selection.

  | | min | center | max |
  |---|---|---|---|
  | **X** | left edges aligned | X centers aligned | right edges aligned |
  | **Y** | bottoms aligned | Y centers aligned | tops aligned |
  | **Z** | back edges aligned | Z centers aligned | front edges aligned |

* **To Wall** — align all selected pieces to a room boundary.
  Snaps the appropriate edge of every piece to the wall plane.
  * `Left` / `Right` — left or right wall (min/max X)
  * `Back` / `Front` — back or front wall (min/max Z)
  * `Floor` / `Ceiling` — floor or ceiling (min/max Y)

* **Distribute Evenly** (3+ pieces only) — sorts the selected
  pieces by their center along the chosen axis and spaces them
  evenly between the first and last. Useful for "make these three
  cabinets evenly spaced".

All operations are undoable (the action pushes to the history
stack on completion).

## How it works

### AABB computation

`utils/alignment.ts` provides rotation-aware AABB helpers:

* `getPieceLocalBounds(piece)` — AABB in piece-local coordinates
  (origin at the piece position), computed by iterating every
  component and using the existing `getAABBHalfExtents` (which
  handles Euler rotation correctly) for panels, half-height for
  legs, and a small isotropic extent for hardware.
* `getPieceWorldBounds(piece)` — adds the piece position.
* `getPiecesWorldBounds(pieces)` — the combined AABB, used to
  compute the align target. Uses the AABB center and half size to
  call `extendBounds` (the helper expects a *center* + half
  extents, not a min corner + half size — passing the min would
  inflate the combined bounds by 2× per side).

### Alignment

* **3×3 align**: `alignPieces(ids, axis, mode)` in the store
  computes the combined AABB, picks the target value (combined
  min/center/max on the chosen axis), and asks
  `computeAlignedPositions` for the new position of every piece
  (delta = target − piece's current min/center/max on the axis).
* **To Wall**: `alignPiecesToWall(ids, wall)` looks up the wall
  plane via `getWallPlane`, then aligns the matching edge
  (min for left/back/floor, max for right/front/ceiling).
* **Distribute**: `distributePieces(ids, axis)` (3+ only) sorts
  the pieces' centers, then places each at `first + i × step`
  where `step = (last − first) / (n − 1)`.

### Group drag

`FurniturePieceMesh.handleDragStart` captures the start position
of every selected piece. On `handleDrag`, the primary piece's new
position is computed normally (with snap-to-face / snap-to-grid),
then the same `(dx, dy, dz)` delta is applied to every other
selected piece via `setPiecesPositions`. This is what makes a
single drag move the whole group.

## Visual cues

* **In the 3D viewport**: a light-blue wireframe bounding box is
  drawn around the union of all selected pieces. A small
  cross marks the centroid on the floor.
* **In the piece list**: the primary's row has a solid accent
  border; other selected rows have a dashed accent border.
* **In the editor**: when no single piece is the primary (i.e.
  multi-select only), the editor shows a summary with a list of
  the selected pieces' positions and a `Duplicate All` /
  `Delete All` action.
* **The badge** in the panel header (`Pieces (3) [3 selected]`)
  gives an at-a-glance count.

## Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Click` (scene or list) | Select single piece (clears multi) |
| `Shift + Click` | Toggle piece in multi-selection |
| `Ctrl + A` | Select all pieces |
| `Esc` | Clear selection |
| `← → ↑ ↓` | Nudge every selected piece by one grid step |
| `Shift + arrows` | Fine nudge (1 mm) |
| `R` | Rotate every selected piece 90° around Y |
| `Ctrl + D` | Duplicate all selected |
| `Delete` / `Backspace` | Remove all selected |

## Testing

Four visual regression tests cover the feature; all read piece
positions back from `localStorage` to assert the store-level
behaviour, then pixel-diff a baseline:

| Test | What it checks |
|---|---|
| `playwright/multi-select/` | Three pieces selected, alignment panel visible, badge reads `3 selected` |
| `playwright/align-pieces/` | After "align X centers" on pieces at X = (0, 400, 800), all end up at X = 400 |
| `playwright/align-to-wall/` | After "align to back wall" the back edge of every piece touches the back wall plane |
| `playwright/distribute-pieces/` | After "distribute along X" the three pieces are evenly spaced |

```bash
node playwright/run.cjs multi-select align-pieces align-to-wall distribute-pieces
```

## Limitations / future work

* **Per-piece snap during group drag**: only the primary piece's
  face-snap is checked. Grouped pieces can therefore end up
  slightly inside walls or other pieces. Per-piece snap would
  require N×M face checks per frame, which is too expensive in a
  real-time drag.
* **Rotation-aware align**: align to wall uses world AABB
  min/max, which can clip rotated pieces into the wall. For
  common rotations (0° / 90° / 180° / 270° around Y) the
  AABB-vs-AABB result is correct because cabinet sides are
  axis-aligned after 90° Y rotation, but arbitrary rotations
  will have the usual AABB conservatism.
* **No history batching**: align / distribute push a single
  history entry each, but the operations are atomic anyway so
  per-piece undo isn't needed.
