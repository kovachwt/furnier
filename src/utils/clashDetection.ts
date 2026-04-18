import type { FurniturePiece, Vec3 } from '../types';

/** Axis-aligned bounding box in mm (world space). */
export interface AABB {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

/** A pair of piece IDs that are in clash. */
export interface ClashPair {
  pieceA: string;
  pieceB: string;
}

/**
 * Compute the AABB of a single component in the piece's local (unrotated) space.
 * Returns [minX, maxX, minY, maxY, minZ, maxZ].
 */
function componentAABBLocal(comp: {
  type: string;
  position: Vec3;
  width?: number;
  height?: number;
  depth?: number;
  diameter?: number;
}): [number, number, number, number, number, number] {
  const [px, py, pz] = comp.position;

  switch (comp.type) {
    case 'panel': {
      const w = comp.width!;
      const h = comp.height!;
      const d = comp.depth!;
      return [px - w / 2, px + w / 2, py - h / 2, py + h / 2, pz - d / 2, pz + d / 2];
    }
    case 'leg': {
      const r = (comp.diameter ?? 40) / 2;
      const h = comp.height ?? 0;
      return [px - r, px + r, py - h / 2, py + h / 2, pz - r, pz + r];
    }
    case 'handle': {
      const r = (comp.diameter ?? 25) / 2;
      return [px - r, px + r, py - r, py + r, pz - r, pz + r];
    }
    case 'hinge':
    case 'shelf-pin':
    case 'drawer-slide': {
      // Treat as small box
      return [px - 5, px + 5, py - 5, py + 5, pz - 5, pz + 5];
    }
    default:
      return [px, px, py, py, pz, pz];
  }
}

/**
 * Compute the world-space AABB of a piece, accounting for its position
 * and Y-axis rotation. Components are merged into one bounding box.
 */
export function computePieceAABB(piece: FurniturePiece): AABB {
  const [, ry] = piece.rotation;
  const cosA = Math.cos(ry);
  const sinA = Math.sin(ry);

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (const comp of piece.components) {
    const [lminX, lmaxX, lminY, lmaxY, lminZ, lmaxZ] = componentAABBLocal(comp);

    // Four corners in the XZ plane (top and bottom share same XZ bounds)
    const corners: [number, number][] = [
      [lminX, lminZ],
      [lmaxX, lminZ],
      [lminX, lmaxZ],
      [lmaxX, lmaxZ],
    ];

    for (const [lx, lz] of corners) {
      // Apply Y-rotation around the piece's origin, then translate
      const wx = piece.position[0] + lx * cosA - lz * sinA;
      const wz = piece.position[2] + lx * sinA + lz * cosA;

      if (wx < minX) minX = wx;
      if (wx > maxX) maxX = wx;
      if (wz < minZ) minZ = wz;
      if (wz > maxZ) maxZ = wz;
    }

    // Y bounds are unaffected by Y-rotation
    if (lminY < minY) minY = lminY;
    if (lmaxY > maxY) maxY = lmaxY;
  }

  return { minX, minY, minZ, maxX, maxY, maxZ };
}

/**
 * Check whether two AABBs overlap (including touching = overlap).
 */
export function aabbOverlap(a: AABB, b: AABB): boolean {
  return (
    a.minX <= b.maxX &&
    a.maxX >= b.minX &&
    a.minY <= b.maxY &&
    a.maxY >= b.minY &&
    a.minZ <= b.maxZ &&
    a.maxZ >= b.minZ
  );
}

/**
 * Compute all clash pairs among a list of pieces.
 * Returns an array of ClashPair objects.
 */
export function findClashes(pieces: FurniturePiece[]): ClashPair[] {
  const aabbs = pieces.map(p => ({ piece: p, aabb: computePieceAABB(p) }));
  const clashes: ClashPair[] = [];

  for (let i = 0; i < aabbs.length; i++) {
    for (let j = i + 1; j < aabbs.length; j++) {
      if (aabbOverlap(aabbs[i].aabb, aabbs[j].aabb)) {
        clashes.push({ pieceA: aabbs[i].piece.id, pieceB: aabbs[j].piece.id });
      }
    }
  }

  return clashes;
}
