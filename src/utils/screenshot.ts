/**
 * Screenshot utility — captures the R3F canvas as a PNG and triggers a download.
 *
 * Called from ScreenshotButton.tsx via the Three.js renderer exposed by
 * R3F's `useThree` hook. The renderer is guaranteed to exist inside the Canvas.
 */

/**
 * Capture a Three.js canvas to a PNG data URL and trigger a download.
 *
 * @param canvas   - The HTMLCanvasElement to capture.
 * @param fileName - Base name for the downloaded file (without extension).
 * @param quality  - JPEG quality 0–1. Pass 1 to keep PNG (lossless).
 */
export function captureCanvas(
  canvas: HTMLCanvasElement,
  fileName: string,
  quality: number = 1,
): void {
  // quality === 1 → PNG (lossless). Any other value → JPEG.
  const mimeType = quality === 1 ? 'image/png' : 'image/jpeg';
  const dataUrl = canvas.toDataURL(mimeType, quality);

  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `${fileName}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
