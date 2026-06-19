# Panel Cutouts & Hinge Swing Arcs

Two related panel/door improvements shipped together:

1. **Panel cutouts** — rectangular and circular holes punched through any panel (cable pass-through, sink bowls, vents, dog doors).
2. **Hinge swing arcs** — a translucent quarter-circle sector visualising each door's swing path, shown when the owning piece is selected.

## Panel cutouts

### Data model

`Cutout` (in `src/types/index.ts`) is a hole in the panel's local 2D face space:

```ts
interface Cutout {
  id: string;
  shape: 'rect' | 'circle';
  x: number;   // mm from panel centre (local X)
  y: number;   // mm from panel centre (local Y)
  w: number;   // rect: width  · circle: diameter
  h: number;   // rect: height · circle: ignored
  label?: string;
}
```

`Panel.cutouts?: Cutout[]` carries them. The panel's local face is its **width × height** plane; the cutout is punched straight through the full panel thickness (the depth axis). Coordinates are millimetres from the panel's centre, so `(0,0)` is the middle of the panel.

### 3D rendering — `src/components/furniture/PanelMesh.tsx`

When `cutouts` is non-empty the mesh builds a `THREE.Shape` spanning the panel face, subtracts each cutout as a hole (`THREE.Path`), and extrudes it along Z by the panel depth. The geometry is cached via `useMemo` keyed on `width / height / depth / showThickness / JSON.stringify(cutouts)` so it isn't rebuilt every frame. When `cutouts` is empty/undefined the mesh keeps the original `boxGeometry` path — perf and visual-test stability for every existing template.

The thickness-exaggeration toggle (`showThickness`) scales only the Z axis of the extruded geometry, matching the `Math.max(depth*10, 5)` display depth used by the box path. `side: THREE.DoubleSide` is used when cutouts are present so the hole interior is visible.

### Editor — `src/components/ui/PieceEditor.tsx`

A `CutoutEditor` sub-component renders inside the panel ComponentEditor (non-fixture only): an `+ Rect` and `+ Circle` button, and per-cutout rows for X / Y / width / height (or diameter for circles) / label / remove. Adding/removing/editing calls `updateComponent({ cutouts: [...] })` and pushes history. Setting cutouts to an empty array writes `undefined` so untouched panels stay clean.

### Cut list, BOM, CSV, PDF — `src/utils/cutlist.ts`, `src/utils/pdfExport.ts`, `src/components/cutlist/CutListView.tsx`

- `extractCutPieces()` carries `cutouts` through onto each `CutPiece`.
- `generateBOM()` adds a **Cutouts** category aggregating holes by `shape × size × label`.
- `generateCutListCSV()` adds a **Cutouts** column to the Panels sheet (`circle ⌀60@(0,0); rect 80x80@(100,0)`).
- The SVG `SheetDiagram` draws cutout outlines (white fill, dark stroke) on each placed panel, with correct coordinate mapping when the panel is rotated 90° on the sheet.
- The PDF `drawSheetLayout` draws the same outlines via `doc.circle` / `doc.rect`.
- The PDF `drawAssembly` adds a per-panel `Cutouts: …` note in amber.

### What cutouts do **not** change

- **Bin-packing / sheet area / waste.** The bounding rectangle is what a real panel saw cuts, so `guillotinePack()` is untouched and waste % stays comparable. Cutouts are annotation only.
- **Clash detection.** AABBs use the outer panel dims; a cutout doesn't reduce a piece's bounding box. (Two panels with overlapping cutouts still clash on their bodies.)
- **Edge banding.** Cutouts are independent of edge banding flags.

## Hinge swing arcs

### Data model — `src/types/index.ts`

`Hinge` gains three fields:

```ts
swingDirection: 'left' | 'right';  // which way the door opens
doorWidth: number;                  // mm — the swing-arc radius
cupDepth?: number;                  // mm — informational (concealed hinges)
```

Existing `door-cabinet` template hinges are populated (`right` for left-mounted hinges, `left` for right-mounted, `doorWidth` = the door panel width, `cupDepth: 12`). The `+ Hinge` button in the sidebar creates a hinge with `swingDirection: 'right'`, `doorWidth: 400`, `cupDepth: 12`.

Old projects / shares predating these fields are handled defensively: `HingeSwingArc` and the editor both fall back to `doorWidth ?? 400` and `swingDirection ?? 'right'`, so nothing breaks on load.

### 3D rendering — `src/components/furniture/HardwareMesh.tsx`

`HingeSwingArc` builds a translucent quarter-circle sector in the hinge's local XZ plane:

- Closed door points along **+Z** (cabinet front).
- The door swings open toward **+X** (`swingDirection: 'right'`) or **−X** (`'left'`).
- Radius = `doorWidth` (clamped to ≥ 50 mm so a misconfigured hinge still shows something).
- 24-segment triangle fan (`meshBasicMaterial`, `#ff922b`, opacity 0.22, `depthTest: false`) plus an outline `lineSegments` for the two radii and the arc.
- **Only rendered when the owning piece is selected** (`isPieceSelected`), so an unselected scene stays uncluttered. The hinge body itself always renders.

Because the arc lives inside the hinge's local `<group rotation>`, it respects the hinge's rotation — so a hinge rotated to mount on the back of a cabinet still sweeps in the right plane.

### Editor

The hinge ComponentEditor adds: Type (concealed / butt / piano), Swing (opens right / left), Door Width, Cup Depth.

### BOM

Hinges were already counted in `generateBOM()` (`${hingeType} hinge`); the new fields don't change the BOM grouping.

## Sharing

`src/utils/sharing.ts` bumped to `v: 2`. The new fields are optional and backward-compatible — `decompressProject()` accepts v1 shares unchanged (consumers fall back to defaults). No migration code is needed.

## Testing

Two new visual regression tests:

- `playwright/panel-cutouts/` — adds a cabinet, then programmatically punches a circular + rectangular cutout into its top panel via the store, asserts the cutouts exist before screenshotting.
- `playwright/hinge-swing-arc/` — adds a door-cabinet, selects it (so arcs render), asserts hinges have swing fields set, screenshotting the visible arcs.

```bash
node playwright/run.cjs panel-cutouts hinge-swing-arc
node playwright/run.cjs panel-cutouts --update   # after intentional changes
```
