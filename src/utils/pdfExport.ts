import { jsPDF } from 'jspdf';
import type { SheetLayout, Material, FurniturePiece, Panel } from '../types';
import type { BOMEntry } from './cutlist';

const PAGE_W = 210; // A4 portrait width mm
const PAGE_H = 297; // A4 portrait height mm
const MARGIN = 15;
const CONTENT_W = PAGE_W - 2 * MARGIN;

const COLORS: [number, number, number][] = [
  [74, 158, 255], [255, 107, 107], [81, 207, 102], [255, 212, 59], [204, 93, 232],
  [255, 146, 43], [32, 201, 151], [116, 143, 252], [240, 101, 149], [105, 219, 122],
];

function drawTitlePage(doc: jsPDF, projectName: string, layoutCount: number, pieceCount: number, sawKerf: number) {
  doc.setFontSize(28);
  doc.setTextColor(30, 30, 60);
  doc.text(projectName, PAGE_W / 2, 60, { align: 'center' });

  doc.setFontSize(14);
  doc.setTextColor(80, 80, 100);
  doc.text('Furniture Design — Cut List & Assembly', PAGE_W / 2, 78, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(120, 120, 140);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, PAGE_W / 2, 92, { align: 'center' });

  // Summary box
  const boxY = 110;
  doc.setFillColor(245, 245, 250);
  doc.setDrawColor(200, 200, 210);
  doc.roundedRect(MARGIN + 20, boxY, CONTENT_W - 40, 50, 3, 3, 'FD');

  doc.setFontSize(11);
  doc.setTextColor(50, 50, 70);
  doc.text(`Total Sheets: ${layoutCount}`, PAGE_W / 2, boxY + 15, { align: 'center' });
  doc.text(`Total Furniture Pieces: ${pieceCount}`, PAGE_W / 2, boxY + 28, { align: 'center' });
  doc.text(`Saw Kerf: ${sawKerf} mm`, PAGE_W / 2, boxY + 41, { align: 'center' });
}

function drawSheetLayout(doc: jsPDF, layout: SheetLayout, materials: Material[]) {
  doc.addPage('a4', 'portrait');

  const mat = materials.find(m => m.id === layout.materialId);
  const sheetW = mat?.sheetWidth ?? 2440;
  const sheetH = mat?.sheetHeight ?? 1220;

  // Header
  doc.setFontSize(14);
  doc.setTextColor(30, 30, 60);
  doc.text(`Sheet ${layout.sheetIndex + 1}: ${mat?.name ?? 'Unknown Material'}`, MARGIN, MARGIN + 8);

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 120);
  doc.text(
    `${sheetW} × ${sheetH} mm  ·  ${layout.placements.length} panels  ·  ${layout.wastePercent}% waste`,
    MARGIN, MARGIN + 17
  );

  // Sheet diagram
  const drawW = CONTENT_W;
  const drawH = (drawW * sheetH) / sheetW;
  const offsetY = MARGIN + 24;
  const scale = drawW / sheetW;

  // Sheet background
  doc.setFillColor(248, 244, 238);
  doc.setDrawColor(150, 150, 150);
  doc.rect(MARGIN, offsetY, drawW, drawH, 'FD');

  // Place panels
  for (let i = 0; i < layout.placements.length; i++) {
    const p = layout.placements[i];
    const pw = (p.rotated ? p.piece.height : p.piece.width) * scale;
    const ph = (p.rotated ? p.piece.width : p.piece.height) * scale;
    const px = MARGIN + p.x * scale;
    const py = offsetY + p.y * scale;

    const color = COLORS[i % COLORS.length];
    doc.setFillColor(color[0], color[1], color[2]);
    doc.setDrawColor(50, 50, 50);
    doc.rect(px, py, pw, ph, 'FD');

    // Label — only if panel is large enough
    if (pw > 12 && ph > 8) {
      const fontSize = Math.min(7, pw / 5, ph / 3);
      doc.setFontSize(fontSize);
      doc.setTextColor(255, 255, 255);
      doc.text(p.piece.panelName, px + pw / 2, py + ph / 2 - 1, { align: 'center' });

      const dimFontSize = Math.min(5.5, pw / 6, ph / 4);
      doc.setFontSize(dimFontSize);
      doc.text(
        `${p.piece.width}×${p.piece.height}${p.rotated ? ' ↻' : ''}`,
        px + pw / 2, py + ph / 2 + dimFontSize * 0.5 + 1,
        { align: 'center' }
      );
    }
  }

  // Cut list table below diagram
  const tableY = offsetY + drawH + 12;
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 60);
  doc.text('Panel Details', MARGIN, tableY);

  let y = tableY + 6;
  doc.setFontSize(8);
  doc.setFillColor(235, 235, 245);
  doc.rect(MARGIN, y - 3, CONTENT_W, 5, 'F');
  doc.setTextColor(80, 80, 100);
  doc.text('Panel', MARGIN + 2, y);
  doc.text('Piece', MARGIN + 45, y);
  doc.text('Dimensions', MARGIN + 100, y);
  doc.text('Rotated', MARGIN + 145, y);
  y += 6;

  doc.setTextColor(50, 50, 70);
  for (const p of layout.placements) {
    if (y > PAGE_H - MARGIN - 5) break; // avoid overflow
    doc.text(p.piece.panelName, MARGIN + 2, y);
    doc.text(p.piece.pieceName, MARGIN + 45, y);
    doc.text(`${p.piece.width} × ${p.piece.height} mm`, MARGIN + 100, y);
    doc.text(p.rotated ? 'Yes' : 'No', MARGIN + 145, y);
    y += 5;
  }
}

