import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

type State = { key: string; value: number; loaded: boolean; changed: boolean };

const write = (key: string, n: number) => AsyncStorage.setItem(key, String(n)).catch(() => {});

export function usePersistentNumber(key: string, initial: number) {
  const [state, setState] = useState<State>({ key, value: initial, loaded: false, changed: false });
  const readKey = useRef<string | null>(null);
  const unsaved = useRef<{ key: string; value: number } | null>(null);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(key).then(
      (stored) => {
        if (!active) return;
        readKey.current = key;
        const early = unsaved.current;
        unsaved.current = null;
        if (early?.key === key) write(key, early.value);
        const n = Number(stored);
        const value = stored !== null && Number.isInteger(n) && n >= 1 ? n : initial;
        setState((s) => (s.key === key && s.changed ? { ...s, loaded: true } : { key, value, loaded: true, changed: false }));
      },
      () => {
        if (active) setState((s) => (s.key === key ? { ...s, loaded: true } : { key, value: initial, loaded: true, changed: false }));
      },
    );
    return () => {
      active = false;
    };
  }, [key, initial]);

  const save = useCallback(
    (n: number) => {
      if (readKey.current === key) write(key, n);
      else unsaved.current = { key, value: n };
    },
    [key],
  );

  const update = useCallback(
    (n: number) => {
      setState((s) => ({ key, value: n, loaded: s.key === key && s.loaded, changed: true }));
      save(n);
    },
    [key, save],
  );

  const current = state.key === key ? state : { value: initial, loaded: false };
  return [current.value, update, current.loaded, save] as const;
}
