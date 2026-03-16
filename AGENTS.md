# AGENTS.md — Furniture Designer

## What This Is

A frontend-only SPA for designing custom furniture in 3D, built with React + Three.js (via React Three Fiber). Users place parametric furniture (cabinets, desks, dressers, bookshelves) inside a configurable room, edit individual panels and hardware, then generate cut lists, sheet layouts, a bill of materials, and assembly instructions.

No backend. All state lives in Zustand, persisted to localStorage, exportable as JSON.

## Deployment

Live at **https://kovachwt.github.io/furnier/**

Auto-deployed via GitHub Actions (`.github/workflows/deploy.yml`) on every push to `main`. The workflow runs `npm ci && npm run build` and deploys the `dist/` folder to GitHub Pages.

The Vite config sets `base: '/furnier/'` so asset paths resolve correctly under the repo subpath.

## Build & Run

```bash
npm install
npm run dev          # dev server on :5173
npm run build        # production build to dist/
npx tsc --noEmit     # type check without emitting
```

IMPORTANT: always commit to git after making changes, so that the changes can immediately be tested on GH pages.

## Architecture Overview

```
src/
  types/index.ts        ← All TypeScript types (the single source of truth for data shapes)
  store/useStore.ts     ← Zustand store: all state + actions + undo/redo + localStorage persistence
  utils/
    templates.ts        ← Parametric generators: createCabinet(), createBookshelf(), createDesk(), createDresser()
    cutlist.ts          ← Guillotine bin-packing algorithm + BOM generation
    snap.ts             ← Grid snap + snap-to-target helpers
  components/
    Scene.tsx           ← R3F Canvas with lighting, camera, OrbitControls
    room/               ← Room geometry (walls, floor, grid, labels)
    furniture/          ← 3D meshes for panels, legs, hardware
    ui/                 ← Sidebar panels (toolbar, forms, editors, piece list)
    cutlist/            ← Cut list modal (sheet diagrams, BOM table, assembly notes)
  App.tsx               ← Layout: toolbar on top, sidebar on left, viewport fills rest
  index.css             ← All styles (no CSS framework, just custom properties)
```

## Key Design Decisions

- **Units**: everything internal is in millimeters. The 3D scene uses a 1:1000 scale (`mmToWorld()` / `worldToMm()` in `RoomBox.tsx`).
- **Zustand + Immer**: state is deeply nested (project → pieces → components), so Immer's `produce()` is used everywhere for safe mutations. Subscriptions use `subscribeWithSelector` middleware.
- **Parametric templates generate flat component arrays**: a cabinet template produces ~6-10 Panel objects with pre-computed positions. After creation, every panel is independently editable — templates are not "live" parametric objects.
- **Guillotine bin-packing**: chosen over free-form nesting because real panel saws only make through-cuts. The algorithm is in `cutlist.ts`, ~120 lines, using Best Short Side Fit heuristic.
- **No cost tracking**: deliberately excluded from scope. The BOM is quantities + specs only.
- **No backend**: localStorage auto-save + JSON file export/import. The project file is a direct JSON serialization of the `Project` type.

## State Shape (Zustand)

The store in `useStore.ts` has:

```
project: Project          ← room, pieces[], materials[]
selectedPieceId           ← currently selected furniture piece
selectedComponentId       ← currently selected sub-component (panel, leg, etc.)
activeTool                ← 'select' | 'move'
snapEnabled, gridSize     ← snapping config
showDimensions, showGrid  ← viewport toggles
sawKerf                   ← mm, used by cut list generator
history[], historyIndex   ← undo/redo stack (stores pieces snapshots)
```

Actions are methods on the same store object. History is pushed after any structural change (add/remove/duplicate). Position updates during drag do NOT push history — only `onDragEnd` does.

## Conventions

- **File naming**: PascalCase for React components, camelCase for utils/store
- **Imports**: use `type` imports for type-only imports (enforced by `verbatimModuleSyntax` in tsconfig)
- **Component props**: defined as interfaces directly above the component, or inline
- **3D components**: each mesh type (PanelMesh, LegMesh, HardwareMesh) handles its own click/hover events and calls `setSelection()` on the store
- **No prop drilling**: all components read from Zustand directly via `useStore(selector)`
- **CSS**: single `index.css` file using CSS custom properties (--bg-primary, --accent, etc.), no utility classes

## Common Tasks

### Adding a new furniture template

1. Define parameter interface in `types/index.ts`
2. Add generator function in `utils/templates.ts` (see `createCabinet` as reference)
3. Add option to the template dropdown in `components/ui/AddFurniture.tsx`
4. Add parameter inputs (conditionally rendered based on template type)

### Adding a new component type

1. Add the type interface in `types/index.ts` and add it to the `Component` union
2. Create a mesh component in `components/furniture/`
3. Add the rendering case in `FurniturePieceMesh.tsx`'s switch statement
4. Add "add" button in `PieceEditor.tsx`
5. Add property editor fields in the `ComponentEditor` sub-component
6. Update `cutlist.ts` → `generateBOM()` to count the new type
7. Update `templates.ts` if any template should include it

### Adding a new material

Materials are data, not code. Either:
- Add to `DEFAULT_MATERIALS` array in `store/useStore.ts`
- Or add at runtime via the store's `addMaterial()` action (no UI for this yet)

### Modifying the cut list algorithm

All logic is in `utils/cutlist.ts`:
- `guillotinePack()` — the core bin-packing function
- `generateCutList()` — orchestrates: extract panels → group by material → pack each group
- `generateBOM()` — iterates all components, aggregates by type

### Changing the room/panel scale

The scale factor lives in `components/room/RoomBox.tsx`:
```ts
const S = 0.001; // mm to Three.js units (meters)
export const mmToWorld = (mm: number) => mm * S;
export const worldToMm = (world: number) => world / S;
```

Every 3D component imports these. Change `S` to change the scale.

## Testing

No test suite yet. To verify correctness:
- `npx tsc --noEmit` — type check
- `npm run build` — full production build
- Manual testing in browser: add each template type, verify 3D rendering, open cut list, check sheet layouts look sane

## Potential Future Work

- Snap-to-face (snap panels to adjacent panel faces, not just grid)
- Parametric constraints (e.g., shelf width locked to cabinet interior width)
- Exploded view animation for assembly visualization
- PDF export (jsPDF is already a dependency, just not wired up yet)
- DXF export for CNC machines
- glTF export for sharing 3D models
- Material editor UI (add/edit/remove materials)
- Door/window cutouts in room walls
- Instanced rendering for large projects (100+ panels)
