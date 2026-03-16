import { useStore } from '../../store/useStore';

export function RoomSettings() {
  const room = useStore((s) => s.project.room);
  const setRoom = useStore((s) => s.setRoom);

  return (
    <div className="panel-section">
      <h3>Room Dimensions</h3>
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
    </div>
  );
}
