import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { RoomMeasure } from './RoomMeasure';

export function RoomSettings() {
  const room = useStore((s) => s.project.room);
  const setRoom = useStore((s) => s.setRoom);
  const [open, setOpen] = useState(false);
  const [showMeasure, setShowMeasure] = useState(false);

  return (
    <>
      <div className="panel-section">
        <button
          className="btn-secondary full-width"
          onClick={() => setOpen(true)}
        >
          📐 Room Dimensions
          <span className="room-dims-summary">
            {room.width} × {room.depth} × {room.height}
          </span>
        </button>
      </div>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div
            className="room-settings-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>📐 Room Dimensions</h2>
              <button className="btn-close" onClick={() => setOpen(false)}>✕</button>
            </div>
            <div className="room-settings-body">
              <div className="form-row">
                <label>Width (mm)</label>
                <input
                  type="number"
                  value={room.width}
                  step={100}
                  min={500}
                  max={20000}
                  onChange={(e) => setRoom({ width: Number(e.target.value) })}
                />
              </div>
              <div className="form-row">
                <label>Depth (mm)</label>
                <input
                  type="number"
                  value={room.depth}
                  step={100}
                  min={500}
                  max={20000}
                  onChange={(e) => setRoom({ depth: Number(e.target.value) })}
                />
              </div>
              <div className="form-row">
                <label>Height (mm)</label>
                <input
                  type="number"
                  value={room.height}
                  step={100}
                  min={1000}
                  max={5000}
                  onChange={(e) => setRoom({ height: Number(e.target.value) })}
                />
              </div>
              <button
                className="btn-secondary full-width"
                style={{ marginTop: 12 }}
                onClick={() => setShowMeasure(true)}
              >
                📷 Measure from Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {showMeasure && <RoomMeasure onClose={() => setShowMeasure(false)} />}
    </>
  );
}
