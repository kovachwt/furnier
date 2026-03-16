import { useStore } from '../../store/useStore';
import type { Component, Panel, Leg, Vec3 } from '../../types';

export function PieceEditor() {
  const selectedPieceId = useStore((s) => s.selectedPieceId);
  const selectedComponentId = useStore((s) => s.selectedComponentId);
  const pieces = useStore((s) => s.project.pieces);
  const materials = useStore((s) => s.project.materials);
  const updatePiece = useStore((s) => s.updatePiece);
  const removePiece = useStore((s) => s.removePiece);
  const duplicatePiece = useStore((s) => s.duplicatePiece);
  const updateComponent = useStore((s) => s.updateComponent);
  const removeComponent = useStore((s) => s.removeComponent);
  const addComponent = useStore((s) => s.addComponent);
  const setSelection = useStore((s) => s.setSelection);
  const pushHistory = useStore((s) => s.pushHistory);

  const piece = pieces.find((p) => p.id === selectedPieceId);
  if (!piece) return null;

  const selectedComp = piece.components.find((c) => c.id === selectedComponentId);

  const updatePos = (axis: number, value: number) => {
    const pos = [...piece.position] as Vec3;
    pos[axis] = value;
    updatePiece(piece.id, { position: pos });
    pushHistory();
  };

  const handleAddPanel = () => {
    const mat = materials[0];
    const panel: Omit<Panel, 'id'> = {
      type: 'panel',
      name: 'New Panel',
      width: 400,
      height: 300,
      depth: mat?.thickness ?? 18,
      materialId: mat?.id ?? '',
      position: [0, 150, 0],
      rotation: [0, 0, 0],
      edgeBanding: { top: false, bottom: false, left: false, right: false },
    };
    const id = addComponent(piece.id, panel);
    if (id) setSelection(piece.id, id);
  };

  const handleAddLeg = () => {
    const leg: Omit<Leg, 'id'> = {
      type: 'leg',
      name: 'New Leg',
      diameter: 40,
      height: 700,
      style: 'round',
      position: [0, 350, 0],
      rotation: [0, 0, 0],
    };
    const id = addComponent(piece.id, leg);
    if (id) setSelection(piece.id, id);
  };

  return (
    <div className="panel-section">
      <h3>Selected: {piece.name}</h3>

      <div className="form-row">
        <label>Name</label>
        <input
          type="text"
          value={piece.name}
          onChange={(e) => updatePiece(piece.id, { name: e.target.value })}
        />
      </div>

      <div className="form-row">
        <label>X (mm)</label>
        <input type="number" value={piece.position[0]} step={10}
          onChange={(e) => updatePos(0, Number(e.target.value))} />
      </div>
      <div className="form-row">
        <label>Y (mm)</label>
        <input type="number" value={piece.position[1]} step={10} min={0}
          onChange={(e) => updatePos(1, Number(e.target.value))} />
      </div>
      <div className="form-row">
        <label>Z (mm)</label>
        <input type="number" value={piece.position[2]} step={10}
          onChange={(e) => updatePos(2, Number(e.target.value))} />
      </div>

      <div className="form-row">
        <label>Locked</label>
        <input
          type="checkbox"
          checked={piece.locked}
          onChange={(e) => updatePiece(piece.id, { locked: e.target.checked })}
        />
      </div>

      <div className="btn-row">
        <button className="btn-secondary" onClick={() => duplicatePiece(piece.id)}>
          ⧉ Duplicate
        </button>
        <button className="btn-danger" onClick={() => removePiece(piece.id)}>
          ✕ Delete
        </button>
      </div>

      <div className="btn-row" style={{ marginTop: 8 }}>
        <button className="btn-secondary" onClick={handleAddPanel}>+ Panel</button>
        <button className="btn-secondary" onClick={handleAddLeg}>+ Leg</button>
      </div>

      {/* Component list */}
      <h4>Components ({piece.components.length})</h4>
      <div className="component-list">
        {piece.components.map((comp) => (
          <div
            key={comp.id}
            className={`component-item ${comp.id === selectedComponentId ? 'selected' : ''}`}
            onClick={() => setSelection(piece.id, comp.id)}
          >
            <span className="comp-type">{comp.type}</span>
            <span className="comp-name">{comp.name}</span>
          </div>
        ))}
      </div>

      {/* Component editor */}
      {selectedComp && (
        <ComponentEditor
          pieceId={piece.id}
          component={selectedComp}
          materials={materials}
          updateComponent={updateComponent}
          removeComponent={removeComponent}
          pushHistory={pushHistory}
        />
      )}
    </div>
  );
}

