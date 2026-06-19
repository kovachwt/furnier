export type Vec3 = [number, number, number];

/**
 * A hole cut through a panel, for cable pass-through, sinks, vents, etc.
 *
 * Coordinates are in the panel's local 2D face space, measured in mm
 * from the panel's center. The panel's local face is the width × height
 * plane (the depth axis is the panel thickness); the cutout is punched
 * straight through the full thickness.
 */
export interface Cutout {
  id: string;
  shape: 'rect' | 'circle';
  /** Local X offset from panel center (mm). */
  x: number;
  /** Local Y offset from panel center (mm). */
  y: number;
  /** Rect: width (mm). Circle: diameter (mm). */
  w: number;
  /** Rect: height (mm). Circle: ignored (uses w as diameter). */
  h: number;
  /** Optional label surfaced in the cut list / BOM. */
  label?: string;
}

export interface Material {
  id: string;
  name: string;
  thickness: number; // mm
  sheetWidth: number; // mm
  sheetHeight: number; // mm
  color: string;
  grainDirection: boolean; // if true, cannot rotate on sheet
}

export interface Panel {
  id: string;
  type: 'panel';
  name: string;
  width: number;   // mm
  height: number;  // mm
  depth: number;   // mm (= material thickness usually)
  materialId: string;
  position: Vec3;
  rotation: Vec3;  // euler angles in radians
  edgeBanding: {
    top: boolean;
    bottom: boolean;
    left: boolean;
    right: boolean;
  };
  /** Holes punched through the panel (cable/sink/vent cutouts). */
  cutouts?: Cutout[];
}

export interface Leg {
  id: string;
  type: 'leg';
  name: string;
  diameter: number; // mm
  height: number;   // mm
  style: 'round' | 'tapered' | 'square';
  position: Vec3;
  rotation: Vec3;
}

export interface Hinge {
  id: string;
  type: 'hinge';
  name: string;
  hingeType: 'concealed' | 'butt' | 'piano';
  /** Which way the door swings open, viewed along the hinge axis. */
  swingDirection: 'left' | 'right';
  /** Door width (mm) — drives the swing-arc radius. */
  doorWidth: number;
  /** Cup depth (mm) — for concealed hinges; informational. */
  cupDepth?: number;
  position: Vec3;
  rotation: Vec3;
}

export interface DrawerSlide {
  id: string;
  type: 'drawer-slide';
  name: string;
  length: number; // mm
  slideType: 'ball-bearing' | 'soft-close' | 'undermount';
  position: Vec3;
  rotation: Vec3;
}

export interface ShelfPin {
  id: string;
  type: 'shelf-pin';
  name: string;
  position: Vec3;
  rotation: Vec3;
}

export interface Handle {
  id: string;
  type: 'handle';
  name: string;
  handleType: 'knob' | 'pull';
  diameter: number; // mm (knob radius / pull width)
  height: number; // mm (knob projection / pull height)
  position: Vec3;
  rotation: Vec3;
}

export type Component = Panel | Leg | Hinge | DrawerSlide | ShelfPin | Handle;

export interface ParametricConstraint {
  id: string;
  targetComponentId: string;
  targetProperty: 'width' | 'height';
  sourceComponentId: string;
  sourceProperty: 'width' | 'height';
  offset: number;
}

export interface FurniturePiece {
  id: string;
  name: string;
  position: Vec3;
  rotation: Vec3;
  components: Component[];
  locked: boolean;
  isFixture?: boolean;
  fixtureColor?: string;
  templateType?: 'cabinet' | 'bookshelf' | 'desk' | 'dresser' | 'door-cabinet' | 'fixture-box' | 'fixture-cylinder';
  templateParams?: CabinetParams | BookshelfParams | DeskParams | DresserParams | DoorCabinetParams | FixtureBoxParams | FixtureCylinderParams;
  constraints?: ParametricConstraint[];
}

export interface Room {
  width: number;   // mm
  depth: number;   // mm
  height: number;  // mm
}



export interface Project {
  name: string;
  room: Room;
  pieces: FurniturePiece[];
  materials: Material[];
}

// For cut list
export interface CutPiece {
  panelId: string;
  pieceName: string;
  panelName: string;
  width: number;
  height: number;
  materialId: string;
  edgeBanding: Panel['edgeBanding'];
  rotatable: boolean;
  /** Holes punched through this panel (for cut-list / PDF annotation). */
  cutouts?: Cutout[];
}

export interface SheetLayout {
  sheetIndex: number;
  materialId: string;
  placements: {
    piece: CutPiece;
    x: number;
    y: number;
    rotated: boolean;
  }[];
  wastePercent: number;
}

// Parametric templates
export interface CabinetParams {
  width: number;
  height: number;
  depth: number;
  shelves: number;
  doors: number; // 0, 1, or 2
  materialId: string;
}

export interface BookshelfParams {
  width: number;
  height: number;
  depth: number;
  shelves: number;
  materialId: string;
}

export interface DeskParams {
  width: number;
  height: number;
  depth: number;
  legStyle: Leg['style'];
  drawers: number;
  materialId: string;
}

export interface DresserParams {
  width: number;
  height: number;
  depth: number;
  drawerRows: number;
  materialId: string;
}

export interface DoorCabinetParams {
  width: number;
  height: number;
  depth: number;
  shelves: number;
  doors: number; // 1 or 2
  materialId: string;
}

export interface FixtureBoxParams {
  width: number;
  height: number;
  depth: number;
}

export interface FixtureCylinderParams {
  diameter: number;
  height: number;
}
