import { v4 as uuid } from 'uuid';
import type {
  FurniturePiece, Panel, Leg, Hinge, DrawerSlide, Vec3, Material,
  CabinetParams, BookshelfParams, DeskParams, DresserParams, DoorCabinetParams,
  FixtureBoxParams, FixtureCylinderParams
} from '../types';

function makePanel(
  name: string,
  width: number,
  height: number,
  materialId: string,
  thickness: number,
  position: Vec3,
  rotation: Vec3 = [0, 0, 0],
  edgeBanding = { top: false, bottom: false, left: false, right: false }
): Panel {
  return {
    id: uuid(),
    type: 'panel',
    name,
    width,
    height,
    depth: thickness,
    materialId,
    position,
    rotation,
    edgeBanding,
  };
}

export function createCabinet(params: CabinetParams, materials: Material[]): FurniturePiece {
  const mat = materials.find(m => m.id === params.materialId);
  const t = mat?.thickness ?? 18;
  const { width, height, depth } = params;
  const innerW = width - 2 * t;
  const innerH = height - 2 * t;
  const components: Panel[] = [];

  // Left side
  components.push(makePanel('Left Side', depth, height, params.materialId, t,
    [-(width / 2) + t / 2, height / 2, 0],
    [0, Math.PI / 2, 0],
    { top: false, bottom: false, left: false, right: true }
  ));

  // Right side
  components.push(makePanel('Right Side', depth, height, params.materialId, t,
    [(width / 2) - t / 2, height / 2, 0],
    [0, Math.PI / 2, 0],
    { top: false, bottom: false, left: true, right: false }
  ));

  // Top
  components.push(makePanel('Top', innerW, depth, params.materialId, t,
    [0, height - t / 2, 0],
    [Math.PI / 2, 0, 0],
    { top: false, bottom: false, left: false, right: false }
  ));

  // Bottom
  components.push(makePanel('Bottom', innerW, depth, params.materialId, t,
    [0, t / 2, 0],
    [Math.PI / 2, 0, 0],
    { top: false, bottom: false, left: false, right: false }
  ));

  // Back panel (thinner material)
  components.push(makePanel('Back', innerW, innerH, 'hardboard-3', 3,
    [0, height / 2, -(depth / 2) + 1.5],
    [0, 0, 0],
  ));

  // Shelves
  if (params.shelves > 0) {
    const spacing = innerH / (params.shelves + 1);
    for (let i = 1; i <= params.shelves; i++) {
      components.push(makePanel(`Shelf ${i}`, innerW, depth - t, params.materialId, t,
        [0, t + spacing * i, t / 2],
        [Math.PI / 2, 0, 0],
        { top: false, bottom: false, left: false, right: true }
      ));
    }
  }

  return {
    id: uuid(),
    name: 'Cabinet',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    components,
    locked: false,
  };
}

export function createBookshelf(params: BookshelfParams, materials: Material[]): FurniturePiece {
  const mat = materials.find(m => m.id === params.materialId);
  const t = mat?.thickness ?? 18;
  const { width, height, depth } = params;
  const innerW = width - 2 * t;
  const innerH = height - 2 * t;
  const components: Panel[] = [];

  // Left side
  components.push(makePanel('Left Side', depth, height, params.materialId, t,
    [-(width / 2) + t / 2, height / 2, 0],
    [0, Math.PI / 2, 0],
    { top: false, bottom: false, left: false, right: true }
  ));

  // Right side
  components.push(makePanel('Right Side', depth, height, params.materialId, t,
    [(width / 2) - t / 2, height / 2, 0],
    [0, Math.PI / 2, 0],
    { top: true, bottom: false, left: false, right: false }
  ));

  // Top
  components.push(makePanel('Top', width, depth, params.materialId, t,
    [0, height - t / 2, 0],
    [Math.PI / 2, 0, 0],
    { top: false, bottom: false, left: true, right: true }
  ));

  // Bottom
  components.push(makePanel('Bottom', width, depth, params.materialId, t,
    [0, t / 2, 0],
    [Math.PI / 2, 0, 0],
    { top: false, bottom: false, left: true, right: true }
  ));

  // Back panel
  components.push(makePanel('Back', innerW, innerH, 'hardboard-3', 3,
    [0, height / 2, -(depth / 2) + 1.5],
    [0, 0, 0],
  ));

  // Shelves
  const spacing = innerH / (params.shelves + 1);
  for (let i = 1; i <= params.shelves; i++) {
    components.push(makePanel(`Shelf ${i}`, innerW, depth - 3, params.materialId, t,
      [0, t + spacing * i, 1.5],
      [Math.PI / 2, 0, 0],
      { top: false, bottom: false, left: false, right: true }
    ));
  }

  return {
    id: uuid(),
    name: 'Bookshelf',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    components,
    locked: false,
  };
}

