import * as THREE from 'three';
import type { FurniturePiece } from '../types';

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

/** Half-extents of a component in its own local (unrotated) space. */
function componentHalfExtents(comp: FurniturePiece['components'][number]): [number, number, number] {
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

/**
 * Compute the world-space AABB of a piece, accounting for:
 * - Each component's own rotation (Euler angles in the piece's local frame)
 * - The piece's rotation (applied around the piece origin)
 * - The piece's position (world-space offset)
 *
 * Transforms all 8 corners of each component's bounding box through the
 * full hierarchy: component-local → piece-local → world.
 */
export function computePieceAABB(piece: FurniturePiece): AABB {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  // Pre-build piece rotation (applied after component transforms)
  const pieceRot = new THREE.Euler(piece.rotation[0], piece.rotation[1], piece.rotation[2]);
  const piecePos = piece.position;

  for (const comp of piece.components) {
    const [hx, hy, hz] = componentHalfExtents(comp);

    // Component rotation (Euler, default XYZ order — matches THREE.Object3D)
    const compRot = new THREE.Euler(comp.rotation[0], comp.rotation[1], comp.rotation[2]);
    const compPos = comp.position;

    // Transform all 8 corners through: local → comp-rotate → comp-translate → piece-rotate → piece-translate
    const corners: [number, number, number][] = [
      [-hx, -hy, -hz], [ hx, -hy, -hz],
      [-hx,  hy, -hz], [ hx,  hy, -hz],
      [-hx, -hy,  hz], [ hx, -hy,  hz],
      [-hx,  hy,  hz], [ hx,  hy,  hz],
    ];

    for (const [lx, ly, lz] of corners) {
      // Apply component rotation
      const corner = new THREE.Vector3(lx, ly, lz).applyEuler(compRot);
      // Translate to component position (in piece's local space)
      corner.x += compPos[0];
      corner.y += compPos[1];
      corner.z += compPos[2];
      // Apply piece rotation
      corner.applyEuler(pieceRot);
      // Translate to piece position (world space)
      corner.x += piecePos[0];
      corner.y += piecePos[1];
      corner.z += piecePos[2];

      if (corner.x < minX) minX = corner.x;
      if (corner.x > maxX) maxX = corner.x;
      if (corner.y < minY) minY = corner.y;
      if (corner.y > maxY) maxY = corner.y;
      if (corner.z < minZ) minZ = corner.z;
      if (corner.z > maxZ) maxZ = corner.z;
    }
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
