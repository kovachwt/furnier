import { useEffect, useRef, useState } from 'react';
import QRCodeLib from 'qrcode';

interface QRCodeCanvasProps {
  value: string;
  size?: number;
  className?: string;
}

/**
 * Renders a QR code on a canvas element using the qrcode library.
 * The QR code is generated client-side and drawn onto a canvas.
 */
export function QRCodeCanvas({ value, size = 200, className = '' }: QRCodeCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    QRCodeLib.toCanvas(canvas, value, {
      width: size,
      margin: 1,
      color: {
        dark: '#1a1a2e',
        light: '#ffffff',
      },
    }).catch((err: unknown) => {
      console.error('QR code generation failed:', err);
      setError('Failed to generate QR code');
    });
  }, [value, size]);

  if (error) {
    return (
      <div className={`qr-code-error ${className}`} role="img" aria-label="QR code unavailable">
        <span>{error}</span>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className={`qr-code-canvas ${className}`}
      width={size}
      height={size}
      role="img"
      aria-label={`QR code for ${value}`}
    />
  );
}
