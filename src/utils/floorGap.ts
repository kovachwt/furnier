import type { FurniturePiece } from '../types';

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

  const gap = piece.position[1]; // floor is at Y=0

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
