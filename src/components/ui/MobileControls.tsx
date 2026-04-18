import { useStore } from '../../store/useStore';
import { useIsMobile } from '../../hooks/useIsMobile';

/**
 * Mobile-friendly on-screen controls for:
 *  - Nudging the selected piece in X / Y / Z
 *  - Rotating the piece 90°
 *  - Deselecting
 *
 * Only rendered on touch/mobile viewports so the 3D gizmo
 * (PivotControls) remains the primary tool on desktop.
 */
export function MobileControls() {
  const isMobile = useIsMobile();
  const selectedPieceId = useStore((s) => s.selectedPieceId);
  const gridSize = useStore((s) => s.gridSize);
  const nudgeSelectedPiece = useStore((s) => s.nudgeSelectedPiece);
  const rotateSelectedPiece = useStore((s) => s.rotateSelectedPiece);
  const clearSelection = useStore((s) => s.clearSelection);
  const removePiece = useStore((s) => s.removePiece);

  if (!isMobile || !selectedPieceId) return null;

  const step = gridSize;

  return (
    <div className="mobile-controls">
      {/* Nudge pad */}
      <div className="mobile-nudge-pad">
        <div className="nudge-row">
          <button className="nudge-btn" title="Up (+Y)" onClick={() => nudgeSelectedPiece(0, step, 0)}>↑</button>
        </div>
        <div className="nudge-row">
          <button className="nudge-btn" title="Left (-X)" onClick={() => nudgeSelectedPiece(-step, 0, 0)}>←</button>
          <button className="nudge-btn nudge-center" title="Deselect" onClick={clearSelection}>✕</button>
          <button className="nudge-btn" title="Right (+X)" onClick={() => nudgeSelectedPiece(step, 0, 0)}>→</button>
        </div>
        <div className="nudge-row">
          <button className="nudge-btn" title="Down (-Y)" onClick={() => nudgeSelectedPiece(0, -step, 0)}>↓</button>
        </div>
        <div className="nudge-row nudge-row-depth">
          <button className="nudge-btn" title="Forward (-Z)" onClick={() => nudgeSelectedPiece(0, 0, -step)}>◱</button>
          <button className="nudge-label">Z</button>
          <button className="nudge-btn" title="Back (+Z)" onClick={() => nudgeSelectedPiece(0, 0, step)}>◹</button>
        </div>
      </div>

      {/* Action bar */}
      <div className="mobile-action-bar">
        <button className="mobile-action-btn" onClick={() => rotateSelectedPiece(90)} title="Rotate 90°">
          ↻ Rotate
        </button>
        <button
          className="mobile-action-btn mobile-action-btn--1"
          onClick={() => nudgeSelectedPiece(0, step, 0)}
          title="Nudge up (grid step)"
        >
          ↑ Up
        </button>
        <button
          className="mobile-action-btn mobile-action-btn--danger"
          onClick={() => removePiece(selectedPieceId)}
          title="Delete piece"
        >
          🗑 Delete
        </button>
      </div>
    </div>
  );
}