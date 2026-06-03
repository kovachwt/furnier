import { useStore } from '../../store/useStore';
import { getPiecesWorldBounds } from '../../utils/alignment';
import type { AxisName, AlignMode, WallName } from '../../utils/alignment';

/**
 * Alignment & distribution panel — appears in the Edit tab sidebar when
 * 2 or more pieces are selected.
 *
 * Provides a 3×3 grid of alignment buttons (one cell per axis × mode)
 * plus a "to wall" row for snapping selected pieces to room boundaries
 * and a "distribute" row for evenly spacing pieces along an axis.
 *
 * All operations are undoable: the underlying store actions push to
 * the history stack.
 */
export function AlignmentPanel() {
  const selectedPieceIds = useStore((s) => s.selectedPieceIds);
  const pieces = useStore((s) => s.project.pieces);
  const alignPieces = useStore((s) => s.alignPieces);
  const alignPiecesToWall = useStore((s) => s.alignPiecesToWall);
  const distributePieces = useStore((s) => s.distributePieces);

  if (selectedPieceIds.length < 2) return null;

  const selectedPieces = pieces.filter((p) => selectedPieceIds.includes(p.id));
  const bounds = getPiecesWorldBounds(selectedPieces);

  const handleAlign = (axis: AxisName, mode: AlignMode) => {
    alignPieces(selectedPieceIds, axis, mode);
  };

  const handleAlignToWall = (wall: WallName) => {
    alignPiecesToWall(selectedPieceIds, wall);
  };

  const handleDistribute = (axis: AxisName) => {
    distributePieces(selectedPieceIds, axis);
  };

  return (
    <div className="panel-section">
      <h3>
        ⚖ Align &amp; Distribute
        <span className="multi-badge">{selectedPieceIds.length}</span>
      </h3>

      {/* X axis (left / center / right) */}
      <div className="align-row">
        <span className="align-row-label">X</span>
        <div className="align-grid">
          <button
            className="align-btn"
            onClick={() => handleAlign('x', 'min')}
            title={`Align all left edges to X = ${Math.round(bounds.min[0])} mm`}
          >
            ◀
          </button>
          <button
            className="align-btn"
            onClick={() => handleAlign('x', 'center')}
            title={`Align all X centers to ${Math.round(bounds.center[0])} mm`}
          >
            ◼
          </button>
          <button
            className="align-btn"
            onClick={() => handleAlign('x', 'max')}
            title={`Align all right edges to X = ${Math.round(bounds.max[0])} mm`}
          >
            ▶
          </button>
        </div>
      </div>

      {/* Y axis (bottom / center / top) */}
      <div className="align-row">
        <span className="align-row-label">Y</span>
        <div className="align-grid">
          <button
            className="align-btn"
            onClick={() => handleAlign('y', 'min')}
            title={`Align all bottoms to Y = ${Math.round(bounds.min[1])} mm`}
          >
            ▼
          </button>
          <button
            className="align-btn"
            onClick={() => handleAlign('y', 'center')}
            title={`Align all Y centers to ${Math.round(bounds.center[1])} mm`}
          >
            ◼
          </button>
          <button
            className="align-btn"
            onClick={() => handleAlign('y', 'max')}
            title={`Align all tops to Y = ${Math.round(bounds.max[1])} mm`}
          >
            ▲
          </button>
        </div>
      </div>

      {/* Z axis (back / center / front) */}
      <div className="align-row">
        <span className="align-row-label">Z</span>
        <div className="align-grid">
          <button
            className="align-btn"
            onClick={() => handleAlign('z', 'min')}
            title={`Align all back edges to Z = ${Math.round(bounds.min[2])} mm`}
          >
            ⇤
          </button>
          <button
            className="align-btn"
            onClick={() => handleAlign('z', 'center')}
            title={`Align all Z centers to ${Math.round(bounds.center[2])} mm`}
          >
            ◼
          </button>
          <button
            className="align-btn"
            onClick={() => handleAlign('z', 'max')}
            title={`Align all front edges to Z = ${Math.round(bounds.max[2])} mm`}
          >
            ⇥
          </button>
        </div>
      </div>

      {/* Align to room walls */}
      <h4 style={{ marginTop: 10 }}>To Wall</h4>
      <div className="align-wall-grid">
        <button className="btn-secondary" onClick={() => handleAlignToWall('left')} title="Align left edge of all pieces to left wall">
          ⫷ Left
        </button>
        <button className="btn-secondary" onClick={() => handleAlignToWall('right')} title="Align right edge of all pieces to right wall">
          ⫸ Right
        </button>
        <button className="btn-secondary" onClick={() => handleAlignToWall('back')} title="Align back edge of all pieces to back wall">
          ⫰ Back
        </button>
        <button className="btn-secondary" onClick={() => handleAlignToWall('front')} title="Align front edge of all pieces to front wall">
          ⫱ Front
        </button>
        <button className="btn-secondary" onClick={() => handleAlignToWall('floor')} title="Drop all pieces to floor (Y=0)">
          ⫯ Floor
        </button>
        <button className="btn-secondary" onClick={() => handleAlignToWall('ceiling')} title="Raise all pieces to ceiling">
          ⫮ Ceiling
        </button>
      </div>

      {/* Distribute evenly — only with 3+ pieces */}
      {selectedPieceIds.length >= 3 && (
        <>
          <h4 style={{ marginTop: 10 }}>Distribute Evenly</h4>
          <div className="align-distribute-grid">
            <button className="btn-secondary" onClick={() => handleDistribute('x')} title="Distribute pieces evenly along X axis">
              ⇿ X
            </button>
            <button className="btn-secondary" onClick={() => handleDistribute('y')} title="Distribute pieces evenly along Y axis">
              ⇳ Y
            </button>
            <button className="btn-secondary" onClick={() => handleDistribute('z')} title="Distribute pieces evenly along Z axis">
              ⇵ Z
            </button>
          </div>
        </>
      )}
    </div>
  );
}
