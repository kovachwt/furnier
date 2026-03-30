export type Vec3 = [number, number, number];

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

export type Component = Panel | Leg | Hinge | DrawerSlide | ShelfPin;

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

export type Tool = 'select' | 'move' | 'rotate' | 'add-panel' | 'add-leg' | 'add-hinge' | 'add-drawer-slide';

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
