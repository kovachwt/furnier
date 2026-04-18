# CSV Export

## Overview

The Cut List modal now includes a **📊 CSV** button alongside the existing **📄 PDF** export. Clicking it downloads a multi-sheet CSV file containing the complete project data: panel cut list, bill of materials, sheet layouts, and assembly order.

## Where it lives

| File | Role |
|---|---|
| `src/utils/cutlist.ts` | `generateCutListCSV()` + `downloadCSV()` |
| `src/components/cutlist/CutListView.tsx` | CSV export button handler |

## CSV Structure

The exported CSV contains four sections separated by blank lines:

### 1. Panel Cut List
| Column | Description |
|---|---|
| Piece Name | Furniture piece name (e.g., "Cabinet") |
| Panel Name | Individual panel name (e.g., "Left Side", "Shelf 1") |
| Width (mm) | Panel width in millimeters |
| Height (mm) | Panel height in millimeters |
| Depth (mm) | Panel thickness (material thickness) |
| Material | Material name from project materials |
| Edge Banding | Four-character code: T/B/L/R (Y/N) |
| Rotatable | Always "Yes" |

### 2. Bill of Materials
| Column | Description |
|---|---|
| Category | "Panels" or "Hardware" |
| Item | Material name or hardware description |
| Specification | Panel dimensions or hardware specs |
| Quantity | Count |

### 3. Sheet Layouts
| Column | Description |
|---|---|
| Sheet # | Sheet number (1-based) |
| Material | Material name |
| Panel | Panel name on the sheet |
| Piece | Parent piece name |
| X (mm) | X position on the sheet |
| Y (mm) | Y position on the sheet |
| Width/Height | Panel dimensions (may be swapped if rotated) |
| Rotated | "Yes" if panel was rotated on the sheet |
| Waste % | Sheet waste percentage |

### 4. Assembly Order
| Column | Description |
|---|---|
| Step | Sequential step number |
| Piece | Furniture piece name |
| Component | Component name |
| Type | "panel", "leg", "hinge", etc. |
| Dimensions | Component dimensions |
| Position | XYZ coordinates |

## Usage

1. Open the Cut List modal (📋 button in sidebar).
2. Click **📊 CSV**.
3. A file named `<ProjectName>_cutlist.csv` downloads automatically.
4. Open in any spreadsheet application (Excel, Google Sheets, LibreOffice Calc).

## Technical Notes

- CSV fields containing commas, quotes, or newlines are properly escaped.
- Fixture pieces are excluded from all sections (same as PDF export).
- The CSV uses UTF-8 encoding with `\n` line endings.
- File download uses a Blob + ObjectURL pattern — no server round-trip.
