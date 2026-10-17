import { useState } from 'react';

export type Move = [from: number, to: number];

export function useHistory<T>(init: () => T) {
  const [history, setHistory] = useState(() => [init()]);
  return {
    current: history[history.length - 1]!,
    moves: history.length - 1,
    push: (next: T) => setHistory((h) => [...h, next]),
    undo: () => setHistory((h) => (h.length > 1 ? h.slice(0, -1) : h)),
    restart: () => setHistory((h) => [h[0]!]),
  };
}