function ComponentEditor({
  pieceId,
  component,
  materials,
  updateComponent,
  removeComponent,
  pushHistory,
}: {
  pieceId: string;
  component: Component;
  materials: any[];
  updateComponent: (pid: string, cid: string, u: Partial<Component>) => void;
  removeComponent: (pid: string, cid: string) => void;
  pushHistory: () => void;
}) {
  const update = (updates: Partial<Component>) => {
    updateComponent(pieceId, component.id, updates);
  };

  const updatePos = (axis: number, value: number) => {
    const pos = [...component.position] as Vec3;
    pos[axis] = value;
    update({ position: pos } as any);
    pushHistory();
  };

  return (
    <div className="comp-editor">
      <h4>{component.type}: {component.name}</h4>

      <div className="form-row">
        <label>Name</label>
        <input
          type="text"
          value={component.name}
          onChange={(e) => update({ name: e.target.value } as any)}
        />
      </div>

      <div className="form-row">
        <label>Pos X</label>
        <input type="number" value={component.position[0]} step={5}
          onChange={(e) => updatePos(0, Number(e.target.value))} />
      </div>
      <div className="form-row">
        <label>Pos Y</label>
        <input type="number" value={component.position[1]} step={5}
          onChange={(e) => updatePos(1, Number(e.target.value))} />
      </div>
      <div className="form-row">
        <label>Pos Z</label>
        <input type="number" value={component.position[2]} step={5}
          onChange={(e) => updatePos(2, Number(e.target.value))} />
      </div>

      {component.type === 'panel' && (
        <>
          <div className="form-row">
            <label>Width</label>
            <input type="number" value={component.width} step={5} min={10}
              onChange={(e) => { update({ width: Number(e.target.value) } as any); pushHistory(); }} />
          </div>
          <div className="form-row">
            <label>Height</label>
            <input type="number" value={component.height} step={5} min={10}
              onChange={(e) => { update({ height: Number(e.target.value) } as any); pushHistory(); }} />
          </div>
          <div className="form-row">
            <label>Material</label>
            <select
              value={component.materialId}
              onChange={(e) => {
                const mat = materials.find((m: any) => m.id === e.target.value);
                update({ materialId: e.target.value, depth: mat?.thickness ?? component.depth } as any);
                pushHistory();
              }}
            >
              {materials.map((m: any) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label>Edge Banding</label>
            <div className="edge-banding">
              {(['top', 'bottom', 'left', 'right'] as const).map((edge) => (
                <label key={edge} className="cb-label">
                  <input
                    type="checkbox"
                    checked={component.edgeBanding[edge]}
                    onChange={(e) => {
                      update({
                        edgeBanding: { ...component.edgeBanding, [edge]: e.target.checked },
                      } as any);
                    }}
                  />
                  {edge}
                </label>
              ))}
            </div>
          </div>
        </>
      )}

      {component.type === 'leg' && (
        <>
          <div className="form-row">
            <label>Diameter</label>
            <input type="number" value={component.diameter} step={5} min={10}
              onChange={(e) => { update({ diameter: Number(e.target.value) } as any); pushHistory(); }} />
          </div>
          <div className="form-row">
            <label>Height</label>
            <input type="number" value={component.height} step={5} min={50}
              onChange={(e) => { update({ height: Number(e.target.value) } as any); pushHistory(); }} />
          </div>
          <div className="form-row">
            <label>Style</label>
            <select value={component.style}
              onChange={(e) => { update({ style: e.target.value } as any); pushHistory(); }}>
              <option value="round">Round</option>
              <option value="tapered">Tapered</option>
              <option value="square">Square</option>
            </select>
          </div>
        </>
      )}

      <button
        className="btn-danger"
        style={{ marginTop: 8 }}
        onClick={() => removeComponent(pieceId, component.id)}
      >
        ✕ Remove Component
      </button>
    </div>
  );
}
