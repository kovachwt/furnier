# Code Inspection Report

**Scope:** full review of `src/` — store, utils, 3D components, UI, hooks.
**Verification:** `npx tsc --noEmit` passes clean; findings below are logic/behavioral. Key findings were verified with runnable repros (see notes inline). No code was changed — report only.

---

## 🔴 High severity (data loss / broken core features)

### 1. Panels silently vanish from the cut list — ✅ FIXED

> **Status update:** Fixed in commit `7682da4` (pushed to `main`). `guillotinePack` now returns `{ layouts, unplaced }` and `generateCutList` surfaces leftovers in `unplaceable` (UI warning + CSV); `findSheetOverflow` now respects `grainDirection` when checking the rotated fit. Covered by the core Playwright regression test `cutlist-unplaceable`. Original finding below for reference.

**`src/utils/cutlist.ts:191`** (`guillotinePack`) + `findSheetOverflow` (line 34)

When a panel can't be placed, `guillotinePack` breaks out of the loop with only a `console.warn` — the panel appears in **neither** `layouts` nor `unplaceable`.

Repro (verified by execution): a grain-locked material (2500×1250 sheet) with a 1200×1300 panel:

- `findSheetOverflow` → `[]` (no UI warning, because "fits rotated" is true)
- `generateCutList` → `layouts: 0, unplaceable: 0` — the panel is gone from the cut list, BOM sheet counts, PDF, everything, with **zero user-visible warning**.

`findSheetOverflow` also doesn't account for `grainDirection` blocking the rotated fit. `guillotinePack` should return its leftovers so `generateCutList` can surface them.

### 2. Multi-piece drag floods the undo history

**`src/components/furniture/FurniturePieceMesh.tsx:282` → `src/store/useStore.ts:782` (`setPiecesPositions`)**

`setPiecesPositions` ends with `get().pushHistory()`, and `handleDrag` calls it **on every pointer move** during a group drag. A single 2-second drag of a multi-selection creates dozens of history entries (capped at 50), so Ctrl+Z becomes nearly useless afterwards.

Single-piece drags do it correctly (`updatePiece` during drag + one `pushHistory` in `handleDragEnd`). Needs a non-history-pushing variant for the drag loop.

### 3. Cutout holes drawn at the wrong position on rotated panels

**`src/components/cutlist/CutListView.tsx:290-292`** (SVG) and **`src/utils/pdfExport.tsx:92`** (PDF) — same copy-pasted bug.

In the rotated branch the panel-center terms are swapped:

```ts
const cx = px + (ph / 2) + c.y * scale;  // should be pw / 2
const cy = py + (pw / 2) - c.x * scale;  // should be ph / 2
```

Verified math: an 800×400 panel placed rotated gets a centered cutout drawn at sheet (400, 200) instead of (200, 400). Any non-square rotated panel shows its cutouts misplaced in both the sheet diagram and the PDF.

### 4. Piece rotation ignored by snap and align — inconsistent with the rest of the codebase

**`src/utils/snap.ts`** (`collectSnapTargets`, `snapPieceToFaces`) and **`src/utils/alignment.ts`** (`getPieceWorldBounds` et al.)

- `collectSnapTargets` computes world face positions as `piece.position + panel.position` — the piece's rotation (`rotatePiecesBy` sets `rotation[1]`) is never applied, so snap targets for a rotated piece are at the wrong coordinates, and the dragged piece's own faces are likewise computed unrotated.
- `getPieceWorldBounds` / `computeAlignedPositions` / `computeDistributedPositions` all ignore `piece.rotation`, so **Align / Distribute / Align-to-wall and the multi-select bounds box** (`Scene.tsx` `MultiSelectBounds`, `AlignmentPanel`) are wrong for any rotated piece (a 800×400 cabinet rotated 90° still reports 800 mm of X extent).
- Meanwhile `clashDetection.computePieceAABB` and `PieceDistances.getPieceAABB` **do** handle piece rotation correctly — and `SmartGuides` in `Scene.tsx` doesn't. The codebase disagrees with itself.

---

## 🟠 Medium severity

### 5. 'R' key does two things at once

**`src/App.tsx:130`** vs **`src/components/KeyboardCameraControls.tsx`**

