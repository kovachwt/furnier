import { useEffect, useState } from 'react';
import { QRCodeCanvas } from './QRCode';
import { useStore } from '../../store/useStore';
import type { Project } from '../../types';
import {
  decompressProject,
  getShareFromHash,
  clearShareHash,
} from '../../utils/sharing';

interface ShareDialogProps {
  shareUrl: string;
  projectName: string;
  onClose: () => void;
}

/**
 * Modal that displays the share URL with a QR code for easy mobile access.
 */
export function ShareDialog({ shareUrl, projectName, onClose }: ShareDialogProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = shareUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="share-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="share-dialog-icon">🔗</div>
        <h3>Share This Design</h3>
        <p className="share-dialog-desc">
          Scan the QR code with your phone or copy the link below.
        </p>
        <div className="share-dialog-qr">
          <QRCodeCanvas value={shareUrl} size={180} />
        </div>
        <div className="share-dialog-url">
          <code>{shareUrl.length > 120 ? shareUrl.slice(0, 120) + '…' : shareUrl}</code>
        </div>
        <div className="share-dialog-actions">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn-primary" onClick={handleCopy}>
            📋 Copy Link
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Checks URL hash on mount. If a #share= link is found,
 * shows a confirmation dialog before loading.
 */
export function ShareImportDialog() {
  const [sharedProject, setSharedProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const encoded = getShareFromHash();
    if (!encoded) return;

    try {
      const defaultMaterials = useStore.getState().project.materials;
      const project = decompressProject(encoded, defaultMaterials);
      setSharedProject(project);
    } catch (e) {
      console.error('Failed to load shared project:', e);
      setError('The share link is invalid or corrupted.');
      clearShareHash();
    }
  }, []);

  const handleLoad = () => {
    if (!sharedProject) return;
    useStore.getState().loadProject(JSON.stringify(sharedProject));
    clearShareHash();
    setSharedProject(null);
  };

  const handleCancel = () => {
    clearShareHash();
    setSharedProject(null);
  };

  const handleErrorDismiss = () => {
    setError(null);
  };

  if (error) {
    return (
      <div className="modal-overlay" onClick={handleErrorDismiss}>
        <div className="share-dialog" onClick={(e) => e.stopPropagation()}>
          <div className="share-dialog-icon">⚠️</div>
          <h3>Invalid Share Link</h3>
          <p className="share-dialog-desc">{error}</p>
          <div className="share-dialog-actions">
            <button className="btn-primary" onClick={handleErrorDismiss}>
              OK
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!sharedProject) return null;

  const pieceCount = sharedProject.pieces.length;
  const panelCount = sharedProject.pieces.reduce(
    (sum, p) => sum + p.components.filter((c) => c.type === 'panel').length,
    0
  );

  return (
    <div className="modal-overlay">
      <div className="share-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="share-dialog-icon">📦</div>
        <h3>Shared Project</h3>
        <p className="share-dialog-desc">
          Someone shared a project with you:
        </p>
        <div className="share-dialog-info">
          <div className="share-info-row">
            <span className="share-info-label">Name</span>
            <span className="share-info-value">{sharedProject.name}</span>
          </div>
          <div className="share-info-row">
            <span className="share-info-label">Room</span>
            <span className="share-info-value">
              {sharedProject.room.width} × {sharedProject.room.depth} ×{' '}
              {sharedProject.room.height} mm
            </span>
          </div>
          <div className="share-info-row">
            <span className="share-info-label">Pieces</span>
            <span className="share-info-value">
              {pieceCount} piece{pieceCount !== 1 ? 's' : ''}, {panelCount}{' '}
              panel{panelCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        <p className="share-dialog-warn">
          Loading will replace your current project.
        </p>
        <div className="share-dialog-actions">
          <button className="btn-secondary" onClick={handleCancel}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleLoad}>
            Load Project
          </button>
        </div>
      </div>
    </div>
  );
}
