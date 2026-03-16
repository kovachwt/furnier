import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import type {
  Component, Panel, Leg, Vec3, FurniturePiece,
  CabinetParams, BookshelfParams, DeskParams, DresserParams,
} from '../../types';

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

      {/* Template re-parameterization */}
      {piece.templateType && piece.templateParams && (
        <TemplateParams piece={piece} />
      )}

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

      {/* Constraints */}
      <ConstraintSection piece={piece} />
    </div>
  );
}

// --- Template Re-parameterization ---
function TemplateParams({ piece }: { piece: FurniturePiece }) {
  const regeneratePiece = useStore((s) => s.regeneratePiece);
  const materials = useStore((s) => s.project.materials);

  const [params, setParams] = useState<Record<string, unknown>>(
    () => piece.templateParams ? { ...piece.templateParams } : {}
  );

  // Sync params when piece changes (e.g., after regeneration)
  useEffect(() => {
    if (piece.templateParams) {
      setParams({ ...piece.templateParams });
    }
  }, [piece.id, piece.templateType]);

  const updateParam = (key: string, value: unknown) => {
    setParams(p => ({ ...p, [key]: value }));
  };

  const handleRegenerate = () => {
    regeneratePiece(
      piece.id,
      params as unknown as CabinetParams | BookshelfParams | DeskParams | DresserParams
    );
  };

  return (
    <div className="template-params-section">
      <h4>↻ Template: {piece.templateType}</h4>
      <div className="form-row">
        <label>Width</label>
        <input type="number" value={params.width as number} step={10} min={100}
          onChange={(e) => updateParam('width', Number(e.target.value))} />
      </div>
      <div className="form-row">
        <label>Height</label>
        <input type="number" value={params.height as number} step={10} min={100}
          onChange={(e) => updateParam('height', Number(e.target.value))} />
      </div>
      <div className="form-row">
        <label>Depth</label>
        <input type="number" value={params.depth as number} step={10} min={100}
          onChange={(e) => updateParam('depth', Number(e.target.value))} />
      </div>

      {(piece.templateType === 'cabinet' || piece.templateType === 'bookshelf') && (
        <div className="form-row">
          <label>Shelves</label>
          <input type="number" value={params.shelves as number} min={0} max={20}
            onChange={(e) => updateParam('shelves', Number(e.target.value))} />
        </div>
      )}

      {piece.templateType === 'cabinet' && (
        <div className="form-row">
          <label>Doors</label>
          <input type="number" value={(params.doors as number) ?? 1} min={0} max={2}
            onChange={(e) => updateParam('doors', Number(e.target.value))} />
        </div>
      )}

      {piece.templateType === 'dresser' && (
        <div className="form-row">
          <label>Drawer Rows</label>
          <input type="number" value={params.drawerRows as number} min={1} max={10}
            onChange={(e) => updateParam('drawerRows', Number(e.target.value))} />
        </div>
      )}

      {piece.templateType === 'desk' && (
        <div className="form-row">
          <label>Leg Style</label>
          <select value={params.legStyle as string}
            onChange={(e) => updateParam('legStyle', e.target.value)}>
            <option value="round">Round</option>
            <option value="tapered">Tapered</option>
            <option value="square">Square</option>
          </select>
        </div>
      )}

      <div className="form-row">
        <label>Material</label>
        <select value={params.materialId as string}
          onChange={(e) => updateParam('materialId', e.target.value)}>
          {materials.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      <button className="btn-primary full-width" onClick={handleRegenerate}
        style={{ marginTop: 6 }}>
        ↻ Regenerate from Template
      </button>
    </div>
  );
}

// --- Constraints Section ---
function ConstraintSection({ piece }: { piece: FurniturePiece }) {
  const addConstraint = useStore((s) => s.addConstraint);
  const removeConstraint = useStore((s) => s.removeConstraint);

  const constraints = piece.constraints ?? [];
  const panels = piece.components.filter(c => c.type === 'panel');

  const [showAddForm, setShowAddForm] = useState(false);
  const [sourceId, setSourceId] = useState('');
  const [sourceProp, setSourceProp] = useState<'width' | 'height'>('width');
  const [targetId, setTargetId] = useState('');
  const [targetProp, setTargetProp] = useState<'width' | 'height'>('width');
  const [offset, setOffset] = useState(0);

  const handleAdd = () => {
    if (sourceId && targetId && sourceId !== targetId) {
      addConstraint(piece.id, {
        sourceComponentId: sourceId,
        sourceProperty: sourceProp,
        targetComponentId: targetId,
        targetProperty: targetProp,
        offset,
      });
      setShowAddForm(false);
      setSourceId('');
      setTargetId('');
      setOffset(0);
    }
  };

  return (
    <div className="constraint-section">
      <h4>
        🔗 Constraints ({constraints.length})
        {panels.length >= 2 && (
          <button className="btn-tiny" onClick={() => setShowAddForm(!showAddForm)}
            style={{ marginLeft: 8 }}>
            {showAddForm ? '✕' : '+'}
          </button>
        )}
      </h4>

      {constraints.length > 0 && (
        <div className="constraint-list">
          {constraints.map((c) => {
            const source = piece.components.find(comp => comp.id === c.sourceComponentId);
            const target = piece.components.find(comp => comp.id === c.targetComponentId);
            return (
              <div key={c.id} className="constraint-item">
                <span className="constraint-text">
                  {target?.name ?? '?'}.{c.targetProperty} = {source?.name ?? '?'}.{c.sourceProperty}
                  {c.offset !== 0 && ` ${c.offset > 0 ? '+' : ''}${c.offset}`}
                </span>
                <button className="btn-tiny btn-danger-tiny"
                  onClick={() => removeConstraint(piece.id, c.id)}>✕</button>
              </div>
            );
          })}
        </div>
      )}

      {constraints.length === 0 && !showAddForm && (
        <div className="constraint-hint">
          No constraints. Link panel dimensions so changes propagate automatically.
        </div>
      )}

      {showAddForm && (
        <div className="constraint-add-form">
          <div className="form-row">
            <label>Source</label>
            <select value={sourceId} onChange={e => setSourceId(e.target.value)}>
              <option value="">— select —</option>
              {panels.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>Src Prop</label>
            <select value={sourceProp} onChange={e => setSourceProp(e.target.value as 'width' | 'height')}>
              <option value="width">Width</option>
              <option value="height">Height</option>
            </select>
          </div>
          <div className="form-row">
            <label>→ Target</label>
            <select value={targetId} onChange={e => setTargetId(e.target.value)}>
              <option value="">— select —</option>
              {panels.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>Tgt Prop</label>
            <select value={targetProp} onChange={e => setTargetProp(e.target.value as 'width' | 'height')}>
              <option value="width">Width</option>
              <option value="height">Height</option>
            </select>
          </div>
          <div className="form-row">
            <label>Offset</label>
            <input type="number" value={offset} step={1}
              onChange={e => setOffset(Number(e.target.value))} />
          </div>
          <button className="btn-primary" onClick={handleAdd}
            disabled={!sourceId || !targetId || sourceId === targetId}>
            + Add Constraint
          </button>
        </div>
      )}
    </div>
  );
}

// --- Component Editor ---
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
  materials: { id: string; name: string; thickness: number }[];
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
    update({ position: pos } as Partial<Component>);
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
          onChange={(e) => update({ name: e.target.value } as Partial<Component>)}
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
              onChange={(e) => { update({ width: Number(e.target.value) } as Partial<Component>); pushHistory(); }} />
          </div>
          <div className="form-row">
            <label>Height</label>
            <input type="number" value={component.height} step={5} min={10}
              onChange={(e) => { update({ height: Number(e.target.value) } as Partial<Component>); pushHistory(); }} />
          </div>
          <div className="form-row">
            <label>Material</label>
            <select
              value={component.materialId}
              onChange={(e) => {
                const mat = materials.find((m) => m.id === e.target.value);
                update({ materialId: e.target.value, depth: mat?.thickness ?? component.depth } as Partial<Component>);
                pushHistory();
              }}
            >
              {materials.map((m) => (
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
                      } as Partial<Component>);
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
              onChange={(e) => { update({ diameter: Number(e.target.value) } as Partial<Component>); pushHistory(); }} />
          </div>
          <div className="form-row">
            <label>Height</label>
            <input type="number" value={component.height} step={5} min={50}
              onChange={(e) => { update({ height: Number(e.target.value) } as Partial<Component>); pushHistory(); }} />
          </div>
          <div className="form-row">
            <label>Style</label>
            <select value={component.style}
              onChange={(e) => { update({ style: e.target.value } as Partial<Component>); pushHistory(); }}>
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
