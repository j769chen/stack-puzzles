export type Task<T> = Generator<void, T, void>;

export function runTask<T>(task: Task<T>): T {
  for (;;) {
    const step = task.next();
    if (step.done) return step.value;
  }
}

type SliceOptions = { sliceMs?: number; signal?: AbortSignal };

export async function runInSlices<T>(task: Task<T>, { sliceMs = 8, signal }: SliceOptions = {}): Promise<T> {
  let deadline = Date.now() + sliceMs;
  for (;;) {
    const step = task.next();
    if (step.done) return step.value;
    if (Date.now() >= deadline) {
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (signal?.aborted) throw new Error('Cancelled');
      deadline = Date.now() + sliceMs;
    }
  }
}

export function* firstFound<T>(attempt: () => Task<T | null>, tries: number): Task<T> {
  for (let i = 0; i < tries; i++) {
    const found = yield* attempt();
    if (found !== null) return found;
  }
  throw new Error(`Nothing found in ${tries} tries`);
}
