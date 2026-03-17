import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { produce } from 'immer';
import { v4 as uuid } from 'uuid';
import type {
  Project, Room, FurniturePiece, Component, Material, Tool,
  ParametricConstraint, CabinetParams, BookshelfParams, DeskParams, DresserParams, DoorCabinetParams,
} from '../types';
import type { SnapLine } from '../utils/snap';
import { createCabinet, createBookshelf, createDesk, createDresser, createDoorCabinet } from '../utils/templates';

const DEFAULT_MATERIALS: Material[] = [
  // --- Melamine-faced chipboard (European standard 2800×2070) ---
  {
    id: 'melamine-white-16',
    name: 'White Melamine 16mm (2800×2070)',
    thickness: 16,
    sheetWidth: 2800,
    sheetHeight: 2070,
    color: '#f0ede8',
    grainDirection: false,
  },
  {
    id: 'melamine-white-18',
    name: 'White Melamine 18mm (2800×2070)',
    thickness: 18,
    sheetWidth: 2800,
    sheetHeight: 2070,
    color: '#f0ede8',
    grainDirection: false,
  },
  {
    id: 'melamine-white-25',
    name: 'White Melamine 25mm (2800×2070)',
    thickness: 25,
    sheetWidth: 2800,
    sheetHeight: 2070,
    color: '#f0ede8',
    grainDirection: false,
  },
  {
    id: 'melamine-oak-16',
    name: 'Oak Melamine 16mm (2800×2070)',
    thickness: 16,
    sheetWidth: 2800,
    sheetHeight: 2070,
    color: '#c8a96e',
    grainDirection: true,
  },
  {
    id: 'melamine-oak-18',
    name: 'Oak Melamine 18mm (2800×2070)',
    thickness: 18,
    sheetWidth: 2800,
    sheetHeight: 2070,
    color: '#c8a96e',
    grainDirection: true,
  },
  {
    id: 'melamine-walnut-18',
    name: 'Walnut Melamine 18mm (2800×2070)',
    thickness: 18,
    sheetWidth: 2800,
    sheetHeight: 2070,
    color: '#5c4033',
    grainDirection: true,
  },
  {
    id: 'melamine-grey-18',
    name: 'Grey Melamine 18mm (2800×2070)',
    thickness: 18,
    sheetWidth: 2800,
    sheetHeight: 2070,
    color: '#b0b0b0',
    grainDirection: false,
  },
  {
    id: 'melamine-black-18',
    name: 'Black Melamine 18mm (2800×2070)',
    thickness: 18,
    sheetWidth: 2800,
    sheetHeight: 2070,
    color: '#2a2a2a',
    grainDirection: false,
  },
  // --- Melamine chipboard (Kronospan 2750×1830) ---
  {
    id: 'melamine-white-16-2750',
    name: 'White Melamine 16mm (2750×1830)',
    thickness: 16,
    sheetWidth: 2750,
    sheetHeight: 1830,
    color: '#f0ede8',
    grainDirection: false,
  },
  {
    id: 'melamine-white-18-2750',
    name: 'White Melamine 18mm (2750×1830)',
    thickness: 18,
    sheetWidth: 2750,
    sheetHeight: 1830,
    color: '#f0ede8',
    grainDirection: false,
  },
  // --- Melamine chipboard (UK/international 2440×1220) ---
  {
    id: 'melamine-white-18-2440',
    name: 'White Melamine 18mm (2440×1220)',
    thickness: 18,
    sheetWidth: 2440,
    sheetHeight: 1220,
    color: '#f0ede8',
    grainDirection: false,
  },
  // --- Raw chipboard ---
  {
    id: 'chipboard-raw-16',
    name: 'Raw Chipboard 16mm (2750×1830)',
    thickness: 16,
    sheetWidth: 2750,
    sheetHeight: 1830,
    color: '#d2be8c',
    grainDirection: false,
  },
  {
    id: 'chipboard-raw-18',
    name: 'Raw Chipboard 18mm (2800×2070)',
    thickness: 18,
    sheetWidth: 2800,
    sheetHeight: 2070,
    color: '#d2be8c',
    grainDirection: false,
  },
  {
    id: 'chipboard-raw-22',
    name: 'Raw Chipboard 22mm (2800×2070)',
    thickness: 22,
    sheetWidth: 2800,
    sheetHeight: 2070,
    color: '#d2be8c',
    grainDirection: false,
  },
  // --- MDF ---
  {
    id: 'mdf-6',
    name: 'MDF 6mm (2800×2070)',
    thickness: 6,
    sheetWidth: 2800,
    sheetHeight: 2070,
    color: '#c4a882',
    grainDirection: false,
  },
  {
    id: 'mdf-12',
    name: 'MDF 12mm (2440×1220)',
    thickness: 12,
    sheetWidth: 2440,
    sheetHeight: 1220,
    color: '#c4a882',
    grainDirection: false,
  },
  {
    id: 'mdf-18',
    name: 'MDF 18mm (2800×2070)',
    thickness: 18,
    sheetWidth: 2800,
    sheetHeight: 2070,
    color: '#c4a882',
    grainDirection: false,
  },
  {
    id: 'mdf-22',
    name: 'MDF 22mm (2800×2070)',
    thickness: 22,
    sheetWidth: 2800,
    sheetHeight: 2070,
    color: '#c4a882',
    grainDirection: false,
  },
  // --- Birch plywood (European 2500×1250) ---
  {
    id: 'plywood-birch-6',
    name: 'Birch Plywood 6mm (2500×1250)',
    thickness: 6,
    sheetWidth: 2500,
    sheetHeight: 1250,
    color: '#d4b896',
    grainDirection: true,
  },
  {
    id: 'plywood-birch-12',
    name: 'Birch Plywood 12mm (2500×1250)',
    thickness: 12,
    sheetWidth: 2500,
    sheetHeight: 1250,
    color: '#d4b896',
    grainDirection: true,
  },
  {
    id: 'plywood-birch-15',
    name: 'Birch Plywood 15mm (2500×1250)',
    thickness: 15,
    sheetWidth: 2500,
    sheetHeight: 1250,
    color: '#d4b896',
    grainDirection: true,
  },
  {
    id: 'plywood-birch-18',
    name: 'Birch Plywood 18mm (2500×1250)',
    thickness: 18,
    sheetWidth: 2500,
    sheetHeight: 1250,
    color: '#d4b896',
    grainDirection: true,
  },
  {
    id: 'plywood-birch-24',
    name: 'Birch Plywood 24mm (2500×1250)',
    thickness: 24,
    sheetWidth: 2500,
    sheetHeight: 1250,
    color: '#d4b896',
    grainDirection: true,
  },
  // --- Hardboard / HDF ---
  {
    id: 'hardboard-3',
    name: 'Hardboard 3mm (2440×1220)',
    thickness: 3,
    sheetWidth: 2440,
    sheetHeight: 1220,
    color: '#8b7355',
    grainDirection: false,
  },
];

