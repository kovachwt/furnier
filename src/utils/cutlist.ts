import type { FurniturePiece, Material, CutPiece, SheetLayout, Panel } from '../types';

/**
 * Extract all panels from all pieces, grouped by material.
 */
export function extractCutPieces(pieces: FurniturePiece[]): CutPiece[] {
  const cutPieces: CutPiece[] = [];

  for (const piece of pieces) {
    if (piece.isFixture) continue; // Skip fixtures — not real material
    for (const comp of piece.components) {
      if (comp.type === 'panel') {
        const panel = comp as Panel;
        cutPieces.push({
          panelId: panel.id,
          pieceName: piece.name,
          panelName: panel.name,
          width: panel.width,
          height: panel.height,
          materialId: panel.materialId,
          edgeBanding: { ...panel.edgeBanding },
          rotatable: true,
        });
      }
    }
  }

  return cutPieces;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Guillotine bin packing with Best Short Side Fit heuristic.
 * Accounts for saw kerf on each cut.
 */
function guillotinePack(
  pieces: CutPiece[],
  sheetW: number,
  sheetH: number,
  kerf: number,
  grainLocked: boolean
): SheetLayout[] {
  const layouts: SheetLayout[] = [];
  const remaining = [...pieces];

  // Sort by area descending
  remaining.sort((a, b) => (b.width * b.height) - (a.width * a.height));

  while (remaining.length > 0) {
    const placements: SheetLayout['placements'] = [];
    const freeRects: Rect[] = [{ x: 0, y: 0, w: sheetW, h: sheetH }];
    const placed: number[] = [];

    for (let pi = 0; pi < remaining.length; pi++) {
      const piece = remaining[pi];
      const pw = piece.width;
      const ph = piece.height;

      let bestRect = -1;
      let bestRotated = false;
      let bestScore = Infinity;

      for (let ri = 0; ri < freeRects.length; ri++) {
        const r = freeRects[ri];

        // Try normal orientation
        if (pw <= r.w && ph <= r.h) {
          const score = Math.min(r.w - pw, r.h - ph);
          if (score < bestScore) {
            bestScore = score;
            bestRect = ri;
            bestRotated = false;
          }
        }

        // Try rotated (if allowed)
        if (!grainLocked && piece.rotatable && ph <= r.w && pw <= r.h) {
          const score = Math.min(r.w - ph, r.h - pw);
          if (score < bestScore) {
            bestScore = score;
            bestRect = ri;
            bestRotated = true;
          }
        }
      }

      if (bestRect >= 0) {
        const r = freeRects[bestRect];
        const w = bestRotated ? ph : pw;
        const h = bestRotated ? pw : ph;

        placements.push({
          piece,
          x: r.x,
          y: r.y,
          rotated: bestRotated,
        });
        placed.push(pi);

        // Split the free rectangle (guillotine split)
        // Choose split axis that leaves the larger remaining area
        freeRects.splice(bestRect, 1);

        const rightW = r.w - w - kerf;
        const topH = r.h - h - kerf;

        if (rightW > 0 && topH > 0) {
          // Split along shorter axis for better packing
          if (rightW * r.h > r.w * topH) {
            // Vertical split first
            freeRects.push({ x: r.x + w + kerf, y: r.y, w: rightW, h: r.h });
            freeRects.push({ x: r.x, y: r.y + h + kerf, w: w, h: topH });
          } else {
            // Horizontal split first
            freeRects.push({ x: r.x, y: r.y + h + kerf, w: r.w, h: topH });
            freeRects.push({ x: r.x + w + kerf, y: r.y, w: rightW, h: h });
          }
        } else if (rightW > 0) {
          freeRects.push({ x: r.x + w + kerf, y: r.y, w: rightW, h: r.h });
        } else if (topH > 0) {
          freeRects.push({ x: r.x, y: r.y + h + kerf, w: r.w, h: topH });
        }
      }
    }

    // Remove placed pieces from remaining
    for (let i = placed.length - 1; i >= 0; i--) {
      remaining.splice(placed[i], 1);
    }

    if (placements.length === 0) {
      // Some pieces don't fit any sheet — break to avoid infinite loop
      console.warn('Could not place pieces:', remaining);
      break;
    }

    const usedArea = placements.reduce((sum, p) => {
      return sum + p.piece.width * p.piece.height;
    }, 0);
    const totalArea = sheetW * sheetH;

    layouts.push({
      sheetIndex: layouts.length,
      materialId: pieces[0]?.materialId ?? '',
      placements,
      wastePercent: Math.round(((totalArea - usedArea) / totalArea) * 100),
    });
  }

  return layouts;
}

/**
 * Generate complete cut list optimization.
 */
export function generateCutList(
  pieces: FurniturePiece[],
  materials: Material[],
  sawKerf: number
): { layouts: SheetLayout[]; unplaceable: CutPiece[] } {
  const allPieces = extractCutPieces(pieces);

  // Group by material
  const byMaterial = new Map<string, CutPiece[]>();
  for (const p of allPieces) {
    const list = byMaterial.get(p.materialId) ?? [];
    list.push(p);
    byMaterial.set(p.materialId, list);
  }

  const allLayouts: SheetLayout[] = [];
  const unplaceable: CutPiece[] = [];

  for (const [matId, matPieces] of byMaterial) {
    const mat = materials.find(m => m.id === matId);
    if (!mat) {
      unplaceable.push(...matPieces);
      continue;
    }

    const layouts = guillotinePack(
      matPieces,
      mat.sheetWidth,
      mat.sheetHeight,
      sawKerf,
      mat.grainDirection
    );

    for (const layout of layouts) {
      layout.materialId = matId;
      layout.sheetIndex = allLayouts.length;
      allLayouts.push(layout);
    }
  }

  return { layouts: allLayouts, unplaceable };
}

/**
 * Generate a parts list (BOM without cost).
 */
export interface BOMEntry {
  category: string;
  name: string;
  specification: string;
  quantity: number;
}

export function generateBOM(pieces: FurniturePiece[], materials: Material[]): BOMEntry[] {
  const entries: BOMEntry[] = [];
  const panelMap = new Map<string, { count: number; dims: string[] }>();
  const hardwareMap = new Map<string, number>();

  for (const piece of pieces) {
    if (piece.isFixture) continue; // Skip fixtures
    for (const comp of piece.components) {
      if (comp.type === 'panel') {
        const key = comp.materialId;
        const entry = panelMap.get(key) ?? { count: 0, dims: [] };
        entry.count++;
        entry.dims.push(`${comp.width}×${comp.height}mm`);
        panelMap.set(key, entry);
      } else if (comp.type === 'leg') {
        const key = `${comp.style} leg ${comp.diameter}mm ø × ${comp.height}mm`;
        hardwareMap.set(key, (hardwareMap.get(key) ?? 0) + 1);
      } else if (comp.type === 'hinge') {
        const key = `${comp.hingeType} hinge`;
        hardwareMap.set(key, (hardwareMap.get(key) ?? 0) + 1);
      } else if (comp.type === 'drawer-slide') {
        const key = `${comp.slideType} drawer slide ${comp.length}mm`;
        hardwareMap.set(key, (hardwareMap.get(key) ?? 0) + 1);
      } else if (comp.type === 'shelf-pin') {
        hardwareMap.set('shelf pin', (hardwareMap.get('shelf pin') ?? 0) + 1);
      } else if (comp.type === 'handle') {
        const key = `${comp.handleType === 'knob' ? 'Knob' : 'Pull'} ${comp.diameter}mm`;
        hardwareMap.set(key, (hardwareMap.get(key) ?? 0) + 1);
      }
    }
  }

  // Panel entries (grouped by material)
  for (const [matId, data] of panelMap) {
    const mat = materials.find(m => m.id === matId);
    entries.push({
      category: 'Panels',
      name: mat?.name ?? matId,
      specification: `${data.count} panels: ${data.dims.join(', ')}`,
      quantity: data.count,
    });
  }

  // Hardware entries
  for (const [name, qty] of hardwareMap) {
    entries.push({
      category: 'Hardware',
      name,
      specification: '',
      quantity: qty,
    });
  }

  return entries;
}

/**
 * Edge-banding side names.
 */
const SIDE_NAMES = ['top', 'bottom', 'left', 'right'] as const;

/**
 * Edge-banding length estimate per side.
 */
export interface EdgeBandingEstimate {
  side: string;
  totalLengthMm: number;
  totalLengthM: number;
  panelCount: number;
}

/**
 * Calculate total edge-banding length needed per side.
 * Returns an estimate for top/bottom/left/right edges.
 */
export function generateEdgeBandingEstimate(pieces: FurniturePiece[]): EdgeBandingEstimate[] {
  const totals: Record<string, { length: number; count: number }> = {
    top: { length: 0, count: 0 },
    bottom: { length: 0, count: 0 },
    left: { length: 0, count: 0 },
    right: { length: 0, count: 0 },
  };

  for (const piece of pieces) {
    if (piece.isFixture) continue;
    for (const comp of piece.components) {
      if (comp.type !== 'panel') continue;
      const panel = comp as Panel;
      for (const side of SIDE_NAMES) {
        if (panel.edgeBanding[side]) {
          // For horizontal edges (top/bottom), the banding runs along the width
          // For vertical edges (left/right), the banding runs along the height
          const length = (side === 'top' || side === 'bottom') ? panel.width : panel.height;
          totals[side].length += length;
          totals[side].count++;
        }
      }
    }
  }

  return SIDE_NAMES.map(side => ({
    side: side.charAt(0).toUpperCase() + side.slice(1),
    totalLengthMm: totals[side].length,
    totalLengthM: Math.round(totals[side].length / 10) / 100, // round to 2 decimal places
    panelCount: totals[side].count,
  }));
}

/**
 * Export the cut list as a CSV string.
 * Includes three sheets: Panels, BOM, and Sheet Layouts.
 */
export function generateCutListCSV(
  pieces: FurniturePiece[],
  materials: Material[],
  sawKerf: number
): string {
  const { layouts, unplaceable } = generateCutList(pieces, materials, sawKerf);
  const bom = generateBOM(pieces, materials);

  const lines: string[] = [];
  const sep = ',';

  function csvRow(...fields: (string | number)[]): string {
    return fields.map(f => {
      const s = String(f);
      // Escape quotes and wrap in quotes if contains comma/quote/newline
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    }).join(sep);
  }

  // ── Sheet 1: Panels ──
  lines.push('Panel Cut List');
  lines.push(csvRow('Piece Name', 'Panel Name', 'Width (mm)', 'Height (mm)', 'Depth (mm)', 'Material', 'Edge Banding (T/B/L/R)', 'Rotatable'));

  for (const piece of pieces) {
    if (piece.isFixture) continue;
    for (const comp of piece.components) {
      if (comp.type !== 'panel') continue;
      const panel = comp as Panel;
      const mat = materials.find(m => m.id === panel.materialId);
      const eb = [panel.edgeBanding.top, panel.edgeBanding.bottom, panel.edgeBanding.left, panel.edgeBanding.right]
        .map(e => e ? 'Y' : 'N').join('');
      lines.push(csvRow(
        piece.name, panel.name,
        panel.width, panel.height, panel.depth,
        mat?.name ?? panel.materialId,
        eb, 'Yes'
      ));
    }
  }

  // Unplaceable panels
  if (unplaceable.length > 0) {
    lines.push(csvRow('', '⚠ Could not fit on any sheet:', '', '', '', '', '', ''));
    for (const p of unplaceable) {
      lines.push(csvRow(p.pieceName, p.panelName, p.width, p.height, '', '', '', ''));
    }
  }

  // Blank line separator
  lines.push('');

  // ── Sheet 2: Bill of Materials ──
  lines.push('Bill of Materials');
  lines.push(csvRow('Category', 'Item', 'Specification', 'Quantity'));

  for (const entry of bom) {
    lines.push(csvRow(entry.category, entry.name, entry.specification, entry.quantity));
  }

  // Sheet totals
  const sheetCounts = new Map<string, number>();
  for (const l of layouts) {
    const mat = materials.find(m => m.id === l.materialId);
    const key = mat?.name ?? l.materialId;
    sheetCounts.set(key, (sheetCounts.get(key) ?? 0) + 1);
  }
  for (const [name, count] of sheetCounts) {
    lines.push(csvRow('Sheets', name, '', count));
  }

  // Blank line separator
  lines.push('');

  // ── Sheet 3: Sheet Layouts ──
  lines.push('Sheet Layouts');
  lines.push(csvRow('Sheet #', 'Material', 'Panel', 'Piece', 'X (mm)', 'Y (mm)', 'Width (mm)', 'Height (mm)', 'Rotated', 'Waste %'));

  for (const layout of layouts) {
    const mat = materials.find(m => m.id === layout.materialId);
    for (const placement of layout.placements) {
      const pw = placement.rotated ? placement.piece.height : placement.piece.width;
      const ph = placement.rotated ? placement.piece.width : placement.piece.height;
      lines.push(csvRow(
        layout.sheetIndex + 1,
        mat?.name ?? layout.materialId,
        placement.piece.panelName,
        placement.piece.pieceName,
        placement.x, placement.y,
        pw, ph,
        placement.rotated ? 'Yes' : 'No',
        layout.wastePercent
      ));
    }
  }

  // Blank line separator
  lines.push('');

  // ── Sheet 4: Assembly Order ──
  lines.push('Assembly Order');
  lines.push(csvRow('Step', 'Piece', 'Component', 'Type', 'Dimensions (mm)', 'Position (mm)'));

  let step = 1;
  for (const piece of pieces) {
    // Panels (sorted bottom-up)
    const panels = piece.components
      .filter(c => c.type === 'panel')
      .sort((a, b) => a.position[1] - b.position[1]) as Panel[];
    for (const comp of panels) {
      lines.push(csvRow(step++, piece.name, comp.name, comp.type,
        `${comp.width}×${comp.height}×${comp.depth}`, comp.position.map(v => Math.round(v)).join(', ')));
    }
    // Hardware
    for (const comp of piece.components) {
      if (comp.type === 'panel') continue;
      const dims = comp.type === 'leg'
        ? `${comp.diameter}mm ø × ${comp.height}mm`
        : comp.type === 'handle'
          ? `${comp.diameter}mm`
          : comp.type === 'drawer-slide'
            ? `${comp.length}mm`
            : '';
      lines.push(csvRow(step++, piece.name, comp.name, comp.type, dims, comp.position.map(v => Math.round(v)).join(', ')));
    }
  }

  return lines.join('\n');
}

/**
 * Download a CSV string as a file.
 */
export function downloadCSV(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
