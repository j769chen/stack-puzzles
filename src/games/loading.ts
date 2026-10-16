import { useEffect, useState } from 'react';

const pending = new Map<string, Promise<unknown>>();

export function loadOnce<T>(id: string, load: () => Promise<T>): Promise<T> {
  let promise = pending.get(id) as Promise<T> | undefined;
  if (!promise) {
    promise = load().finally(() => pending.delete(id));
    pending.set(id, promise);
  }
  return promise;
}

export function useLoaded<T>(id: number | null, load: (id: number) => Promise<T>): T | null {
  const [loaded, setLoaded] = useState<{ id: number; value: T } | null>(null);

  useEffect(() => {
    if (id === null) return;
    let active = true;
    load(id).then((value) => active && setLoaded({ id, value }));
    return () => {
      active = false;
    };
  }, [id, load]);

  return loaded?.id === id ? loaded.value : null;
}
