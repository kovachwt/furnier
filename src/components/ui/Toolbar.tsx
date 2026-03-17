import { useStore } from '../../store/useStore';
import type { Tool } from '../../types';

const tools: { id: Tool; label: string; icon: string; shortcut: string }[] = [
  { id: 'select', label: 'Select', icon: '⇱', shortcut: 'S' },
  { id: 'move', label: 'Move', icon: '✥', shortcut: 'W' },
];

export function Toolbar() {
  const activeTool = useStore((s) => s.activeTool);
  const setActiveTool = useStore((s) => s.setActiveTool);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const snapEnabled = useStore((s) => s.snapEnabled);
  const setSnapEnabled = useStore((s) => s.setSnapEnabled);
  const snapToFaces = useStore((s) => s.snapToFaces);
  const setSnapToFaces = useStore((s) => s.setSnapToFaces);
  const showDimensions = useStore((s) => s.showDimensions);
  const setShowDimensions = useStore((s) => s.setShowDimensions);
  const showGrid = useStore((s) => s.showGrid);
  const setShowGrid = useStore((s) => s.setShowGrid);
  const explodedView = useStore((s) => s.explodedView);
  const setExplodedView = useStore((s) => s.setExplodedView);
  const explodeFactor = useStore((s) => s.explodeFactor);
  const setExplodeFactor = useStore((s) => s.setExplodeFactor);

  return (
    <div className="toolbar">
      <div className="tool-group">
        {tools.map((t) => (
          <button
            key={t.id}
            className={`tool-btn ${activeTool === t.id ? 'active' : ''}`}
            onClick={() => setActiveTool(t.id)}
            title={`${t.label} (${t.shortcut})`}
          >
            <span className="tool-icon">{t.icon}</span>
            <span className="tool-label">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="tool-separator" />

      <div className="tool-group">
        <button className="tool-btn" onClick={undo} title="Undo (Ctrl+Z)">↩ Undo</button>
        <button className="tool-btn" onClick={redo} title="Redo (Ctrl+Y)">↪ Redo</button>
      </div>

      <div className="tool-separator" />

      <div className="tool-group">
        <button
          className={`tool-btn ${snapEnabled ? 'active' : ''}`}
          onClick={() => setSnapEnabled(!snapEnabled)}
          title="Snap to grid (N)"
        >
          ⊞ Grid
        </button>
        <button
          className={`tool-btn ${snapToFaces ? 'active' : ''}`}
          onClick={() => setSnapToFaces(!snapToFaces)}
          title="Snap to panel faces (F)"
        >
          ⊟ Faces
        </button>
        <button
          className={`tool-btn ${showGrid ? 'active' : ''}`}
          onClick={() => setShowGrid(!showGrid)}
          title="Show grid (G)"
        >
          # Grid
        </button>
        <button
          className={`tool-btn ${showDimensions ? 'active' : ''}`}
          onClick={() => setShowDimensions(!showDimensions)}
          title="Show dimensions (D)"
        >
          ↔ Dims
        </button>
      </div>

      <div className="tool-separator" />

      <div className="tool-group">
        <button
          className={`tool-btn ${explodedView ? 'active' : ''}`}
          onClick={() => setExplodedView(!explodedView)}
          title="Exploded assembly view (X)"
        >
          💥 Explode
        </button>
        {explodedView && (
          <div className="explode-slider" title={`Explode factor: ${explodeFactor.toFixed(1)}×`}>
            <input
              type="range"
              min={0.5}
              max={3}
              step={0.1}
              value={explodeFactor}
              onChange={(e) => setExplodeFactor(Number(e.target.value))}
            />
            <span className="explode-value">{explodeFactor.toFixed(1)}×</span>
          </div>
        )}
      </div>
    </div>
  );
}