export function createDesk(params: DeskParams, materials: Material[]): FurniturePiece {
  const mat = materials.find(m => m.id === params.materialId);
  const t = mat?.thickness ?? 25;
  const { width, height, depth, legStyle } = params;
  const components: (Panel | Leg)[] = [];

  // Desktop
  components.push(makePanel('Desktop', width, depth, params.materialId, t,
    [0, height - t / 2, 0],
    [Math.PI / 2, 0, 0],
    { top: false, bottom: false, left: true, right: true }
  ));

  // 4 legs
  const legH = height - t;
  const legInset = 50; // mm from edge
  const positions: [string, Vec3][] = [
    ['Front-Left Leg', [-(width / 2) + legInset, legH / 2, (depth / 2) - legInset]],
    ['Front-Right Leg', [(width / 2) - legInset, legH / 2, (depth / 2) - legInset]],
    ['Back-Left Leg', [-(width / 2) + legInset, legH / 2, -(depth / 2) + legInset]],
    ['Back-Right Leg', [(width / 2) - legInset, legH / 2, -(depth / 2) + legInset]],
  ];

  for (const [name, pos] of positions) {
    components.push({
      id: uuid(),
      type: 'leg',
      name,
      diameter: legStyle === 'square' ? 50 : 40,
      height: legH,
      style: legStyle,
      position: pos,
      rotation: [0, 0, 0],
    });
  }

  return {
    id: uuid(),
    name: 'Desk',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    components,
    locked: false,
  };
}

