# AGENTS.md — Furniture Designer

## What This Is

A frontend-only SPA for designing custom furniture in 3D, built with React + Three.js (via React Three Fiber). Users place parametric furniture (cabinets, desks, dressers, bookshelves) and room fixtures (pillars, radiators, appliances) inside a configurable room, edit individual panels and hardware, then generate cut lists, sheet layouts, a bill of materials, and assembly instructions.

No backend. All state lives in Zustand, persisted to localStorage, exportable as JSON, and shareable via a deflate-compressed URL hash fragment.

See **[PLAN.md](./PLAN.md)** for the (long) wish list of nice-to-have features that are on the table but not committed.

## Deployment

Live at **https://kovachwt.github.io/furnier/**. Auto-deployed via `.github/workflows/deploy.yml` on every push to `main` (`npm ci && npm run build`, then publish `dist/` to GitHub Pages). `vite.config.ts` sets `base: '/furnier/'` so asset paths resolve under the repo subpath.

**You MUST commit AND push after finishing changes.** Do not stop at `git commit` — always run `git push` as well. Deployments only trigger on push, so an unpushed commit means your changes are not live and not testable on GH Pages. Do not forget this.

## Build & Run

```bash
npm install
npm run dev          # dev server on :5173
npm run build        # production build to dist/
npx tsc --noEmit     # type check
npm run test:visual  # Playwright visual regression suite
```

## Architecture

```
src/
  types/index.ts        ← All TypeScript types (single source of truth for data shapes)
  store/useStore.ts     ← Zustand store: state + actions + undo/redo + localStorage persistence
  utils/
    templates.ts        ← Parametric generators: createCabinet, createBookshelf, createDesk,
                          createDresser, createFixtureBox, createFixtureCylinder
    cutlist.ts          ← Guillotine bin-packing + BOM generation
    snap.ts             ← Grid snap + snap-to-face helpers
    pdfExport.ts        ← PDF generation (cut list, BOM, assembly) via jsPDF
    sharing.ts          ← URL-based project sharing (deflate via fflate)
  components/
    Scene.tsx           ← R3F Canvas with lighting, camera, OrbitControls, SnapGuides
    room/RoomBox.tsx    ← Walls, floor, grid, labels, scale constants
    furniture/          ← PanelMesh, LegMesh, HardwareMesh, FurniturePieceMesh (+ exploded view)
    ui/                 ← Toolbar, AddFurniture, PieceList, PieceEditor, RoomSettings,
                          ProjectActions, ShareDialog, KeyboardShortcuts, RoomMeasure
    cutlist/CutListView.tsx ← Cut list modal (sheet diagrams, BOM, assembly, PDF export)
  App.tsx               ← Layout: toolbar on top, sidebar on left, viewport fills rest
  index.css             ← All styles (CSS custom properties, no framework)
```

## Key Design Decisions

- **Units**: millimeters everywhere internally. The 3D scene uses a 1:1000 scale — see `mmToWorld()` / `worldToMm()` in `RoomBox.tsx` (const `S = 0.001`).
- **Zustand + Immer**: state is deeply nested, so Immer's `produce()` is used for all mutations. `subscribeWithSelector` middleware is enabled.
- **Parametric templates → flat component arrays**: a template produces ~6–10 `Panel` objects with pre-computed positions. After creation every panel is independently editable. Pieces store `templateType` + `templateParams` so they can be regenerated with new params while preserving piece identity.
- **Parametric constraints**: optional `ParametricConstraint` links between panel width/height properties inside a piece. `updateComponent()` propagates source changes to constrained targets.
- **Snap-to-face**: during drag, faces of the dragged piece's panels are checked against faces of all other panels and room walls. Rotation-aware AABB half-extents handle rotated panels. Face snaps take priority over grid snaps.
- **Exploded view**: rendering-only. `useFrame` + refs animate wrapper `<group>` offsets; component positions in the store are never modified. Labels use drei's `Text`.
- **Guillotine bin-packing**: chosen over free-form nesting because real panel saws only do through-cuts. ~120 lines in `cutlist.ts`, Best Short Side Fit heuristic.
- **Room fixtures** (`isFixture: true` on `FurniturePiece`): pillars, radiators, appliances, pipes. Reuse the full drag/snap/selection/undo stack and are filtered out of cut lists, BOM, assembly, and PDF export. Rendered semi-transparent with orange edges. Other furniture snaps against them.
- **No cost tracking** (deliberate). BOM is quantities + specs only.
- **URL sharing**: JSON stripped of default materials → deflate → base64url → `#share=...`. Hashes never hit the server. Typical 5–20-piece projects give 2k–8k char URLs.

## Store Shape (Zustand)

```
project: Project          ← room, pieces[], materials[]
selectedPieceId
selectedComponentId       ← sub-component (panel, leg, hardware)
activeTool                ← 'select' | 'move'
snapEnabled, gridSize
snapToFaces, snapThreshold (mm)
showDimensions, showGrid
sawKerf (mm)              ← used by cut list generator
explodedView, explodeFactor (0.5–3.0)
activeSnapLines           ← SnapLine[], transient guide lines during drag
history[], historyIndex   ← undo/redo (stores pieces snapshots)
```

History is pushed on any structural change (add/remove/duplicate/regenerate) and on `onDragEnd` — **not** on every position update during drag.

## Conventions