const DEFAULT_ROOM: Room = {
  width: 4000,
  depth: 3000,
  height: 2500,
};

interface HistoryEntry {
  pieces: FurniturePiece[];
}

interface AppState {
  // Project
  project: Project;

  // UI state
  selectedPieceId: string | null;
  selectedComponentId: string | null;
  activeTool: Tool;
  snapEnabled: boolean;
  snapToFaces: boolean;
  snapThreshold: number; // mm
  showDimensions: boolean;
  showGrid: boolean;
  gridSize: number; // mm
  sawKerf: number; // mm

  // Exploded view
  explodedView: boolean;
  explodeFactor: number;

  // Snap guides
  activeSnapLines: SnapLine[];

  // History
  history: HistoryEntry[];
  historyIndex: number;

  // Room
  setRoom: (room: Partial<Room>) => void;

  // Pieces
  addPiece: (piece: Omit<FurniturePiece, 'id'>) => string;
  removePiece: (id: string) => void;
  updatePiece: (id: string, updates: Partial<FurniturePiece>) => void;
  duplicatePiece: (id: string) => string | null;
  regeneratePiece: (id: string, params: CabinetParams | BookshelfParams | DeskParams | DresserParams | DoorCabinetParams) => void;

  // Components
  addComponent: (pieceId: string, component: Omit<Component, 'id'>) => string | null;
  removeComponent: (pieceId: string, componentId: string) => void;
  updateComponent: (pieceId: string, componentId: string, updates: Partial<Component>) => void;

