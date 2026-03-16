import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { createCabinet, createBookshelf, createDesk, createDresser } from '../../utils/templates';
import { v4 as uuid } from 'uuid';
import type { Panel, Vec3 } from '../../types';

type TemplateType = 'cabinet' | 'bookshelf' | 'desk' | 'dresser' | 'panel';

export function AddFurniture() {
  const addPiece = useStore((s) => s.addPiece);
  const materials = useStore((s) => s.project.materials);
  const room = useStore((s) => s.project.room);
  const setSelection = useStore((s) => s.setSelection);

  const [template, setTemplate] = useState<TemplateType>('cabinet');
  const [matId, setMatId] = useState(materials[0]?.id ?? '');

  // Template params
  const [width, setWidth] = useState(600);
  const [height, setHeight] = useState(720);
  const [depth, setDepth] = useState(400);
  const [shelves, setShelves] = useState(2);
  const [doors] = useState(1);
  const [drawerRows, setDrawerRows] = useState(4);
  const [legStyle, setLegStyle] = useState<'round' | 'tapered' | 'square'>('round');

  const handleAdd = () => {
    let piece;
    switch (template) {
      case 'cabinet': {
        const params = { width, height, depth, shelves, doors, materialId: matId };
        piece = createCabinet(params, materials);
        piece.templateType = 'cabinet';
        piece.templateParams = { ...params };
        break;
      }
      case 'bookshelf': {
        const params = { width, height, depth, shelves, materialId: matId };
        piece = createBookshelf(params, materials);
        piece.templateType = 'bookshelf';
        piece.templateParams = { ...params };
        break;
      }
      case 'desk': {
        const params = { width, height: 750, depth, legStyle, drawers: 0, materialId: matId };
        piece = createDesk(params, materials);
        piece.templateType = 'desk';
        piece.templateParams = { ...params };
        break;
      }
      case 'dresser': {
        const params = { width, height, depth, drawerRows, materialId: matId };
        piece = createDresser(params, materials);
        piece.templateType = 'dresser';
        piece.templateParams = { ...params };
        break;
      }
      case 'panel': {
        const mat = materials.find(m => m.id === matId);
        const t = mat?.thickness ?? 18;
        const panel: Panel = {
          id: uuid(),
          type: 'panel',
          name: 'Panel',
          width,
          height,
          depth: t,
          materialId: matId,
          position: [0, height / 2, 0],
          rotation: [0, 0, 0],
          edgeBanding: { top: false, bottom: false, left: false, right: false },
        };
        piece = {
          name: 'Custom Panel',
          position: [0, 0, 0] as Vec3,
          rotation: [0, 0, 0] as Vec3,
          components: [panel],
          locked: false,
        };
        break;
      }
    }

    if (piece) {
      // Place against the back wall, centered on X, on the floor
      const mat = materials.find(m => m.id === matId);
      const pieceDepth = template === 'panel' ? (mat?.thickness ?? 18) : depth;
      piece.position = [0, 0, -room.depth / 2 + pieceDepth / 2];
      const id = addPiece(piece);
      setSelection(id);
    }
  };

  return (
    <div className="panel-section">
      <h3>Add Furniture</h3>

      <div className="form-row">
        <label>Type</label>
        <select value={template} onChange={(e) => setTemplate(e.target.value as TemplateType)}>
          <option value="cabinet">Cabinet</option>
          <option value="bookshelf">Bookshelf</option>
          <option value="desk">Desk</option>
          <option value="dresser">Dresser</option>
          <option value="panel">Single Panel</option>
        </select>
      </div>

      <div className="form-row">
        <label>Material</label>
        <select value={matId} onChange={(e) => setMatId(e.target.value)}>
          {materials.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      <div className="form-row">
        <label>Width (mm)</label>
        <input type="number" value={width} step={10} min={100} max={3000}
          onChange={(e) => setWidth(Number(e.target.value))} />
      </div>

      {template !== 'desk' && (
        <div className="form-row">
          <label>Height (mm)</label>
          <input type="number" value={height} step={10} min={100} max={3000}
            onChange={(e) => setHeight(Number(e.target.value))} />
        </div>
      )}

      <div className="form-row">
        <label>Depth (mm)</label>
        <input type="number" value={depth} step={10} min={100} max={1500}
          onChange={(e) => setDepth(Number(e.target.value))} />
      </div>

      {(template === 'cabinet' || template === 'bookshelf') && (
        <div className="form-row">
          <label>Shelves</label>
          <input type="number" value={shelves} min={0} max={20}
            onChange={(e) => setShelves(Number(e.target.value))} />
        </div>
      )}

      {template === 'dresser' && (
        <div className="form-row">
          <label>Drawer Rows</label>
          <input type="number" value={drawerRows} min={1} max={10}
            onChange={(e) => setDrawerRows(Number(e.target.value))} />
        </div>
      )}

      {template === 'desk' && (
        <div className="form-row">
          <label>Leg Style</label>
          <select value={legStyle} onChange={(e) => setLegStyle(e.target.value as any)}>
            <option value="round">Round</option>
            <option value="tapered">Tapered</option>
            <option value="square">Square</option>
          </select>
        </div>
      )}

      <button className="btn-primary" onClick={handleAdd}>
        + Add {template}
      </button>
    </div>
  );
}
