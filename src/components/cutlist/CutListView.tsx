import { useMemo, useCallback } from 'react';
import { useStore } from '../../store/useStore';
import { generateCutList, generateBOM } from '../../utils/cutlist';
import { exportProjectPDF } from '../../utils/pdfExport';
import type { SheetLayout } from '../../types';

export function CutListView({ onClose }: { onClose: () => void }) {
  const pieces = useStore((s) => s.project.pieces);
  const materials = useStore((s) => s.project.materials);
  const sawKerf = useStore((s) => s.sawKerf);
  const projectName = useStore((s) => s.project.name);

  const { layouts, unplaceable } = useMemo(
    () => generateCutList(pieces, materials, sawKerf),
    [pieces, materials, sawKerf]
  );

  const bom = useMemo(() => generateBOM(pieces, materials), [pieces, materials]);

  const handleExportPDF = useCallback(() => {
    exportProjectPDF(projectName, layouts, bom, pieces, materials, sawKerf);
  }, [projectName, layouts, bom, pieces, materials, sawKerf]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content cutlist-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Cut List & Parts</h2>
          <div className="modal-header-actions">
            <button className="btn-primary" onClick={handleExportPDF}>📄 Export PDF</button>
            <button className="btn-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="modal-body">
          {/* Saw kerf setting */}
          <div className="form-row" style={{ marginBottom: 16 }}>
            <label>Saw Kerf (mm)</label>
            <input
              type="number"
              value={sawKerf}
              min={0}
              max={10}
              step={0.5}
              onChange={(e) => useStore.getState().setSawKerf(Number(e.target.value))}
              style={{ width: 80 }}
            />
          </div>

          {/* Sheet layouts */}
          <h3>Sheet Layouts ({layouts.length} sheets)</h3>
          {layouts.map((layout) => (
            <SheetDiagram key={layout.sheetIndex} layout={layout} materials={materials} />
          ))}

          {unplaceable.length > 0 && (
            <div className="warning-box">
              <h4>⚠ Could not place {unplaceable.length} panels:</h4>
              {unplaceable.map((p, i) => (
                <div key={i}>{p.pieceName} / {p.panelName}: {p.width}×{p.height}mm</div>
              ))}
            </div>
          )}

          {/* BOM */}
          <h3 style={{ marginTop: 24 }}>Bill of Materials</h3>
          <table className="bom-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Item</th>
                <th>Specification</th>
                <th>Qty</th>
              </tr>
            </thead>
            <tbody>
              {bom.map((entry, i) => (
                <tr key={i}>
                  <td>{entry.category}</td>
                  <td>{entry.name}</td>
                  <td>{entry.specification}</td>
                  <td>{entry.quantity}</td>
                </tr>
              ))}
              {/* Sheet totals */}
              {(() => {
                const sheetCounts = new Map<string, number>();
                for (const l of layouts) {
                  sheetCounts.set(l.materialId, (sheetCounts.get(l.materialId) ?? 0) + 1);
                }
                return Array.from(sheetCounts).map(([matId, count]) => {
                  const mat = materials.find(m => m.id === matId);
                  return (
                    <tr key={`sheet-${matId}`} className="sheet-total-row">
                      <td>Sheets</td>
                      <td>{mat?.name ?? matId}</td>
                      <td>{mat ? `${mat.sheetWidth}×${mat.sheetHeight}mm` : ''}</td>
                      <td>{count}</td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>

          {/* Assembly Notes */}
          <h3 style={{ marginTop: 24 }}>Assembly Order</h3>
          <div className="assembly-notes">
            {pieces.map((piece, pi) => (
              <div key={piece.id} className="assembly-piece">
                <h4>{pi + 1}. {piece.name}</h4>
                <ol className="assembly-steps">
                  {piece.components
                    .filter(c => c.type === 'panel')
                    .sort((a, b) => {
                      // Bottom-up: sort by Y position
                      return a.position[1] - b.position[1];
                    })
                    .map((comp) => (
                      <li key={comp.id}>
                        Place <strong>{comp.name}</strong>
                        {comp.type === 'panel' && ` (${comp.width}×${comp.height}×${comp.depth}mm)`}
                        {' '}at position ({comp.position.map(v => Math.round(v)).join(', ')})
                      </li>
                    ))}
                  {piece.components
                    .filter(c => c.type !== 'panel')
                    .map((comp) => (
                      <li key={comp.id}>
                        Attach <strong>{comp.name}</strong> ({comp.type})
                      </li>
                    ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SheetDiagram({
  layout,
  materials,
}: {
  layout: SheetLayout;
  materials: any[];
}) {
  const mat = materials.find((m: any) => m.id === layout.materialId);
  const sheetW = mat?.sheetWidth ?? 2440;
  const sheetH = mat?.sheetHeight ?? 1220;

  const CANVAS_W = 600;
  const CANVAS_H = (CANVAS_W * sheetH) / sheetW;
  const scale = CANVAS_W / sheetW;

  const colors = [
    '#4a9eff', '#ff6b6b', '#51cf66', '#ffd43b', '#cc5de8',
    '#ff922b', '#20c997', '#748ffc', '#f06595', '#69db7c',
  ];

  return (
    <div className="sheet-diagram">
      <div className="sheet-header">
        <span>Sheet {layout.sheetIndex + 1}: {mat?.name ?? 'Unknown'}</span>
        <span>{layout.placements.length} panels · {layout.wastePercent}% waste</span>
      </div>
      <svg
        width={CANVAS_W}
        height={CANVAS_H}
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        className="sheet-svg"
      >
        {/* Sheet background */}
        <rect x={0} y={0} width={CANVAS_W} height={CANVAS_H}
          fill="#f8f4ee" stroke="#999" strokeWidth={1} />

        {/* Placed panels */}
        {layout.placements.map((p, i) => {
          const pw = (p.rotated ? p.piece.height : p.piece.width) * scale;
          const ph = (p.rotated ? p.piece.width : p.piece.height) * scale;
          const px = p.x * scale;
          const py = p.y * scale;
          return (
            <g key={i}>
              <rect
                x={px}
                y={py}
                width={pw}
                height={ph}
                fill={colors[i % colors.length]}
                fillOpacity={0.7}
                stroke="#333"
                strokeWidth={0.5}
              />
              <text
                x={px + pw / 2}
                y={py + ph / 2 - 6}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={Math.min(10, pw / 6)}
                fill="#000"
              >
                {p.piece.panelName}
              </text>
              <text
                x={px + pw / 2}
                y={py + ph / 2 + 6}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={Math.min(8, pw / 8)}
                fill="#333"
              >
                {p.piece.width}×{p.piece.height}{p.rotated ? ' ↻' : ''}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