- **Files**: PascalCase for React components, camelCase for utils/store.
- **Imports**: use `type` imports for type-only imports (`verbatimModuleSyntax` is on).
- **State access**: components read from Zustand directly via `useStore(selector)`. No prop drilling.
- **3D events**: each mesh type handles its own click/hover and calls `setSelection()`.
- **CSS**: single `index.css` with custom properties (`--bg-primary`, `--accent`, …). No utility classes.

## Common Tasks

### Add a furniture template
1. Parameter interface in `types/index.ts`.
2. `create<Name>()` in `utils/templates.ts` (use `createCabinet` as reference).
3. Option in the `AddFurniture.tsx` template dropdown + conditional param inputs.
4. In `handleAdd()` set `piece.templateType` + `piece.templateParams`.
5. Case in `regeneratePiece` switch in `store/useStore.ts`.
6. Param inputs in `TemplateParams` inside `PieceEditor.tsx`.

### Add a fixture preset
Fixtures reuse `FurniturePiece` with `isFixture: true` and always map to `templateType` `'fixture-box'` or `'fixture-cylinder'`. A preset is just defaults:
1. New option under the "Room Fixtures" optgroup in `AddFurniture.tsx`.
2. Case in `handleTemplateChange()` with default dimensions + color.
3. Entry in the `names` map in the fixture branch of `handleAdd()`.

For a genuinely new fixture shape, follow "Add a component type" and add a new `createFixture<Shape>()` that sets `isFixture` and `fixtureColor`.

### Add a component type
1. Interface in `types/index.ts`; extend the `Component` union.
2. New mesh component under `components/furniture/`.
3. Case in `FurniturePieceMesh.tsx` switch.
4. Add button in `PieceEditor.tsx` + property editor fields in `ComponentEditor`.
5. Count it in `cutlist.ts` → `generateBOM()`.
6. Update relevant templates in `templates.ts`.

### Add a material
Materials are data. Either extend `DEFAULT_MATERIALS` in `store/useStore.ts`, or call the store's `addMaterial()` at runtime (no UI yet).

### Add a parametric constraint
`FurniturePiece.constraints[]` holds `{ sourceComponentId, sourceProperty, targetComponentId, targetProperty, offset }`. `updateComponent()` auto-applies matching constraints. Users manage them in the "🔗 Constraints" section of `PieceEditor`. They're cleaned up when components are removed or a piece is regenerated.

### R3F rendering gotchas
- **`useFrame(fn, priority)`**: any non-zero priority **disables the automatic render loop**. Only use priority > 0 if you call `gl.render()` yourself every frame. The default priority 0 keeps auto-rendering enabled. (This was the root cause of the blank-viewport bug — `ViewportCapture` used priority 1, which silently stopped all rendering.)
- **`<Suspense>` around async drei components**: `<Environment>`, `<Text>`, `<useTexture>`, etc. all suspend on network fetches. Wrap each in its own `<Suspense fallback={null}>` so one suspending asset doesn't blank the entire scene. This is especially important for headless browsers where font/HDR fetches may never resolve.
- **`preserveDrawingBuffer: true`**: set on `<Canvas gl>` so `canvas.toDataURL()` (screenshot button) and Playwright compositing always see the last frame. Without it the backbuffer is discarded after presentation.

### Snap system (`utils/snap.ts`)
- `getAABBHalfExtents()` — rotation-aware half-extents (XYZ Euler order).
- `collectSnapTargets()` — room walls + all panel faces, including fixtures.
- `snapPieceToFaces()` — matches faces of dragged piece against targets; returns adjusted position + guide info.
- `snapToGrid()` / `snapPositionToGrid()` — fallback for axes not face-snapped.
- Guides rendered by `SnapGuides` in `Scene.tsx`.

### Sharing system (`utils/sharing.ts`)
- `compressProject()` strips `DEFAULT_MATERIAL_IDS`, JSON-serializes with a `v` version field, deflate-compresses, base64url-encodes.
- `decompressProject()` reverses and merges defaults back in.
- `generateShareUrl` / `getShareFromHash` / `clearShareHash` + `estimateShareUrlLength` / `MAX_SAFE_URL_LENGTH`.
- UI: `ProjectActions.tsx` (share button + clipboard), `ShareDialog.tsx` (import confirmation). Bump `v` when the format changes.

### Cut list (`utils/cutlist.ts`)
- `guillotinePack()` — core bin-packing.
- `generateCutList()` — extract panels → group by material → pack.
- `generateBOM()` — aggregate components by type.

Both `extractCutPieces()` and `generateBOM()` skip `isFixture` pieces. `CutListView` pre-filters fixtures before calling these and the PDF exporter.

### PDF export (`utils/pdfExport.ts`)
`exportProjectPDF()` drives `drawTitlePage` → `drawSheetLayout` (one page per sheet) → `drawBOM` → `drawAssembly`. jsPDF v4, A4 portrait, all measurements in mm.

### Change the scene scale
Edit `const S = 0.001` in `components/room/RoomBox.tsx`. Every 3D component uses `mmToWorld` / `worldToMm` from there.

## Testing

### Visual regression (Playwright)
`playwright/` holds the committed suite. Each test has its own subfolder with a `test.cjs` and a `baseline.png`. The runner starts a dedicated Vite dev server on port 5179 (so it won't collide with your `npm run dev` on 5173), drives Chromium, screenshots the viewport, and diffs via pixelmatch.

```bash
npm run test:visual                 # run all
npm run test:visual -- add-cabinet  # run one
npm run test:visual:update          # re-record baselines after intentional changes
```

See `playwright/README.md` for layout, thresholds, and failure artifacts (`actual.png`, `diff.png`).