function drawBOM(doc: jsPDF, bom: BOMEntry[], layouts: SheetLayout[], materials: Material[]) {
  doc.addPage('a4', 'portrait');

  doc.setFontSize(16);
  doc.setTextColor(30, 30, 60);
  doc.text('Bill of Materials', MARGIN, MARGIN + 8);

  let y = MARGIN + 18;

  // Table header
  doc.setFontSize(9);
  doc.setFillColor(235, 235, 245);
  doc.rect(MARGIN, y - 3.5, CONTENT_W, 6, 'F');
  doc.setTextColor(80, 80, 100);
  doc.text('Category', MARGIN + 2, y);
  doc.text('Item', MARGIN + 30, y);
  doc.text('Specification', MARGIN + 85, y);
  doc.text('Qty', MARGIN + 165, y);
  y += 7;

  doc.setTextColor(50, 50, 70);
  doc.setFontSize(8.5);

  for (const entry of bom) {
    if (y > PAGE_H - MARGIN - 10) {
      doc.addPage('a4', 'portrait');
      y = MARGIN + 8;
    }
    doc.text(entry.category, MARGIN + 2, y);
    doc.text(entry.name, MARGIN + 30, y);
    // Truncate long specs
    const spec = entry.specification.length > 50
      ? entry.specification.substring(0, 47) + '...'
      : entry.specification;
    doc.text(spec, MARGIN + 85, y);
    doc.text(String(entry.quantity), MARGIN + 165, y);
    y += 5.5;
  }

  // Sheet totals
  y += 4;
  doc.setDrawColor(180, 180, 190);
  doc.line(MARGIN, y - 3, PAGE_W - MARGIN, y - 3);

  doc.setFontSize(9);
  doc.setTextColor(30, 30, 60);
  doc.text('Sheet Requirements', MARGIN + 2, y);
  y += 7;

  const sheetCounts = new Map<string, number>();
  for (const l of layouts) {
    sheetCounts.set(l.materialId, (sheetCounts.get(l.materialId) ?? 0) + 1);
  }

  doc.setFontSize(8.5);
  doc.setTextColor(50, 50, 70);
  for (const [matId, count] of sheetCounts) {
    const mat = materials.find(m => m.id === matId);
    doc.text(mat?.name ?? matId, MARGIN + 2, y);
    doc.text(mat ? `${mat.sheetWidth} × ${mat.sheetHeight} mm` : '', MARGIN + 85, y);
    doc.text(String(count), MARGIN + 165, y);
    y += 5.5;
  }
}

