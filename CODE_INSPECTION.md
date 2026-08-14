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

### 2. Multi-piece drag floods the undo history — ✅ FIXED

> **Status update:** `setPiecesPositions` now takes an optional `{ skipHistory }` flag; the group-drag loop in `FurniturePieceMesh.handleDrag` passes it so intermediate moves don't push history, and `handleDragEnd` pushes the single entry (identical to the single-piece drag pattern). Align/distribute still use the default one-push-per-call behavior. Covered by the core Playwright regression test `group-drag-undo` (real gizmo mouse-drag; asserts exactly one history entry per drag and that one Ctrl+Z restores both pieces). Original finding below for reference.

**`src/components/furniture/FurniturePieceMesh.tsx:282` → `src/store/useStore.ts:782` (`setPiecesPositions`)**

`setPiecesPositions` ends with `get().pushHistory()`, and `handleDrag` calls it **on every pointer move** during a group drag. A single 2-second drag of a multi-selection creates dozens of history entries (capped at 50), so Ctrl+Z becomes nearly useless afterwards.

Single-piece drags do it correctly (`updatePiece` during drag + one `pushHistory` in `handleDragEnd`). Needs a non-history-pushing variant for the drag loop.

### 3. Cutout holes drawn at the wrong position on rotated panels — ✅ FIXED

> **Status update:** Both renderers (`CutListView.tsx` SVG + `pdfExport.ts` PDF) now use the placed-rect center terms in the rotated branch (`cx = px + pw/2 + c.y·s`, `cy = py + ph/2 − c.x·s` — `pw`/`ph` are the already-swapped placed dims, so the center is the same expression as the unrotated branch). Covered by a regression check appended to the existing `panel-cutouts` Playwright test: it forces a rotated placement (2000×700 panel on the 2800×2070 sheet), reads the drawn SVG geometry, and asserts each cutout center matches the rotated transform (verified to fail on the old code: off by ~169 SVG units). Original finding below for reference.

**`src/components/cutlist/CutListView.tsx:290-292`** (SVG) and **`src/utils/pdfExport.tsx:92`** (PDF) — same copy-pasted bug.

In the rotated branch the panel-center terms are swapped:

```ts
const cx = px + (ph / 2) + c.y * scale;  // should be pw / 2
const cy = py + (pw / 2) - c.x * scale;  // should be ph / 2
```

Verified math: an 800×400 panel placed rotated gets a centered cutout drawn at sheet (400, 200) instead of (200, 400). Any non-square rotated panel shows its cutouts misplaced in both the sheet diagram and the PDF.

### 4. Piece rotation ignored by snap and align — inconsistent with the rest of the codebase — ✅ FIXED

