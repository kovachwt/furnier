import { useState, useEffect, useCallback } from 'react';
import { Scene } from './components/Scene';
import { Toolbar } from './components/ui/Toolbar';
import { RoomSettings } from './components/ui/RoomSettings';
import { AddFurniture } from './components/ui/AddFurniture';
import { PieceList } from './components/ui/PieceList';
import { PieceEditor } from './components/ui/PieceEditor';
import { ProjectActions } from './components/ui/ProjectActions';
import { CutListView } from './components/cutlist/CutListView';
import { ShareDialog } from './components/ui/ShareDialog';
import { KeyboardShortcuts } from './components/ui/KeyboardShortcuts';
import { useStore } from './store/useStore';

export default function App() {
  const [showCutList, setShowCutList] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'add' | 'edit'>('add');
  const selectedPieceId = useStore((s) => s.selectedPieceId);

  // Switch to edit tab when something is selected
  useEffect(() => {
    if (selectedPieceId) setSidebarTab('edit');
  }, [selectedPieceId]);

  const toggleShortcuts = useCallback(() => setShowShortcuts((v) => !v), []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore shortcuts when typing in inputs/textareas/selects
      const tag = (e.target as HTMLElement).tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

      // Ctrl/Cmd combos always work
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') { e.preventDefault(); useStore.getState().undo(); return; }
        if (e.key === 'y') { e.preventDefault(); useStore.getState().redo(); return; }
        if (e.key === 'd') {
          e.preventDefault();
          const s = useStore.getState();
          if (s.selectedPieceId) s.duplicatePiece(s.selectedPieceId);
          return;
        }
      }

      // Delete/Backspace — only when not in an input
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInput) {
        const state = useStore.getState();
        if (state.selectedComponentId && state.selectedPieceId) {
          state.removeComponent(state.selectedPieceId, state.selectedComponentId);
        } else if (state.selectedPieceId) {
          state.removePiece(state.selectedPieceId);
        }
        return;
      }

      // Everything below is blocked when typing in inputs
      if (isInput) return;

      const state = useStore.getState();

      // --- Help ---
      if (e.key === '?') { setShowShortcuts((v) => !v); return; }

      // --- Escape: component → piece → deselect ---
      if (e.key === 'Escape') {
        if (showShortcuts) { setShowShortcuts(false); return; }
        if (state.selectedComponentId) {
          useStore.getState().setSelection(state.selectedPieceId);
        } else {
          useStore.getState().clearSelection();
        }
        return;
      }

      // --- Tab: cycle pieces ---
      if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) { state.selectPrevPiece(); } else { state.selectNextPiece(); }
        return;
      }

      // --- Enter: drill into / cycle components ---
      if (e.key === 'Enter') {
        e.preventDefault();
        if (!state.selectedPieceId) return;
        if (e.shiftKey) { state.selectPrevComponent(); } else { state.selectNextComponent(); }
        return;
      }

      // --- Arrow keys: nudge selected piece ---
      const nudgeAmount = e.shiftKey ? 1 : state.gridSize;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); state.nudgeSelectedPiece(-nudgeAmount, 0, 0); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); state.nudgeSelectedPiece(nudgeAmount, 0, 0); return; }
      if (e.key === 'ArrowUp')    { e.preventDefault(); state.nudgeSelectedPiece(0, 0, -nudgeAmount); return; }
      if (e.key === 'ArrowDown')  { e.preventDefault(); state.nudgeSelectedPiece(0, 0, nudgeAmount); return; }
      if (e.key === 'PageUp')     { e.preventDefault(); state.nudgeSelectedPiece(0, nudgeAmount, 0); return; }
      if (e.key === 'PageDown')   { e.preventDefault(); state.nudgeSelectedPiece(0, -nudgeAmount, 0); return; }

      // Camera keys (WASD, QE, RF) are handled by KeyboardCameraControls inside the Canvas
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showShortcuts]);

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
      {showShortcuts && <KeyboardShortcuts onClose={toggleShortcuts} />}
      <ShareDialog />

      <button
        className="shortcuts-hint-btn"
        onClick={toggleShortcuts}
        title="Keyboard shortcuts (?)"
      >
        ⌨
      </button>
    </div>
  );
}
