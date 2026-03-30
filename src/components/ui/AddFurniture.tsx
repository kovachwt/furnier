import { useState } from 'react';
import { useStore } from '../../store/useStore';
import { createCabinet, createBookshelf, createDesk, createDresser, createDoorCabinet, createFixtureBox, createFixtureCylinder } from '../../utils/templates';
import { v4 as uuid } from 'uuid';
import type { Panel, Vec3, FixtureBoxParams, FixtureCylinderParams } from '../../types';

type TemplateType = 'cabinet' | 'bookshelf' | 'desk' | 'dresser' | 'door-cabinet' | 'panel'
  | 'fixture-pillar' | 'fixture-pillar-round' | 'fixture-radiator' | 'fixture-appliance' | 'fixture-box' | 'fixture-cylinder';

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
  const [doors, setDoors] = useState(1);
  const [drawerRows, setDrawerRows] = useState(4);
  const [legStyle, setLegStyle] = useState<'round' | 'tapered' | 'square'>('round');

  // Fixture state
  const [fixtureColor, setFixtureColor] = useState('#808080');
  const [diameter, setDiameter] = useState(300);

  const isFixture = template.startsWith('fixture-');
  const isCylinder = template === 'fixture-pillar-round' || template === 'fixture-cylinder';

  const handleTemplateChange = (newTemplate: TemplateType) => {
    setTemplate(newTemplate);
    switch (newTemplate) {
      case 'fixture-pillar':
        setWidth(300); setHeight(2500); setDepth(300); setFixtureColor('#808080'); break;
      case 'fixture-pillar-round':
        setDiameter(300); setHeight(2500); setFixtureColor('#808080'); break;
      case 'fixture-radiator':
        setWidth(1000); setHeight(600); setDepth(100); setFixtureColor('#c0c0c0'); break;
      case 'fixture-appliance':
        setWidth(600); setHeight(850); setDepth(600); setFixtureColor('#e8e8e8'); break;
      case 'fixture-box':
        setWidth(500); setHeight(500); setDepth(500); setFixtureColor('#9e9e9e'); break;
      case 'fixture-cylinder':
        setDiameter(200); setHeight(1000); setFixtureColor('#9e9e9e'); break;
    }
  };

  const handleAdd = () => {
    // Handle fixture creation
    if (isFixture) {
      let piece;
      if (isCylinder) {
        const params: FixtureCylinderParams = { diameter, height };
        piece = createFixtureCylinder(params, fixtureColor);
        piece.templateType = 'fixture-cylinder';
        piece.templateParams = { ...params };
      } else {
        const params: FixtureBoxParams = { width, height, depth };
        piece = createFixtureBox(params, fixtureColor);
        piece.templateType = 'fixture-box';
        piece.templateParams = { ...params };
      }
      // Set name based on preset
      const names: Record<string, string> = {
        'fixture-pillar': 'Pillar',
        'fixture-pillar-round': 'Pillar (round)',
        'fixture-radiator': 'Radiator',
        'fixture-appliance': 'Appliance',
        'fixture-box': 'Fixture',
        'fixture-cylinder': 'Fixture (cylinder)',
      };
      piece.name = names[template] ?? 'Fixture';
      piece.position = [0, 0, 0];
      const id = addPiece(piece);
      setSelection(id);
      return;
    }

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
      case 'door-cabinet': {
        const params = { width, height, depth, shelves, doors, materialId: matId };
        piece = createDoorCabinet(params, materials);
        piece.templateType = 'door-cabinet';
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
      <h3>{isFixture ? '📌 Add Fixture' : 'Add Furniture'}</h3>

      <div className="form-row">
        <label>Type</label>
        <select value={template} onChange={(e) => handleTemplateChange(e.target.value as TemplateType)}>
          <optgroup label="Furniture">
            <option value="cabinet">Cabinet (open)</option>
            <option value="door-cabinet">Cabinet (with doors)</option>
            <option value="bookshelf">Bookshelf</option>
            <option value="desk">Desk</option>
            <option value="dresser">Dresser</option>
            <option value="panel">Single Panel</option>
          </optgroup>
          <optgroup label="Room Fixtures">
            <option value="fixture-pillar">Pillar (rectangular)</option>
            <option value="fixture-pillar-round">Pillar (round)</option>
            <option value="fixture-radiator">Radiator / Fancoil</option>
            <option value="fixture-appliance">Appliance</option>
            <option value="fixture-box">Generic Box</option>
            <option value="fixture-cylinder">Generic Cylinder</option>
          </optgroup>
        </select>
      </div>

      {!isFixture && (
        <div className="form-row">
          <label>Material</label>
          <select value={matId} onChange={(e) => setMatId(e.target.value)}>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      )}

      {isFixture && (
        <div className="form-row">
          <label>Color</label>
          <input type="color" value={fixtureColor} onChange={(e) => setFixtureColor(e.target.value)} />
        </div>
      )}

      {isCylinder ? (
        <div className="form-row">
          <label>Diameter (mm)</label>
          <input type="number" value={diameter} step={10} min={10} max={3000}
            onChange={(e) => setDiameter(Number(e.target.value))} />
        </div>
      ) : (
        <div className="form-row">
          <label>Width (mm)</label>
          <input type="number" value={width} step={10} min={100} max={3000}
            onChange={(e) => setWidth(Number(e.target.value))} />
        </div>
      )}

      {template !== 'desk' && (
        <div className="form-row">
          <label>Height (mm)</label>
          <input type="number" value={height} step={10} min={100} max={3000}
            onChange={(e) => setHeight(Number(e.target.value))} />
        </div>
      )}

      {!isCylinder && (
        <div className="form-row">
          <label>Depth (mm)</label>
          <input type="number" value={depth} step={10} min={10} max={1500}
            onChange={(e) => setDepth(Number(e.target.value))} />
        </div>
      )}

      {!isFixture && (template === 'cabinet' || template === 'bookshelf' || template === 'door-cabinet') && (
        <div className="form-row">
          <label>Shelves</label>
          <input type="number" value={shelves} min={0} max={20}
            onChange={(e) => setShelves(Number(e.target.value))} />
        </div>
      )}

      {template === 'door-cabinet' && (
        <div className="form-row">
          <label>Doors</label>
          <input type="number" value={doors} min={1} max={2}
            onChange={(e) => setDoors(Number(e.target.value))} />
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
        {isFixture ? '📌 Add Fixture' : `+ Add ${template === 'door-cabinet' ? 'Door Cabinet' : template}`}
      </button>
    </div>
  );
}
