import type { FurniturePiece } from '../types';
import { getPieceLocalBounds } from './alignment';

/**
 * Whether a piece should be checked for floor-gap warnings.
 * Only pieces that have legs are expected to stand on the floor;
 * legless pieces like cabinets and bookshelves may be wall-mounted,
 * so floating is intentional and should not trigger a warning.
 */
export function needsFloorCheck(piece: FurniturePiece): boolean {
  if (piece.isFixture) return false;
  return piece.components.some((c) => c.type === 'leg');
}

/**
 * Get the floor gap for a piece (how far above the floor it sits).
 * Returns null if the piece doesn't need a floor check
 * (fixtures or legless pieces that may be wall-mounted).
 */
export function getFloorGap(piece: FurniturePiece): number | null {
  if (!needsFloorCheck(piece)) return null;

  // Bottom of the piece in world space. Use the real AABB min Y, not
  // piece.position.y — after a gizmo resize, piece.position.y is no
  // longer the bottom of the piece, so the old assumption would report
  // a stale floor gap.
  const localMinY = getPieceLocalBounds(piece).min[1];
  const bottomY = piece.position[1] + localMinY;
  const gap = bottomY; // floor is at Y=0

  // Threshold: consider it floating if position Y > 5mm
  // (pieces standing on the floor have position[1] ≈ 0)
  return gap > 5 ? Math.round(gap) : null;
}

/**
 * Check if a piece is floating above the floor.
 */
export function isPieceFloating(piece: FurniturePiece): boolean {
  return getFloorGap(piece) !== null;
}
