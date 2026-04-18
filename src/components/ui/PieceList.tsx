import { useState } from 'react';
import { useStore } from '../../store/useStore';

export function PieceList() {
  const pieces = useStore((s) => s.project.pieces);
  const selectedPieceId = useStore((s) => s.selectedPieceId);
  const setSelection = useStore((s) => s.setSelection);
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? pieces.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()))
    : pieces;

  if (pieces.length === 0) return null;

  return (
    <div className="panel-section">
      <h3>Pieces ({pieces.length})</h3>
      <input
        type="text"
        className="piece-search-input"
        placeholder="Search pieces…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search pieces"
      />
      <div className="piece-list">
        {filtered.length === 0 && (
          <div className="piece-search-no-results">No pieces match "{search}"</div>
        )}
        {filtered.map((piece) => (
          <div
            key={piece.id}
            className={`piece-item ${piece.id === selectedPieceId ? 'selected' : ''}`}
            onClick={() => setSelection(piece.id)}
          >
            <span>{piece.isFixture ? '📌 ' : ''}{piece.locked ? '🔒 ' : ''}{piece.name}</span>
            <span className="piece-comp-count">{piece.components.length} parts</span>
          </div>
        ))}
      </div>
    </div>
  );
}
