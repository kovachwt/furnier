import { useStore } from '../../store/useStore';

/**
 * Toolbar button that triggers a viewport screenshot.
 *
 * The actual capture is performed by the ViewportCapture component
 * inside the R3F Canvas (which has access to useThree / the renderer).
 */
export function ScreenshotButton() {
  const takeScreenshot = useStore((s) => s.takeScreenshot);

  const handleCapture = () => {
    takeScreenshot();
  };

  return (
    <button
      className="tool-btn"
      onClick={handleCapture}
      title="Screenshot viewport (📷)"
    >
      📷
    </button>
  );
}
