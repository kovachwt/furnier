import { useEffect } from 'react';
import { useStore } from '../store/useStore';
import { findClashes } from '../utils/clashDetection';

/**
 * Hook that recomputes clash pairs whenever pieces change
 * and `showClashDetection` is enabled.
 *
 * Placed in a component so it runs in the React render cycle,
 * avoiding the Immer Proxy issues that occur in Zustand subscriptions.
 */
export function useClashDetection() {
  const pieces = useStore((s) => s.project.pieces);
  const showClashDetection = useStore((s) => s.showClashDetection);

  useEffect(() => {
    if (showClashDetection) {
      const clashes = findClashes(pieces);
      useStore.setState({ clashPairs: clashes });
    } else {
      useStore.setState({ clashPairs: [] });
    }
  }, [pieces, showClashDetection]);

  return useStore((s) => s.clashPairs);
}
