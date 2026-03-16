import { useRef } from 'react';
import { useStore } from '../../store/useStore';

export function ProjectActions() {
  const saveProject = useStore((s) => s.saveProject);
  const loadProject = useStore((s) => s.loadProject);
  const resetProject = useStore((s) => s.resetProject);
  const projectName = useStore((s) => s.project.name);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    const json = saveProject();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectName.replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoad = () => {
    fileRef.current?.click();
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        loadProject(reader.result);
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const handleReset = () => {
    if (confirm('Reset project? This will clear all furniture.')) {
      resetProject();
    }
  };

  return (
    <div className="panel-section">
      <h3>Project</h3>
      <div className="form-row">
        <label>Name</label>
        <input
          type="text"
          value={projectName}
          onChange={(e) =>
            useStore.setState((s) => ({
              project: { ...s.project, name: e.target.value },
            }))
          }
        />
      </div>
      <div className="btn-row">
        <button className="btn-secondary" onClick={handleSave}>💾 Save</button>
        <button className="btn-secondary" onClick={handleLoad}>📂 Open</button>
        <button className="btn-danger" onClick={handleReset}>🗑 Reset</button>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFile}
      />
    </div>
  );
}
