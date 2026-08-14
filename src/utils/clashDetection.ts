import * as THREE from 'three';
import type { Vec3, FurniturePiece } from '../types';

/** Component types that contribute to a piece's bounding volume.
 * Kept in sync with `getPieceLocalBounds` in alignment.ts. */
export function componentHalfExtents(comp: FurniturePiece['components'][number]): [number, number, number] {
  switch (comp.type) {
    case 'panel':
      return [comp.width! / 2, comp.height! / 2, comp.depth! / 2];
    case 'leg': {
      const r = (comp.diameter ?? 40) / 2;
      return [r, (comp.height ?? 0) / 2, r];
    }
    case 'handle': {
      const r = (comp.diameter ?? 25) / 2;
      return [r, r, r];
    }
    case 'hinge':
    case 'shelf-pin':
    case 'drawer-slide':
      return [5, 5, 5];
    default:
      return [0, 0, 0];
  }
}

/** Local-space 8 corners of a component's (unrotated) box. */
function componentLocalCorners(hx: number, hy: number, hz: number): [number, number, number][] {
  return [
    [-hx, -hy, -hz], [ hx, -hy, -hz],
    [-hx,  hy, -hz], [ hx,  hy, -hz],
    [-hx, -hy,  hz], [ hx, -hy,  hz],
    [-hx,  hy,  hz], [ hx,  hy,  hz],
  ];
}

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
 * Compute the world-space AABB of a single component, accounting for:
 * - The component's own rotation (Euler angles in the piece's local frame)
 * - The piece's rotation (applied around the piece origin)
 * - The given piece position (world-space offset)
 *
 * Transforms all 8 corners of the component's bounding box through the
 * full hierarchy: component-local → comp-rotate → comp-translate →
 * piece-rotate → piece-translate, then takes the axis-aligned bounds.
 *
 * Pass `piecePosition = [0, 0, 0]` to get the component's AABB in the
 * piece's *local* (already piece-rotated) frame — useful for snap face
 * offsets that only get the piece translation added later.
 */
export function computeComponentAABB(
  comp: FurniturePiece['components'][number],
  pieceRotation: Vec3,
  piecePosition: Vec3,
): AABB {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  const pieceRot = new THREE.Euler(pieceRotation[0], pieceRotation[1], pieceRotation[2]);
  const compRot = new THREE.Euler(comp.rotation[0], comp.rotation[1], comp.rotation[2]);
  const compPos = comp.position;

  const [hx, hy, hz] = componentHalfExtents(comp);
  const corners = componentLocalCorners(hx, hy, hz);

  for (const [lx, ly, lz] of corners) {
    const corner = new THREE.Vector3(lx, ly, lz).applyEuler(compRot);
    corner.x += compPos[0];
    corner.y += compPos[1];
    corner.z += compPos[2];
    corner.applyEuler(pieceRot);
    corner.x += piecePosition[0];
    corner.y += piecePosition[1];
    corner.z += piecePosition[2];

    if (corner.x < minX) minX = corner.x;
    if (corner.x > maxX) maxX = corner.x;
    if (corner.y < minY) minY = corner.y;
    if (corner.y > maxY) maxY = corner.y;
    if (corner.z < minZ) minZ = corner.z;
    if (corner.z > maxZ) maxZ = corner.z;
  }

  return { minX, minY, minZ, maxX, maxY, maxZ };
}

/**
 * Compute the world-space AABB of a piece. See `computeComponentAABB`
 * for the transform hierarchy; this aggregates over every component.
 */
export function computePieceAABB(piece: FurniturePiece): AABB {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (const comp of piece.components) {
    const aabb = computeComponentAABB(comp, piece.rotation, piece.position);
    if (aabb.minX < minX) minX = aabb.minX;
    if (aabb.maxX > maxX) maxX = aabb.maxX;
    if (aabb.minY < minY) minY = aabb.minY;
    if (aabb.maxY > maxY) maxY = aabb.maxY;
    if (aabb.minZ < minZ) minZ = aabb.minZ;
    if (aabb.maxZ > maxZ) maxZ = aabb.maxZ;
  }

  return { minX, minY, minZ, maxX, maxY, maxZ };
}

/**
 * Check whether two AABBs actually interpenetrate.
 * Touching surfaces (exact boundary contact) are NOT considered clashes —
 * furniture placed flush against each other is expected and valid.
 */
export function aabbOverlap(a: AABB, b: AABB): boolean {
  return (
    a.minX < b.maxX &&
    a.maxX > b.minX &&
    a.minY < b.maxY &&
    a.maxY > b.minY &&
    a.minZ < b.maxZ &&
    a.maxZ > b.minZ
  );
}

/**
 * Compute all clash pairs among a list of pieces.
 * Returns an array of ClashPair objects.
 */
export function findClashes(pieces: FurniturePiece[]): ClashPair[] {
  // Only check furniture-vs-furniture; fixtures are excluded from this pass
  // (fixture proximity is a separate concern — see PLAN.md).
  const furniture = pieces.filter(p => !p.isFixture);
  const aabbs = furniture.map(p => ({ piece: p, aabb: computePieceAABB(p) }));
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
