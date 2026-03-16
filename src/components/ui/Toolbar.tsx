import { useStore } from '../../store/useStore';
import type { Tool } from '../../types';

const tools: { id: Tool; label: string; icon: string }[] = [
  { id: 'select', label: 'Select', icon: '⇱' },
  { id: 'move', label: 'Move', icon: '✥' },
];

export function Toolbar() {
  const activeTool = useStore((s) => s.activeTool);
  const setActiveTool = useStore((s) => s.setActiveTool);
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const snapEnabled = useStore((s) => s.snapEnabled);
  const setSnapEnabled = useStore((s) => s.setSnapEnabled);
  const showDimensions = useStore((s) => s.showDimensions);
  const setShowDimensions = useStore((s) => s.setShowDimensions);
  const showGrid = useStore((s) => s.showGrid);
  const setShowGrid = useStore((s) => s.setShowGrid);

  return (
    <div className="toolbar">
      <div className="tool-group">
        {tools.map((t) => (
          <button
            key={t.id}
            className={`tool-btn ${activeTool === t.id ? 'active' : ''}`}
            onClick={() => setActiveTool(t.id)}
            title={t.label}
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
          title="Snap to grid"
        >
          ⊞ Snap
        </button>
        <button
          className={`tool-btn ${showGrid ? 'active' : ''}`}
          onClick={() => setShowGrid(!showGrid)}
          title="Show grid"
        >
          # Grid
        </button>
        <button
          className={`tool-btn ${showDimensions ? 'active' : ''}`}
          onClick={() => setShowDimensions(!showDimensions)}
          title="Show dimensions"
        >
          ↔ Dims
        </button>
      </div>
    </div>
  );
}
