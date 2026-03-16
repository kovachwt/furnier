import { useState, useEffect } from 'react';
import { Scene } from './components/Scene';
import { Toolbar } from './components/ui/Toolbar';
import { RoomSettings } from './components/ui/RoomSettings';
import { AddFurniture } from './components/ui/AddFurniture';
import { PieceList } from './components/ui/PieceList';
import { PieceEditor } from './components/ui/PieceEditor';
import { ProjectActions } from './components/ui/ProjectActions';
import { CutListView } from './components/cutlist/CutListView';
import { useStore } from './store/useStore';

export default function App() {
  const [showCutList, setShowCutList] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'add' | 'edit'>('add');
  const selectedPieceId = useStore((s) => s.selectedPieceId);

  // Switch to edit tab when something is selected
  useEffect(() => {
    if (selectedPieceId) setSidebarTab('edit');
  }, [selectedPieceId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { e.preventDefault(); useStore.getState().undo(); }
        if (e.key === 'y') { e.preventDefault(); useStore.getState().redo(); }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const state = useStore.getState();
        if (state.selectedComponentId && state.selectedPieceId) {
          state.removeComponent(state.selectedPieceId, state.selectedComponentId);
        } else if (state.selectedPieceId) {
          state.removePiece(state.selectedPieceId);
        }
      }
      if (e.key === 'Escape') {
        useStore.getState().clearSelection();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="app">
      <Toolbar />

      <div className="main-area">
        {/* Left sidebar */}
        <div className="sidebar left-sidebar">
          <ProjectActions />

          <div className="tab-bar">
            <button
              className={`tab ${sidebarTab === 'add' ? 'active' : ''}`}
              onClick={() => setSidebarTab('add')}
            >
              + Add
            </button>
            <button
              className={`tab ${sidebarTab === 'edit' ? 'active' : ''}`}
              onClick={() => setSidebarTab('edit')}
            >
              ✎ Edit
            </button>
          </div>

          {sidebarTab === 'add' && (
            <>
              <RoomSettings />
              <AddFurniture />
            </>
          )}

          {sidebarTab === 'edit' && (
            <>
              <PieceList />
              <PieceEditor />
            </>
          )}

          <div className="panel-section">
            <button className="btn-primary full-width" onClick={() => setShowCutList(true)}>
              📋 Cut List & Parts
            </button>
          </div>
        </div>

        {/* 3D Viewport */}
        <div className="viewport">
          <Scene />
        </div>
      </div>

      {showCutList && <CutListView onClose={() => setShowCutList(false)} />}
    </div>
  );
}
