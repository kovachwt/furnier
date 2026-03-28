import { useState, useRef, useCallback, useEffect } from 'react';
import { useStore } from '../../store/useStore';

interface Point {
  x: number;
  y: number;
}

interface MeasureLine {
  start: Point;
  end: Point;
  pixelLength: number;
}

type Step = 'upload' | 'reference' | 'width' | 'depth' | 'height' | 'done';

const STEP_LABELS: Record<Step, string> = {
  upload: 'Upload a photo of your room',
  reference: 'Step 1: Draw a reference line on an object with a known size',
  width: 'Step 2: Draw a line along the room width (left wall → right wall)',
  depth: 'Step 3: Draw a line along the room depth (front → back)',
  height: 'Step 4: Draw a line along the room height (floor → ceiling)',
  done: 'Measurement complete!',
};

const STEP_HINTS: Record<Step, string> = {
  upload: 'Take a photo or upload one. Ideally from a corner showing walls and floor.',
  reference: 'Click two points on something you know the size of (e.g. a door, a tile, a ruler). Then enter the real dimension.',
  width: 'Click two points along the width of the room. This sets the room\'s X dimension.',
  depth: 'Click two points along the depth of the room. This sets the room\'s Z dimension.',
  height: 'Click two points from floor to ceiling. This sets the room\'s Y dimension.',
  done: 'Review the measurements below and apply them to your room.',
};

const LINE_COLORS: Record<string, string> = {
  reference: '#fbbf24',
  width: '#f87171',
  depth: '#34d399',
  height: '#60a5fa',
};

