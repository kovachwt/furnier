import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { produce } from 'immer';
import { v4 as uuid } from 'uuid';
import type {
  Project, Room, FurniturePiece, Component, Material, Tool
} from '../types';

const DEFAULT_MATERIALS: Material[] = [
  {
    id: 'melamine-white-18',
    name: 'White Melamine 18mm',
    thickness: 18,
    sheetWidth: 2440,
    sheetHeight: 1220,
    color: '#f0ede8',
    grainDirection: false,
  },
  {
    id: 'melamine-white-25',
    name: 'White Melamine 25mm',
    thickness: 25,
    sheetWidth: 2440,
    sheetHeight: 1220,
    color: '#f0ede8',
    grainDirection: false,
  },
  {
    id: 'plywood-birch-18',
    name: 'Birch Plywood 18mm',
    thickness: 18,
    sheetWidth: 2440,
    sheetHeight: 1220,
    color: '#d4b896',
    grainDirection: true,
  },
  {
    id: 'mdf-18',
    name: 'MDF 18mm',
    thickness: 18,
    sheetWidth: 2440,
    sheetHeight: 1220,
    color: '#c4a882',
    grainDirection: false,
  },
  {
    id: 'plywood-birch-12',
    name: 'Birch Plywood 12mm',
    thickness: 12,
    sheetWidth: 2440,
    sheetHeight: 1220,
    color: '#d4b896',
    grainDirection: true,
  },
  {
    id: 'hardboard-3',
    name: 'Hardboard 3mm',
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
  snapThreshold: number; // mm
  showDimensions: boolean;
  showGrid: boolean;
  gridSize: number; // mm
  sawKerf: number; // mm

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

  // Components
  addComponent: (pieceId: string, component: Omit<Component, 'id'>) => string | null;
  removeComponent: (pieceId: string, componentId: string) => void;
  updateComponent: (pieceId: string, componentId: string, updates: Partial<Component>) => void;

  // Materials
  addMaterial: (material: Omit<Material, 'id'>) => string;
  removeMaterial: (id: string) => void;
  updateMaterial: (id: string, updates: Partial<Material>) => void;

  // Selection
  setSelection: (pieceId: string | null, componentId?: string | null) => void;
  clearSelection: () => void;

  // Tools
  setActiveTool: (tool: Tool) => void;
  setSnapEnabled: (enabled: boolean) => void;
  setShowDimensions: (show: boolean) => void;
  setShowGrid: (show: boolean) => void;
  setGridSize: (size: number) => void;
  setSawKerf: (kerf: number) => void;

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
    snapThreshold: 20,
    showDimensions: true,
    showGrid: true,
    gridSize: 50,
    sawKerf: 3,

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
        s.project.pieces.push(clone);
      }));
      get().pushHistory();
      return newId;
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
    setShowDimensions: (show) => set({ showDimensions: show }),
    setShowGrid: (show) => set({ showGrid: show }),
    setGridSize: (size) => set({ gridSize: size }),
    setSawKerf: (kerf) => set({ sawKerf: kerf }),

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