export function createDresser(params: DresserParams, materials: Material[]): FurniturePiece {
  const mat = materials.find(m => m.id === params.materialId);
  const t = mat?.thickness ?? 18;
  const { width, height, depth, drawerRows } = params;
  const innerW = width - 2 * t;
  const innerH = height - 2 * t;
  const components: (Panel | DrawerSlide)[] = [];

  // Left side
  components.push(makePanel('Left Side', depth, height, params.materialId, t,
    [-(width / 2) + t / 2, height / 2, 0],
    [0, Math.PI / 2, 0],
    { top: false, bottom: false, left: false, right: true }
  ));

  // Right side
  components.push(makePanel('Right Side', depth, height, params.materialId, t,
    [(width / 2) - t / 2, height / 2, 0],
    [0, Math.PI / 2, 0],
    { top: false, bottom: false, left: true, right: false }
  ));

  // Top
  components.push(makePanel('Top', width, depth, params.materialId, t,
    [0, height - t / 2, 0],
    [Math.PI / 2, 0, 0],
    { top: false, bottom: false, left: true, right: true }
  ));

  // Bottom
  components.push(makePanel('Bottom', width, depth, params.materialId, t,
    [0, t / 2, 0],
    [Math.PI / 2, 0, 0],
  ));

  // Back
  components.push(makePanel('Back', innerW, innerH, 'hardboard-3', 3,
    [0, height / 2, -(depth / 2) + 1.5],
    [0, 0, 0],
  ));

  // Drawer dividers and fronts
  const drawerH = innerH / drawerRows;
  const drawerInnerH = drawerH - t; // minus divider thickness
  const slideLength = depth - 50;

  for (let i = 0; i < drawerRows; i++) {
    const yBase = t + i * drawerH;

    // Divider (horizontal panel between drawers) - skip for bottom row (uses bottom panel)
    if (i > 0) {
      components.push(makePanel(`Divider ${i}`, innerW, depth - 3, params.materialId, t,
        [0, yBase, 1.5],
        [Math.PI / 2, 0, 0],
      ));
    }

    // Drawer front
    components.push(makePanel(`Drawer Front ${i + 1}`, innerW - 4, drawerInnerH - 4, params.materialId, t,
      [0, yBase + drawerH / 2, depth / 2 - t / 2],
      [0, 0, 0],
      { top: true, bottom: true, left: true, right: true }
    ));

    // Drawer slides (pair)
    components.push({
      id: uuid(),
      type: 'drawer-slide',
      name: `Slide Left R${i + 1}`,
      length: slideLength,
      slideType: 'soft-close',
      position: [-(innerW / 2) + 5, yBase + drawerH / 2, 0],
      rotation: [0, 0, 0],
    });
    components.push({
      id: uuid(),
      type: 'drawer-slide',
      name: `Slide Right R${i + 1}`,
      length: slideLength,
      slideType: 'soft-close',
      position: [(innerW / 2) - 5, yBase + drawerH / 2, 0],
      rotation: [0, 0, 0],
    });
  }

  return {
    id: uuid(),
    name: 'Dresser',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    components,
    locked: false,
  };
}

