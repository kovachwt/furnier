import { useStore } from '../../store/useStore';

export function PieceList() {
  const pieces = useStore((s) => s.project.pieces);
  const selectedPieceId = useStore((s) => s.selectedPieceId);
  const setSelection = useStore((s) => s.setSelection);

  if (pieces.length === 0) return null;

  return (
    <div className="panel-section">
      <h3>Pieces ({pieces.length})</h3>
      <div className="piece-list">
        {pieces.map((piece) => (
          <div
            key={piece.id}
            className={`piece-item ${piece.id === selectedPieceId ? 'selected' : ''}`}
            onClick={() => setSelection(piece.id)}
          >
            <span>{piece.locked ? '🔒 ' : ''}{piece.name}</span>
            <span className="piece-comp-count">{piece.components.length} parts</span>
          </div>
        ))}
      </div>
    </div>
  );
}
