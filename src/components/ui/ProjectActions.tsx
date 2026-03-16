import { useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import {
  generateShareUrl,
  estimateShareUrlLength,
  MAX_SAFE_URL_LENGTH,
} from '../../utils/sharing';

export function ProjectActions() {
  const saveProject = useStore((s) => s.saveProject);
  const loadProject = useStore((s) => s.loadProject);
  const resetProject = useStore((s) => s.resetProject);
  const project = useStore((s) => s.project);
  const projectName = project.name;
  const fileRef = useRef<HTMLInputElement>(null);
  const [shareToast, setShareToast] = useState<'copied' | 'error' | 'too-large' | null>(null);

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

  const handleShare = async () => {
    try {
      const urlLength = estimateShareUrlLength(project);
      if (urlLength > MAX_SAFE_URL_LENGTH) {
        setShareToast('too-large');
        setTimeout(() => setShareToast(null), 4000);
        return;
      }

      const shareUrl = generateShareUrl(project);

      // Try native share on mobile, fall back to clipboard
      if (navigator.share) {
        try {
          await navigator.share({
            title: projectName,
            text: `Check out my furniture design: ${projectName}`,
            url: shareUrl,
          });
          return; // native share handled it
        } catch {
          // User cancelled or API not supported — fall through to clipboard
        }
      }

      await navigator.clipboard.writeText(shareUrl);
      setShareToast('copied');
      setTimeout(() => setShareToast(null), 3000);
    } catch (err) {
      console.error('Share failed:', err);
      setShareToast('error');
      setTimeout(() => setShareToast(null), 4000);
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
        <button className="btn-secondary btn-share" onClick={handleShare}>🔗 Share</button>
        <button className="btn-danger" onClick={handleReset}>🗑 Reset</button>
      </div>
      {shareToast && (
        <div className={`share-toast ${shareToast === 'copied' ? 'share-toast-success' : 'share-toast-error'}`}>
          {shareToast === 'copied' && '✓ Share link copied to clipboard!'}
          {shareToast === 'error' && '✗ Failed to generate share link.'}
          {shareToast === 'too-large' && '✗ Project too large for link sharing. Use Save instead.'}
        </div>
      )}
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
