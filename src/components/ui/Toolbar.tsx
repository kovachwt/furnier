import { useStore } from '../../store/useStore';
import { CameraPresets } from './CameraPresets';
import { ScreenshotButton } from './ScreenshotButton';

export function Toolbar() {
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const snapEnabled = useStore((s) => s.snapEnabled);
  const setSnapEnabled = useStore((s) => s.setSnapEnabled);
  const snapToFaces = useStore((s) => s.snapToFaces);
  const setSnapToFaces = useStore((s) => s.setSnapToFaces);
  const showDimensions = useStore((s) => s.showDimensions);
  const setShowDimensions = useStore((s) => s.setShowDimensions);
  const showDistances = useStore((s) => s.showDistances);
  const setShowDistances = useStore((s) => s.setShowDistances);
  const showGrid = useStore((s) => s.showGrid);
  const setShowGrid = useStore((s) => s.setShowGrid);
  const showThickness = useStore((s) => s.showThickness);
  const setShowThickness = useStore((s) => s.setShowThickness);
  const explodedView = useStore((s) => s.explodedView);
  const setExplodedView = useStore((s) => s.setExplodedView);
  const explodeFactor = useStore((s) => s.explodeFactor);
  const setExplodeFactor = useStore((s) => s.setExplodeFactor);
  const darkTheme = useStore((s) => s.darkTheme);
  const toggleTheme = useStore((s) => s.toggleTheme);

  return (
    <div className="toolbar">
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
          ⊞ Grid
        </button>
        <button
          className={`tool-btn ${snapToFaces ? 'active' : ''}`}
          onClick={() => setSnapToFaces(!snapToFaces)}
          title="Snap to panel faces"
        >
          ⊟ Faces
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
        <button
          className={`tool-btn ${showDistances ? 'active' : ''}`}
          onClick={() => setShowDistances(!showDistances)}
          title="Show piece-to-wall/neighbor distances"
        >
          ↕ Dist
        </button>
        <button
          className={`tool-btn ${showThickness ? 'active' : ''}`}
          onClick={() => setShowThickness(!showThickness)}
          title="Exaggerate panel thickness for visibility"
        >
          ▥ Thick
        </button>
      </div>

      <div className="tool-separator" />

      <div className="tool-group">
        <button
          className={`tool-btn ${explodedView ? 'active' : ''}`}
          onClick={() => setExplodedView(!explodedView)}
          title="Exploded assembly view"
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

      <div className="tool-separator" />

      <CameraPresets />

      <div className="tool-separator" />

      <ScreenshotButton />

      <div className="tool-separator" />

      <button
        className="tool-btn"
        onClick={toggleTheme}
        title={darkTheme ? 'Switch to light theme' : 'Switch to dark theme'}
      >
        {darkTheme ? '☀' : '🌙'}
      </button>
    </div>
  );
}
