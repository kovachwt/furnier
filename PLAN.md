# PLAN.md — Nice-to-Have Features

A wish list of features that would be valuable additions to the Furniture Designer. Ordered roughly by category rather than priority — anything here is considered "on the table," not committed.

---

## Performance & Quality

- [ ] **Instanced rendering** for repeated hardware (shelf pins × 40)
- [ ] **Occlusion culling** for large scenes
- [ ] **Lazy-loaded PDF export code** to keep the main bundle lean
- [x] **Automated visual regression tests** using the existing Playwright setup (docs/automated-playwright-tests.md)
- [ ] **Unit tests** for `cutlist.ts`, `snap.ts`, `templates.ts`, `sharing.ts`

## Accessibility

- [ ] **Full keyboard navigation** — tab through pieces, arrow-key nudging
- [ ] **Screen-reader labels** on the 3D scene (description of selection)
- [ ] **High-contrast theme**

## Mobile & Touch

- [x] **Touch-friendly gizmo** for phones/tablets
- [x] **Pinch-to-zoom / two-finger orbit** polish
- [x] **Responsive sidebar** (collapsible, bottom-sheet on narrow screens)
- [ ] **Save-to-home-screen PWA** with offline cache

## Furniture Templates

- [ ] **Wardrobe** — full-height cabinet with hanging rail, shelves, optional drawers
- [ ] **Kitchen base cabinet** — toe-kick, drawer-stack variant, under-sink variant, corner carcass
- [ ] **Kitchen wall cabinet** — lift-up door hardware, adjustable depth
- [ ] **Corner cabinet / L-shaped desk** — two-panel joinery
- [ ] **Bed frame** — headboard, side rails, slats, optional storage drawers
- [ ] **Nightstand** — small drawer + shelf preset
- [ ] **TV console / media unit** — open shelves + cable cutouts + glass-door bay
- [ ] **Coffee / dining table** — apron + leg attachments with stretcher option
- [ ] **Bench** — seat + legs + optional storage
- [ ] **Shoe rack** — slanted shelves
- [ ] **Floating shelf** — wall-anchored, hidden bracket annotation
- [ ] **Bar cabinet / wine rack** — bottle holes, stemware rail
- [ ] **Custom-shape piece** — L-shape, U-shape, or stepped outline, built from a 2D sketch

## Panel & Geometry Features

- [ ] **Panel cutouts** — rectangular and circular holes (for cable pass-through, sinks, vents)
- [ ] **Rounded corners / fillets** on panels (with warning if not CNC-cuttable)
- [ ] **Chamfered / beveled edges** rendered in 3D and surfaced in assembly notes
- [ ] **Dadoes / rabbets / grooves** — joinery representation with auto cut-depth on BOM
- [ ] **Mitered edges** — 45° corners rendered and flagged in assembly
- [ ] **Sloped / angled panels** — arbitrary-angle roof / ramp components
- [x] **Panel thickness visualization toggle** — exaggerate thickness 10× for clarity at a glance ([docs](docs/panel-thickness-toggle.md))

## Room & Environment

- [ ] **Non-rectangular rooms** — L-shaped, bay, angled walls; floor-plan editor
- [ ] **Ceiling slope** (attic rooms) — most impactful for wardrobes
- [ ] **Windows and doors** — cut into walls with swing arc, affecting snap-to-face
- [ ] **Electrical outlets / switches / pipes** as first-class annotations
- [ ] **Floor finish / wall color / trim** — aesthetic-only
- [ ] **Real-world reference image** — load a photo of the room as a background plane

## Materials & Finishes

- [ ] **Custom material editor UI** (currently data-only; store has `addMaterial` but no UI)
- [ ] **Material library import/export** as JSON
- [ ] **Textured PBR materials** — wood grain, laminate patterns, with grain-direction preview
- [ ] **Edge banding library** — matching and contrasting options, priced per meter
- [x] **Edge-banding length estimate** — meters per color/type ([docs](docs/edge-banding-estimate.md))
- [ ] **Finish / stain / paint layer** separate from panel material (so the same plywood can have different finishes)
- [ ] **Sheet size variants** per material (e.g., 2440×1220 vs 3050×1525)
- [ ] **Off-cut / leftover inventory** — start from a pool of partial sheets before using fresh ones

## Hardware & Fittings

- [ ] **Door hinges** — European cup hinges with swing arc visualization
- [ ] **Drawer-slide library** — full-extension, soft-close, push-to-open variants with specs
- [x] **Handles / pulls / knobs** — knob & pull hardware component with BOM integration ([docs](docs/handle-component.md))
- [ ] **Hanging rail / closet rod** — diameter + end-bracket hardware
- [ ] **Shelf pins / KD fittings / cam locks** — countable BOM hardware
- [ ] **Leveling feet** — visible hardware under cabinets
- [ ] **Toe-kick boards** — separate component with recess offset
- [ ] **Gas struts / lift mechanisms** with stroke arc visualization

## Interaction Improvements

