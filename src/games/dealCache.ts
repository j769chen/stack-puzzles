import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { type Task, runInSlices } from './task';

type Options<T> = {
  prefix: string;
  task: (id: number) => Task<T>;
  fits: (stored: T, id: number) => boolean;
};

export type DealCache<T> = ReturnType<typeof dealCache<T>>;

export function dealCache<T>({ prefix, task, fits }: Options<T>) {
  const storageKey = (id: number) => `${prefix}.${id}`;
  const pending = new Map<number, Promise<T>>();

  async function read(id: number): Promise<T | null> {
    const stored = await AsyncStorage.getItem(storageKey(id)).catch(() => null);
    if (stored === null) return null;
    try {
      const value: T = JSON.parse(stored);
      return fits(value, id) ? value : null;
    } catch {
      return null;
    }
  }

  function load(id: number): Promise<T> {
    let promise = pending.get(id);
    if (!promise) {
      promise = (async () => {
        const stored = await read(id);
        if (stored) return stored;
        const value = await runInSlices(task(id));
        AsyncStorage.setItem(storageKey(id), JSON.stringify(value)).catch(() => {});
        return value;
      })().finally(() => pending.delete(id));
      pending.set(id, promise);
    }
    return promise;
  }

  function forgetAllBut(id: number) {
    const kept = new Set([storageKey(id), storageKey(id + 1)]);
    AsyncStorage.getAllKeys()
      .then((keys) => AsyncStorage.multiRemove(keys.filter((key) => key.startsWith(`${prefix}.`) && !kept.has(key))))
      .catch(() => {});
  }

  function useDeal(id: number | null) {
    const [loaded, setLoaded] = useState<{ id: number; value: T }[]>([]);
    const [failure, setFailure] = useState<{ error: unknown } | null>(null);

    const keep = useCallback(
      (loadedId: number, value: T) =>
        setLoaded((deals) => [...deals.filter((deal) => deal.id !== loadedId), { id: loadedId, value }].slice(-2)),
      [],
    );

    useEffect(() => {
      if (id === null) return;
      let active = true;
      load(id).then(
        (value) => active && keep(id, value),
        (error: unknown) => active && setFailure({ error }),
      );
      forgetAllBut(id);
      return () => {
        active = false;
      };
    }, [id, keep]);

    const prepare = useCallback(
      (next: number) => {
        load(next).then(
          (value) => keep(next, value),
          () => {},
        );
      },
      [keep],
    );

    if (failure) throw failure.error;
    return { deal: loaded.find((deal) => deal.id === id)?.value ?? null, prepare };
  }

  return { load, useDeal };
}