export function RoomMeasure({ onClose }: { onClose: () => void }) {
  const setRoom = useStore((s) => s.setRoom);

  const [step, setStep] = useState<Step>('upload');
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ w: 0, h: 0 });

  // Reference
  const [refLine, setRefLine] = useState<MeasureLine | null>(null);
  const [refMm, setRefMm] = useState<number>(2000); // default: door height

  // Measurement lines
  const [widthLine, setWidthLine] = useState<MeasureLine | null>(null);
  const [depthLine, setDepthLine] = useState<MeasureLine | null>(null);
  const [heightLine, setHeightLine] = useState<MeasureLine | null>(null);

  // Drawing state
  const [drawStart, setDrawStart] = useState<Point | null>(null);
  const [cursorPos, setCursorPos] = useState<Point | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // Scale factor: pixels → mm
  const pxToMm = refLine && refMm > 0 ? refMm / refLine.pixelLength : null;

  const computedWidth = widthLine && pxToMm ? Math.round(widthLine.pixelLength * pxToMm) : null;
  const computedDepth = depthLine && pxToMm ? Math.round(depthLine.pixelLength * pxToMm) : null;
  const computedHeight = heightLine && pxToMm ? Math.round(heightLine.pixelLength * pxToMm) : null;

  // Handle file upload
  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      setImageSrc(src);
      const img = new Image();
      img.onload = () => {
        setImageSize({ w: img.naturalWidth, h: img.naturalHeight });
        setStep('reference');
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleFile(file);
  }, [handleFile]);

  // Get point relative to the displayed image
  const getPoint = useCallback((e: React.MouseEvent<HTMLCanvasElement>): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  // Get point from touch event
  const getTouchPoint = useCallback((e: React.TouchEvent<HTMLCanvasElement>): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas || e.touches.length === 0) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top,
    };
  }, []);

  const pixelDist = (a: Point, b: Point) =>
    Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);

  // Handle canvas click — set start or end of line
  const handleCanvasClick = useCallback((pt: Point) => {
    if (step === 'upload' || step === 'done') return;

    if (!drawStart) {
      setDrawStart(pt);
    } else {
      const line: MeasureLine = {
        start: drawStart,
        end: pt,
        pixelLength: pixelDist(drawStart, pt),
      };

      if (step === 'reference') setRefLine(line);
      else if (step === 'width') setWidthLine(line);
      else if (step === 'depth') setDepthLine(line);
      else if (step === 'height') setHeightLine(line);

      setDrawStart(null);
      setCursorPos(null);
    }
  }, [step, drawStart]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pt = getPoint(e);
    if (pt) handleCanvasClick(pt);
  }, [getPoint, handleCanvasClick]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    // Use last tracked cursor position from touchmove, or fallback
    if (cursorPos) {
      handleCanvasClick(cursorPos);
    }
  }, [handleCanvasClick, cursorPos]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLCanvasElement>) => {
    if (drawStart) {
      const pt = getTouchPoint(e);
      if (pt) setCursorPos(pt);
    }
  }, [drawStart, getTouchPoint]);

  // Draw everything on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imageSrc) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Semi-transparent overlay in done state
    if (step === 'done') {
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const drawLine = (line: MeasureLine, color: string, label: string) => {
      ctx.beginPath();
      ctx.moveTo(line.start.x, line.start.y);
      ctx.lineTo(line.end.x, line.end.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([]);
      ctx.stroke();

      // Endpoints
      for (const pt of [line.start, line.end]) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Label
      const midX = (line.start.x + line.end.x) / 2;
      const midY = (line.start.y + line.end.y) / 2;
      ctx.font = 'bold 13px -apple-system, sans-serif';
      const text = label;
      const metrics = ctx.measureText(text);
      const pad = 4;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(
        midX - metrics.width / 2 - pad,
        midY - 18,
        metrics.width + pad * 2,
        20
      );
      ctx.fillStyle = color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, midX, midY - 8);
    };

    // Draw existing lines
    if (refLine) {
      drawLine(refLine, LINE_COLORS.reference, `Ref: ${refMm} mm`);
    }
    if (widthLine) {
      const mm = computedWidth;
      drawLine(widthLine, LINE_COLORS.width, `W: ${mm ?? '?'} mm`);
    }
    if (depthLine) {
      const mm = computedDepth;
      drawLine(depthLine, LINE_COLORS.depth, `D: ${mm ?? '?'} mm`);
    }
    if (heightLine) {
      const mm = computedHeight;
      drawLine(heightLine, LINE_COLORS.height, `H: ${mm ?? '?'} mm`);
    }

    // Draw in-progress line
    if (drawStart && cursorPos) {
      const color = LINE_COLORS[step] ?? '#fff';
      ctx.beginPath();
      ctx.moveTo(drawStart.x, drawStart.y);
      ctx.lineTo(cursorPos.x, cursorPos.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Start point
      ctx.beginPath();
      ctx.arc(drawStart.x, drawStart.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Cursor point
      ctx.beginPath();
      ctx.arc(cursorPos.x, cursorPos.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;

      // Pixel distance label
      const dist = pixelDist(drawStart, cursorPos);
      const mmDist = pxToMm ? Math.round(dist * pxToMm) : null;
      const label = mmDist !== null ? `~${mmDist} mm` : `${Math.round(dist)} px`;
      ctx.font = '12px -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      const tw = ctx.measureText(label).width;
      ctx.fillRect(cursorPos.x + 10, cursorPos.y - 10, tw + 8, 18);
      ctx.fillStyle = color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, cursorPos.x + 14, cursorPos.y);
    }

    // Draw crosshair cursor when waiting for first click
    if (!drawStart && step !== 'upload' && step !== 'done' && cursorPos) {
      const color = LINE_COLORS[step] ?? '#fff';
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(cursorPos.x, 0);
      ctx.lineTo(cursorPos.x, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, cursorPos.y);
      ctx.lineTo(canvas.width, cursorPos.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
  }, [imageSrc, refLine, widthLine, depthLine, heightLine, drawStart, cursorPos, step, refMm, pxToMm, computedWidth, computedDepth, computedHeight]);

  // Handle cursor for crosshair when not drawing
  const handleMouseMoveAlways = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pt = getPoint(e);
    if (pt) setCursorPos(pt);
  }, [getPoint]);

  const handleMouseLeave = useCallback(() => {
    if (!drawStart) setCursorPos(null);
  }, [drawStart]);

  // Advance to next step
  const advanceStep = useCallback(() => {
    if (step === 'reference') setStep('width');
    else if (step === 'width') setStep('depth');
    else if (step === 'depth') setStep('height');
    else if (step === 'height') setStep('done');
  }, [step]);

  // Go back to redo current step
  const redoCurrentLine = useCallback(() => {
    setDrawStart(null);
    setCursorPos(null);
    if (step === 'reference') setRefLine(null);
    else if (step === 'width') setWidthLine(null);
    else if (step === 'depth') setDepthLine(null);
    else if (step === 'height') setHeightLine(null);
  }, [step]);

  // Can advance?
  const currentLineSet =
    (step === 'reference' && refLine !== null) ||
    (step === 'width' && widthLine !== null) ||
    (step === 'depth' && depthLine !== null) ||
    (step === 'height' && heightLine !== null);

  // Skip a dimension
  const skipStep = useCallback(() => {
    advanceStep();
  }, [advanceStep]);

  // Apply results
  const handleApply = useCallback(() => {
    const updates: Partial<{ width: number; depth: number; height: number }> = {};
    if (computedWidth && computedWidth >= 500 && computedWidth <= 20000) updates.width = computedWidth;
    if (computedDepth && computedDepth >= 500 && computedDepth <= 20000) updates.depth = computedDepth;
    if (computedHeight && computedHeight >= 1000 && computedHeight <= 5000) updates.height = computedHeight;

    if (Object.keys(updates).length > 0) {
      setRoom(updates);
    }
    onClose();
  }, [computedWidth, computedDepth, computedHeight, setRoom, onClose]);

  // Reset all
  const handleReset = useCallback(() => {
    setStep('upload');
    setImageSrc(null);
    setRefLine(null);
    setWidthLine(null);
    setDepthLine(null);
    setHeightLine(null);
    setDrawStart(null);
    setCursorPos(null);
    setRefMm(2000);
  }, []);

  // Compute canvas display size to fit the modal
  const canvasDisplaySize = useCallback(() => {
    if (!imageSize.w || !imageSize.h) return { w: 640, h: 480 };
    const maxW = 680;
    const maxH = 460;
    const scale = Math.min(maxW / imageSize.w, maxH / imageSize.h, 1);
    return { w: Math.round(imageSize.w * scale), h: Math.round(imageSize.h * scale) };
  }, [imageSize]);

  const cSize = canvasDisplaySize();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content measure-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>📷 Measure Room from Photo</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Step indicator */}
          <div className="measure-steps">
            {(['reference', 'width', 'depth', 'height'] as Step[]).map((s, i) => (
              <div
                key={s}
                className={`measure-step-dot ${
                  step === s ? 'active' : ''
                } ${
                  (['reference', 'width', 'depth', 'height'].indexOf(step) > i ||
                    step === 'done')
                    ? 'completed'
                    : ''
                }`}
              >
                <span className="step-number">{i + 1}</span>
                <span className="step-label">{s === 'reference' ? 'Ref' : s.charAt(0).toUpperCase() + s.slice(1)}</span>
              </div>
            ))}
          </div>

          {/* Instruction */}
          <div className="measure-instruction">
            <strong>{STEP_LABELS[step]}</strong>
            <p>{STEP_HINTS[step]}</p>
          </div>

          {/* Upload area */}
          {step === 'upload' && (
            <div
              className="measure-upload"
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <div className="upload-icon">📷</div>
              <p>Drag & drop a photo here, or</p>
              <label className="btn-primary upload-btn">
                Choose Photo
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                  }}
                />
              </label>
              <p className="upload-hint">
                For best results, take a photo from a corner of the room showing
                at least two walls and a known reference object (door, tile, etc.)
              </p>
            </div>
          )}

          {/* Canvas area */}
          {imageSrc && step !== 'upload' && (
            <>
              <div className="measure-canvas-wrap" ref={containerRef}>
                {/* Hidden image for canvas drawing */}
                <img
                  ref={imgRef}
                  src={imageSrc}
                  style={{ display: 'none' }}
                  alt=""
                />
                <canvas
                  ref={canvasRef}
                  width={cSize.w}
                  height={cSize.h}
                  style={{ width: cSize.w, height: cSize.h, cursor: step === 'done' ? 'default' : 'crosshair' }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMoveAlways}
                  onMouseLeave={handleMouseLeave}
                  onTouchStart={(e) => {
                    const pt = getTouchPoint(e);
                    if (pt && !drawStart) {
                      setDrawStart(pt);
                    }
                  }}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                />
              </div>

              {/* Reference mm input */}
              {step === 'reference' && refLine && (
                <div className="measure-ref-input">
                  <label>Reference length (mm):</label>
                  <input
                    type="number"
                    value={refMm}
                    min={1}
                    step={10}
                    onChange={(e) => setRefMm(Number(e.target.value))}
                  />
                  <span className="measure-ref-hint">
                    e.g. standard door = 2000mm, A4 paper = 297mm
                  </span>
                </div>
              )}

              {/* Action buttons */}
              <div className="measure-actions">
                {step !== 'done' && (
                  <>
                    {currentLineSet && (
                      <>
                        <button className="btn-secondary" onClick={redoCurrentLine}>
                          ↺ Redraw
                        </button>
                        <button className="btn-primary" onClick={advanceStep}>
                          Next →
                        </button>
                      </>
                    )}
                    {!currentLineSet && step !== 'reference' && (
                      <button className="btn-secondary" onClick={skipStep}>
                        Skip {step}
                      </button>
                    )}
                    {drawStart && (
                      <button className="btn-secondary" onClick={() => { setDrawStart(null); setCursorPos(null); }}>
                        Cancel line
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Results */}
              {step === 'done' && (
                <div className="measure-results">
                  <h3>Measured Dimensions</h3>
                  <div className="measure-result-grid">
                    <div className="measure-result-item">
                      <span className="result-label" style={{ color: LINE_COLORS.width }}>Width</span>
                      <span className="result-value">
                        {computedWidth ? `${computedWidth} mm` : '— (skipped)'}
                      </span>
                      {computedWidth && (computedWidth < 500 || computedWidth > 20000) && (
                        <span className="result-warn">Outside valid range (500–20000)</span>
                      )}
                    </div>
                    <div className="measure-result-item">
                      <span className="result-label" style={{ color: LINE_COLORS.depth }}>Depth</span>
                      <span className="result-value">
                        {computedDepth ? `${computedDepth} mm` : '— (skipped)'}
                      </span>
                      {computedDepth && (computedDepth < 500 || computedDepth > 20000) && (
                        <span className="result-warn">Outside valid range (500–20000)</span>
                      )}
                    </div>
                    <div className="measure-result-item">
                      <span className="result-label" style={{ color: LINE_COLORS.height }}>Height</span>
                      <span className="result-value">
                        {computedHeight ? `${computedHeight} mm` : '— (skipped)'}
                      </span>
                      {computedHeight && (computedHeight < 1000 || computedHeight > 5000) && (
                        <span className="result-warn">Outside valid range (1000–5000)</span>
                      )}
                    </div>
                  </div>
                  <p className="measure-disclaimer">
                    ⚠️ These are estimates based on perspective projection. Accuracy depends on
                    photo angle and reference precision. Fine-tune with a tape measure if needed.
                  </p>
                  <div className="measure-final-actions">
                    <button className="btn-secondary" onClick={handleReset}>
                      ↺ Start Over
                    </button>
                    <button className="btn-primary" onClick={handleApply}>
                      ✓ Apply to Room
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