export function createDoorCabinet(params: DoorCabinetParams, materials: Material[]): FurniturePiece {
  const mat = materials.find(m => m.id === params.materialId);
  const t = mat?.thickness ?? 18;
  const { width, height, depth } = params;
  const innerW = width - 2 * t;
  const innerH = height - 2 * t;
  const doorCount = Math.max(1, Math.min(2, params.doors));
  const components: (Panel | Hinge)[] = [];

  // Left side
  components.push(makePanel('Left Side', depth, height, params.materialId, t,
    [-(width / 2) + t / 2, height / 2, 0],
    [0, Math.PI / 2, 0],
    { top: false, bottom: false, left: false, right: true }
  ));

  // Right side
  components.push(makePanel('Right Side', depth, height, params.materialId, t,
    [(width / 2) - t / 2, height / 2, 0],
    [0, Math.PI / 2, 0],
    { top: false, bottom: false, left: true, right: false }
  ));

  // Top
  components.push(makePanel('Top', innerW, depth, params.materialId, t,
    [0, height - t / 2, 0],
    [Math.PI / 2, 0, 0],
    { top: false, bottom: false, left: false, right: false }
  ));

  // Bottom
  components.push(makePanel('Bottom', innerW, depth, params.materialId, t,
    [0, t / 2, 0],
    [Math.PI / 2, 0, 0],
    { top: false, bottom: false, left: false, right: false }
  ));

  // Back panel (thinner material)
  components.push(makePanel('Back', innerW, innerH, 'hardboard-3', 3,
    [0, height / 2, -(depth / 2) + 1.5],
    [0, 0, 0],
  ));

  // Shelves
  if (params.shelves > 0) {
    const spacing = innerH / (params.shelves + 1);
    for (let i = 1; i <= params.shelves; i++) {
      components.push(makePanel(`Shelf ${i}`, innerW, depth - t, params.materialId, t,
        [0, t + spacing * i, t / 2],
        [Math.PI / 2, 0, 0],
        { top: false, bottom: false, left: false, right: true }
      ));
    }
  }

  // Doors & hinges
  const hingeInset = 100; // mm from top/bottom edge of door
  const hingeZ = depth / 2 - t;

  if (doorCount === 1) {
    // Single door covering the full opening
    components.push(makePanel('Door', innerW, innerH, params.materialId, t,
      [0, height / 2, depth / 2 - t / 2],
      [0, 0, 0],
      { top: true, bottom: true, left: true, right: true }
    ));

    // Hinges on the left side
    const hingeX = -(innerW / 2) + 17;
    components.push({
      id: uuid(),
      type: 'hinge',
      name: 'Top Hinge',
      hingeType: 'concealed',
      position: [hingeX, height - t - hingeInset, hingeZ],
      rotation: [0, 0, 0],
    });
    components.push({
      id: uuid(),
      type: 'hinge',
      name: 'Bottom Hinge',
      hingeType: 'concealed',
      position: [hingeX, t + hingeInset, hingeZ],
      rotation: [0, 0, 0],
    });
  } else {
    // Two doors, each covering half the opening
    const doorW = innerW / 2 - 1; // 1mm gap between doors

    // Left door
    components.push(makePanel('Left Door', doorW, innerH, params.materialId, t,
      [-(doorW / 2 + 1), height / 2, depth / 2 - t / 2],
      [0, 0, 0],
      { top: true, bottom: true, left: true, right: true }
    ));

    // Right door
    components.push(makePanel('Right Door', doorW, innerH, params.materialId, t,
      [(doorW / 2 + 1), height / 2, depth / 2 - t / 2],
      [0, 0, 0],
      { top: true, bottom: true, left: true, right: true }
    ));

    // Left door hinges (on the outer left)
    const leftHingeX = -(innerW / 2) + 17;
    components.push({
      id: uuid(),
      type: 'hinge',
      name: 'Left Top Hinge',
      hingeType: 'concealed',
      position: [leftHingeX, height - t - hingeInset, hingeZ],
      rotation: [0, 0, 0],
    });
    components.push({
      id: uuid(),
      type: 'hinge',
      name: 'Left Bottom Hinge',
      hingeType: 'concealed',
      position: [leftHingeX, t + hingeInset, hingeZ],
      rotation: [0, 0, 0],
    });

    // Right door hinges (on the outer right)
    const rightHingeX = (innerW / 2) - 17;
    components.push({
      id: uuid(),
      type: 'hinge',
      name: 'Right Top Hinge',
      hingeType: 'concealed',
      position: [rightHingeX, height - t - hingeInset, hingeZ],
      rotation: [0, 0, 0],
    });
    components.push({
      id: uuid(),
      type: 'hinge',
      name: 'Right Bottom Hinge',
      hingeType: 'concealed',
      position: [rightHingeX, t + hingeInset, hingeZ],
      rotation: [0, 0, 0],
    });
  }

  return {
    id: uuid(),
    name: 'Door Cabinet',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    components,
    locked: false,
  };
}

// --- Fixture Templates ---

export function createFixtureBox(params: FixtureBoxParams, color: string): FurniturePiece {
  const { width, height, depth } = params;
  const panel: Panel = {
    id: uuid(),
    type: 'panel',
    name: 'Fixture Body',
    width,
    height,
    depth,
    materialId: '',
    position: [0, height / 2, 0],
    rotation: [0, 0, 0],
    edgeBanding: { top: false, bottom: false, left: false, right: false },
  };

  return {
    id: uuid(),
    name: 'Fixture',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    components: [panel],
    locked: false,
    isFixture: true,
    fixtureColor: color,
  };
}

export function createFixtureCylinder(params: FixtureCylinderParams, color: string): FurniturePiece {
  const { diameter, height } = params;
  const leg: Leg = {
    id: uuid(),
    type: 'leg',
    name: 'Fixture Body',
    diameter,
    height,
    style: 'round',
    position: [0, height / 2, 0],
    rotation: [0, 0, 0],
  };

  return {
    id: uuid(),
    name: 'Fixture',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    components: [leg],
    locked: false,
    isFixture: true,
    fixtureColor: color,
  };
}
