import AsyncStorage from '@react-native-async-storage/async-storage';

export function storedValue<T>(storageKey: string, parse: (stored: string | null) => T) {
  let current = parse(null);
  let queue: Promise<void> = Promise.resolve();
  let pendingSaves = 0;
  const listeners = new Set<() => void>();

  const publish = (next: T) => {
    current = next;
    listeners.forEach((listener) => listener());
  };

  const inOrder = (job: () => Promise<void>) => (queue = queue.then(job).catch(() => {}));

  return {
    get: () => current,

    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    load: () =>
      inOrder(async () => {
        const stored = await AsyncStorage.getItem(storageKey);
        if (pendingSaves === 0) publish(parse(stored));
      }),

    update(change: (value: T) => T) {
      publish(change(current));
      pendingSaves++;
      inOrder(async () => {
        try {
          const saved = change(parse(await AsyncStorage.getItem(storageKey)));
          const json = JSON.stringify(saved);
          await AsyncStorage.setItem(storageKey, json);
          if (pendingSaves === 1 && json !== JSON.stringify(current)) publish(saved);
        } finally {
          pendingSaves--;
        }
      });
    },
  };
}