function drawAssembly(doc: jsPDF, pieces: FurniturePiece[], materials: Material[]) {
  doc.addPage('a4', 'portrait');

  doc.setFontSize(16);
  doc.setTextColor(30, 30, 60);
  doc.text('Assembly Instructions', MARGIN, MARGIN + 8);

  let y = MARGIN + 20;

  for (let pi = 0; pi < pieces.length; pi++) {
    const piece = pieces[pi];

    if (y > PAGE_H - MARGIN - 30) {
      doc.addPage('a4', 'portrait');
      y = MARGIN + 8;
    }

    // Piece header
    doc.setFontSize(12);
    doc.setTextColor(30, 60, 120);
    doc.text(`${pi + 1}. ${piece.name}`, MARGIN, y);
    y += 3;
    doc.setDrawColor(74, 158, 255);
    doc.line(MARGIN, y, MARGIN + 80, y);
    y += 6;

    doc.setFontSize(8);
    doc.setTextColor(100, 100, 120);
    doc.text(
      `Position: (${piece.position.map(v => Math.round(v)).join(', ')}) mm  ·  ${piece.components.length} components`,
      MARGIN + 4, y
    );
    y += 7;

    // Panels first, sorted bottom-up
    const panels = piece.components
      .filter(c => c.type === 'panel')
      .sort((a, b) => a.position[1] - b.position[1]);

    doc.setFontSize(9);
    doc.setTextColor(50, 50, 70);

    let step = 1;
    for (const comp of panels) {
      if (y > PAGE_H - MARGIN - 5) {
        doc.addPage('a4', 'portrait');
        y = MARGIN + 8;
      }
      const p = comp as Panel;
      const mat = materials.find(m => m.id === p.materialId);
      doc.text(
        `${step}. Place "${p.name}" — ${p.width}×${p.height}×${p.depth}mm (${mat?.name ?? 'unknown'})`,
        MARGIN + 6, y
      );
      y += 5;

      // Edge banding note
      const edges = (['top', 'bottom', 'left', 'right'] as const)
        .filter(e => p.edgeBanding[e]);
      if (edges.length > 0) {
        doc.setFontSize(7.5);
        doc.setTextColor(130, 130, 150);
        doc.text(`     Edge banding: ${edges.join(', ')}`, MARGIN + 6, y);
        y += 4;
        doc.setFontSize(9);
        doc.setTextColor(50, 50, 70);
      }
      step++;
    }

    // Hardware
    const hardware = piece.components.filter(c => c.type !== 'panel');
    for (const comp of hardware) {
      if (y > PAGE_H - MARGIN - 5) {
        doc.addPage('a4', 'portrait');
        y = MARGIN + 8;
      }
      doc.text(`${step}. Attach "${comp.name}" (${comp.type})`, MARGIN + 6, y);
      y += 5;
      step++;
    }

    y += 6;
  }
}

/**
 * Export the full project as a PDF document.
 */
export function exportProjectPDF(
  projectName: string,
  layouts: SheetLayout[],
  bom: BOMEntry[],
  pieces: FurniturePiece[],
  materials: Material[],
  sawKerf: number
): void {
  const doc = new jsPDF('portrait', 'mm', 'a4');

  // Title page
  drawTitlePage(doc, projectName, layouts.length, pieces.length, sawKerf);

  // Sheet layouts
  for (const layout of layouts) {
    drawSheetLayout(doc, layout, materials);
  }

  // BOM
  drawBOM(doc, bom, layouts, materials);

  // Assembly
  drawAssembly(doc, pieces, materials);

  doc.save(`${projectName.replace(/\s+/g, '_')}_cutlist.pdf`);
}
