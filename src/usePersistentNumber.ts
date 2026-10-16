import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

export function usePersistentNumber(key: string, initial: number) {
  const [value, setValue] = useState(initial);
  const [loaded, setLoaded] = useState(false);
  const readKey = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(key)
      .then((stored) => {
        if (!active) return;
        readKey.current = key;
        const n = Number(stored);
        if (stored !== null && Number.isInteger(n) && n >= 1) setValue(n);
      })
      .catch(() => {})
      .finally(() => active && setLoaded(true));
    return () => {
      active = false;
    };
  }, [key]);

  const save = useCallback(
    (n: number) => {
      if (readKey.current === key) AsyncStorage.setItem(key, String(n)).catch(() => {});
    },
    [key],
  );

  const update = useCallback(
    (n: number) => {
      setValue(n);
      save(n);
    },
    [save],
  );

  return [value, update, loaded, save] as const;
}
