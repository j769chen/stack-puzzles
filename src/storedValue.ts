import AsyncStorage from '@react-native-async-storage/async-storage';

export function storedValue<T>(storageKey: string, parse: (stored: string | null) => T) {
  let current = parse(null);
  let queue: Promise<void> = Promise.resolve();
  let pendingSaves = 0;
  let unsaved: ((value: T) => T)[] = [];
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
        unsaved.push(change);
        try {
          const stored = await AsyncStorage.getItem(storageKey);
          const saved = unsaved.reduce((value, apply) => apply(value), parse(stored));
          const json = JSON.stringify(saved);
          if (json !== stored) await AsyncStorage.setItem(storageKey, json);
          unsaved = [];
          if (pendingSaves === 1 && json !== JSON.stringify(current)) publish(saved);
        } finally {
          pendingSaves--;
        }
      });
    },
  };
}
