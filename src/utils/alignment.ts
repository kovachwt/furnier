// Alignment / distribution helpers for multi-piece operations.
//
// All bounds are computed in world coordinates (mm) and account for
// component rotation via getAABBHalfExtents. Non-panel components
// (legs, hardware) are treated as small ~10 mm extents centered on
// their position — they're decoration, not the bounding volume of
// the piece in practice.

import type { Vec3, FurniturePiece, Room } from '../types';
import { getAABBHalfExtents } from './snap';

export interface AABB {
  min: Vec3;
  max: Vec3;
  center: Vec3;
  size: Vec3;
}

const EMPTY_AABB: AABB = {
  min: [0, 0, 0],
  max: [0, 0, 0],
  center: [0, 0, 0],
  size: [0, 0, 0],
};

function extendBounds(
  b: AABB,
  position: Vec3,
  halfExtents: [number, number, number],
): AABB {
  const [ex, ey, ez] = halfExtents;
  const min: Vec3 = [
    Math.min(b.min[0], position[0] - ex),
    Math.min(b.min[1], position[1] - ey),
    Math.min(b.min[2], position[2] - ez),
  ];
  const max: Vec3 = [
    Math.max(b.max[0], position[0] + ex),
    Math.max(b.max[1], position[1] + ey),
    Math.max(b.max[2], position[2] + ez),
  ];
  return {
    min,
    max,
    center: [
      (min[0] + max[0]) / 2,
      (min[1] + max[1]) / 2,
      (min[2] + max[2]) / 2,
    ],
    size: [max[0] - min[0], max[1] - min[1], max[2] - min[2]],
  };
}

const INFINITE: AABB = {
  min: [Infinity, Infinity, Infinity],
  max: [-Infinity, -Infinity, -Infinity],
  center: [0, 0, 0],
  size: [0, 0, 0],
};

/** AABB in piece-local coordinates (mm), origin at piece position. */
export function getPieceLocalBounds(piece: FurniturePiece): AABB {
  if (piece.components.length === 0) return { ...EMPTY_AABB };

  let bounds = INFINITE;
  for (const comp of piece.components) {
    if (comp.type === 'panel') {
      const extents = getAABBHalfExtents(comp.width, comp.height, comp.depth, comp.rotation);
      bounds = extendBounds(bounds, comp.position, extents);
    } else if (comp.type === 'leg') {
      // Leg is a vertical cylinder — half-height along Y, radius in XZ
      const r = comp.diameter / 2;
      bounds = extendBounds(bounds, comp.position, [r, comp.height / 2, r]);
    } else {
      // Hardware: 10mm isotropic extent centered on position
      const e = 5;
      bounds = extendBounds(bounds, comp.position, [e, e, e]);
    }
  }
  return bounds;
}

/** AABB in world coordinates (mm). */
export function getPieceWorldBounds(piece: FurniturePiece): AABB {
  const local = getPieceLocalBounds(piece);
  const px = piece.position[0];
  const py = piece.position[1];
  const pz = piece.position[2];
  return {
    min: [local.min[0] + px, local.min[1] + py, local.min[2] + pz],
    max: [local.max[0] + px, local.max[1] + py, local.max[2] + pz],
    center: [local.center[0] + px, local.center[1] + py, local.center[2] + pz],
    size: local.size,
  };
}

/** Combined AABB of multiple pieces in world coordinates. */
export function getPiecesWorldBounds(pieces: FurniturePiece[]): AABB {
  if (pieces.length === 0) return { ...EMPTY_AABB };
  let bounds = INFINITE;
  for (const piece of pieces) {
    const b = getPieceWorldBounds(piece);
    // extendBounds takes the *center* of the new box and its half
    // extents. We pass the AABB center and half the AABB size.
    const center: Vec3 = [
      (b.min[0] + b.max[0]) / 2,
      (b.min[1] + b.max[1]) / 2,
      (b.min[2] + b.max[2]) / 2,
    ];
    const halfExtents: [number, number, number] = [
      (b.max[0] - b.min[0]) / 2,
      (b.max[1] - b.min[1]) / 2,
      (b.max[2] - b.min[2]) / 2,
    ];
    bounds = extendBounds(bounds, center, halfExtents);
  }
  return bounds;
}

export type WallName = 'left' | 'right' | 'front' | 'back' | 'floor' | 'ceiling';

export interface WallAxis {
  axis: 'x' | 'y' | 'z';
  value: number;
  label: string;
}