App's global handler rotates the selected piece 90° on R; `KeyboardCameraControls` (also listening on `window`) treats R as camera-up. `preventDefault()` doesn't stop sibling listeners, so one keypress **rotates the furniture and flies the camera upward simultaneously**. The shortcuts help dialog documents both bindings as if they don't conflict.

### 6. Leg extents doubled in distance measurement

**`src/components/room/PieceDistances.tsx:30`**

`hh = comp.height` ("legs extend upward from position") but legs render **centered** on their position (cylinder in `LegMesh`; templates place them at `legH/2`). `alignment.ts:26` and `clashDetection.ts:27` correctly use `height / 2`.

Result: distance labels for legged pieces (desks) float roughly one leg-height too high, and neighbor-gap logic uses inflated AABBs.

### 7. Two-door cabinet: handles mounted on the hinge edges

**`src/utils/templates.ts:488`** region

Comment says "left door on its right edge", but `[-(doorW + 1), …]` / `[+doorW + 1, …]` are the **outer** (hinge-side) edges. Knobs end up on the hinge side (worst place ergonomically) and centered exactly on the cabinet's outer edge, sticking out past the side.

### 8. Dead "Doors" control for the plain Cabinet template

`PieceEditor` renders a Doors (0–2) input for `templateType === 'cabinet'`, and `CabinetParams.doors` exists — but `createCabinet` never reads `params.doors`. Regenerating with Doors=2 visibly does nothing.

### 9. Piece-level gizmo shows rotation rings that do nothing

**`src/components/furniture/FurniturePieceMesh.tsx`**

The component-level `PivotControls` sets `disableRotations`; the piece-level one doesn't, yet `handleDrag` decomposes only position/scale and discards the quaternion. Users can grab the rotation rings; the gizmo animates then snaps back with no effect.

### 10. One undo entry per keystroke in number inputs

**`src/components/ui/PieceEditor.tsx`** (`updatePos`)

`updatePiece`/`updateComponent` + `pushHistory()` on every `onChange`. Typing "720" produces 3 history entries (plus intermediate "7"/"72" states), drowning the undo stack.

Inconsistently, name edits, edge-banding toggles, and constraint add/remove never push history at all (not undoable), while dimension edits do.

---

## 🟡 Low severity / polish

- **`src/utils/screenshot.ts`** — `quality ≠ 1` encodes JPEG but always saves with a `.png` extension (currently only the default caller, so latent).
- **GPU memory leak** — `PanelMesh`'s punched `ExtrudeGeometry` (via `primitive`) and `HingeSwingArc`'s buffer geometries (via `geometry` prop) are never `.dispose()`d; R3F doesn't auto-dispose prop-passed objects, so repeated edits leak buffers.
- **`src/components/ui/AddFurniture.tsx`** — desk hardcodes `height: 750` while the state var exists (input hidden). Regenerating a desk later *does* honor height, so add-vs-regen behave differently.
- **Share toast lie** — after a successful `navigator.share()`, the toast says "copied to clipboard" though nothing was copied (`ProjectActions.tsx`).
- **`src/components/ui/RoomMeasure.tsx`** touch UX — a single tap sets `drawStart` but `cursorPos` stays null (no crosshair, no visual feedback until the second tap).
- **Dead exports** — `snapPosition` / `snapPositionToGrid` in `snap.ts` are unused.
- **`buildPunchedGeometry`** (`PanelMesh.tsx`) doesn't clamp cutouts to panel bounds — an out-of-bounds cutout produces undefined `ExtrudeGeometry` hole behavior (self-intersecting shape).
- **`loadProject` / `resetProject`** (`useStore.ts`) don't clear transient UI state (`activeSnapLines`, `clashPairs`).

---

## Suggested fix order

1. ✅ Done — `guillotinePack` returning unplaceables + `findSheetOverflow` grain check (#1, commit `7682da4`).
2. Group-drag history flooding (#2) — one-line fix with a `{ skipHistory }` variant.
3. The `pw/ph` swap in both cutout renderers (#3) — two-line fix, verified math above.
4. Unify piece-rotation handling by reusing `computePieceAABB`-style transforms in `snap.ts` / `alignment.ts` (#4).
5. R-key conflict decision (#5) — either move camera-up off R or gate on "no selection".

Items #1–#3 are small and verifiable, and can be covered with regression checks in the existing Playwright suite. #4 is a proper refactor and belongs in its own commit.
