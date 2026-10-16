import { createContext, useMemo, useRef } from 'react';

export const TouchCancelled = createContext<{ readonly current: boolean }>({ current: false });

export function useTouchCancelled() {
  const cancelled = useRef(false);
  return useMemo(
    () => ({
      cancelled,
      onTouchStart: () => {
        cancelled.current = false;
      },
      onTouchCancel: () => {
        cancelled.current = true;
      },
    }),
    [],
  );
}
