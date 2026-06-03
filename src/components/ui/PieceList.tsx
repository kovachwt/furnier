import { useState, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { getFloorGap } from '../../utils/floorGap';

export function PieceList() {
  const pieces = useStore((s) => s.project.pieces);
  const selectedPieceId = useStore((s) => s.selectedPieceId);
  const selectedPieceIds = useStore((s) => s.selectedPieceIds);
  const setSelection = useStore((s) => s.setSelection);
  const togglePieceInSelection = useStore((s) => s.togglePieceInSelection);
  const selectAllPieces = useStore((s) => s.selectAllPieces);
  const clearSelection = useStore((s) => s.clearSelection);
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? pieces.filter((p) => p.name.toLowerCase().includes(search.trim().toLowerCase()))
    : pieces;

  const handleClick = useCallback((id: string, e: React.MouseEvent) => {
    if (e.shiftKey || e.metaKey || e.ctrlKey) {
      togglePieceInSelection(id);
    } else {
      setSelection(id);
    }
  }, [setSelection, togglePieceInSelection]);

  if (pieces.length === 0) return null;

  const multiCount = selectedPieceIds.length;
  const isMulti = multiCount > 1;

  return (
    <div className="panel-section">
      <h3>
        Pieces ({pieces.length})
        {isMulti && <span className="multi-badge" title="Multi-select active"> {multiCount} selected</span>}
      </h3>
      <input
        type="text"
        className="piece-search-input"
        placeholder="Search pieces…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Search pieces"
      />
      {pieces.length > 1 && (
        <div className="multi-select-actions">
          <button
            className="btn-tiny"
            onClick={selectAllPieces}
            title="Select all pieces (Ctrl+A)"
          >
            ☑ All
          </button>
          {multiCount > 0 && (
            <button
              className="btn-tiny"
              onClick={clearSelection}
              title="Clear selection (Esc)"
            >
              ✕ None
            </button>
          )}
        </div>
      )}
      <div className="piece-list">
        {filtered.length === 0 && (
          <div className="piece-search-no-results">No pieces match "{search}"</div>
        )}
        {filtered.map((piece) => {
          const gap = getFloorGap(piece);
          const isSelected = selectedPieceIds.includes(piece.id);
          return (
            <div
              key={piece.id}
              className={`piece-item ${isSelected ? 'selected' : ''}${isSelected && selectedPieceId !== piece.id ? ' multi' : ''}${gap !== null ? ' floating' : ''}`}
              onClick={(e) => handleClick(piece.id, e)}
              title={gap !== null ? `⚠ Floating: ${gap}mm above floor` : 'Shift+click to multi-select'}
            >
              <span>{piece.isFixture ? '📌 ' : ''}{piece.locked ? '🔒 ' : ''}{gap !== null ? '⚠ ' : ''}{piece.name}</span>
              <span className="piece-comp-count">{piece.components.length} parts</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
