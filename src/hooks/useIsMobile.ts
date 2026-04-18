import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768;
// TOUCH_DETECTION_MS removed — detection is instant via matchMedia

/**
 * Returns true when the viewport is narrow (< MOBILE_BREAKPOINT)
 * OR the primary input is a touch device.
 *
 * Uses matchMedia for viewport width (reactive) and
 * pointer:coarse for touch detection.  On first mount a short
 * grace period is skipped so the paint is correct immediately.
 */
export function useIsMobile(): boolean {
  const [isNarrow, setIsNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false,
  );
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // --- Viewport width ---
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    setIsNarrow(mq.matches);
    const onResize = (e: MediaQueryListEvent) => setIsNarrow(e.matches);
    mq.addEventListener('change', onResize);

    // --- Touch device detection ---
    // pointer:coarse means the primary pointer is not precise (touch/pen)
    const coarse = window.matchMedia('(pointer: coarse)');
    setIsTouchDevice(coarse.matches);
    const onCoarse = (e: MediaQueryListEvent) => setIsTouchDevice(e.matches);
    coarse.addEventListener('change', onCoarse);

    return () => {
      mq.removeEventListener('change', onResize);
      coarse.removeEventListener('change', onCoarse);
    };
  }, []);

  return isNarrow || isTouchDevice;
}

/**
 * Narrow-only check — purely CSS-media-query-driven, for layout
 * decisions that should not care about touch-device status.
 */
export function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    setNarrow(mq.matches);
    const handler = (e: MediaQueryListEvent) => setNarrow(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return narrow;
}