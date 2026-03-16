# Furniture Designer

A frontend-only web application for designing custom furniture in 3D. Design cabinets, dressers, desks, bookshelves, and more by arranging panels, legs, and hardware inside a configurable room. The app produces cut lists, sheet layout diagrams, a bill of materials, and assembly instructions.

No backend required — everything runs in the browser.

## Live Demo

**https://kovachwt.github.io/furnier/**

Automatically deployed from `main` via GitHub Actions.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

To build for production:

```bash
npm run build
npx vite preview
```

## Features

### 3D Room Viewport
- Configurable room dimensions (width, depth, height in mm)
- Transparent walls, floor grid, and dimension labels
- Orbit/pan/zoom camera (mouse left-drag, right-drag, scroll)
- Click a piece to select it, double-click to select an individual component
- PivotControls gizmo for moving/rotating selected furniture
- Grid snapping (configurable grid size)

### Parametric Furniture Templates
- **Cabinet** — left/right sides, top, bottom, hardboard back, N shelves
- **Bookshelf** — full-width top/bottom, sides, back, N shelves
- **Desk** — top panel + 4 legs (round, tapered, or square)
- **Dresser** — sides, top, bottom, back, drawer fronts, horizontal dividers, drawer slides per row
- **Single Panel** — freeform, for custom builds

All templates are configurable (dimensions, material, shelf/drawer count, leg style) and explode into individual editable components on creation.

### Component Editor
- Edit any panel: dimensions, material, position, rotation
- Per-edge banding toggles (top, bottom, left, right)
- Edit legs: diameter, height, style
- Add/remove panels and legs to any piece
- Duplicate or delete whole furniture pieces
- Lock pieces to prevent accidental movement

### Materials (6 preloaded)
- White Melamine 18mm & 25mm
- Birch Plywood 18mm & 12mm
- MDF 18mm
- Hardboard 3mm

All defined with standard sheet sizes (2440×1220mm) and grain direction flag.

### Cut List Generator
- Guillotine bin-packing algorithm (simulates real panel saw constraints)
- Configurable saw kerf (default 3mm)
- Respects grain direction (plywood sheets won't be rotated)
- Visual SVG sheet layout diagrams showing where each panel is placed
- Waste percentage reported per sheet

### Bill of Materials
- Panels grouped by material with all dimensions
- Hardware list (legs, drawer slides, hinges, shelf pins) with specs and quantities
- Total sheet count per material type

### Assembly Instructions
- Per-piece step-by-step ordering (bottom-up by Y position)
- Lists each panel placement with exact dimensions and position
- Then lists hardware attachment steps

### Project Management
- Auto-saves to localStorage on every change
- Export/import project as `.json` file
- Undo/redo with Ctrl+Z / Ctrl+Y (50-step history)
- Delete key removes selected piece or component
- Escape to deselect

## Keyboard Shortcuts

```
Ctrl+Z          Undo
Ctrl+Y          Redo
Delete/Backspace Remove selected piece or component
Escape           Deselect all
```

## Tech Stack

```
React 19           UI framework
Three.js           3D rendering engine
React Three Fiber  React bindings for Three.js
Drei               R3F helpers (PivotControls, OrbitControls, Grid, Text, Edges)
Zustand + Immer    State management with immutable updates
Vite               Build tool
TypeScript         Type safety throughout
```

## Project Structure

```
src/
  types/index.ts              Data model (Room, Panel, Leg, Hinge, etc.)
  store/useStore.ts           Zustand store (state, actions, undo/redo, persistence)
  utils/
    snap.ts                   Snap-to-grid and snap-to-target logic
    templates.ts              Parametric furniture generators
    cutlist.ts                Guillotine bin-packing, BOM generation
  components/
    Scene.tsx                 R3F Canvas, lighting, camera
    room/RoomBox.tsx          Room walls, floor, grid, dimension labels
    furniture/
      FurniturePieceMesh.tsx  Piece group with PivotControls
      PanelMesh.tsx           Rendered panel (box with edges)
      LegMesh.tsx             Rendered leg (cylinder/box)
      HardwareMesh.tsx        Rendered hinges, slides, shelf pins
    ui/
      Toolbar.tsx             Top toolbar (tools, undo/redo, toggles)
      RoomSettings.tsx        Room dimension inputs
      AddFurniture.tsx        Template selector and parameters
      PieceList.tsx           List of all pieces in the project
      PieceEditor.tsx         Selected piece/component property editor
      ProjectActions.tsx      Save/load/reset buttons
    cutlist/
      CutListView.tsx         Modal with sheet layouts, BOM, assembly instructions
  index.css                   Full application styles
  App.tsx                     Main layout (toolbar + sidebar + viewport + modal)
  main.tsx                    Entry point
```

## Data Model

All dimensions are stored in **millimeters**. The 3D viewport uses a 1:1000 scale (1 Three.js unit = 1 meter).

```
Project
├── Room { width, depth, height }
├── Materials[] { name, thickness, sheetWidth, sheetHeight, color, grainDirection }
└── Pieces[]
    ├── name, position, rotation, locked
    └── Components[]
        ├── Panel  { width, height, depth, materialId, edgeBanding }
        ├── Leg    { diameter, height, style }
        ├── Hinge  { hingeType }
        ├── DrawerSlide { length, slideType }
        └── ShelfPin {}
```

## Cut List Algorithm

The app uses a **guillotine bin-packing** algorithm, which mirrors how real panel saws work — every cut must go edge-to-edge, dividing a rectangle into exactly two rectangles.

1. Panels are grouped by material
2. Sorted by area (largest first)
3. For each sheet, maintain a list of free rectangles
4. Place each panel using **Best Short Side Fit** heuristic
5. After placing, split remaining space with guillotine cut (saw kerf subtracted)
6. If a panel doesn't fit the current sheet, open a new one
7. Report waste percentage per sheet

## License

MIT
