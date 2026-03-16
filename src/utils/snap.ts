import type { Vec3, FurniturePiece, Room } from '../types';

interface SnapTarget {
  axis: 'x' | 'y' | 'z';
  value: number;
  label: string;
}

/**
 * Collect all snap targets from room walls, floor/ceiling, and existing panel faces.
 */
export function collectSnapTargets(
  room: Room,
  pieces: FurniturePiece[],
  excludePieceId?: string,
  excludeComponentId?: string
): SnapTarget[] {
  const targets: SnapTarget[] = [];

  // Room boundaries (room centered at origin on X/Z, floor at Y=0)
  const hw = room.width / 2;
  const hd = room.depth / 2;

  targets.push({ axis: 'x', value: -hw, label: 'Left wall' });
  targets.push({ axis: 'x', value: hw, label: 'Right wall' });
  targets.push({ axis: 'z', value: -hd, label: 'Back wall' });
  targets.push({ axis: 'z', value: hd, label: 'Front wall' });
  targets.push({ axis: 'y', value: 0, label: 'Floor' });
  targets.push({ axis: 'y', value: room.height, label: 'Ceiling' });

  // Panel faces from all pieces
  for (const piece of pieces) {
    if (piece.id === excludePieceId) continue;
    for (const comp of piece.components) {
      if (comp.id === excludeComponentId) continue;
      if (comp.type === 'panel') {
        const panel = comp;
        // World position = piece position + component position
        const wx = piece.position[0] + panel.position[0];
        const wy = piece.position[1] + panel.position[1];
        const wz = piece.position[2] + panel.position[2];

        // Panel extends: width along X, height along Y, depth along Z (before rotation)
        // Simplified: assume axis-aligned panels (no rotation for now)
        const hw2 = panel.width / 2;
        const hh = panel.height / 2;
        const hd2 = panel.depth / 2;

        targets.push({ axis: 'x', value: wx - hw2, label: `${panel.name} left` });
        targets.push({ axis: 'x', value: wx + hw2, label: `${panel.name} right` });
        targets.push({ axis: 'y', value: wy - hh, label: `${panel.name} bottom` });
        targets.push({ axis: 'y', value: wy + hh, label: `${panel.name} top` });
        targets.push({ axis: 'z', value: wz - hd2, label: `${panel.name} back` });
        targets.push({ axis: 'z', value: wz + hd2, label: `${panel.name} front` });
      }
    }
  }

  return targets;
}

/**
 * Snap a position to the nearest targets within threshold.
 * Returns the snapped position and which axes snapped.
 */
export function snapPosition(
  pos: Vec3,
  targets: SnapTarget[],
  threshold: number
): { snapped: Vec3; snappedAxes: { x?: string; y?: string; z?: string } } {
  const result: Vec3 = [...pos];
  const snappedAxes: { x?: string; y?: string; z?: string } = {};

  let bestX = threshold + 1;
  let bestY = threshold + 1;
  let bestZ = threshold + 1;

  for (const t of targets) {
    const diff = Math.abs(pos[t.axis === 'x' ? 0 : t.axis === 'y' ? 1 : 2] - t.value);
    if (t.axis === 'x' && diff < bestX && diff <= threshold) {
      bestX = diff;
      result[0] = t.value;
      snappedAxes.x = t.label;
    } else if (t.axis === 'y' && diff < bestY && diff <= threshold) {
      bestY = diff;
      result[1] = t.value;
      snappedAxes.y = t.label;
    } else if (t.axis === 'z' && diff < bestZ && diff <= threshold) {
      bestZ = diff;
      result[2] = t.value;
      snappedAxes.z = t.label;
    }
  }

  return { snapped: result, snappedAxes };
}

/**
 * Snap to grid
 */
export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

export function snapPositionToGrid(pos: Vec3, gridSize: number): Vec3 {
  return [
    snapToGrid(pos[0], gridSize),
    snapToGrid(pos[1], gridSize),
    snapToGrid(pos[2], gridSize),
  ];
}
