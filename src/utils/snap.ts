import type { Vec3, FurniturePiece, Room } from '../types';
import { computeComponentAABB } from './clashDetection';

type Component = FurniturePiece['components'][number];

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
 * Compute a panel's axis-aligned face values (min/max per axis) in the
 * given reference frame: the panel box is transformed through its own
 * rotation, translated by its component position, transformed by the
 * piece rotation, then translated by `piecePosition`. This is the same
 * corner-transform `computePieceAABB` uses, so snap targets stay
 * consistent with clash / alignment / distance AABBs for rotated
 * pieces.
 */
function panelFaceValues(
  panel: Component,
  pieceRotation: Vec3,
  piecePosition: Vec3,
): { min: Vec3; max: Vec3 } {
  const aabb = computeComponentAABB(panel, pieceRotation, piecePosition);
  return { min: [aabb.minX, aabb.minY, aabb.minZ], max: [aabb.maxX, aabb.maxY, aabb.maxZ] };
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

  // Panel faces from all pieces — rotation-aware (component AND piece rotation)
  for (const piece of pieces) {
    if (piece.id === excludePieceId) continue;
    for (const comp of piece.components) {
      if (comp.id === excludeComponentId) continue;
      if (comp.type === 'panel') {
        const panel = comp;
        const { min, max } = panelFaceValues(panel, piece.rotation, piece.position);

        targets.push({ axis: 'x', value: min[0], label: `${panel.name} left` });
        targets.push({ axis: 'x', value: max[0], label: `${panel.name} right` });
        targets.push({ axis: 'y', value: min[1], label: `${panel.name} bottom` });
        targets.push({ axis: 'y', value: max[1], label: `${panel.name} top` });
        targets.push({ axis: 'z', value: min[2], label: `${panel.name} back` });
        targets.push({ axis: 'z', value: max[2], label: `${panel.name} front` });
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

  // Collect the dragged piece's own panel face offsets (relative to piece
  // origin) in the piece-rotated local frame. Because dragging only ever
  // translates the piece (the gizmo rotation rings are disabled — see
  // FurniturePieceMesh), piece.rotation is constant during a drag, so
  // these offsets are constant and `proposedPos + offset` correctly gives
  // the world face value. computeComponentAABB with piecePosition = origin
  // yields exactly that piece-local offset.
  interface FaceOffset { axis: 'x' | 'y' | 'z'; offset: number; label: string }
  const pieceFaces: FaceOffset[] = [];

  for (const comp of piece.components) {
    if (comp.type !== 'panel') continue;
    const { min, max } = panelFaceValues(comp, piece.rotation, [0, 0, 0]);

    pieceFaces.push({ axis: 'x', offset: min[0], label: `${comp.name} left` });
    pieceFaces.push({ axis: 'x', offset: max[0], label: `${comp.name} right` });
    pieceFaces.push({ axis: 'y', offset: min[1], label: `${comp.name} bottom` });
    pieceFaces.push({ axis: 'y', offset: max[1], label: `${comp.name} top` });
    pieceFaces.push({ axis: 'z', offset: min[2], label: `${comp.name} back` });
    pieceFaces.push({ axis: 'z', offset: max[2], label: `${comp.name} front` });
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
