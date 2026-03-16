import type { Vec3, FurniturePiece, Room } from '../types';

export interface SnapTarget {
  axis: 'x' | 'y' | 'z';
  value: number;
  label: string;
}

export interface SnapLine {
  axis: 'x' | 'y' | 'z';
  value: number;
  label: string;
}

/**
 * Compute axis-aligned bounding box half-extents after rotation.
 * Uses XYZ Euler order (Three.js default): R = Rz * Ry * Rx
 */
function getAABBHalfExtents(w: number, h: number, d: number, rotation: Vec3): [number, number, number] {
  const [rx, ry, rz] = rotation;
  const cx = Math.cos(rx), sx = Math.sin(rx);
  const cy = Math.cos(ry), sy = Math.sin(ry);
  const cz = Math.cos(rz), sz = Math.sin(rz);

  const hw = w / 2, hh = h / 2, hd = d / 2;

  // R = Rz * Ry * Rx — half-extent along each world axis is sum of abs contributions
  const ex = Math.abs(cy * cz) * hw + Math.abs(sx * sy * cz - cx * sz) * hh + Math.abs(cx * sy * cz + sx * sz) * hd;
  const ey = Math.abs(cy * sz) * hw + Math.abs(sx * sy * sz + cx * cz) * hh + Math.abs(cx * sy * sz - sx * cz) * hd;
  const ez = Math.abs(sy) * hw + Math.abs(sx * cy) * hh + Math.abs(cx * cy) * hd;

  return [ex, ey, ez];
}

/**
 * Collect all snap targets from room walls, floor/ceiling, and existing panel faces.
 * Now rotation-aware for panel face positions.
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

  // Panel faces from all pieces — rotation-aware
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

        // Rotation-aware half-extents
        const [ex, ey, ez] = getAABBHalfExtents(panel.width, panel.height, panel.depth, panel.rotation);

        targets.push({ axis: 'x', value: wx - ex, label: `${panel.name} left` });
        targets.push({ axis: 'x', value: wx + ex, label: `${panel.name} right` });
        targets.push({ axis: 'y', value: wy - ey, label: `${panel.name} bottom` });
        targets.push({ axis: 'y', value: wy + ey, label: `${panel.name} top` });
        targets.push({ axis: 'z', value: wz - ez, label: `${panel.name} back` });
        targets.push({ axis: 'z', value: wz + ez, label: `${panel.name} front` });
      }
    }
  }

  return targets;
}

/**
 * Snap a piece's panel faces to target faces.
 * For each panel in the piece, computes its face positions at the proposed position,
 * then checks if any face is near a snap target.
 */
export function snapPieceToFaces(
  proposedPos: Vec3,
  piece: FurniturePiece,
  targets: SnapTarget[],
  threshold: number
): { snapped: Vec3; snappedAxes: { x?: string; y?: string; z?: string }; snapLines: SnapLine[] } {
  const result: Vec3 = [...proposedPos];
  const snappedAxes: { x?: string; y?: string; z?: string } = {};

  let snapLineX: SnapLine | null = null;
  let snapLineY: SnapLine | null = null;
  let snapLineZ: SnapLine | null = null;

  // Collect the piece's own panel face offsets (relative to piece origin)
  interface FaceOffset { axis: 'x' | 'y' | 'z'; offset: number; label: string }
  const pieceFaces: FaceOffset[] = [];

  for (const comp of piece.components) {
    if (comp.type !== 'panel') continue;
    const [ex, ey, ez] = getAABBHalfExtents(comp.width, comp.height, comp.depth, comp.rotation);

    pieceFaces.push({ axis: 'x', offset: comp.position[0] - ex, label: `${comp.name} left` });
    pieceFaces.push({ axis: 'x', offset: comp.position[0] + ex, label: `${comp.name} right` });
    pieceFaces.push({ axis: 'y', offset: comp.position[1] - ey, label: `${comp.name} bottom` });
    pieceFaces.push({ axis: 'y', offset: comp.position[1] + ey, label: `${comp.name} top` });
    pieceFaces.push({ axis: 'z', offset: comp.position[2] - ez, label: `${comp.name} back` });
    pieceFaces.push({ axis: 'z', offset: comp.position[2] + ez, label: `${comp.name} front` });
  }

  let bestX = threshold + 1;
  let bestY = threshold + 1;
  let bestZ = threshold + 1;

  for (const pf of pieceFaces) {
    for (const t of targets) {
      if (pf.axis !== t.axis) continue;

      const axisIdx = pf.axis === 'x' ? 0 : pf.axis === 'y' ? 1 : 2;
      const faceWorld = proposedPos[axisIdx] + pf.offset;
      const diff = Math.abs(faceWorld - t.value);

      if (pf.axis === 'x' && diff < bestX && diff <= threshold) {
        bestX = diff;
        result[0] = proposedPos[0] + (t.value - faceWorld);
        snappedAxes.x = `${pf.label} → ${t.label}`;
        snapLineX = { axis: 'x', value: t.value, label: t.label };
      } else if (pf.axis === 'y' && diff < bestY && diff <= threshold) {
        bestY = diff;
        result[1] = proposedPos[1] + (t.value - faceWorld);
        snappedAxes.y = `${pf.label} → ${t.label}`;
        snapLineY = { axis: 'y', value: t.value, label: t.label };
      } else if (pf.axis === 'z' && diff < bestZ && diff <= threshold) {
        bestZ = diff;
        result[2] = proposedPos[2] + (t.value - faceWorld);
        snappedAxes.z = `${pf.label} → ${t.label}`;
        snapLineZ = { axis: 'z', value: t.value, label: t.label };
      }
    }
  }

  const snapLines: SnapLine[] = [];
  if (snapLineX) snapLines.push(snapLineX);
  if (snapLineY) snapLines.push(snapLineY);
  if (snapLineZ) snapLines.push(snapLineZ);

  return { snapped: result, snappedAxes, snapLines };
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