- [ ] **Numerical input for position/rotation** via a floating input near the gizmo
- [ ] **Constrain-to-axis** during drag by holding Shift (partially present? verify)
- [x] **Rotate-by-90° hotkey** for the selected piece ([docs](docs/rotate-by-90-hotkey.md))
- [ ] **Stack-drop** — drop a piece on top of another, auto-align Y to sit on it
- [ ] **Snap-to-center / snap-to-edge** modifiers
- [ ] **Duplicate-with-offset** (Ctrl+D + drag) like in CAD tools
- [ ] **Mirror piece** across X/Y/Z

## Validation & Warnings

- [x] **Clash detection** — warn when furniture intersects a fixture or wall ([docs](docs/clash-detection.md))
- [x] **Floor-gap warning** — piece floating unintentionally ([docs](docs/floor-gap-warning.md))
- [ ] **Unreachable-drawer warning** — drawer blocked by pillar / wall / neighbor
- [ ] **Door-swing clearance check**
- [x] **Sheet-size overflow** — panel too big for any sheet in its material ([docs](docs/sheet-size-overflow.md))
- [ ] **Constraint-cycle detection** for parametric constraints

## Cut List & Optimization

- [ ] **Free-form nesting** alternative for CNC shops (non-guillotine bin-packing)
- [ ] **Cut-sequence optimization** — minimize saw setup changes
- [ ] **Grain-aware rotation** — already partially supported; expose per-panel override
- [ ] **Blade/kerf per material** instead of a single global kerf
- [ ] **Multiple sheet sources** — some material from a 2440×1220, some from an offcut
- [ ] **Manual override** — drag a panel to a different sheet in the layout preview
- [x] **Waste report** — total m², total cost, pie chart per material ([docs](docs/waste-report.md))
- [x] **Export cut list as CSV / DXF / OptiCutter XML** ([docs](docs/csv-export.md))
- [ ] **Solid-wood cut list** — length-only 1D packing for rails, trim, stretchers

## Assembly & Documentation

- [ ] **Animated step-by-step assembly** (IKEA-style) in 3D with a "next / previous" stepper
- [ ] **Auto-numbered part labels** in exploded view carry through to PDF
- [ ] **Joinery callouts** on assembly pages (screw spec, dowel spec, pocket-hole angle)
- [ ] **Hardware placement diagrams** (hinge positions on panel with exact coords)
- [ ] **Print-ready 1:1 drilling templates** as separate PDF pages
- [ ] **Assembly time estimate** based on piece complexity

## Sharing & Collaboration

- [ ] **Read-only share mode** — viewer without edit tools
- [ ] **Version history** beyond undo/redo — named snapshots
- [ ] **Compare two designs** side-by-side (same room, two layouts)
- [ ] **Short share links** via optional URL shortener (still keep hash-only privacy as default)
- [x] **QR code for share URL** (useful on phone / tablet during the build) ([docs](docs/qr-code-share.md))
- [ ] **Export/import project bundle** (.furnier.zip) containing project + custom materials + images

## AI / Assistance

- [ ] **"Fill this wall"** — pick a wall, the app suggests cabinet configurations that fit
- [ ] **Natural-language edit** — "add a shelf halfway up the left cabinet"
- [ ] **Smart piece naming** based on content (e.g., "Tall bookcase by window")
- [ ] **Material recommendation** — "you have 42 shelves — plywood would save €X vs MDF"

## UI / UX

- [ ] **Keyboard shortcut cheat-sheet overlay** (? key)
- [ ] **Measurement annotations** — click two faces to draw a live dimension line
- [x] **Temporary dimension-mode** showing all piece distances to nearest wall / neighbor ([docs](docs/piece-distances.md))
- [ ] **Multi-select pieces** — group move, align, distribute
- [ ] **Alignment tools** — align-to-wall, align-centers, distribute-evenly
- [x] **Smart guides** — magenta guide lines like Figma for center-alignment with neighbors ([docs](docs/smart-guides.md))
- [ ] **Context menu** on right-click (duplicate, delete, lock, bring-to-front of a stack)
- [x] **Piece search / filter** in the piece list ([docs](docs/piece-search-filter.md))
- [ ] **Layers / groups** — organize pieces into named groups that can be hidden/locked
- [x] **Camera presets** — save named views; front/side/top/iso buttons ([docs](docs/camera-presets.md))
- [ ] **Walk-through mode** — FPS-style camera at eye height
- [ ] **First-time tutorial / onboarding tour**
- [x] **Dark/light theme toggle** ([docs](docs/dark-light-theme.md))

## Export & Import

- [x] **Screenshot / high-res render** of the current viewport ([docs](docs/screenshot-render.md))
- [ ] **Export 3D model** — GLTF, OBJ, USDZ for AR preview
- [ ] **Export to SVG** per panel for CNC / laser cutting
- [ ] **Import SketchUp / STEP / IFC** as fixtures
- [ ] **Screenshot / high-res render** of the current viewport (button in toolbar)
- [ ] **360° turntable render** as animated GIF / MP4
- [ ] **Offline PWA** — install as app, fully offline-capable

---

*Last updated 2026-04-18.*