  // Constraints
  addConstraint: (pieceId: string, constraint: Omit<ParametricConstraint, 'id'>) => void;
  removeConstraint: (pieceId: string, constraintId: string) => void;

  // Materials
  addMaterial: (material: Omit<Material, 'id'>) => string;
  removeMaterial: (id: string) => void;
  updateMaterial: (id: string, updates: Partial<Material>) => void;

  // Selection
  setSelection: (pieceId: string | null, componentId?: string | null) => void;
  clearSelection: () => void;

  // Tools & toggles
  setActiveTool: (tool: Tool) => void;
  setSnapEnabled: (enabled: boolean) => void;
  setSnapToFaces: (enabled: boolean) => void;
  setShowDimensions: (show: boolean) => void;
  setShowGrid: (show: boolean) => void;
  setGridSize: (size: number) => void;
  setSawKerf: (kerf: number) => void;
  setExplodedView: (enabled: boolean) => void;
  setExplodeFactor: (factor: number) => void;
  setActiveSnapLines: (lines: SnapLine[]) => void;

  // History
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;

  // Persistence
  saveProject: () => string;
  loadProject: (json: string) => void;
  resetProject: () => void;
}

export const useStore = create<AppState>()(
  subscribeWithSelector((set, get) => ({
    project: {
      name: 'Untitled Project',
      room: { ...DEFAULT_ROOM },
      pieces: [],
      materials: [...DEFAULT_MATERIALS],
    },

    selectedPieceId: null,
    selectedComponentId: null,
    activeTool: 'select',
    snapEnabled: true,
    snapToFaces: true,
    snapThreshold: 25,
    showDimensions: true,
    showGrid: true,
    gridSize: 50,
    sawKerf: 3,

    explodedView: false,
    explodeFactor: 1.5,
    activeSnapLines: [],

    history: [],
    historyIndex: -1,

    setRoom: (room) =>
      set(produce((s: AppState) => {
        Object.assign(s.project.room, room);
      })),

    addPiece: (piece) => {
      const id = uuid();
      set(produce((s: AppState) => {
        s.project.pieces.push({ ...piece, id } as FurniturePiece);
      }));
      get().pushHistory();
      return id;
    },

    removePiece: (id) => {
      set(produce((s: AppState) => {
        s.project.pieces = s.project.pieces.filter((p) => p.id !== id);
        if (s.selectedPieceId === id) {
          s.selectedPieceId = null;
          s.selectedComponentId = null;
        }
      }));
      get().pushHistory();
    },

    updatePiece: (id, updates) =>
      set(produce((s: AppState) => {
        const piece = s.project.pieces.find((p) => p.id === id);
        if (piece) Object.assign(piece, updates);
      })),

    duplicatePiece: (id) => {
      const state = get();
      const piece = state.project.pieces.find((p) => p.id === id);
      if (!piece) return null;
      const newId = uuid();
      set(produce((s: AppState) => {
        const clone: FurniturePiece = JSON.parse(JSON.stringify(piece));
        clone.id = newId;
        clone.name = piece.name + ' (copy)';
        clone.position = [
          piece.position[0] + 200,
          piece.position[1],
          piece.position[2],
        ];
        clone.components = clone.components.map((c) => ({ ...c, id: uuid() }));
        // Clear constraints (component IDs changed)
        clone.constraints = [];
        s.project.pieces.push(clone);
      }));
      get().pushHistory();
      return newId;
    },

    regeneratePiece: (id, params) => {
      const state = get();
      const piece = state.project.pieces.find((p) => p.id === id);
      if (!piece || !piece.templateType) return;

      const materials = state.project.materials;
      let newPiece: FurniturePiece;

      switch (piece.templateType) {
        case 'cabinet':
          newPiece = createCabinet(params as CabinetParams, materials);
          break;
        case 'bookshelf':
          newPiece = createBookshelf(params as BookshelfParams, materials);
          break;
        case 'desk':
          newPiece = createDesk(params as DeskParams, materials);
          break;
        case 'dresser':
          newPiece = createDresser(params as DresserParams, materials);
          break;
        case 'door-cabinet':
          newPiece = createDoorCabinet(params as DoorCabinetParams, materials);
          break;
        default:
          return;
      }

      // Preserve piece identity
      newPiece.id = piece.id;
      newPiece.name = piece.name;
      newPiece.position = [...piece.position];
      newPiece.rotation = [...piece.rotation];
      newPiece.locked = piece.locked;
      newPiece.templateType = piece.templateType;
      newPiece.templateParams = JSON.parse(JSON.stringify(params));

      // Match component IDs by name where possible
      for (const newComp of newPiece.components) {
        const oldComp = piece.components.find(c => c.name === newComp.name);
        if (oldComp) {
          newComp.id = oldComp.id;
        }
      }

      // Filter constraints to keep only valid ones
      const validConstraints = (piece.constraints ?? []).filter(c => {
        return newPiece.components.some(comp => comp.id === c.sourceComponentId) &&
               newPiece.components.some(comp => comp.id === c.targetComponentId);
      });
      newPiece.constraints = validConstraints;

      set(produce((s: AppState) => {
        const idx = s.project.pieces.findIndex(p => p.id === id);
        if (idx >= 0) s.project.pieces[idx] = newPiece;
      }));
      get().pushHistory();
    },

    addComponent: (pieceId, component) => {
      const compId = uuid();
      const piece = get().project.pieces.find((p) => p.id === pieceId);
      if (!piece) return null;
      set(produce((s: AppState) => {
        const p = s.project.pieces.find((p) => p.id === pieceId);
        if (p) p.components.push({ ...component, id: compId } as Component);
      }));
      get().pushHistory();
      return compId;
    },

    removeComponent: (pieceId, componentId) => {
      set(produce((s: AppState) => {
        const piece = s.project.pieces.find((p) => p.id === pieceId);
        if (piece) {
          piece.components = piece.components.filter((c) => c.id !== componentId);
          // Clean up constraints referencing removed component
          if (piece.constraints) {
            piece.constraints = piece.constraints.filter(
              c => c.sourceComponentId !== componentId && c.targetComponentId !== componentId
            );
          }
          if (s.selectedComponentId === componentId) {
            s.selectedComponentId = null;
          }
        }
      }));
      get().pushHistory();
    },

    updateComponent: (pieceId, componentId, updates) =>
      set(produce((s: AppState) => {
        const piece = s.project.pieces.find((p) => p.id === pieceId);
        if (piece) {
          const comp = piece.components.find((c) => c.id === componentId);
          if (comp) Object.assign(comp, updates);

          // Apply parametric constraints triggered by this change
          const constraints = piece.constraints ?? [];
          for (const constraint of constraints) {
            if (constraint.sourceComponentId !== componentId) continue;

            const source = piece.components.find(c => c.id === constraint.sourceComponentId);
            const target = piece.components.find(c => c.id === constraint.targetComponentId);

            if (!source || !target) continue;
            if (source.type !== 'panel' || target.type !== 'panel') continue;

            const sourceVal = (source as unknown as Record<string, unknown>)[constraint.sourceProperty];
            if (typeof sourceVal === 'number') {
              (target as unknown as Record<string, unknown>)[constraint.targetProperty] = sourceVal + constraint.offset;
            }
          }
        }
      })),

    addConstraint: (pieceId, constraint) =>
      set(produce((s: AppState) => {
        const piece = s.project.pieces.find((p) => p.id === pieceId);
        if (piece) {
          if (!piece.constraints) piece.constraints = [];
          piece.constraints.push({ ...constraint, id: uuid() });
        }
      })),

    removeConstraint: (pieceId, constraintId) =>
      set(produce((s: AppState) => {
        const piece = s.project.pieces.find((p) => p.id === pieceId);
        if (piece && piece.constraints) {
          piece.constraints = piece.constraints.filter(c => c.id !== constraintId);
        }
      })),

    addMaterial: (material) => {
      const id = uuid();
      set(produce((s: AppState) => {
        s.project.materials.push({ ...material, id });
      }));
      return id;
    },

    removeMaterial: (id) =>
      set(produce((s: AppState) => {
        s.project.materials = s.project.materials.filter((m) => m.id !== id);
      })),

    updateMaterial: (id, updates) =>
      set(produce((s: AppState) => {
        const mat = s.project.materials.find((m) => m.id === id);
        if (mat) Object.assign(mat, updates);
      })),

    setSelection: (pieceId, componentId = null) =>
      set({ selectedPieceId: pieceId, selectedComponentId: componentId }),

    clearSelection: () =>
      set({ selectedPieceId: null, selectedComponentId: null }),

    setActiveTool: (tool) => set({ activeTool: tool }),
    setSnapEnabled: (enabled) => set({ snapEnabled: enabled }),
    setSnapToFaces: (enabled) => set({ snapToFaces: enabled }),
    setShowDimensions: (show) => set({ showDimensions: show }),
    setShowGrid: (show) => set({ showGrid: show }),
    setGridSize: (size) => set({ gridSize: size }),
    setSawKerf: (kerf) => set({ sawKerf: kerf }),
    setExplodedView: (enabled) => set({ explodedView: enabled }),
    setExplodeFactor: (factor) => set({ explodeFactor: factor }),
    setActiveSnapLines: (lines) => set({ activeSnapLines: lines }),

    pushHistory: () =>
      set(produce((s: AppState) => {
        const entry: HistoryEntry = {
          pieces: JSON.parse(JSON.stringify(s.project.pieces)),
        };
        // Truncate any redo history
        s.history = s.history.slice(0, s.historyIndex + 1);
        s.history.push(entry);
        s.historyIndex = s.history.length - 1;
        // Limit history
        if (s.history.length > 50) {
          s.history.shift();
          s.historyIndex--;
        }
      })),

    undo: () =>
      set(produce((s: AppState) => {
        if (s.historyIndex > 0) {
          s.historyIndex--;
          s.project.pieces = JSON.parse(JSON.stringify(s.history[s.historyIndex].pieces));
          s.selectedPieceId = null;
          s.selectedComponentId = null;
        }
      })),

    redo: () =>
      set(produce((s: AppState) => {
        if (s.historyIndex < s.history.length - 1) {
          s.historyIndex++;
          s.project.pieces = JSON.parse(JSON.stringify(s.history[s.historyIndex].pieces));
          s.selectedPieceId = null;
          s.selectedComponentId = null;
        }
      })),

    saveProject: () => {
      const { project } = get();
      return JSON.stringify(project, null, 2);
    },

    loadProject: (json) => {
      try {
        const project = JSON.parse(json) as Project;
        set({
          project,
          selectedPieceId: null,
          selectedComponentId: null,
          history: [],
          historyIndex: -1,
        });
      } catch (e) {
        console.error('Failed to load project:', e);
      }
    },

    resetProject: () =>
      set({
        project: {
          name: 'Untitled Project',
          room: { ...DEFAULT_ROOM },
          pieces: [],
          materials: [...DEFAULT_MATERIALS],
        },
        selectedPieceId: null,
        selectedComponentId: null,
        history: [],
        historyIndex: -1,
      }),
  }))
);

// Auto-save to localStorage
useStore.subscribe(
  (s) => s.project,
  (project) => {
    try {
      localStorage.setItem('furniture-designer-project', JSON.stringify(project));
    } catch { /* ignore quota errors */ }
  },
  { equalityFn: () => false } // always save
);

// Load from localStorage on init
try {
  const saved = localStorage.getItem('furniture-designer-project');
  if (saved) {
    const project = JSON.parse(saved) as Project;
    if (project.room && project.pieces && project.materials) {
      useStore.setState({ project });
    }
  }
} catch { /* ignore */ }
