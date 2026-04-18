import type { FurniturePiece } from '../types';

/**
 * Get the floor gap for a piece (how far above the floor it sits).
 * Uses the piece's Y position as a heuristic — if the piece position
 * is significantly above Y=0, it's likely floating unintentionally.
 * Returns null if the piece is on the floor or is a fixture.
 */
export function getFloorGap(piece: FurniturePiece): number | null {
  if (piece.isFixture) return null;

  const gap = piece.position[1]; // floor is at Y=0

  // Threshold: consider it floating if position Y > 5mm
  // (normal pieces have their bottom at Y=0, so position[1] ≈ 0)
  return gap > 5 ? Math.round(gap) : null;
}

/**
 * Check if a piece is floating above the floor.
 */
export function isPieceFloating(piece: FurniturePiece): boolean {
  return getFloorGap(piece) !== null;
}