> **Status update:** Unified all piece-rotation math on the canonical corner-transform in `clashDetection.ts`. Extracted `computeComponentAABB(comp, pieceRotation, piecePosition)` (transforms each of a component's 8 corners through comp-rotate → comp-translate → piece-rotate → piece-translate, then takes axis-aligned bounds); `computePieceAABB` now aggregates it. `alignment.ts` `getPieceWorldBounds` / `getPiecesWorldBounds` / `computeAlignedPositions` / `computeDistributedPositions` now use `computePieceAABB`, so Align / Distribute / Align-to-wall and `MultiSelectBounds` are correct for rotated pieces. `snap.ts` `collectSnapTargets` and `snapPieceToFaces` compute panel face values via `computeComponentAABB` (with the dragged piece's offsets taken in the piece-rotated local frame, which is valid because the gizmo's rotation rings are disabled so piece rotation is constant during a drag). `SmartGuides` in `Scene.tsx` now uses the rotation-aware AABB center too. `getPieceLocalBounds` deliberately stays piece-rotation-agnostic (it operates in the component-coordinate space that `component.position` and the gizmo scaling center / floor-clamp offsets live in). Covered by the extended Playwright regression test `rotated-align`, which adds two differently-footprinted cabinets, rotates both 90°, asserts the rotation-aware world AABB swaps width↔depth extents, aligns their right edges, and asserts the real (rotation-aware) `maxX` values match (verified to fail on the old rotation-naive bounds: Δ~200 mm). Original finding below for reference.

**`src/utils/snap.ts`** (`collectSnapTargets`, `snapPieceToFaces`) and **`src/utils/alignment.ts`** (`getPieceWorldBounds` et al.)

- `collectSnapTargets` computes world face positions as `piece.position + panel.position` — the piece's rotation (`rotatePiecesBy` sets `rotation[1]`) is never applied, so snap targets for a rotated piece are at the wrong coordinates, and the dragged piece's own faces are likewise computed unrotated.
- `getPieceWorldBounds` / `computeAlignedPositions` / `computeDistributedPositions` all ignore `piece.rotation`, so **Align / Distribute / Align-to-wall and the multi-select bounds box** (`Scene.tsx` `MultiSelectBounds`, `AlignmentPanel`) are wrong for any rotated piece (a 800×400 cabinet rotated 90° still reports 800 mm of X extent).
- Meanwhile `clashDetection.computePieceAABB` and `PieceDistances.getPieceAABB` **do** handle piece rotation correctly — and `SmartGuides` in `Scene.tsx` doesn't. The codebase disagrees with itself.

---

## 🟠 Medium severity

### 5. 'R' key does two things at once — ✅ FIXED

> **Status update:** Camera vertical movement moved from `R/F` to **`Space` (up) / `C` (down)** in `KeyboardCameraControls` — `R` is now rotate-only, which is the more prominent documented binding and the one an existing test presses. (Gating camera-up on "no selection" was rejected: you almost always have a piece selected, so camera-up would have been effectively unreachable.) The handler now also skips modifier combos (Ctrl/Cmd/Alt) and focusable-control targets (so Space still activates a focused button), and preventDefaults Space to avoid page scroll. Shortcuts dialog updated (`Space / C — Move up / down`). Covered by the core test `interaction-fixes`: pressing R with a selection rotates the piece with **zero** camera movement; R with no selection does nothing; Space/C fly the camera up/down (asserted via a `window.__camera` test hook, same pattern as `window.__store`). Bonus: this also made `rotate-piece` deterministic — its documented "3–4% GPU rasterization variance" (and the 4.5% threshold workaround) was actually frame-timing-dependent camera drift from R flying the camera up mid-test; the threshold override is removed and the test now self-diffs at 0.000%. Original finding below for reference.

**`src/App.tsx:130`** vs **`src/components/KeyboardCameraControls.tsx`**

App's global handler rotates the selected piece 90° on R; `KeyboardCameraControls` (also listening on `window`) treats R as camera-up. `preventDefault()` doesn't stop sibling listeners, so one keypress **rotates the furniture and flies the camera upward simultaneously**. The shortcuts help dialog documents both bindings as if they don't conflict.

### 6. Leg extents doubled in distance measurement — ✅ FIXED

> **Status update:** `PieceDistances` no longer has its own hand-rolled AABB math — it now reuses the canonical rotation-aware `computePieceAABB` from `clashDetection.ts` (introduced by fix #4), which uses `height / 2` for legs and is already covered by `rotated-align`. Covered by the core test `interaction-fixes`: it adds a desk (legged template) and **programmatically** locates the rendered distance-label `Text` meshes in the scene graph (`window.__scene` hook, filtered by PieceDistances' 0.03 font size), asserting every label's world Y ≈ piece height + 50 mm — verified to fail on the old code with labels at y=1.151 instead of 0.800. (A visual diff alone can't pin this: the label shift is ~25 px ≈ 0.12% of the image, far under the 2% threshold.) Original finding below for reference.

**`src/components/room/PieceDistances.tsx:30`**

`hh = comp.height` ("legs extend upward from position") but legs render **centered** on their position (cylinder in `LegMesh`; templates place them at `legH/2`). `alignment.ts:26` and `clashDetection.ts:27` correctly use `height / 2`.

Result: distance labels for legged pieces (desks) float roughly one leg-height too high, and neighbor-gap logic uses inflated AABBs.

### 7. Two-door cabinet: handles mounted on the hinge edges — ✅ FIXED

> **Status update:** `createDoorCabinet` now places the two door knobs on the **inner** edges (the 2 mm center-gap side), inset 30 mm from the gap — mirroring the single-door cabinet's `innerW/2 - 30` inset — instead of at `∓(doorW + 1)` on the outer/hinge edges. Hinge placement is unchanged. Covered by the extended Playwright regression test `cabinet-doors`, which adds a 2-door cabinet and asserts via the store that the two handles sit at `x ≈ ∓31` (inner edges) while the four hinges remain at `x ≈ ∓367` (outer edges), and that the handles are well inboard of the hinge x-extent (the old buggy code put them coincident with the hinges at `∓382`). Original finding below for reference.

**`src/utils/templates.ts:488`** region

Comment says "left door on its right edge", but `[-(doorW + 1), …]` / `[+doorW + 1, …]` are the **outer** (hinge-side) edges. Knobs end up on the hinge side (worst place ergonomically) and centered exactly on the cabinet's outer edge, sticking out past the side.

### 8. Dead "Doors" control for the plain Cabinet template — ✅ FIXED

> **Status update:** Removed the inert `Doors` form-row from `PieceEditor` for `templateType === 'cabinet'` (the real door handling lives in the separate `door-cabinet` template, which still exposes its own `Doors` 1–2 control). `createCabinet` continues to ignore `params.doors`; the field is retained in `CabinetParams` only so `AddFurniture`'s default-param object stays type-valid (it was always passed but never read). Covered by the `cabinet-doors` regression test, which selects a plain cabinet and asserts (a) the Edit panel renders no `Doors` form-row, and (b) forcing `templateParams.doors = 2` + `regeneratePiece` still yields zero hinges / handles / door panels — proving the param is inert. Original finding below for reference.

`PieceEditor` renders a Doors (0–2) input for `templateType === 'cabinet'`, and `CabinetParams.doors` exists — but `createCabinet` never reads `params.doors`. Regenerating with Doors=2 visibly does nothing.

### 9. Piece-level gizmo shows rotation rings that do nothing — ✅ FIXED

> **Status update:** The piece-level `PivotControls` now passes `disableRotations` (with a comment explaining why), matching the component-level gizmo. Piece rotation remains available via the R key. Visually pinned by the updated `rotate-piece` baseline (its old baseline showed the dead rings; ~25k px of the old-vs-new diff is the rings + the camera no longer drifting). Verified via a temporary revert: re-enabling rings changes the `interaction-fixes` render by only 264 px (rings are nearly invisible at desk scale), so `rotate-piece` is the visual guard. Original finding below for reference.

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
2. ✅ Done — group-drag history flooding (#2): `setPiecesPositions(pos, { skipHistory: true })` in the drag loop; single `pushHistory` from `handleDragEnd`.
3. ✅ Done — the `pw/ph` swap in both cutout renderers (#3): placed-rect center terms corrected in SVG + PDF; assertion-only regression check added to `panel-cutouts` (no baseline change).
4. ✅ Done — unified piece-rotation handling: extracted `computeComponentAABB` in `clashDetection.ts`; `alignment.ts` and `snap.ts` now reuse it / `computePieceAABB`; `SmartGuides` uses rotation-aware AABB center. Covered by extended test `rotated-align` (#4).
5. ✅ Done — cabinet template duo (#7 + #8): two-door handles moved from hinge edges to inner edges (`∩(`/(`1 + 30`) mm from the center gap); the dead `Doors` control removed from the plain `cabinet` editor. Covered by extended test `cabinet-doors`.
5. ✅ Done — viewport-interaction trio (#5 + #6 + #9, one batch): camera vertical moved to Space/C (R rotate-only, `KeyboardShortcuts` updated); `PieceDistances` reuses canonical `computePieceAABB` (leg extents fixed); piece-level gizmo `disableRotations`. Covered by the new core test `interaction-fixes` (+ rotate-piece baseline update, threshold workaround removed). Test hooks `window.__camera` / `__controls` / `__scene` exposed in `Scene.tsx`.
6. Undo per keystroke in number inputs (#10) — needs a commit-on-blur / debounce UX decision; own batch.
7. Low-severity polish list — grab-bag batch.