/** Map a wall name to the world coordinate of its inner surface. */
export function getWallPlane(room: Room, wall: WallName): WallAxis {
  const hw = room.width / 2;
  const hd = room.depth / 2;
  switch (wall) {
    case 'left':   return { axis: 'x', value: -hw, label: 'Left wall' };
    case 'right':  return { axis: 'x', value:  hw, label: 'Right wall' };
    case 'back':   return { axis: 'z', value: -hd, label: 'Back wall' };
    case 'front':  return { axis: 'z', value:  hd, label: 'Front wall' };
    case 'floor':  return { axis: 'y', value:   0, label: 'Floor' };
    case 'ceiling':return { axis: 'y', value: room.height, label: 'Ceiling' };
  }
}

export type AxisName = 'x' | 'y' | 'z';
export type AlignMode = 'min' | 'center' | 'max';

/**
 * Compute a Vec3 delta to apply to a piece's position so that its
 * AABB aligns along the given axis to the given target value.
 *
 * Example: align right edges of all selected pieces → mode='max',
 * axis='x', target=combined.max[0] → each piece's right edge is moved
 * to the combined right edge.
 */
export function alignmentDelta(
  pieceBounds: AABB,
  axis: AxisName,
  mode: AlignMode,
  target: number,
): number {
  const axisIdx = axisIndex(axis);
  let current: number;
  switch (mode) {
    case 'min':    current = pieceBounds.min[axisIdx]; break;
    case 'center': current = pieceBounds.center[axisIdx]; break;
    case 'max':    current = pieceBounds.max[axisIdx]; break;
  }
  return target - current;
}

export function axisIndex(axis: AxisName): 0 | 1 | 2 {
  return axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
}

/** Compute new positions for `pieces` such that their `axis` edges align to `target`. */
export function computeAlignedPositions(
  pieces: FurniturePiece[],
  axis: AxisName,
  mode: AlignMode,
  target: number,
): Record<string, Vec3> {
  const result: Record<string, Vec3> = {};
  for (const piece of pieces) {
    const bounds = getPieceWorldBounds(piece);
    const delta = alignmentDelta(bounds, axis, mode, target);
    if (delta === 0) {
      result[piece.id] = [...piece.position] as Vec3;
      continue;
    }
    const idx = axisIndex(axis);
    const newPos: Vec3 = [...piece.position] as Vec3;
    newPos[idx] = piece.position[idx] + delta;
    // Don't let pieces sink below the floor
    if (axis === 'y' && newPos[1] < 0) newPos[1] = 0;
    result[piece.id] = newPos;
  }
  return result;
}

/**
 * Compute new positions for `pieces` such that they're evenly
 * distributed along `axis` between the first and last piece's
 * `mode` (min/center/max) edge.
 *
 * Requires at least 3 pieces. For 2 pieces, no-op (already endpoints).
 */
export function computeDistributedPositions(
  pieces: FurniturePiece[],
  axis: AxisName,
  mode: AlignMode = 'center',
): Record<string, Vec3> {
  if (pieces.length < 3) return {};

  const idx = axisIndex(axis);
  const withBounds = pieces.map((p) => {
    const b = getPieceWorldBounds(p);
    let anchor: number;
    switch (mode) {
      case 'min':    anchor = b.min[idx]; break;
      case 'center': anchor = b.center[idx]; break;
      case 'max':    anchor = b.max[idx]; break;
    }
    return { piece: p, anchor };
  });

  // Sort by anchor along the axis
  withBounds.sort((a, b) => a.anchor - b.anchor);

  const first = withBounds[0].anchor;
  const last = withBounds[withBounds.length - 1].anchor;
  const step = (last - first) / (withBounds.length - 1);

  const result: Record<string, Vec3> = {};
  for (let i = 0; i < withBounds.length; i++) {
    const { piece } = withBounds[i];
    const targetAnchor = first + step * i;
    const bounds = getPieceWorldBounds(piece);
    let current: number;
    switch (mode) {
      case 'min':    current = bounds.min[idx]; break;
      case 'center': current = bounds.center[idx]; break;
      case 'max':    current = bounds.max[idx]; break;
    }
    const delta = targetAnchor - current;
    const newPos: Vec3 = [...piece.position] as Vec3;
    newPos[idx] = piece.position[idx] + delta;
    result[piece.id] = newPos;
  }
  return result;
}
