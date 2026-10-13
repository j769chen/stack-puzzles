import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export function usePersistentNumber(key: string, initial: number) {
  const [value, setValue] = useState(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(key)
      .then((stored) => {
        const n = Number(stored);
        if (active && stored !== null && Number.isFinite(n)) setValue(n);
      })
      .catch(() => {})
      .finally(() => active && setLoaded(true));
    return () => {
      active = false;
    };
  }, [key]);

  const update = useCallback(
    (n: number) => {
      setValue(n);
      AsyncStorage.setItem(key, String(n)).catch(() => {});
    },
    [key],
  );

  return [value, update, loaded] as const;
}
