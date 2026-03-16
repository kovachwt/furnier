import type { FurniturePiece, Material, CutPiece, SheetLayout, Panel } from '../types';

/**
 * Extract all panels from all pieces, grouped by material.
 */
export function extractCutPieces(pieces: FurniturePiece[]): CutPiece[] {
  const cutPieces: CutPiece[] = [];

  for (const piece of pieces) {
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
